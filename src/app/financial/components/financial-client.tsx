
"use client";

import type { FinancialEntry, SecondaryCashBox, BankAccount, CashRegisterStatus, Sale } from '@/types';
import { 
  getFinancialEntries, saveFinancialEntries, formatCurrency, 
  getSecondaryCashBox, saveSecondaryCashBox, 
  getBankAccount, saveBankAccount,
  getCashRegisterStatus, saveCashRegisterStatus, getSales
} from '@/lib/constants';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, TrendingDown, MoreHorizontal, Download, Edit, Landmark, PiggyBank, Wallet, Banknote } from 'lucide-react';
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
import { downloadAsCSV } from '@/lib/utils';
import { Label } from '@/components/ui/label';

const expenseSchema = z.object({
  description: z.string().min(3, { message: "A descrição deve ter pelo menos 3 caracteres." }),
  amount: z.coerce.number().positive({ message: "O valor deve ser positivo." }),
  source: z.enum(['daily_cash', 'secondary_cash', 'bank_account'], {
    required_error: "Você precisa selecionar a origem da despesa."
  }),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

const SOURCE_MAP: Record<ExpenseFormData['source'], string> = {
  daily_cash: 'Caixa Principal',
  secondary_cash: 'Caixa 02',
  bank_account: 'Conta Bancária',
};

export default function FinancialClient() {
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [secondaryCashBox, setSecondaryCashBox] = useState<SecondaryCashBox>({ balance: 0 });
  const [bankAccount, setBankAccount] = useState<BankAccount>({ balance: 0 });
  const [cashStatus, setCashStatus] = useState<CashRegisterStatus>({ status: 'closed' });
  const [sales, setSales] = useState<Sale[]>([]);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<FinancialEntry | null>(null);
  const [isEditCaixa02DialogOpen, setIsEditCaixa02DialogOpen] = useState(false);
  const [isEditBankAccountDialogOpen, setIsEditBankAccountDialogOpen] = useState(false);

  const { toast } = useToast();
  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { description: '', amount: 0, source: 'daily_cash' },
  });

  useEffect(() => {
    const handleStorageChange = () => {
      setEntries(getFinancialEntries());
      setSecondaryCashBox(getSecondaryCashBox());
      setBankAccount(getBankAccount());
      setCashStatus(getCashRegisterStatus());
      setSales(getSales());
    };
    handleStorageChange();

    window.addEventListener('financialEntriesChanged', handleStorageChange);
    window.addEventListener('secondaryCashBoxChanged', handleStorageChange);
    window.addEventListener('bankAccountChanged', handleStorageChange);
    window.addEventListener('cashRegisterStatusChanged', handleStorageChange);
    window.addEventListener('salesChanged', handleStorageChange);

    return () => {
      window.removeEventListener('financialEntriesChanged', handleStorageChange);
      window.removeEventListener('secondaryCashBoxChanged', handleStorageChange);
      window.removeEventListener('bankAccountChanged', handleStorageChange);
      window.removeEventListener('cashRegisterStatusChanged', handleStorageChange);
      window.removeEventListener('salesChanged', handleStorageChange);
    };
  }, []);
  
  const expectedCashInDrawer = useMemo(() => {
    if (cashStatus.status !== 'open' || !cashStatus.openingTime) return 0;
    
    const openingTime = new Date(cashStatus.openingTime);
    const sessionSales = sales.filter(sale => new Date(sale.timestamp) >= openingTime);
    
    const cashRevenue = sessionSales.filter(s => s.paymentMethod === 'cash').reduce((sum, s) => sum + s.totalAmount, 0);
    const openingBalance = cashStatus.openingBalance || 0;
    const adjustments = cashStatus.adjustments || [];
    const totalIn = adjustments.filter(a => a.type === 'in').reduce((sum, a) => sum + a.amount, 0);
    const totalOut = adjustments.filter(a => a.type === 'out').reduce((sum, a) => sum + a.amount, 0);
    
    return openingBalance + cashRevenue + totalIn - totalOut;
  }, [cashStatus, sales]);

  const handleAddExpense = (data: ExpenseFormData) => {
    // Check for sufficient funds
    if (data.source === 'daily_cash') {
      if (cashStatus.status !== 'open') {
        toast({ title: "Ação Bloqueada", description: "O caixa principal está fechado. Não é possível registrar uma despesa dele.", variant: "destructive" });
        return;
      }
      if (expectedCashInDrawer < data.amount) {
        toast({ title: "Saldo Insuficiente", description: "O caixa principal não tem saldo suficiente para esta despesa.", variant: "destructive" });
        return;
      }
    } else if (data.source === 'secondary_cash' && secondaryCashBox.balance < data.amount) {
      toast({ title: "Saldo Insuficiente", description: "O Caixa 02 não tem saldo suficiente para esta despesa.", variant: "destructive" });
      return;
    } else if (data.source === 'bank_account' && bankAccount.balance < data.amount) {
      toast({ title: "Saldo Insuficiente", description: "A conta bancária não tem saldo suficiente para esta despesa.", variant: "destructive" });
      return;
    }

    // Deduct from source
    if (data.source === 'daily_cash' && cashStatus.status === 'open') {
      const sangriaAdjustment = {
        id: `adj-exp-${Date.now()}`,
        amount: data.amount,
        type: 'out' as 'out',
        description: `Despesa: ${data.description}`,
        timestamp: new Date().toISOString()
      };
      const updatedStatus = { ...cashStatus, adjustments: [...(cashStatus.adjustments || []), sangriaAdjustment]};
      saveCashRegisterStatus(updatedStatus);
    } else if (data.source === 'secondary_cash') {
      saveSecondaryCashBox({ balance: secondaryCashBox.balance - data.amount });
    } else if (data.source === 'bank_account') {
      saveBankAccount({ balance: bankAccount.balance - data.amount });
    }

    // Add to financial entries log
    const newEntry: FinancialEntry = {
      id: `exp-${Date.now()}`,
      description: data.description,
      amount: data.amount,
      type: 'expense',
      source: data.source,
      timestamp: new Date(),
    };
    saveFinancialEntries([...entries, newEntry]);
    
    toast({ title: "Despesa Adicionada", description: "Sua nova despesa foi registrada com sucesso." });
    setIsDialogOpen(false);
    form.reset({ description: '', amount: 0, source: 'daily_cash' });
  };
  
  const handleEditCaixa02 = (newBalance: number) => {
    saveSecondaryCashBox({ balance: newBalance });
    toast({ title: "Caixa 02 Atualizado", description: `O saldo foi definido para ${formatCurrency(newBalance)}.` });
    setIsEditCaixa02DialogOpen(false);
  }

  const handleEditBankAccount = (newBalance: number) => {
    saveBankAccount({ balance: newBalance });
    toast({ title: "Conta Bancária Atualizada", description: `O saldo foi definido para ${formatCurrency(newBalance)}.` });
    setIsEditBankAccountDialogOpen(false);
  }

  const handleDeleteEntry = () => {
    if (!entryToDelete) return;
    // Note: This does NOT revert the balance deduction. That is intentional.
    // Deleting an entry is for correcting logging mistakes, not for voiding transactions.
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
    const headers = ['ID', 'Descrição', 'Data', 'Origem', 'Valor (R$)'];
    const dataToExport = sortedEntries.map(entry => [
      entry.id,
      entry.description,
      format(new Date(entry.timestamp), "dd/MM/yyyy HH:mm:ss", { locale: ptBR }),
      SOURCE_MAP[entry.source],
      entry.amount.toFixed(2).replace('.', ',')
    ]);

    const formattedDate = format(new Date(), 'yyyy-MM-dd');
    downloadAsCSV(headers, dataToExport, `relatorio_despesas_${formattedDate}.csv`);
    toast({ title: "Relatório Exportado", description: "O arquivo CSV foi baixado com sucesso." });
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Caixa Principal (Aberto)</CardTitle>
                <Banknote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(expectedCashInDrawer)}</div>
                <p className="text-xs text-muted-foreground">Status: <span className="font-semibold capitalize">{cashStatus.status === 'open' ? `Aberto` : 'Fechado'}</span></p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Saldo Caixa 02</CardTitle>
                <Button variant="ghost" size="icon" className="h-7 w-7 -mr-4" onClick={() => setIsEditCaixa02DialogOpen(true)}><Edit className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(secondaryCashBox.balance)}</div>
                <p className="text-xs text-muted-foreground">Saldo em seu caixa secundário.</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Saldo Conta Bancária</CardTitle>
                <Button variant="ghost" size="icon" className="h-7 w-7 -mr-4" onClick={() => setIsEditBankAccountDialogOpen(true)}><Edit className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(bankAccount.balance)}</div>
                <p className="text-xs text-muted-foreground">Saldo total na sua conta.</p>
            </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Despesas Registradas</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(entries.reduce((s, e) => s + e.amount, 0))}</div>
            <p className="text-xs text-muted-foreground">Soma de todas as saídas no histórico.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Histórico de Despesas</CardTitle>
            <CardDescription>
              Visualize todas as suas saídas registradas.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportCSV}>
                <Download className="mr-2 h-4 w-4" /> Exportar CSV
            </Button>
            <Button onClick={() => {
              form.reset({ description: '', amount: 0, source: 'daily_cash' });
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
                <TableHead>Origem</TableHead>
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
                  <TableCell>{SOURCE_MAP[entry.source]}</TableCell>
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
                  <TableCell colSpan={5} className="h-24 text-center">
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
              Registre uma saída (ex: pagamento de fornecedor, compra de insumos).
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
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Origem do Dinheiro</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl><RadioGroupItem value="daily_cash" /></FormControl>
                          <FormLabel className="font-normal flex items-center gap-2"><Wallet className="h-4 w-4"/> Caixa Principal ({formatCurrency(expectedCashInDrawer)})</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl><RadioGroupItem value="secondary_cash" /></FormControl>
                          <FormLabel className="font-normal flex items-center gap-2"><PiggyBank className="h-4 w-4"/> Caixa 02 ({formatCurrency(secondaryCashBox.balance)})</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl><RadioGroupItem value="bank_account" /></FormControl>
                          <FormLabel className="font-normal flex items-center gap-2"><Landmark className="h-4 w-4"/> Conta Bancária ({formatCurrency(bankAccount.balance)})</FormLabel>
                        </FormItem>
                      </RadioGroup>
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
                Tem certeza que deseja remover o lançamento "{entryToDelete.description}"? A remoção não estornará o valor do caixa de origem. Esta ação não pode ser desfeita.
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

      <EditBalanceDialog
        isOpen={isEditCaixa02DialogOpen}
        onOpenChange={setIsEditCaixa02DialogOpen}
        currentBalance={secondaryCashBox.balance}
        onSave={handleEditCaixa02}
        title="Editar Saldo do Caixa 02"
        description="Ajuste o valor total do seu caixa secundário."
        idPrefix="caixa02"
      />
      <EditBalanceDialog
        isOpen={isEditBankAccountDialogOpen}
        onOpenChange={setIsEditBankAccountDialogOpen}
        currentBalance={bankAccount.balance}
        onSave={handleEditBankAccount}
        title="Editar Saldo da Conta Bancária"
        description="Ajuste o saldo total da sua conta bancária."
        idPrefix="bank"
      />
    </>
  );
}

function EditBalanceDialog({ isOpen, onOpenChange, currentBalance, onSave, title, description, idPrefix }: { isOpen: boolean, onOpenChange: (open: boolean) => void, currentBalance: number, onSave: (newBalance: number) => void, title: string, description: string, idPrefix: string }) {
  const [balance, setBalance] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    if(isOpen) {
      setBalance(String(currentBalance));
    }
  }, [isOpen, currentBalance])

  const handleSubmit = () => {
    const balanceValue = parseFloat(balance.replace(',', '.'));
    if (isNaN(balanceValue) || balanceValue < 0) {
      toast({ title: "Valor Inválido", description: "Por favor, insira um saldo válido.", variant: 'destructive' });
      return;
    }
    onSave(balanceValue);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
        <div className="py-4 space-y-2">
          <Label htmlFor={`${idPrefix}-balance-edit`}>Novo Saldo Total (R$)</Label>
          <Input id={`${idPrefix}-balance-edit`} value={balance} onChange={(e) => setBalance(e.target.value)} type="number" step="0.01" placeholder="0,00" autoFocus />
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
          <Button onClick={handleSubmit}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    