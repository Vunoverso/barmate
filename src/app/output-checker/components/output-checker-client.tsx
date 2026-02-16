"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { FinancialEntry, CashRegisterStatus, CashAdjustment } from '@/types';
import { getFinancialEntries, formatCurrency, getCashRegisterStatus, addFinancialEntry, saveCashRegisterStatus, saveFinancialEntries } from '@/lib/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Search, Loader2, AlertTriangle, CheckCircle, PlusCircle, Banknote, PiggyBank, Landmark, Calendar as CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DatePickerWithRange } from '@/components/ui/date-picker-range';
import { addDays, format } from 'date-fns';
import type { DateRange } from "react-day-picker";
import { ptBR } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


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
  const [selectedExpenses, setSelectedExpenses] = useState<Record<string, boolean>>({});

  const [bulkSource, setBulkSource] = useState<'daily_cash' | 'secondary_cash' | 'bank_account'>('daily_cash');
  const [bulkDate, setBulkDate] = useState<Date>(new Date());

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

  const selectedExpenseIds = useMemo(() => Object.keys(selectedExpenses).filter(id => selectedExpenses[id]), [selectedExpenses]);
  const numSelected = selectedExpenseIds.length;

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
    setSelectedExpenses({});

    const from = dateRange.from;
    const to = dateRange.to || from;

    const existingFinancialEntries = getFinancialEntries();

    const relevantEntries = existingFinancialEntries.filter(entry => {
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
  
  const handleBulkLaunch = () => {
      if (numSelected === 0) return;
      
      const expensesToLaunch = verificationResult?.filter(exp => selectedExpenseIds.includes(exp.id)) || [];
      if (expensesToLaunch.length === 0) return;

      const totalAmountToLaunch = expensesToLaunch.reduce((sum, exp) => sum + exp.amount, 0);

      const balances = {
        daily_cash: expectedCashInDrawer,
        secondary_cash: secondaryCashBoxBalance,
        bank_account: bankAccountBalance
      };
      
      if (bulkSource === 'daily_cash' && cashStatus.status !== 'open') {
          toast({ title: "Ação Bloqueada", description: "O caixa diário está fechado.", variant: "destructive" });
          return;
      }
      if (balances[bulkSource] < totalAmountToLaunch) {
          toast({ title: "Saldo Insuficiente", description: `A conta de origem não tem saldo suficiente para lançar ${formatCurrency(totalAmountToLaunch)}.`, variant: "destructive" });
          return;
      }

      const entriesToAdd: Omit<FinancialEntry, 'id'>[] = [];
      const adjustmentsToAdd: CashAdjustment[] = [];

      expensesToLaunch.forEach(expense => {
          const adjustmentId = bulkSource === 'daily_cash' ? `adj-exp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}` : null;
          
          entriesToAdd.push({
              description: expense.description,
              amount: expense.amount,
              type: 'expense',
              source: bulkSource,
              saleId: null,
              adjustmentId: adjustmentId,
              timestamp: bulkDate,
          });

          if (bulkSource === 'daily_cash' && cashStatus.status === 'open' && adjustmentId) {
              adjustmentsToAdd.push({
                  id: adjustmentId, amount: expense.amount, type: 'out' as 'out', description: `Despesa: ${expense.description}`, timestamp: bulkDate.toISOString()
              });
          }
      });

      addFinancialEntry(entriesToAdd);

      if (adjustmentsToAdd.length > 0 && cashStatus.status === 'open') {
          const currentCashStatus = getCashRegisterStatus();
          const updatedStatus = { ...currentCashStatus, adjustments: [...(currentCashStatus.adjustments || []), ...adjustmentsToAdd]};
          saveCashRegisterStatus(updatedStatus);
      }

      toast({ title: `${numSelected} Despesa(s) Lançada(s)!`, description: `${formatCurrency(totalAmountToLaunch)} foi registrado como saída.` });

      const launchedIds = expensesToLaunch.map(e => e.id);
      setVerificationResult(prev => prev!.map(res => launchedIds.includes(res.id) ? { ...res, status: 'added' } : res));
      
      setSelectedExpenses({});
  };

  const toggleAllSelection = (checked: boolean) => {
      if (!verificationResult) return;
      const newSelection: Record<string, boolean> = {};
      if (checked) {
          verificationResult.forEach(res => {
              if (res.status === 'pending' && res.amount > 0) {
                  newSelection[res.id] = true;
              }
          });
      }
      setSelectedExpenses(newSelection);
  };

  const toggleRowSelection = (id: string) => {
      setSelectedExpenses(prev => ({
          ...prev,
          [id]: !prev[id]
      }));
  };

  const handleCancel = () => {
    setPastedText('');
    setVerificationResult(null);
    setSelectedExpenses({});
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
                            <TableHead className="w-[50px]">
                                <Checkbox 
                                    onCheckedChange={(checked) => toggleAllSelection(Boolean(checked))}
                                    checked={numSelected > 0 && numSelected === verificationResult?.filter(r => r.status === 'pending' && r.amount > 0).length}
                                    aria-label="Selecionar tudo"
                                />
                            </TableHead>
                            <TableHead>Despesa Colada</TableHead>
                            <TableHead>Valor Extraído</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {verificationResult.map(res => (
                            <TableRow key={res.id}>
                              <TableCell>
                                <Checkbox 
                                    checked={!!selectedExpenses[res.id]}
                                    onCheckedChange={() => toggleRowSelection(res.id)}
                                    disabled={res.status === 'added' || res.amount <= 0}
                                    aria-label={`Selecionar ${res.description}`}
                                />
                              </TableCell>
                              <TableCell className="text-muted-foreground text-xs">{res.text}</TableCell>
                              <TableCell>{formatCurrency(res.amount)}</TableCell>
                              <TableCell className="text-center">
                                {res.duplicates.length > 0 ? (
                                  <Button variant="outline" size="sm" onClick={() => setViewingDuplicates(res.duplicates)}>
                                    <AlertTriangle className="mr-2 h-4 w-4 text-destructive" />
                                    Ver {res.duplicates.length} suspeita(s) em Saídas
                                  </Button>
                                ) : (
                                  <Badge variant={res.status === 'added' ? 'secondary' : 'default'} className={res.status !== 'added' ? 'bg-green-100 text-green-800' : ''}>
                                    {res.status === 'added' ? 'Lançado' : 'OK'}
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {numSelected > 0 && (
                    <Card className="mt-4 border-primary">
                        <CardHeader>
                            <CardTitle>Lançar Despesas Selecionadas</CardTitle>
                            <CardDescription>
                                Você selecionou {numSelected} despesa(s) totalizando <strong>{formatCurrency(verificationResult!.filter(res => selectedExpenseIds.includes(res.id)).reduce((sum, res) => sum + res.amount, 0))}</strong>.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <div className="space-y-2">
                                <Label htmlFor="bulk-source">Origem do dinheiro</Label>
                                <Select onValueChange={(value) => setBulkSource(value as any)} defaultValue={bulkSource}>
                                    <SelectTrigger id="bulk-source">
                                        <SelectValue placeholder="Selecione a origem..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="daily_cash">Caixa Diário ({formatCurrency(expectedCashInDrawer)})</SelectItem>
                                        <SelectItem value="secondary_cash">Caixa 02 ({formatCurrency(secondaryCashBoxBalance)})</SelectItem>
                                        <SelectItem value="bank_account">Conta Bancária ({formatCurrency(bankAccountBalance)})</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="bulk-date">Data do Lançamento</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button id="bulk-date" variant="outline" className={cn("w-full justify-start text-left font-normal", !bulkDate && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {bulkDate ? format(bulkDate, "dd/MM/yyyy", { locale: ptBR }) : <span>Escolha uma data</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={bulkDate} onSelect={(d) => setBulkDate(d || new Date())} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <Button onClick={handleBulkLaunch}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Lançar {numSelected} despesa(s)
                            </Button>
                        </CardContent>
                    </Card>
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
                    <DialogTitle>Despesas Suspeitas Encontradas nas Saídas</DialogTitle>
                    <DialogDescription>
                        Encontramos as seguintes despesas já cadastradas no período que podem ser a(s) mesma(s). Compare visualmente antes de decidir lançar a nova despesa.
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
    </>
  );
}