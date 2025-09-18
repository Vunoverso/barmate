
"use client";

import type { ProductCategory, TransactionFees } from '@/types';
import { getProductCategories, saveProductCategories, LUCIDE_ICON_MAP, INITIAL_PRODUCT_CATEGORIES, getTransactionFees, saveTransactionFees } from '@/lib/constants';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Save, Edit3, Trash2, PlusCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EditCategoryDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  category: ProductCategory | null;
  onSave: (updatedCategory: ProductCategory) => void;
}

function EditCategoryDialog({ isOpen, onOpenChange, category, onSave }: EditCategoryDialogProps) {
  const [name, setName] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (category) {
      setName(category.name);
    }
  }, [category]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Erro", description: "O nome da categoria não pode ser vazio.", variant: "destructive" });
      return;
    }
    if (category) {
      onSave({ ...category, name: name.trim() });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar Nome da Categoria</DialogTitle>
            <DialogDescription>Altere o nome de exibição da categoria "{category?.name}". O ID interno não será alterado.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="categoryName">Novo Nome da Categoria</Label>
            <Input
              id="categoryName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Digite o novo nome"
              autoFocus
            />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
            <Button type="submit">Salvar Alterações</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddCategoryDialog({ isOpen, onOpenChange, onSave }: { isOpen: boolean; onOpenChange: (isOpen: boolean) => void; onSave: (data: { name: string; iconName: string }) => void; }) {
  const [name, setName] = useState('');
  const [iconName, setIconName] = useState('');
  const { toast } = useToast();
  const availableIcons = Object.keys(LUCIDE_ICON_MAP);

  useEffect(() => {
    if (isOpen) {
        setName('');
        setIconName('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Erro", description: "O nome da categoria não pode ser vazio.", variant: "destructive" });
      return;
    }
    if (!iconName) {
        toast({ title: "Erro", description: "Selecione um ícone para a categoria.", variant: "destructive" });
        return;
    }
    onSave({ name: name.trim(), iconName });
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Adicionar Nova Categoria</DialogTitle>
            <DialogDescription>Crie uma nova categoria para organizar seus produtos.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newCategoryName">Nome da Categoria</Label>
              <Input
                id="newCategoryName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Porções"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newCategoryIcon">Ícone</Label>
              <Select onValueChange={setIconName} value={iconName}>
                  <SelectTrigger id="newCategoryIcon">
                      <SelectValue placeholder="Selecione um ícone" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableIcons.map(iconKey => {
                        const IconComponent = LUCIDE_ICON_MAP[iconKey];
                        return (
                          <SelectItem key={iconKey} value={iconKey}>
                              <div className="flex items-center gap-2">
                                  {IconComponent && <IconComponent className="h-4 w-4 text-muted-foreground" />}
                                  {iconKey}
                              </div>
                          </SelectItem>
                        )
                    })}
                  </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
            <Button type="submit">Salvar Categoria</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function SettingsClient() {
  const [isMounted, setIsMounted] = useState(false);
  const [barName, setBarName] = useState('');
  const [initialBarName, setInitialBarName] = useState('');
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [transactionFees, setTransactionFees] = useState<TransactionFees>({ debitRate: 0, creditRate: 0, pixRate: 0 });
  
  const { toast } = useToast();

  useEffect(() => {
    setIsMounted(true);
    const storedName = localStorage.getItem('barName') || 'BarMate';
    setBarName(storedName);
    setInitialBarName(storedName);
    setProductCategories(getProductCategories());
    setTransactionFees(getTransactionFees());

    const handleCategoriesChange = () => {
      setProductCategories(getProductCategories());
    };
    window.addEventListener('productCategoriesChanged', handleCategoriesChange);

    const handleFeesChange = () => {
        setTransactionFees(getTransactionFees());
    }
    window.addEventListener('transactionFeesChanged', handleFeesChange);

    return () => {
      window.removeEventListener('productCategoriesChanged', handleCategoriesChange);
      window.removeEventListener('transactionFeesChanged', handleFeesChange);
    };

  }, []);

  const handleSaveBarName = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (barName.trim() === '') {
      toast({
        title: "Erro",
        description: "O nome do bar não pode estar vazio.",
        variant: "destructive",
      });
      return;
    }
    localStorage.setItem('barName', barName);
    setInitialBarName(barName);
    window.dispatchEvent(new Event('barNameChanged'));
    toast({
      title: "Sucesso!",
      description: "Nome do bar atualizado.",
      action: <Save className="text-green-500" />,
    });
  };

  const handleSaveTransactionFees = (e?: React.FormEvent) => {
    e?.preventDefault();
    saveTransactionFees(transactionFees);
    toast({
        title: "Taxas Salvas!",
        description: "As taxas de transação foram atualizadas.",
        action: <Save className="text-green-500" />,
    });
  };

  const isBarNameChanged = barName !== initialBarName;

  const [isEditCategoryDialogOpen, setIsEditCategoryDialogOpen] = useState(false);
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<ProductCategory | null>(null);

  const handleOpenEditCategoryDialog = (category: ProductCategory) => {
    setEditingCategory(category);
    setIsEditCategoryDialogOpen(true);
  };

  const handleSaveCategory = (updatedCategory: ProductCategory) => {
    const updatedCategories = productCategories.map(cat =>
      cat.id === updatedCategory.id ? updatedCategory : cat
    );
    setProductCategories(updatedCategories);
    saveProductCategories(updatedCategories);
    toast({ title: "Categoria Atualizada", description: `Categoria "${updatedCategory.name}" salva com sucesso.`});
  };

  const handleAddNewCategory = (data: { name: string; iconName: string }) => {
    const newId = `cat_${data.name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20)}_${Date.now()}`;
    const newCategory: ProductCategory = {
        id: newId,
        name: data.name,
        iconName: data.iconName,
    };
    const updatedCategories = [...productCategories, newCategory];
    setProductCategories(updatedCategories);
    saveProductCategories(updatedCategories);
    toast({ title: "Categoria Adicionada", description: `A categoria "${data.name}" foi criada com sucesso.`});
  };

  const confirmDeleteCategory = (category: ProductCategory) => {
    setCategoryToDelete(category);
  };

  const handleDeleteCategory = () => {
    if (!categoryToDelete) return;

    const updatedCategories = productCategories.filter(cat => cat.id !== categoryToDelete.id);
    setProductCategories(updatedCategories);
    saveProductCategories(updatedCategories);
    toast({ title: "Categoria Removida", description: `Categoria "${categoryToDelete.name}" removida com sucesso. Produtos que usavam esta categoria podem precisar ser reatribuídos.`, variant: "default" });
    setCategoryToDelete(null);
  };

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Carregando configurações...</p>
      </div>
    );
  }


  return (
    <>
      <div className="space-y-8">
        <Card>
          <form onSubmit={handleSaveBarName}>
            <CardHeader>
              <CardTitle>Nome do Estabelecimento</CardTitle>
              <CardDescription>Altere o nome do seu bar que será exibido no sistema.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="barName">Nome do Bar</Label>
                <Input
                  id="barName"
                  value={barName}
                  onChange={(e) => setBarName(e.target.value)}
                  placeholder="Digite o nome do bar"
                />
              </div>
              <Button type="submit" disabled={!isBarNameChanged || barName.trim() === ''}>
                <Save className="mr-2 h-4 w-4" />
                Salvar Nome do Bar
              </Button>
            </CardContent>
          </form>
        </Card>

        <Card>
          <form onSubmit={handleSaveTransactionFees}>
            <CardHeader>
                <CardTitle>Taxas de Transação</CardTitle>
                <CardDescription>Defina as taxas percentuais para transações de débito, crédito e PIX. O sistema descontará esses valores das entradas na conta bancária.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="debitRate">Taxa de Débito (%)</Label>
                        <Input
                            id="debitRate"
                            type="number"
                            value={transactionFees.debitRate}
                            onChange={(e) => setTransactionFees(prev => ({ ...prev, debitRate: parseFloat(e.target.value) || 0 }))}
                            placeholder="Ex: 1.99"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="creditRate">Taxa de Crédito (%)</Label>
                        <Input
                            id="creditRate"
                            type="number"
                            value={transactionFees.creditRate}
                            onChange={(e) => setTransactionFees(prev => ({ ...prev, creditRate: parseFloat(e.target.value) || 0 }))}
                            placeholder="Ex: 4.99"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="pixRate">Taxa de PIX (%)</Label>
                        <Input
                            id="pixRate"
                            type="number"
                            value={transactionFees.pixRate}
                            onChange={(e) => setTransactionFees(prev => ({ ...prev, pixRate: parseFloat(e.target.value) || 0 }))}
                            placeholder="Ex: 0.99"
                        />
                    </div>
                </div>
                <Button type="submit">
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Taxas
                </Button>
            </CardContent>
          </form>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Gerenciar Categorias de Produtos</CardTitle>
                  <CardDescription>Renomeie, remova ou adicione novas categorias de produtos.</CardDescription>
                </div>
                <Button onClick={() => setIsAddCategoryDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Categoria
                </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ícone</TableHead>
                  <TableHead>Nome Atual da Categoria</TableHead>
                  <TableHead>ID (interno)</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productCategories.map((category) => {
                  const IconComponent = LUCIDE_ICON_MAP[category.iconName] || LUCIDE_ICON_MAP['Package'];
                  return (
                    <TableRow key={category.id}>
                      <TableCell>{IconComponent && <IconComponent className="h-5 w-5 text-muted-foreground" />}</TableCell>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{category.id}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleOpenEditCategoryDialog(category)}>
                          <Edit3 className="mr-2 h-4 w-4" /> Renomear
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => confirmDeleteCategory(category)} disabled={INITIAL_PRODUCT_CATEGORIES.some(cat => cat.id === category.id)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Remover
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {editingCategory && (
        <EditCategoryDialog
          isOpen={isEditCategoryDialogOpen}
          onOpenChange={setIsEditCategoryDialogOpen}
          category={editingCategory}
          onSave={handleSaveCategory}
        />
      )}

      <AddCategoryDialog 
        isOpen={isAddCategoryDialogOpen}
        onOpenChange={setIsAddCategoryDialogOpen}
        onSave={handleAddNewCategory}
      />

      {categoryToDelete && (
        <AlertDialog open={!!categoryToDelete} onOpenChange={() => setCategoryToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Remoção de Categoria</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover a categoria "{categoryToDelete.name}"? 
                Produtos que utilizam esta categoria podem precisar ser reatribuídos manually a uma nova categoria.
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setCategoryToDelete(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteCategory}
                className="bg-destructive hover:bg-destructive/90"
              >
                Remover Categoria
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
