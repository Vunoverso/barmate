
"use client";

import type { Sale, FinancialEntry } from '@/types';
import { getSales, saveSales, getFinancialEntries, formatCurrency, PAYMENT_METHODS } from '@/lib/constants';
import { useState, useMemo, useEffect } from 'react';
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
import { Download, ListFilter, MoreHorizontal, Trash2, TrendingDown, DollarSign, Scale, BarChart } from 'lucide-react';
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
import { downloadAsCSV, downloadAsPDF } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function ReportsClient() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [financialEntries, setFinancialEntries] = useState<FinancialEntry[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30), 
    to: new Date(),
  });
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string[]>([]);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const handleSalesChange = () => setSales(getSales());
    const handleEntriesChange = () => setFinancialEntries(getFinancialEntries());
    
    handleSalesChange();
    handleEntriesChange();

    window.addEventListener('salesChanged', handleSalesChange);
    window.addEventListener('financialEntriesChanged', handleEntriesChange);
    
    return () => {
      window.removeEventListener('salesChanged', handleSalesChange);
      window.removeEventListener('financialEntriesChanged', handleEntriesChange);
    };
  }, []);

  const filterByDate = (items: (Sale | FinancialEntry)[]) => {
    return items.filter(item => {
      const itemDate = new Date(item.timestamp);
      if (dateRange?.from && itemDate < dateRange.from) return false;
      if (dateRange?.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999); // Include the whole "to" day
        if (itemDate > toDate) return false;
      }
      return true;
    });
  };

  const filteredSales = useMemo(() => {
    const dateFiltered = filterByDate(sales) as Sale[];
    return dateFiltered.filter(sale => {
      if (paymentMethodFilter.length === 0) return true;
      return paymentMethodFilter.includes(sale.paymentMethod);
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [sales, dateRange, paymentMethodFilter]);

  const filteredEntries = useMemo(() => {
    return filterByDate(financialEntries) as FinancialEntry[];
  }, [financialEntries, dateRange]);

  const totalRevenue = useMemo(() => filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0), [filteredSales]);
  const totalExpenses = useMemo(() => filteredEntries.filter(e => e.type === 'expense').reduce((sum, entry) => sum + entry.amount, 0), [filteredEntries]);
  const netBalance = useMemo(() => totalRevenue - totalExpenses, [totalRevenue, totalExpenses]);

  const { monthlySummary, weeklySummary } = useMemo(() => {
    const combinedData = [...filteredSales, ...filteredEntries.filter(e => e.type === 'expense')];
    
    const monthly = combinedData.reduce((acc, item) => {
        const monthKey = format(new Date(item.timestamp), "yyyy-MM");
        const monthLabel = format(new Date(item.timestamp), "MMMM yyyy", { locale: ptBR });

        if (!acc[monthKey]) acc[monthKey] = { period: monthLabel, income: 0, expenses: 0 };
        
        if ('totalAmount' in item) acc[monthKey].income += item.totalAmount;
        else if(item.type === 'expense') acc[monthKey].expenses += item.amount;
        
        return acc;
    }, {} as Record<string, { period: string, income: number, expenses: number }>);
    
    const weekly = combinedData.reduce((acc, item) => {
        const date = new Date(item.timestamp);
        const weekStart = addDays(date, -date.getDay() + (date.getDay() === 0 ? -6 : 1)); // Monday as start of week
        const weekEnd = addDays(weekStart, 6);
        const weekKey = format(weekStart, "yyyy-MM-dd");
        const weekLabel = `${format(weekStart, 'dd/MM/yy')} - ${format(weekEnd, 'dd/MM/yy')}`;

        if (!acc[weekKey]) acc[weekKey] = { period: weekLabel, income: 0, expenses: 0 };
        
        if ('totalAmount' in item) acc[weekKey].income += item.totalAmount;
        else if (item.type === 'expense') acc[weekKey].expenses += item.amount;

        return acc;
    }, {} as Record<string, { period: string, income: number, expenses: number }>);

    const processSummary = (group: any) => Object.entries(group)
      .map(([key, value]:[string, any]) => ({...value, key, balance: value.income - value.expenses}))
      .sort((a, b) => b.key.localeCompare(a.key));
    
    return {
      monthlySummary: processSummary(monthly),
      weeklySummary: processSummary(weekly)
    };
  }, [filteredSales, filteredEntries]);


  const confirmDeleteSale = (sale: Sale) => setSaleToDelete(sale);

  const handleDeleteSale = () => {
    if (!saleToDelete) return;
    const currentSales = getSales();
    const updatedSales = currentSales.filter(s => s.id !== saleToDelete!.id);
    saveSales(updatedSales);

    toast({ title: "Venda Removida", variant: "destructive" });
    setSaleToDelete(null);
  };
  
  const handleExportSalesCSV = () => {
    if (filteredSales.length === 0) {
      toast({ title: "Nenhuma venda para exportar", variant: "destructive" });
      return;
    }
    const headers = ['ID Venda', 'Data', 'Itens Qtd', 'Método Pag.', 'Valor Original (R$)', 'Desconto (R$)', 'Valor Final (R$)'];
    const data = filteredSales.map(s => [
      s.id,
      format(new Date(s.timestamp), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
      s.items.reduce((sum, item) => sum + item.quantity, 0),
      PAYMENT_METHODS.find(pm => pm.value === s.paymentMethod)?.name || s.paymentMethod,
      s.originalAmount.toFixed(2).replace('.',','),
      s.discountAmount.toFixed(2).replace('.',','),
      s.totalAmount.toFixed(2).replace('.',','),
    ]);
    downloadAsCSV(headers, data, `relatorio_vendas_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    toast({ title: "Relatório de Vendas Exportado" });
  };
  
  const handleExportSalesPDF = () => {
    if (filteredSales.length === 0) {
      toast({ title: "Nenhuma venda para exportar", variant: "destructive" });
      return;
    }

    const headers = [['ID Venda', 'Data', 'Itens', 'Método', 'Original', 'Desconto', 'Final']];
    const data = filteredSales.map(s => [
      s.id,
      format(new Date(s.timestamp), 'dd/MM/yy HH:mm', { locale: ptBR }),
      String(s.items.reduce((sum, item) => sum + item.quantity, 0)),
      PAYMENT_METHODS.find(pm => pm.value === s.paymentMethod)?.name || s.paymentMethod,
      formatCurrency(s.originalAmount),
      formatCurrency(s.discountAmount),
      formatCurrency(s.totalAmount),
    ]);
    
    downloadAsPDF(
      'Relatório de Vendas',
      headers,
      data,
      `relatorio_vendas_${format(new Date(), 'yyyy-MM-dd')}.pdf`
    );
    toast({ title: "Relatório de Vendas PDF Exportado" });
  };
  
  const handleExportGeneralReport = (formatType: 'csv' | 'pdf') => {
    const combinedData = [
      ...filteredSales.map(sale => {
        const itemsDesc = sale.items.map(item => `${item.quantity}x ${item.name}`).join(', ');
        return {
          timestamp: new Date(sale.timestamp),
          description: `Venda #${sale.id.slice(-6)} (${itemsDesc})`,
          type: 'Receita',
          amount: sale.totalAmount,
        };
      }),
      ...filteredEntries.filter(e => e.type === 'expense').map(entry => ({
        timestamp: new Date(entry.timestamp),
        description: entry.description,
        type: 'Despesa',
        amount: entry.amount,
      })),
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (combinedData.length === 0) {
      toast({ title: "Nenhum dado para exportar", variant: "destructive" });
      return;
    }

    const reportTitle = 'Relatório Financeiro Geral';
    const filename = `relatorio_geral_${format(new Date(), 'yyyy-MM-dd')}`;
    const headers = ['Data', 'Descrição', 'Tipo', 'Valor (R$)'];
    
    if (formatType === 'pdf') {
      const pdfHeaders = [headers];
      const pdfData = combinedData.map(item => [
        format(item.timestamp, "dd/MM/yy HH:mm", { locale: ptBR }),
        item.description,
        item.type,
        item.type === 'Receita' ? formatCurrency(item.amount) : `- ${formatCurrency(item.amount)}`,
      ]);
      downloadAsPDF(reportTitle, pdfHeaders, pdfData, `${filename}.pdf`);
      toast({ title: "Relatório Geral PDF Exportado" });
    } else { // CSV
      const csvData = combinedData.map(item => [
        format(item.timestamp, "dd/MM/yyyy HH:mm:ss", { locale: ptBR }),
        item.description,
        item.type,
        (item.type === 'Receita' ? item.amount : -item.amount).toFixed(2).replace('.', ','),
      ]);
      downloadAsCSV(headers, csvData, `${filename}.csv`);
      toast({ title: "Relatório Geral CSV Exportado" });
    }
  };


  if (!isMounted) return <p>Carregando relatórios...</p>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Relatório</CardTitle>
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
                <DropdownMenuLabel>Relatório Geral (Receitas e Despesas)</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => handleExportGeneralReport('pdf')}>
                    Exportar em PDF
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleExportGeneralReport('csv')}>
                    Exportar em CSV
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Relatório Apenas de Vendas</DropdownMenuLabel>
                <DropdownMenuItem onSelect={handleExportSalesPDF}>
                    Exportar Vendas em PDF
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleExportSalesCSV}>
                    Exportar Vendas em CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">Total de vendas no período</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas Totais</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">Total de saídas no período</p>
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
            <p className="text-xs text-muted-foreground">Receita - Despesas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
             <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{filteredSales.length}</div>
            <p className="text-xs text-muted-foreground">Vendas realizadas no período</p>
          </CardContent>
        </Card>
      </div>

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
                  <TableCell><Badge variant="outline" className="capitalize">{PAYMENT_METHODS.find(pm => pm.value === sale.paymentMethod)?.name || sale.paymentMethod}</Badge></TableCell>
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
              <AlertDialogDescription>Tem certeza que deseja remover esta venda do relatório? Esta ação não pode ser desfeita.</AlertDialogDescription>
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

const Label = ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => ( <label className="text-sm font-medium leading-none" {...props}>{children}</label> );

const SummaryTable = ({ data }: { data: { period: string, income: number, expenses: number, balance: number }[]}) => (
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead>Período</TableHead>
                <TableHead className="text-right">Receita</TableHead>
                <TableHead className="text-right">Despesas</TableHead>
                <TableHead className="text-right">Balanço</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {data.length > 0 ? data.map(row => (
                <TableRow key={row.period}>
                    <TableCell className="font-medium capitalize">{row.period}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.income)}</TableCell>
                    <TableCell className="text-right text-destructive">{formatCurrency(row.expenses)}</TableCell>
                    <TableCell className={`text-right font-bold ${row.balance >= 0 ? 'text-green-600' : 'text-destructive'}`}>{formatCurrency(row.balance)}</TableCell>
                </TableRow>
            )) : (
                <TableRow><TableCell colSpan={4} className="h-24 text-center">Nenhum dado para este período.</TableCell></TableRow>
            )}
        </TableBody>
    </Table>
);

    
