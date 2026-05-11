
"use client";

import type { Product, ProductCategory } from '@/types';
import { getProducts, saveProducts, getProductCategories, saveProductCategories } from '@/lib/data-access';
import { formatCurrency, LUCIDE_ICON_MAP } from '@/lib/constants';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PlusCircle, Edit3, Trash2, Search, Filter, Package, Upload, Download } from 'lucide-react';
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
import { format } from 'date-fns';


export default function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>(''); // Stores categoryId
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isImporting, setIsImporting] = useState(false);
  const [importAlertOpen, setImportAlertOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();

  const fetchData = useCallback(() => {
    setIsLoading(true);
    setProducts(getProducts());
    setProductCategories(getProductCategories());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    window.addEventListener('storage', fetchData);
    window.addEventListener('barmate-app-state-changed', fetchData);
    return () => {
      window.removeEventListener('storage', fetchData);
      window.removeEventListener('barmate-app-state-changed', fetchData);
    };
  }, [fetchData]);

  const handleAddProduct = useCallback(async (product: Omit<Product, 'id'>) => {
    const newProduct = { ...product, id: `prod-${Date.now()}` };
    const updatedProducts = [...products, newProduct];
    await saveProducts(updatedProducts);
    toast({ title: "Produto Adicionado", description: `${product.name} foi adicionado com sucesso.` });
  }, [products, toast]);

  const handleEditProduct = useCallback(async (updatedProduct: Product) => {
    const updatedProducts = products.map(p => p.id === updatedProduct.id ? updatedProduct : p);
    await saveProducts(updatedProducts);
    toast({ title: "Produto Atualizado", description: `${updatedProduct.name} foi atualizado com sucesso.` });
  }, [products, toast]);

  const handleSaveProduct = useCallback(async (product: Omit<Product, 'id'> | Product) => {
    if ('id' in product) {
      await handleEditProduct(product);
      return;
    }

    await handleAddProduct(product);
  }, [handleAddProduct, handleEditProduct]);

  const openEditDialog = useCallback((product: Product) => {
    setEditingProduct(product);
    setIsDialogOpen(true);
  }, []);

  const openAddDialog = useCallback(() => {
    setEditingProduct(null);
    setIsDialogOpen(true);
  }, []);
  
  const handleDeleteProduct = useCallback(async (productId: string) => {
    const productName = products.find(p => p.id === productId)?.name;
    const updatedProducts = products.filter(p => p.id !== productId);
    await saveProducts(updatedProducts);
    setProductToDelete(null);
    if (productName) {
      toast({ title: "Produto Removido", description: `${productName} foi removido.`, variant: "destructive" });
    }
  }, [products, toast]);

  const handleExportProducts = () => {
    toast({ title: "Exportando produtos...", description: "Aguarde enquanto preparamos seu arquivo." });
    try {
        const productsToExport = getProducts();
        const jsonString = JSON.stringify(productsToExport, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `barmate_produtos_backup_${format(new Date(), 'yyyy-MM-dd')}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast({ title: "Backup de Produtos Concluído!", description: "Seu arquivo de produtos foi baixado." });
    } catch (error) {
        console.error("Export error:", error);
        toast({ title: "Erro na Exportação", description: "Não foi possível gerar o arquivo de backup dos produtos.", variant: "destructive" });
    }
  };

  const handleTriggerImport = () => {
    setImportAlertOpen(true);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    toast({ title: "Importando produtos...", description: "Isso pode levar alguns instantes." });

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const text = e.target?.result as string;
            const data = JSON.parse(text);

            if (!Array.isArray(data) || (data.length > 0 && (!data[0].id || !data[0].name))) {
              throw new Error("Arquivo de produtos inválido ou formato incorreto.");
            }
            
            await saveProducts(data as Product[]);
            
            toast({ title: "Importação Concluída!", description: "Sua lista de produtos foi substituída com sucesso." });
        } catch (innerError: any) {
            console.error("Import processing error:", innerError);
            toast({ title: "Erro ao Processar Arquivo", description: innerError.message || "O arquivo JSON é inválido ou está corrompido.", variant: "destructive" });
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) {
               fileInputRef.current.value = "";
            }
        }
    };
    reader.onerror = (error) => {
      console.error("Import file reading error:", error);
      toast({ title: "Erro na Importação", description: "Não foi possível ler o arquivo selecionado.", variant: "destructive" });
      setIsImporting(false);
    };
    reader.readAsText(file);
  };


  const filteredProducts = useMemo(() => {
    return products
    .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(p => categoryFilter ? p.categoryId === categoryFilter : true);
  }, [products, searchTerm, categoryFilter]);

  const getCategoryNameById = useCallback((categoryId: string) => {
    return productCategories.find(cat => cat.id === categoryId)?.name || categoryId;
  }, [productCategories]);

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
        <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" onClick={handleExportProducts}>
                <Download className="mr-2 h-4 w-4" /> Exportar
            </Button>
            <Button variant="outline" onClick={handleTriggerImport} disabled={isImporting}>
                <Upload className="mr-2 h-4 w-4" /> Importar
            </Button>
            <Button onClick={openAddDialog}>
                <PlusCircle className="mr-2 h-5 w-5" /> Adicionar Produto
            </Button>
        </div>
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

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />

      <AddProductDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        product={editingProduct}
        onSave={handleSaveProduct}
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

      <AlertDialog open={importAlertOpen} onOpenChange={setImportAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Atenção: Importar Produtos</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta ação irá <strong className="text-destructive">substituir toda a sua lista de produtos atual</strong> pelos produtos do arquivo selecionado.
                        Esta operação não pode ser desfeita. Recomendamos exportar um backup antes de continuar.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => {
                            setImportAlertOpen(false);
                            fileInputRef.current?.click();
                        }}
                        className="bg-destructive hover:bg-destructive/90"
                    >
                        Entendi, substituir produtos
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
