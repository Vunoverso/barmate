
"use client";

import type { Product, OrderItem, Sale, ActiveOrder, ProductCategory, Payment, FinancialEntry, Client, GuestRequest } from '@/types';
import { formatCurrency, LUCIDE_ICON_MAP } from '@/lib/constants';
import { getProducts, getProductCategories, addSale, getOpenOrders, saveOpenOrders, addFinancialEntry, getClients, saveClients, getArchivedOrders, saveArchivedOrders } from '@/lib/data-access';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, MinusCircle, Trash2, Search, LayoutGrid, List, CheckCircle, ShoppingCart, Package, Edit, Merge, Wallet, Printer, Link as LinkIcon, Copy, Plus, Users, UserCheck, X } from 'lucide-react';
import PaymentDialog from './payment-dialog';
import CreateOrderDialog from './create-order-dialog';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OrderStatement } from './order-statement';
import { db } from '@/lib/firebase';
import { doc, setDoc, deleteDoc, writeBatch, collection, onSnapshot, query, where, updateDoc } from "firebase/firestore";

// --- Sub-componentes auxiliares ---

function ProductDisplay({ products, productCategories, addToOrder, viewMode }: { products: Product[], productCategories: ProductCategory[], addToOrder: (p: Product) => void, viewMode: 'grid' | 'list' }) {
  if (products.length === 0) return <p className="text-muted-foreground text-center py-10">Nenhum produto encontrado.</p>;
  if (viewMode === 'grid') return (
    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 gap-2"> 
      {products.map(product => {
        const category = productCategories.find(c => c.id === product.categoryId);
        const IconComponent = category ? (LUCIDE_ICON_MAP[category.iconName] || Package) : Package;
        return (
          <Card key={product.id} className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group" onClick={() => addToOrder(product)}>
            <div className="aspect-square bg-muted flex items-center justify-center p-2 group-hover:bg-muted/80 transition-colors">
              <IconComponent className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <CardContent className="p-1.5">
              <h3 className="font-medium truncate text-[11px] leading-tight">{product.name}</h3>
              <p className="text-primary font-semibold text-xs sm:text-sm">{formatCurrency(product.price)}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
  return (
    <div className="space-y-1">
      {products.map(product => {
         const category = productCategories.find(c => c.id === product.categoryId);
         const IconComponent = category ? (LUCIDE_ICON_MAP[category.iconName] || Package) : Package;
        return (
          <Card key={product.id} className="flex items-center p-1.5 cursor-pointer hover:bg-muted/50 transition-colors group" onClick={() => addToOrder(product)}>
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-muted rounded-md flex items-center justify-center mr-2 group-hover:bg-muted/80 transition-colors">
              <IconComponent className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="flex-grow"><h3 className="font-medium text-xs sm:text-sm">{product.name}</h3><p className="text-xs text-muted-foreground">{category?.name}</p></div>
            <p className="text-primary font-semibold text-sm sm:text-base">{formatCurrency(product.price)}</p>
          </Card>
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

function EditOrderNameDialog({ isOpen, onOpenChange, order, onSave }: any) {
    const [n, setN] = useState('');
    useEffect(() => { if (order) setN(order.name); }, [order]);
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader><DialogTitle>Editar Nome</DialogTitle></DialogHeader>
                <div className="py-4 space-y-2">
                    <Label>Nome da Comanda</Label>
                    <Input value={n} onChange={e => setN(e.target.value)} autoFocus />
                </div>
                <DialogFooter>
                    <Button onClick={() => {onSave(order.id, n); onOpenChange(false);}}>Salvar Alterações</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function MergeOrdersDialog({ isOpen, onOpenChange, currentOrder, allOrders, onMerge }: any) {
    const [sel, setSel] = useState<Record<string, boolean>>({});
    const other = allOrders.filter((o: any) => o.id !== currentOrder.id);
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader><DialogTitle>Juntar Comandas</DialogTitle></DialogHeader>
                <div className="py-2">
                    <Label className="text-xs text-muted-foreground mb-2 block">Selecione as comandas que serão movidas para "{currentOrder?.name}"</Label>
                    <ScrollArea className="h-48 border rounded-md p-2">
                        {other.length > 0 ? other.map((o: any) => (
                            <div key={o.id} className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded-md">
                                <Checkbox 
                                    id={o.id} 
                                    checked={!!sel[o.id]} 
                                    onCheckedChange={(checked) => setSel(prev => ({...prev, [o.id]: !!checked}))} 
                                /> 
                                <Label htmlFor={o.id} className="cursor-pointer flex-grow">{o.name}</Label>
                            </div>
                        )) : <p className="text-center py-10 text-xs text-muted-foreground italic">Nenhuma outra comanda aberta.</p>}
                    </ScrollArea>
                </div>
                <DialogFooter>
                    <Button onClick={() => onMerge(Object.keys(sel).filter(k => sel[k]))} disabled={!Object.values(sel).some(v => v)}>Juntar Comandas Selecionadas</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function AddCreditDialog({ isOpen, onOpenChange, onSave }: any) {
    const [a, setA] = useState('');
    const [d, setD] = useState('');
    const [s, setS] = useState('');
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader><DialogTitle>Adicionar Crédito</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Valor do Crédito</Label>
                        <Input type="number" placeholder="0,00" value={a} onChange={e => setA(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Motivo/Descrição</Label>
                        <Input placeholder="Ex: Permuta, Troco anterior" value={d} onChange={e => setD(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Origem do Valor</Label>
                        <Select onValueChange={setS} value={s}>
                            <SelectTrigger><SelectValue placeholder="Selecione a origem..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="permuta">Permuta / Cortesia (Não entra no caixa)</SelectItem>
                                <SelectItem value="dinheiro">Dinheiro (Entra no Caixa Diário)</SelectItem>
                                <SelectItem value="cartao">Cartão / PIX (Entra no Banco)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter><Button onClick={() => onSave({amount: parseFloat(a), description: d, source: s})}>Confirmar Crédito</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function LinkGuestRequestDialog({ isOpen, onOpenChange, request, orders, onLink, onCreateAndLink }: any) {
    const [sid, setSid] = useState('');
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Vincular {request?.name}</DialogTitle>
                    <DialogDescription>
                        {request?.intent === 'create' 
                            ? "O cliente solicitou a abertura de uma NOVA comanda." 
                            : "O cliente já tem uma comanda e quer visualizá-la."}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Escolher Comanda Aberta</Label>
                        <ScrollArea className="h-[250px] border rounded-md p-2">
                            <div className="space-y-1">
                                {orders.length > 0 ? orders.map((o: any) => (
                                    <Button
                                        key={o.id}
                                        variant={sid === o.id ? "secondary" : "ghost"}
                                        className="w-full justify-start font-normal h-auto py-2"
                                        onClick={() => setSid(o.id)}
                                    >
                                        <div className="flex flex-col items-start min-w-0">
                                            <span className="font-bold truncate w-full text-left uppercase text-xs">{o.name}</span>
                                            <span className="text-[10px] opacity-70">
                                                {o.items.length} itens • {formatCurrency(o.items.reduce((acc: number, i: any) => acc + i.price * i.quantity, 0))}
                                            </span>
                                        </div>
                                    </Button>
                                )) : (
                                    <p className="text-center text-muted-foreground py-10 text-xs italic">Nenhuma comanda aberta.</p>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                    <Button className="w-full h-12 font-bold" disabled={!sid} onClick={() => onLink(sid)}>
                        <UserCheck className="mr-2 h-5 w-5" /> Vincular à Comanda Selecionada
                    </Button>
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground font-bold">Ou</span></div>
                    </div>
                    <Button variant="outline" className="w-full h-12" onClick={() => onCreateAndLink({ name: request?.name, clientId: null })}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Abrir Nova Comanda para o Cliente
                    </Button>
                </div>
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
  
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isCreateOrderDialogOpen, setIsCreateOrderDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<ActiveOrder | null>(null);
  const [orderToArchive, setOrderToArchive] = useState<ActiveOrder | null>(null);
  const [orderToEdit, setOrderToEdit] = useState<ActiveOrder | null>(null);
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const [isCreditDialogOpen, setIsCreditDialogOpen] = useState(false);
  const [orderToPrint, setOrderToPrint] = useState<ActiveOrder | null>(null);
  const [orderToShare, setOrderToShare] = useState<ActiveOrder | null>(null);
  const [requestToLink, setRequestToLink] = useState<GuestRequest | null>(null);
  const statementRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [activeDisplayCategory, setActiveDisplayCategory] = useState<string>('Todos');

  const prepareForFirestore = (data: any) => {
    return JSON.parse(JSON.stringify(data, (key, value) => {
        return value === undefined ? null : value;
    }));
  };

  const syncOrderToFirestore = async (order: ActiveOrder) => {
    try {
        if (!db) return;
        const orderRef = doc(db, 'open_orders', order.id);
        const plainOrder = prepareForFirestore(order);
        await setDoc(orderRef, plainOrder, { merge: true });
    } catch (error) {
        console.error("Firestore sync error", error);
    }
  };
    
  const deleteOrderFromFirestore = async (orderId: string) => {
    try {
        if (!db) return;
        const orderRef = doc(db, 'open_orders', orderId);
        await deleteDoc(orderRef);
    } catch (error) {
        console.error("Firestore delete error", error);
    }
  };

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'guest_requests'), where('status', '==', 'pending'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const requests = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as GuestRequest));
        setGuestRequests(requests);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const syncAllOrders = async () => {
        const localOrders = getOpenOrders();
        if (localOrders.length > 0 && db) {
            try {
                const batch = writeBatch(db);
                localOrders.forEach(order => {
                    const orderRef = doc(db, 'open_orders', order.id);
                    batch.set(orderRef, prepareForFirestore(order), { merge: true });
                });
                await batch.commit();
            } catch (error) {
                console.error("Erro ao sincronizar comandas em lote:", error);
            }
        }
    };
    if (!isLoading) {
        syncAllOrders();
    }
  }, [isLoading]);

 const fetchData = useCallback(() => {
    setIsLoading(true);
    const fetchedProducts = getProducts();
    const fetchedCategories = getProductCategories();
    const fetchedOrders = getOpenOrders();
    const fetchedClients = getClients();

    setProducts(fetchedProducts);
    setProductCategories(fetchedCategories);
    setOpenOrders(fetchedOrders);
    setClients(fetchedClients);

    if (currentOrderId && !fetchedOrders.some(o => o.id === currentOrderId)) {
      setCurrentOrderId(fetchedOrders.length > 0 ? fetchedOrders[0].id : null);
    } else if (!currentOrderId && fetchedOrders.length > 0) {
      setCurrentOrderId(fetchedOrders[0].id);
    } else if (fetchedOrders.length === 0) {
      setCurrentOrderId(null);
    }
    setIsLoading(false);
  }, [currentOrderId]);

  useEffect(() => {
    fetchData();
    window.addEventListener('storage', fetchData);
    return () => window.removeEventListener('storage', fetchData);
  }, [fetchData]);

  const filteredOpenOrders = useMemo(() => {
    return openOrders.filter(o => o.name.toLowerCase().includes(orderSearchTerm.toLowerCase()));
  }, [openOrders, orderSearchTerm]);

  const currentOrder = useMemo(() => {
    return openOrders.find(o => o.id === currentOrderId);
  }, [openOrders, currentOrderId]);

  const currentOrderItems = useMemo(() => {
    if (!currentOrder) return [];
    return currentOrder.items.map(item => {
        const productDetails = products.find(p => p.id === item.id);
        if (!productDetails) return item; 
        const category = productCategories.find(c => c.id === productDetails.categoryId);
        return { ...item, categoryName: category?.name, categoryIconName: category?.iconName };
    });
  }, [currentOrder, products, productCategories]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase()));
  }, [products, productSearchTerm]);
  
  const productsByCategoryDisplay = useMemo(() => {
    if (!productCategories.length) return {};
    return filteredProducts.reduce((acc, product) => {
      const category = productCategories.find(c => c.id === product.categoryId);
      const categoryName = category ? category.name : 'Outros';
      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }
      acc[categoryName].push(product);
      return acc;
    }, {} as Record<string, Product[]>);
  }, [filteredProducts, productCategories]);

  const displayCategories = useMemo(() => {
      if (!productCategories.length) return [];
      return Object.keys(productsByCategoryDisplay).sort();
  }, [productsByCategoryDisplay, productCategories]);

  useEffect(() => {
    if (displayCategories.length > 0 && (activeDisplayCategory === 'Todos' || !displayCategories.includes(activeDisplayCategory))) {
        setActiveDisplayCategory(displayCategories[0]);
    }
  }, [displayCategories, activeDisplayCategory]);

  const handleOpenCreateOrderDialog = useCallback(() => {
    setIsCreateOrderDialogOpen(true);
  }, []);

  const handleCreateNewOrder = useCallback((details: { name: string; clientId: string | null; }) => {
    const newOrderId = `order-${Date.now()}`;
    const newOrder: ActiveOrder = {
      id: newOrderId,
      name: details.name,
      clientId: details.clientId,
      items: [],
      createdAt: new Date(),
    };
    const updatedOrders = [...getOpenOrders(), newOrder];
    saveOpenOrders(updatedOrders);
    syncOrderToFirestore(newOrder);
    setCurrentOrderId(newOrderId); 
    toast({ title: "Nova Comanda Criada", description: `${newOrder.name} pronta para itens.`});
    return newOrderId;
  }, [toast]);

  const handleSelectOrder = useCallback((orderId: string) => {
    setCurrentOrderId(orderId);
  }, []);

  const handleEditOrder = useCallback(() => {
    const order = openOrders.find(o => o.id === currentOrderId);
    if (order) setOrderToEdit(order);
  }, [openOrders, currentOrderId]);
  
  const handleSaveOrderName = useCallback((orderId: string, newName: string) => {
      let updatedOrder: ActiveOrder | undefined;
      const updatedOrders = getOpenOrders().map(order => {
          if(order.id === orderId) {
              updatedOrder = { ...order, name: newName };
              return updatedOrder;
          }
          return order;
      });
      saveOpenOrders(updatedOrders);
      if (updatedOrder) syncOrderToFirestore(updatedOrder);
      setOrderToEdit(null);
      toast({ title: "Comanda Atualizada", description: `O nome foi alterado para "${newName}".` });
  }, [toast]);

  const confirmDeleteOrder = useCallback((order: ActiveOrder) => {
    setOrderToDelete(order);
  }, []);

  const handleDeleteOrder = useCallback(() => {
    if (!orderToDelete) return;
    const orderIdToDelete = orderToDelete.id;
    const orderName = orderToDelete.name;
    const oldOrders = getOpenOrders();
    const updatedOrders = oldOrders.filter(order => order.id !== orderIdToDelete);
    let nextSelectedId: string | null = null;
    if (currentOrderId === orderIdToDelete) {
        if (updatedOrders.length > 0) {
            const deletedIndex = oldOrders.findIndex(o => o.id === orderIdToDelete);
            nextSelectedId = updatedOrders[deletedIndex]?.id || updatedOrders[deletedIndex - 1]?.id || updatedOrders[0].id;
        }
    } else {
      nextSelectedId = currentOrderId;
    }
    saveOpenOrders(updatedOrders);
    deleteOrderFromFirestore(orderIdToDelete);
    setOrderToDelete(null);
    if (currentOrderId === orderIdToDelete) setCurrentOrderId(nextSelectedId);
    toast({ title: "Comanda Removida", description: `${orderName} foi removida.`, variant: "destructive" });
  }, [orderToDelete, currentOrderId, toast]);

    const confirmArchiveOrder = useCallback((order: ActiveOrder) => {
        setOrderToArchive(order);
    }, []);

    const handleArchiveOrder = useCallback(() => {
        if (!orderToArchive || !orderToArchive.clientId) return;
        const allArchivedOrders = getArchivedOrders();
        saveArchivedOrders([...allArchivedOrders, orderToArchive]);
        const oldOrders = getOpenOrders();
        const updatedOrders = oldOrders.filter(order => order.id !== orderToArchive.id);
        let nextSelectedId: string | null = null;
        if (currentOrderId === orderToArchive.id) {
            if (updatedOrders.length > 0) {
                const deletedIndex = oldOrders.findIndex(o => o.id === orderToArchive.id);
                nextSelectedId = updatedOrders[deletedIndex]?.id || updatedOrders[deletedIndex - 1]?.id || updatedOrders[0].id;
            }
        } else {
          nextSelectedId = currentOrderId;
        }
        saveOpenOrders(updatedOrders);
        deleteOrderFromFirestore(orderToArchive.id);
        setOrderToArchive(null);
        if (currentOrderId === orderToArchive.id) setCurrentOrderId(nextSelectedId);
        toast({ title: "Comanda Arquivada como Dívida", description: `A comanda de ${orderToArchive.name} foi movida para o histórico de dívidas do cliente.` });
    }, [orderToArchive, currentOrderId, toast]);
  
  const handleMergeOrders = useCallback((sourceOrderIds: string[]) => {
    if (!currentOrderId || sourceOrderIds.length === 0) return;
    const allOrders = getOpenOrders();
    let destinationOrder = allOrders.find(o => o.id === currentOrderId);
    if (!destinationOrder) return;
    const sourceOrders = allOrders.filter(o => sourceOrderIds.includes(o.id));
    const allItemsToMerge = [...destinationOrder.items, ...sourceOrders.flatMap(o => o.items)];
    const mergedItems = allItemsToMerge.reduce((acc, item) => {
        const isGroupable = !item.isCombo && !item.id.startsWith('combo-') && item.price > 0 && !item.id.startsWith('payment-') && !item.id.startsWith('credit-');
        const existingItem = isGroupable ? acc.find(i => i.id === item.id) : null;
        if (existingItem) {
            existingItem.quantity += item.quantity;
        } else {
            acc.push({ ...item });
        }
        return acc;
    }, [] as OrderItem[]);
    const updatedOrder: ActiveOrder = { ...destinationOrder, items: mergedItems };
    const finalOrders = allOrders.filter(o => !sourceOrderIds.includes(o.id)).map(o => o.id === currentOrderId ? updatedOrder : o);
    saveOpenOrders(finalOrders);
    syncOrderToFirestore(updatedOrder);
    sourceOrderIds.forEach(id => deleteOrderFromFirestore(id));
    setIsMergeDialogOpen(false);
    toast({ title: "Comandas Juntadas!", description: `${sourceOrderIds.length} comandas foram juntadas em "${destinationOrder.name}".`});
  }, [currentOrderId, toast]);

  const handleAddCredit = useCallback(({ amount, description, source }: { amount: number; description: string; source: 'permuta' | 'dinheiro' | 'cartao' | 'pix' }) => {
    if (!currentOrderId) return;
    const allOrders = getOpenOrders();
    const orderToUpdate = allOrders.find(o => o.id === currentOrderId);
    if (!orderToUpdate) return;
    const creditItem: OrderItem = {
        id: `credit-${Date.now()}`,
        lineItemId: `line-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: `Crédito: ${description}`,
        price: -amount,
        quantity: 1,
        categoryId: 'cat_outros',
        isCombo: false, 
        comboItems: null
    };
    const newName = `${orderToUpdate.name.replace(' (Com Crédito)', '').replace(' (Crédito de Troco)', '')} (Com Crédito)`;
    const updatedOrder = { ...orderToUpdate, items: [...orderToUpdate.items, creditItem], name: newName };
    const newOpenOrders = allOrders.map(order => order.id === currentOrderId ? updatedOrder : order);
    saveOpenOrders(newOpenOrders);
    syncOrderToFirestore(updatedOrder);
    if (source !== 'permuta') {
        const entrySource = source === 'dinheiro' ? 'daily_cash' : 'bank_account';
        const entry: Omit<FinancialEntry, 'id' | 'timestamp'> = {
            description: `Crédito para ${orderToUpdate.name}: ${description}`,
            amount: amount,
            type: 'income',
            source: entrySource,
            saleId: null,
            adjustmentId: null
        };
        addFinancialEntry(entry);
        toast({ title: "Crédito Adicionado e Registrado", description: `${formatCurrency(amount)} adicionado à comanda e registrado como entrada.` });
    } else {
        toast({ title: "Crédito Adicionado", description: `${formatCurrency(amount)} adicionado à comanda como permuta/cortesia.` });
    }
    setIsCreditDialogOpen(false);
  }, [currentOrderId, toast]);

  const addToOrder = useCallback((product: Product) => {
    if (!currentOrderId) return;
    const allOrders = getOpenOrders();
    const orderToUpdate = allOrders.find(order => order.id === currentOrderId);
    if (!orderToUpdate) return;
    let updatedItems: OrderItem[];
    const isNormalProduct = !product.isCombo;
    const existingItemIndex = isNormalProduct 
        ? orderToUpdate.items.findIndex(item => item.id === product.id && !item.isCombo && item.price === product.price)
        : -1;
    if (existingItemIndex > -1) {
        updatedItems = [...orderToUpdate.items];
        const existingItem = updatedItems[existingItemIndex];
        updatedItems[existingItemIndex] = { ...existingItem, quantity: existingItem.quantity + 1 };
    } else {
        const newItem: OrderItem = { ...product, lineItemId: `line-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, quantity: 1, claimedQuantity: 0 };
        updatedItems = [...orderToUpdate.items, newItem];
    }
    let updatedOrder: ActiveOrder = { ...orderToUpdate, items: updatedItems };
    const currentTotal = updatedOrder.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    
    // Reset status if item added to a paid order
    if (updatedOrder.status === 'paid' && currentTotal > 0) {
      const { status, ...orderWithoutStatus } = updatedOrder;
      updatedOrder = orderWithoutStatus as ActiveOrder;
    }
    
    saveOpenOrders(allOrders.map(order => (order.id === currentOrderId ? updatedOrder : order)));
    syncOrderToFirestore(updatedOrder);
  }, [currentOrderId]);
  
  const updateQuantity = useCallback((lineItemId: string, quantity: number) => {
    if (!currentOrderId) return;
    const allOrders = getOpenOrders();
    let updatedOrder: ActiveOrder | undefined;
    const updatedOrders = allOrders.map(order => {
        if (order.id === currentOrderId) {
            let updatedItems = quantity <= 0 ? order.items.filter(item => item.lineItemId !== lineItemId) : order.items.map(item => item.lineItemId === lineItemId ? { ...item, quantity } : item);
            updatedOrder = { ...order, items: updatedItems };
            return updatedOrder;
        }
        return order;
    });
    saveOpenOrders(updatedOrders);
    if (updatedOrder) syncOrderToFirestore(updatedOrder);
  }, [currentOrderId]);

  const removeFromOrder = useCallback((lineItemId: string) => {
    if (!currentOrderId) return;
    const allOrders = getOpenOrders();
    let updatedOrder: ActiveOrder | undefined;
    const updatedOrders = allOrders.map(order => {
        if (order.id === currentOrderId) {
            updatedOrder = { ...order, items: order.items.filter(item => item.lineItemId !== lineItemId) };
            return updatedOrder;
        }
        return order;
    });
    saveOpenOrders(updatedOrders);
    if (updatedOrder) syncOrderToFirestore(updatedOrder);
  }, [currentOrderId]);

  const orderTotal = useMemo(() => {
    if (!currentOrderItems) return 0;
    return currentOrderItems.reduce((total, item) => total + item.price * item.quantity, 0);
  }, [currentOrderItems]);
  
  const handlePayment = useCallback((details: { sale: Omit<Sale, 'id' | 'timestamp' | 'name'>, leaveChangeAsCredit: boolean, isPartial: boolean }) => {
    const { sale, isPartial, leaveChangeAsCredit } = details;
    const allOrders = getOpenOrders();
    const currentOrderForPayment = allOrders.find(o => o.id === currentOrderId);
    if (!currentOrderForPayment) return;
    const saleName = currentOrderForPayment.name || 'Venda';
    addSale({ ...sale, name: saleName });
    if (isPartial) {
        const totalPaid = sale.payments.reduce((acc, p) => acc + p.amount, 0);
        const paymentItem: OrderItem = { id: `payment-${Date.now()}`, lineItemId: `line-item-${Date.now()}`, name: `Pagamento Parcial`, price: -totalPaid, quantity: 1, categoryId: 'cat_outros', isCombo: false, comboItems: null };
        const updatedOrder: ActiveOrder = { ...currentOrderForPayment, items: [...currentOrderForPayment.items, paymentItem] };
        saveOpenOrders(allOrders.map(o => o.id === currentOrderId ? updatedOrder : o));
        syncOrderToFirestore(updatedOrder);
        toast({ title: "Pagamento Parcial Recebido!", description: `${formatCurrency(totalPaid)} foi abatido da comanda.` });
    } else {
        deleteOrderFromFirestore(currentOrderForPayment.id);
        const currentIndex = allOrders.findIndex(o => o.id === currentOrderId);
        let nextOrdersState = allOrders.filter(order => order.id !== currentOrderId);
        let nextSelectedOrderId: string | null = null;
        if (leaveChangeAsCredit && sale.changeGiven && sale.changeGiven > 0) {
            const newCreditOrder: ActiveOrder = {
                id: `order-credit-${Date.now()}`, name: `${saleName.replace(/ \((Com Crédito|Crédito de Troco)\)/, '')} (Crédito de Troco)`, items: [{
                    id: `credit-${Date.now()}`, lineItemId: `line-item-${Date.now()}`, name: `Crédito de Troco`, price: -sale.changeGiven, quantity: 1, categoryId: 'cat_outros', isCombo: false, comboItems: null,
                }], createdAt: new Date(), clientId: currentOrderForPayment.clientId,
            };
            nextOrdersState.push(newCreditOrder);
            syncOrderToFirestore(newCreditOrder);
            nextSelectedOrderId = newCreditOrder.id;
        } else if (nextOrdersState.length > 0) {
            nextSelectedOrderId = nextOrdersState[currentIndex] ? nextOrdersState[currentIndex].id : nextOrdersState[nextOrdersState.length - 1].id;
        }
        saveOpenOrders(nextOrdersState);
        setCurrentOrderId(nextSelectedOrderId);
        toast({ title: "Venda Concluída!", description: `Venda registrada com sucesso.`});
    }
  }, [currentOrderId, toast]);

  const handlePrintOrder = useCallback(() => { if (currentOrder) setOrderToPrint(currentOrder); }, [currentOrder]);
  const handleShareOrder = useCallback(() => { if (currentOrder) setOrderToShare(currentOrder); }, [currentOrder]);

  const handleActualPrint = () => {
    const node = statementRef.current;
    if (!node) return;
    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
        document.querySelectorAll('link[rel="stylesheet"], style').forEach(styleSheet => printWindow.document.head.appendChild(styleSheet.cloneNode(true)));
        printWindow.document.body.innerHTML = node.outerHTML;
        const printSpecificStyles = printWindow.document.createElement('style');
        printSpecificStyles.innerHTML = `@page { size: 80mm auto; margin: 0; } body { background: white !important; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .printable-content { width: 76mm; margin: 0 auto !important; padding: 2mm !important; box-sizing: border-box !important; border-left: 1px dotted black !important; border-right: 1px dotted black !important; color: black !important; } .printable-content * { color: black !important; }`;
        printWindow.document.head.appendChild(printSpecificStyles);
        setTimeout(() => { printWindow.focus(); printWindow.print(); printWindow.close(); }, 500);
    }
  };

  const handleLinkRequestToOrder = async (orderId: string) => {
      if (!requestToLink || !db) return;
      try {
          await updateDoc(doc(db, 'guest_requests', requestToLink.id), { status: 'approved', associatedOrderId: orderId });
          setRequestToLink(null);
          toast({ title: "Cliente Vinculado!" });
      } catch (error) { console.error(error); }
  };

  const handleRejectRequest = async (requestId: string) => {
      if (!db) return;
      try { await updateDoc(doc(db, 'guest_requests', requestId), { status: 'rejected' }); } catch (error) { console.error(error); }
  };

  if (isLoading) return <div className="flex items-center justify-center h-full"><p>Carregando...</p></div>;

  return (
    <TooltipProvider>
      <div className="grid md:grid-cols-12 gap-4 h-[calc(100vh-100px)]">
        <div className="md:col-span-3 flex flex-col h-full">
          <Card className="flex-grow flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>Comandas Abertas</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="outline" onClick={handleOpenCreateOrderDialog} className="h-8 w-8 p-0 shrink-0 border-primary text-primary hover:bg-primary/10">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Nova Comanda</p></TooltipContent>
                </Tooltip>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <div className="relative flex-grow">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar..." value={orderSearchTerm} onChange={(e) => setOrderSearchTerm(e.target.value)} className="pl-8 h-9" />
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={() => setIsCreditDialogOpen(true)} disabled={!currentOrderId}><Wallet className="h-4 w-4"/></Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Adicionar Crédito</p></TooltipContent>
                </Tooltip>
              </div>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden p-0">
              <ScrollArea className="h-full p-2">
                {guestRequests.length > 0 && (
                    <div className="mb-4 space-y-2">
                        <p className="text-[10px] font-bold uppercase text-primary px-2 flex items-center gap-1"><Users className="h-3 w-3" /> Aguardando vínculo</p>
                        {guestRequests.map(req => (
                            <div key={req.id} className="bg-primary/5 border border-primary/20 rounded-lg p-2 flex flex-col gap-2">
                                <div className="flex items-center justify-between gap-2 min-w-0">
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold truncate">{req.name}</p>
                                        <p className="text-[9px] text-primary/70 uppercase font-black">
                                            {req.intent === 'create' ? 'Solicitou Nova Comanda' : 'Já tem comanda'}
                                        </p>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleRejectRequest(req.id)}><X className="h-4 w-4" /></Button>
                                        <Button size="sm" className="h-7 px-2 text-[10px]" onClick={() => setRequestToLink(req)}>Vincular</Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <Separator className="!my-4" />
                    </div>
                )}
                <div className="space-y-2">
                    {filteredOpenOrders.map(order => {
                       const total = order.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
                       return (
                      <div key={order.id} role="button" onClick={() => handleSelectOrder(order.id)} className={cn(buttonVariants({ variant: currentOrderId === order.id ? "secondary" : "outline" }), "w-full h-auto py-1.5 px-3 cursor-pointer flex items-center justify-between", total < 0 && "border-amber-500 bg-amber-50 dark:bg-amber-900/20")}>
                        <div className="flex-1 min-w-0">
                           <div className="font-semibold text-xs truncate">{order.name}</div>
                           <div className="text-[0.65rem] text-muted-foreground">{order.items.length} item(s) • {format(new Date(order.createdAt), "HH:mm", { locale: ptBR })}</div>
                        </div>
                        <div className="flex-shrink-0 text-right font-semibold text-xs">{formatCurrency(total)}</div>
                      </div>
                    )})}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-5 flex flex-col h-full">
          <Card className="flex-grow flex flex-col">
            <CardHeader>
              <CardTitle>Selecionar Produtos</CardTitle>
              <div className="flex items-center gap-2 pt-2">
                <Search className="h-5 w-5 text-muted-foreground" />
                <Input placeholder="Buscar..." value={productSearchTerm} onChange={(e) => setProductSearchTerm(e.target.value)} className="max-w-sm" disabled={!currentOrderId} />
                <div className="ml-auto flex gap-2">
                  <Button variant={viewMode === 'grid' ? 'secondary' : 'outline'} size="icon" onClick={() => setViewMode('grid')} disabled={!currentOrderId}><LayoutGrid className="h-5 w-5" /></Button>
                  <Button variant={viewMode === 'list' ? 'secondary' : 'outline'} size="icon" onClick={() => setViewMode('list')} disabled={!currentOrderId}><List className="h-5 w-5" /></Button>
                </div>
              </div>
            </CardHeader>
            <Tabs value={activeDisplayCategory} onValueChange={setActiveDisplayCategory} className="flex-grow flex flex-col overflow-hidden">
              <div className="w-full overflow-x-auto px-4"><TabsList><TabsTrigger value="Todos" disabled={!currentOrderId}>Todos</TabsTrigger>{displayCategories.map(c => <TabsTrigger key={c} value={c} disabled={!currentOrderId}>{c}</TabsTrigger>)}</TabsList></div>
              <ScrollArea className="flex-grow p-4">
                {currentOrderId ? (
                  <>
                    <TabsContent value="Todos" className="mt-0"><ProductDisplay products={filteredProducts} productCategories={productCategories} addToOrder={addToOrder} viewMode={viewMode} /></TabsContent>
                    {displayCategories.map(c => <TabsContent key={c} value={c} className="mt-0"><ProductDisplay products={productsByCategoryDisplay[c] || []} productCategories={productCategories} addToOrder={addToOrder} viewMode={viewMode} /></TabsContent>)}
                  </>
                ) : <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50"><ShoppingCart className="h-16 w-16 mb-2" /><p>Selecione uma comanda</p></div>}
              </ScrollArea>
            </Tabs>
          </Card>
        </div>

        <div className="md:col-span-4 flex flex-col h-full">
          <Card className="flex-grow flex flex-col">
            <CardHeader className="pb-3 border-b bg-muted/10">
              {currentOrder && (
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-foreground truncate uppercase leading-tight">
                    {currentOrder.name}
                  </h2>
                  <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <LinkIcon className="h-5 w-5 cursor-pointer text-primary hover:scale-110 transition-transform" onClick={handleShareOrder} />
                            </TooltipTrigger>
                            <TooltipContent><p>Compartilhar</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Edit className="h-5 w-5 cursor-pointer text-primary hover:scale-110 transition-transform" onClick={handleEditOrder} />
                            </TooltipTrigger>
                            <TooltipContent><p>Editar Nome</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Merge className="h-5 w-5 cursor-pointer text-primary hover:scale-110 transition-transform" onClick={() => setIsMergeDialogOpen(true)} />
                            </TooltipTrigger>
                            <TooltipContent><p>Juntar Comandas</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Printer className="h-5 w-5 cursor-pointer text-primary hover:scale-110 transition-transform" onClick={handlePrintOrder} />
                            </TooltipTrigger>
                            <TooltipContent><p>Imprimir</p></TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="text-2xl font-black text-primary">
                        {formatCurrency(orderTotal)}
                      </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground flex gap-2 font-bold uppercase tracking-wider">
                    <span>{currentOrder.items.length} itens</span>
                    <span>•</span>
                    <span>Abertura: {format(new Date(currentOrder.createdAt), "HH:mm", { locale: ptBR })}</span>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden p-0">
              <ScrollArea className="h-full p-4">
                {currentOrderItems.length === 0 ? <p className="text-muted-foreground text-center py-10">Comanda vazia.</p> : <ul className="space-y-2">
                  {currentOrderItems.map((item, i) => (
                    <li key={item.lineItemId || i} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 p-1.5 border rounded-md">
                      <div className="flex-shrink-0"><Package className="h-4 w-4 text-muted-foreground" /></div>
                      <div className="min-w-0"><p className="font-medium text-xs truncate">{item.name}</p></div>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => item.lineItemId && updateQuantity(item.lineItemId, item.quantity - 1)} disabled={item.price < 0}><MinusCircle className="h-3 w-3" /></Button>
                        <span className="w-4 text-center text-xs">{item.quantity}</span>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => item.lineItemId && updateQuantity(item.lineItemId, item.quantity + 1)} disabled={item.price < 0}><PlusCircle className="h-3 w-3" /></Button>
                      </div>
                      <div className="w-[60px] text-right font-semibold text-xs">{formatCurrency(item.price * item.quantity)}</div>
                    </li>
                  ))}
                </ul>}
              </ScrollArea>
            </CardContent>
            <CardFooter className="flex flex-col gap-2 p-3 border-t">
               <Button size="lg" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold h-12" disabled={orderTotal === 0 || !currentOrderId} onClick={() => setIsPaymentDialogOpen(true)}>PAGAR {formatCurrency(orderTotal)}</Button>
               <div className="grid grid-cols-2 gap-2 w-full">
                <Button variant="outline" size="sm" disabled={!currentOrder?.clientId || orderTotal <= 0} onClick={() => currentOrder && confirmArchiveOrder(currentOrder)}>Arquivar</Button>
                <Button variant="destructive" size="sm" disabled={!currentOrderId} onClick={() => currentOrder && confirmDeleteOrder(currentOrder)}>Cancelar</Button>
               </div>
            </CardFooter>
          </Card>
        </div>
      </div>

      <CreateOrderDialog isOpen={isCreateOrderDialogOpen} onOpenChange={setIsCreateOrderDialogOpen} onSubmit={handleCreateNewOrder} clients={clients} />
      {orderToEdit && <EditOrderNameDialog isOpen={!!orderToEdit} onOpenChange={() => setOrderToEdit(null)} order={orderToEdit} onSave={handleSaveOrderName} />}
      {currentOrder && <MergeOrdersDialog isOpen={isMergeDialogOpen} onOpenChange={setIsMergeDialogOpen} currentOrder={currentOrder} allOrders={openOrders} onMerge={handleMergeOrders} />}
      <AddCreditDialog isOpen={isCreditDialogOpen} onOpenChange={setIsCreditDialogOpen} onSave={handleAddCredit} />
      <PaymentDialog isOpen={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen} totalAmount={orderTotal} currentOrder={currentOrder} onSubmit={handlePayment} allowCredit={true} allowPartialPayment={true} />
      {orderToShare && <ShareOrderDialog isOpen={!!orderToShare} onOpenChange={() => setOrderToShare(null)} order={orderToShare} />}
      {orderToDelete && <AlertDialog open={!!orderToDelete} onOpenChange={() => setOrderToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remover Comanda?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Não</AlertDialogCancel><AlertDialogAction onClick={handleDeleteOrder} className="bg-destructive">Sim, Remover</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}
      {orderToArchive && <AlertDialog open={!!orderToArchive} onOpenChange={() => setOrderToArchive(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Arquivar como Dívida?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Não</AlertDialogCancel><AlertDialogAction onClick={handleArchiveOrder}>Sim, Arquivar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}
      <Dialog open={!!orderToPrint} onOpenChange={o => !o && setOrderToPrint(null)}><DialogContent><div ref={statementRef}>{orderToPrint && <OrderStatement order={orderToPrint} />}</div><DialogFooter><Button onClick={handleActualPrint}>Imprimir</Button></DialogFooter></DialogContent></Dialog>
      {requestToLink && <LinkGuestRequestDialog isOpen={!!requestToLink} onOpenChange={() => setRequestToLink(null)} request={requestToLink} orders={openOrders} onLink={handleLinkRequestToOrder} onCreateAndLink={details => { const id = handleCreateNewOrder(details); if (id) handleLinkRequestToOrder(id); }} />}
    </TooltipProvider>
  );
}
