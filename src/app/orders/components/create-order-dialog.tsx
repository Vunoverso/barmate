
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface CreateOrderDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (name: string) => void;
}

export default function CreateOrderDialog({ isOpen, onOpenChange, onSubmit }: CreateOrderDialogProps) {
  const [orderName, setOrderName] = useState('');
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderName.trim() === '') {
      toast({
        title: 'Nome Inválido',
        description: 'Por favor, insira um nome para a comanda (ex: Mesa 5, Cliente Ana).',
        variant: 'destructive',
      });
      return;
    }
    onSubmit(orderName.trim());
    setOrderName(''); // Reset for next time
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Abrir Nova Comanda</DialogTitle>
            <DialogDescription>
              Digite um identificador para a nova comanda (ex: número da mesa, nome do cliente).
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="orderName">Nome da Comanda</Label>
            <Input
              id="orderName"
              value={orderName}
              onChange={(e) => setOrderName(e.target.value)}
              placeholder="Ex: Mesa 12, João Silva"
              autoFocus
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={() => setOrderName('')}>Cancelar</Button>
            </DialogClose>
            <Button type="submit">Confirmar e Abrir</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
