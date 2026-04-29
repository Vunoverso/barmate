
"use client";

import type { Client, ActiveOrder, Sale } from '@/types';
import { getClients, saveClients, getArchivedOrders, saveArchivedOrders, addSale } from '@/lib/data-access';
import { formatCurrency } from '@/lib/constants';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Edit, Trash2, Search, MoreHorizontal } from 'lucide-react';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import PaymentDialog from '@/app/orders/components/payment-dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toValidDate } from '@/lib/utils';

const clientSchema = z.object({
  name: z.string().min(3, { message: 'O nome deve ter pelo menos 3 caracteres.' }),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

export default function ClientsClient() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [viewingDebtClient, setViewingDebtClient] = useState<Client | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  const { toast } = useToast();

  const fetchData = useCallback(() => {
    setIsLoading(true);
    const allClients = getClients();
    const allArchivedOrders = getArchivedOrders();
    // Recalculate debt for all clients based on archived orders
    const clientsWithDebt = allClients.map(client => {
      const clientDebt = allArchivedOrders
        .filter(order => order.clientId === client.id)
        .reduce((sum, order) => sum + order.items.reduce((orderSum, item) => orderSum + item.price * item.quantity, 0), 0);
      return { ...client, debtAmount: clientDebt };
    });
    setClients(clientsWithDebt);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    window.addEventListener('storage', fetchData);
    window.addEventListener('barmate-app-state-changed', fetchData);
    return () => {
      window.removeEventListener('storage', fetchData);
      window.removeEventListener('barmate-app-state-changed', fetchData);
    };
  }, [fetchData]);

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '',
      phone: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (editingClient) {
      form.reset({
        name: editingClient.name,
        phone: editingClient.phone || '',
        notes: editingClient.notes || '',
      });
    } else {
      form.reset({
        name: '',
        phone: '',
        notes: '',
      });
    }
  }, [editingClient, isDialogOpen, form]);

  const handleSaveClient = (values: ClientFormData) => {
    const normalizedValues = {
      name: values.name,
      phone: values.phone || null,
      notes: values.notes || null,
    };

    if (editingClient) {
      const updatedClient: Client = { ...editingClient, ...normalizedValues };
      const updatedClients = clients.map(c => c.id === editingClient.id ? updatedClient : c);
      saveClients(updatedClients);
      toast({ title: "Cliente Atualizado", description: `Os dados de ${values.name} foram atualizados.` });
    } else {
      const newClient: Client = { id: `client-${Date.now()}`, debtAmount: 0, ...normalizedValues };
      const updatedClients = [...clients, newClient];
      saveClients(updatedClients);
      toast({ title: "Cliente Adicionado", description: `${values.name} foi adicionado à sua lista de clientes.` });
    }
    setIsDialogOpen(false);
    setEditingClient(null);
  };
  
  const handleDeleteClient = () => {
    if (!clientToDelete) return;
    const updatedClients = clients.filter(c => c.id !== clientToDelete.id);
    saveClients(updatedClients);
    // Also remove their archived orders to clean up
    const allArchivedOrders = getArchivedOrders();
    const remainingArchivedOrders = allArchivedOrders.filter(order => order.clientId !== clientToDelete.id);
    saveArchivedOrders(remainingArchivedOrders);

    toast({ title: "Cliente Removido", description: `${clientToDelete.name} foi removido da lista.`, variant: "destructive" });
    setClientToDelete(null);
  };
  
  const handleSettleDebt = (details: { sale: Omit<Sale, 'id' | 'timestamp' | 'name'>; leaveChangeAsCredit: boolean; isPartial: boolean; }) => {
    if (!viewingDebtClient) return;

    const { sale } = details;
    
    addSale({
      ...sale,
      name: `Quitação de Dívida: ${viewingDebtClient.name}`,
    });
    
    // Remove archived orders for this client
    const allArchived = getArchivedOrders();
    const remainingArchived = allArchived.filter(order => order.clientId !== viewingDebtClient.id);
    saveArchivedOrders(remainingArchived);
    
    toast({ title: "Dívida Quitada!", description: `O saldo devedor de ${viewingDebtClient.name} foi zerado.` });
    setIsPaymentDialogOpen(false);
    setViewingDebtClient(null);
    fetchData(); // Refresh data
  };

  const filteredClients = useMemo(() => {
    return clients.filter(client =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a,b) => a.name.localeCompare(b.name));
  }, [clients, searchTerm]);
  
  const debtOrderForPayment = useMemo(() => {
    if (!viewingDebtClient) return undefined;
    const allArchivedOrders = getArchivedOrders();
    const clientDebtOrders = allArchivedOrders.filter(o => o.clientId === viewingDebtClient.id);
    
    return {
        id: `debt-payment-${viewingDebtClient.id}`,
        name: `Dívida de ${viewingDebtClient.name}`,
        items: clientDebtOrders.flatMap(o => o.items),
        totalAmount: viewingDebtClient.debtAmount || 0,
        createdAt: new Date(),
    } as ActiveOrder
  }, [viewingDebtClient]);


  if (isLoading) {
    return <p>Carregando clientes...</p>;
  }

  return (
    <>
      <div className="flex items-center gap-4 mb-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar clientes por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button onClick={() => { setEditingClient(null); setIsDialogOpen(true); }} className="ml-auto">
          <PlusCircle className="mr-2 h-5 w-5" /> Adicionar Cliente
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
          <CardDescription>
            Gerencie as informações dos seus clientes. Total de {filteredClients.length} clientes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Saldo Devedor</TableHead>
                <TableHead>Observações</TableHead>
                <TableHead><span className="sr-only">Ações</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.length > 0 ? filteredClients.map(client => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{client.phone || '-'}</TableCell>
                   <TableCell>
                    {(client.debtAmount ?? 0) > 0 ? (
                      <Button variant="link" className="p-0 h-auto" onClick={() => setViewingDebtClient(client)}>
                        <Badge variant="destructive">{formatCurrency(client.debtAmount || 0)}</Badge>
                      </Button>
                    ) : (
                      formatCurrency(0)
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground truncate max-w-xs">{client.notes || '-'}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Menu de ações</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => { setEditingClient(client); setIsDialogOpen(true); }}>
                          <Edit className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setClientToDelete(client)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Remover
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Nenhum cliente encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Mostrando <strong>{filteredClients.length}</strong> de <strong>{clients.length}</strong> clientes.
          </div>
        </CardFooter>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingClient ? 'Editar Cliente' : 'Adicionar Novo Cliente'}</DialogTitle>
            <DialogDescription>
              {editingClient ? 'Atualize os dados do cliente.' : 'Preencha os dados do novo cliente.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveClient)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Cliente</FormLabel>
                    <FormControl>
                      <Input id="name" placeholder="Ex: João da Silva" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone (Opcional)</FormLabel>
                    <FormControl>
                      <Input id="phone" placeholder="(99) 99999-9999" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea id="notes" placeholder="Ex: Cliente prefere mesa perto da janela." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                <Button type="submit">Salvar</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {clientToDelete && (
        <AlertDialog open={!!clientToDelete} onOpenChange={() => setClientToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover o cliente "{clientToDelete.name}"? Todas as dívidas arquivadas dele também serão removidas. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteClient} className="bg-destructive hover:bg-destructive/90">
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {viewingDebtClient && (
        <DebtDetailsDialog
          client={viewingDebtClient}
          isOpen={!!viewingDebtClient}
          onOpenChange={() => setViewingDebtClient(null)}
          onSettleDebt={() => setIsPaymentDialogOpen(true)}
        />
      )}
      
       <PaymentDialog
        isOpen={isPaymentDialogOpen}
        onOpenChange={(open) => {
            if (!open) {
                setIsPaymentDialogOpen(false);
                 // Optionally refetch data if payment might have been completed
                if(viewingDebtClient) fetchData();
                setViewingDebtClient(null);
            } else {
                setIsPaymentDialogOpen(true);
            }
        }}
        totalAmount={viewingDebtClient?.debtAmount || 0}
        currentOrder={debtOrderForPayment}
        onSubmit={(details) => {
            handleSettleDebt(details);
        }}
        allowCredit={false}
        allowPartialPayment={false}
      />
    </>
  );
}

interface DebtDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  onSettleDebt: () => void;
}

function DebtDetailsDialog({ isOpen, onOpenChange, client, onSettleDebt }: DebtDetailsDialogProps) {
  const archivedOrders = useMemo(() => {
    return getArchivedOrders().filter(order => order.clientId === client.id)
      .sort((a, b) => (toValidDate(b.createdAt)?.getTime() ?? 0) - (toValidDate(a.createdAt)?.getTime() ?? 0));
  }, [client.id]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Extrato de Dívida: {client.name}</DialogTitle>
          <DialogDescription>
            Abaixo estão as comandas arquivadas que compõem o saldo devedor de <strong className="text-foreground">{formatCurrency(client.debtAmount || 0)}</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {archivedOrders.length > 0 ? (
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {archivedOrders.map(order => (
                <Card key={order.id}>
                  <CardHeader className="p-4">
                    <CardTitle className="text-base flex justify-between">
                      <span>Comanda: {order.name}</span>
                      <span>{formatCurrency(order.items.reduce((sum, item) => sum + item.price * item.quantity, 0))}</span>
                    </CardTitle>
                    <CardDescription>
                      Arquivada em: {toValidDate(order.createdAt) ? format(toValidDate(order.createdAt)!, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'Data indisponível'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 text-xs">
                    <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                      {order.items.filter(item => item.price > 0).map(item => (
                        <li key={item.id}>
                          {item.quantity}x {item.name} ({formatCurrency(item.price * item.quantity)})
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Nenhuma comanda arquivada encontrada para este cliente.</p>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Fechar</Button></DialogClose>
          <Button onClick={onSettleDebt} disabled={(client.debtAmount || 0) <= 0}>
            Quitar Dívida Total ({formatCurrency(client.debtAmount || 0)})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
