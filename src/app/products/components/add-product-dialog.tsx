
"use client";

import type { Product, ProductCategory } from '@/types';
import { getProductCategories, LUCIDE_ICON_MAP } from '@/lib/constants';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useEffect, useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label'; // No longer directly used, FormLabel is used
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const productSchema = z.object({
  name: z.string().min(3, { message: "Nome do produto deve ter pelo menos 3 caracteres." }),
  price: z.coerce.number().positive({ message: "Preço deve ser um número positivo." }),
  categoryId: z.string().min(1, { message: "Selecione uma categoria." }),
  stock: z.coerce.number().int().nonnegative({ message: "Estoque deve ser um número não negativo." }).optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface AddProductDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  product?: Product | null;
  onSave: (product: Product) => void;
}

export default function AddProductDialog({ isOpen, onOpenChange, product, onSave }: AddProductDialogProps) {
  const [availableCategories, setAvailableCategories] = useState<ProductCategory[]>([]);

  useEffect(() => {
    if (isOpen) { // Fetch categories when dialog is opened or its dependencies change
      setAvailableCategories(getProductCategories());
    }
  }, [isOpen]);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      price: 0,
      categoryId: '',
      stock: 0,
    },
  });

  useEffect(() => {
    // Ensure categories are loaded before resetting form
    if (availableCategories.length > 0) {
      if (product) {
        form.reset({
          name: product.name,
          price: product.price,
          categoryId: product.categoryId,
          stock: product.stock ?? 0,
        });
      } else {
        form.reset({
          name: '',
          price: 0,
          categoryId: availableCategories[0]?.id || '', 
          stock: 0,
        });
      }
    } else if (!product) { // If no product and categories not yet loaded, set default empty/initial values
       form.reset({
          name: '',
          price: 0,
          categoryId: '', 
          stock: 0,
        });
    }
  }, [product, form, isOpen, availableCategories]);


  const onSubmit = (data: ProductFormData) => {
    onSave({
      id: product?.id || '', 
      name: data.name,
      price: data.price,
      categoryId: data.categoryId,
      stock: data.stock,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{product ? 'Editar Produto' : 'Adicionar Novo Produto'}</DialogTitle>
          <DialogDescription>
            {product ? 'Atualize os detalhes do produto.' : 'Preencha os detalhes do novo produto.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Produto</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Cerveja Especial" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableCategories.map(cat => {
                        const IconComponent = LUCIDE_ICON_MAP[cat.iconName] || null;
                        return (
                          <SelectItem key={cat.id} value={cat.id}>
                            <div className="flex items-center gap-2">
                              {IconComponent && <IconComponent className="h-4 w-4 text-muted-foreground" />}
                              {cat.name}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="stock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estoque (Opcional)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancelar</Button>
              </DialogClose>
              <Button type="submit">Salvar Produto</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
