
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
import { Switch } from '@/components/ui/switch';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Label } from '@/components/ui/label';

const productSchema = z.object({
  name: z.string().min(3, { message: "Nome do produto deve ter pelo menos 3 caracteres." }),
  price: z.coerce.number().positive({ message: "Preço deve ser um número positivo." }),
  categoryId: z.string().min(1, { message: "Selecione uma categoria." }),
  stock: z.coerce.number().int().nonnegative({ message: "Estoque deve ser um número não negativo." }).optional(),
  isCombo: z.boolean().default(false),
  comboItems: z.coerce.number().int().optional(),
}).refine(data => {
  if (data.isCombo && (!data.comboItems || data.comboItems <= 1)) {
    return false;
  }
  return true;
}, {
  message: "Combos devem ter 2 ou mais itens.",
  path: ["comboItems"],
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
    if (isOpen) { 
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
      isCombo: false,
      comboItems: 0,
    },
  });

  useEffect(() => {
    if (availableCategories.length > 0) {
      if (product) {
        form.reset({
          name: product.name,
          price: product.price,
          categoryId: product.categoryId,
          stock: product.stock ?? 0,
          isCombo: product.isCombo ?? false,
          comboItems: product.comboItems ?? 0,
        });
      } else {
        form.reset({
          name: '',
          price: 0,
          categoryId: availableCategories[0]?.id || '', 
          stock: 0,
          isCombo: false,
          comboItems: 0,
        });
      }
    } else if (!product) { 
       form.reset({
          name: '',
          price: 0,
          categoryId: '', 
          stock: 0,
          isCombo: false,
          comboItems: 0,
        });
    }
  }, [product, form, isOpen, availableCategories]);

  const isCombo = form.watch("isCombo");

  const onSubmit = (data: ProductFormData) => {
    onSave({
      id: product?.id || '', 
      name: data.name,
      price: data.price,
      categoryId: data.categoryId,
      stock: data.stock,
      isCombo: data.isCombo,
      comboItems: data.isCombo ? data.comboItems : undefined,
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
            <div className="grid grid-cols-2 gap-4">
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
            </div>
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
              name="isCombo"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Produto é um Combo?</FormLabel>
                    <FormDescription>
                      Marque se este produto representa um pacote com vários itens (ex: Balde com 6 cervejas).
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {isCombo && (
              <FormField
                control={form.control}
                name="comboItems"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade de Itens no Combo</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Ex: 6" {...field} />
                    </FormControl>
                     <FormDescription>
                      Quantos itens individuais o cliente recebe ao comprar este combo?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
