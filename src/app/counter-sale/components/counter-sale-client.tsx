
"use client";

import type { Product, OrderItem, Sale, ProductCategory, Payment } from '@/types';
import { getProducts, formatCurrency, getProductCategories, LUCIDE_ICON_MAP, addSale } from '@/lib/constants';
import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, MinusCircle, Trash2, Search, LayoutGrid, List, CheckCircle, ShoppingCart, Package } from 'lucide-react';
import PaymentDialog from '@/app/orders/components/payment-dialog'; 
import { useToast } from '@/hooks/use-toast';

const LOCAL_STORAGE_COUNTER_SALE_KEY = 'barmate_counterSaleOrderItems_v2';

const groupProductsByCategoryId = (products: Product[], categories: ProductCategory[]) => {
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

export default function CounterSaleClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [currentOrderItems, setCurrentOrderItems] = useState<OrderItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [activeDisplayCategory, setActiveDisplayCategory] = useState<string>('Todos');

  const loadInitialData = () => {
    setIsLoading(true);
    setProducts(getProducts());
    setProductCategories(getProductCategories());
    const storedOrderItems = localStorage.getItem(LOCAL_STORAGE_COUNTER_SALE_KEY);
    if (storedOrderItems) {
      try {
        setCurrentOrderItems(JSON.parse(storedOrderItems));
      } catch (error) {
        console.error("Failed to parse counter sale items from localStorage", error);
        localStorage.removeItem(LOCAL_STORAGE_COUNTER_SALE_KEY);
      }
    }
    setIsLoading(false);
  };
  
  useEffect(() => {
    loadInitialData();

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'barmate_products_v2' || event.key === 'barmate_productCategories_v2' || event.key === LOCAL_STORAGE_COUNTER_SALE_KEY) {
        loadInitialData();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_COUNTER_SALE_KEY, JSON.stringify(currentOrderItems));
  }, [currentOrderItems]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [products, searchTerm]);
  
  const productsByCategoryDisplay = useMemo(() => groupProductsByCategoryId(filteredProducts, productCategories), [filteredProducts, productCategories]);
  const displayCategories = useMemo(() => {
    if (!productCategories.length) return [];
    const categoryOrder = productCategories.map(c => c.name);
    return Object.keys(productsByCategoryDisplay).sort((a, b) => {
        const indexA = categoryOrder.indexOf(a);
        const indexB = categoryOrder.indexOf(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });
  }, [productsByCategoryDisplay, productCategories]);


  useEffect(() => {
    if (displayCategories.length > 0 && !displayCategories.includes(activeDisplayCategory)) {
        setActiveDisplayCategory(displayCategories[0]);
    }
  }, [displayCategories, activeDisplayCategory]);


  const addToOrder = (product: Product) => {
    setCurrentOrderItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === product.id);
      if (existingItem) {
        return prevItems.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      const category = productCategories.find(c => c.id === product.categoryId);
      return [...prevItems, { 
        ...product, 
        quantity: 1, 
        categoryName: category?.name, 
        categoryIconName: category?.iconName 
      }];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setCurrentOrderItems(prevItems => {
      if (quantity <= 0) {
        return prevItems.filter(item => item.id !== productId);
      }
      return prevItems.map(item =>
        item.id === productId ? { ...item, quantity } : item
      );
    });
  };

  const removeFromOrder = (productId: string) => {
    setCurrentOrderItems(prevItems => prevItems.filter(item => item.id !== productId));
  };

  const orderTotal = useMemo(() => {
    return currentOrderItems.reduce((total, item) => total + item.price * item.quantity, 0);
  }, [currentOrderItems]);

  const handlePayment = (details: { payments: Payment[]; changeGiven: number; discountAmount: number; status: 'completed', leaveChangeAsCredit: boolean, cashTendered?: number; }) => {
    const finalTotal = orderTotal - details.discountAmount;
    
    addSale({
      id: `countersale-${Date.now()}`,
      name: 'Venda Balcão',
      items: currentOrderItems,
      originalAmount: orderTotal,
      discountAmount: details.discountAmount,
      totalAmount: finalTotal,
      payments: details.payments,
      changeGiven: details.changeGiven,
      status: 'completed',
      cashTendered: details.cashTendered,
      leaveChangeAsCredit: details.leaveChangeAsCredit && details.changeGiven > 0,
    });
    
    setCurrentOrderItems([]); 
    localStorage.removeItem(LOCAL_STORAGE_COUNTER_SALE_KEY);
    setIsPaymentDialogOpen(false); // Close dialog after successful submission from it
    toast({
      title: "Venda Balcão Concluída!",
      description: `Venda de ${formatCurrency(finalTotal)} registrada com sucesso.`,
      action: <CheckCircle className="text-green-500" />,
    });
  };
  
  const currentCounterOrder: Sale | undefined = useMemo(() => {
    if (currentOrderItems.length === 0) return undefined;
    return {
        id: `countersale-${Date.now()}`,
        name: 'Venda Balcão',
        items: currentOrderItems,
        totalAmount: orderTotal,
        // Fill other required fields for the type, even if they are temporary
        timestamp: new Date(),
        payments: [],
        originalAmount: orderTotal,
        discountAmount: 0,
        status: 'pending',
    } as any;
  }, [currentOrderItems, orderTotal]);


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Carregando produtos...</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-3 gap-4 h-[calc(100vh-100px)]">
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
              />
              <div className="ml-auto flex items-center gap-2">
                <Button variant={viewMode === 'grid' ? 'secondary' : 'outline'} size="icon" onClick={() => setViewMode('grid')}>
                  <LayoutGrid className="h-5 w-5" />
                </Button>
                <Button variant={viewMode === 'list' ? 'secondary' : 'outline'} size="icon" onClick={() => setViewMode('list')}>
                  <List className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <Tabs value={activeDisplayCategory} onValueChange={setActiveDisplayCategory} className="flex-grow flex flex-col overflow-hidden">
            <div className="w-full overflow-x-auto pb-2 px-4">
                <TabsList className="whitespace-nowrap">
                  {displayCategories.map(categoryName => (
                    <TabsTrigger key={categoryName} value={categoryName}>{categoryName}</TabsTrigger>
                  ))}
                </TabsList>
            </div>
            <ScrollArea className="flex-grow p-4">
                {displayCategories.map(categoryName => (
                  <TabsContent key={categoryName} value={categoryName} className="mt-0">
                    <ProductDisplay products={productsByCategoryDisplay[categoryName] || []} productCategories={productCategories} addToOrder={addToOrder} viewMode={viewMode} />
                  </TabsContent>
                ))}
            </ScrollArea>
          </Tabs>
        </Card>
      </div>

      <div className="md:col-span-1 flex flex-col h-full">
        <Card className="flex-grow flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-6 w-6 text-primary" />
              Venda Atual
            </CardTitle>
            <CardDescription>
              {currentOrderItems.length} {currentOrderItems.length === 1 ? 'item' : 'itens'} na venda.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow overflow-hidden p-0">
            <ScrollArea className="h-full p-4">
              {currentOrderItems.length === 0 ? (
                <p className="text-muted-foreground text-center py-10">Adicione produtos à venda.</p>
              ) : (
                <ul className="space-y-2">
                  {currentOrderItems.map(item => {
                    const IconComponent = item.categoryIconName ? (LUCIDE_ICON_MAP[item.categoryIconName] || Package) : Package;
                    return (
                      <li key={item.id} className="flex items-center gap-2 p-1.5 rounded-md border">
                        <div className="flex-shrink-0">
                          <IconComponent className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="flex-grow min-w-0">
                          <p className="font-medium truncate text-xs">{item.name}</p>
                          <p className="text-[11px] text-muted-foreground">{formatCurrency(item.price)}</p>
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                            <MinusCircle className="h-4 w-4" />
                          </Button>
                          <span className="w-5 text-center text-sm">{item.quantity}</span>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                            <PlusCircle className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive/80 h-7 w-7" onClick={() => removeFromOrder(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="font-semibold w-16 text-right text-sm flex-shrink-0">{formatCurrency(item.price * item.quantity)}</p>
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
              disabled={currentOrderItems.length === 0}
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
        currentOrder={currentCounterOrder}
        onSubmit={handlePayment as any}
        allowPartialPayment={false}
      />
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
  }

  return (
    <div className="space-y-1">
      {products.map(product => {
         const category = productCategories.find(c => c.id === product.categoryId);
         const IconComponent = category ? (LUCIDE_ICON_MAP[category.iconName] || Package) : Package;
         const categoryName = category ? category.name : "Desconhecida";
        return (
          <Card key={product.id} className="flex items-center p-1.5 cursor-pointer hover:bg-muted/50 transition-colors group" onClick={() => addToOrder(product)}>
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-muted rounded-md flex items-center justify-center mr-2 group-hover:bg-muted/80 transition-colors">
              <IconComponent className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="flex-grow">
              <h3 className="font-medium text-xs sm:text-sm">{product.name}</h3>
              <p className="text-xs text-muted-foreground">{categoryName}</p>
            </div>
            <p className="text-primary font-semibold text-sm sm:text-base">{formatCurrency(product.price)}</p>
          </Card>
        );
      })}
    </div>
  );
}
