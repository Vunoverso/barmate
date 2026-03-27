
"use client";

import type { Product, OrderItem, Sale, ActiveOrder } from '@/types';
import { INITIAL_PRODUCTS, formatCurrency } from '@/lib/constants';
import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, MinusCircle, Trash2, Search, LayoutGrid, List, CheckCircle, ShoppingCart, PlusSquare, FileText, XCircle } from 'lucide-react';
import NextImage from 'next/image';
import PaymentDialog from './payment-dialog';
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

// Group products by category
const groupProductsByCategory = (products: Product[]) => {
  return products.reduce((acc, product) => {
    const category = product.categoryId || 'Outros';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(product);
    return acc;
  }, {} as Record<string, Product[]>);
};


export default function POSClient() {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [openOrders, setOpenOrders] = useState<ActiveOrder[]>([]);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [nextOrderNumber, setNextOrderNumber] = useState<number>(1);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<ActiveOrder | null>(null);
  const { toast } = useToast();

  const currentOrder = useMemo(() => {
    return openOrders.find(o => o.id === currentOrderId);
  }, [openOrders, currentOrderId]);

  const currentOrderItems = useMemo(() => {
    return currentOrder?.items || [];
  }, [currentOrder]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [products, searchTerm]);
  
  const productsByCategory = useMemo(() => groupProductsByCategory(filteredProducts), [filteredProducts]);
  const categories = useMemo(() => Object.keys(productsByCategory), [productsByCategory]);
  const [activeCategory, setActiveCategory] = useState<string>(categories[0] || 'Todos');

  useEffect(() => {
    if (categories.length > 0 && !categories.includes(activeCategory)) {
      setActiveCategory(categories[0] || 'Todos');
    }
  }, [categories, activeCategory]);

  const handleCreateNewOrder = () => {
    const newOrderId = `order-${Date.now()}-${nextOrderNumber}`;
    const newOrder: ActiveOrder = {
      id: newOrderId,
      name: `Comanda ${nextOrderNumber}`,
      items: [],
      createdAt: new Date(),
    };
    setOpenOrders(prev => [...prev, newOrder]);
    setCurrentOrderId(newOrderId);
    setNextOrderNumber(prev => prev + 1);
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
        if (updatedOrders.length > 0) {
          setCurrentOrderId(updatedOrders[0].id);
        } else {
          setCurrentOrderId(null);
        }
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
          return { ...order, items: [...order.items, { ...product, quantity: 1 } as OrderItem] };
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

  const handlePayment = (saleDetails: Omit<Sale, 'id' | 'timestamp' | 'items' | 'totalAmount'| 'originalAmount' | 'discountAmount'>) => {
    if (!currentOrder) {
      toast({ title: "Erro", description: "Nenhuma comanda selecionada para pagamento.", variant: "destructive"});
      return;
    }
    
    const newSale: Sale = {
      id: `sale-${Date.now()}`,
      items: currentOrderItems,
      totalAmount: orderTotal,
      originalAmount: orderTotal,
      discountAmount: 0,
      timestamp: new Date(),
      ...saleDetails,
    };
    console.log('New Sale:', newSale);
    // Add to sales log (if implemented)
    
    setOpenOrders(prevOrders => {
      const updatedOpenOrders = prevOrders.filter(order => order.id !== currentOrderId);
      if (updatedOpenOrders.length > 0) {
        const currentIndex = prevOrders.findIndex(o => o.id === currentOrderId);
        let nextSelectedOrderId: string | null = null;
        if (prevOrders.length === 1) { // Only one order, and it's being closed
           nextSelectedOrderId = null;
        } else if (currentIndex >= 0 && updatedOpenOrders.length > 0) {
           if (currentIndex < updatedOpenOrders.length) {
             nextSelectedOrderId = updatedOpenOrders[currentIndex].id; // Try selecting order at same index
           } else {
             nextSelectedOrderId = updatedOpenOrders[updatedOpenOrders.length - 1].id; // Select last order
           }
        } else if (updatedOpenOrders.length > 0) {
           nextSelectedOrderId = updatedOpenOrders[0].id; // Default to first if no specific logic met
        }
        setCurrentOrderId(nextSelectedOrderId);
      } else {
        setCurrentOrderId(null);
      }
      return updatedOpenOrders;
    });

    setIsPaymentDialogOpen(false);
    toast({
      title: "Venda Concluída!",
      description: `Venda de ${formatCurrency(newSale.totalAmount)} (${currentOrder.name}) registrada com sucesso.`,
      action: <CheckCircle className="text-green-500" />,
    });
  };

  return (
    <div className="grid md:grid-cols-4 gap-4 h-[calc(100vh-100px)]"> {/* Adjusted grid for 4 columns and height */}
      {/* Open Orders List Area */}
      <div className="md:col-span-1 flex flex-col h-full">
        <Card className="flex-grow flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Comandas Abertas
              <Button size="sm" onClick={handleCreateNewOrder}>
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
                    <Button
                      key={order.id}
                      variant={currentOrderId === order.id ? "secondary" : "outline"}
                      className="w-full justify-between h-auto py-2 px-3"
                      onClick={() => handleSelectOrder(order.id)}
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-semibold">{order.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {order.items.length} item(s) - {formatCurrency(order.items.reduce((acc, item) => acc + item.price * item.quantity, 0))}
                        </span>
                      </div>
                       <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); confirmDeleteOrder(order);}}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </Button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Product Selection Area */}
      <div className="md:col-span-2 flex flex-col h-full">
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
             {!currentOrderId && <CardDescription className="text-destructive pt-2">Selecione ou crie uma comanda para adicionar produtos.</CardDescription>}
          </CardHeader>
          <Tabs value={activeCategory} onValueChange={setActiveCategory} className="flex-grow flex flex-col overflow-hidden">
            <TabsList className="mx-4">
              <TabsTrigger value="Todos" disabled={!currentOrderId}>Todos</TabsTrigger>
              {categories.map(category => (
                <TabsTrigger key={category} value={category} disabled={!currentOrderId}>{category}</TabsTrigger>
              ))}
            </TabsList>
            <ScrollArea className="flex-grow p-4">
              {currentOrderId ? (
                <>
                  <TabsContent value="Todos" className="mt-0">
                    <ProductDisplay products={filteredProducts} addToOrder={addToOrder} viewMode={viewMode} />
                  </TabsContent>
                  {categories.map(category => (
                    <TabsContent key={category} value={category} className="mt-0">
                      <ProductDisplay products={productsByCategory[category]} addToOrder={addToOrder} viewMode={viewMode} />
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

      {/* Order Summary Area */}
      <div className="md:col-span-1 flex flex-col h-full">
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
                <ul className="space-y-3">
                  {currentOrderItems.map(item => (
                    <li key={item.id} className="flex items-center gap-3 p-2 rounded-md border">
                      <div className="flex-shrink-0">
                         <NextImage src={`https://placehold.co/64x64.png?text=${item.name.substring(0,2)}`} alt={item.name} width={32} height={32} data-ai-hint="product item" className="rounded-sm" />
                      </div>
                      <div className="flex-grow">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{formatCurrency(item.price)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                          <MinusCircle className="h-4 w-4" />
                        </Button>
                        <span className="w-6 text-center">{item.quantity}</span>
                        <Button size="icon" variant="ghost" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                          <PlusCircle className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive/80" onClick={() => removeFromOrder(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="font-semibold w-20 text-right">{formatCurrency(item.price * item.quantity)}</p>
                    </li>
                  ))}
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
              disabled={currentOrderItems.length === 0 || !currentOrderId}
              onClick={() => setIsPaymentDialogOpen(true)}
            >
              Finalizar Pagamento
            </Button>
          </CardFooter>
        </Card>
      </div>

      <PaymentDialog
        isOpen={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        totalAmount={orderTotal}
        onSubmit={handlePayment as any}
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
  addToOrder: (product: Product) => void;
  viewMode: 'grid' | 'list';
}

function ProductDisplay({ products, addToOrder, viewMode }: ProductDisplayProps) {
  if (products.length === 0) {
    return <p className="text-muted-foreground text-center py-10">Nenhum produto encontrado.</p>;
  }
  
  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"> {/* Adjusted grid for product selection column */}
        {products.map(product => (
          <Card key={product.id} className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group" onClick={() => addToOrder(product)}>
            <div className="aspect-square bg-muted flex items-center justify-center p-2 group-hover:bg-muted/80 transition-colors">
              
                <NextImage src={`https://placehold.co/100x100.png?text=${product.name.substring(0,2)}`} alt={product.name} width={80} height={80} data-ai-hint="product item" />
              
            </div>
            <CardContent className="p-2 sm:p-3">
              <h3 className="font-medium truncate text-xs sm:text-sm">{product.name}</h3>
              <p className="text-primary font-semibold text-sm sm:text-md">{formatCurrency(product.price)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {products.map(product => (
        <Card key={product.id} className="flex items-center p-3 cursor-pointer hover:bg-muted/50 transition-colors group" onClick={() => addToOrder(product)}>
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-muted rounded-md flex items-center justify-center mr-3 group-hover:bg-muted/80 transition-colors">
             
                <NextImage src={`https://placehold.co/48x48.png?text=${product.name.substring(0,2)}`} alt={product.name} width={32} height={32} data-ai-hint="product item" />
              
          </div>
          <div className="flex-grow">
            <h3 className="font-medium text-sm sm:text-base">{product.name}</h3>
            <p className="text-xs text-muted-foreground">{product.categoryId}</p>
          </div>
          <p className="text-primary font-semibold text-md sm:text-lg">{formatCurrency(product.price)}</p>
        </Card>
      ))}
    </div>
  );
}

    