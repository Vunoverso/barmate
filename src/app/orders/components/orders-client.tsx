
"use client";

import type { Product, OrderItem, Sale, ActiveOrder, ProductCategory, Payment, FinancialEntry, Client, GuestRequest } from '@/types';
import { formatCurrency, LUCIDE_ICON_MAP } from '@/lib/constants';
import { getProducts, getProductCategories, addSale, getOpenOrders, saveOpenOrders, addFinancialEntry, getClients } from '@/lib/data-access';
import { useState, useMemo, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, MinusCircle, Trash2, Search, ShoppingCart, Package, Merge, Wallet, Link as LinkIcon, Plus, X, Unlink, Wifi, Copy, LayoutGrid, List } from 'lucide-react';
import PaymentDialog from './payment-dialog';
import CreateOrderDialog from './create-order-dialog';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { db } from '@/lib/firebase';
import { doc, setDoc, deleteDoc, collection, onSnapshot, query, where, updateDoc } from "firebase/firestore";

// --- Sub-componentes ---

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

function ShareOrderDialog({ isOpen, onOpenChange, order }: { isOpen: boolean, onOpenChange: (o: boolean) => void, order: ActiveOrder }) {
  const { toast } = useToast();
  const [url, setUrl] = useState('');
  useEffect(() => { 
    if (isOpen) {
        let origin = window.location.origin;
        if (origin.includes('cloudworkstations.dev') && !origin.includes('9000-')) {
            origin = origin.replace(/\d+-/, '9000-');
        }
        setUrl(`${origin}/my-order/${order.id}`); 
    }
  }, [isOpen, order.id]);
  const copy = () => { navigator.clipboard.writeText(url); toast({ title: "Link copiado!" }); };
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader><DialogTitle>Compartilhar Comanda</DialogTitle></DialogHeader>
        <div className="py-4 flex flex-col items-center gap-4">
          <Image src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}`} alt="QR" width={250} height={250} className="rounded-lg border" unoptimized />
          <div className="flex w-full gap-2"><Input value={url} readOnly /><Button size="icon" onClick={copy}><Copy className="h-4 w-4" /></Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MergeOrdersDialog({ isOpen, onOpenChange, currentOrder, allOrders, onMerge }: any) {
    const [sel, setSel] = useState<Record<string, boolean>>({});
    const other = allOrders.filter((o: any) => o.id !== currentOrder?.id);
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader><DialogTitle>Juntar Comandas</DialogTitle></DialogHeader>
                <div className="py-2">
                    <Label className="text-xs text-muted-foreground mb-2 block">Selecione as comandas a serem movidas para "{currentOrder?.name}"</Label>
                    <ScrollArea className="h-48 border rounded-md p-2">
                        {other.length > 0 ? other.map((o: any) => (
                            <div key={o.id} className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded-md">
                                <Checkbox id={o.id} checked={!!sel[o.id]} onCheckedChange={(checked) => setSel(prev => ({...prev, [o.id]: !!checked}))} /> 
                                <Label htmlFor={o.id} className="cursor-pointer flex-grow">{o.name}</Label>
                            </div>
                        )) : <p className="text-center py-10 text-xs text-muted-foreground italic">Nenhuma outra comanda aberta.</p>}
                    </ScrollArea>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                    <Button onClick={() => onMerge(Object.keys(sel).filter(k => sel[k]))} disabled={!Object.values(sel).some(v => v)}>Juntar Selecionadas</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function AddCreditDialog({ isOpen, onOpenChange, onSave }: any) {
    const [a, setA] = useState('');
    const [d, setD] = useState('');
    const [s, setS] = useState('permuta');
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader><DialogTitle>Adicionar Crédito</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2"><Label>Valor do Crédito</Label><Input type="number" value={a} onChange={e => setA(e.target.value)} placeholder="0,00" /></div>
                    <div className="space-y-2"><Label>Motivo</Label><Input value={d} onChange={e => setD(e.target.value)} placeholder="Ex: Troco de pagamento anterior" /></div>
                    <div className="space-y-2">
                        <Label>Origem do Valor</Label>
                        <Select onValueChange={setS} value={s}>
                            <SelectTrigger><SelectValue placeholder="Selecione a origem..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="permuta">Permuta / Cortesia (Não entra no caixa)</SelectItem>
                                <SelectItem value="dinheiro">Dinheiro (Entra no Caixa Diário)</SelectItem>
                                <SelectItem value="cartao">Cartão / PIX (Vai para o Banco)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                    <Button onClick={() => onSave({amount: parseFloat(a), description: d, source: s})}>Confirmar Crédito</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// --- Componente Principal ---

export default function OrdersClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [openOrders, setOpenOrders] = useState<ActiveOrder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [guestRequests, setGuestRequests] = useState<GuestRequest[]>([]);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isCreateOrderDialogOpen, setIsCreateOrderDialogOpen] = useState(false);
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const [isCreditDialogOpen, setIsCreditDialogOpen] = useState(false);
  const [orderToShare, setOrderToShare] = useState<ActiveOrder | null>(null);
  const [requestToLink, setRequestToLink] = useState<GuestRequest | null>(null);

  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [activeDisplayCategory, setActiveDisplayCategory] = useState<string>('Todos');

  const prepareForFirestore = (data: any) => JSON.parse(JSON.stringify(data, (k, v) => v === undefined ? null : v));

  const syncOrderToFirestore = async (order: ActiveOrder) => {
    if (!db || !order.isShared) return;
    try { 
        await setDoc(doc(db, 'open_orders', order.id), prepareForFirestore({ 
            ...order, 
            isShared: true,
            updatedAt: new Date().toISOString()
        }), { merge: true }); 
    } catch (e) {
        console.error("Erro ao sincronizar:", e);
    }
  };
    
  const deleteOrderFromFirestore = async (orderId: string) => {
    if (!db) return;
    try { await deleteDoc(doc(db, 'open_orders', orderId)); } catch (e) {}
  };

  useEffect(() => {
    if (!db) return;
    const unsubscribe = onSnapshot(collection(db, 'open_orders'), (snapshot) => {
        const cloudDataMap = snapshot.docs.reduce((acc, d) => ({ ...acc, [d.id]: d.data() }), {} as any);
        setOpenOrders(prev => prev.map(o => {
            const cloud = cloudDataMap[o.id];
            return cloud ? { ...o, isShared: true, viewerCount: cloud.viewerCount || 0 } : { ...o, isShared: false, viewerCount: 0 };
        }));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'guest_requests'), where('status', '==', 'pending'));
    const unsubscribe = onSnapshot(q, (snapshot) => setGuestRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as GuestRequest))));
    return () => unsubscribe();
  }, []);

  const fetchData = useCallback(() => {
    setIsLoading(true);
    setProducts(getProducts());
    setProductCategories(getProductCategories());
    const fetchedOrders = getOpenOrders();
    setOpenOrders(fetchedOrders);
    setClients(getClients());
    if (!currentOrderId && fetchedOrders.length > 0) setCurrentOrderId(fetchedOrders[0].id);
    setIsLoading(false);
  }, [currentOrderId]);

  useEffect(() => {
    fetchData();
    window.addEventListener('storage', fetchData);
    return () => window.removeEventListener('storage', fetchData);
  }, [fetchData]);

  const currentOrder = useMemo(() => openOrders.find(o => o.id === currentOrderId), [openOrders, currentOrderId]);
  const orderTotal = useMemo(() => currentOrder?.items.reduce((acc, i) => acc + i.price * i.quantity, 0) || 0, [currentOrder]);

  const updateOrdersAndSync = (updatedOrders: ActiveOrder[]) => {
      saveOpenOrders(updatedOrders);
      setOpenOrders([...updatedOrders]);
      const active = updatedOrders.find(o => o.id === currentOrderId);
      if (active && active.isShared) syncOrderToFirestore(active);
  };

  const addToOrder = (product: Product) => {
    if (!currentOrderId) {
        toast({ title: "Selecione uma comanda!", variant: "destructive" });
        return;
    }
    const orders = getOpenOrders();
    const idx = orders.findIndex(o => o.id === currentOrderId);
    if (idx === -1) return;
    
    const order = orders[idx];
    const existing = order.items.find(i => i.id === product.id && i.price >= 0);
    
    if (existing) {
        existing.quantity += 1;
        if (!existing.lineItemId) existing.lineItemId = `li-${product.id}-${Date.now()}`;
    } else {
        order.items.push({ 
            ...product, 
            lineItemId: `li-${product.id}-${Date.now()}`, 
            quantity: 1 
        });
    }
    
    updateOrdersAndSync(orders);
  };

  const updateQuantity = (lineItemId: string, newQty: number) => {
    const orders = getOpenOrders();
    const idx = orders.findIndex(o => o.id === currentOrderId);
    if (idx === -1) return;

    const order = orders[idx];
    if (newQty <= 0) {
        order.items = order.items.filter(i => i.lineItemId !== lineItemId);
    } else {
        const item = order.items.find(i => i.lineItemId === lineItemId);
        if (item) item.quantity = newQty;
    }
    updateOrdersAndSync(orders);
  };

  const removeFromOrder = (lineItemId: string) => {
    const orders = getOpenOrders();
    const idx = orders.findIndex(o => o.id === currentOrderId);
    if (idx === -1) return;

    orders[idx].items = orders[idx].items.filter(i => i.lineItemId !== lineItemId);
    updateOrdersAndSync(orders);
  };

  const handleLinkRequestToOrder = async (oid: string) => {
      if (!requestToLink || !db) return;
      try {
          const orders = getOpenOrders();
          const target = orders.find(o => o.id === oid);
          if (target) {
              target.isShared = true;
              saveOpenOrders(orders);
              setOpenOrders([...orders]);
              await syncOrderToFirestore(target);
          }
          await updateDoc(doc(db, 'guest_requests', requestToLink.id), { status: 'approved', associatedOrderId: oid });
          setRequestToLink(null);
          toast({ title: "Cliente Vinculado!" });
      } catch (e) {}
  };

  const stopSharing = async (oid: string) => {
      await deleteOrderFromFirestore(oid);
      const orders = getOpenOrders().map(o => o.id === oid ? { ...o, isShared: false } : o);
      saveOpenOrders(orders);
      setOpenOrders(orders);
      toast({ title: "Acesso Encerrado" });
  };

  const handleMergeOrders = (ids: string[]) => {
      if (!currentOrder) return;
      const all = getOpenOrders();
      const target = all.find(o => o.id === currentOrder.id);
      if (!target) return;

      ids.forEach(id => {
          const source = all.find(o => o.id === id);
          if (source) { target.items.push(...source.items); deleteOrderFromFirestore(id); }
      });

      const updated = all.filter(o => !ids.includes(o.id));
      updateOrdersAndSync(updated);
      setIsMergeDialogOpen(false);
      toast({ title: "Comandas Unidas!" });
  };

  const handleAddCredit = (details: { amount: number, description: string, source: string }) => {
      const all = getOpenOrders();
      const order = all.find(o => o.id === currentOrderId);
      if (!order) return;

      order.items.push({
          id: `credit-${Date.now()}`,
          name: `Crédito: ${details.description}`,
          price: -Math.abs(details.amount),
          categoryId: 'cat_outros',
          quantity: 1,
          lineItemId: `li-credit-${Date.now()}`
      });

      if (details.source !== 'permuta') {
          addFinancialEntry({
              description: `Crédito em Comanda (${order.name}): ${details.description}`,
              amount: details.amount,
              type: 'income',
              source: details.source === 'dinheiro' ? 'daily_cash' : 'bank_account',
              saleId: null,
              adjustmentId: null
          });
      }

      updateOrdersAndSync(all);
      setIsCreditDialogOpen(false);
      toast({ title: "Crédito Adicionado!" });
  };

  const handlePayment = (details: { sale: Omit<Sale, 'id' | 'timestamp' | 'name'> }) => {
      if (!currentOrder) return;
      addSale({ ...details.sale, name: `Comanda: ${currentOrder.name}` });
      const updated = getOpenOrders().filter(o => o.id !== currentOrder.id);
      saveOpenOrders(updated);
      setOpenOrders(updated);
      deleteOrderFromFirestore(currentOrder.id);
      setCurrentOrderId(updated.length > 0 ? updated[0].id : null);
      setIsPaymentDialogOpen(false);
      toast({ title: "Pagamento Concluído!" });
  };

  if (isLoading) return <div className="flex items-center justify-center h-full"><p>Carregando...</p></div>;

  return (
    <TooltipProvider>
      <div className="grid md:grid-cols-12 gap-4 h-[calc(100vh-100px)]">
        <div className="md:col-span-3 flex flex-col h-full">
          <Card className="flex-grow flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between"><CardTitle>Comandas</CardTitle><Button size="icon" variant="outline" onClick={() => setIsCreateOrderDialogOpen(true)} className="h-8 w-8"><Plus className="h-4 w-4" /></Button></div>
              <div className="relative pt-2"><Search className="absolute left-2.5 top-4.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar comanda..." value={orderSearchTerm} onChange={e => setOrderSearchTerm(e.target.value)} className="pl-8" /></div>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden p-0">
              <ScrollArea className="h-full p-2">
                {guestRequests.length > 0 && (
                    <div className="mb-4 space-y-2">
                        <p className="text-[10px] font-bold uppercase text-primary px-2">Aguardando vínculo</p>
                        {guestRequests.map(req => (
                            <div key={req.id} className="bg-primary/5 border rounded-lg p-2 flex justify-between items-center">
                                <div className="min-w-0"><p className="text-xs font-bold truncate">{req.name}</p><p className="text-[9px] opacity-60 uppercase">{req.intent === 'create' ? 'Nova Comanda' : 'Ver Aberta'}</p></div>
                                <Button size="sm" className="h-7 text-[10px]" onClick={() => setRequestToLink(req)}>Vincular</Button>
                            </div>
                        ))}
                        <Separator className="my-4" />
                    </div>
                )}
                <div className="space-y-2">
                    {openOrders.filter(o => o.name.toLowerCase().includes(orderSearchTerm.toLowerCase())).map(o => {
                      const balance = o.items.reduce((acc, i) => acc + i.price * i.quantity, 0);
                      const hasCredit = balance < 0;
                      return (
                        <div key={o.id} role="button" onClick={() => setCurrentOrderId(o.id)} className={cn(buttonVariants({ variant: currentOrderId === o.id ? "secondary" : "outline" }), "w-full h-auto py-2 px-3 cursor-pointer flex justify-between items-center", hasCredit && "border-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20")}>
                          <div className="min-w-0 flex items-center gap-2">
                            <div className="font-semibold text-xs truncate">{o.name}</div>
                            <div className="flex gap-1">{o.isShared && <LinkIcon className="h-3 w-3 text-blue-500"/>}{(o.viewerCount || 0) > 0 && <Wifi className="h-3 w-3 text-green-500 animate-pulse"/>}</div>
                          </div>
                          <div className={cn("text-right font-black text-xs", hasCredit && "text-green-600")}>{formatCurrency(balance)}</div>
                        </div>
                      );
                    })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-5 flex flex-col h-full">
          <Card className="flex-grow flex flex-col">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle>Produtos</CardTitle>
                    <div className="flex items-center gap-1 border rounded-md p-1 bg-muted/20">
                        <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setViewMode('grid')}><LayoutGrid className="h-4 w-4" /></Button>
                        <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setViewMode('list')}><List className="h-4 w-4" /></Button>
                    </div>
                </div>
                <div className="relative pt-2"><Search className="absolute left-2.5 top-4.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar produto..." value={productSearchTerm} onChange={e => setProductSearchTerm(e.target.value)} className="pl-8" /></div>
            </CardHeader>
            <Tabs value={activeDisplayCategory} onValueChange={setActiveDisplayCategory} className="flex-grow flex flex-col overflow-hidden">
              <div className="px-4"><TabsList className="w-full overflow-x-auto"><TabsTrigger value="Todos">Todos</TabsTrigger>{productCategories.map(c => <TabsTrigger key={c.id} value={c.name}>{c.name}</TabsTrigger>)}</TabsList></div>
              <ScrollArea className="flex-grow p-4">
                <TabsContent value="Todos" className="mt-0">
                    <ProductDisplay 
                        products={products.filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase()))} 
                        productCategories={productCategories} 
                        addToOrder={addToOrder} 
                        viewMode={viewMode} 
                    />
                </TabsContent>
                {productCategories.map(c => (
                    <TabsContent key={c.id} value={c.name} className="mt-0">
                        <ProductDisplay 
                            products={products.filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase())).filter(p => p.categoryId === c.id)} 
                            productCategories={productCategories} 
                            addToOrder={addToOrder} 
                            viewMode={viewMode} 
                        />
                    </TabsContent>
                ))}
              </ScrollArea>
            </Tabs>
          </Card>
        </div>

        <div className="md:col-span-4 flex flex-col h-full">
          <Card className="flex-grow flex flex-col shadow-lg border-2">
            <CardHeader className={cn("pb-3 border-b transition-colors rounded-t-lg", orderTotal < 0 ? "bg-yellow-500/20 border-yellow-500/30" : "bg-muted/10")}>
              {currentOrder && (
                <div className="space-y-3">
                  <h2 className="text-3xl font-black text-foreground uppercase leading-none truncate">{currentOrder.name}</h2>
                  <div className="flex justify-between items-center">
                      <div className="flex gap-3">
                        <Tooltip><TooltipTrigger asChild><LinkIcon className="h-5 w-5 cursor-pointer text-primary" onClick={() => { 
                            const all = getOpenOrders();
                            const target = all.find(o => o.id === currentOrder.id);
                            if(target) { target.isShared = true; saveOpenOrders(all); setOpenOrders([...all]); syncOrderToFirestore(target); setOrderToShare(target); }
                        }} /></TooltipTrigger><TooltipContent>Compartilhar</TooltipContent></Tooltip>
                        {currentOrder.isShared && <Tooltip><TooltipTrigger asChild><Unlink className="h-5 w-5 cursor-pointer text-destructive" onClick={() => stopSharing(currentOrder.id)} /></TooltipTrigger><TooltipContent>Encerrar Acesso</TooltipContent></Tooltip>}
                        <Tooltip><TooltipTrigger asChild><Merge className="h-5 w-5 cursor-pointer text-primary" onClick={() => setIsMergeDialogOpen(true)} /></TooltipTrigger><TooltipContent>Juntar</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Wallet className="h-5 w-5 cursor-pointer text-primary" onClick={() => setIsCreditDialogOpen(true)} /></TooltipTrigger><TooltipContent>Add Crédito</TooltipContent></Tooltip>
                      </div>
                      <div className={cn("text-2xl font-black", orderTotal < 0 ? "text-green-600" : "text-primary")}>{formatCurrency(orderTotal)}</div>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden p-0">
              <ScrollArea className="h-full p-4">
                {currentOrder?.items.length === 0 ? <p className="text-center py-10 opacity-50">Comanda vazia.</p> : <ul className="space-y-3">
                  {currentOrder?.items.map((item, i) => (
                    <li key={item.lineItemId || i} className={cn("flex flex-col gap-1 p-2 border rounded-md shadow-sm", item.price < 0 ? "bg-green-50 border-green-200 dark:bg-green-900/20" : "bg-card")}>
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold truncate max-w-[180px]">{item.name}</span>
                        <span className={cn("text-xs font-black", item.price < 0 ? "text-green-600" : "text-primary")}>{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <div className="text-[10px] text-muted-foreground">{formatCurrency(item.price)} un.</div>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateQuantity(item.lineItemId!, item.quantity - 1)}><MinusCircle className="h-3.5 w-3.5" /></Button>
                          <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateQuantity(item.lineItemId!, item.quantity + 1)}><PlusCircle className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeFromOrder(item.lineItemId!)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>}
              </ScrollArea>
            </CardContent>
            <CardFooter className="p-3 border-t bg-muted/5">
               <Button className="w-full bg-accent text-accent-foreground font-black h-14 text-lg" disabled={!currentOrderId || orderTotal === 0} onClick={() => setIsPaymentDialogOpen(true)}>PAGAR {formatCurrency(orderTotal)}</Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      <CreateOrderDialog isOpen={isCreateOrderDialogOpen} onOpenChange={setIsCreateOrderDialogOpen} onSubmit={(d: any) => { const id = `ord-${Date.now()}`; const newOrders = [...getOpenOrders(), { id, ...d, items: [], createdAt: new Date() }]; saveOpenOrders(newOrders); setOpenOrders(newOrders); setCurrentOrderId(id); }} clients={clients} />
      {currentOrder && <MergeOrdersDialog isOpen={isMergeDialogOpen} onOpenChange={setIsMergeDialogOpen} currentOrder={currentOrder} allOrders={openOrders} onMerge={handleMergeOrders} />}
      <AddCreditDialog isOpen={isCreditDialogOpen} onOpenChange={setIsCreditDialogOpen} onSave={handleAddCredit} />
      <PaymentDialog isOpen={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen} totalAmount={orderTotal} currentOrder={currentOrder} onSubmit={handlePayment} />
      {orderToShare && <ShareOrderDialog isOpen={!!orderToShare} onOpenChange={() => setOrderToShare(null)} order={orderToShare} />}
      {requestToLink && <Dialog open={!!requestToLink} onOpenChange={() => setRequestToLink(null)}><DialogContent><DialogHeader><DialogTitle>Vincular {requestToLink.name}</DialogTitle><DialogDescription>Escolha uma comanda aberta.</DialogDescription></DialogHeader><ScrollArea className="h-[300px] border rounded-md p-2">{openOrders.map(o => <Button key={o.id} variant="ghost" className="w-full justify-start mb-1" onClick={() => handleLinkRequestToOrder(o.id)}>{o.name}</Button>)}</ScrollArea></DialogContent></Dialog>}
    </TooltipProvider>
  );
}
