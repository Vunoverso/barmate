"use client";

import type { Product } from '@/types';
import { PRODUCT_CATEGORIES } from '@/lib/constants';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useEffect } from 'react';

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
import { Label } from '@/components/ui/label';
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
  category: z.string().min(1, { message: "Selecione uma categoria." }),
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
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      price: 0,
      category: '',
      stock: 0,
    },
  });

  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        price: product.price,
        category: product.category,
        stock: product.stock ?? 0,
      });
    } else {
      form.reset({
        name: '',
        price: 0,
        category: PRODUCT_CATEGORIES[0]?.name || '', // Default to first category
        stock: 0,
      });
    }
  }, [product, form, isOpen]);

  const onSubmit = (data: ProductFormData) => {
    const categoryDetails = PRODUCT_CATEGORIES.find(cat => cat.name === data.category);
    onSave({
      id: product?.id || '', // ID will be set by parent if new
      name: data.name,
      price: data.price,
      category: data.category,
      icon: categoryDetails?.icon,
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
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PRODUCT_CATEGORIES.map(cat => (
                        <SelectItem key={cat.name} value={cat.name}>
                          {cat.icon && <cat.icon className="inline-block mr-2 h-4 w-4" />}
                          {cat.name}
                        </SelectItem>
                      ))}
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
