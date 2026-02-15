"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { FinancialEntry, CashRegisterStatus, CashAdjustment } from '@/types';
import { getFinancialEntries, formatCurrency, getCashRegisterStatus, addFinancialEntry, saveCashRegisterStatus } from '@/lib/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Search, Loader2, AlertTriangle, CheckCircle, PlusCircle, Banknote, PiggyBank, Landmark } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DatePickerWithRange } from '@/components/ui/date-picker-range';
import { addDays, format } from 'date-fns';
import type { DateRange } from "react-day-picker";
import { ptBR } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';


type ParsedExpense = {
  id: string;
  text: string;
  amount: number;
  description: string;
  duplicates: FinancialEntry[];
  status: 'pending' | 'added';
};

const parseExpenses = (text: string): Omit<ParsedExpense, 'id' | 'duplicates' | 'status'>[] => {
  const lines = text.split('\n').filter(line => line.trim() !== '');
  return lines.map(line => {
    const match = line.match(/(\d[\d.,]*)/);
    const amount = match ? parseFloat(match[0].replace(/\./g, '').replace(',', '.')) : 0;
    const description = line.replace(match ? match[0] : '', '').replace(/\s\s+/g, ' ').trim();
    return { text: line, amount, description: description || 'Despesa sem descrição' };
  });
};

export default function OutputCheckerClient() {
  const [allEntries, setAllEntries] = useState<FinancialEntry[]>([]);
  const [cashStatus, setCashStatus] = useState<CashRegisterStatus>({ status: 'closed' });
  const [pastedText, setPastedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<ParsedExpense[] | null>(null);
  const [viewingDuplicates, setViewingDuplicates] = useState<FinancialEntry[] | null>(null);
  const [expenseToAdd, setExpenseToAdd] = useState<ParsedExpense | null>(null);
  const [isAddExpenseDialogOpen, setIsAddExpenseDialogOpen] = useState(false);

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  
  const { toast } = useToast();

  const loadData = useCallback(() => {
    setAllEntries(getFinancialEntries());
    setCashStatus(getCashRegisterStatus());
  }, []);
  
  useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    return () => {
      window.removeEventListener('storage', loadData);
    }
  }, [loadData]);
  
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
    if (cashStatus.status !== 'open' || !cashStatus.openingTime) return 0;
    const openingTime = new Date(cashStatus.openingTime);
    return allEntries
      .filter(e => e.source === 'daily_cash' && new Date(e.timestamp) >= openingTime)
      .reduce((acc, e) => acc + (e.type === 'income' ? e.amount : -e.amount), 0);
  }, [allEntries, cashStatus]);


  const handleCheckExpense = () => {
    if (!pastedText.trim()) {
        toast({ title: "Texto vazio", description: "Por favor, cole a despesa que deseja verificar.", variant: "destructive" });
        return;
    }
    if (!dateRange?.from) {
         toast({ title: "Período inválido", description: "Por favor, selecione um período de datas para a verificação.", variant: "destructive" });
        return;
    }

    setIsLoading(true);
    setVerificationResult(null);

    const from = dateRange.from;
    const to = dateRange.to || from;

    const relevantEntries = allEntries.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        const fromDate = new Date(from);
        fromDate.setHours(0, 0, 0, 0);
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        return entry.type === 'expense' && entryDate >= fromDate && entryDate <= toDate;
    });

    const parsed = parseExpenses(pastedText);

    const results = parsed.map((p, index) => {
        const duplicates = relevantEntries.filter(re => {
            if (p.amount > 0 && Math.abs(re.amount - p.amount) < 0.01) return true;
            const parsedWords = p.description.toLowerCase().split(' ').filter(w => w.length > 3);
            if (p.description && parsedWords.length > 0 && parsedWords.some(pw => re.description.toLowerCase().includes(pw))) return true;
            return false;
        });

        return { ...p, id: `res-${Date.now()}-${index}`, duplicates, status: 'pending' };
    });

    setVerificationResult(results);
    setIsLoading(false);
  };

  const handleOpenAddDialog = (expense: ParsedExpense) => {
    setExpenseToAdd(expense);
    setIsAddExpenseDialogOpen(true);
  };
  
  const handleConfirmAddExpense = (source: 'daily_cash' | 'secondary_cash' | 'bank_account') => {
    if (!expenseToAdd) return;
    
    if (source === 'daily_cash') {
      if (cashStatus.status !== 'open') {
        toast({ title: "Ação Bloqueada", description: "O caixa diário está fechado.", variant: "destructive" });
        return;
      }
      if (expectedCashInDrawer < expenseToAdd.amount) {
        toast({ title: "Saldo Insuficiente", description: "O caixa diário não tem saldo para esta despesa.", variant: "destructive" });
        return;
      }
    } else if (source === 'secondary_cash' && secondaryCashBoxBalance < expenseToAdd.amount) {
      toast({ title: "Saldo Insuficiente", description: "O Caixa 02 não tem saldo para esta despesa.", variant: "destructive" });
      return;
    } else if (source === 'bank_account' && bankAccountBalance < expenseToAdd.amount) {
      toast({ title: "Saldo Insuficiente", description: "A conta bancária não tem saldo para esta despesa.", variant: "destructive" });
      return;
    }

    const adjustmentId = `adj-exp-${Date.now()}`;
    addFinancialEntry({
      description: expenseToAdd.description,
      amount: expenseToAdd.amount,
      type: 'expense',
      source: source,
      saleId: null,
      adjustmentId: source === 'daily_cash' ? adjustmentId : null
    });

    if (source === 'daily_cash' && cashStatus.status === 'open') {
      const currentCashStatus = getCashRegisterStatus();
      const sangriaAdjustment: CashAdjustment = {
        id: adjustmentId, amount: expenseToAdd.amount, type: 'out' as 'out', description: `Despesa: ${expenseToAdd.description}`, timestamp: new Date().toISOString()
      };
      const updatedStatus = { ...currentCashStatus, adjustments: [...(currentCashStatus.adjustments || []), sangriaAdjustment]};
      saveCashRegisterStatus(updatedStatus);
    }
    
    toast({ title: "Despesa Lançada!", description: `${formatCurrency(expenseToAdd.amount)} foi registrado como saída de ${source}.` });
    
    setVerificationResult(prev => prev!.map(res => res.id === expenseToAdd.id ? { ...res, status: 'added' } : res));
    setIsAddExpenseDialogOpen(false);
    setExpenseToAdd(null);
  };

  const handleCancel = () => {
    setPastedText('');
    setVerificationResult(null);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Conferência e Lançamento de Saídas</CardTitle>
          <CardDescription>
            Cole suas despesas, verifique se já existem, e lance as novas com apenas alguns cliques.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="output-paste">Cole as despesas aqui (uma por linha)</Label>
                  <Textarea
                  id="output-paste"
                  placeholder="Ex: 150,25 mercado&#10;conta de luz 280,40"
                  className="min-h-24"
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  disabled={isLoading || !!verificationResult}
                  />
              </div>
              <div className="space-y-2">
                  <Label>Período de Verificação</Label>
                  <DatePickerWithRange 
                      date={dateRange} 
                      onDateChange={setDateRange} 
                      className="w-full"
                      disabled={(date) => date > new Date() || date < new Date("2000-01-01")}
                  />
              </div>
          </div>

          {verificationResult && (
              <div>
                  <h3 className="font-semibold mb-2">Resultado da Análise</h3>
                  {verificationResult.length === 0 ? (
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertTitle>Nenhuma despesa para analisar</AlertTitle>
                        <AlertDescription>O texto colado não continha despesas válidas.</AlertDescription>
                      </Alert>
                  ) : (
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Despesa Colada</TableHead>
                            <TableHead>Valor Extraído</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {verificationResult.map(res => (
                            <TableRow key={res.id}>
                              <TableCell className="text-muted-foreground text-xs">{res.text}</TableCell>
                              <TableCell>{formatCurrency(res.amount)}</TableCell>
                              <TableCell className="text-center">
                                {res.duplicates.length > 0 ? (
                                  <Button variant="outline" size="sm" onClick={() => setViewingDuplicates(res.duplicates)}>
                                    <AlertTriangle className="mr-2 h-4 w-4 text-destructive" />
                                    {res.duplicates.length} {res.duplicates.length === 1 ? 'Suspeita' : 'Suspeitas'}
                                  </Button>
                                ) : (
                                  <Badge variant={res.status === 'added' ? 'secondary' : 'default'} className={res.status !== 'added' ? 'bg-green-100 text-green-800' : ''}>
                                    {res.status === 'added' ? 'Lançado' : 'OK'}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenAddDialog(res)}
                                  disabled={res.duplicates.length > 0 || res.status === 'added' || res.amount <= 0}
                                >
                                  <PlusCircle className="mr-2 h-4 w-4" />
                                  Lançar
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
              </div>
          )}

        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          {verificationResult ? (
            <Button variant="outline" onClick={handleCancel}>Fazer Nova Verificação</Button>
          ) : (
              <Button onClick={handleCheckExpense} disabled={isLoading}>
                  {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verificando...</> : <><Search className="mr-2 h-4 w-4" />Analisar Despesas</>}
              </Button>
          )}
        </CardFooter>
      </Card>
      
      {viewingDuplicates && (
        <Dialog open={!!viewingDuplicates} onOpenChange={() => setViewingDuplicates(null)}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Possíveis Despesas Duplicadas</DialogTitle>
                    <DialogDescription>
                        Encontramos as seguintes despesas já lançadas no período que podem ser a mesma. Compare visualmente.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 max-h-96 overflow-y-auto">
                     <div className="border rounded-md overflow-hidden bg-background mt-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Descrição</TableHead>
                                    <TableHead className="text-right">Valor</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {viewingDuplicates.map(entry => (
                                    <TableRow key={entry.id}>
                                        <TableCell>{format(new Date(entry.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                                        <TableCell>{entry.description}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(entry.amount)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                     </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button>Fechar</Button></DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}

      {expenseToAdd && (
        <AddExpenseDialog
          isOpen={isAddExpenseDialogOpen}
          onOpenChange={setIsAddExpenseDialogOpen}
          expense={expenseToAdd}
          onConfirm={handleConfirmAddExpense}
          balances={{ daily: expectedCashInDrawer, secondary: secondaryCashBoxBalance, bank: bankAccountBalance }}
        />
      )}
    </>
  );
}


interface AddExpenseDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    expense: ParsedExpense | null;
    onConfirm: (source: 'daily_cash' | 'secondary_cash' | 'bank_account') => void;
    balances: { daily: number; secondary: number; bank: number; };
}

function AddExpenseDialog({ isOpen, onOpenChange, expense, onConfirm, balances }: AddExpenseDialogProps) {
    const [source, setSource] = useState<'daily_cash' | 'secondary_cash' | 'bank_account'>('daily_cash');

    useEffect(() => {
        if (isOpen) {
            setSource('daily_cash');
        }
    }, [isOpen]);

    const handleSubmit = () => {
        onConfirm(source);
    };

    if (!expense) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Lançar Nova Despesa</DialogTitle>
                    <DialogDescription>Confirme os detalhes e selecione a origem do dinheiro.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <Card>
                        <CardContent className="p-4 space-y-1">
                            <p className="text-sm text-muted-foreground">Descrição</p>
                            <p className="font-medium">{expense.description}</p>
                            <p className="text-sm text-muted-foreground pt-2">Valor</p>
                            <p className="font-bold text-lg text-destructive">- {formatCurrency(expense.amount)}</p>
                        </CardContent>
                    </Card>

                    <div className="space-y-2">
                        <Label>De onde o dinheiro vai sair?</Label>
                        <RadioGroup onValueChange={(value) => setSource(value as any)} defaultValue={source}>
                            <div className="flex items-center space-x-2 p-3 border rounded-md has-[:disabled]:opacity-50">
                                <RadioGroupItem value="daily_cash" id="source-daily" disabled={balances.daily < expense.amount} />
                                <Label htmlFor="source-daily" className="w-full flex justify-between items-center">
                                    <span className="flex items-center gap-2"><Banknote className="h-4 w-4" />Caixa Diário</span>
                                    <span className={balances.daily < expense.amount ? 'text-destructive' : ''}>{formatCurrency(balances.daily)}</span>
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2 p-3 border rounded-md has-[:disabled]:opacity-50">
                                <RadioGroupItem value="secondary_cash" id="source-secondary" disabled={balances.secondary < expense.amount} />
                                <Label htmlFor="source-secondary" className="w-full flex justify-between items-center">
                                    <span className="flex items-center gap-2"><PiggyBank className="h-4 w-4" />Caixa 02</span>
                                     <span className={balances.secondary < expense.amount ? 'text-destructive' : ''}>{formatCurrency(balances.secondary)}</span>
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2 p-3 border rounded-md has-[:disabled]:opacity-50">
                                <RadioGroupItem value="bank_account" id="source-bank" disabled={balances.bank < expense.amount} />
                                <Label htmlFor="source-bank" className="w-full flex justify-between items-center">
                                    <span className="flex items-center gap-2"><Landmark className="h-4 w-4" />Conta Bancária</span>
                                     <span className={balances.bank < expense.amount ? 'text-destructive' : ''}>{formatCurrency(balances.bank)}</span>
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                    <Button onClick={handleSubmit}>Confirmar Lançamento</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
