
"use client";

import type { FinancialEntry } from '@/types';
import { getFinancialEntries, saveFinancialEntries, formatCurrency } from '@/lib/constants';
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, TrendingDown, MoreHorizontal, Download } from 'lucide-react';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadAsCSV, downloadAsPDF } from '@/lib/utils';

const expenseSchema = z.object({
  description: z.string().min(3, { message: "A descrição deve ter pelo menos 3 caracteres." }),
  amount: z.coerce.number().positive({ message: "O valor deve ser positivo." }),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

export default function FinancialClient() {
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<FinancialEntry | null>(null);
  const { toast } = useToast();
  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { description: '', amount: 0 },
  });

  useEffect(() => {
    const handleEntriesChange = () => setEntries(getFinancialEntries());
    handleEntriesChange();
    window.addEventListener('financialEntriesChanged', handleEntriesChange);
    return () => window.removeEventListener('financialEntriesChanged', handleEntriesChange);
  }, []);

  const totalExpenses = useMemo(() => {
    return entries
      .filter(e => e.type === 'expense')
      .reduce((sum, e) => sum + e.amount, 0);
  }, [entries]);
  
  const handleAddExpense = (data: ExpenseFormData) => {
    const currentEntries = getFinancialEntries();
    const newEntry: FinancialEntry = {
      id: `exp-${Date.now()}`,
      description: data.description,
      amount: data.amount,
      type: 'expense',
      timestamp: new Date(),
    };
    saveFinancialEntries([...currentEntries, newEntry]);
    toast({ title: "Despesa Adicionada", description: "Sua nova despesa foi registrada." });
    setIsDialogOpen(false);
    form.reset({ description: '', amount: 0 });
  };

  const handleDeleteEntry = () => {
    if (!entryToDelete) return;
    const updatedEntries = entries.filter(e => e.id !== entryToDelete.id);
    saveFinancialEntries(updatedEntries);
    toast({ title: "Registro Removido", description: `O registro foi removido com sucesso.`, variant: "destructive" });
    setEntryToDelete(null);
  };
  
  const sortedEntries = useMemo(() => {
     return [...entries].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [entries]);

  const handleExportCSV = () => {
    if(sortedEntries.length === 0){
      toast({ title: "Nenhum dado para exportar", variant: "destructive" });
      return;
    }
    const headers = ['ID', 'Descrição', 'Data', 'Valor (R$)'];
    const dataToExport = sortedEntries.map(entry => [
      entry.id,
      entry.description,
      format(new Date(entry.timestamp), "dd/MM/yyyy HH:mm:ss", { locale: ptBR }),
      entry.amount.toFixed(2).replace('.', ',')
    ]);

    const formattedDate = format(new Date(), 'yyyy-MM-dd');
    downloadAsCSV(headers, dataToExport, `relatorio_financeiro_${formattedDate}.csv`);
    toast({ title: "Relatório Exportado", description: "O arquivo CSV foi baixado com sucesso." });
  }
  
  const handleExportPDF = async () => {
    if (sortedEntries.length === 0) {
      toast({ title: "Nenhum dado para exportar", variant: "destructive" });
      return;
    }
    const headers = [['ID', 'Descrição', 'Data', 'Valor']];
    const dataToExport = sortedEntries.map(entry => [
      entry.id,
      entry.description,
      format(new Date(entry.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR }),
      `- ${formatCurrency(entry.amount)}`,
    ]);

    const formattedDate = format(new Date(), 'yyyy-MM-dd');
    await downloadAsPDF('Relatório Financeiro (Despesas)', headers, dataToExport, `relatorio_financeiro_${formattedDate}.pdf`);
    toast({ title: "Relatório PDF Exportado", description: "O arquivo PDF foi baixado com sucesso." });
  };


  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Despesas</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">Soma de todas as saídas registradas.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Histórico de Lançamentos</CardTitle>
            <CardDescription>
              Visualize todas as suas despesas registradas.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" /> Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Exportar Relatório Como</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExportCSV}>
                  CSV (.csv)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}>
                  PDF (.pdf)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button onClick={() => {
              form.reset({ description: '', amount: 0 });
              setIsDialogOpen(true)}
            }>
              <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Despesa
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>
                  <span className="sr-only">Ações</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedEntries.length > 0 ? sortedEntries.map(entry => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.description}</TableCell>
                  <TableCell>{format(new Date(entry.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                  <TableCell className="text-right text-destructive font-semibold">
                    - {formatCurrency(entry.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuItem className="text-destructive" onClick={() => setEntryToDelete(entry)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Remover
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    Nenhum lançamento encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Nova Despesa</DialogTitle>
            <DialogDescription>
              Registre uma saída de caixa (ex: pagamento de fornecedor, compra de insumos).
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddExpense)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Compra de gelo" {...field} autoFocus />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" onClick={() => form.reset()}>Cancelar</Button>
                </DialogClose>
                <Button type="submit">Salvar Despesa</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {entryToDelete && (
        <AlertDialog open={!!entryToDelete} onOpenChange={() => setEntryToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover o lançamento "{entryToDelete.description}"? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteEntry} className="bg-destructive hover:bg-destructive/90">
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
