import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  KEY_MENU_BRANDING,
  KEY_PRODUCT_CATEGORIES,
  KEY_PRODUCTS,
  type MenuBranding,
} from '@/lib/constants';
import type { OrderItem, Product, ProductCategory } from '@/types';

type IncomingItem = {
  productId: string;
  quantity: number;
  note?: string | null;
};

type IncomingCheckout = {
  customerName: string;
  phone: string;
  cep: string;
  addressLine: string;
  addressNumber: string;
  neighborhood: string;
  city: string;
  state: string;
  complement?: string | null;
  paymentMethod: 'dinheiro' | 'pix' | 'debito' | 'credito';
  cashAmount?: number | null;
};

const asCheckout = (value: unknown): IncomingCheckout | null => {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const paymentMethodRaw = typeof raw.paymentMethod === 'string' ? raw.paymentMethod : '';
  const paymentMethod = (['dinheiro', 'pix', 'debito', 'credito'] as const).includes(paymentMethodRaw as IncomingCheckout['paymentMethod'])
    ? (paymentMethodRaw as IncomingCheckout['paymentMethod'])
    : 'pix';

  return {
    customerName: typeof raw.customerName === 'string' ? raw.customerName.trim() : '',
    phone: typeof raw.phone === 'string' ? raw.phone.trim() : '',
    cep: typeof raw.cep === 'string' ? raw.cep.trim() : '',
    addressLine: typeof raw.addressLine === 'string' ? raw.addressLine.trim() : '',
    addressNumber: typeof raw.addressNumber === 'string' ? raw.addressNumber.trim() : '',
    neighborhood: typeof raw.neighborhood === 'string' ? raw.neighborhood.trim() : '',
    city: typeof raw.city === 'string' ? raw.city.trim() : '',
    state: typeof raw.state === 'string' ? raw.state.trim() : '',
    complement: typeof raw.complement === 'string' && raw.complement.trim() ? raw.complement.trim() : null,
    paymentMethod,
    cashAmount: typeof raw.cashAmount === 'number' && Number.isFinite(raw.cashAmount) ? raw.cashAmount : null,
  };
};

const asItems = (value: unknown): IncomingItem[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const raw = item as Record<string, unknown>;
      const productId = typeof raw.productId === 'string' ? raw.productId.trim() : '';
      const quantityNumber = Number(raw.quantity ?? 0);
      const quantity = Number.isFinite(quantityNumber) ? Math.max(1, Math.min(20, Math.trunc(quantityNumber))) : 1;
      const note = typeof raw.note === 'string' && raw.note.trim() ? raw.note.trim() : null;
      return { productId, quantity, note };
    })
    .filter((item) => item.productId.length > 0);
};

const arrayValue = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

// POST /api/public/order/:orderId/add-items
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  const body = await req.json() as Record<string, unknown>;

  const incomingItems = asItems(body.items);
  const incomingCheckout = asCheckout(body.checkout);
  if (incomingItems.length === 0) {
    return NextResponse.json({ error: 'items are required' }, { status: 400 });
  }

  const order = await prisma.openOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      organizationId: true,
      deletedAt: true,
      data: true,
    },
  });

  if (!order || order.deletedAt) {
    return NextResponse.json({ error: 'order not found' }, { status: 404 });
  }

  const orderData = (order.data ?? {}) as Record<string, unknown>;
  if (!orderData.isShared) {
    return NextResponse.json({ error: 'order is not shared' }, { status: 403 });
  }

  const appStateRows = await prisma.appState.findMany({
    where: {
      organizationId: order.organizationId,
      key: { in: [KEY_PRODUCTS, KEY_PRODUCT_CATEGORIES, KEY_MENU_BRANDING] },
    },
    select: {
      key: true,
      value: true,
    },
  });

  const byKey = new Map(appStateRows.map((row) => [row.key, row.value]));
  const products = arrayValue<Product>(byKey.get(KEY_PRODUCTS));
  const categories = arrayValue<ProductCategory>(byKey.get(KEY_PRODUCT_CATEGORIES));
  const branding = (byKey.get(KEY_MENU_BRANDING) ?? {}) as MenuBranding;
  const requireWaiterApproval = branding.requireWaiterApproval ?? true;

  const productsById = new Map(products.map((product) => [product.id, product]));
  const categoriesById = new Map(categories.map((category) => [category.id, category]));

  const additions: OrderItem[] = [];
  for (const incoming of incomingItems) {
    const product = productsById.get(incoming.productId);
    if (!product || product.isVisibleInMenu === false) continue;

    const category = categoriesById.get(product.categoryId);
    if (category?.isVisibleInMenu === false) continue;

    additions.push({
      ...product,
      quantity: incoming.quantity,
      lineItemId: `li-g-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      addedAt: new Date().toISOString(),
      addedBy: 'guest',
      pendingApproval: requireWaiterApproval,
      isDelivered: false,
      isPreparing: false,
      isPaid: false,
      forceKitchenVisible: false,
      guestNote: incoming.note ?? null,
      claimedQuantity: 0,
      categoryName: category?.name,
      categoryIconName: category?.iconName,
    });
  }

  if (additions.length === 0) {
    return NextResponse.json({ error: 'no valid products found' }, { status: 400 });
  }

  const currentItems = arrayValue<OrderItem>(orderData.items);
  const updatedData = {
    ...orderData,
    items: [...currentItems, ...additions],
    lastGuestCheckout: incomingCheckout
      ? {
          ...incomingCheckout,
          createdAt: new Date().toISOString(),
          total: additions.reduce((sum, item) => sum + item.price * item.quantity, 0),
        }
      : (orderData.lastGuestCheckout ?? null),
    updatedAt: new Date().toISOString(),
  };

  await prisma.openOrder.update({
    where: { id: order.id },
    data: {
      data: updatedData as never,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, addedCount: additions.length });
}
