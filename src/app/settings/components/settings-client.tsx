
"use client";

import type { ProductCategory } from '@/types';
import { getProductCategories, saveProductCategories, LUCIDE_ICON_MAP } from '@/lib/constants';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Save, Edit3, PlusCircle, Trash2 } from 'lucide-react';
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

  const handleSubmit = () => {
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
          />
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
          <Button onClick={handleSubmit}>Salvar Alterações</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


export default function SettingsClient() {
  const [barName, setBarName] = useState('');
  const [initialBarName, setInitialBarName] = useState('');
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [isEditCategoryDialogOpen, setIsEditCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    const storedName = localStorage.getItem('barName') || 'BarMate';
    setBarName(storedName);
    setInitialBarName(storedName);
    setProductCategories(getProductCategories());

    const handleCategoriesChange = () => {
      setProductCategories(getProductCategories());
    };
    window.addEventListener('productCategoriesChanged', handleCategoriesChange);
    return () => {
      window.removeEventListener('productCategoriesChanged', handleCategoriesChange);
    };

  }, []);

  const handleSaveBarName = () => {
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

  const isBarNameChanged = barName !== initialBarName;

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

  return (
    <div className="space-y-8">
      <Card>
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
          <Button onClick={handleSaveBarName} disabled={!isBarNameChanged || barName.trim() === ''}>
            <Save className="mr-2 h-4 w-4" />
            Salvar Nome do Bar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gerenciar Categorias de Produtos</CardTitle>
          <CardDescription>Renomeie as categorias de produtos. Os ícones são fixos por categoria original.</CardDescription>
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
                    <TableCell><IconComponent className="h-5 w-5 text-muted-foreground" /></TableCell>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{category.id}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleOpenEditCategoryDialog(category)}>
                        <Edit3 className="mr-2 h-4 w-4" /> Renomear
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editingCategory && (
        <EditCategoryDialog
          isOpen={isEditCategoryDialogOpen}
          onOpenChange={setIsEditCategoryDialogOpen}
          category={editingCategory}
          onSave={handleSaveCategory}
        />
      )}
    </div>
  );
}
