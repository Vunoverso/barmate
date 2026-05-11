"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ActiveOrder, OrderChatMessage, Product, ProductCategory } from '@/types';
import { getArchivedOrders, removeCounterSaleDraft } from '@/lib/data-access';
import { formatCurrency } from '@/lib/constants';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Bell, BellRing, FileX, Loader2, MessageCircle, Minus, Plus, Send, ShoppingCart, UtensilsCrossed } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ORDER_POLL_INTERVAL_VISIBLE_MS = 10000;
const ORDER_POLL_INTERVAL_HIDDEN_MS = 30000;
const MENU_REQUEST_TIMEOUT_MS = 12000;
const MENU_CACHE_FRESH_MS = 120000;
const ORDER_INITIAL_RETRY_WINDOW_MS = 15000;
const ORDER_INITIAL_RETRY_DELAY_MS = 1200;

type MenuPayload = {
  products: Product[];
  categories: ProductCategory[];
  branding?: {
    allowGuestSelfOrder?: boolean;
    requireWaiterApproval?: boolean;
    whatsappNumber?: string | null;
    operationMode?: 'counter_only' | 'table_only' | 'table_delivery';
    customerFacingMessage?: string | null;
    enableServiceBell?: boolean;
    beverageChecklist?: string[];
  };
};

type CheckoutPaymentMethod = 'dinheiro' | 'pix' | 'debito' | 'credito';

type CheckoutData = {
  customerName: string;
  phone: string;
  cep: string;
  addressLine: string;
  addressNumber: string;
  neighborhood: string;
  city: string;
  state: string;
  complement: string;
  paymentMethod: CheckoutPaymentMethod;
  cashAmount: string;
};

export default function MyOrderClient({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<ActiveOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuProducts, setMenuProducts] = useState<Product[]>([]);
  const [menuCategories, setMenuCategories] = useState<ProductCategory[]>([]);
  const [menuLastLoadedAt, setMenuLastLoadedAt] = useState<number | null>(null);
  const [allowGuestSelfOrder, setAllowGuestSelfOrder] = useState(true);
  const [requireWaiterApproval, setRequireWaiterApproval] = useState(true);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);
  const [isSubmittingCart, setIsSubmittingCart] = useState(false);
  const [isCallingWaiter, setIsCallingWaiter] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [operationMode, setOperationMode] = useState<'counter_only' | 'table_only' | 'table_delivery'>('table_only');
  const [customerFacingMessage, setCustomerFacingMessage] = useState('');
  const [enableServiceBell, setEnableServiceBell] = useState(true);
  const [beverageChecklist, setBeverageChecklist] = useState<string[]>([]);
  const [guestCart, setGuestCart] = useState<Record<string, number>>({});
  const [guestComboComponents, setGuestComboComponents] = useState<Record<string, string[]>>({});
  const [guestItemNotes, setGuestItemNotes] = useState<Record<string, string>>({});
  const [chatInput, setChatInput] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [isComboPickerOpen, setIsComboPickerOpen] = useState(false);
  const [comboPickerProductId, setComboPickerProductId] = useState<string | null>(null);
  const [comboPickerSelection, setComboPickerSelection] = useState<string[]>([]);
  const [isBeverageCustomizerOpen, setIsBeverageCustomizerOpen] = useState(false);
  const [beverageCustomizerProductId, setBeverageCustomizerProductId] = useState<string | null>(null);
  const [beverageOptionValues, setBeverageOptionValues] = useState<Record<string, { selected: boolean; quantity: number; applyAll: boolean }>>({});
  const [checkout, setCheckout] = useState<CheckoutData>({
    customerName: '',
    phone: '',
    cep: '',
    addressLine: '',
    addressNumber: '',
    neighborhood: '',
    city: '',
    state: '',
    complement: '',
    paymentMethod: 'pix',
    cashAmount: '',
  });
  const prevItemsCount = useRef<number>(0);
  const { toast } = useToast();

  const statusLabelMap: Record<NonNullable<ActiveOrder['customerStatus']>, string> = {
    enviado: 'Enviado',
    aceito: 'Aceito',
    em_producao: 'Em produção',
    finalizado: 'Finalizado',
    saiu_entrega: 'Saiu para entrega',
    entregue: 'Entregue',
    cancelado: 'Cancelado',
  };

  const statusFlow: NonNullable<ActiveOrder['customerStatus']>[] = ['enviado', 'aceito', 'em_producao', 'finalizado', 'saiu_entrega', 'entregue'];

  const orderOriginLabelMap: Record<NonNullable<ActiveOrder['orderOrigin']>, string> = {
    mesa_qr: 'Mesa (QR)',
    link_enviado: 'Link enviado',
    interno: 'Interno',
  };

  const normalizeDigits = (value: string) => value.replace(/\D/g, '');
  const menuCacheKey = order?.id ? `barmate_guest_menu_cache_${order.id}` : null;
  const operationModeLabelMap: Record<'counter_only' | 'table_only' | 'table_delivery', string> = {
    counter_only: 'Balcão',
    table_only: 'Mesa',
    table_delivery: 'Mesa + Delivery',
  };

  useEffect(() => {
    if (!menuCacheKey) return;
    try {
      const raw = localStorage.getItem(menuCacheKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        products?: Product[];
        categories?: ProductCategory[];
        branding?: MenuPayload['branding'];
        loadedAt?: number;
      };
      const cachedProducts = parsed.products ?? [];
      const cachedCategories = parsed.categories ?? [];
      if (cachedProducts.length === 0 && cachedCategories.length === 0) return;
      setMenuProducts(cachedProducts);
      setMenuCategories(cachedCategories);
      setAllowGuestSelfOrder(parsed.branding?.allowGuestSelfOrder ?? true);
      setRequireWaiterApproval(parsed.branding?.requireWaiterApproval ?? true);
      setWhatsappNumber(normalizeDigits(parsed.branding?.whatsappNumber ?? ''));
      setOperationMode(parsed.branding?.operationMode ?? 'table_only');
      setCustomerFacingMessage((parsed.branding?.customerFacingMessage ?? '').trim());
      setEnableServiceBell(parsed.branding?.enableServiceBell ?? true);
      setBeverageChecklist(Array.isArray(parsed.branding?.beverageChecklist) ? parsed.branding?.beverageChecklist : []);
      setMenuLastLoadedAt(typeof parsed.loadedAt === 'number' ? parsed.loadedAt : null);
    } catch {
      // Ignora cache inválido e segue fluxo normal.
    }
  }, [menuCacheKey]);

  useEffect(() => {
    if (!order?.name) return;
    setCheckout((current) => {
      if (current.customerName.trim()) return current;
      return { ...current, customerName: order.name };
    });
  }, [order?.name]);

  const playNotificationSound = () => {
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, context.currentTime);
      gain.gain.setValueAtTime(0.1, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.5);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.5);
    } catch {
      // Ignora bloqueios de autoplay de áudio.
    }
  };

  useEffect(() => {
    if (!orderId) {
      setOrder(null);
      setError('Comanda inválida.');
      setIsLoading(false);
      return;
    }

    let active = true;
    const firstLoadStartedAt = Date.now();

    const loadOrder = async (isFirstLoad = false) => {
      try {
        const response = await fetch(`/api/public/order/${encodeURIComponent(orderId)}`, {
          cache: 'no-store',
        });

        if (!response.ok) {
          const shouldRetryForProvisioning =
            isFirstLoad &&
            (response.status === 403 || response.status === 404) &&
            (Date.now() - firstLoadStartedAt < ORDER_INITIAL_RETRY_WINDOW_MS);

          if (shouldRetryForProvisioning) {
            setIsLoading(true);
            setError('Preparando sua comanda, aguarde alguns segundos...');
            setTimeout(() => {
              if (!active) return;
              void loadOrder(true);
            }, ORDER_INITIAL_RETRY_DELAY_MS);
            return;
          }

          const archivedOrders = getArchivedOrders();
          const foundArchived = archivedOrders.find((item) => item.id === orderId) ?? null;

          if (!active) return;
          setOrder(foundArchived);
          setError(foundArchived ? null : 'Acesso encerrado ou comanda não encontrada.');
          setIsLoading(false);
          return;
        }

        const data = await response.json() as ActiveOrder;
        if (!active) return;

        const currentItemsCount = (data.items ?? []).reduce((sum, item) => sum + item.quantity, 0);
        if (prevItemsCount.current > 0 && currentItemsCount > prevItemsCount.current) {
          playNotificationSound();
          toast({
            title: 'Comanda atualizada',
            description: 'Novo item adicionado na sua comanda.',
            action: <BellRing className="h-4 w-4 text-primary animate-bounce" />,
          });
        }
        prevItemsCount.current = currentItemsCount;

        setOrder(data);
        setError(null);
        setIsLoading(false);
      } catch {
        if (!active) return;
        setError('Erro ao conectar com o servidor.');
        setIsLoading(false);
      }
    };

    let timer: ReturnType<typeof setTimeout> | null = null;

    const scheduleNextPoll = () => {
      if (!active) return;
      if (timer) clearTimeout(timer);
      const delay = document.visibilityState === 'visible'
        ? ORDER_POLL_INTERVAL_VISIBLE_MS
        : ORDER_POLL_INTERVAL_HIDDEN_MS;
      timer = setTimeout(() => {
        void loadOrder().finally(() => {
          scheduleNextPoll();
        });
      }, delay);
    };

    const handleVisibilityChange = () => {
      if (!active) return;
      if (document.visibilityState === 'visible') {
        void loadOrder();
      }
      scheduleNextPoll();
    };

    void loadOrder(true);
    scheduleNextPoll();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [orderId, toast]);

  const orderTotal = useMemo(() => {
    if (!order) return 0;
    return (order.items ?? []).reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [order]);

  const openedAt = order?.createdAt ? new Date(order.createdAt) : null;

  const inferredOrderOrigin = useMemo<NonNullable<ActiveOrder['orderOrigin']>>(() => {
    if (!order) return 'interno';
    if (order.orderOrigin) return order.orderOrigin;
    if (order.tableId || order.tableLabel || order.comandaNumber) return 'mesa_qr';
    if (order.isShared) return 'link_enviado';
    return 'interno';
  }, [order]);

  const inferredCustomerStatus = useMemo<NonNullable<ActiveOrder['customerStatus']>>(() => {
    if (!order) return 'enviado';
    if (order.customerStatus) return order.customerStatus;

    const items = order.items ?? [];
    if (items.some(item => item.pendingApproval)) return 'enviado';
    if (items.some(item => item.isPreparing && !item.isDelivered)) return 'em_producao';

    const hasKitchenItems = items.some(item => ['cat_lanches', 'cat_porcoes', 'cat_sobremesas'].includes(item.categoryId || ''));
    const allKitchenDelivered = hasKitchenItems && items.filter(item => ['cat_lanches', 'cat_porcoes', 'cat_sobremesas'].includes(item.categoryId || '')).every(item => item.isDelivered);
    if (allKitchenDelivered) return 'finalizado';

    return 'aceito';
  }, [order]);

  const currentStatusIndex = useMemo(() => {
    const index = statusFlow.indexOf(inferredCustomerStatus);
    return index >= 0 ? index : 0;
  }, [inferredCustomerStatus, statusFlow]);

  const cartEntries = useMemo(() => {
    return Object.entries(guestCart)
      .map(([productId, quantity]) => {
        const product = menuProducts.find((item) => item.id === productId);
        if (!product) return null;
        return {
          product,
          quantity,
          selectedComboComponentIds: guestComboComponents[productId] ?? [],
          note: guestItemNotes[productId] ?? '',
        };
      })
      .filter((entry): entry is { product: Product; quantity: number; selectedComboComponentIds: string[]; note: string } => Boolean(entry && entry.quantity > 0));
  }, [guestCart, menuProducts, guestComboComponents, guestItemNotes]);

  const cartTotal = useMemo(() => {
    return cartEntries.reduce((sum, entry) => sum + entry.product.price * entry.quantity, 0);
  }, [cartEntries]);

  const chatMessages = useMemo(() => {
    return [...(order?.chatMessages ?? [])].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [order?.chatMessages]);

  const comboPickerProduct = useMemo(() => {
    return menuProducts.find((product) => product.id === comboPickerProductId) ?? null;
  }, [comboPickerProductId, menuProducts]);

  const getComboComponentIds = (product: Product): string[] => {
    const raw = (product as Product & { comboComponentIds?: string[] }).comboComponentIds;
    return Array.isArray(raw) ? raw : [];
  };

  const comboPickerOptions = useMemo(() => {
    if (!comboPickerProduct) return [];
    const componentIds = getComboComponentIds(comboPickerProduct);
    return componentIds
      .map((id) => menuProducts.find((product) => product.id === id))
      .filter((product): product is Product => Boolean(product));
  }, [comboPickerProduct, menuProducts]);

  const beverageCustomizerProduct = useMemo(() => {
    return menuProducts.find((product) => product.id === beverageCustomizerProductId) ?? null;
  }, [beverageCustomizerProductId, menuProducts]);

  const isDrinkProduct = (product: Product) => {
    const category = menuCategories.find((item) => item.id === product.categoryId);
    const categoryName = (category?.name ?? '').toLowerCase();
    return /(bebida|cerveja|drink|suco|refrigerante|água|agua|coquetel|vinho)/i.test(categoryName);
  };

  const canCustomizeBeverage = (product: Product) => {
    return beverageChecklist.length > 0 && isDrinkProduct(product);
  };

  const openComboPicker = (product: Product) => {
    const comboIds = getComboComponentIds(product);
    if (!product.isCombo || !comboIds.length) {
      changeCartQty(product.id, 1);
      return;
    }

    const selected = guestComboComponents[product.id] ?? [...comboIds];
    setComboPickerProductId(product.id);
    setComboPickerSelection(selected);
    setIsComboPickerOpen(true);
  };

  const toggleComboPickerItem = (productId: string) => {
    setComboPickerSelection((current) => (
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId]
    ));
  };

  const confirmComboPicker = () => {
    if (!comboPickerProduct) return;
    const fallback = getComboComponentIds(comboPickerProduct);
    const selection = comboPickerSelection.length > 0 ? comboPickerSelection : fallback;
    setGuestComboComponents((current) => ({ ...current, [comboPickerProduct.id]: selection }));
    changeCartQty(comboPickerProduct.id, 1);
    setIsComboPickerOpen(false);
    setComboPickerProductId(null);
    setComboPickerSelection([]);
  };

  const openBeverageCustomizer = (product: Product) => {
    if (!canCustomizeBeverage(product)) return;
    const currentNote = guestItemNotes[product.id] ?? '';
    const nextValues: Record<string, { selected: boolean; quantity: number; applyAll: boolean }> = {};
    for (const option of beverageChecklist) {
      const escaped = option.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const quantityMatch = currentNote.match(new RegExp(`${escaped}:\\s*(\\d+)x`, 'i'));
      const allMatch = currentNote.match(new RegExp(`${escaped}:\\s*todos`, 'i'));
      nextValues[option] = {
        selected: Boolean(quantityMatch || allMatch),
        quantity: Number(quantityMatch?.[1] ?? 1),
        applyAll: Boolean(allMatch),
      };
    }
    setBeverageOptionValues(nextValues);
    setBeverageCustomizerProductId(product.id);
    setIsBeverageCustomizerOpen(true);
  };

  const saveBeverageCustomization = () => {
    const productId = beverageCustomizerProductId;
    if (!productId) return;
    const selectedLines = Object.entries(beverageOptionValues)
      .filter(([, value]) => value.selected)
      .map(([label, value]) => `${label}: ${value.applyAll ? 'todos' : `${Math.max(1, value.quantity)}x`}`);
    const note = selectedLines.length > 0 ? `Opções da bebida: ${selectedLines.join(' | ')}` : '';

    setGuestItemNotes((current) => {
      const next = { ...current };
      if (note) {
        next[productId] = note;
      } else {
        delete next[productId];
      }
      return next;
    });

    setIsBeverageCustomizerOpen(false);
    setBeverageCustomizerProductId(null);
    setBeverageOptionValues({});
  };

  const loadMenu = async () => {
    if (!order) return;

    const hasMenuInMemory = menuProducts.length > 0 && menuCategories.length > 0;
    if (hasMenuInMemory) {
      setIsMenuOpen(true);
      const isFresh = Boolean(menuLastLoadedAt && (Date.now() - menuLastLoadedAt < MENU_CACHE_FRESH_MS));
      if (isFresh) return;
    }

    setIsLoadingMenu(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), MENU_REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`/api/public/order/${encodeURIComponent(order.id)}/menu`, {
        cache: 'no-store',
        signal: controller.signal,
      });

      if (!response.ok) {
        toast({ title: 'Não foi possível carregar o cardápio', variant: 'destructive' });
        return;
      }

      const data = await response.json() as MenuPayload;
      setMenuProducts(data.products ?? []);
      setMenuCategories(data.categories ?? []);
      setAllowGuestSelfOrder(data.branding?.allowGuestSelfOrder ?? true);
      setRequireWaiterApproval(data.branding?.requireWaiterApproval ?? true);
      setWhatsappNumber(normalizeDigits(data.branding?.whatsappNumber ?? ''));
      setOperationMode(data.branding?.operationMode ?? 'table_only');
      setCustomerFacingMessage((data.branding?.customerFacingMessage ?? '').trim());
      setEnableServiceBell(data.branding?.enableServiceBell ?? true);
      setBeverageChecklist(Array.isArray(data.branding?.beverageChecklist) ? data.branding?.beverageChecklist : []);
      const loadedAt = Date.now();
      setMenuLastLoadedAt(loadedAt);
      if (menuCacheKey) {
        try {
          localStorage.setItem(menuCacheKey, JSON.stringify({
            products: data.products ?? [],
            categories: data.categories ?? [],
            branding: data.branding ?? {},
            loadedAt,
          }));
        } catch {
          // Falha de quota no storage não pode bloquear o pedido.
        }
      }
      setIsMenuOpen(true);
    } catch (error) {
      const hasCachedMenu = menuProducts.length > 0 && menuCategories.length > 0;
      const isAbortError = error instanceof DOMException && error.name === 'AbortError';
      if (hasCachedMenu) {
        setIsMenuOpen(true);
        toast({
          title: isAbortError ? 'Conexão lenta no momento' : 'Abrimos o último cardápio salvo',
          description: isAbortError
            ? 'Mostramos o menu em cache para não travar no carregamento.'
            : 'Os dados serão atualizados na próxima tentativa.',
        });
      } else {
        toast({
          title: isAbortError ? 'Conexão lenta para abrir o cardápio' : 'Erro ao carregar cardápio',
          variant: 'destructive',
        });
      }
    } finally {
      clearTimeout(timeoutId);
      setIsLoadingMenu(false);
    }
  };

  const changeCartQty = (productId: string, delta: number) => {
    setGuestCart((current) => {
      const nextQty = Math.max(0, Math.min(20, (current[productId] ?? 0) + delta));
      const next = { ...current };
      if (nextQty === 0) {
        delete next[productId];
        setGuestComboComponents((comboCurrent) => {
          if (!(productId in comboCurrent)) return comboCurrent;
          const comboNext = { ...comboCurrent };
          delete comboNext[productId];
          return comboNext;
        });
        setGuestItemNotes((noteCurrent) => {
          if (!(productId in noteCurrent)) return noteCurrent;
          const noteNext = { ...noteCurrent };
          delete noteNext[productId];
          return noteNext;
        });
      } else {
        next[productId] = nextQty;
      }
      return next;
    });
  };

  const submitGuestOrder = async (options?: { sendViaWhatsApp?: boolean }) => {
    if (!order || cartEntries.length === 0) return;

    setIsSubmittingCart(true);
    try {
      const response = await fetch(`/api/public/order/${encodeURIComponent(order.id)}/add-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartEntries.map((entry) => ({
            productId: entry.product.id,
            quantity: entry.quantity,
            comboComponentIds: entry.selectedComboComponentIds,
            note: entry.note || null,
          })),
          checkout: {
            customerName: checkout.customerName.trim(),
            phone: normalizeDigits(checkout.phone),
            cep: normalizeDigits(checkout.cep),
            addressLine: checkout.addressLine.trim(),
            addressNumber: checkout.addressNumber.trim(),
            neighborhood: checkout.neighborhood.trim(),
            city: checkout.city.trim(),
            state: checkout.state.trim(),
            complement: checkout.complement.trim() || null,
            paymentMethod: checkout.paymentMethod,
            cashAmount: checkout.paymentMethod === 'dinheiro' ? Number(checkout.cashAmount.replace(',', '.')) || null : null,
          },
        }),
      });

      if (!response.ok) {
        toast({ title: 'Não foi possível enviar o pedido', variant: 'destructive' });
        return;
      }

      setGuestCart({});
      setGuestItemNotes({});
      setIsCheckoutOpen(false);
      setIsMenuOpen(false);
      toast({
        title: 'Pedido enviado',
        description: requireWaiterApproval
          ? 'Seu pedido foi enviado e aguarda confirmação do atendente.'
          : 'Seu pedido foi adicionado na comanda.',
      });

      if (options?.sendViaWhatsApp) {
        if (!whatsappNumber) {
          toast({
            title: 'WhatsApp não configurado',
            description: 'Peça ao estabelecimento para configurar o número nas Configurações.',
            variant: 'destructive',
          });
          return;
        }

        const addressParts = [
          checkout.addressLine,
          checkout.addressNumber,
          checkout.neighborhood,
          checkout.city,
          checkout.state,
          checkout.cep ? `CEP ${checkout.cep}` : '',
          checkout.complement ? `Compl: ${checkout.complement}` : '',
        ].filter(Boolean);

        const paymentLine = checkout.paymentMethod === 'dinheiro'
          ? `Dinheiro${checkout.cashAmount ? ` (troco para R$ ${checkout.cashAmount})` : ''}`
          : checkout.paymentMethod === 'pix'
            ? 'PIX'
            : checkout.paymentMethod === 'debito'
              ? 'Cartão de débito'
              : 'Cartão de crédito';

        const itemsText = cartEntries
          .map((entry) => {
            const components = entry.selectedComboComponentIds
              .map((id) => menuProducts.find((product) => product.id === id)?.name)
              .filter((name): name is string => Boolean(name));
            const comboLine = components.length > 0 ? `\n  composição: ${components.join(' + ')}` : '';
            const noteLine = entry.note ? `\n  observações: ${entry.note}` : '';
            return `- ${entry.quantity}x ${entry.product.name} (${formatCurrency(entry.product.price * entry.quantity)})${comboLine}${noteLine}`;
          })
          .join('\n');

        const message = [
          `Olá! Novo pedido da comanda ${order.name}.`,
          '',
          `Cliente: ${checkout.customerName || order.name}`,
          `Telefone: ${checkout.phone || '-'}`,
          '',
          'Endereço:',
          addressParts.join(', ') || '-',
          '',
          `Pagamento: ${paymentLine}`,
          '',
          'Itens:',
          itemsText,
          '',
          `Total: ${formatCurrency(cartTotal)}`,
        ].join('\n');

        const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch {
      toast({ title: 'Erro ao enviar pedido', variant: 'destructive' });
    } finally {
      setIsSubmittingCart(false);
    }
  };

  const handleLookupCep = async () => {
    const cep = normalizeDigits(checkout.cep);
    if (cep.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!response.ok) return;
      const data = await response.json() as {
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
        erro?: boolean;
      };
      if (data.erro) return;

      setCheckout((current) => ({
        ...current,
        addressLine: current.addressLine || (data.logradouro ?? ''),
        neighborhood: current.neighborhood || (data.bairro ?? ''),
        city: current.city || (data.localidade ?? ''),
        state: current.state || (data.uf ?? ''),
      }));
    } catch {
      // Sem bloqueio do fluxo em caso de falha no ViaCEP.
    }
  };

  const validateCheckoutForWhatsApp = () => {
    if (!checkout.customerName.trim()) return 'Informe o nome do cliente.';
    if (normalizeDigits(checkout.phone).length < 10) return 'Informe um telefone válido.';
    if (normalizeDigits(checkout.cep).length !== 8) return 'Informe um CEP válido com 8 dígitos.';
    if (!checkout.addressLine.trim()) return 'Informe o endereço.';
    if (!checkout.addressNumber.trim()) return 'Informe o número do endereço.';
    if (!checkout.neighborhood.trim()) return 'Informe o bairro.';
    if (!checkout.city.trim()) return 'Informe a cidade.';
    if (!checkout.state.trim()) return 'Informe o estado.';
    if (checkout.paymentMethod === 'dinheiro' && (!checkout.cashAmount.trim() || Number(checkout.cashAmount.replace(',', '.')) <= 0)) {
      return 'Informe o valor em dinheiro para calcular o troco.';
    }
    return null;
  };

  const callWaiter = async () => {
    if (!order) return;

    setIsCallingWaiter(true);
    try {
      const response = await fetch(`/api/public/order/${encodeURIComponent(order.id)}/service-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'waiter' }),
      });

      if (!response.ok) {
        toast({ title: 'Não foi possível chamar atendente', variant: 'destructive' });
        return;
      }

      toast({ title: 'Atendente chamado', description: 'A equipe foi notificada.' });
    } catch {
      toast({ title: 'Erro de conexão', variant: 'destructive' });
    } finally {
      setIsCallingWaiter(false);
    }
  };

  const submitChatMessage = async (text: string, kind: OrderChatMessage['kind'] = 'text') => {
    if (!order) return;
    const normalizedText = text.trim();
    if (!normalizedText) return;

    setIsSendingChat(true);
    try {
      const response = await fetch(`/api/public/order/${encodeURIComponent(order.id)}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: normalizedText, kind }),
      });

      if (!response.ok) {
        toast({ title: 'Não foi possível enviar mensagem', variant: 'destructive' });
        return;
      }

      const payload = await response.json() as { message?: OrderChatMessage };
      if (payload.message) {
        const message = payload.message;
        setOrder((current) => (
          current
            ? { ...current, chatMessages: [...(current.chatMessages ?? []), message] }
            : current
        ));
      }
      setChatInput('');
    } catch {
      toast({ title: 'Erro ao enviar mensagem', variant: 'destructive' });
    } finally {
      setIsSendingChat(false);
    }
  };

  const canCallWaiter = enableServiceBell && operationMode !== 'counter_only';
  const customerFacingHint = customerFacingMessage || (
    operationMode === 'counter_only'
      ? 'Retire seu pedido no balcão quando for chamado.'
      : operationMode === 'table_delivery'
        ? 'Você pode pedir para mesa ou informar entrega no WhatsApp.'
        : 'Faça seu pedido e aguarde a confirmação do atendimento.'
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Carregando sua comanda...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 md:gap-8 md:p-8 min-h-screen">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto bg-muted rounded-full p-4 w-fit mb-4">
              <FileX className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle>Comanda indisponível</CardTitle>
            <CardDescription>
              {error || 'O acesso a esta comanda foi encerrado pelo estabelecimento ou ela foi fechada.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                removeCounterSaleDraft('barmate_last_order_id');
                window.location.href = '/guest/register';
              }}
            >
              Solicitar novo acesso
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-4 p-4 md:gap-8 md:p-8 min-h-screen bg-muted/30">
      <Card className="w-full max-w-xl shadow-xl border-t-4 border-t-primary">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 rounded-full p-4 w-fit mb-4">
            <ShoppingCart className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Sua Comanda: {order.name}</CardTitle>
          <CardDescription>
            Abertura: {openedAt ? format(openedAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'Data indisponível'}
          </CardDescription>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {order.tableLabel && <Badge variant="secondary">{order.tableLabel}</Badge>}
            {order.comandaNumber && <Badge variant="secondary">Comanda {order.comandaNumber}</Badge>}
            <Badge variant="outline">Origem: {orderOriginLabelMap[inferredOrderOrigin]}</Badge>
            {order.status === 'paid' && <Badge className="bg-green-600">Comanda paga</Badge>}
            <Badge className="bg-blue-600">Status: {statusLabelMap[inferredCustomerStatus]}</Badge>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border bg-muted/20 p-3 mb-4">
            <p className="text-xs font-black uppercase tracking-wide mb-2 text-muted-foreground">Acompanhamento do pedido</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {statusFlow.map((step, index) => {
                const reached = currentStatusIndex >= index;
                return (
                  <div
                    key={step}
                    className={`text-[11px] rounded px-2 py-1 border font-bold ${reached ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-background border-border text-muted-foreground'}`}
                  >
                    {statusLabelMap[step]}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-md border bg-background p-3 mb-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-black uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                <MessageCircle className="h-3.5 w-3.5" />
                Chat com Atendimento
              </p>
              <Badge variant="outline" className="text-[10px]">{chatMessages.length} mensagens</Badge>
            </div>

            <div className="max-h-44 overflow-y-auto space-y-2 pr-1">
              {chatMessages.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sem mensagens ainda. Use os atalhos abaixo para responder rápido ao atendimento.</p>
              ) : chatMessages.map((message) => {
                const isGuest = message.sender === 'guest';
                return (
                  <div key={message.id} className={`rounded-md px-3 py-2 text-xs ${isGuest ? 'bg-primary/10 border border-primary/30 ml-6' : 'bg-muted border mr-6'}`}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-black uppercase tracking-wide text-[10px]">{isGuest ? 'Você' : 'Atendimento'}</span>
                      <span className="text-[10px] text-muted-foreground">{format(new Date(message.createdAt), 'HH:mm', { locale: ptBR })}</span>
                    </div>
                    <p className="whitespace-pre-wrap break-words">{message.text}</p>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => void submitChatMessage('Pode trocar.', 'quick')} disabled={isSendingChat}>Pode trocar</Button>
              <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => void submitChatMessage('Retira item, por favor.', 'quick')} disabled={isSendingChat}>Retira item</Button>
              <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => void submitChatMessage('Cancelar item, por favor.', 'quick')} disabled={isSendingChat}>Cancelar item</Button>
            </div>

            <div className="flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Escreva uma mensagem para o atendimento..."
                maxLength={500}
              />
              <Button onClick={() => void submitChatMessage(chatInput)} disabled={isSendingChat || !chatInput.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-base">Item</TableHead>
                <TableHead className="text-center text-base">Qtd.</TableHead>
                <TableHead className="text-right text-base">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.length > 0 ? (
                order.items.map((item, index) => (
                  <TableRow key={item.lineItemId || `${item.id}-${index}`}>
                    <TableCell>
                      <div className="font-semibold text-sm">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{formatCurrency(item.price)}</div>
                      {item.pendingApproval && (
                        <div className="text-[10px] mt-1 font-bold uppercase tracking-wide text-amber-600">
                          Aguardando confirmação
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-medium">{item.quantity}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(item.price * item.quantity)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-muted-foreground italic">
                    Nenhum item na sua comanda ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>

        <CardFooter className="flex-col gap-3 bg-muted/10 p-6">
          <Separator className="mb-1" />
          <div className="w-full flex justify-between text-xl font-black">
            <span>TOTAL:</span>
            <span className="text-primary">{formatCurrency(orderTotal)}</span>
          </div>

          <div className="grid w-full gap-2 sm:grid-cols-2">
            <Button onClick={() => void loadMenu()} disabled={isLoadingMenu}>
              <UtensilsCrossed className="mr-2 h-4 w-4" />
              {isLoadingMenu ? 'Carregando...' : 'Abrir Cardápio'}
            </Button>
            {canCallWaiter ? (
              <Button variant="outline" onClick={() => void callWaiter()} disabled={isCallingWaiter}>
                <Bell className="mr-2 h-4 w-4" />
                {isCallingWaiter ? 'Chamando...' : 'Chamar Atendente'}
              </Button>
            ) : (
              <Button variant="outline" disabled>
                Atendimento no balcão
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>

      <p className="text-[10px] uppercase tracking-widest text-muted-foreground text-center max-w-md mt-1 font-bold">
        Modo: {operationModeLabelMap[operationMode]}. {customerFacingHint}
      </p>

      <Dialog open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cardápio da Mesa</DialogTitle>
            <DialogDescription>
              Escolha os itens e envie direto para sua comanda.
            </DialogDescription>
          </DialogHeader>

          {!allowGuestSelfOrder ? (
            <div className="rounded-md border p-4 text-sm text-muted-foreground">
              O autoatendimento está desativado neste estabelecimento. Use o botão "Chamar Atendente".
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-[1fr_260px]">
              <ScrollArea className="h-[50vh] pr-2">
                <div className="space-y-4">
                  {menuCategories.map((category) => {
                    const products = menuProducts.filter((product) => product.categoryId === category.id);
                    if (products.length === 0) return null;

                    return (
                      <div key={category.id} className="space-y-2">
                        <h4 className="text-sm font-black uppercase tracking-wide text-muted-foreground">{category.name}</h4>
                        <div className="space-y-2">
                          {products.map((product) => {
                            const qty = guestCart[product.id] ?? 0;
                            return (
                              <div key={product.id} className="rounded-md border p-3 flex items-center justify-between gap-3">
                                <div className="min-w-0 flex items-center gap-3">
                                  {product.imageUrl ? (
                                    <img
                                      src={product.imageUrl}
                                      alt={product.name}
                                      className="h-12 w-12 rounded-md object-cover border"
                                    />
                                  ) : null}
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold truncate">{product.name}</p>
                                    {product.isCombo && getComboComponentIds(product).length > 0 ? (
                                      <p className="text-[11px] text-muted-foreground">Combo montável</p>
                                    ) : null}
                                    {product.description ? (
                                      <p className="text-xs text-muted-foreground break-words">{product.description}</p>
                                    ) : null}
                                    {guestItemNotes[product.id] ? (
                                      <p className="text-[11px] text-emerald-700 break-words">{guestItemNotes[product.id]}</p>
                                    ) : null}
                                    <p className="text-xs text-muted-foreground">{formatCurrency(product.price)}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  {canCustomizeBeverage(product) ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 px-2 text-[11px]"
                                      onClick={() => openBeverageCustomizer(product)}
                                    >
                                      Personalizar
                                    </Button>
                                  ) : null}
                                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => changeCartQty(product.id, -1)}>
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                  <span className="w-6 text-center text-sm font-bold">{qty}</span>
                                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openComboPicker(product)}>
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              <div className="rounded-md border bg-muted/20 p-3 flex flex-col gap-3 h-fit">
                <h4 className="text-sm font-black uppercase tracking-wide">Resumo</h4>
                <div className="text-xs text-muted-foreground">
                  {cartEntries.length === 0 ? 'Nenhum item selecionado.' : `${cartEntries.length} item(ns) no pedido.`}
                </div>
                <div className="text-lg font-black text-primary">{formatCurrency(cartTotal)}</div>
                {requireWaiterApproval && (
                  <div className="text-[11px] text-amber-700 bg-amber-100 rounded px-2 py-1">
                    Pedidos enviados pelo cliente ficam pendentes até confirmação do atendente.
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMenuOpen(false)}>Fechar</Button>
            <Button
              variant="secondary"
              onClick={() => setIsCheckoutOpen(true)}
              disabled={!allowGuestSelfOrder || cartEntries.length === 0}
            >
              Finalizar via WhatsApp
            </Button>
            <Button
              onClick={() => void submitGuestOrder()}
              disabled={!allowGuestSelfOrder || cartEntries.length === 0 || isSubmittingCart}
            >
              {isSubmittingCart ? 'Enviando...' : 'Enviar Pedido'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Finalizar Pedido no WhatsApp</DialogTitle>
            <DialogDescription>
              Preencha seus dados para enviar o pedido com endereço, pagamento e troco.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label>Nome</Label>
              <Input
                value={checkout.customerName}
                onChange={(e) => setCheckout((c) => ({ ...c, customerName: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Telefone</Label>
                <Input
                  value={checkout.phone}
                  onChange={(e) => setCheckout((c) => ({ ...c, phone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div className="grid gap-2">
                <Label>CEP</Label>
                <Input
                  value={checkout.cep}
                  onChange={(e) => setCheckout((c) => ({ ...c, cep: e.target.value }))}
                  onBlur={() => void handleLookupCep()}
                  placeholder="00000-000"
                />
              </div>
            </div>

            <div className="grid grid-cols-[1fr_120px] gap-3">
              <div className="grid gap-2">
                <Label>Endereço</Label>
                <Input
                  value={checkout.addressLine}
                  onChange={(e) => setCheckout((c) => ({ ...c, addressLine: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Número</Label>
                <Input
                  value={checkout.addressNumber}
                  onChange={(e) => setCheckout((c) => ({ ...c, addressNumber: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-2 col-span-2">
                <Label>Bairro</Label>
                <Input
                  value={checkout.neighborhood}
                  onChange={(e) => setCheckout((c) => ({ ...c, neighborhood: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>UF</Label>
                <Input
                  value={checkout.state}
                  onChange={(e) => setCheckout((c) => ({ ...c, state: e.target.value.toUpperCase().slice(0, 2) }))}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Cidade</Label>
              <Input
                value={checkout.city}
                onChange={(e) => setCheckout((c) => ({ ...c, city: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label>Complemento (opcional)</Label>
              <Input
                value={checkout.complement}
                onChange={(e) => setCheckout((c) => ({ ...c, complement: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Forma de Pagamento</Label>
                <Select
                  value={checkout.paymentMethod}
                  onValueChange={(value: CheckoutPaymentMethod) => setCheckout((c) => ({ ...c, paymentMethod: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="debito">Cartão de débito</SelectItem>
                    <SelectItem value="credito">Cartão de crédito</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {checkout.paymentMethod === 'dinheiro' ? (
                <div className="grid gap-2">
                  <Label>Troco para (R$)</Label>
                  <Input
                    value={checkout.cashAmount}
                    onChange={(e) => setCheckout((c) => ({ ...c, cashAmount: e.target.value }))}
                    placeholder="Ex: 100,00"
                  />
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label>Total</Label>
                  <Input value={formatCurrency(cartTotal)} readOnly />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCheckoutOpen(false)}>Cancelar</Button>
            <Button
              disabled={isSubmittingCart || cartEntries.length === 0}
              onClick={() => {
                const validation = validateCheckoutForWhatsApp();
                if (validation) {
                  toast({ title: validation, variant: 'destructive' });
                  return;
                }
                void submitGuestOrder({ sendViaWhatsApp: true });
              }}
            >
              {isSubmittingCart ? 'Enviando...' : 'Enviar via WhatsApp'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isComboPickerOpen} onOpenChange={setIsComboPickerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Montar combo</DialogTitle>
            <DialogDescription>
              Selecione os itens do combo antes de adicionar ao pedido.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-[45vh] overflow-y-auto">
            {comboPickerOptions.map((option) => {
              const selected = comboPickerSelection.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggleComboPickerItem(option.id)}
                  className={`w-full text-left border rounded-md px-3 py-2 transition ${selected ? 'border-primary bg-primary/10' : 'hover:bg-muted/40'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold truncate">{option.name}</span>
                    <span className="text-xs text-muted-foreground">{formatCurrency(option.price)}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsComboPickerOpen(false)}>Cancelar</Button>
            <Button onClick={confirmComboPicker}>Adicionar Combo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBeverageCustomizerOpen} onOpenChange={setIsBeverageCustomizerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Personalizar bebida</DialogTitle>
            <DialogDescription>
              Marque os complementos para {beverageCustomizerProduct?.name ?? 'a bebida'}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
            {beverageChecklist.map((option) => {
              const value = beverageOptionValues[option] ?? { selected: false, quantity: 1, applyAll: false };
              return (
                <div key={option} className="rounded-md border p-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={value.selected}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setBeverageOptionValues((current) => ({
                          ...current,
                          [option]: {
                            ...value,
                            selected: checked,
                          },
                        }));
                      }}
                      className="h-4 w-4"
                    />
                    <span className="text-sm font-semibold">{option}</span>
                  </div>
                  {value.selected ? (
                    <div className="grid grid-cols-[110px_1fr] gap-2 items-center">
                      <Button
                        variant={value.applyAll ? 'default' : 'outline'}
                        type="button"
                        className="h-8"
                        onClick={() => {
                          setBeverageOptionValues((current) => ({
                            ...current,
                            [option]: {
                              ...value,
                              applyAll: !value.applyAll,
                            },
                          }));
                        }}
                      >
                        Todos
                      </Button>
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        disabled={value.applyAll}
                        value={value.quantity}
                        onChange={(e) => {
                          const parsed = Number(e.target.value);
                          setBeverageOptionValues((current) => ({
                            ...current,
                            [option]: {
                              ...value,
                              quantity: Number.isFinite(parsed) ? Math.max(1, Math.min(20, parsed)) : 1,
                            },
                          }));
                        }}
                        placeholder="Qtd"
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBeverageCustomizerOpen(false)}>Cancelar</Button>
            <Button onClick={saveBeverageCustomization}>Salvar opções</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
