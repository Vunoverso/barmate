
"use client";

import { useState, useEffect } from 'react';
import type { Client } from '@/types';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users } from 'lucide-react';

interface CreateOrderDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (details: { name: string; clientId: string | null; }) => void;
  clients: Client[];
}

export default function CreateOrderDialog({ isOpen, onOpenChange, onSubmit, clients }: CreateOrderDialogProps) {
  const [orderName, setOrderName] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // When the dialog opens, reset to the default state (custom name)
    if (isOpen) {
      setOrderName('');
      setSelectedClientId(null);
    }
  }, [isOpen]);

  const handleClientChange = (value: string) => {
    if (value === 'custom') {
      setSelectedClientId(null);
      setOrderName('');
    } else {
      const client = clients.find(c => c.id === value);
      if (client) {
        setSelectedClientId(client.id);
        setOrderName(client.name);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderName.trim() === '') {
      toast({
        title: 'Nome Inválido',
        description: 'Por favor, insira um nome para a comanda ou selecione um cliente.',
        variant: 'destructive',
      });
      return;
    }
    onSubmit({ name: orderName.trim(), clientId: selectedClientId });
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Abrir Nova Comanda</DialogTitle>
            <DialogDescription>
              Selecione um cliente existente ou digite um nome personalizado para a comanda.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
                <Label htmlFor="client-select">Cliente</Label>
                <Select onValueChange={handleClientChange} value={selectedClientId || 'custom'}>
                    <SelectTrigger id="client-select">
                        <SelectValue placeholder="Selecione um cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="custom">Nome Avulso (Ex: Mesa 5)</SelectItem>
                        {clients.map(client => (
                            <SelectItem key={client.id} value={client.id}>
                                {client.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="orderName">Nome da Comanda</Label>
              <Input
                id="orderName"
                value={orderName}
                onChange={(e) => setOrderName(e.target.value)}
                placeholder={selectedClientId ? "" : "Ex: Mesa 12, João Silva"}
                disabled={!!selectedClientId}
                autoFocus={!selectedClientId}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <Button type="submit">Confirmar e Abrir</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
