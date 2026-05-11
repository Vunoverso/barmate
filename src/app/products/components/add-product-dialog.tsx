
"use client";

import type { Product, ProductCategory } from '@/types';
import { getProductCategories } from '@/lib/data-access';
import { LUCIDE_ICON_MAP } from '@/lib/constants';
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
import { Textarea } from '@/components/ui/textarea';
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

const productSchema = z.object({
  name: z.string().min(3, { message: "Nome do produto deve ter pelo menos 3 caracteres." }),
  price: z.coerce.number().positive({ message: "Preço deve ser um número positivo." }),
  categoryId: z.string().min(1, { message: "Selecione uma categoria." }),
  stock: z.coerce.number().int().nonnegative({ message: "Estoque deve ser um número não negativo." }).optional(),
  description: z.string().trim().max(500, { message: "Descrição deve ter no máximo 500 caracteres." }).optional(),
  imageUrl: z.string().optional(),
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
  onSave: (product: Omit<Product, 'id'> | Product) => void;
}

export default function AddProductDialog({ isOpen, onOpenChange, product, onSave }: AddProductDialogProps) {
  const [availableCategories, setAvailableCategories] = useState<ProductCategory[]>([]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      form.setError('imageUrl', { message: 'Selecione um arquivo de imagem válido.' });
      return;
    }

    // Limite simples para evitar imagens gigantes no localStorage/app-state.
    if (file.size > 2 * 1024 * 1024) {
      form.setError('imageUrl', { message: 'A imagem deve ter no máximo 2MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      form.clearErrors('imageUrl');
      form.setValue('imageUrl', result, { shouldDirty: true, shouldValidate: true });
    };
    reader.onerror = () => {
      form.setError('imageUrl', { message: 'Não foi possível ler a imagem selecionada.' });
    };
    reader.readAsDataURL(file);
  };

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
      description: '',
      imageUrl: '',
      isCombo: false,
      comboItems: 0,
    },
  });

  useEffect(() => {
    if (isOpen && availableCategories.length > 0) {
      if (product) {
        form.reset({
          name: product.name,
          price: product.price,
          categoryId: product.categoryId,
          stock: product.stock ?? 0,
          description: product.description ?? '',
          imageUrl: product.imageUrl ?? '',
          isCombo: product.isCombo ?? false,
          comboItems: product.comboItems ?? 0,
        });
      } else {
        form.reset({
          name: '',
          price: 0,
          categoryId: availableCategories[0]?.id || '', 
          stock: 0,
          description: '',
          imageUrl: '',
          isCombo: false,
          comboItems: 0,
        });
      }
    }
  }, [product, form, isOpen, availableCategories]);

  const isCombo = form.watch("isCombo");

  const onSubmit = (data: ProductFormData) => {
    const productData: Omit<Product, 'id' | 'is_combo' | 'combo_items'> & { isCombo?: boolean, comboItems?: number} = {
      name: data.name,
      price: data.price,
      categoryId: data.categoryId,
      stock: data.stock,
      description: data.description?.trim() ? data.description.trim() : null,
      imageUrl: data.imageUrl?.trim() ? data.imageUrl.trim() : null,
      isCombo: data.isCombo,
      comboItems: data.isCombo ? data.comboItems : undefined,
    };
    if (product) {
      onSave({ ...product, ...productData });
    } else {
      onSave(productData as Omit<Product, 'id'>);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-4xl max-h-[92vh]">
        <DialogHeader>
          <DialogTitle>{product ? 'Editar Produto' : 'Adicionar Novo Produto'}</DialogTitle>
          <DialogDescription>
            {product ? 'Atualize os detalhes do produto.' : 'Preencha os detalhes do novo produto.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-col">
            <div className="space-y-5 overflow-y-auto py-4 pr-1 max-h-[calc(92vh-220px)]">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <FormLabel>Estoque</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição do Produto</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ex: Batata crocante com molho especial da casa."
                        className="min-h-28"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormDescription>
                      Essa descrição aparece no cardápio digital para o cliente.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Foto do Produto</FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        <Input
                          placeholder="Cole a URL da imagem (opcional)"
                          {...field}
                          value={field.value ?? ''}
                        />
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                        />
                        {field.value ? (
                          <div className="space-y-2">
                            <img
                              src={field.value}
                              alt="Pré-visualização do produto"
                              className="h-44 w-full max-w-xs rounded-md object-cover border"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => form.setValue('imageUrl', '', { shouldDirty: true, shouldValidate: true })}
                            >
                              Remover foto
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </FormControl>
                    <FormDescription>
                      Você pode colar uma URL ou enviar uma foto do dispositivo.
                    </FormDescription>
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

            </div>

            <DialogFooter className="border-t pt-4">
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

    