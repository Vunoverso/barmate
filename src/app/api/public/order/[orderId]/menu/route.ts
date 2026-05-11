import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  KEY_MENU_BRANDING,
  KEY_PRODUCT_CATEGORIES,
  KEY_PRODUCTS,
  type MenuBranding,
} from '@/lib/constants';
import type { Product, ProductCategory } from '@/types';

export const dynamic = 'force-dynamic';

const arrayValue = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

// GET /api/public/order/:orderId/menu
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;

  if (!orderId) {
    return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
  }

  const order = await prisma.openOrder.findUnique({
    where: { id: orderId },
    select: {
      organizationId: true,
      deletedAt: true,
      data: true,
    },
  });

  if (!order || order.deletedAt) {
    return NextResponse.json({ error: 'order not found' }, { status: 404 });
  }

  const orderData = (order.data ?? {}) as Record<string, unknown>;
  if (!orderData.isShared && !orderData.is_shared) {
    return NextResponse.json({ error: 'order is not shared' }, { status: 403 });
  }

  const appStateRows = await prisma.appState.findMany({
    where: {
      organizationId: order.organizationId,
      key: {
        in: [KEY_PRODUCTS, KEY_PRODUCT_CATEGORIES, KEY_MENU_BRANDING],
      },
    },
    select: {
      key: true,
      value: true,
    },
  });

  const byKey = new Map(appStateRows.map((row) => [row.key, row.value]));
  const categories = arrayValue<ProductCategory>(byKey.get(KEY_PRODUCT_CATEGORIES));
  const products = arrayValue<Product>(byKey.get(KEY_PRODUCTS));
  const branding = (byKey.get(KEY_MENU_BRANDING) ?? {}) as MenuBranding;

  const visibleCategories = categories
    .filter((category) => category.isVisibleInMenu !== false)
    .sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));
  const allCategoryIds = new Set(categories.map((category) => category.id));
  const visibleCategoryIds = new Set(visibleCategories.map((category) => category.id));

  const visibleProducts = products.filter((product) => {
    if (product.isVisibleInMenu === false) return false;

    // Fail-open: se a categoria ainda nao sincronizou no app_state,
    // mantemos o produto visivel para evitar "sumico" no cardapio.
    if (!allCategoryIds.has(product.categoryId)) return true;

    return visibleCategoryIds.has(product.categoryId);
  });

  return NextResponse.json({
    categories: visibleCategories,
    products: visibleProducts,
    branding: {
      primaryColor: branding.primaryColor ?? null,
      coverImage: branding.coverImage ?? null,
      welcomeMessage: branding.welcomeMessage ?? null,
      requireWaiterApproval: branding.requireWaiterApproval ?? true,
      allowGuestSelfOrder: branding.allowGuestSelfOrder ?? true,
      askComandaNumber: branding.askComandaNumber ?? false,
      whatsappNumber: branding.whatsappNumber ?? null,
      operationMode: branding.operationMode ?? 'table_only',
      customerFacingMessage: branding.customerFacingMessage ?? null,
      enableServiceBell: branding.enableServiceBell ?? true,
      beverageChecklist: Array.isArray(branding.beverageChecklist) ? branding.beverageChecklist : [],
    },
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      Pragma: 'no-cache',
    },
  });
}
