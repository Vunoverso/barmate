"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { FinancialEntry, CashRegisterStatus, CashAdjustment } from '@/types';
import { getFinancialEntries, getCashRegisterStatus, saveCashRegisterStatus, addFinancialEntry, formatCurrency } from '@/lib/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Search, PlusCircle, Banknote, PiggyBank, Landmark, Check, ListChecks } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type ParsedExpense = {
  id: number;
  description: string;
  amount: number;
  source: FinancialEntry['source'];
  checked: boolean;
};

const SOURCE_MAP: Record<FinancialEntry['source'], { name: string, icon: React.FC<any> }> = {
  daily_cash: { name: 'Caixa Diário', icon: Banknote },
  secondary_cash: { name: 'Caixa 02', icon: PiggyBank },
  bank_account: { name: 'Conta Bancária', icon: Landmark },
};

export default function OutputCheckerClient() {
  const [allEntries, setAllEntries] = useState<FinancialEntry[]>([]);
  const [pastedText, setPastedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [parsedExpenses, setParsedExpenses] = useState<ParsedExpense[]>([]);
  const [cashStatus, setCashStatus] = useState<CashRegisterStatus>({ status: 'closed' });
  
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

  // --- Balance Calculations ---
  const secondaryCashBoxBalance = useMemo(() => allEntries.filter(e => e.source === 'secondary_cash').reduce((acc, e) => acc + (e.type === 'income' ? e.amount : -e.amount), 0), [allEntries]);
  const bankAccountBalance = useMemo(() => allEntries.filter(e => e.source === 'bank_account').reduce((acc, e) => acc + (e.type === 'income' ? e.amount : -e.amount), 0), [allEntries]);
  const expectedCashInDrawer = useMemo(() => {
    if (cashStatus.status !== 'open' || !cashStatus.openingTime) return 0;
    const openingTime = new Date(cashStatus.openingTime);
    return allEntries.filter(e => e.source === 'daily_cash' && new Date(e.timestamp) >= openingTime).reduce((acc, e) => acc + (e.type === 'income' ? e.amount : -e.amount), 0);
  }, [allEntries, cashStatus]);

  const balances: Record<FinancialEntry['source'], number> = {
    daily_cash: expectedCashInDrawer,
    secondary_cash: secondaryCashBoxBalance,
    bank_account: bankAccountBalance
  };

  const handleParseText = () => {
    if (!pastedText.trim()) {
        toast({ title: "Cole as despesas", description: "A área de texto não pode estar vazia.", variant: "destructive" });
        return;
    }

    const lines = pastedText.trim().split('\n');
    const amountRegex = /(\d{1,3}(\.\d{3})*,\d{2}|\d+,\d{2}|\d+(\.\d+)?)/;
    
    const expenses = lines.map((line, index) => {
        const match = line.match(amountRegex);
        if (!match) return null;

        const amountStr = match[0].replace(/\./g, '').replace(',', '.');
        const amount = parseFloat(amountStr);
        const description = line.replace(match[0], '').replace(/\s+/g, ' ').trim();

        if (isNaN(amount) || !description) return null;

        return {
            id: index,
            description,
            amount,
            source: 'daily_cash' as FinancialEntry['source'],
            checked: true 
        };
    }).filter((item): item is ParsedExpense => item !== null);

    if (expenses.length === 0) {
        toast({ title: "Nenhuma despesa válida encontrada", description: "Verifique o formato. Ex: '150,25 mercado'", variant: "destructive" });
    }

    setParsedExpenses(expenses);
  };
  
  const handleToggleAll = (checked: boolean) => {
    setParsedExpenses(prev => prev.map(exp => ({ ...exp, checked })));
  };

  const handleItemCheckChange = (id: number, checked: boolean) => {
    setParsedExpenses(prev => prev.map(exp => exp.id === id ? { ...exp, checked } : exp));
  };
  
  const handleItemSourceChange = (id: number, source: FinancialEntry['source']) => {
      setParsedExpenses(prev => prev.map(exp => exp.id === id ? { ...exp, source } : exp));
  };

  const handleLaunchExpenses = () => {
    const selectedExpenses = parsedExpenses.filter(e => e.checked);
    if (selectedExpenses.length === 0) {
        toast({ title: "Nenhuma despesa selecionada", variant: "destructive" });
        return;
    }

    const totalsBySource = selectedExpenses.reduce((acc, exp) => {
        acc[exp.source] = (acc[exp.source] || 0) + exp.amount;
        return acc;
    }, {} as Record<FinancialEntry['source'], number>);

    if (totalsBySource.daily_cash && cashStatus.status !== 'open') {
        toast({ title: "Caixa Fechado", description: "Não é possível lançar despesas do Caixa Diário com ele fechado.", variant: "destructive" });
        return;
    }
    for (const source in totalsBySource) {
        if (totalsBySource[source as FinancialEntry['source']] > balances[source as FinancialEntry['source']]) {
            toast({ title: "Saldo Insuficiente", description: `A conta "${SOURCE_MAP[source as FinancialEntry['source']].name}" não tem saldo para o total de ${formatCurrency(totalsBySource[source as FinancialEntry['source']])}.`, variant: "destructive" });
            return;
        }
    }

    const financialEntriesToAdd: Omit<FinancialEntry, 'id' | 'timestamp'>[] = [];
    const adjustmentsToAdd: CashAdjustment[] = [];

    selectedExpenses.forEach(exp => {
        const adjustmentId = exp.source === 'daily_cash' ? `adj-exp-${Date.now()}-${exp.id}` : null;
        financialEntriesToAdd.push({
            description: exp.description,
            amount: exp.amount,
            type: 'expense',
            source: exp.source,
            saleId: null,
            adjustmentId: adjustmentId
        });

        if (adjustmentId) {
            adjustmentsToAdd.push({
                id: adjustmentId,
                amount: exp.amount,
                type: 'out',
                description: `Despesa: ${exp.description}`,
                timestamp: new Date().toISOString()
            });
        }
    });

    addFinancialEntry(financialEntriesToAdd);
    
    if (adjustmentsToAdd.length > 0) {
        const currentCashStatus = getCashRegisterStatus();
        if (currentCashStatus.status === 'open') {
            const updatedStatus = { ...currentCashStatus, adjustments: [...(currentCashStatus.adjustments || []), ...adjustmentsToAdd] };
            saveCashRegisterStatus(updatedStatus);
        }
    }
    
    const totalLaunched = selectedExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    toast({ title: "Despesas Lançadas!", description: `${selectedExpenses.length} despesa(s) no valor total de ${formatCurrency(totalLaunched)} foram registradas com sucesso.` });
    
    setPastedText('');
    setParsedExpenses([]);
    loadData();
  };
  
  const handleCancel = () => {
    setParsedExpenses([]);
    setPastedText('');
  }

  const allChecked = parsedExpenses.length > 0 && parsedExpenses.every(e => e.checked);
  const someChecked = parsedExpenses.some(e => e.checked);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lançamento Rápido de Saídas</CardTitle>
        <CardDescription>
          {parsedExpenses.length === 0
            ? "Cole uma ou mais despesas (uma por linha, com valor e descrição) para analisá-las e lançá-las rapidamente."
            : "Selecione as despesas, defina a origem e lance-as de uma vez."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {parsedExpenses.length === 0 ? (
          <div className="space-y-2">
            <Label htmlFor="output-paste">Cole as despesas aqui</Label>
            <Textarea
              id="output-paste"
              placeholder="Ex:&#10;135,90 mercado&#10;conta de luz 250,00&#10;compra de gelo 50,00"
              className="min-h-48"
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="select-all" 
                checked={allChecked}
                onCheckedChange={(checked) => handleToggleAll(Boolean(checked))}
              />
              <Label htmlFor="select-all">Selecionar Todas as Despesas</Label>
            </div>
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"><span className="sr-only">Selecionar</span></TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-[120px] text-right">Valor</TableHead>
                    <TableHead className="w-[220px]">Origem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedExpenses.map((exp) => (
                    <TableRow key={exp.id}>
                      <TableCell>
                        <Checkbox 
                          checked={exp.checked}
                          onCheckedChange={(checked) => handleItemCheckChange(exp.id, Boolean(checked))}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{exp.description}</TableCell>
                      <TableCell className="text-right">{formatCurrency(exp.amount)}</TableCell>
                      <TableCell>
                        <Select value={exp.source} onValueChange={(value) => handleItemSourceChange(exp.id, value as FinancialEntry['source'])}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(SOURCE_MAP).map(([key, { name, icon: Icon }]) => (
                                <SelectItem key={key} value={key}>
                                    <div className="flex items-center gap-2">
                                        <Icon className="h-4 w-4 text-muted-foreground" />
                                        {name} ({formatCurrency(balances[key as FinancialEntry['source']])})
                                    </div>
                                </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        {parsedExpenses.length === 0 ? (
          <Button onClick={handleParseText} disabled={isLoading}>
            {isLoading ? 'Analisando...' : 'Analisar Despesas'}
            <ListChecks className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={handleCancel}>Cancelar</Button>
            <Button onClick={handleLaunchExpenses} disabled={!someChecked}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Lançar Despesas Selecionadas
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}
