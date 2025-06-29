
"use client";

import type { Product, OrderItem, Sale, ActiveOrder, ProductCategory, Payment } from '@/types';
import { getProducts, formatCurrency, getProductCategories, LUCIDE_ICON_MAP, addSale, PAYMENT_METHODS } from '@/lib/constants';
import { useState, useMemo, useEffect } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, MinusCircle, Trash2, Search, LayoutGrid, List, CheckCircle, ShoppingCart, PlusSquare, FileText, XCircle, Package, Banknote } from 'lucide-react';
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
import { cn } from '@/lib/utils';

const LOCAL_STORAGE_ORDERS_KEY = 'barmate_openOrders';

const groupProductsByCategoryId = (products: Product[], categories: ProductCategory[]) => {
  if (!categories.length) return {};
  return products.reduce((acc, product) => {
    const category = categories.find(c => c.id === product.categoryId);
    const categoryName = category ? category.name : 'Outros';
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(product);
    return acc;
  }, {} as Record<string, Product[]>);
};


export default function OrdersClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [openOrders, setOpenOrders] = useState<ActiveOrder[]>([]);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isCreateOrderDialogOpen, setIsCreateOrderDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<ActiveOrder | null>(null);
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [activeDisplayCategory, setActiveDisplayCategory] = useState<string>('Todos');

  useEffect(() => {
    setIsMounted(true);
    const allProducts = getProducts();
    const allCategories = getProductCategories();
    setProducts(allProducts);
    setProductCategories(allCategories);

    const storedOrders = localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY);
    if (storedOrders) {
      try {
        const parsedOrders: ActiveOrder[] = JSON.parse(storedOrders).map((order: ActiveOrder) => ({
          ...order,
          createdAt: new Date(order.createdAt),
          items: order.items.map(item => { // Hydrate items with category details
            const productDetails = allProducts.find(p => p.id === item.id);
            const category = allCategories.find(c => c.id === productDetails?.categoryId);
            return {
              ...item,
              categoryName: category?.name,
              categoryIconName: category?.iconName
            };
          })
        }));
        setOpenOrders(parsedOrders);
        if (parsedOrders.length > 0 && !currentOrderId) {
          setCurrentOrderId(parsedOrders[0].id);
        }
      } catch (error) {
        console.error("Failed to parse open orders from localStorage", error);
        localStorage.removeItem(LOCAL_STORAGE_ORDERS_KEY); 
      }
    }
     
    const handleProductsChange = () => setProducts(getProducts());
    const handleCategoriesChange = () => setProductCategories(getProductCategories());

    window.addEventListener('productsChanged', handleProductsChange);
    window.addEventListener('productCategoriesChanged', handleCategoriesChange);

    return () => {
      window.removeEventListener('productsChanged', handleProductsChange);
      window.removeEventListener('productCategoriesChanged', handleCategoriesChange);
    };
  }, []);

  // Update localStorage when openOrders change
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(openOrders));
    }
  }, [openOrders, isMounted]);


  const currentOrder = useMemo(() => {
    return openOrders.find(o => o.id === currentOrderId);
  }, [openOrders, currentOrderId]);

  const currentOrderItems = useMemo(() => {
    return currentOrder?.items || [];
  }, [currentOrder]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [products, searchTerm]);
  
  const productsByCategoryDisplay = useMemo(() => groupProductsByCategoryId(filteredProducts, productCategories), [filteredProducts, productCategories]);
  const displayCategories = useMemo(() => {
      if (!productCategories.length) return [];
      return Object.keys(productsByCategoryDisplay).sort();
  }, [productsByCategoryDisplay, productCategories]);

  
  useEffect(() => {
    if (displayCategories.length > 0 && (activeDisplayCategory === 'Todos' || !displayCategories.includes(activeDisplayCategory))) {
        setActiveDisplayCategory(displayCategories[0]);
    }
  }, [displayCategories, activeDisplayCategory]);


  const handleOpenCreateOrderDialog = () => {
    setIsCreateOrderDialogOpen(true);
  };

  const handleCreateNewOrder = (orderName: string) => {
    const newOrderId = `order-${Date.now()}`;
    const newOrder: ActiveOrder = {
      id: newOrderId,
      name: orderName,
      items: [],
      createdAt: new Date(),
    };
    setOpenOrders(prev => [...prev, newOrder]);
    setCurrentOrderId(newOrderId);
    toast({ title: "Nova Comanda Criada", description: `${newOrder.name} pronta para itens.`});
  };

  const handleSelectOrder = (orderId: string) => {
    setCurrentOrderId(orderId);
  };

  const confirmDeleteOrder = (order: ActiveOrder) => {
    setOrderToDelete(order);
  };

  const handleDeleteOrder = () => {
    if (!orderToDelete) return;
    const orderIdToDelete = orderToDelete.id;
    const orderName = orderToDelete.name;
    setOpenOrders(prevOrders => {
      const updatedOrders = prevOrders.filter(order => order.id !== orderIdToDelete);
      if (currentOrderId === orderIdToDelete) {
        setCurrentOrderId(updatedOrders.length > 0 ? updatedOrders[0].id : null);
      }
      return updatedOrders;
    });
    setOrderToDelete(null);
    toast({ title: "Comanda Removida", description: `${orderName} foi removida.`, variant: "destructive" });
  };

  const addToOrder = (product: Product) => {
    if (!currentOrderId) {
      toast({ title: "Nenhuma comanda selecionada", description: "Crie ou selecione uma comanda para adicionar produtos.", variant: "destructive" });
      return;
    }
    setOpenOrders(prevOrders =>
      prevOrders.map(order => {
        if (order.id === currentOrderId) {
          const existingItem = order.items.find(item => item.id === product.id);
          if (existingItem) {
            return {
              ...order,
              items: order.items.map(item =>
                item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
              ),
            };
          }
          const category = productCategories.find(c => c.id === product.categoryId);
          return { ...order, items: [...order.items, { 
            ...product, 
            quantity: 1,
            categoryName: category?.name,
            categoryIconName: category?.iconName
          }] };
        }
        return order;
      })
    );
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (!currentOrderId) return;
    setOpenOrders(prevOrders =>
      prevOrders.map(order => {
        if (order.id === currentOrderId) {
          if (quantity <= 0) {
            return { ...order, items: order.items.filter(item => item.id !== productId) };
          }
          return {
            ...order,
            items: order.items.map(item =>
              item.id === productId ? { ...item, quantity } : item
            ),
          };
        }
        return order;
      })
    );
  };

  const removeFromOrder = (productId: string) => {
    if (!currentOrderId) return;
    setOpenOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === currentOrderId
          ? { ...order, items: order.items.filter(item => item.id !== productId) }
          : order
      )
    );
  };

  const orderTotal = useMemo(() => {
    return currentOrderItems.reduce((total, item) => total + item.price * item.quantity, 0);
  }, [currentOrderItems]);
  
  const handlePayment = (details: { payments: Payment[]; changeGiven: number; discountAmount: number; status: 'completed', leaveChangeAsCredit: boolean }) => {
    if (!currentOrder) {
      toast({ title: "Erro", description: "Nenhuma comanda selecionada para pagamento.", variant: "destructive"});
      return;
    }

    const totalPaid = details.payments.reduce((sum, p) => sum + p.amount, 0);
    const effectiveOrderTotal = orderTotal - details.discountAmount;

    // Partial Payment Logic
    if (totalPaid < effectiveOrderTotal) {
        const paymentItems: OrderItem[] = details.payments.map(p => {
            const methodName = PAYMENT_METHODS.find(pm => pm.value === p.method)?.name || 'Pagamento';
            return {
                id: `payment-${p.method}-${Date.now()}`,
                name: `Pagamento Parcial (${methodName})`,
                price: -p.amount,
                quantity: 1,
                categoryId: 'cat_outros',
                categoryName: 'Pagamento',
                categoryIconName: 'Banknote',
            };
        });

        if (details.discountAmount > 0) {
            paymentItems.push({
                id: `discount-${Date.now()}`,
                name: `Desconto Aplicado`,
                price: -details.discountAmount,
                quantity: 1,
                categoryId: 'cat_outros',
                categoryName: 'Pagamento',
                categoryIconName: 'Banknote',
            });
        }
        
        const updatedOrder: ActiveOrder = {
            ...currentOrder,
            items: [...currentOrder.items, ...paymentItems],
        };

        addSale({
            id: `sale-partial-${Date.now()}`,
            items: paymentItems.map(pi => ({...pi, price: Math.abs(pi.price)})), // Log positive amounts in sale
            originalAmount: totalPaid,
            discountAmount: details.discountAmount,
            totalAmount: totalPaid - details.discountAmount,
            payments: details.payments,
            changeGiven: 0,
            timestamp: new Date(),
            status: 'completed'
        })
        
        setOpenOrders(openOrders.map(o => o.id === currentOrderId ? updatedOrder : o));
        toast({ title: "Pagamento Parcial Registrado", description: `${formatCurrency(totalPaid)} foi abatido da comanda.` });
        setIsPaymentDialogOpen(false);
        return;
    }
    
    // Full Payment Logic (totalPaid >= effectiveOrderTotal)
    const finalTotal = effectiveOrderTotal;
    const newSale: Sale = {
      id: `sale-${Date.now()}`,
      items: currentOrderItems, // includes products and previous partial payments as negative items
      originalAmount: currentOrderItems.filter(i => i.price > 0).reduce((sum, i) => sum + i.price * i.quantity, 0),
      discountAmount: details.discountAmount,
      totalAmount: finalTotal,
      payments: details.payments,
      changeGiven: details.changeGiven,
      timestamp: new Date(),
      status: 'completed',
    };
    addSale(newSale);

    // Handle order state after full payment
    let nextOrdersState = openOrders.filter(order => order.id !== currentOrderId);
    let nextSelectedOrderId: string | null = null;
    
    if (details.leaveChangeAsCredit && details.changeGiven > 0) {
        const creditAmount = details.changeGiven;
        const creditOrderName = `${currentOrder.name} (Crédito)`;
        const creditItem: OrderItem = {
            id: `credit-${Date.now()}`,
            name: `Crédito de Troco`,
            price: -creditAmount,
            quantity: 1,
            categoryId: 'cat_outros',
            categoryName: 'Outros',
            categoryIconName: 'Banknote',
        };
        const newCreditOrderId = `order-credit-${Date.now()}`;
        const newCreditOrder: ActiveOrder = {
            id: newCreditOrderId,
            name: creditOrderName,
            items: [creditItem],
            createdAt: new Date(),
        };
        nextOrdersState.push(newCreditOrder);
        nextSelectedOrderId = newCreditOrderId;
        toast({ title: "Comanda de Crédito Criada", description: `Uma nova comanda foi aberta para ${currentOrder.name} com um crédito de ${formatCurrency(creditAmount)}.` });
    } else {
        if (nextOrdersState.length > 0) {
            const currentIndex = openOrders.findIndex(o => o.id === currentOrderId);
            nextSelectedOrderId = nextOrdersState[currentIndex] ? nextOrdersState[currentIndex].id : nextOrdersState[nextOrdersState.length - 1].id;
        }
         if (!details.leaveChangeAsCredit) {
             toast({
                title: "Venda Concluída!",
                description: `Venda de ${formatCurrency(newSale.totalAmount)} (${currentOrder.name}) registrada com sucesso.`,
                action: <CheckCircle className="text-green-500" />,
            });
         }
    }
    setOpenOrders(nextOrdersState);
    setCurrentOrderId(nextSelectedOrderId);
    setIsPaymentDialogOpen(false);
  };
  
  if (!isMounted) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Carregando comandas...</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-10 gap-4 h-[calc(100vh-100px)]">
      <div className="md:col-span-2 flex flex-col h-full">
        <Card className="flex-grow flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Comandas Abertas
              <Button size="sm" onClick={handleOpenCreateOrderDialog}>
                <PlusSquare className="mr-2 h-4 w-4" /> Nova
              </Button>
            </CardTitle>
            <CardDescription>
              {openOrders.length} comanda(s) em aberto.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow overflow-hidden p-0">
            <ScrollArea className="h-full p-2">
              {openOrders.length === 0 ? (
                <p className="text-muted-foreground text-center py-10">Nenhuma comanda aberta.</p>
              ) : (
                <div className="space-y-2">
                  {openOrders.map(order => (
                    <div
                      key={order.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectOrder(order.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          handleSelectOrder(order.id);
                        }
                      }}
                      className={cn(
                        buttonVariants({ variant: currentOrderId === order.id ? "secondary" : "outline" }),
                        "w-full justify-between h-auto py-2 px-3 cursor-pointer"
                      )}
                    >
                      <div className="flex flex-col items-start text-left">
                        <span className="font-semibold truncate block max-w-full">{order.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {order.items.length} item(s) - {formatCurrency(order.items.reduce((acc, item) => acc + item.price * item.quantity, 0))}
                        </span>
                      </div>
                       <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10 shrink-0" onClick={(e) => { e.stopPropagation(); confirmDeleteOrder(order);}}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <div className="md:col-span-4 flex flex-col h-full">
        <Card className="flex-grow flex flex-col">
          <CardHeader>
            <CardTitle>Selecionar Produtos</CardTitle>
            <div className="flex items-center gap-2 pt-2">
              <Search className="h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
                disabled={!currentOrderId}
              />
              <div className="ml-auto flex items-center gap-2">
                <Button variant={viewMode === 'grid' ? 'secondary' : 'outline'} size="icon" onClick={() => setViewMode('grid')} disabled={!currentOrderId}>
                  <LayoutGrid className="h-5 w-5" />
                </Button>
                <Button variant={viewMode === 'list' ? 'secondary' : 'outline'} size="icon" onClick={() => setViewMode('list')} disabled={!currentOrderId}>
                  <List className="h-5 w-5" />
                </Button>
              </div>
            </div>
             {!currentOrderId && openOrders.length > 0 && <CardDescription className="text-destructive pt-2">Selecione uma comanda para adicionar produtos.</CardDescription>}
             {!currentOrderId && openOrders.length === 0 && <CardDescription className="text-destructive pt-2">Crie uma nova comanda para começar.</CardDescription>}
          </CardHeader>
           <Tabs value={activeDisplayCategory} onValueChange={setActiveDisplayCategory} className="flex-grow flex flex-col overflow-hidden">
            <ScrollArea className="w-full shrink-0">
                <TabsList>
                    <TabsTrigger value="Todos" disabled={!currentOrderId}>Todos</TabsTrigger>
                    {displayCategories.map(categoryName => (
                        <TabsTrigger key={categoryName} value={categoryName} disabled={!currentOrderId}>{categoryName}</TabsTrigger>
                    ))}
                </TabsList>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
            <ScrollArea className="flex-grow p-4">
              {currentOrderId ? (
                <>
                  <TabsContent value="Todos" className="mt-0">
                    <ProductDisplay products={filteredProducts} productCategories={productCategories} addToOrder={addToOrder} viewMode={viewMode} />
                  </TabsContent>
                  {displayCategories.map(categoryName => (
                    <TabsContent key={categoryName} value={categoryName} className="mt-0">
                      <ProductDisplay products={productsByCategoryDisplay[categoryName]} productCategories={productCategories} addToOrder={addToOrder} viewMode={viewMode} />
                    </TabsContent>
                  ))}
                </>
              ) : (
                 <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <FileText className="h-16 w-16 mb-4" />
                    <p>Selecione ou crie uma comanda</p>
                    <p>para visualizar os produtos.</p>
                </div>
              )}
            </ScrollArea>
          </Tabs>
        </Card>
      </div>

      <div className="md:col-span-4 flex flex-col h-full">
        <Card className="flex-grow flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-6 w-6 text-primary" />
              {currentOrder ? currentOrder.name : "Comanda"}
            </CardTitle>
            <CardDescription>
              {currentOrderItems.length} {currentOrderItems.length === 1 ? 'item' : 'itens'} na comanda.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow overflow-hidden p-0">
            <ScrollArea className="h-full p-4">
              {!currentOrderId ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <ShoppingCart className="h-16 w-16 mb-4 opacity-50" />
                    <p>Nenhuma comanda selecionada.</p>
                 </div>
              ) : currentOrderItems.length === 0 ? (
                <p className="text-muted-foreground text-center py-10">Nenhum item nesta comanda.</p>
              ) : (
                <ul className="space-y-2">
                  {currentOrderItems.map(item => {
                    const IconComponent = item.categoryIconName ? (LUCIDE_ICON_MAP[item.categoryIconName] || Package) : Package;
                    return (
                      <li key={item.id} className="flex items-center gap-2 p-1.5 rounded-md border">
                        <div className="flex-shrink-0">
                          <IconComponent className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="flex-grow">
                          <p className="font-medium truncate text-xs">{item.name}</p>
                          <p className="text-[11px] text-muted-foreground">{formatCurrency(item.price)}</p>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateQuantity(item.id, item.quantity - 1)} disabled={item.price < 0}>
                            <MinusCircle className="h-4 w-4" />
                          </Button>
                          <span className="w-5 text-center text-sm">{item.quantity}</span>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateQuantity(item.id, item.quantity + 1)} disabled={item.price < 0}>
                            <PlusCircle className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive/80 h-7 w-7" onClick={() => removeFromOrder(item.id)} disabled={item.price < 0}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="font-semibold w-20 text-right text-sm">{formatCurrency(item.price * item.quantity)}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ScrollArea>
          </CardContent>
          <Separator />
          <CardFooter className="flex flex-col gap-3 p-4">
            <div className="w-full flex justify-between text-lg font-semibold">
              <span>Total:</span>
              <span>{formatCurrency(orderTotal)}</span>
            </div>
            <Button
              size="lg"
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
              disabled={orderTotal === 0 || !currentOrderId}
              onClick={() => setIsPaymentDialogOpen(true)}
            >
              Realizar Pagamento
            </Button>
          </CardFooter>
        </Card>
      </div>

      <CreateOrderDialog
        isOpen={isCreateOrderDialogOpen}
        onOpenChange={setIsCreateOrderDialogOpen}
        onSubmit={handleCreateNewOrder}
      />

      <PaymentDialog
        isOpen={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        totalAmount={orderTotal}
        onSubmit={handlePayment}
        allowCredit={true}
        allowPartialPayment={true}
      />

      {orderToDelete && (
        <AlertDialog open={!!orderToDelete} onOpenChange={() => setOrderToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover a comanda "{orderToDelete.name}"? Todos os itens serão perdidos. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setOrderToDelete(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteOrder}
                className="bg-destructive hover:bg-destructive/90"
              >
                Remover Comanda
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

interface ProductDisplayProps {
  products: Product[];
  productCategories: ProductCategory[];
  addToOrder: (product: Product) => void;
  viewMode: 'grid' | 'list';
}

function ProductDisplay({ products, productCategories, addToOrder, viewMode }: ProductDisplayProps) {
  if (products.length === 0) {
    return <p className="text-muted-foreground text-center py-10">Nenhum produto encontrado.</p>;
  }
  
  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-2">
        {products.map(product => {
          const category = productCategories.find(c => c.id === product.categoryId);
          const IconComponent = category ? (LUCIDE_ICON_MAP[category.iconName] || Package) : Package;
          return (
            <Card key={product.id} className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group" onClick={() => addToOrder(product)}>
              <div className="aspect-square bg-muted flex items-center justify-center p-2 group-hover:bg-muted/80 transition-colors">
                <IconComponent className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <CardContent className="p-1.5 sm:p-2">
                <h3 className="font-medium truncate text-xs">{product.name}</h3>
                <p className="text-primary font-semibold text-sm">{formatCurrency(product.price)}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {products.map(product => {
        const category = productCategories.find(c => c.id === product.categoryId);
        const IconComponent = category ? (LUCIDE_ICON_MAP[category.iconName] || Package) : Package;
        const categoryName = category ? category.name : "Desconhecida";
        return (
          <Card key={product.id} className="flex items-center p-3 cursor-pointer hover:bg-muted/50 transition-colors group" onClick={() => addToOrder(product)}>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-muted rounded-md flex items-center justify-center mr-3 group-hover:bg-muted/80 transition-colors">
              <IconComponent className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="flex-grow">
              <h3 className="font-medium text-sm sm:text-base">{product.name}</h3>
              <p className="text-xs text-muted-foreground">{categoryName}</p>
            </div>
            <p className="text-primary font-semibold text-sm sm:text-base">{formatCurrency(product.price)}</p>
          </Card>
        );
      })}
    </div>
  );
}
