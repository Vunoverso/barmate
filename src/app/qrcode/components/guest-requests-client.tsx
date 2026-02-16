"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { GuestRequest, ActiveOrder } from '@/types';
import { getGuestRequests, saveGuestRequests, getOpenOrders } from '@/lib/data-access';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, X, Users, Link as LinkIcon } from 'lucide-react';
import { formatCurrency } from '@/lib/constants';

export default function GuestRequestsClient() {
    const [requests, setRequests] = useState<GuestRequest[]>([]);
    const [openOrders, setOpenOrders] = useState<ActiveOrder[]>([]);
    const [isMounted, setIsMounted] = useState(false);
    
    const [associatingRequest, setAssociatingRequest] = useState<GuestRequest | null>(null);
    const [rejectingRequest, setRejectingRequest] = useState<GuestRequest | null>(null);
    const [selectedOrderId, setSelectedOrderId] = useState('');

    const { toast } = useToast();

    const loadData = useCallback(() => {
        setRequests(getGuestRequests());
        setOpenOrders(getOpenOrders());
        setIsMounted(true);
    }, []);

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 5000); // Poll every 5 seconds to get new requests

        window.addEventListener('storage', loadData);
        return () => {
            clearInterval(interval);
            window.removeEventListener('storage', loadData);
        };
    }, [loadData]);
    
    const pendingRequests = useMemo(() => {
        return requests.filter(r => r.status === 'pending').sort((a, b) => new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime());
    }, [requests]);

    const handleOpenAssociationDialog = (request: GuestRequest) => {
        if (openOrders.length === 0) {
            toast({ title: "Nenhuma comanda aberta", description: "Crie uma nova comanda antes de associar um cliente.", variant: "default" });
            return;
        }
        setAssociatingRequest(request);
        setSelectedOrderId('');
    };

    const handleConfirmAssociation = () => {
        if (!associatingRequest || !selectedOrderId) {
            toast({ title: "Erro", description: "Selecione uma comanda para associar.", variant: "destructive" });
            return;
        }

        const allRequests = getGuestRequests();
        const updatedRequests = allRequests.map(r => {
            if (r.id === associatingRequest.id) {
                return { ...r, status: 'approved' as 'approved', associatedOrderId: selectedOrderId };
            }
            return r;
        });

        saveGuestRequests(updatedRequests);
        toast({ title: "Cliente Associado!", description: `${associatingRequest.name} agora está associado à comanda selecionada.` });
        setAssociatingRequest(null);
    };

    const handleConfirmRejection = () => {
        if (!rejectingRequest) return;
        
        const allRequests = getGuestRequests();
        const updatedRequests = allRequests.filter(r => r.id !== rejectingRequest.id);
        
        saveGuestRequests(updatedRequests);
        toast({ title: "Solicitação Rejeitada", description: `A solicitação de ${rejectingRequest.name} foi removida.`, variant: "default" });
        setRejectingRequest(null);
    };

    if (!isMounted) {
        return (
            <Card>
                <CardHeader><CardTitle>Solicitações de Acesso</CardTitle></CardHeader>
                <CardContent className="text-center text-muted-foreground">Carregando...</CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Solicitações de Acesso Pendentes</CardTitle>
                    <CardDescription>Aprove ou rejeite os pedidos de acesso dos clientes às suas comandas.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Solicitado</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pendingRequests.length > 0 ? (
                                pendingRequests.map(req => (
                                    <TableRow key={req.id}>
                                        <TableCell className="font-medium">{req.name}</TableCell>
                                        <TableCell>{formatDistanceToNow(new Date(req.requestedAt), { addSuffix: true, locale: ptBR })}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button size="sm" variant="destructive" onClick={() => setRejectingRequest(req)}>
                                                <X className="mr-2 h-4 w-4" /> Rejeitar
                                            </Button>
                                            <Button size="sm" onClick={() => handleOpenAssociationDialog(req)}>
                                                <LinkIcon className="mr-2 h-4 w-4" /> Associar
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                        <Users className="mx-auto h-8 w-8 mb-2" />
                                        Nenhuma solicitação pendente.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {associatingRequest && (
                <Dialog open={!!associatingRequest} onOpenChange={() => setAssociatingRequest(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Associar Comanda</DialogTitle>
                            <DialogDescription>
                                Selecione uma comanda aberta para associar ao cliente <strong>{associatingRequest.name}</strong>.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-2">
                            <Label htmlFor="order-select">Comandas Abertas</Label>
                            <Select onValueChange={setSelectedOrderId} value={selectedOrderId}>
                                <SelectTrigger id="order-select">
                                    <SelectValue placeholder="Selecione uma comanda..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {openOrders.map(order => (
                                        <SelectItem key={order.id} value={order.id}>
                                            {order.name} - ({formatCurrency(order.items.reduce((sum, i) => sum + i.price * i.quantity, 0))})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                            <Button onClick={handleConfirmAssociation} disabled={!selectedOrderId}>
                                <Check className="mr-2 h-4 w-4" />
                                Confirmar Associação
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {rejectingRequest && (
                <AlertDialog open={!!rejectingRequest} onOpenChange={() => setRejectingRequest(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Rejeitar Solicitação?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Tem certeza de que deseja rejeitar e remover a solicitação de acesso de <strong>{rejectingRequest.name}</strong>?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleConfirmRejection} className="bg-destructive hover:bg-destructive/90">
                                Sim, Rejeitar
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </>
    );
}
