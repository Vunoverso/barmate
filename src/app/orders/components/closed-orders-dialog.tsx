"use client";

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
import { formatCurrency } from '@/lib/constants';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronDown, ChevronRight, Trash2, RotateCcw, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { OrderItem } from '@/types';

type ClosedOrder = {
  id: string;
  name: string;
  createdAt: string;
  closedAt: string | null;
  items: OrderItem[];
};

interface ClosedOrdersDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClosedOrdersDialog({ isOpen, onOpenChange }: ClosedOrdersDialogProps) {
  const [orders, setOrders] = useState<ClosedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<ClosedOrder | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const fetchClosedOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/db/closed-orders?limit=200');
      if (!res.ok) throw new Error('Falha ao buscar histórico');
      const data = await res.json() as ClosedOrder[];
      setOrders(data.sort((a, b) => new Date(b.closedAt ?? b.createdAt).getTime() - new Date(a.closedAt ?? a.createdAt).getTime()));
    } catch {
      toast({ title: 'Erro ao carregar histórico', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isOpen) void fetchClosedOrders();
  }, [isOpen, fetchClosedOrders]);

  const handlePermanentDelete = async () => {
    if (!orderToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/db/closed-orders?id=${encodeURIComponent(orderToDelete.id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Falha ao deletar');
      setOrders(prev => prev.filter(o => o.id !== orderToDelete.id));
      toast({ title: 'Comanda deletada permanentemente.' });
    } catch {
      toast({ title: 'Erro ao deletar comanda', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
      setOrderToDelete(null);
    }
  };

  const getOrderTotal = (items: OrderItem[]) =>
    items.reduce((acc, i) => acc + i.price * i.quantity, 0);

  const getPositiveItems = (items: OrderItem[]) =>
    items.filter(i => i.price > 0 && i.quantity > 0);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] grid grid-rows-[auto_1fr] p-0">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle className="text-xl font-black uppercase">Histórico de Comandas</DialogTitle>
            <DialogDescription>
              Comandas fechadas nos últimos registros. Clique para ver os itens.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Carregando histórico...</span>
              </div>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 opacity-40">
                <RotateCcw className="h-12 w-12 mb-3" />
                <p className="font-black uppercase">Nenhuma comanda fechada</p>
              </div>
            ) : (
              <div className="space-y-2">
                {orders.map(order => {
                  const isExpanded = expandedId === order.id;
                  const total = getOrderTotal(order.items ?? []);
                  const positiveItems = getPositiveItems(order.items ?? []);

                  return (
                    <div key={order.id} className="border rounded-lg overflow-hidden">
                      <div
                        role="button"
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setExpandedId(isExpanded ? null : order.id)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-sm truncate">{order.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              Fechada em:{' '}
                              {order.closedAt
                                ? format(new Date(order.closedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                                : '—'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="secondary" className="font-black text-xs">
                            {formatCurrency(total)}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={e => { e.stopPropagation(); setOrderToDelete(order); }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t bg-muted/20 p-3 space-y-1">
                          {positiveItems.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-2">Sem itens de consumo.</p>
                          ) : (
                            positiveItems.map((item, idx) => (
                              <div key={item.lineItemId ?? idx} className="flex justify-between text-xs py-1">
                                <span className="truncate text-foreground">{item.quantity}x {item.name}</span>
                                <span className="font-bold shrink-0 ml-2">{formatCurrency(item.price * item.quantity)}</span>
                              </div>
                            ))
                          )}
                          <Separator className="my-2" />
                          <div className="flex justify-between text-xs font-black uppercase">
                            <span>Total Consumido</span>
                            <span>{formatCurrency(positiveItems.reduce((a, i) => a + i.price * i.quantity, 0))}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            Aberta em:{' '}
                            {format(new Date(order.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!orderToDelete} onOpenChange={open => !open && setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              A comanda <strong>{orderToDelete?.name}</strong> será deletada para sempre do sistema.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handlePermanentDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Deletar Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
