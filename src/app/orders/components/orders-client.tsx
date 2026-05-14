
"use client";

import type { Product, OrderItem, Sale, ActiveOrder, ProductCategory, Client, GuestRequest, OrderChatMessage } from '@/types';
import { formatCurrency, LUCIDE_ICON_MAP } from '@/lib/constants';
import { getProducts, getProductCategories, addSale, getOpenOrders, saveOpenOrders, getClients, getArchivedOrders, saveArchivedOrders } from '@/lib/data-access';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, MinusCircle, Trash2, Search, Package, Merge, Wallet, Link as LinkIcon, Link2Off, Plus, Wifi, Copy, LayoutGrid, List, Printer, UserPlus, Check, X, Bell, ChefHat, Edit, Archive, MousePointer2, ListChecks, MessageCircle, Send, History } from 'lucide-react';
import { ClosedOrdersDialog } from './closed-orders-dialog';
import PaymentDialog from './payment-dialog';
import CreateOrderDialog from './create-order-dialog';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { db, doc, setDoc, deleteDoc, collection, onSnapshot, updateDoc } from "@/lib/supabase-firestore";
import { OrderStatement } from './order-statement';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Checkbox } from '@/components/ui/checkbox';

const KITCHEN_CATEGORIES = ['cat_lanches', 'cat_porcoes', 'cat_sobremesas'];
const ORDERS_UI_VERSION = 'orders-ui-2026-05-10-1';

const resolveCustomerStatus = (items: OrderItem[]): ActiveOrder['customerStatus'] => {
  if (items.some((item) => item.pendingApproval)) return 'enviado';
  if (items.some((item) => item.isPreparing && !item.isDelivered)) return 'em_producao';

  const kitchenItems = items.filter((item) => KITCHEN_CATEGORIES.includes(item.categoryId || ''));
  if (kitchenItems.length > 0 && kitchenItems.every((item) => item.isDelivered)) return 'finalizado';

  return 'aceito';
};

function ProductDisplay({ products, productCategories, addToOrder, viewMode }: { products: Product[], productCategories: ProductCategory[], addToOrder: (p: Product) => void, viewMode: 'grid' | 'list' }) {
  if (products.length === 0) return <p className="text-muted-foreground text-center py-10 text-xs">Nenhum produto encontrado.</p>;

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 gap-2">
        {products.map(product => {
          const category = productCategories.find(c => c.id === product.categoryId);
          const IconComponent = category ? (LUCIDE_ICON_MAP[category.iconName] || Package) : Package;
          return (
            <Card key={product.id} className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group border-none shadow-none bg-muted/20" onClick={() => addToOrder(product)}>
              <div className="aspect-square bg-muted/50 flex items-center justify-center p-2 group-hover:bg-muted/80 transition-colors rounded-lg">
                <IconComponent className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <CardContent className="p-1 text-center">
                <h3 className="font-medium truncate text-[10px] leading-tight mb-0.5">{product.name}</h3>
                <p className="text-primary font-black text-[10px]">{formatCurrency(product.price)}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {products.map(product => {
        const category = productCategories.find(c => c.id === product.categoryId);
        const IconComponent = category ? (LUCIDE_ICON_MAP[category.iconName] || Package) : Package;
        return (
          <div key={product.id} className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50 cursor-pointer" onClick={() => addToOrder(product)}>
            <div className="flex items-center gap-3">
              <IconComponent className="h-5 w-5 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">{product.name}</p>
                <p className="text-[10px] text-muted-foreground">{category?.name}</p>
              </div>
            </div>
            <div className="text-xs font-black text-primary">{formatCurrency(product.price)}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function OrdersClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [openOrders, setOpenOrders] = useState<ActiveOrder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [pendingRequests, setPendingRequests] = useState<GuestRequest[]>([]);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<ActiveOrder | null>(null);
  const [orderToArchive, setOrderToArchive] = useState<ActiveOrder | null>(null);

  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isCreateOrderDialogOpen, setIsCreateOrderDialogOpen] = useState(false);
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const [isCreditDialogOpen, setIsCreditDialogOpen] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [isRequestsDialogOpen, setIsRequestsDialogOpen] = useState(false);
  const [isClosedOrdersDialogOpen, setIsClosedOrdersDialogOpen] = useState(false);
  const [isEditNameDialogOpen, setIsEditNameDialogOpen] = useState(false);
  const [orderToShare, setOrderToShare] = useState<ActiveOrder | null>(null);
  const [newName, setNewName] = useState('');
  const [staffChatInput, setStaffChatInput] = useState('');

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});

  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [activeDisplayCategory, setActiveDisplayCategory] = useState<string>('Todos');

  const prepareForFirestore = (data: any) => JSON.parse(JSON.stringify(data, (k, v) => v === undefined ? null : v));

  const syncOrderToFirestore = async (order: ActiveOrder) => {
    if (!db) return;
    try {
        await setDoc(doc(db, 'open_orders', order.id), prepareForFirestore({
            ...order,
            updatedAt: new Date().toISOString()
        }), { merge: true });
    } catch (e) {
        console.error("Erro ao sincronizar:", e);
    }
  };

  const deleteOrderFromFirestore = async (orderId: string) => {
    if (!db) return;
    try {
        await deleteDoc(doc(db, 'open_orders', orderId));
    } catch (e) {}
  };

  useEffect(() => {
    if (!db) return;
    const unsubscribe = onSnapshot(collection(db, 'open_orders'), (snapshot) => {
        // Deduplica por ID para evitar múltiplas cópias do mesmo documento
        const seenIds = new Set<string>();
        const cloudOrders = snapshot.docs
          .map(doc => {
              const data = doc.data();
              return {
                  id: doc.id,
                  ...data,
                  createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
                  updatedAt: data.updatedAt || new Date().toISOString(),
                  viewerCount: data.viewerCount || 0
              } as ActiveOrder;
          })
          .filter(order => {
              // Mantém apenas o primeiro documento com cada ID
              if (seenIds.has(order.id)) {
                  console.warn(`[onSnapshot] Duplicata detectada: ${order.id}, removendo`);
                  return false;
              }
              seenIds.add(order.id);
              return true;
          });

        saveOpenOrders(cloudOrders);
        setOpenOrders([...cloudOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchPendingRequests = async () => {
      try {
        const res = await fetch('/api/db/guest-requests');
        if (!res.ok) return;
        const data = await res.json() as GuestRequest[];
        setPendingRequests(data.filter(r => r.status === 'pending'));
      } catch {}
    };
    void fetchPendingRequests();
    const interval = setInterval(() => void fetchPendingRequests(), 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = useCallback(() => {
    setIsLoading(true);
    setProducts(getProducts());
    setProductCategories(getProductCategories());
    setClients(getClients());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    window.addEventListener('barmate-app-state-changed', fetchData);
    return () => window.removeEventListener('barmate-app-state-changed', fetchData);
  }, [fetchData]);

  const currentOrder = useMemo(() => openOrders.find(o => o.id === currentOrderId), [openOrders, currentOrderId]);

  const orderTotal = useMemo(() => {
    if (!currentOrder) return 0;
    return currentOrder.items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  }, [currentOrder]);

  const selectedTotal = useMemo(() => {
    if (!currentOrder || !isSelectionMode) return 0;
    return currentOrder.items.reduce((acc, i) => {
        if (i.isPaid) return acc;
        let qty = selectedItems[i.lineItemId!] || 0;
        qty = Math.min(qty, i.quantity);
        return acc + (i.price * qty);
    }, 0);
  }, [currentOrder, isSelectionMode, selectedItems]);

  const totalOpenOrdersValue = useMemo(() => {
    return openOrders.reduce((sum, order) => {
        const orderVal = order.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        return sum + orderVal;
    }, 0);
  }, [openOrders]);

  const pendingApprovalCount = useMemo(() => {
    if (!currentOrder) return 0;
    return currentOrder.items.filter((item) => item.pendingApproval).length;
  }, [currentOrder]);

  useEffect(() => {
    if (currentOrderId) {
        setNewName(currentOrder?.name || '');
        setIsSelectionMode(false);
        setSelectedItems({});
        setStaffChatInput('');
    }
  }, [currentOrderId, currentOrder?.name]);

  const updateOrdersAndSync = (updatedOrders: ActiveOrder[]) => {
      const now = new Date().toISOString();
      const targetOrder = updatedOrders.find(o => o.id === currentOrderId);
      if (targetOrder) {
          const updatedTarget = { ...targetOrder, updatedAt: now };
          // Atualizacao otimista local: UI responde instantaneamente, sync com Supabase em background.
          setOpenOrders(prev => prev.map(o => o.id === updatedTarget.id ? updatedTarget : o));
          void syncOrderToFirestore(updatedTarget);
      }
  };

  const addToOrder = (product: Product) => {
    if (!currentOrderId || !currentOrder) {
        toast({ title: "Selecione uma comanda!", variant: "destructive" });
        return;
    }
    const items = [...currentOrder.items];
    const existingIdx = items.findIndex(i => i.id === product.id && i.price >= 0 && !i.isDelivered && !i.isPaid);
    if (existingIdx !== -1) {
        items[existingIdx] = { ...items[existingIdx], quantity: items[existingIdx].quantity + 1, addedAt: new Date().toISOString() };
    } else {
        items.push({ ...product, lineItemId: `li-${product.id}-${Date.now()}`, quantity: 1, isDelivered: false, addedAt: new Date().toISOString(), claimedQuantity: 0, isPaid: false });
    }
    updateOrdersAndSync(openOrders.map(o => o.id === currentOrderId ? { ...currentOrder, items } : o));
  };

  const updateQuantity = (lineItemId: string, newQty: number) => {
    if (!currentOrder) return;
    const items = newQty <= 0 ? currentOrder.items.filter(i => i.lineItemId !== lineItemId) : currentOrder.items.map(i => i.lineItemId === lineItemId ? { ...i, quantity: newQty } : i);
    updateOrdersAndSync(openOrders.map(o => o.id === currentOrderId ? { ...currentOrder, items } : o));
  };

  const removeFromOrder = (lineItemId: string) => {
    if (!currentOrder) return;
    updateOrdersAndSync(openOrders.map(o => o.id === currentOrderId ? { ...currentOrder, items: currentOrder.items.filter(i => i.lineItemId !== lineItemId) } : o));
  };

  const handleUpdateOrderName = async () => {
    if (!currentOrder || !newName.trim()) return;
    await syncOrderToFirestore({ ...currentOrder, name: newName.trim(), updatedAt: new Date().toISOString() });
    setIsEditNameDialogOpen(false);
    toast({ title: "Nome atualizado!" });
  };

  const handleClaimUnit = async (lineItemId: string) => {
    if (!currentOrder) return;
    let changed = false;
    const updatedItems = currentOrder.items.map(i => {
        if (i.lineItemId === lineItemId) {
            const totalUnits = (i.comboItems || 0) * i.quantity;
            const current = i.claimedQuantity || 0;
            if (current < totalUnits) { changed = true; return { ...i, claimedQuantity: current + 1 }; }
        }
        return i;
    });
    if (changed) {
        const updatedOrder = { ...currentOrder, items: updatedItems };
        const isFullyDelivered = updatedItems.every(item => !item.isCombo || (item.claimedQuantity || 0) >= ((item.comboItems || 0) * item.quantity));
        const saldoFinal = updatedItems.reduce((acc, i) => acc + i.price * i.quantity, 0);

        const temEntregaPendente = updatedItems.some(item =>
            KITCHEN_CATEGORIES.includes(item.categoryId || '') && !item.isDelivered
        );

        if (isFullyDelivered && Math.abs(saldoFinal) <= 0.05 && !temEntregaPendente) {
            await deleteOrderFromFirestore(currentOrder.id);
            setCurrentOrderId(null);
            toast({ title: "Combo entregue e comanda encerrada!" });
        } else { await syncOrderToFirestore(updatedOrder); }
    }
  };

  const handleSendToKitchen = (lineItemId: string) => {
    if (!currentOrder) return;
    const items = currentOrder.items.map(i => i.lineItemId === lineItemId ? { ...i, forceKitchenVisible: true, isDelivered: false } : i);
    updateOrdersAndSync(openOrders.map(o => o.id === currentOrderId ? { ...currentOrder, items } : o));
    toast({ title: "Enviado para cozinha!" });
  };

  const handleApprovePendingItem = (lineItemId: string) => {
    if (!currentOrder) return;
    const items = currentOrder.items.map((item) => (
      item.lineItemId === lineItemId
        ? { ...item, pendingApproval: false }
        : item
    ));
    const updatedOrder = {
      ...currentOrder,
      items,
      customerStatus: resolveCustomerStatus(items),
    };
    updateOrdersAndSync(openOrders.map((order) => order.id === currentOrderId ? updatedOrder : order));
    toast({ title: 'Item confirmado para produção' });
  };

  const handleRejectPendingItem = (lineItemId: string) => {
    if (!currentOrder) return;
    const items = currentOrder.items.filter((item) => item.lineItemId !== lineItemId);
    const updatedOrder = {
      ...currentOrder,
      items,
      customerStatus: resolveCustomerStatus(items),
    };
    updateOrdersAndSync(openOrders.map((order) => order.id === currentOrderId ? updatedOrder : order));
    toast({ title: 'Item pendente recusado' });
  };

  const handleApproveAllPending = () => {
    if (!currentOrder) return;
    const items = currentOrder.items.map((item) => item.pendingApproval ? { ...item, pendingApproval: false } : item);
    const updatedOrder = {
      ...currentOrder,
      items,
      customerStatus: resolveCustomerStatus(items),
    };
    updateOrdersAndSync(openOrders.map((order) => order.id === currentOrderId ? updatedOrder : order));
    toast({ title: 'Todos os itens pendentes foram confirmados' });
  };

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    await deleteOrderFromFirestore(orderToDelete.id);
    if (currentOrderId === orderToDelete.id) setCurrentOrderId(null);
    setOrderToDelete(null);
    toast({ title: "Comanda Cancelada" });
  };

  const handleArchiveOrder = async () => {
    if (!orderToArchive) return;
    saveArchivedOrders([...getArchivedOrders(), orderToArchive]);
    await deleteOrderFromFirestore(orderToArchive.id);
    if (currentOrderId === orderToArchive.id) setCurrentOrderId(null);
    setOrderToArchive(null);
    toast({ title: "Comanda Arquivada!", description: "Itens movidos para a dívida do cliente." });
  };

  const handlePrintStatement = () => {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow && currentOrder) {
        const statementElement = document.getElementById('printable-statement');
        if (statementElement) {
            printWindow.document.write('<html><head><title>Extrato</title><style>body{font-family:monospace;padding:20px;}table{width:100%;}th,td{text-align:left;padding:5px;border-bottom:1px dashed #ccc;}.text-right{text-align:right;}.text-center{text-align:center;}hr{border:none;border-top:1px dashed black;}</style></head><body>' + statementElement.innerHTML + '</body></html>');
            printWindow.document.close();
            setTimeout(() => { printWindow.focus(); printWindow.print(); printWindow.close(); }, 250);
        }
    }
  };

  const toggleItemSelection = (id: string, maxQty: number) => {
    setSelectedItems(prev => {
      const newItems = { ...prev };
      if (newItems[id]) {
        delete newItems[id];
      } else {
        newItems[id] = maxQty;
      }
      return newItems;
    });
  };

  const adjustSelectedQty = (id: string, delta: number, maxQty: number) => {
    setSelectedItems(prev => {
      const current = prev[id] || 0;
      const next = Math.max(1, Math.min(maxQty, current + delta));
      return { ...prev, [id]: next };
    });
  };

  const appendStaffChatMessage = (text: string, kind: OrderChatMessage['kind'] = 'text') => {
    if (!currentOrder || !currentOrderId) return;
    const normalizedText = text.trim();
    if (!normalizedText) return;

    const message: OrderChatMessage = {
      id: `msg-s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sender: 'staff',
      text: normalizedText,
      createdAt: new Date().toISOString(),
      kind,
    };

    const items = currentOrder.items;
    const customerStatus = items.some((item) => item.pendingApproval) ? 'enviado' : (currentOrder.customerStatus ?? 'aceito');
    const updatedOrder = {
      ...currentOrder,
      customerStatus,
      chatMessages: [...(currentOrder.chatMessages ?? []), message],
    };
    updateOrdersAndSync(openOrders.map((order) => order.id === currentOrderId ? updatedOrder : order));
    setStaffChatInput('');
    toast({ title: 'Mensagem enviada para o cliente' });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><p>Carregando comandas...</p></div>;
  }

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 h-[calc(100vh-100px)]">
        <div className="md:col-span-1 xl:col-span-3 flex flex-col h-full min-w-0">
          <Card className="flex-grow flex flex-col">
            <CardHeader className="space-y-4 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle>Comandas</CardTitle>
                <div className="flex items-center gap-1">
                  <Button variant="outline" onClick={() => setIsClosedOrdersDialogOpen(true)} className="h-8 px-2 gap-1" title="Histórico de comandas fechadas">
                    <History className="h-4 w-4" />
                    <span className="text-xs font-semibold">Histórico</span>
                  </Button>
                  <Button size="icon" variant="outline" onClick={() => setIsCreateOrderDialogOpen(true)} className="h-8 w-8"><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
              {pendingRequests.length > 0 && (
                  <Button variant="destructive" className="w-full animate-pulse flex items-center gap-2 font-black" onClick={() => setIsRequestsDialogOpen(true)}>
                    <Bell className="h-4 w-4" /> {pendingRequests.length} SOLICITAÇÕES
                  </Button>
              )}
              <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar mesa..." value={orderSearchTerm} onChange={e => setOrderSearchTerm(e.target.value)} className="pl-8" /></div>
              <p className="text-[10px] text-muted-foreground">{ORDERS_UI_VERSION}</p>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden p-0">
              <ScrollArea className="h-full p-2">
                <div className="space-y-2">
                    {openOrders.filter(o => o.name.toLowerCase().includes(orderSearchTerm.toLowerCase())).map(o => {
                        const balance = o.items.reduce((acc, i) => acc + i.price * i.quantity, 0);
                        return (
                          <div key={o.id} role="button" onClick={() => setCurrentOrderId(o.id)} className={cn(buttonVariants({ variant: currentOrderId === o.id ? "secondary" : "outline" }), "w-full h-auto py-2 px-3 cursor-pointer flex justify-between items-center gap-2", balance < 0 && "border-yellow-500 bg-yellow-500/10")}>
                            <div className="min-w-0 flex items-center gap-2">
                              <div className="font-semibold text-xs truncate">{o.name}</div>
                              {o.isShared && <LinkIcon className="h-3 w-3 text-blue-500 shrink-0"/>}
                              {(o.viewerCount || 0) > 0 && <Wifi className="h-3 w-3 text-green-500 animate-pulse shrink-0"/>}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <div className={cn("text-right font-black text-xs", balance < 0 && "text-green-600")}>{formatCurrency(balance)}</div>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); setOrderToDelete(o); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </div>
                        );
                    })}
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter className="p-3 border-t bg-muted/5 flex justify-between items-center">
                <span className="text-[10px] font-black uppercase opacity-40">Total em Aberto:</span>
                <span className="text-sm font-black text-primary">{formatCurrency(totalOpenOrdersValue)}</span>
            </CardFooter>
          </Card>
        </div>

        <div className="md:col-span-1 xl:col-span-5 flex flex-col h-full min-w-0">
          <Card className="flex-grow flex flex-col">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle>Produtos</CardTitle>
                    <div className="flex items-center gap-1 border rounded-md p-1">
                        <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setViewMode('grid')}><LayoutGrid className="h-4 w-4" /></Button>
                        <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setViewMode('list')}><List className="h-4 w-4" /></Button>
                    </div>
                </div>
                <div className="relative pt-2"><Search className="absolute left-2.5 top-4.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar produto..." value={productSearchTerm} onChange={e => setProductSearchTerm(e.target.value)} className="pl-8" /></div>
            </CardHeader>
            <Tabs value={activeDisplayCategory} onValueChange={setActiveDisplayCategory} className="flex-grow flex flex-col overflow-hidden">
              <div className="px-4 overflow-x-auto"><TabsList className="w-fit min-w-full justify-start"><TabsTrigger value="Todos">Todos</TabsTrigger>{productCategories.map(c => <TabsTrigger key={c.id} value={c.id}>{c.name}</TabsTrigger>)}</TabsList></div>
              <ScrollArea className="flex-grow p-4">
                {currentOrderId ? (
                  <>
                    <TabsContent value="Todos" className="mt-0"><ProductDisplay products={products.filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase()))} productCategories={productCategories} addToOrder={addToOrder} viewMode={viewMode} /></TabsContent>
                    {productCategories.map(c => (<TabsContent key={c.id} value={c.id} className="mt-0"><ProductDisplay products={products.filter(p => p.categoryId === c.id && p.name.toLowerCase().includes(productSearchTerm.toLowerCase()))} productCategories={productCategories} addToOrder={addToOrder} viewMode={viewMode} /></TabsContent>))}
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-20 text-center"><MousePointer2 className="h-16 w-16 mb-4" /><p className="font-black uppercase text-xl">Selecione uma mesa</p><p className="text-xs font-bold">Clique em uma comanda na lista lateral para lançar itens.</p></div>
                )}
              </ScrollArea>
            </Tabs>
          </Card>
        </div>

        <div className="md:col-span-2 xl:col-span-4 flex flex-col h-full min-w-0">
          <Card className="flex-grow flex flex-col shadow-lg border-2">
            {currentOrder ? (
              <>
                <CardHeader className={cn("pb-3 border-b transition-colors", orderTotal < 0 ? "bg-yellow-500/10" : "bg-muted/10")}>
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-4">
                        <div className="min-w-0">
                            <h2 className="text-2xl font-black text-foreground uppercase truncate">{currentOrder.name}</h2>
                            <p className="text-[10px] font-bold opacity-40 uppercase">Aberto em: {format(new Date(currentOrder.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                        </div>
                        <div className="flex flex-col items-end">
                            <div className={cn("text-2xl font-black", (isSelectionMode && Object.keys(selectedItems).length > 0) ? "text-orange-600" : (orderTotal < 0 ? "text-green-600" : "text-primary"))}>
                                {isSelectionMode && Object.keys(selectedItems).length > 0 ? formatCurrency(selectedTotal) : formatCurrency(orderTotal)}
                            </div>
                            {isSelectionMode && Object.keys(selectedItems).length > 0 && <span className="text-[8px] font-black text-orange-600 uppercase">Total Selecionado</span>}
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Tooltip><TooltipTrigger asChild>{currentOrder.isShared ? <Link2Off className="h-5 w-5 text-destructive cursor-pointer" onClick={() => syncOrderToFirestore({ ...currentOrder, isShared: false })} /> : <LinkIcon className="h-5 w-5 text-primary cursor-pointer" onClick={() => { void syncOrderToFirestore({ ...currentOrder, isShared: true }); setOrderToShare({ ...currentOrder, isShared: true }); }} />}</TooltipTrigger><TooltipContent>{currentOrder.isShared ? "Parar Compartilhar" : "Compartilhar"}</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Edit className="h-5 w-5 text-primary cursor-pointer" onClick={() => setIsEditNameDialogOpen(true)} /></TooltipTrigger><TooltipContent>Renomear</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><ListChecks className={cn("h-5 w-5 cursor-pointer", isSelectionMode ? "text-orange-600" : "text-primary")} onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedItems({}); }} /></TooltipTrigger><TooltipContent>Separar Conta</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Merge className="h-5 w-5 text-primary cursor-pointer" onClick={() => setIsMergeDialogOpen(true)} /></TooltipTrigger><TooltipContent>Juntar</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Wallet className="h-5 w-5 text-primary cursor-pointer" onClick={() => setIsCreditDialogOpen(true)} /></TooltipTrigger><TooltipContent>Add Crédito</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Printer className="h-5 w-5 text-primary cursor-pointer" onClick={() => setIsPrintDialogOpen(true)} /></TooltipTrigger><TooltipContent>Imprimir</TooltipContent></Tooltip>
                    </div>
                    {pendingApprovalCount > 0 && (
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-300 bg-amber-50 px-2 py-1">
                        <span className="text-[10px] font-black uppercase tracking-wide text-amber-700">
                          {pendingApprovalCount} item(ns) aguardando confirmação
                        </span>
                        <Button size="sm" className="h-7 text-[10px] font-black" onClick={handleApproveAllPending}>
                          Confirmar Todos
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-grow overflow-hidden p-0">
                  <div className="p-4 border-b bg-muted/10 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-black uppercase tracking-wide opacity-60">Chat do Pedido</p>
                      <Badge variant="outline" className="text-[10px]">{currentOrder.chatMessages?.length ?? 0} msgs</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => appendStaffChatMessage('Não temos esse item no momento.', 'quick')}>Sem item</Button>
                      <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => appendStaffChatMessage('Posso trocar por outro produto parecido?', 'quick')}>Sugerir troca</Button>
                      <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => appendStaffChatMessage('Vai demorar mais alguns minutos, tudo bem?', 'quick')}>Avisar atraso</Button>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={staffChatInput}
                        onChange={(e) => setStaffChatInput(e.target.value)}
                        maxLength={500}
                        placeholder="Mensagem para o cliente desta comanda..."
                      />
                      <Button onClick={() => appendStaffChatMessage(staffChatInput)} disabled={!staffChatInput.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="max-h-28 overflow-y-auto space-y-1 rounded-md border bg-background p-2">
                      {(currentOrder.chatMessages ?? []).length === 0 ? (
                        <p className="text-[10px] text-muted-foreground">Sem mensagens ainda.</p>
                      ) : [...(currentOrder.chatMessages ?? [])].slice(-5).map((message) => (
                        <div key={message.id} className="text-[10px] leading-relaxed">
                          <span className="font-black uppercase mr-1">{message.sender === 'staff' ? 'Equipe:' : 'Cliente:'}</span>
                          <span>{message.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <ScrollArea className="h-full p-4">
                    {currentOrder.items.length === 0 ? <p className="text-center py-10 opacity-50">Comanda vazia.</p> : <ul className="space-y-3">
                      {currentOrder.items.map((item, i) => {
                        const isPendingCombo = item.isCombo && (item.claimedQuantity || 0) < ((item.comboItems || 0) * item.quantity);
                        const showAsPaidVisual = item.isPaid && !isPendingCombo;

                        return (
                          <li key={item.lineItemId || i} className={cn("flex flex-col gap-1 p-2 transition-all", !showAsPaidVisual ? "border rounded-md shadow-sm bg-card" : "opacity-40", !item.isPaid && item.price < 0 && "bg-green-50 border-green-100", item.pendingApproval && "border-amber-300 bg-amber-50")}>
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-2 min-w-0">
                                {isSelectionMode && !item.isPaid && item.price > 0 && (
                                  <div className="flex items-center gap-1">
                                      <Checkbox
                                          checked={!!selectedItems[item.lineItemId!]}
                                          onCheckedChange={() => toggleItemSelection(item.lineItemId!, item.quantity)}
                                          className="h-4 w-4 border-orange-400"
                                      />
                                      {selectedItems[item.lineItemId!] && item.quantity > 1 && (
                                          <div className="flex items-center bg-orange-500/10 rounded border border-orange-500/20 h-6 overflow-hidden">
                                              <button type="button" onClick={() => adjustSelectedQty(item.lineItemId!, -1, item.quantity)} className="text-[10px] font-black px-2 hover:bg-orange-500 hover:text-white transition-colors h-full">-</button>
                                              <span className="text-[10px] font-black min-w-[18px] text-center px-1">
                                                  {Math.min(selectedItems[item.lineItemId!] || 0, item.quantity)}
                                              </span>
                                              <button type="button" onClick={() => adjustSelectedQty(item.lineItemId!, 1, item.quantity)} className="text-[10px] font-black px-2 hover:bg-orange-500 hover:text-white transition-colors h-full">+</button>
                                          </div>
                                      )}
                                  </div>
                                )}
                                <span className={cn("text-xs font-bold truncate", showAsPaidVisual && "line-through")}>{item.name}</span>
                              </div>
                              <span className={cn("text-xs font-black", item.price < 0 ? "text-green-600" : "text-primary", showAsPaidVisual && "line-through")}>{formatCurrency(item.price * item.quantity)}</span>
                            </div>
                            {item.guestNote && (
                              <p className="text-[10px] text-muted-foreground">Obs. cliente: {item.guestNote}</p>
                            )}
                            {item.pendingApproval && (
                              <div className="text-[10px] font-black uppercase tracking-wide text-amber-700">
                                Item enviado pelo cliente. Aguardando confirmação.
                              </div>
                            )}
                            {item.pendingApproval ? (
                              <div className="flex justify-end items-center gap-2 mt-1">
                                <Button size="sm" variant="outline" className="h-7 text-[10px] font-black" onClick={() => handleRejectPendingItem(item.lineItemId!)}>
                                  <X className="h-3 w-3 mr-1" /> Recusar
                                </Button>
                                <Button size="sm" className="h-7 text-[10px] font-black" onClick={() => handleApprovePendingItem(item.lineItemId!)}>
                                  <Check className="h-3 w-3 mr-1" /> Confirmar
                                </Button>
                              </div>
                            ) : null}
                            {!item.isPaid && !item.pendingApproval && (
                              <div className="flex justify-between items-center mt-1">
                                <div className="text-[10px] text-muted-foreground">{formatCurrency(item.price)} un. {item.quantity > 1 && `(${item.quantity}x)`}</div>
                                <div className="flex items-center gap-1">
                                  {KITCHEN_CATEGORIES.includes(item.categoryId || '') && <Button size="icon" variant="ghost" className={cn("h-6 w-6", item.forceKitchenVisible ? "text-orange-600 animate-pulse" : "text-primary")} onClick={() => handleSendToKitchen(item.lineItemId!)}><ChefHat className="h-3.5 w-3.5" /></Button>}
                                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateQuantity(item.lineItemId!, item.quantity - 1)}><MinusCircle className="h-3.5 w-3.5" /></Button>
                                  <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateQuantity(item.lineItemId!, item.quantity + 1)}><PlusCircle className="h-3.5 w-3.5" /></Button>
                                  <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeFromOrder(item.lineItemId!)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                </div>
                              </div>
                            )}
                            {item.isCombo && (
                                <div className="mt-2 p-2 bg-primary/5 rounded border border-primary/10 space-y-2">
                                    <div className="flex justify-between text-[10px] font-black uppercase text-primary"><span>Combo</span><span>{item.claimedQuantity || 0}/{ (item.comboItems || 0) * item.quantity }</span></div>
                                    <Button size="sm" variant="outline" className="h-7 w-full text-[10px] font-bold" onClick={() => handleClaimUnit(item.lineItemId!)} disabled={(item.claimedQuantity || 0) >= ((item.comboItems || 0) * item.quantity)}><Check className="h-3 w-3 mr-1" /> LIBERAR UNIDADE</Button>
                                </div>
                            )}
                            {item.isPaid && <Badge variant="outline" className="w-fit text-[8px] font-black uppercase border-muted-foreground/20">Item Pago</Badge>}
                          </li>
                        );
                      })}
                    </ul>}
                  </ScrollArea>
                </CardContent>
                <CardFooter className="flex flex-col gap-2 p-3 border-t bg-muted/5">
                   <Button className={cn("w-full font-black h-12 text-lg", (isSelectionMode && Object.keys(selectedItems).length > 0) ? "bg-orange-600 hover:bg-orange-700" : "bg-accent text-accent-foreground")} disabled={orderTotal === 0 && !isSelectionMode} onClick={() => setIsPaymentDialogOpen(true)}>
                     {isSelectionMode && Object.keys(selectedItems).length > 0 ? `PAGAR SELEÇÃO: ${formatCurrency(selectedTotal)}` : `PAGAR ${formatCurrency(orderTotal)}`}
                   </Button>
                   <div className="grid grid-cols-2 gap-2 w-full">
                        <Button variant="outline" className="w-full text-blue-600 font-bold text-xs h-9" disabled={orderTotal <= 0} onClick={() => setOrderToArchive(currentOrder)}>
                            <Archive className="mr-1.5 h-3.5 w-3.5" /> ARQUIVAR NA CONTA
                        </Button>
                        <Button variant="ghost" className="w-full text-destructive font-bold text-xs h-9" onClick={() => setOrderToDelete(currentOrder)}>CANCELAR MESA</Button>
                   </div>
                </CardFooter>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-20 text-center"><MousePointer2 className="h-16 w-16 mb-4" /><p className="font-black uppercase text-xl">Aguardando Seleção</p></div>
            )}
          </Card>
        </div>
      </div>

      <CreateOrderDialog isOpen={isCreateOrderDialogOpen} onOpenChange={setIsCreateOrderDialogOpen} onSubmit={async (d: any) => {
          const id = `ord-${Date.now()}`;
          await syncOrderToFirestore({ id, ...d, items: [], createdAt: new Date(), updatedAt: new Date().toISOString() });
          setCurrentOrderId(id);
      }} clients={clients} />

      <PaymentDialog isOpen={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen} totalAmount={isSelectionMode && Object.keys(selectedItems).length > 0 ? selectedTotal : orderTotal} currentOrder={currentOrder} allowPartialPayment={true} onSubmit={async (details) => {
          if (!currentOrder) return;

          const isSeparação = isSelectionMode && Object.keys(selectedItems).length > 0;

          // Registrar a venda no financeiro
          addSale({
              ...details.sale,
              name: isSeparação ? `Separação: ${currentOrder.name}` : `Comanda: ${currentOrder.name}`
          });

          let updatedItems: OrderItem[] = [];

          if (isSeparação) {
              // Lógica de separação
              currentOrder.items.forEach(item => {
                  let sQty = selectedItems[item.lineItemId!] || 0;
                  sQty = Math.min(sQty, item.quantity);

                  if (sQty > 0) {
                      if (sQty >= item.quantity) {
                          updatedItems.push({ ...item, isPaid: true });
                      } else {
                          updatedItems.push({ ...item, quantity: item.quantity - sQty });
                          updatedItems.push({
                              ...item,
                              lineItemId: `li-p-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                              quantity: sQty,
                              isPaid: true
                          });
                      }
                  } else {
                      updatedItems.push(item);
                  }
              });
          } else {
              // Pagamento Total ou Parcial da Mesa Toda
              // Se for pagamento total, todos os itens marcados como pagos
              updatedItems = currentOrder.items.map(i => ({ ...i, isPaid: details.isPartial ? i.isPaid : true }));
          }

          // ADICIONAR ITEM DE DESCONTO (PARA O SALDO BATER ZERO E A MESA FECHAR)
          if (details.sale.discountAmount > 0) {
              updatedItems.push({
                  id: `desc-${Date.now()}`,
                  name: 'Desconto Aplicado',
                  price: -details.sale.discountAmount,
                  quantity: 1,
                  categoryId: 'discount',
                  lineItemId: `li-d-${Date.now()}`,
                  isDelivered: true,
                  isPaid: true,
                  addedAt: new Date().toISOString()
              } as any);
          }

          // ADICIONAR LANÇAMENTO DO PAGAMENTO NA LISTA DE ITENS
          updatedItems.push({
              id: `pay-${Date.now()}`,
              name: isSeparação ? 'Pagamento Seleção' : (details.isPartial ? 'Pagamento Parcial' : 'Pagamento Total'),
              price: -details.sale.totalAmount,
              quantity: 1,
              categoryId: 'credit',
              lineItemId: `li-p-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              isDelivered: true,
              isPaid: true,
              addedAt: new Date().toISOString()
          } as any);

          // CRIAÇÃO DE NOVA COMANDA COM CRÉDITO (TROCO)
          if (details.leaveChangeAsCredit && details.sale.changeGiven && details.sale.changeGiven > 0) {
              const newId = `ord-cr-${Date.now()}`;
              const creditOrder = {
                  id: newId,
                  name: `Crédito: ${currentOrder.name}`,
                  items: [{
                      id: `cr-${Date.now()}`,
                      name: 'Crédito de Troco',
                      price: -details.sale.changeGiven,
                      quantity: 1,
                      categoryId: 'credit',
                      lineItemId: `li-cr-${Date.now()}`,
                      isDelivered: true,
                      isPaid: false,
                      addedAt: new Date().toISOString()
                  }],
                  createdAt: new Date(),
                  updatedAt: new Date().toISOString(),
                  isShared: currentOrder.isShared
              };
              await syncOrderToFirestore(creditOrder as any);
              toast({ title: "Nova comanda de crédito gerada!" });
          }

          const itensEmAberto = updatedItems.filter(i => i.price > 0 && !i.isPaid);
          const saldoFinal = updatedItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);

          const temEntregaPendente = updatedItems.some(item =>
              KITCHEN_CATEGORIES.includes(item.categoryId || '') && !item.isDelivered
          );

          const temComboPendente = updatedItems.some(item =>
              item.isCombo &&
              (item.claimedQuantity || 0) < ((item.comboItems || 0) * item.quantity)
          );

          // Uma comanda só está quitada se não for parcial, não houver itens abertos e saldo for zero
          const estaQuitada = !details.isPartial && itensEmAberto.length === 0 && Math.abs(saldoFinal) <= 0.05;

          if (estaQuitada && !temEntregaPendente && !temComboPendente) {
              await deleteOrderFromFirestore(currentOrder.id);
              setCurrentOrderId(null);
              toast({ title: "Comanda encerrada com sucesso!" });
          } else {
              await syncOrderToFirestore({ ...currentOrder, items: updatedItems });
              toast({ title: isSeparação ? "Itens pagos!" : (details.isPartial ? "Pagamento parcial registrado!" : "Pagamento registrado!") });
          }

          setSelectedItems({});
          setIsSelectionMode(false);
      }} />

      <Dialog open={isEditNameDialogOpen} onOpenChange={setIsEditNameDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>Editar Nome</DialogTitle></DialogHeader>
            <div className="py-4 space-y-2"><Label>Novo Nome</Label><Input value={newName} onChange={e => setNewName(e.target.value)} autoFocus /></div>
            <DialogFooter><Button variant="outline" onClick={() => setIsEditNameDialogOpen(false)}>Cancelar</Button><Button onClick={handleUpdateOrderName}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ClosedOrdersDialog isOpen={isClosedOrdersDialogOpen} onOpenChange={setIsClosedOrdersDialogOpen} />
      <ShareOrderDialog isOpen={!!orderToShare} onOpenChange={(open) => !open && setOrderToShare(null)} order={orderToShare} />
      <MergeOrdersDialog
        isOpen={isMergeDialogOpen}
        onOpenChange={setIsMergeDialogOpen}
        currentOrder={currentOrder}
        openOrders={openOrders}
        onMerge={async (targetOrder, sourceOrderId) => {
            await deleteOrderFromFirestore(sourceOrderId);
            await syncOrderToFirestore(targetOrder);
            setCurrentOrderId(targetOrder.id);
            setIsMergeDialogOpen(false);
            toast({ title: "Mesas unificadas com sucesso!" });
        }}
      />

      <Dialog open={isCreditDialogOpen} onOpenChange={setIsCreditDialogOpen}>
        <DialogContent>
            <AddCreditDialog
                onAdd={async (amt, desc) => {
                    if(!currentOrder) return;
                    const items = [...currentOrder.items, { id: `cr-${Date.now()}`, name: desc, price: -amt, quantity: 1, categoryId: 'credit', lineItemId: `li-c-${Date.now()}`, isDelivered: true, addedAt: new Date().toISOString() } as any];
                    await syncOrderToFirestore({ ...currentOrder, items });
                    setIsCreditDialogOpen(false);
                }}
                onCancel={() => setIsCreditDialogOpen(false)}
            />
        </DialogContent>
      </Dialog>

      <GuestRequestsDialog isOpen={isRequestsDialogOpen} onOpenChange={setIsRequestsDialogOpen} requests={pendingRequests} openOrders={openOrders} onApprove={async (r, oid) => { const o = openOrders.find(x => x.id === oid); if(o && !o.isShared) await syncOrderToFirestore({...o, isShared: true}); await fetch('/api/db/guest-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...r, status: 'approved', associatedOrderId: oid }) }); toast({title: "Aprovado!"}); }} onReject={async (reqId) => { const req = pendingRequests.find(r => r.id === reqId); if(req) await fetch('/api/db/guest-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...req, status: 'rejected' }) }); }} onCreateFromRequest={async (r) => { const id = `ord-${Date.now()}`; await syncOrderToFirestore({ id, name: r.name, items: [], createdAt: new Date(), isShared: true, updatedAt: new Date().toISOString() }); await fetch('/api/db/guest-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...r, status: 'approved', associatedOrderId: id }) }); setCurrentOrderId(id); setIsRequestsDialogOpen(false); }} />

      <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
        <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Imprimir Extrato</DialogTitle></DialogHeader>
            <div id="printable-statement" className="bg-white p-4 max-h-[60vh] overflow-auto">{currentOrder && <OrderStatement order={currentOrder} />}</div>
            <DialogFooter><Button variant="outline" onClick={() => setIsPrintDialogOpen(false)}>Voltar</Button><Button onClick={handlePrintStatement}><Printer className="mr-2 h-4 w-4" /> Imprimir</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!orderToDelete} onOpenChange={(o) => !o && setOrderToDelete(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Cancelar Comanda?</AlertDialogTitle><AlertDialogDescription>Excluir permanentemente <strong>{orderToDelete?.name}</strong>?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Voltar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteOrder} className="bg-destructive hover:bg-destructive/90 text-white">Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!orderToArchive} onOpenChange={(o) => !o && setOrderToArchive(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Arquivar Comanda (Pendurar)?</AlertDialogTitle><AlertDialogDescription>Mover itens de <strong>{orderToArchive?.name}</strong> para a dívida do cliente?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Voltar</AlertDialogCancel><AlertDialogAction onClick={handleArchiveOrder} className="bg-blue-600 hover:bg-blue-700 text-white border-none">Arquivar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}

function ShareOrderDialog({ isOpen, onOpenChange, order }: { isOpen: boolean, onOpenChange: (open: boolean) => void, order: ActiveOrder | null }) {
    const [url, setUrl] = useState('');
    const { toast } = useToast();
    useEffect(() => { if (isOpen && order) { let origin = window.location.origin; if (origin.includes('cloudworkstations.dev') && !origin.includes('9000-')) origin = origin.replace(/\d+-/, '9000-'); setUrl(`${origin}/my-order/${order.id}`); } }, [isOpen, order]);
    const copyUrl = async () => {
      try {
        await navigator.clipboard?.writeText(url);
        toast({ title: "Link copiado!" });
      } catch {
        toast({ title: "Não foi possível copiar", description: "Copie o link manualmente pelo campo.", variant: "destructive" });
      }
    };

    const shareOnWhatsApp = () => {
      if (!url || !order) return;
      const text = `Olá! Sua comanda ${order.name} está aqui: ${url}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Compartilhar</DialogTitle></DialogHeader>
                <div className="flex flex-col items-center gap-4 py-4">
                    <div className="bg-white p-2 rounded-lg border-2">{url && <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`} alt="QR" className="w-40 h-40" />}</div>
                    <div className="flex gap-2 w-full"><Input value={url} readOnly /><Button size="icon" variant="outline" onClick={copyUrl}><Copy className="h-4 w-4" /></Button></div>
                    <Button className="w-full" onClick={shareOnWhatsApp}><MessageCircle className="h-4 w-4 mr-2" /> Enviar via WhatsApp</Button>
                </div>
                <DialogFooter><DialogClose asChild><Button variant="secondary">Fechar</Button></DialogClose></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function MergeOrdersDialog({ isOpen, onOpenChange, currentOrder, openOrders, onMerge }: {
    isOpen: boolean,
    onOpenChange: (o: boolean) => void,
    currentOrder?: ActiveOrder,
    openOrders: ActiveOrder[],
    onMerge: (target: ActiveOrder, sourceId: string) => void
}) {
    const [targetId, setTargetId] = useState('');
    if (!currentOrder) return null;
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Juntar Mesas</DialogTitle>
                    <DialogDescription>Mover itens de <strong>{currentOrder.name}</strong> para outra mesa.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <Label>Mesa de Destino</Label>
                    <Select value={targetId} onValueChange={setTargetId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                            {openOrders.filter(o => o.id !== currentOrder.id).map(o => (
                                <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button disabled={!targetId} onClick={() => {
                        const target = openOrders.find(o => o.id === targetId);
                        if (target) {
                            const updatedTarget = {
                                ...target,
                                items: [...target.items, ...currentOrder.items],
                                updatedAt: new Date().toISOString()
                            };
                            onMerge(updatedTarget, currentOrder.id);
                        }
                    }}>Confirmar Junção</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function AddCreditDialog({ onAdd, onCancel }: { onAdd: (amt: number, desc: string) => void, onCancel: () => void }) {
    const [amt, setAmt] = useState('');
    const [desc, setDesc] = useState('Crédito Avulso');
    return (
        <form onSubmit={(e) => { e.preventDefault(); onAdd(parseFloat(amt), desc); }}>
            <DialogHeader><DialogTitle>Adicionar Crédito</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4"><div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" value={amt} onChange={e => setAmt(e.target.value)} autoFocus /></div><div className="space-y-2"><Label>Descrição</Label><Input value={desc} onChange={e => setDesc(e.target.value)} /></div></div>
            <DialogFooter><Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button><Button type="submit">Adicionar</Button></DialogFooter>
        </form>
    );
}

function GuestRequestsDialog({ isOpen, onOpenChange, requests, openOrders, onApprove, onReject, onCreateFromRequest }: { isOpen: boolean, onOpenChange: (o: boolean) => void, requests: GuestRequest[], openOrders: ActiveOrder[], onApprove: (r: GuestRequest, oid: string) => void, onReject: (id: string) => void, onCreateFromRequest: (r: GuestRequest) => void }) {
    const [selectedOrderMap, setSelectedOrderMap] = useState<Record<string, string>>({});
    
    const isServiceCall = (req: GuestRequest) => req.requestType === 'service_call';
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>Solicitações Pendentes</DialogTitle></DialogHeader>
                <ScrollArea className="max-h-[60vh] pr-4"><div className="space-y-4 py-4">
                        {requests.length === 0 ? <p className="text-center py-10 opacity-50">Nenhuma solicitação.</p> : requests.map(req => {
                            const isService = isServiceCall(req);
                            return (
                                <Card key={req.id} className={cn("p-4 border-2", isService ? "bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-700" : "bg-muted/20")}>
                                    <div className="flex flex-col gap-4">
                                        <div className="flex justify-between"><div><p className="font-black text-xl uppercase text-primary">{req.name}</p><div className="flex gap-2 mt-2 flex-wrap">{isService ? <Badge className="bg-red-600 hover:bg-red-700"><Bell className="h-3 w-3 mr-1" /> CHAMADO ATENDENTE</Badge> : <Badge className="bg-blue-600 hover:bg-blue-700"><UserPlus className="h-3 w-3 mr-1" /> {req.intent === 'create' ? 'NOVA COMANDA' : 'VER CONTA'}</Badge>}{req.reason === 'bill' && <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-300">CONTA</Badge>}{req.message && <Badge variant="outline" className="border-gray-400">{req.message.substring(0, 20)}...</Badge>}</div></div><Button variant="ghost" size="icon" onClick={() => onReject(req.id)} className="text-destructive"><X className="h-5 w-5" /></Button></div>
                                        <div className="grid gap-3">{req.intent === 'create' && <Button className="w-full bg-green-600 text-white font-black" onClick={() => onCreateFromRequest(req)}><UserPlus className="mr-2 h-5 w-5" /> CRIAR AGORA</Button>}
                                            <div className="space-y-2 border-t pt-3"><Label className="text-[10px] uppercase font-bold opacity-50">Vincular a Mesa Existente</Label><div className="flex gap-2"><Select onValueChange={(val) => setSelectedOrderMap(p => ({ ...p, [req.id]: val }))} value={selectedOrderMap[req.id] || ""}><SelectTrigger className="flex-1"><SelectValue placeholder="Mesa..." /></SelectTrigger><SelectContent>{openOrders.map(o => (<SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>))}</SelectContent></Select><Button variant="secondary" disabled={!selectedOrderMap[req.id]} onClick={() => onApprove(req, selectedOrderMap[req.id])}><Check className="h-4 w-4" /></Button></div></div>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div></ScrollArea>
                <DialogFooter><Button variant="secondary" onClick={() => onOpenChange(false)}>Fechar</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
