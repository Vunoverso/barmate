

"use client";

import type { FinancialEntry, SecondaryCashBox, BankAccount, CashRegisterStatus, Sale, PaymentMethod, CashAdjustment } from '@/types';
import { formatCurrency, PAYMENT_METHODS, SOURCE_MAP } from '@/lib/constants';
import { 
  getFinancialEntries,
  getSales,
  addFinancialEntry,
  saveCashRegisterStatus,
  getCashRegisterStatus,
  saveFinancialEntries,
  getVisuallyRemovedFinancialEntries,
  saveVisuallyRemovedFinancialEntries,
  removeSale,
} from '@/lib/data-access';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
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
import { PlusCircle, Trash2, TrendingDown, MoreHorizontal, Download, Edit, Landmark, PiggyBank, Wallet, Banknote, ListFilter, DollarSign, Scale, BarChart, Eye, EyeOff, ChevronLeft, ChevronRight, TrendingUp, ArrowRightLeft } from 'lucide-react';
import { addDays, format } from "date-fns";
import type { DateRange } from "react-day-picker";
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
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadAsCSV } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { DatePickerWithRange } from '@/components/ui/date-picker-range'; 
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

const expenseSchema = z.object({
  description: z.string().min(3, { message: "A descrição deve ter pelo menos 3 caracteres." }),
  amount: z.coerce.number().positive({ message: "O valor deve ser positivo." }),
  source: z.enum(['daily_cash', 'secondary_cash', 'bank_account'], {
    required_error: "Você precisa selecionar a origem da despesa."
  }),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

// Helper function to identify transfer entries
const isTransferEntry = (entry: FinancialEntry, allEntries: FinancialEntry[]): boolean => {
    if (entry.isCorrection) return false;
    // Sangrias or Suprimentos that are transfers between internal accounts
    if (entry.adjustmentId) {
        // A real transfer will have a corresponding opposite entry (income vs expense) for the same adjustmentId
        const pair = allEntries.find(e => 
            e.adjustmentId === entry.adjustmentId && 
            e.id !== entry.id && 
            e.type !== entry.type
        );
        return !!pair;
    }
    return false;
};

export default function FinancialClient() {
  const [isMounted, setIsMounted] = useState(false);
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [cashStatus, setCashStatus] = useState<CashRegisterStatus>({ status: 'closed', adjustments: [] });
  const [sales, setSales] = useState<Sale[]>([]);
  
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<FinancialEntry | null>(null);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [expenseToConfirm, setExpenseToConfirm] = useState<ExpenseFormData | null>(null);
  const [visuallyRemovedEntries, setVisuallyRemovedEntries] = useState<string[]>([]);
  const [balanceToEdit, setBalanceToEdit] = useState<{ type: 'secondary_cash' | 'bank_account', currentBalance: number } | null>(null);
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string[]>([]);
  const [isBalanceVisible, setIsBalanceVisible] = useState(false);
  
  const [salesPagination, setSalesPagination] = useState({ currentPage: 1, itemsPerPage: 10 });
  const [expensesPagination, setExpensesPagination] = useState({ currentPage: 1, itemsPerPage: 10 });
  const [feesPagination, setFeesPagination] = useState({ currentPage: 1, itemsPerPage: 10 });
  const [incomePagination, setIncomePagination] = useState({ currentPage: 1, itemsPerPage: 10 });
  const [transfersPagination, setTransfersPagination] = useState({ currentPage: 1, itemsPerPage: 10 });

  const { toast } = useToast();
  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { description: '', amount: 0, source: 'daily_cash' },
  });

  const loadData = useCallback(() => {
    setEntries(getFinancialEntries());
    setSales(getSales());
    setCashStatus(getCashRegisterStatus());
    setVisuallyRemovedEntries(getVisuallyRemovedFinancialEntries());
  }, []);
  
  useEffect(() => {
    loadData();
    setDateRange({
        from: addDays(new Date(), -30),
        to: new Date(),
    });
    setIsMounted(true);

    const handleStorageChange = (event: StorageEvent) => {
        loadData();
    };
    const handleAppStateChange = () => loadData();
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('barmate-app-state-changed', handleAppStateChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('barmate-app-state-changed', handleAppStateChange);
    };
  }, [loadData]);
  
  const secondaryCashBoxBalance = useMemo(() => {
    return entries
      .filter(e => e.source === 'secondary_cash')
      .reduce((acc, e) => acc + (e.type === 'income' ? e.amount : -e.amount), 0);
  }, [entries]);
  
  const bankAccountBalance = useMemo(() => {
    return entries
      .filter(e => e.source === 'bank_account')
      .reduce((acc, e) => acc + (e.type === 'income' ? e.amount : -e.amount), 0);
  }, [entries]);
  
 const expectedCashInDrawer = useMemo(() => {
    const currentCashStatus = getCashRegisterStatus();
    if (currentCashStatus.status !== 'open' || !currentCashStatus.openingTime) {
      return 0;
    }
    
    const openingTime = new Date(currentCashStatus.openingTime);
    const openingBalance = currentCashStatus.openingBalance || 0;

    const sessionEntries = getFinancialEntries().filter(e => e.source === 'daily_cash' && new Date(e.timestamp) >= openingTime);

    // Re-calculating the balance from opening, excluding the initial opening entry itself as it's already in openingBalance
    const balanceFromMovements = sessionEntries
      .filter(e => e.description !== 'Valor de Abertura') // Exclude the opening balance entry from sum
      .reduce((acc, e) => {
        return acc + (e.type === 'income' ? e.amount : -e.amount);
      }, 0);
    
    return openingBalance + balanceFromMovements;
  }, [entries]);


  const totalGlobalBalance = useMemo(() => {
    return expectedCashInDrawer + secondaryCashBoxBalance + bankAccountBalance;
  }, [expectedCashInDrawer, secondaryCashBoxBalance, bankAccountBalance]);
  // --- End Calculated Balances ---

  const filterByDate = (items: (Sale | FinancialEntry)[]) => {
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
    return (filterByDate(entries) as FinancialEntry[])
        .filter(e => !visuallyRemovedEntries.includes(e.id) && !e.isCorrection)
        .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [entries, dateRange, visuallyRemovedEntries]);
  
  const { operationalEntries, transferEntries } = useMemo(() => {
    const operational: FinancialEntry[] = [];
    const transfers: FinancialEntry[] = [];
    
    filteredEntries.forEach(entry => {
        if (isTransferEntry(entry, filteredEntries)) {
            transfers.push(entry);
        } else {
            operational.push(entry);
        }
    });
    
    return { operationalEntries: operational, transferEntries: transfers };
  }, [filteredEntries]);

  const generalExpenses = useMemo(() => operationalEntries.filter(e => e.type === 'expense' && !e.saleId), [operationalEntries]);
  const feeExpenses = useMemo(() => operationalEntries.filter(e => e.type === 'expense' && !!e.saleId), [operationalEntries]);
  const incomeEntries = useMemo(() => operationalEntries.filter(e => e.type === 'income' && !e.saleId), [operationalEntries]);

  const paginatedSales = useMemo(() => {
    const startIndex = (salesPagination.currentPage - 1) * salesPagination.itemsPerPage;
    return filteredSales.slice(startIndex, startIndex + salesPagination.itemsPerPage);
  }, [filteredSales, salesPagination]);

  const totalSalesPages = useMemo(() => {
    if (filteredSales.length === 0) return 1;
    return Math.ceil(filteredSales.length / salesPagination.itemsPerPage);
  }, [filteredSales, salesPagination.itemsPerPage]);

  const paginatedExpenses = useMemo(() => {
    const startIndex = (expensesPagination.currentPage - 1) * expensesPagination.itemsPerPage;
    return generalExpenses.slice(startIndex, startIndex + expensesPagination.itemsPerPage);
  }, [generalExpenses, expensesPagination]);

  const totalExpensePages = useMemo(() => {
    if (generalExpenses.length === 0) return 1;
    return Math.ceil(generalExpenses.length / expensesPagination.itemsPerPage);
  }, [generalExpenses, expensesPagination.itemsPerPage]);

  const paginatedFees = useMemo(() => {
    const startIndex = (feesPagination.currentPage - 1) * feesPagination.itemsPerPage;
    return feeExpenses.slice(startIndex, startIndex + feesPagination.itemsPerPage);
  }, [feeExpenses, feesPagination]);

  const totalFeePages = useMemo(() => {
      if (feeExpenses.length === 0) return 1;
      return Math.ceil(feeExpenses.length / feesPagination.itemsPerPage);
  }, [feeExpenses, feesPagination.itemsPerPage]);

  const paginatedIncome = useMemo(() => {
    const startIndex = (incomePagination.currentPage - 1) * incomePagination.itemsPerPage;
    return incomeEntries.slice(startIndex, startIndex + incomePagination.itemsPerPage);
  }, [incomeEntries, incomePagination]);

  const totalIncomePages = useMemo(() => {
    if (incomeEntries.length === 0) return 1;
    return Math.ceil(incomeEntries.length / incomePagination.itemsPerPage);
  }, [incomeEntries, incomePagination.itemsPerPage]);

  const paginatedTransfers = useMemo(() => {
    const startIndex = (transfersPagination.currentPage - 1) * transfersPagination.itemsPerPage;
    return transferEntries.slice(startIndex, startIndex + transfersPagination.itemsPerPage);
  }, [transferEntries, transfersPagination]);

  const totalTransferPages = useMemo(() => {
      if (transferEntries.length === 0) return 1;
      return Math.ceil(transferEntries.length / transfersPagination.itemsPerPage);
  }, [transferEntries, transfersPagination.itemsPerPage]);


  const salesRevenue = useMemo(() => filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0), [filteredSales]);
  const otherIncome = useMemo(() => incomeEntries.reduce((sum, entry) => sum + entry.amount, 0), [incomeEntries]);
  const totalExpenses = useMemo(() => [...generalExpenses, ...feeExpenses].reduce((sum, entry) => sum + entry.amount, 0), [generalExpenses, feeExpenses]);
  const netBalance = useMemo(() => salesRevenue + otherIncome - totalExpenses, [salesRevenue, otherIncome, totalExpenses]);

  const { monthlySummary, weeklySummary } = useMemo(() => {
    const processEntries = (entriesToProcess: FinancialEntry[], salesToProcess: Sale[]) => {
        const incomeFromSales = salesToProcess.map(s => ({ timestamp: s.timestamp, amount: s.totalAmount, type: 'income' }));
        const combinedOperational = [...entriesToProcess.filter(e => !e.saleId), ...incomeFromSales];

        const monthly = combinedOperational.reduce((acc, item) => {
            const key = format(new Date(item.timestamp), "yyyy-MM");
            const label = format(new Date(item.timestamp), "MMMM yyyy", { locale: ptBR });
            if (!acc[key]) acc[key] = { period: label, income: 0, expenses: 0 };
            if (item.type === 'income') acc[key].income += item.amount;
            else acc[key].expenses += item.amount;
            return acc;
        }, {} as Record<string, { period: string, income: 0, expenses: 0 }>);

        const weekly = combinedOperational.reduce((acc, item) => {
            const date = new Date(item.timestamp);
            const weekStart = addDays(date, -date.getDay() + (date.getDay() === 0 ? -6 : 1)); // Monday start
            const weekEnd = addDays(weekStart, 6);
            const key = format(weekStart, "yyyy-MM-dd");
            const label = `${format(weekStart, 'dd/MM/yy')} - ${format(weekEnd, 'dd/MM/yy')}`;
            if (!acc[key]) acc[key] = { period: label, income: 0, expenses: 0 };
            if (item.type === 'income') acc[key].income += item.amount;
            else acc[key].expenses += item.amount;
            return acc;
        }, {} as Record<string, { period: string, income: 0, expenses: 0 }>);
        
        const processSummary = (group: any) => Object.entries(group)
          .map(([key, value]: [string, any]) => ({ ...value, key, balance: value.income - value.expenses }))
          .sort((a, b) => b.key.localeCompare(a.key));

        return {
            monthlySummary: processSummary(monthly),
            weeklySummary: processSummary(weekly)
        };
    };
    return processEntries(operationalEntries, filteredSales);
  }, [operationalEntries, filteredSales]);

  // Pagination Handlers
  const handleSalesPageChange = (page: number) => setSalesPagination(prev => ({ ...prev, currentPage: page }));
  const handleSalesItemsPerPageChange = (items: number) => setSalesPagination({ currentPage: 1, itemsPerPage: items });
  const handleExpensesPageChange = (page: number) => setExpensesPagination(prev => ({ ...prev, currentPage: page }));
  const handleExpensesItemsPerPageChange = (items: number) => setExpensesPagination({ currentPage: 1, itemsPerPage: items });
  const handleFeesPageChange = (page: number) => setFeesPagination(prev => ({ ...prev, currentPage: page }));
  const handleFeesItemsPerPageChange = (items: number) => setFeesPagination({ currentPage: 1, itemsPerPage: items });
  const handleIncomePageChange = (page: number) => setIncomePagination(prev => ({ ...prev, currentPage: page }));
  const handleIncomeItemsPerPageChange = (items: number) => setIncomePagination({ currentPage: 1, itemsPerPage: items });
  const handleTransfersPageChange = (page: number) => setTransfersPagination(prev => ({ ...prev, currentPage: page }));
  const handleTransfersItemsPerPageChange = (items: number) => setTransfersPagination({ currentPage: 1, itemsPerPage: items });


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
  };
  
  const handleDeleteEntry = (revert: boolean) => {
    if (!entryToDelete) return;

    if (revert) {
      const allEntries = getFinancialEntries();
      const entriesToKeep = allEntries.filter(e => e.id !== entryToDelete.id);
      saveFinancialEntries(entriesToKeep);
    } else {
      const currentRemoved = getVisuallyRemovedFinancialEntries();
      const newRemoved = [...currentRemoved, entryToDelete.id];
      saveVisuallyRemovedFinancialEntries(newRemoved);
      setVisuallyRemovedEntries(newRemoved);
    }
    
    toast({ 
        title: "Registro Removido", 
        description: `O registro foi removido ${revert ? 'e o valor estornado.' : 'sem estornar o valor.'}`,
        variant: "default" 
    });
    setEntryToDelete(null);
  };
  
  const handleDeleteSale = () => {
    if (!saleToDelete) return;
    removeSale(saleToDelete.id);
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
      ...operationalEntries.filter(e => e.type === 'expense').map(entry => ({
        timestamp: new Date(entry.timestamp),
        description: entry.description,
        type: 'Despesa',
        amount: entry.amount,
        source: SOURCE_MAP[entry.source]
      })),
       ...operationalEntries.filter(e => e.type === 'income' && !e.saleId).map(entry => ({
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
  
  const handleEditBalance = (newBalance: number) => {
    if (!balanceToEdit) return;

    const { type, currentBalance } = balanceToEdit;
    const difference = newBalance - currentBalance;

    if (Math.abs(difference) < 0.01) {
        setBalanceToEdit(null);
        return; // No change
    }

    addFinancialEntry({
        description: 'Correção de saldo manual',
        amount: Math.abs(difference),
        type: difference > 0 ? 'income' : 'expense',
        source: type,
        saleId: null,
        adjustmentId: null,
        isCorrection: true,
    });

    toast({
        title: "Saldo Corrigido",
        description: `O saldo do ${SOURCE_MAP[type]} foi ajustado para ${formatCurrency(newBalance)}.`,
    });
    setBalanceToEdit(null);
  };


  if (!isMounted) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Carregando financeiro...</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Situação Financeira Atual</h2>
            <Button variant="ghost" size="icon" onClick={() => setIsBalanceVisible(!isBalanceVisible)}>
                {isBalanceVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                <span className="sr-only">{isBalanceVisible ? "Esconder saldos" : "Mostrar saldos"}</span>
            </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Saldo Total (Geral)</CardTitle>
                    <Scale className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{isBalanceVisible ? formatCurrency(totalGlobalBalance) : '******'}</div>
                    <p className="text-xs text-muted-foreground">Caixa Diário + Caixa 02 + Banco</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Caixa Diário (Aberto)</CardTitle>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{isBalanceVisible ? formatCurrency(expectedCashInDrawer) : '******'}</div>
                    <p className="text-xs text-muted-foreground">Status: <span className="capitalize">{cashStatus?.status === 'open' ? 'Aberto' : 'Fechado'}</span></p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Saldo Caixa 02</CardTitle>
                     <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2" onClick={() => setBalanceToEdit({ type: 'secondary_cash', currentBalance: secondaryCashBoxBalance })}>
                        <Edit className="h-4 w-4 text-muted-foreground" />
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{isBalanceVisible ? formatCurrency(secondaryCashBoxBalance) : '******'}</div>
                    <p className="text-xs text-muted-foreground">Caixa secundário / reserva</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Saldo Conta Bancária</CardTitle>
                    <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2" onClick={() => setBalanceToEdit({ type: 'bank_account', currentBalance: bankAccountBalance })}>
                        <Edit className="h-4 w-4 text-muted-foreground" />
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{isBalanceVisible ? formatCurrency(bankAccountBalance) : '******'}</div>
                    <p className="text-xs text-muted-foreground">Recebimentos de cartão/pix</p>
                </CardContent>
            </Card>
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
                  <div className="text-2xl font-bold">{isBalanceVisible ? formatCurrency(salesRevenue) : '******'}</div>
                  <p className="text-xs text-muted-foreground">Faturamento de vendas no período.</p>
              </CardContent>
              </Card>
              <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Outras Entradas</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{isBalanceVisible ? formatCurrency(otherIncome) : '******'}</div>
                  <p className="text-xs text-muted-foreground">Suprimentos e ajustes manuais.</p>
              </CardContent>
              </Card>
              <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Despesas Totais</CardTitle>
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold text-destructive">{isBalanceVisible ? formatCurrency(totalExpenses) : '******'}</div>
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
                  {isBalanceVisible ? formatCurrency(netBalance) : '******'}
                  </div>
                  <p className="text-xs text-muted-foreground">(Vendas + Entradas) - Despesas</p>
              </CardContent>
              </Card>
          </CardContent>
        </Card>

        <Accordion type="multiple" className="w-full space-y-4">
          <Card><AccordionItem value="monthly-summary" className="border-b-0">
              <AccordionTrigger className="p-6"><CardHeader className="p-0 text-left">
                  <CardTitle>Resumo Mensal</CardTitle><CardDescription>Balanço de receitas e despesas agrupadas por mês.</CardDescription>
              </CardHeader></AccordionTrigger>
              <AccordionContent className="px-6 pb-6"><SummaryTable data={monthlySummary} isBalanceVisible={isBalanceVisible} /></AccordionContent>
          </AccordionItem></Card>
          <Card><AccordionItem value="weekly-summary" className="border-b-0">
            <AccordionTrigger className="p-6"><CardHeader className="p-0 text-left">
                <CardTitle>Resumo Semanal</CardTitle><CardDescription>Balanço de receitas e despesas agrupadas por semana.</CardDescription>
            </CardHeader></AccordionTrigger>
            <AccordionContent className="px-6 pb-6"><SummaryTable data={weeklySummary} isBalanceVisible={isBalanceVisible} /></AccordionContent>
          </AccordionItem></Card>
        </Accordion>
      
        <Tabs defaultValue="sales" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="sales">Vendas</TabsTrigger>
                <TabsTrigger value="income">Entradas</TabsTrigger>
                <TabsTrigger value="expenses">Despesas</TabsTrigger>
                <TabsTrigger value="fees">Taxas</TabsTrigger>
                <TabsTrigger value="transfers">Transferências</TabsTrigger>
            </TabsList>
            <TabsContent value="sales">
                <Card>
                    <CardHeader>
                        <CardTitle>Detalhes das Vendas</CardTitle>
                        <CardDescription>Lista de todas as vendas realizadas no período selecionado.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Itens</TableHead>
                                <TableHead>Método Pag.</TableHead>
                                <TableHead className="text-right">Desconto</TableHead>
                                <TableHead className="text-right">Valor Final</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                            {paginatedSales.length > 0 ? paginatedSales.map(sale => (
                                <TableRow key={sale.id}>
                                <TableCell>{format(new Date(sale.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                                <TableCell>{sale.items.reduce((sum, item) => sum + item.quantity, 0)}</TableCell>
                                <TableCell><div className="flex flex-wrap gap-1">
                                    {sale.payments.map(p => (
                                        <Badge key={p.method} variant="outline" className="capitalize">
                                            {PAYMENT_METHODS.find(pm => pm.value === p.method)?.name || p.method}
                                        </Badge>
                                    ))}
                                </div></TableCell>
                                <TableCell className="text-right text-destructive">{sale.discountAmount > 0 ? `- ${formatCurrency(sale.discountAmount)}` : formatCurrency(0)}</TableCell>
                                <TableCell className="text-right font-semibold">{formatCurrency(sale.totalAmount)}</TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Menu</span></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                        <DropdownMenuItem className="text-destructive" onClick={() => setSaleToDelete(sale)}><Trash2 className="mr-2 h-4 w-4" /> Remover</DropdownMenuItem>
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
                    <CardFooter>
                       <DataTablePagination
                            currentPage={salesPagination.currentPage}
                            totalPages={totalSalesPages}
                            onPageChange={handleSalesPageChange}
                            itemsPerPage={salesPagination.itemsPerPage}
                            onItemsPerPageChange={handleSalesItemsPerPageChange}
                            totalItems={filteredSales.length}
                            itemName="vendas"
                        />
                    </CardFooter>
                </Card>
            </TabsContent>
            <TabsContent value="income">
                 <Card>
                    <CardHeader>
                        <CardTitle>Histórico de Entradas (Suprimentos)</CardTitle>
                        <CardDescription>Visualize todas as entradas de dinheiro manuais (suprimentos) no caixa.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow>
                                <TableHead>Descrição</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead>Origem</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                                <TableHead><span className="sr-only">Ações</span></TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                            {paginatedIncome.length > 0 ? paginatedIncome.map(entry => (
                                <TableRow key={entry.id}>
                                <TableCell className="font-medium">{entry.description}</TableCell>
                                <TableCell>{format(new Date(entry.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                                <TableCell>{SOURCE_MAP[entry.source]}</TableCell>
                                <TableCell className="text-right text-green-600 font-semibold">+ {formatCurrency(entry.amount)}</TableCell>
                                <TableCell className="text-right"><DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Toggle menu</span></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                        <DropdownMenuItem className="text-destructive" onClick={() => setEntryToDelete(entry)}><Trash2 className="mr-2 h-4 w-4" /> Remover</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu></TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center">Nenhuma entrada (suprimento) encontrada.</TableCell></TableRow>
                            )}
                            </TableBody>
                        </Table>
                    </CardContent>
                    <CardFooter>
                       <DataTablePagination
                            currentPage={incomePagination.currentPage}
                            totalPages={totalIncomePages}
                            onPageChange={handleIncomePageChange}
                            itemsPerPage={incomePagination.itemsPerPage}
                            onItemsPerPageChange={handleIncomeItemsPerPageChange}
                            totalItems={incomeEntries.length}
                            itemName="entradas"
                        />
                    </CardFooter>
                </Card>
            </TabsContent>
            <TabsContent value="expenses">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Histórico de Despesas Gerais</CardTitle>
                            <CardDescription>Visualize todas as saídas manuais registradas.</CardDescription>
                        </div>
                        <Button onClick={() => { form.reset({ description: '', amount: 0, source: 'daily_cash' }); setIsExpenseDialogOpen(true); }}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Despesa
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow>
                                <TableHead>Descrição</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead>Origem</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                                <TableHead><span className="sr-only">Ações</span></TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                            {paginatedExpenses.length > 0 ? paginatedExpenses.map(entry => (
                                <TableRow key={entry.id}>
                                <TableCell className="font-medium">{entry.description}</TableCell>
                                <TableCell>{format(new Date(entry.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                                <TableCell>{SOURCE_MAP[entry.source]}</TableCell>
                                <TableCell className="text-right text-destructive font-semibold">- {formatCurrency(entry.amount)}</TableCell>
                                <TableCell className="text-right"><DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Toggle menu</span></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                        <DropdownMenuItem className="text-destructive" onClick={() => setEntryToDelete(entry)}><Trash2 className="mr-2 h-4 w-4" /> Remover</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu></TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center">Nenhuma despesa geral encontrada.</TableCell></TableRow>
                            )}
                            </TableBody>
                        </Table>
                    </CardContent>
                    <CardFooter>
                        <DataTablePagination
                            currentPage={expensesPagination.currentPage}
                            totalPages={totalExpensePages}
                            onPageChange={handleExpensesPageChange}
                            itemsPerPage={expensesPagination.itemsPerPage}
                            onItemsPerPageChange={handleExpensesItemsPerPageChange}
                            totalItems={generalExpenses.length}
                            itemName="despesas"
                        />
                    </CardFooter>
                </Card>
            </TabsContent>
            <TabsContent value="fees">
                <Card>
                    <CardHeader>
                        <CardTitle>Taxas de Transação</CardTitle>
                        <CardDescription>Taxas descontadas de vendas por cartão e PIX.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow>
                                <TableHead>Descrição</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead>Origem</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                                <TableHead><span className="sr-only">Ações</span></TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                            {paginatedFees.length > 0 ? paginatedFees.map(entry => (
                                <TableRow key={entry.id}>
                                <TableCell className="font-medium">{entry.description}</TableCell>
                                <TableCell>{format(new Date(entry.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                                <TableCell>{SOURCE_MAP[entry.source]}</TableCell>
                                <TableCell className="text-right text-destructive font-semibold">- {formatCurrency(entry.amount)}</TableCell>
                                <TableCell className="text-right">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                           <span tabIndex={0}>
                                            <Button aria-haspopup="true" size="icon" variant="ghost" disabled>
                                                <Trash2 className="h-4 w-4" />
                                                <span className="sr-only">Menu</span>
                                            </Button>
                                           </span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Remova a venda associada para estornar a taxa.</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center">Nenhuma taxa de transação encontrada.</TableCell></TableRow>
                            )}
                            </TableBody>
                        </Table>
                    </CardContent>
                    <CardFooter>
                       <DataTablePagination
                            currentPage={feesPagination.currentPage}
                            totalPages={totalFeePages}
                            onPageChange={handleFeesPageChange}
                            itemsPerPage={feesPagination.itemsPerPage}
                            onItemsPerPageChange={handleFeesItemsPerPageChange}
                            totalItems={feeExpenses.length}
                            itemName="taxas"
                        />
                    </CardFooter>
                </Card>
            </TabsContent>
            <TabsContent value="transfers">
              <Card>
                <CardHeader>
                    <CardTitle>Histórico de Transferências</CardTitle>
                    <CardDescription>Movimentações entre caixas, aberturas, fechamentos e sangrias.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Origem/Destino</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead><span className="sr-only">Ações</span></TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                        {paginatedTransfers.length > 0 ? paginatedTransfers.map(entry => (
                            <TableRow key={entry.id}>
                            <TableCell className="font-medium">{entry.description}</TableCell>
                            <TableCell>{format(new Date(entry.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                            <TableCell><Badge variant={entry.type === 'income' ? 'secondary' : 'destructive'} className="capitalize">{entry.type === 'income' ? 'Entrada' : 'Saída'}</Badge></TableCell>
                            <TableCell>{SOURCE_MAP[entry.source]}</TableCell>
                            <TableCell className={`text-right font-semibold ${entry.type === 'income' ? 'text-green-600' : 'text-destructive'}`}>{entry.type === 'income' ? '+' : '-'} {formatCurrency(entry.amount)}</TableCell>
                            <TableCell className="text-right">
                                <TooltipProvider>
                                    <Tooltip><TooltipTrigger asChild><span tabIndex={0}><Button size="icon" variant="ghost" disabled><Trash2 className="h-4 w-4" /></Button></span></TooltipTrigger>
                                    <TooltipContent><p>Transferências não podem ser removidas individualmente.</p></TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow><TableCell colSpan={6} className="h-24 text-center">Nenhuma transferência encontrada.</TableCell></TableRow>
                        )}
                        </TableBody>
                    </Table>
                </CardContent>
                <CardFooter>
                    <DataTablePagination
                        currentPage={transfersPagination.currentPage}
                        totalPages={totalTransferPages}
                        onPageChange={handleTransfersPageChange}
                        itemsPerPage={transfersPagination.itemsPerPage}
                        onItemsPerPageChange={handleTransfersItemsPerPageChange}
                        totalItems={transferEntries.length}
                        itemName="transferências"
                    />
                </CardFooter>
              </Card>
            </TabsContent>
        </Tabs>
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
      
      {entryToDelete && (
        <AlertDialog open={!!entryToDelete} onOpenChange={() => setEntryToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
              <AlertDialogDescription>
                Como você deseja remover o lançamento "{entryToDelete.description}"?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="sm:justify-between gap-2">
                <Button variant="secondary" onClick={() => handleDeleteEntry(false)}>
                    Apenas Excluir do Histórico
                </Button>
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2">
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDeleteEntry(true)} className="bg-destructive hover:bg-destructive/90">
                        Excluir e Estornar Valor
                    </AlertDialogAction>
                </div>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {saleToDelete && (
        <AlertDialog open={!!saleToDelete} onOpenChange={() => setSaleToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Confirmar Remoção de Venda</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja remover esta venda do relatório? Esta ação não pode ser desfeita e irá estornar os valores da conta bancária e/ou caixa, incluindo as taxas.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteSale} className="bg-destructive hover:bg-destructive/90">Remover Venda</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

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

      {balanceToEdit && (
        <EditBalanceDialog
            isOpen={!!balanceToEdit}
            onOpenChange={() => setBalanceToEdit(null)}
            balanceInfo={balanceToEdit}
            onSave={handleEditBalance}
        />
       )}
    </>
  );
}

function DataTablePagination({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  onItemsPerPageChange,
  totalItems,
  itemName = "itens",
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  onItemsPerPageChange: (items: number) => void;
  totalItems: number;
  itemName?: string;
}) {
  return (
    <div className="flex w-full items-center justify-between">
      <div className="flex-1 text-sm text-muted-foreground">
        Total de {totalItems} {itemName}.
      </div>
      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Itens por página</p>
          <Select
            value={`${itemsPerPage}`}
            onValueChange={(value) => {
              onItemsPerPageChange(Number(value));
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={itemsPerPage} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          Página {currentPage} de {totalPages}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <span className="sr-only">Página Anterior</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            <span className="sr-only">Próxima Página</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

const SummaryTable = ({ data, isBalanceVisible }: { data: { period: string, income: number, expenses: number, balance: number }[], isBalanceVisible: boolean }) => (
    <Table>
        <TableHeader><TableRow>
            <TableHead>Período</TableHead>
            <TableHead className="text-right">Receita</TableHead>
            <TableHead className="text-right">Despesas</TableHead>
            <TableHead className="text-right">Balanço</TableHead>
        </TableRow></TableHeader>
        <TableBody>
            {data.length > 0 ? data.map(row => (
                <TableRow key={row.period}>
                    <TableCell className="font-medium capitalize">{row.period}</TableCell>
                    <TableCell className="text-right">{isBalanceVisible ? formatCurrency(row.income) : '******'}</TableCell>
                    <TableCell className="text-right text-destructive">{isBalanceVisible ? formatCurrency(row.expenses) : '******'}</TableCell>
                    <TableCell className={`text-right font-bold ${row.balance >= 0 ? 'text-green-600' : 'text-destructive'}`}>{isBalanceVisible ? formatCurrency(row.balance) : '******'}</TableCell>
                </TableRow>
            )) : (
                <TableRow><TableCell colSpan={4} className="h-24 text-center">Nenhum dado para este período.</TableCell></TableRow>
            )}
        </TableBody>
    </Table>
);


interface EditBalanceDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  balanceInfo: { type: 'secondary_cash' | 'bank_account', currentBalance: number };
  onSave: (newBalance: number) => void;
}

function EditBalanceDialog({ isOpen, onOpenChange, balanceInfo, onSave }: EditBalanceDialogProps) {
    const [newBalance, setNewBalance] = useState('');
    const { toast } = useToast();

    const title = balanceInfo.type === 'secondary_cash' ? 'Corrigir Saldo do Caixa 02' : 'Corrigir Saldo da Conta Bancária';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const value = parseFloat(newBalance.replace(',', '.'));
        if (isNaN(value)) {
            toast({ title: "Valor Inválido", variant: "destructive" });
            return;
        }
        onSave(value);
        onOpenChange(false);
    };

    useEffect(() => {
        if (!isOpen) {
            setNewBalance('');
        } else {
            // Pre-fill with current balance when opening, to make small adjustments easier.
            setNewBalance(balanceInfo.currentBalance.toFixed(2).replace('.', ','));
        }
    }, [isOpen, balanceInfo.currentBalance]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{title}</DialogTitle>
                        <DialogDescription>
                            Digite o valor correto para o saldo. O sistema criará uma transação de correção para ajustar a diferença. 
                            Saldo atual: <strong>{formatCurrency(balanceInfo.currentBalance)}</strong>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="new-balance">Novo Saldo (R$)</Label>
                        <Input
                            id="new-balance"
                            type="number"
                            step="0.01"
                            value={newBalance}
                            onChange={(e) => setNewBalance(e.target.value)}
                            placeholder="Ex: 1500,00"
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                        <Button type="submit">Salvar Novo Saldo</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

    

    


    

