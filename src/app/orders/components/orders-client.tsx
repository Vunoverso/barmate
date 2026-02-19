
"use client";

import type { Product, OrderItem, Sale, ActiveOrder, ProductCategory, Client, GuestRequest } from '@/types';
import { formatCurrency, LUCIDE_ICON_MAP } from '@/lib/constants';
import { getProducts, getProductCategories, addSale, getOpenOrders, saveOpenOrders, getClients } from '@/lib/data-access';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, MinusCircle, Trash2, Search, ShoppingCart, Package, Merge, Wallet, Link as LinkIcon, Plus, Wifi, Copy, LayoutGrid, List, Printer, UserPlus, Check, X, Bell } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { db } from '@/lib/firebase';
import { doc, setDoc, deleteDoc, collection, onSnapshot, updateDoc } from "firebase/firestore";
import { OrderStatement } from './order-statement';
import { Badge } from '@/components/ui/badge';

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
  
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isCreateOrderDialogOpen, setIsCreateOrderDialogOpen] = useState(false);
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const [isCreditDialogOpen, setIsCreditDialogOpen] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [isRequestsDialogOpen, setIsRequestsDialogOpen] = useState(false);
  const [orderToShare, setOrderToShare] = useState<ActiveOrder | null>(null);

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

  // Listen to open orders for viewer count
  useEffect(() => {
    if (!db) return;
    const unsubscribe = onSnapshot(collection(db, 'open_orders'), (snapshot) => {
        const cloudDataMap = snapshot.docs.reduce((acc, d) => ({ ...acc, [d.id]: d.data() }), {} as any);
        setOpenOrders(prev => prev.map(o => {
            const cloud = cloudDataMap[o.id];
            if (cloud) {
                return { ...o, isShared: true, viewerCount: cloud.viewerCount || 0 };
            }
            return o;
        }));
    });
    return () => unsubscribe();
  }, []);

  // Listen to guest requests
  useEffect(() => {
    if (!db) return;
    const unsubscribe = onSnapshot(collection(db, 'guest_requests'), (snapshot) => {
        const requests = snapshot.docs
            .map(d => ({ id: d.id, ...d.data() } as GuestRequest))
            .filter(r => r.status === 'pending');
        setPendingRequests(requests);
    });
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
    
    const order = { ...orders[idx] };
    const items = [...order.items];
    const existingIdx = items.findIndex(i => i.id === product.id && i.price >= 0);
    
    if (existingIdx !== -1) {
        items[existingIdx] = { ...items[existingIdx], quantity: items[existingIdx].quantity + 1 };
    } else {
        items.push({ 
            ...product, 
            lineItemId: `li-${product.id}-${Date.now()}`, 
            quantity: 1 
        });
    }
    
    order.items = items;
    const newOrders = [...orders];
    newOrders[idx] = order;
    updateOrdersAndSync(newOrders);
  };

  const updateQuantity = (lineItemId: string, newQty: number) => {
    const orders = getOpenOrders();
    const idx = orders.findIndex(o => o.id === currentOrderId);
    if (idx === -1) return;

    const order = { ...orders[idx] };
    if (newQty <= 0) {
        order.items = order.items.filter(i => i.lineItemId !== lineItemId);
    } else {
        order.items = order.items.map(i => i.lineItemId === lineItemId ? { ...i, quantity: newQty } : i);
    }
    
    const newOrders = [...orders];
    newOrders[idx] = order;
    updateOrdersAndSync(newOrders);
  };

  const removeFromOrder = (lineItemId: string) => {
    const orders = getOpenOrders();
    const idx = orders.findIndex(o => o.id === currentOrderId);
    if (idx === -1) return;

    const order = { ...orders[idx] };
    order.items = order.items.filter(i => i.lineItemId !== lineItemId);
    
    const newOrders = [...orders];
    newOrders[idx] = order;
    updateOrdersAndSync(newOrders);
  };

  const handlePrintStatement = () => {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow && currentOrder) {
        const statementElement = document.getElementById('printable-statement');
        if (statementElement) {
            printWindow.document.write('<html><head><title>Imprimir Extrato</title>');
            printWindow.document.write('<style>body{font-family:monospace;padding:20px;color:black;}table{width:100%;border-collapse:collapse;}th,td{text-align:left;padding:5px;border-bottom:1px dashed #ccc;} .text-right{text-align:right;} .text-center{text-align:center;} hr{border:none;border-top:1px dashed black;margin:10px 0;}</style>');
            printWindow.document.write('</head><body>');
            printWindow.document.write(statementElement.innerHTML);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            setTimeout(() => {
                printWindow.focus();
                printWindow.print();
                printWindow.close();
            }, 250);
        }
    }
  };

  const handleApproveRequest = async (request: GuestRequest, targetOrderId: string) => {
      if (!db) return;
      try {
          await updateDoc(doc(db, 'guest_requests', request.id), {
              status: 'approved',
              associatedOrderId: targetOrderId
          });
          
          const orders = getOpenOrders();
          const order = orders.find(o => o.id === targetOrderId);
          if (order && !order.isShared) {
              order.isShared = true;
              updateOrdersAndSync(orders);
          }
          
          toast({ title: "Solicitação Aprovada!" });
      } catch (err) {
          toast({ title: "Erro ao aprovar", variant: "destructive" });
      }
  };

  const handleRejectRequest = async (requestId: string) => {
      if (!db) return;
      try {
          await updateDoc(doc(db, 'guest_requests', requestId), { status: 'rejected' });
          toast({ title: "Solicitação Recusada" });
      } catch (err) {}
  };

  return (
    <TooltipProvider>
      <div className="grid md:grid-cols-12 gap-4 h-[calc(100vh-100px)]">
        <div className="md:col-span-3 flex flex-col h-full">
          <Card className="flex-grow flex flex-col">
            <CardHeader className="space-y-4">
              <div className="flex items-center justify-between">
                <CardTitle>Comandas</CardTitle>
                <Button size="icon" variant="outline" onClick={() => setIsCreateOrderDialogOpen(true)} className="h-8 w-8"><Plus className="h-4 w-4" /></Button>
              </div>
              
              {pendingRequests.length > 0 && (
                  <Button 
                    variant="destructive" 
                    className="w-full animate-pulse flex items-center gap-2"
                    onClick={() => setIsRequestsDialogOpen(true)}
                  >
                    <Bell className="h-4 w-4" />
                    {pendingRequests.length} {pendingRequests.length === 1 ? 'Solicitação' : 'Solicitações'}
                  </Button>
              )}

              <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar comanda..." value={orderSearchTerm} onChange={e => setOrderSearchTerm(e.target.value)} className="pl-8" /></div>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden p-0">
              <ScrollArea className="h-full p-2">
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
              <div className="px-4 overflow-x-auto"><TabsList className="w-fit min-w-full justify-start"><TabsTrigger value="Todos">Todos</TabsTrigger>{productCategories.map(c => <TabsTrigger key={c.id} value={c.id}>{c.name}</TabsTrigger>)}</TabsList></div>
              <ScrollArea className="flex-grow p-4">
                <TabsContent value="Todos" className="mt-0">
                    <ProductDisplay products={products.filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase()))} productCategories={productCategories} addToOrder={addToOrder} viewMode={viewMode} />
                </TabsContent>
                {productCategories.map(c => (
                    <TabsContent key={c.id} value={c.id} className="mt-0">
                        <ProductDisplay products={products.filter(p => p.categoryId === c.id && p.name.toLowerCase().includes(productSearchTerm.toLowerCase()))} productCategories={productCategories} addToOrder={addToOrder} viewMode={viewMode} />
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
                        <Tooltip><TooltipTrigger asChild><Merge className="h-5 w-5 cursor-pointer text-primary" onClick={() => setIsMergeDialogOpen(true)} /></TooltipTrigger><TooltipContent>Juntar</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Wallet className="h-5 w-5 cursor-pointer text-primary" onClick={() => setIsCreditDialogOpen(true)} /></TooltipTrigger><TooltipContent>Add Crédito</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Printer className="h-5 w-5 cursor-pointer text-primary" onClick={() => setIsPrintDialogOpen(true)} /></TooltipTrigger><TooltipContent>Imprimir Extrato</TooltipContent></Tooltip>
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
      
      <PaymentDialog isOpen={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen} totalAmount={orderTotal} currentOrder={currentOrder} onSubmit={(details) => {
          if (!currentOrder) return;
          addSale({ ...details.sale, name: `Comanda: ${currentOrder.name}` });
          const updated = getOpenOrders().filter(o => o.id !== currentOrder.id);
          saveOpenOrders(updated);
          setOpenOrders(updated);
          deleteOrderFromFirestore(currentOrder.id);
          if (details.isPartial) {
              setCurrentOrderId(updated.length > 0 ? updated[0].id : null);
              setIsPaymentDialogOpen(false);
          }
          toast({ title: "Pagamento Concluído!" });
      }} />
      
      <ShareOrderDialog isOpen={!!orderToShare} onOpenChange={(open) => !open && setOrderToShare(null)} order={orderToShare} />
      
      <MergeOrdersDialog isOpen={isMergeDialogOpen} onOpenChange={setIsMergeDialogOpen} currentOrder={currentOrder} openOrders={openOrders} onMerge={(merged) => { saveOpenOrders(merged); setOpenOrders([...merged]); setIsMergeDialogOpen(false); }} />
      
      <AddCreditDialog isOpen={isCreditDialogOpen} onOpenChange={setIsCreditDialogOpen} onAdd={(amt, desc) => { if(!currentOrder) return; const orders = getOpenOrders(); const idx = orders.findIndex(o => o.id === currentOrder.id); if(idx !== -1) { 
          const order = { ...orders[idx] };
          const items = [...order.items, { id: `credit-${Date.now()}`, name: desc, price: -amt, quantity: 1, categoryId: 'credit', lineItemId: `li-credit-${Date.now()}` } as any];
          order.items = items;
          const newOrders = [...orders];
          newOrders[idx] = order;
          updateOrdersAndSync(newOrders);
          setIsCreditDialogOpen(false); 
      } }} />
      
      <GuestRequestsDialog 
        isOpen={isRequestsDialogOpen} 
        onOpenChange={setIsRequestsDialogOpen} 
        requests={pendingRequests} 
        openOrders={openOrders}
        onApprove={handleApproveRequest}
        onReject={handleRejectRequest}
        onOpenCreateDialog={() => { setIsRequestsDialogOpen(false); setIsCreateOrderDialogOpen(true); }}
      />
      
      <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Imprimir Extrato</DialogTitle></DialogHeader>
            <div id="printable-statement" className="bg-white p-4 overflow-auto max-h-[60vh]">
                {currentOrder && <OrderStatement order={currentOrder} />}
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsPrintDialogOpen(false)}>Voltar</Button>
                <Button onClick={handlePrintStatement}><Printer className="mr-2 h-4 w-4" /> Imprimir</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

function ShareOrderDialog({ isOpen, onOpenChange, order }: { isOpen: boolean, onOpenChange: (open: boolean) => void, order: ActiveOrder | null }) {
    const [url, setUrl] = useState('');
    const { toast } = useToast();
    useEffect(() => { if (isOpen && order) { let origin = window.location.origin; if (origin.includes('cloudworkstations.dev') && !origin.includes('9000-')) origin = origin.replace(/\d+-/, '9000-'); setUrl(`${origin}/my-order/${order.id}`); } }, [isOpen, order]);
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader><DialogTitle>Compartilhar Comanda</DialogTitle><DialogDescription>O cliente poderá acompanhar o consumo em tempo real.</DialogDescription></DialogHeader>
                <div className="flex flex-col items-center gap-4 py-4">
                    <div className="bg-white p-2 rounded-lg border-2 border-primary/10">
                        {url && <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`} alt="QR Code" className="w-40 h-40" />}
                    </div>
                    <div className="flex gap-2 w-full">
                        <Input value={url} readOnly />
                        <Button size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(url); toast({ title: "Copiado!" }); }}><Copy className="h-4 w-4" /></Button>
                    </div>
                </div>
                <DialogFooter><DialogClose asChild><Button variant="secondary">Fechar</Button></DialogClose></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function MergeOrdersDialog({ isOpen, onOpenChange, currentOrder, openOrders, onMerge }: { isOpen: boolean, onOpenChange: (o: boolean) => void, currentOrder?: ActiveOrder, openOrders: ActiveOrder[], onMerge: (orders: ActiveOrder[]) => void }) {
    const [targetId, setTargetId] = useState('');
    if (!currentOrder) return null;
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader><DialogTitle>Juntar Comandas</DialogTitle><DialogDescription>Mover todos os itens da comanda <strong>{currentOrder.name}</strong> para outra.</DialogDescription></DialogHeader>
                <div className="py-4 space-y-2">
                    <Label>Selecione a comanda de destino</Label>
                    <Select value={targetId} onValueChange={setTargetId}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>{openOrders.filter(o => o.id !== currentOrder.id).map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button disabled={!targetId} onClick={() => {
                        const all = [...openOrders];
                        const fromIdx = all.findIndex(o => o.id === currentOrder.id);
                        const toIdx = all.findIndex(o => o.id === targetId);
                        all[toIdx].items = [...all[toIdx].items, ...all[fromIdx].items];
                        onMerge(all.filter(o => o.id !== currentOrder.id));
                    }}>Confirmar Junção</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function AddCreditDialog({ isOpen, onOpenChange, onAdd }: { isOpen: boolean, onOpenChange: (o: boolean) => void, onAdd: (amt: number, desc: string) => void }) {
    const [amt, setAmt] = useState('');
    const [desc, setDesc] = useState('Crédito Avulso');
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader><DialogTitle>Adicionar Crédito</DialogTitle><DialogDescription>Lançar um valor pago antecipadamente ou estorno.</DialogDescription></DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2"><Label>Valor do Crédito (R$)</Label><Input type="number" value={amt} onChange={e => setAmt(e.target.value)} placeholder="0,00" autoFocus /></div>
                    <div className="space-y-2"><Label>Descrição</Label><Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ex: Adiantamento PIX" /></div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={() => onAdd(parseFloat(amt), desc)}>Adicionar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function GuestRequestsDialog({ 
    isOpen, 
    onOpenChange, 
    requests, 
    openOrders, 
    onApprove, 
    onReject,
    onOpenCreateDialog
}: { 
    isOpen: boolean, 
    onOpenChange: (o: boolean) => void, 
    requests: GuestRequest[], 
    openOrders: ActiveOrder[], 
    onApprove: (r: GuestRequest, oid: string) => void, 
    onReject: (id: string) => void,
    onOpenCreateDialog: () => void
}) {
    const [selectedOrderMap, setSelectedOrderMap] = useState<Record<string, string>>({});

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Clientes Aguardando Aprovação</DialogTitle>
                    <DialogDescription>Aprove para que o cliente veja a conta no celular dele.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] pr-4">
                    <div className="space-y-4 py-4">
                        {requests.length === 0 ? (
                            <p className="text-center py-10 opacity-50">Nenhuma solicitação no momento.</p>
                        ) : requests.map(req => (
                            <Card key={req.id} className="p-4 bg-muted/20">
                                <div className="flex flex-col gap-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-black text-lg uppercase leading-none">{req.name}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {req.intent === 'create' ? 'Deseja abrir nova comanda' : 'Já está consumindo e quer ver a conta'}
                                            </p>
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => onReject(req.id)} className="text-destructive"><X className="h-5 w-5" /></Button>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] uppercase font-bold opacity-50">Vincular a Comanda Aberta</Label>
                                            <Select onValueChange={(val) => setSelectedOrderMap(p => ({ ...p, [req.id]: val }))}>
                                                <SelectTrigger><SelectValue placeholder="Selecione a mesa..." /></SelectTrigger>
                                                <SelectContent>
                                                    {openOrders.map(o => (
                                                        <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex items-end gap-2">
                                            <Button 
                                                className="flex-1 bg-green-600 hover:bg-green-700" 
                                                disabled={!selectedOrderMap[req.id]}
                                                onClick={() => onApprove(req, selectedOrderMap[req.id])}
                                            >
                                                <Check className="mr-2 h-4 w-4" /> Aprovar
                                            </Button>
                                        </div>
                                    </div>
                                    
                                    {req.intent === 'create' && (
                                        <Button variant="outline" className="w-full" onClick={onOpenCreateDialog}>
                                            <UserPlus className="mr-2 h-4 w-4" /> Criar Comanda do Zero
                                        </Button>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                </ScrollArea>
                <DialogFooter><Button variant="secondary" onClick={() => onOpenChange(false)}>Fechar</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
