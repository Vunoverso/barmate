
"use client";

import type { Product, ProductCategory } from '@/types';
import { getProducts, saveProducts, formatCurrency, getProductCategories, LUCIDE_ICON_MAP } from '@/lib/constants';
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PlusCircle, Edit3, Trash2, Search, Filter, Package } from 'lucide-react';
import AddProductDialog from './add-product-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"


export default function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>(''); // Stores categoryId
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const [fetchedProducts, fetchedCategories] = await Promise.all([getProducts(), getProductCategories()]);
      setProducts(fetchedProducts);
      setProductCategories(fetchedCategories);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const handleAddProduct = async (product: Product) => {
    const newProduct = { ...product, id: `prod-${Date.now()}` };
    const updatedProducts = [...products, newProduct];
    await saveProducts(updatedProducts);
    setProducts(updatedProducts);
    toast({ title: "Produto Adicionado", description: `${product.name} foi adicionado com sucesso.` });
  };

  const handleEditProduct = async (updatedProduct: Product) => {
    const updatedProducts = products.map(p => p.id === updatedProduct.id ? updatedProduct : p);
    await saveProducts(updatedProducts);
    setProducts(updatedProducts);
    toast({ title: "Produto Atualizado", description: `${updatedProduct.name} foi atualizado com sucesso.` });
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingProduct(null);
    setIsDialogOpen(true);
  };
  
  const handleDeleteProduct = async (productId: string) => {
    const productName = products.find(p => p.id === productId)?.name;
    const updatedProducts = products.filter(p => p.id !== productId);
    await saveProducts(updatedProducts);
    setProducts(updatedProducts);
    setProductToDelete(null); 
    if (productName) {
      toast({ title: "Produto Removido", description: `${productName} foi removido.`, variant: "destructive" });
    }
  };

  const filteredProducts = useMemo(() => {
    return products
    .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(p => categoryFilter ? p.categoryId === categoryFilter : true);
  }, [products, searchTerm, categoryFilter]);

  const getCategoryNameById = (categoryId: string) => {
    return productCategories.find(cat => cat.id === categoryId)?.name || categoryId;
  };

  if (isLoading) {
    return <p>Carregando produtos...</p>;
  }

  return (
    <>
      <div className="flex items-center gap-4 mb-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-1">
              <Filter className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                {categoryFilter ? getCategoryNameById(categoryFilter) : "Categoria"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Filtrar por Categoria</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setCategoryFilter('')}>Todas</DropdownMenuItem>
            {productCategories.map(cat => (
              <DropdownMenuItem key={cat.id} onClick={() => setCategoryFilter(cat.id)}>
                {cat.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button onClick={openAddDialog} className="ml-auto">
          <PlusCircle className="mr-2 h-5 w-5" /> Adicionar Produto
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Produtos</CardTitle>
          <CardDescription>
            Gerencie os produtos do seu estabelecimento. Total de {filteredProducts.length} produtos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden w-[100px] sm:table-cell">
                  Ícone
                </TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="hidden md:table-cell">Estoque</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>
                  <span className="sr-only">Ações</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length > 0 ? filteredProducts.map(product => {
                const category = productCategories.find(c => c.id === product.categoryId);
                const IconComponent = category ? (LUCIDE_ICON_MAP[category.iconName] || Package) : Package;
                return (
                  <TableRow key={product.id}>
                    <TableCell className="hidden sm:table-cell">
                      <IconComponent className="h-8 w-8 text-muted-foreground" />
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{category ? category.name : 'Desconhecida'}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{product.stock ?? 'N/A'}</TableCell>
                    <TableCell>{formatCurrency(product.price)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => openEditDialog(product)}>
                            <Edit3 className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setProductToDelete(product)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Remover
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Nenhum produto encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Mostrando <strong>{filteredProducts.length}</strong> de <strong>{products.length}</strong> produtos.
          </div>
        </CardFooter>
      </Card>

      <AddProductDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        product={editingProduct}
        onSave={editingProduct ? handleEditProduct : handleAddProduct}
      />

      {productToDelete && (
        <AlertDialog open={!!productToDelete} onOpenChange={() => setProductToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover o produto "{productToDelete.name}"? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setProductToDelete(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleDeleteProduct(productToDelete.id)}
                className="bg-destructive hover:bg-destructive/90"
              >
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

    