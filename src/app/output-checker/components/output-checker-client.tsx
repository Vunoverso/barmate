"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { FinancialEntry, CashRegisterStatus, CashAdjustment } from '@/types';
import { getFinancialEntries, getCashRegisterStatus, saveCashRegisterStatus, addFinancialEntry } from '@/lib/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, Search, PlusCircle, Banknote, PiggyBank, Landmark } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DatePickerWithRange } from '@/components/ui/date-picker-range';
import type { DateRange } from "react-day-picker";
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/lib/constants';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';

// Tipo de resultado para a verificação, agora local.
type VerificationResult = {
  isDuplicate: boolean;
  summary: string;
  foundEntries: {
    id: string;
    date: string;
    description: string;
    amount: number;
  }[];
}

const expenseSchema = z.object({
  description: z.string().min(3, { message: "A descrição deve ter pelo menos 3 caracteres." }),
  amount: z.coerce.number().positive({ message: "O valor deve ser positivo." }),
  source: z.enum(['daily_cash', 'secondary_cash', 'bank_account'], {
    required_error: "Você precisa selecionar a origem da despesa."
  }),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

const SOURCE_MAP: Record<FinancialEntry['source'], string> = {
  daily_cash: 'Caixa Diário',
  secondary_cash: 'Caixa 02',
  bank_account: 'Conta Bancária',
};


export default function OutputCheckerClient() {
  const [allEntries, setAllEntries] = useState<FinancialEntry[]>([]);
  const [pastedText, setPastedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  // State for adding expenses
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [expenseToConfirm, setExpenseToConfirm] = useState<ExpenseFormData | null>(null);
  const [cashStatus, setCashStatus] = useState<CashRegisterStatus>({ status: 'closed' });
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { description: '', amount: 0, source: 'daily_cash' },
  });

  const loadData = useCallback(() => {
    setAllEntries(getFinancialEntries());
    setCashStatus(getCashRegisterStatus());
  }, []);
  
  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- Balance Calculations ---
  const secondaryCashBoxBalance = useMemo(() => {
    return allEntries
      .filter(e => e.source === 'secondary_cash')
      .reduce((acc, e) => acc + (e.type === 'income' ? e.amount : -e.amount), 0);
  }, [allEntries]);
  
  const bankAccountBalance = useMemo(() => {
    return allEntries
      .filter(e => e.source === 'bank_account')
      .reduce((acc, e) => acc + (e.type === 'income' ? e.amount : -e.amount), 0);
  }, [allEntries]);
  
  const expectedCashInDrawer = useMemo(() => {
    if (cashStatus.status !== 'open' || !cashStatus.openingTime) {
      return 0;
    }
    const openingTime = new Date(cashStatus.openingTime);
    const openingBalance = cashStatus.openingBalance || 0;

    const sessionEntries = allEntries.filter(e => e.source === 'daily_cash' && new Date(e.timestamp) >= openingTime);

    const balanceFromMovements = sessionEntries
      .filter(e => e.description !== 'Valor de Abertura')
      .reduce((acc, e) => acc + (e.type === 'income' ? e.amount : -e.amount), 0);
    
    return openingBalance + balanceFromMovements;
  }, [allEntries, cashStatus]);
  // --- End Balance Calculations ---

  const handleVerify = () => {
    if (!pastedText.trim()) {
      toast({ title: "Cole a despesa", description: "A área de texto não pode estar vazia.", variant: "destructive" });
      return;
    }
    if (!dateRange || !dateRange.from) {
        toast({ title: "Selecione um período", description: "Você precisa definir um período para a busca.", variant: "destructive" });
        return;
    }

    setIsLoading(true);
    setVerificationResult(null);

    // 1. Analisa o valor do texto colado.
    const amountRegex = /((?:[0-9]{1,3}(?:\.[0-9]{3})*|[0-9]+)(?:,[0-9]{1,2}))|([0-9]+(?:\.[0-9]{1,2})?)/;
    const match = pastedText.match(amountRegex);

    if (!match) {
        toast({ title: "Valor não encontrado", description: "Não foi possível encontrar um valor numérico no texto colado. Ex: '150,25' ou '150.25'.", variant: "destructive" });
        setIsLoading(false);
        return;
    }
    
    // Normaliza a string para ser analisada: remove pontos de milhares, troca vírgula por ponto.
    const parsedAmount = parseFloat(match[0].replace(/\./g, '').replace(',', '.'));
    
    if (isNaN(parsedAmount)) {
        toast({ title: "Valor inválido", description: "O valor numérico encontrado não é válido.", variant: "destructive" });
        setIsLoading(false);
        return;
    }

    // 2. Filtra as entradas financeiras por data e tipo
    const fromDate = new Date(dateRange.from);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
    toDate.setHours(23, 59, 59, 999);

    const relevantExpenses = allEntries.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        return entry.type === 'expense' && entryDate >= fromDate && entryDate <= toDate;
    });

    // 3. Encontra lançamentos com valor idêntico
    const foundEntries = relevantExpenses.filter(entry => Math.abs(entry.amount - parsedAmount) < 0.01);
    
    const result: VerificationResult = {
        isDuplicate: foundEntries.length > 0,
        summary: foundEntries.length > 0
            ? `Atenção: Encontrei ${foundEntries.length} despesa(s) com valor idêntico.`
            : `Nenhuma despesa com o valor ${formatCurrency(parsedAmount)} foi encontrada neste período.`,
        foundEntries: foundEntries.map(e => ({
            id: e.id,
            date: e.timestamp.toString(),
            description: e.description,
            amount: e.amount,
        }))
    };

    setVerificationResult(result);
    setIsLoading(false);
  };
  
  // --- Add Expense Logic ---
  const handleOpenAddExpenseDialog = () => {
    const amountRegex = /((?:[0-9]{1,3}(?:\.[0-9]{3})*|[0-9]+)(?:,[0-9]{1,2}))|([0-9]+(?:\.[0-9]{1,2})?)/;
    const match = pastedText.match(amountRegex);
    const parsedAmount = match ? parseFloat(match[0].replace(/\./g, '').replace(',', '.')) : 0;
    const parsedDescription = match ? pastedText.replace(match[0], '').replace(/\s+/g, ' ').trim() : pastedText.trim();
    
    form.reset({
        description: parsedDescription,
        amount: parsedAmount,
        source: 'daily_cash'
    });
    setIsExpenseDialogOpen(true);
  }

  const handleAddExpense = (data: ExpenseFormData) => {
    if (data.source === 'daily_cash') {
      setExpenseToConfirm(data);
      return;
    }
    proceedWithAddExpense(data);
  };

  const proceedWithAddExpense = (data: ExpenseFormData) => {
    if (data.source === 'daily_cash') {
      if (cashStatus.status !== 'open') {
        toast({ title: "Ação Bloqueada", description: "O caixa diário está fechado. Não é possível registrar uma despesa dele.", variant: "destructive" });
        return;
      }
      if (expectedCashInDrawer < data.amount) {
        toast({ title: "Saldo Insuficiente", description: "O caixa diário não tem saldo suficiente para esta despesa.", variant: "destructive" });
        return;
      }
    } else if (data.source === 'secondary_cash' && secondaryCashBoxBalance < data.amount) {
      toast({ title: "Saldo Insuficiente", description: "O Caixa 02 não tem saldo suficiente para esta despesa.", variant: "destructive" });
      return;
    } else if (data.source === 'bank_account' && bankAccountBalance < data.amount) {
      toast({ title: "Saldo Insuficiente", description: "A conta bancária não tem saldo suficiente para esta despesa.", variant: "destructive" });
      return;
    }

    const adjustmentId = `adj-exp-${Date.now()}`;
    addFinancialEntry({
      description: data.description,
      amount: data.amount,
      type: 'expense',
      source: data.source,
      saleId: null,
      adjustmentId: data.source === 'daily_cash' ? adjustmentId : null
    });

    if (data.source === 'daily_cash' && cashStatus.status === 'open') {
      const currentCashStatus = getCashRegisterStatus();
      const sangriaAdjustment: CashAdjustment = {
        id: adjustmentId,
        amount: data.amount,
        type: 'out' as 'out',
        description: `Despesa: ${data.description}`,
        timestamp: new Date().toISOString()
      };
      const updatedStatus = { ...currentCashStatus, adjustments: [...(currentCashStatus.adjustments || []), sangriaAdjustment]};
      saveCashRegisterStatus(updatedStatus);
    }
    
    toast({ title: "Despesa Adicionada", description: "Sua nova despesa foi registrada com sucesso." });
    setIsExpenseDialogOpen(false);
    setExpenseToConfirm(null);
    form.reset({ description: '', amount: 0, source: 'daily_cash' });

    // Refresh data and clear UI
    loadData();
    setVerificationResult(null); 
    setPastedText('');
  };


  return (
    <>
      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Conferência de Saídas</CardTitle>
            <CardDescription>
              Cole uma despesa (valor e descrição) e o sistema irá conferir se uma saída com valor idêntico já foi lançada no período selecionado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Período para Verificar</Label>
              <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="output-paste">Cole a despesa aqui</Label>
              <Textarea
                id="output-paste"
                placeholder="Ex:&#10;135,90 mercado&#10;conta de luz 250,00"
                className="min-h-40"
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleVerify} disabled={isLoading}>
              {isLoading ? 'Verificando...' : 'Verificar Despesa'}
              <Search className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Resultado da Verificação</CardTitle>
            <CardDescription>A análise da busca será exibida aqui.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex items-center justify-center">
            {isLoading && <p>Buscando...</p>}
            {!isLoading && !verificationResult && <p className="text-muted-foreground text-center">Aguardando verificação...</p>}
            {verificationResult && (
              <div className="w-full space-y-4">
                <div className={`flex items-center gap-2 p-4 rounded-lg ${verificationResult.isDuplicate ? 'bg-yellow-100 dark:bg-yellow-900/50' : 'bg-green-100 dark:bg-green-900/50'}`}>
                  {verificationResult.isDuplicate ? <AlertCircle className="h-6 w-6 text-yellow-600" /> : <CheckCircle className="h-6 w-6 text-green-600" />}
                  <p className={`font-semibold ${verificationResult.isDuplicate ? 'text-yellow-800 dark:text-yellow-200' : 'text-green-800 dark:text-green-200'}`}>
                    {verificationResult.summary}
                  </p>
                </div>
                
                {verificationResult.foundEntries && verificationResult.foundEntries.length > 0 && (
                  <div>
                      <h3 className="font-semibold mb-2">Despesas Encontradas:</h3>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                          {verificationResult.foundEntries.map((entry) => (
                            <li key={entry.id} className="p-2 border rounded-md">
                              <p><strong>Descrição:</strong> {entry.description}</p>
                              <p><strong>Valor:</strong> {formatCurrency(entry.amount)}</p>
                              <p><strong>Data:</strong> {format(new Date(entry.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                            </li>
                          ))}
                      </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
           {verificationResult && !verificationResult.isDuplicate && pastedText.trim() && (
            <CardFooter>
                    <Button onClick={handleOpenAddExpenseDialog}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Lançar esta Despesa
                    </Button>
            </CardFooter>
           )}
        </Card>
      </div>

      <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Adicionar Nova Despesa</DialogTitle><DialogDescription>Registre uma saída (ex: pagamento de fornecedor, compra de insumos).</DialogDescription></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddExpense)} className="space-y-4 py-4">
              <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Descrição</FormLabel><FormControl><Input placeholder="Ex: Compra de gelo" {...field} autoFocus /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="amount" render={({ field }) => (
                  <FormItem><FormLabel>Valor (R$)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="source" render={({ field }) => (
                  <FormItem className="space-y-3"><FormLabel>Origem do Dinheiro</FormLabel><FormControl>
                      <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                        <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="daily_cash" /></FormControl><FormLabel className="font-normal flex items-center gap-2"><Banknote className="h-4 w-4"/> Caixa Diário ({isBalanceVisible ? formatCurrency(expectedCashInDrawer) : '***'})</FormLabel></FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="secondary_cash" /></FormControl><FormLabel className="font-normal flex items-center gap-2"><PiggyBank className="h-4 w-4"/> Caixa 02 ({isBalanceVisible ? formatCurrency(secondaryCashBoxBalance) : '***'})</FormLabel></FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="bank_account" /></FormControl><FormLabel className="font-normal flex items-center gap-2"><Landmark className="h-4 w-4"/> Conta Bancária ({isBalanceVisible ? formatCurrency(bankAccountBalance) : '***'})</FormLabel></FormItem>
                      </RadioGroup>
                  </FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline" onClick={() => form.reset()}>Cancelar</Button></DialogClose>
                <Button type="submit">Salvar Despesa</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {expenseToConfirm && (
        <AlertDialog open={!!expenseToConfirm} onOpenChange={() => setExpenseToConfirm(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar despesa do Caixa Diário?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Você está prestes a registrar uma saída de <strong>{formatCurrency(expenseToConfirm.amount)}</strong> com a descrição "{expenseToConfirm.description}" diretamente do Caixa Diário. Deseja continuar?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => {
                        proceedWithAddExpense(expenseToConfirm);
                        setExpenseToConfirm(null);
                    }}>
                        Confirmar Saída
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
