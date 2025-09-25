

"use client";

import type { Sale, FinancialEntry, SecondaryCashBox, BankAccount, CashRegisterStatus } from '@/types';
import { 
  getSales, saveSales, getFinancialEntries, formatCurrency, PAYMENT_METHODS, 
  getSecondaryCashBox, getBankAccount, getCashRegisterStatus, removeSale
} from '@/lib/constants';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
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
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { DatePickerWithRange } from '@/components/ui/date-picker-range'; 
import type { DateRange } from "react-day-picker";
import { addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Download, ListFilter, MoreHorizontal, Trash2, TrendingDown, DollarSign, Scale, BarChart, Landmark, PiggyBank, Banknote, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
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
import { downloadAsCSV } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import { SummaryTable } from './summary-table';


const SOURCE_MAP: Record<FinancialEntry['source'], string> = {
  daily_cash: 'Caixa Principal',
  secondary_cash: 'Caixa 02',
  bank_account: 'Conta Bancária',
};


export default function ReportsClient() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [financialEntries, setFinancialEntries] = useState<FinancialEntry[]>([]);
  const [cashStatus, setCashStatus] = useState<CashRegisterStatus>({ status: 'closed' });
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string[]>([]);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);

  const loadData = useCallback(() => {
      setIsMounted(false);
      try {
          setSales(getSales());
          setFinancialEntries(getFinancialEntries());
          setCashStatus(getCashRegisterStatus());
      } catch (error) {
          console.error("Failed to load report data from localStorage:", error);
          toast({ title: "Erro ao carregar dados", description: "Não foi possível buscar os dados para os relatórios.", variant: "destructive" });
      } finally {
          setIsMounted(true);
      }
  }, [toast]);

  useEffect(() => {
    loadData();
    setDateRange({
      from: addDays(new Date(), -30),
      to: new Date(),
    });

    const handleStorageChange = () => {
        loadData();
    }
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadData]);

  const filterByDate = <T extends { timestamp: Date | string }>(items: T[]) => {
    if (!dateRange || !dateRange.from) return items;
    return items.filter(item => {
      const itemDate = new Date(item.timestamp);
      const fromDate = new Date(dateRange.from!);
      fromDate.setHours(0,0,0,0);
      if (itemDate < fromDate) return false;
      if (dateRange?.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        if (itemDate > toDate) return false;
      }
      return true;
    });
  };

  const filteredSales = useMemo(() => {
    const dateFiltered = filterByDate(sales) as Sale[];
    return dateFiltered.filter(sale => {
      if (paymentMethodFilter.length === 0) return true;
      return sale.payments.some(p => paymentMethodFilter.includes(p.method));
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [sales, dateRange, paymentMethodFilter]);

  const filteredEntries = useMemo(() => {
    return (filterByDate(financialEntries) as FinancialEntry[]).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [financialEntries, dateRange]);


  const { totalRevenue, otherIncome, totalExpenses, netBalance } = useMemo(() => {
    const salesRevenue = filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const incomeEntries = filteredEntries.filter(e => e.type === 'income' && !e.saleId);
    const expensesEntries = filteredEntries.filter(e => e.type === 'expense');

    const otherIncomeTotal = incomeEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const totalExpensesTotal = expensesEntries.reduce((sum, entry) => sum + entry.amount, 0);
    
    const netBalanceCalc = salesRevenue + otherIncomeTotal - totalExpensesTotal;

    return { totalRevenue: salesRevenue, otherIncome: otherIncomeTotal, totalExpenses: totalExpensesTotal, netBalance: netBalanceCalc };
  }, [filteredSales, filteredEntries]);


  const secondaryCashBoxBalance = useMemo(() => 
    financialEntries
      .filter(e => e.source === 'secondary_cash')
      .reduce((acc, e) => acc + (e.type === 'income' ? e.amount : -e.amount), 0), 
    [financialEntries]
  );
  
  const bankAccountBalance = useMemo(() => 
    financialEntries
      .filter(e => e.source === 'bank_account')
      .reduce((acc, e) => acc + (e.type === 'income' ? e.amount : -e.amount), 0),
    [financialEntries]
  );

  const expectedCashInDrawer = useMemo(() => {
    if (cashStatus.status !== 'open' || !cashStatus.openingTime) return 0;
    
    const openingTime = new Date(cashStatus.openingTime).getTime();
    
    // This logic now mirrors the one in cash-register-client.tsx
    return financialEntries
        .filter(e => e.source === 'daily_cash' && new Date(e.timestamp).getTime() >= openingTime)
        .reduce((acc, e) => acc + (e.type === 'income' ? e.amount : -e.amount), 0);
  }, [cashStatus, financialEntries]);


  const totalGlobalBalance = useMemo(() => {
    return expectedCashInDrawer + secondaryCashBoxBalance + bankAccountBalance;
  }, [expectedCashInDrawer, secondaryCashBoxBalance, bankAccountBalance]);

  const { monthlySummary, weeklySummary } = useMemo(() => {
    const processEntries = (entries: FinancialEntry[], periodFormat: "yyyy-MM" | "yyyy-MM-dd", labelFormat: string, startOfWeek: boolean = false) => {
        const salesEntries = entries.filter(e => e.saleId && e.type === 'income');
        const otherIncomes = entries.filter(e => !e.saleId && e.type === 'income');
        const allExpenses = entries.filter(e => e.type === 'expense');

        const combined = [...salesEntries, ...otherIncomes, ...allExpenses];

        const grouped = combined.reduce((acc, item) => {
            let key, label;
            const date = new Date(item.timestamp);
            
            if (startOfWeek) {
                const day = date.getDay();
                const diff = date.getDate() - day + (day === 0 ? -6 : 1); 
                const weekStart = new Date(date.setDate(diff));
                weekStart.setHours(0,0,0,0);
                const weekEnd = addDays(weekStart, 6);
                key = format(weekStart, periodFormat);
                label = `${format(weekStart, 'dd/MM/yy')} - ${format(weekEnd, 'dd/MM/yy')}`;
            } else {
                key = format(date, periodFormat);
                label = format(date, labelFormat, { locale: ptBR });
            }

            if (!acc[key]) acc[key] = { period: label, income: 0, expenses: 0 };
            
            if (item.type === 'income') {
                acc[key].income += item.amount;
            } else if (item.type === 'expense') {
                acc[key].expenses += item.amount;
            }

            return acc;
        }, {} as Record<string, { period: string, income: number, expenses: number }>);
        
        return Object.values(grouped).sort((a,b) => new Date(b.period.slice(0,10)).getTime() - new Date(a.period.slice(0,10)).getTime());
    };

    const monthly = processEntries(filteredEntries, "yyyy-MM", "MMMM yyyy");
    const weekly = processEntries(filteredEntries, "yyyy-MM-dd", "", true);

    const processSummary = (group: any) => Object.entries(group)
      .map(([key, value]: [string, any]) => ({ ...value, key, balance: value.income - value.expenses }))
      .sort((a, b) => b.key.localeCompare(a.key));
      
    return {
      monthlySummary: processSummary(monthly),
      weeklySummary: processSummary(weekly)
    };
  }, [filteredEntries]);


  const confirmDeleteSale = (sale: Sale) => setSaleToDelete(sale);

  const handleDeleteSale = () => {
    if (!saleToDelete) return;
    removeSale(saleToDelete.id);
    loadData();
    toast({
      title: "Venda Removida",
      description: "A venda e seu impacto financeiro foram revertidos.",
      variant: "destructive"
    });
    setSaleToDelete(null);
  };
  
  const handleExportSalesCSV = () => {
    if (filteredSales.length === 0) {
      toast({ title: "Nenhuma venda para exportar", variant: "destructive" });
      return;
    }
    const headers = ['ID Venda', 'Data', 'Itens Qtd', 'Métodos Pag.', 'Valor Original (R$)', 'Desconto (R$)', 'Valor Final (R$)'];
    const data = filteredSales.map(s => {
      const paymentMethods = s.payments.map(p => PAYMENT_METHODS.find(pm => pm.value === p.method)?.name || p.method).join(' / ');
      return [
        s.id,
        format(new Date(s.timestamp), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
        s.items.reduce((sum, item) => sum + item.quantity, 0),
        paymentMethods,
        s.originalAmount.toFixed(2).replace('.',','),
        s.discountAmount.toFixed(2).replace('.',','),
        s.totalAmount.toFixed(2).replace('.',','),
      ];
    });
    downloadAsCSV(headers, data, `relatorio_vendas_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    toast({ title: "Relatório de Vendas Exportado" });
  };
  
  const handleExportGeneralReport = () => {
    const combinedData = [
      ...filteredSales.map(sale => {
        const itemsDesc = sale.items.map(item => `${item.quantity}x ${item.name}`).join(', ');
        const paymentMethods = sale.payments.map(p => `${PAYMENT_METHODS.find(pm => pm.value === p.method)?.name || p.method}: ${formatCurrency(p.amount)}`).join('; ');
        return {
          timestamp: new Date(sale.timestamp),
          description: `Venda #${sale.id.slice(-6)} (${itemsDesc})`,
          type: 'Receita',
          amount: sale.totalAmount,
          source: paymentMethods
        };
      }),
      ...filteredEntries.filter(e => e.type === 'expense').map(entry => ({
        timestamp: new Date(entry.timestamp),
        description: entry.description,
        type: 'Despesa',
        amount: entry.amount,
        source: SOURCE_MAP[entry.source]
      })),
       ...filteredEntries.filter(e => e.type === 'income' && !e.saleId).map(entry => ({
        timestamp: new Date(entry.timestamp),
        description: entry.description,
        type: 'Entrada',
        amount: entry.amount,
        source: SOURCE_MAP[entry.source]
      })),
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (combinedData.length === 0) {
      toast({ title: "Nenhum dado para exportar", variant: "destructive" });
      return;
    }

    const filename = `relatorio_geral_${format(new Date(), 'yyyy-MM-dd')}`;
    const headers = ['Data', 'Descrição', 'Tipo', 'Origem/Método', 'Valor (R$)'];
    
    const csvData = combinedData.map(item => [
      format(item.timestamp, "dd/MM/yyyy HH:mm:ss", { locale: ptBR }),
      item.description,
      item.type,
      item.source,
      (item.type === 'Receita' || item.type === 'Entrada' ? item.amount : -item.amount).toFixed(2).replace('.', ','),
    ]);
    downloadAsCSV(headers, csvData, `${filename}.csv`);
    toast({ title: "Relatório Geral CSV Exportado" });
  };


  if (!isMounted) return <p>Carregando relatórios...</p>;

  return (
    <div className="space-y-6">

      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Situação Financeira Atual</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Saldo Total (Geral)</CardTitle>
                    <Scale className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(totalGlobalBalance)}</div>
                    <p className="text-xs text-muted-foreground">Caixa Principal + Caixa 02 + Banco</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Caixa Principal (Aberto)</CardTitle>
                    <Banknote className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(expectedCashInDrawer)}</div>
                    <p className="text-xs text-muted-foreground">Status: <span className="capitalize">{cashStatus.status === 'open' ? 'Aberto' : 'Fechado'}</span></p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Saldo Caixa 02</CardTitle>
                    <PiggyBank className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(secondaryCashBoxBalance)}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Saldo Conta Bancária</CardTitle>
                    <Landmark className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(bankAccountBalance)}</div>
                </CardContent>
            </Card>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Balanço por Período</CardTitle>
          <CardDescription>Use os filtros para analisar um período específico.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2 lg:col-span-1">
            <Label className="mb-1 block">Período</Label>
            <DatePickerWithRange date={dateRange} onDateChange={setDateRange} className="w-full" />
          </div>
          <div>
            <Label className="mb-1 block">Método de Pagamento (Vendas)</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {paymentMethodFilter.length === 0 ? "Todos os Métodos" : `${paymentMethodFilter.length} selecionados`}
                  <ListFilter className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>Métodos de Pagamento</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {PAYMENT_METHODS.map((method) => (
                  <DropdownMenuCheckboxItem key={method.value} checked={paymentMethodFilter.includes(method.value)} onCheckedChange={(checked) => setPaymentMethodFilter(prev => checked ? [...prev, method.value] : prev.filter(m => m !== method.value))}>
                    <method.icon className="mr-2 h-4 w-4" />
                    {method.name}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" className="w-full">
                  <Download className="mr-2 h-4 w-4" /> Exportar Relatórios
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Escolha o Relatório</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleExportGeneralReport}>
                    Exportar Geral (CSV)
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleExportSalesCSV}>
                    Exportar Apenas Vendas (CSV)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </CardContent>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Receita de Vendas</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
                    <p className="text-xs text-muted-foreground">Faturamento de vendas no período.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Outras Entradas</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(otherIncome)}</div>
                    <p className="text-xs text-muted-foreground">Suprimentos e ajustes manuais.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Despesas Totais</CardTitle>
                    <TrendingDown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-destructive">{formatCurrency(totalExpenses)}</div>
                    <p className="text-xs text-muted-foreground">Saídas, taxas e despesas manuais.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Balanço Líquido</CardTitle>
                    <Scale className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                    {formatCurrency(netBalance)}
                    </div>
                    <p className="text-xs text-muted-foreground">(Vendas + Entradas) - Despesas</p>
                </CardContent>
            </Card>
        </CardContent>
      </Card>

      <Accordion type="multiple" className="w-full space-y-4">
        <Card>
          <AccordionItem value="monthly-summary" className="border-b-0">
            <AccordionTrigger className="p-6">
                <CardHeader className="p-0 text-left">
                    <CardTitle>Resumo Mensal</CardTitle>
                    <CardDescription>Balanço de receitas e despesas agrupadas por mês.</CardDescription>
                </CardHeader>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
                <SummaryTable data={monthlySummary} />
            </AccordionContent>
          </AccordionItem>
        </Card>
        <Card>
          <AccordionItem value="weekly-summary" className="border-b-0">
            <AccordionTrigger className="p-6">
                <CardHeader className="p-0 text-left">
                    <CardTitle>Resumo Semanal</CardTitle>
                    <CardDescription>Balanço de receitas e despesas agrupadas por semana.</CardDescription>
                </CardHeader>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
                <SummaryTable data={weeklySummary} />
            </AccordionContent>
          </AccordionItem>
        </Card>
      </Accordion>
      
      <Card>
        <CardHeader className="flex-row items-center justify-between">
            <div>
                <CardTitle>Detalhes das Vendas</CardTitle>
                <CardDescription>Lista de todas as vendas realizadas no período selecionado.</CardDescription>
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead>Método Pag.</TableHead>
                <TableHead className="text-right">Desconto</TableHead>
                <TableHead className="text-right">Valor Final</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.length > 0 ? filteredSales.map(sale => (
                <TableRow key={sale.id}>
                  <TableCell>{format(new Date(sale.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                  <TableCell>{sale.items.reduce((sum, item) => sum + item.quantity, 0)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                        {sale.payments.map(p => (
                            <Badge key={p.method} variant="outline" className="capitalize">
                                {PAYMENT_METHODS.find(pm => pm.value === p.method)?.name || p.method}
                            </Badge>
                        ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-destructive">{sale.discountAmount > 0 ? `- ${formatCurrency(sale.discountAmount)}` : formatCurrency(0)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(sale.totalAmount)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Menu</span></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuItem className="text-destructive" onClick={() => confirmDeleteSale(sale)}><Trash2 className="mr-2 h-4 w-4" /> Remover</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={6} className="h-24 text-center">Nenhuma venda encontrada.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter><div className="text-xs text-muted-foreground">Mostrando <strong>{filteredSales.length}</strong> vendas.</div></CardFooter>
      </Card>

      {saleToDelete && (
        <AlertDialog open={!!saleToDelete} onOpenChange={() => setSaleToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Remoção de Venda</AlertDialogTitle>
              <AlertDialogDescription>Tem certeza que deseja remover esta venda do relatório? Esta ação não pode ser desfeita e irá estornar os valores da conta bancária e/ou caixa, incluindo as taxas.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteSale} className="bg-destructive hover:bg-destructive/90">Remover Venda</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

    

    
