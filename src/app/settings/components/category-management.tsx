"use client";

import type { ProductCategory } from '@/types';
import { useState, useEffect, useCallback } from 'react';
import { getProductCategories, saveProductCategories, getProducts } from '@/lib/data-access';
import { LUCIDE_ICON_MAP } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Edit3, PlusCircle, Trash2, Package } from 'lucide-react';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

const ICON_OPTIONS = Object.keys(LUCIDE_ICON_MAP);

interface CategoryDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  category: ProductCategory | null;
  onSave: (data: { name: string; iconName: string }) => void;
}

function CategoryDialog({ isOpen, onOpenChange, category, onSave }: CategoryDialogProps) {
  const [name, setName] = useState('');
  const [iconName, setIconName] = useState<string>('Package');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setName(category?.name ?? '');
      setIconName(category?.iconName ?? 'Package');
    }
  }, [isOpen, category]);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast({ title: 'Erro', description: 'O nome da categoria não pode ser vazio.', variant: 'destructive' });
      return;
    }
    onSave({ name: trimmed, iconName });
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
          <DialogDescription>
            {category ? `Atualize os dados da categoria "${category.name}".` : 'Crie uma nova categoria para organizar seus produtos.'}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="categoryName">Nome</Label>
            <Input
              id="categoryName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Doces"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Ícone</Label>
            <div className="grid grid-cols-6 gap-2 p-2 border rounded-md max-h-48 overflow-auto">
              {ICON_OPTIONS.map((key) => {
                const Icon = LUCIDE_ICON_MAP[key] || Package;
                const selected = key === iconName;
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setIconName(key)}
                    className={cn(
                      'flex items-center justify-center h-10 w-10 rounded-md border transition-colors',
                      selected ? 'border-primary bg-primary/10 text-primary' : 'border-transparent hover:bg-muted',
                    )}
                    title={key}
                  >
                    <Icon className="h-5 w-5" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button onClick={handleSubmit}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CategoryManagement() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProductCategory | null>(null);
  const [toDelete, setToDelete] = useState<ProductCategory | null>(null);
  const { toast } = useToast();

  const reload = useCallback(() => {
    setCategories(getProductCategories());
  }, []);

  useEffect(() => {
    reload();
    window.addEventListener('barmate-app-state-changed', reload);
    window.addEventListener('storage', reload);
    return () => {
      window.removeEventListener('barmate-app-state-changed', reload);
      window.removeEventListener('storage', reload);
    };
  }, [reload]);

  const handleAdd = () => {
    setEditing(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (category: ProductCategory) => {
    setEditing(category);
    setIsDialogOpen(true);
  };

  const handleSave = async ({ name, iconName }: { name: string; iconName: string }) => {
    const current = getProductCategories();
    let updated: ProductCategory[];
    if (editing) {
      updated = current.map((cat) => (cat.id === editing.id ? { ...cat, name, iconName } : cat));
      toast({ title: 'Categoria atualizada', description: `"${name}" salva com sucesso.` });
    } else {
      const id = `cat_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}_${Date.now().toString(36)}`;
      updated = [...current, { id, name, iconName }];
      toast({ title: 'Categoria criada', description: `"${name}" foi adicionada.` });
    }
    setCategories(updated);
    await saveProductCategories(updated);
  };

  const handleConfirmDelete = async () => {
    if (!toDelete) return;
    const products = getProducts();
    const inUse = products.filter((p) => p.categoryId === toDelete.id).length;
    if (inUse > 0) {
      toast({
        title: 'Não foi possível remover',
        description: `Existem ${inUse} produto(s) usando esta categoria. Reatribua-os antes de remover.`,
        variant: 'destructive',
      });
      setToDelete(null);
      return;
    }
    const updated = getProductCategories().filter((cat) => cat.id !== toDelete.id);
    setCategories(updated);
    await saveProductCategories(updated);
    toast({ title: 'Categoria removida', description: `"${toDelete.name}" foi excluída.` });
    setToDelete(null);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Categorias de Produtos</CardTitle>
          <CardDescription>Crie, renomeie ou remova as categorias usadas no cardápio.</CardDescription>
        </div>
        <Button onClick={handleAdd}>
          <PlusCircle className="mr-2 h-4 w-4" /> Nova Categoria
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Ícone</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden md:table-cell">ID interno</TableHead>
              <TableHead className="text-right w-[180px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Nenhuma categoria cadastrada.
                </TableCell>
              </TableRow>
            ) : (
              categories.map((cat) => {
                const Icon = LUCIDE_ICON_MAP[cat.iconName] || Package;
                return (
                  <TableRow key={cat.id}>
                    <TableCell>
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </TableCell>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{cat.id}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(cat)}>
                        <Edit3 className="mr-2 h-4 w-4" /> Editar
                      </Button>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setToDelete(cat)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>

      <CategoryDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        category={editing}
        onSave={handleSave}
      />

      {toDelete && (
        <AlertDialog open={!!toDelete} onOpenChange={() => setToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover categoria?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover a categoria &quot;{toDelete.name}&quot;? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Card>
  );
}
