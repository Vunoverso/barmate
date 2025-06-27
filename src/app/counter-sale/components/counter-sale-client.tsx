
"use client";

import type { Product, OrderItem, Sale, ProductCategory, PaymentMethod } from '@/types';
import { getProducts, formatCurrency, getProductCategories, LUCIDE_ICON_MAP, addSale } from '@/lib/constants';
import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, MinusCircle, Trash2, Search, LayoutGrid, List, CheckCircle, ShoppingCart, Package } from 'lucide-react';
import Image from 'next/image';
import PaymentDialog from '@/app/orders/components/payment-dialog'; 
import { useToast } from '@/hooks/use-toast';

const LOCAL_STORAGE_COUNTER_SALE_KEY = 'barmate_counterSaleOrderItems';

// Group products by category
const groupProductsByCategoryId = (products: Product[], categories: ProductCategory[]) => {
  return products.reduce((acc, product) => {
    const category = categories.find(c => c.id === product.categoryId);
    const categoryName = category ? category.name : 'Outros'; // Fallback category name
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
  const [isMounted, setIsMounted] = useState(false);
  const [activeDisplayCategory, setActiveDisplayCategory] = useState<string>('Todos');

  useEffect(() => {
    setIsMounted(true);
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
     
    const handleProductsChange = () => setProducts(getProducts());
    const handleCategoriesChange = () => setProductCategories(getProductCategories());

    window.addEventListener('productsChanged', handleProductsChange);
    window.addEventListener('productCategoriesChanged', handleCategoriesChange);

    return () => {
      window.removeEventListener('productsChanged', handleProductsChange);
      window.removeEventListener('productCategoriesChanged', handleCategoriesChange);
    };
  }, []);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem(LOCAL_STORAGE_COUNTER_SALE_KEY, JSON.stringify(currentOrderItems));
    }
  }, [currentOrderItems, isMounted]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [products, searchTerm]);
  
  const productsByCategoryDisplay = useMemo(() => groupProductsByCategoryId(filteredProducts, productCategories), [filteredProducts, productCategories]);
  const displayCategories = useMemo(() => Object.keys(productsByCategoryDisplay).sort(), [productsByCategoryDisplay]);

  // Effect to select the first category when they are loaded
  useEffect(() => {
    if (displayCategories.length > 0 && activeDisplayCategory === 'Todos') {
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

  const handlePayment = (details: { paymentMethod: PaymentMethod; amountPaid?: number; changeGiven?: number; discountAmount: number; status: 'completed' }) => {
    const finalTotal = orderTotal - details.discountAmount;
    const newSale: Sale = {
      id: `csale-${Date.now()}`,
      items: currentOrderItems,
      originalAmount: orderTotal,
      discountAmount: details.discountAmount,
      totalAmount: finalTotal,
      timestamp: new Date(),
      paymentMethod: details.paymentMethod,
      amountPaid: details.amountPaid,
      changeGiven: details.changeGiven,
      status: 'completed',
    };
    
    addSale(newSale);
    
    setCurrentOrderItems([]); 
    if (isMounted) {
      localStorage.removeItem(LOCAL_STORAGE_COUNTER_SALE_KEY);
    }
    setIsPaymentDialogOpen(false);
    toast({
      title: "Venda Balcão Concluída!",
      description: `Venda de ${formatCurrency(newSale.totalAmount)} registrada com sucesso.`,
      action: <CheckCircle className="text-green-500" />,
    });
  };

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Carregando venda balcão...</p>
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
            <ScrollArea className="w-full shrink-0">
                <TabsList>
                  <TabsTrigger value="Todos">Todos</TabsTrigger>
                  {displayCategories.map(categoryName => (
                    <TabsTrigger key={categoryName} value={categoryName}>{categoryName}</TabsTrigger>
                  ))}
                </TabsList>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
            <ScrollArea className="flex-grow p-4">
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
                <ul className="space-y-3">
                  {currentOrderItems.map(item => {
                    const IconComponent = item.categoryIconName ? (LUCIDE_ICON_MAP[item.categoryIconName] || Package) : Package;
                    return (
                      <li key={item.id} className="flex items-center gap-3 p-2 rounded-md border">
                        <div className="flex-shrink-0">
                          <IconComponent className="h-8 w-8 text-muted-foreground" />
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
        onSubmit={handlePayment}
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"> 
        {products.map(product => {
          const category = productCategories.find(c => c.id === product.categoryId);
          const IconComponent = category ? (LUCIDE_ICON_MAP[category.iconName] || Package) : Package;
          return (
            <Card key={product.id} className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group" onClick={() => addToOrder(product)}>
              <div className="aspect-square bg-muted flex items-center justify-center p-2 group-hover:bg-muted/80 transition-colors">
                <IconComponent className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <CardContent className="p-2">
                <h3 className="font-medium truncate text-xs sm:text-sm">{product.name}</h3>
                <p className="text-primary font-semibold text-sm sm:text-base">{formatCurrency(product.price)}</p>
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
            <p className="text-primary font-semibold text-md sm:text-lg">{formatCurrency(product.price)}</p>
          </Card>
        );
      })}
    </div>
  );
}
