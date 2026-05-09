"use client";

import { useEffect, useMemo, useState } from 'react';
import type { Product, ProductCategory } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MenuSquare, QrCode as QrCodeIcon, Package, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';
import { getCompanyDetails } from '@/lib/data-access';
import QRCodeDisplay from '@/app/qrcode/components/qrcode-display';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/constants';

export default function DigitalMenuClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
  const companyDetails = getCompanyDetails();

  useEffect(() => {
    // Carrega dados do localStorage (app-state)
    try {
      const productsJson = localStorage.getItem('barmate_products_v2');
      const categoriesJson = localStorage.getItem('barmate_productCategories_v2');

      if (productsJson) {
        const parsed = JSON.parse(productsJson);
        setProducts(Array.isArray(parsed) ? parsed : []);
      }

      if (categoriesJson) {
        const parsed = JSON.parse(categoriesJson);
        setCategories(Array.isArray(parsed) ? parsed : []);
      }
    } catch (error) {
      console.error('Erro ao carregar cardápio do localStorage:', error);
    }
  }, []);

  const productsByCategory = useMemo(() => {
    const map: Record<string, Product[]> = {};
    products.forEach((product) => {
      const catId = product.categoryId || 'sem-categoria';
      if (!map[catId]) map[catId] = [];
      map[catId].push(product);
    });
    return map;
  }, [products]);

  const getCategoryName = (categoryId: string) => {
    const cat = categories.find((c) => c.id === categoryId);
    return cat?.name || 'Sem Categoria';
  };

  const totalProducts = products.length;
  const totalCategories = categories.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase flex items-center gap-2">
            <MenuSquare className="h-8 w-8 text-primary" />
            Cardápio Digital
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie o cardápio online para seus clientes
          </p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto flex-wrap">
          <Button onClick={() => setIsQrDialogOpen(true)} variant="default" className="flex-1 sm:flex-none">
            <QrCodeIcon className="mr-2 h-4 w-4" />
            Gerar QR Code
          </Button>
          <Button asChild variant="outline" className="flex-1 sm:flex-none">
            <Link href="/products">
              <Package className="mr-2 h-4 w-4" />
              Editar Produtos
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-200 dark:border-blue-900">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground uppercase font-semibold">Produtos</p>
              <p className="text-3xl font-black text-primary">{totalProducts}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-200 dark:border-green-900">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground uppercase font-semibold">Categorias</p>
              <p className="text-3xl font-black text-green-600">{totalCategories}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-200 dark:border-purple-900 col-span-2 sm:col-span-1">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground uppercase font-semibold">Status</p>
              <Badge className="mt-2 bg-green-600">Ativo</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QR Code - Cardápio Digital</DialogTitle>
            <DialogDescription>
              Compartilhe este QR Code com seus clientes para acessarem o cardápio
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-6 bg-muted/30 rounded-lg">
            <QRCodeDisplay />
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview do Cardápio */}
      <Card className="border-t-4 border-t-primary shadow-lg">
        <CardHeader className="bg-muted/30">
          <CardTitle className="flex items-center gap-2">
            <MenuSquare className="h-5 w-5" />
            Preview do Cardápio para o Cliente
          </CardTitle>
          <CardDescription>
            Veja como seus clientes verão o cardápio quando acessarem via QR Code
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          {totalProducts === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground font-semibold">Nenhum produto cadastrado ainda</p>
              <Button asChild variant="outline" className="mt-4">
                <Link href="/products">Adicionar Produtos</Link>
              </Button>
            </div>
          ) : (
            <Tabs defaultValue={Object.keys(productsByCategory)[0] || ''} className="w-full">
              <TabsList className="grid w-full grid-cols-auto gap-2 mb-6 bg-muted/50 p-1 rounded-lg overflow-auto">
                {categories.length > 0 ? (
                  categories.map((category) => (
                    <TabsTrigger
                      key={category.id}
                      value={category.id}
                      className="whitespace-nowrap text-xs sm:text-sm"
                    >
                      {category.name}
                    </TabsTrigger>
                  ))
                ) : (
                  Object.keys(productsByCategory).map((catId) => (
                    <TabsTrigger
                      key={catId}
                      value={catId}
                      className="whitespace-nowrap text-xs sm:text-sm"
                    >
                      {getCategoryName(catId)}
                    </TabsTrigger>
                  ))
                )}
              </TabsList>

              {categories.length > 0 ? (
                categories.map((category) => (
                  <TabsContent key={category.id} value={category.id} className="space-y-4">
                    {productsByCategory[category.id]?.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        Nenhum produto nesta categoria
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {productsByCategory[category.id]?.map((product) => (
                          <Card
                            key={product.id}
                            className="overflow-hidden hover:shadow-md transition-shadow"
                          >
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start gap-2 mb-2">
                                <div className="min-w-0 flex-1">
                                  <h3 className="font-bold text-sm uppercase leading-tight">
                                    {product.name}
                                  </h3>
                                </div>
                                {product.available === false && (
                                  <Badge variant="destructive" className="text-xs whitespace-nowrap">
                                    Indisponível
                                  </Badge>
                                )}
                              </div>

                              {product.description && (
                                <p className="text-xs text-muted-foreground mb-3">
                                  {product.description}
                                </p>
                              )}

                              <div className="flex justify-between items-center">
                                <span className="text-sm font-black text-primary">
                                  {formatCurrency(product.price)}
                                </span>
                                {product.preparationTime && (
                                  <Badge variant="outline" className="text-xs">
                                    {product.preparationTime} min
                                  </Badge>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                ))
              ) : (
                Object.entries(productsByCategory).map(([catId, prods]) => (
                  <TabsContent key={catId} value={catId} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {prods.map((product) => (
                        <Card
                          key={product.id}
                          className="overflow-hidden hover:shadow-md transition-shadow"
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start gap-2 mb-2">
                              <div className="min-w-0 flex-1">
                                <h3 className="font-bold text-sm uppercase leading-tight">
                                  {product.name}
                                </h3>
                              </div>
                              {product.available === false && (
                                <Badge variant="destructive" className="text-xs whitespace-nowrap">
                                  Indisponível
                                </Badge>
                              )}
                            </div>

                            {product.description && (
                              <p className="text-xs text-muted-foreground mb-3">
                                {product.description}
                              </p>
                            )}

                            <div className="flex justify-between items-center">
                              <span className="text-sm font-black text-primary">
                                {formatCurrency(product.price)}
                              </span>
                              {product.preparationTime && (
                                <Badge variant="outline" className="text-xs">
                                  {product.preparationTime} min
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                ))
              )}
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Acesso Rápido */}
      <Card className="bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Acesso Rápido
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button asChild variant="outline" className="justify-start">
              <Link href="/qrcode">
                <QrCodeIcon className="mr-2 h-4 w-4" />
                QR Code Geral
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/products">
                <Package className="mr-2 h-4 w-4" />
                Gerenciar Produtos
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/orders">
                <MenuSquare className="mr-2 h-4 w-4" />
                Comandas Abertas
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/pedidos">
                <MenuSquare className="mr-2 h-4 w-4" />
                Pedidos Cozinha
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
