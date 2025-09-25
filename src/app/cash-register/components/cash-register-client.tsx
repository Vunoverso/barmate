

"use client";

import type { CashRegisterStatus, Sale, SecondaryCashBox, CashAdjustment, BankAccount, FinancialEntry } from '@/types';
import { getSales, formatCurrency, getSecondaryCashBox, saveSecondaryCashBox, getBankAccount, saveBankAccount, getFinancialEntries, saveFinancialEntries, saveCashRegisterStatus, getCashRegisterStatus, addFinancialEntry, KEY_CLOSED_SESSIONS } from '@/lib/constants';
import { useState, useEffect, useMemo } from 'react';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { DoorClosed, DoorOpen, PiggyBank, CircleDollarSign, CreditCard, ArrowUpCircle, ArrowDownCircle, Landmark, ArrowRightLeft, Edit, MoreHorizontal, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


export default function CashRegisterClient() {
  const [isLoading, setIsLoading] = useState(true);
  const [cashStatus, setCashStatus] = useState<CashRegisterStatus>({ status: 'closed', adjustments: [] });
  const [allFinancialEntries, setAllFinancialEntries] = useState<FinancialEntry[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const { toast } = useToast();

  // Dialog states
  const [isOpeningDialog, setIsOpeningDialog] = useState(false);
  const [isClosingDialog, setIsClosingDialog] = useState(false);
  const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<'in' | 'out'>('in');
  const [editingAdjustment, setEditingAdjustment] = useState<CashAdjustment | null>(null);
  const [adjustmentToDelete, setAdjustmentToDelete] = useState<CashAdjustment | null>(null);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [isEditCaixa02DialogOpen, setIsEditCaixa02DialogOpen] = useState(false);
  const [isEditBankAccountDialogOpen, setIsEditBankAccountDialogOpen] = useState(false);
  const [isEditInitialBalanceDialogOpen, setIsEditInitialBalanceDialogOpen] = useState(false);
  
  // Calculated balances
  const secondaryCashBoxBalance = useMemo(() => 
    allFinancialEntries
      .filter(e => e.source === 'secondary_cash')
      .reduce((acc, e) => acc + (e.type === 'income' ? e.amount : -e.amount), 0), 
    [allFinancialEntries]
  );
  
  const bankAccountBalance = useMemo(() => 
    allFinancialEntries
      .filter(e => e.source === 'bank_account')
      .reduce((acc, e) => acc + (e.type === 'income' ? e.amount : -e.amount), 0),
    [allFinancialEntries]
  );


  const loadInitialData = () => {
    setIsLoading(true);
    setCashStatus(getCashRegisterStatus());
    setAllFinancialEntries(getFinancialEntries());
    setSales(getSales());
    setIsLoading(false);
  };

  useEffect(() => {
    loadInitialData();

    const handleStorageChange = (event: StorageEvent) => {
        loadInitialData();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []); 


  const handleOpenCashRegister = (openingBalance: number) => {
    if (secondaryCashBoxBalance < openingBalance) {
      toast({
        title: "Saldo Insuficiente no Caixa 02",
        description: `Não há saldo suficiente no Caixa 02 para abrir o caixa diário com ${formatCurrency(openingBalance)}.`,
        variant: "destructive",
      });
      return;
    }
    
    // Create entries to represent the transfer
    const openingAdjustmentId = `adj-open-${Date.now()}`;
    addFinancialEntry([
        {
            description: `Abertura do Caixa Diário`,
            amount: openingBalance,
            type: 'expense',
            source: 'secondary_cash',
            saleId: null,
            adjustmentId: openingAdjustmentId
        },
        {
            description: `Valor de Abertura`,
            amount: openingBalance,
            type: 'income',
            source: 'daily_cash',
            saleId: null,
            adjustmentId: openingAdjustmentId
        }
    ]);
    
    const newStatus: CashRegisterStatus = {
      status: 'open',
      openingBalance: openingBalance,
      openingTime: new Date().toISOString(),
      adjustments: [{
          id: openingAdjustmentId,
          amount: openingBalance,
          type: 'in',
          description: 'Valor de Abertura',
          timestamp: new Date().toISOString(),
      }],
    };
    saveCashRegisterStatus(newStatus);
    setIsOpeningDialog(false);
    toast({
      title: "Caixa Diário Aberto!",
      description: `${formatCurrency(openingBalance)} foram transferidos do Caixa 02 para o caixa diário.`,
    });
  };

  const handleSaveAdjustment = (details: { amount: number; description: string; destination?: 'none' | 'secondary_cash' | 'bank_account' }, idToUpdate?: string) => {
    let currentCashStatus = getCashRegisterStatus();
    if (currentCashStatus.status !== 'open') return;

    if (idToUpdate) { // Editing existing adjustment
        const originalAdjustment = currentCashStatus.adjustments?.find(adj => adj.id === idToUpdate);
        if (!originalAdjustment) return;
        
        revertAdjustment(originalAdjustment);
        
        const updatedAdjustment: CashAdjustment = { ...originalAdjustment, amount: details.amount, description: details.description };
        
        applyAdjustment(updatedAdjustment);

        const newAdjustments = currentCashStatus.adjustments?.map(adj => adj.id === idToUpdate ? updatedAdjustment : adj) || [];
        saveCashRegisterStatus({ ...currentCashStatus, adjustments: newAdjustments });
        toast({ title: "Movimentação Atualizada!" });

    } else { // Creating new adjustment
        const newAdjustment: CashAdjustment = {
            id: `adj-${Date.now()}`,
            amount: details.amount,
            type: adjustmentType,
            description: details.description,
            timestamp: new Date().toISOString(),
            destination: details.destination && details.destination !== 'none' ? details.destination : undefined
        };
        
        applyAdjustment(newAdjustment);
        const newAdjustments = [...(currentCashStatus.adjustments || []), newAdjustment];
        saveCashRegisterStatus({ ...currentCashStatus, adjustments: newAdjustments });
        
        toast({ title: `Movimentação Registrada!`, description: `${adjustmentType === 'in' ? 'Suprimento' : 'Sangria'} de ${formatCurrency(details.amount)} adicionado.` });
    }
    
    setIsAdjustmentDialogOpen(false);
    setEditingAdjustment(null);
  };
  
  const applyAdjustment = (adjustment: CashAdjustment) => {
      const entry: Omit<FinancialEntry, 'id' | 'timestamp'> = {
        description: `${adjustment.type === 'in' ? 'Entrada/Suprimento' : 'Saída/Despesa'}: ${adjustment.description}`,
        amount: adjustment.amount,
        type: adjustment.type === 'in' ? 'income' : 'expense',
        source: 'daily_cash',
        saleId: null,
        adjustmentId: adjustment.id
      }
      
      const entriesToAdd: Omit<FinancialEntry, 'id'|'timestamp'>[] = [entry];
      
      if (adjustment.type === 'out') { // Sangria
          if (adjustment.destination === 'secondary_cash') {
              entriesToAdd.push({ description: `Entrada de Sangria: ${adjustment.description}`, amount: adjustment.amount, type: 'income', source: 'secondary_cash', saleId: null, adjustmentId: adjustment.id });

          } else if (adjustment.destination === 'bank_account') {
              entriesToAdd.push({ description: `Depósito de Sangria: ${adjustment.description}`, amount: adjustment.amount, type: 'income', source: 'bank_account', saleId: null, adjustmentId: adjustment.id });
          }
      }
      addFinancialEntry(entriesToAdd);
  }
  
  const revertAdjustment = (adjustment: CashAdjustment) => {
      const allEntries = getFinancialEntries();
      const entriesToKeep = allEntries.filter(e => e.adjustmentId !== adjustment.id);
      saveFinancialEntries(entriesToKeep);
  }

  const handleDeleteAdjustment = () => {
    if (!adjustmentToDelete) return;
    const currentCashStatus = getCashRegisterStatus();
    if (currentCashStatus.status !== 'open') return;

    revertAdjustment(adjustmentToDelete);
    const newAdjustments = currentCashStatus.adjustments?.filter(adj => adj.id !== adjustmentToDelete.id) || [];
    saveCashRegisterStatus({ ...currentCashStatus, adjustments: newAdjustments });
    toast({ title: "Movimentação Removida", variant: "destructive" });
    setAdjustmentToDelete(null);
  };

  const handleEditInitialBalance = (newBalance: number) => {
      const cashStatus = getCashRegisterStatus();
      if (cashStatus.status !== 'open' || !cashStatus.openingBalance) return;
  
      const openingAdjId = cashStatus.adjustments?.find(a => a.description === 'Valor de Abertura')?.id;
      if (!openingAdjId) {
          toast({ title: "Erro", description: "Não foi possível encontrar a transação de abertura original.", variant: "destructive"});
          return;
      }
      // Revert old opening entries
      const allEntries = getFinancialEntries();
      const entriesToKeep = allEntries.filter(e => e.adjustmentId !== openingAdjId);
      saveFinancialEntries(entriesToKeep);

      // Re-create opening entries with new balance
      addFinancialEntry([
          {
              description: `Abertura do Caixa Diário`,
              amount: newBalance,
              type: 'expense',
              source: 'secondary_cash',
              saleId: null,
              adjustmentId: openingAdjId
          },
          {
              description: `Valor de Abertura`,
              amount: newBalance,
              type: 'income',
              source: 'daily_cash',
              saleId: null,
              adjustmentId: openingAdjId
          }
      ]);
      
      const newOpeningAdjustment = {
          id: openingAdjId,
          amount: newBalance,
          type: 'in' as 'in',
          description: 'Valor de Abertura',
          timestamp: cashStatus.openingTime!,
      };
      
      const newAdjustments = cashStatus.adjustments?.map(adj => adj.id === openingAdjId ? newOpeningAdjustment : adj) || [];
      const newStatus = { ...cashStatus, openingBalance: newBalance, adjustments: newAdjustments };
      saveCashRegisterStatus(newStatus);


      toast({ title: "Saldo Inicial Atualizado", description: `O saldo foi redefinido para ${formatCurrency(newBalance)}.` });
      setIsEditInitialBalanceDialogOpen(false);
  };


  const handleTransfer = (details: { amount: number; destination: 'daily_cash' | 'bank_account' }) => {
    const { amount, destination } = details;
    const currentCashStatus = getCashRegisterStatus();

    if (secondaryCashBoxBalance < amount) {
        toast({ title: "Saldo Insuficiente", description: "O Caixa 02 não possui saldo suficiente para esta transferência.", variant: "destructive" });
        return;
    }

    if (destination === 'daily_cash') {
      if (currentCashStatus.status !== 'open') {
        toast({ title: "Caixa Fechado", description: "Não é possível transferir para o caixa diário pois ele está fechado.", variant: "destructive" });
        return;
      }
      const transferAdjustment: CashAdjustment = {
          id: `adj-transfer-${Date.now()}`, amount, type: 'in', description: `Transferência do Caixa 02`, timestamp: new Date().toISOString(), source: 'secondary_cash'
      };

      addFinancialEntry([
        { description: 'Transferência para Caixa Diário', amount: amount, type: 'expense', source: 'secondary_cash', saleId: null, adjustmentId: transferAdjustment.id },
        { description: 'Recebimento de Transferência do Caixa 02', amount: amount, type: 'income', source: 'daily_cash', saleId: null, adjustmentId: transferAdjustment.id }
      ]);

      const newAdjustments = [...(currentCashStatus.adjustments || []), transferAdjustment];
      saveCashRegisterStatus({ ...currentCashStatus, adjustments: newAdjustments });

      toast({ title: "Transferência Realizada", description: `${formatCurrency(amount)} movido do Caixa 02 para o Caixa Diário.` });

    } else if (destination === 'bank_account') {
        addFinancialEntry([
            { description: 'Transferência para Conta Bancária', amount: amount, type: 'expense', source: 'secondary_cash', saleId: null, adjustmentId: null },
            { description: 'Recebimento de Transferência do Caixa 02', amount: amount, type: 'income', source: 'bank_account', saleId: null, adjustmentId: null }
        ]);
        toast({ title: "Transferência Realizada", description: `${formatCurrency(amount)} movido do Caixa 02 para a Conta Bancária.` });
    }

    setIsTransferDialogOpen(false);
  }

  const handleEditBalance = (newBalance: number, source: 'secondary_cash' | 'bank_account') => {
      const currentBalance = source === 'secondary_cash' ? secondaryCashBoxBalance : bankAccountBalance;
      const difference = newBalance - currentBalance;
      
      if (Math.abs(difference) < 0.01) {
        if(source === 'secondary_cash') setIsEditCaixa02DialogOpen(false);
        else setIsEditBankAccountDialogOpen(false);
        return;
      }

      addFinancialEntry({
          description: 'Ajuste de saldo manual',
          amount: Math.abs(difference),
          type: difference > 0 ? 'income' : 'expense',
          source: source,
          saleId: null,
          adjustmentId: null,
      });

      toast({ title: "Saldo Atualizado", description: `O saldo foi ajustado para ${formatCurrency(newBalance)}.` });
      
      if(source === 'secondary_cash') setIsEditCaixa02DialogOpen(false);
      else setIsEditBankAccountDialogOpen(false);
  }


  const handleCloseCashRegister = () => {
    const finalCashAmount = sessionSummary.expectedCash;

    if (finalCashAmount > 0) {
        addFinancialEntry([
            { description: 'Fechamento de Caixa', amount: finalCashAmount, type: 'expense', source: 'daily_cash', saleId: null, adjustmentId: null },
            { description: 'Recebimento do Caixa Diário', amount: finalCashAmount, type: 'income', source: 'secondary_cash', saleId: null, adjustmentId: null }
        ]);
    }

    const closedSession = {
      ...sessionSummary,
      id: `session-${Date.now()}`,
      closingTime: new Date().toISOString(),
      transferredToCaixa02: finalCashAmount,
    };
    
    const allClosedSessions = JSON.parse(localStorage.getItem(KEY_CLOSED_SESSIONS) || '[]');
    allClosedSessions.push(closedSession);
    localStorage.setItem(KEY_CLOSED_SESSIONS, JSON.stringify(allClosedSessions));

    const newStatus = { status: 'closed' as 'closed', adjustments: [] };
    saveCashRegisterStatus(newStatus);
    
    setIsClosingDialog(false);
    toast({ title: "Caixa Fechado!", description: `O valor de ${formatCurrency(finalCashAmount)} foi transferido para o Caixa 02.`, variant: 'default' });
  };

  const sessionSummary = useMemo(() => {
    if (cashStatus.status !== 'open' || !cashStatus.openingTime) {
      return {
        openingBalance: 0, sessionSales: [], totalSessionRevenue: 0, cashRevenue: 0, cardRevenue: 0, pixRevenue: 0, expectedCash: 0, totalIn: 0, totalOut: 0, adjustments: [],
      };
    }
    const openingTime = new Date(cashStatus.openingTime);
    const sessionSales = sales.filter(sale => new Date(sale.timestamp) >= openingTime);

    const totalSessionRevenue = sessionSales.reduce((sum, sale) => sum + sale.totalAmount, 0);

    const cashRevenue = sessionSales.reduce((total, sale) => {
        const cashPayment = sale.payments.find(p => p.method === 'cash')?.amount ?? 0;
        const creditUsed = sale.items.filter(i => i.price < 0).reduce((sum, i) => sum + Math.abs(i.price * i.quantity), 0);
        
        let netCash = cashPayment;
        if(sale.leaveChangeAsCredit && sale.cashTendered) {
          netCash = sale.cashTendered;
        }
        
        if (creditUsed > 0 && sale.payments.some(p => p.method === 'cash')) {
            const totalPaidWithMethods = sale.payments.reduce((sum, p) => sum + p.amount, 0);
            if (totalPaidWithMethods < sale.originalAmount) { // Means credit was used
                const cashPortionOfPayment = cashPayment / totalPaidWithMethods;
                const creditAppliedToCash = creditUsed * cashPortionOfPayment;
                netCash -= creditAppliedToCash;
            }
        }
        
        return total + Math.max(0, netCash);
    }, 0);
    
    const cardRevenue = sessionSales.reduce((total, sale) => {
        const cardPaymentsAmount = sale.payments.filter(p => p.method === 'credit' || p.method === 'debit').reduce((sum, p) => sum + p.amount, 0);
        return total + cardPaymentsAmount;
    }, 0);

    const pixRevenue = sessionSales.reduce((total, sale) => {
        const pixPayment = sale.payments.find(p => p.method === 'pix')?.amount || 0;
        return total + pixPayment;
    }, 0);
    
    const openingBalance = cashStatus.openingBalance || 0;
    const adjustments = cashStatus.adjustments || [];
    const totalIn = adjustments.filter(a => a.type === 'in').reduce((sum, a) => sum + a.amount, 0);
    const totalOut = adjustments.filter(a => a.type === 'out').reduce((sum, a) => sum + a.amount, 0);

    const expectedCash = cashRevenue + totalIn - totalOut;

    return {
      openingBalance, sessionSales, totalSessionRevenue, cashRevenue, cardRevenue, pixRevenue, expectedCash, openingTime: cashStatus.openingTime, adjustments, totalIn, totalOut
    };
  }, [cashStatus, sales]);

  const sortedAdjustments = useMemo(() => {
    if (!cashStatus.adjustments) return [];
    return [...cashStatus.adjustments]
        .filter(adj => !adj.isCorrection) 
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [cashStatus.adjustments]);


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Carregando gestão de caixa...</p>
      </div>
    );
  }

  if (cashStatus.status === 'closed') {
    return (
      <>
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto bg-muted rounded-full p-4 w-fit">
              <DoorClosed className="h-12 w-12 text-muted-foreground" />
            </div>
            <CardTitle className="mt-4">Caixa Fechado</CardTitle>
            <CardDescription>Para iniciar as vendas, você precisa abrir o caixa com um saldo inicial.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="lg" onClick={() => setIsOpeningDialog(true)}>
              <DoorOpen className="mr-2 h-5 w-5" />
              Abrir Caixa
            </Button>
          </CardContent>
        </Card>
        <OpenCashRegisterDialog 
          isOpen={isOpeningDialog}
          onOpenChange={setIsOpeningDialog}
          onOpen={handleOpenCashRegister}
          secondaryCashBalance={secondaryCashBoxBalance}
        />
      </>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
            <Card>
                <CardHeader>
                <CardTitle>Resumo do Caixa Diário</CardTitle>
                <CardDescription>
                    Caixa aberto em {format(new Date(cashStatus.openingTime!), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="relative flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Saldo Inicial</p>
                            <p className="text-2xl font-bold">{formatCurrency(sessionSummary.openingBalance)}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsEditInitialBalanceDialogOpen(true)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Movimentações da Sessão</h3>
                            <div className="space-y-2 text-sm p-4 border rounded-lg">
                                <div className="flex justify-between">
                                    <span className="flex items-center gap-2"><CircleDollarSign className="h-4 w-4 text-green-600"/>Vendas em Dinheiro</span>
                                    <span className="font-medium text-green-600">+ {formatCurrency(sessionSummary.cashRevenue)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-blue-600"/>Vendas (Cartão & PIX)</span>
                                    <span className="font-medium text-blue-600">+ {formatCurrency(sessionSummary.cardRevenue + sessionSummary.pixRevenue)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="flex items-center gap-2"><ArrowUpCircle className="h-4 w-4 text-green-600"/>Suprimentos (Entradas)</span>
                                    <span className="font-medium text-green-600">+ {formatCurrency(sessionSummary.totalIn)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="flex items-center gap-2"><ArrowDownCircle className="h-4 w-4 text-destructive"/>Sangrias (Saídas)</span>
                                    <span className="font-medium text-destructive">- {formatCurrency(sessionSummary.totalOut)}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold mb-2">Balanço Final</h3>
                            <div className="space-y-2 text-sm p-4 bg-muted/50 rounded-lg">
                                <div className="flex justify-between font-bold text-base">
                                    <span>Total Geral de Vendas</span> 
                                    <strong className="text-primary">{formatCurrency(sessionSummary.totalSessionRevenue)}</strong>
                                </div>
                                <Separator className="my-2"/>
                                <div className="flex justify-between font-bold text-base">
                                    <span>Saldo Final em Dinheiro (Esperado)</span>
                                    <strong>{formatCurrency(sessionSummary.expectedCash)}</strong>
                                </div>
                                <p className="text-xs text-muted-foreground pt-1">Saldo Inicial + Vendas Dinheiro + Suprimentos - Sangrias</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Histórico de Movimentações da Sessão</CardTitle>
                    <CardDescription>Suprimentos e sangrias realizados desde a abertura do caixa.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Horário</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Descrição</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                                <TableHead><span className="sr-only">Ações</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedAdjustments.length > 0 ? sortedAdjustments.map(adj => (
                                <TableRow key={adj.id}>
                                    <TableCell>{format(new Date(adj.timestamp), "HH:mm:ss")}</TableCell>
                                    <TableCell>
                                        <Badge variant={adj.type === 'in' ? 'secondary' : 'destructive'}>
                                            {adj.type === 'in' ? (adj.source ? 'Transferência' : 'Entrada') : (adj.destination ? 'Transferência' : 'Saída')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {adj.description}
                                        {adj.source === 'secondary_cash' && <span className="text-xs text-muted-foreground block">Origem: Caixa 02</span>}
                                        {adj.destination === 'secondary_cash' && <span className="text-xs text-muted-foreground block">Destino: Caixa 02</span>}
                                        {adj.destination === 'bank_account' && <span className="text-xs text-muted-foreground block">Destino: Conta Bancária</span>}
                                    </TableCell>
                                    <TableCell className={`text-right font-medium ${adj.type === 'in' ? 'text-green-600' : 'text-destructive'}`}>
                                        {adj.type === 'in' ? '+ ' : '- '}{formatCurrency(adj.amount)}
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
                                            <DropdownMenuItem onClick={() => { setEditingAdjustment(adj); setAdjustmentType(adj.type); setIsAdjustmentDialogOpen(true); }}>
                                              <Edit className="mr-2 h-4 w-4" /> Editar
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="text-destructive" onClick={() => setAdjustmentToDelete(adj)}>
                                              <Trash2 className="mr-2 h-4 w-4" /> Remover
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center">Nenhuma movimentação nesta sessão.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Operações do Caixa Diário</CardTitle>
                    <CardDescription>Faça entradas ou retiradas de dinheiro do caixa diário.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    <Button variant="outline" onClick={() => { setEditingAdjustment(null); setAdjustmentType('in'); setIsAdjustmentDialogOpen(true); }}>
                        <ArrowUpCircle className="mr-2 h-4 w-4" /> Suprimento
                    </Button>
                    <Button variant="outline" className="text-destructive" onClick={() => { setEditingAdjustment(null); setAdjustmentType('out'); setIsAdjustmentDialogOpen(true); }}>
                        <ArrowDownCircle className="mr-2 h-4 w-4" /> Sangria
                    </Button>
                </CardContent>
                 <CardContent>
                     <Button size="lg" variant="destructive" className="w-full" onClick={() => setIsClosingDialog(true)}>
                        <DoorClosed className="mr-2 h-5 w-5" />
                        Fechar Caixa
                    </Button>
                 </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        Caixa 02 (Secundário)
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsEditCaixa02DialogOpen(true)}><Edit className="h-4 w-4" /></Button>
                    </CardTitle>
                    <CardDescription>Use para guardar valores separadamente.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="text-center">
                        <p className="text-sm text-muted-foreground">Saldo Atual</p>
                        <p className="text-3xl font-bold">{formatCurrency(secondaryCashBoxBalance)}</p>
                    </div>
                    <Button className="w-full" onClick={() => setIsTransferDialogOpen(true)} disabled={secondaryCashBoxBalance <= 0}>
                        <ArrowRightLeft className="mr-2 h-4 w-4" /> Realizar Transferência
                    </Button>
                </CardContent>
             </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        Conta Bancária
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsEditBankAccountDialogOpen(true)}><Edit className="h-4 w-4" /></Button>
                    </CardTitle>
                    <CardDescription>Saldo disponível na sua conta.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="text-center">
                        <p className="text-sm text-muted-foreground">Saldo Atual</p>
                        <p className="text-3xl font-bold">{formatCurrency(bankAccountBalance)}</p>
                    </div>
                </CardContent>
             </Card>
        </div>
      </div>
      
      <CloseCashRegisterDialog 
        isOpen={isClosingDialog}
        onOpenChange={setIsClosingDialog}
        onClose={handleCloseCashRegister}
        summary={sessionSummary}
      />
      <CashAdjustmentDialog
        isOpen={isAdjustmentDialogOpen}
        onOpenChange={(open) => { if(!open) setEditingAdjustment(null); setIsAdjustmentDialogOpen(open); }}
        type={adjustmentType}
        onSave={handleSaveAdjustment}
        adjustmentToEdit={editingAdjustment}
      />
       {adjustmentToDelete && (
        <AlertDialog open={!!adjustmentToDelete} onOpenChange={() => setAdjustmentToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover a movimentação "{adjustmentToDelete.description}" no valor de {formatCurrency(adjustmentToDelete.amount)}? Esta ação não pode ser desfeita e irá reverter o valor da origem/destino se aplicável.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAdjustment} className="bg-destructive hover:bg-destructive/90">
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      <TransferDialog
        isOpen={isTransferDialogOpen}
        onOpenChange={setIsTransferDialogOpen}
        maxAmount={secondaryCashBoxBalance}
        onTransfer={handleTransfer}
      />
      <EditBalanceDialog
        isOpen={isEditCaixa02DialogOpen}
        onOpenChange={setIsEditCaixa02DialogOpen}
        currentBalance={secondaryCashBoxBalance}
        onSave={(newBalance) => handleEditBalance(newBalance, 'secondary_cash')}
        title="Editar Saldo do Caixa 02"
        description="Ajuste o valor total do seu caixa secundário."
        idPrefix="caixa02"
      />
      <EditBalanceDialog
        isOpen={isEditBankAccountDialogOpen}
        onOpenChange={setIsEditBankAccountDialogOpen}
        currentBalance={bankAccountBalance}
        onSave={(newBalance) => handleEditBalance(newBalance, 'bank_account')}
        title="Editar Saldo da Conta Bancária"
        description="Ajuste o saldo total da sua conta bancária."
        idPrefix="bank"
      />
      <EditBalanceDialog
        isOpen={isEditInitialBalanceDialogOpen}
        onOpenChange={setIsEditInitialBalanceDialogOpen}
        currentBalance={cashStatus.openingBalance || 0}
        onSave={handleEditInitialBalance}
        title="Editar Saldo Inicial do Caixa"
        description="Ajuste o valor de abertura do caixa. Isso afetará o balanço final."
        idPrefix="initial-balance"
      />
    </>
  );
}

function OpenCashRegisterDialog({ isOpen, onOpenChange, onOpen, secondaryCashBalance }: { isOpen: boolean, onOpenChange: (open: boolean) => void, onOpen: (balance: number) => void, secondaryCashBalance: number }) {
  const [balance, setBalance] = useState('');
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const balanceValue = parseFloat(balance.replace(',', '.'));
    if (isNaN(balanceValue) || balanceValue < 0) {
      toast({ title: "Valor Inválido", description: "Por favor, insira um saldo inicial válido.", variant: 'destructive' });
      return;
    }
    onOpen(balanceValue);
    setBalance('');
  };

  return (
     <Dialog open={isOpen} onOpenChange={(open) => { if (!open) setBalance(''); onOpenChange(open); }}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Abrir Caixa Diário</DialogTitle>
            <DialogDescription>
              Insira o valor a ser transferido do Caixa 02 para iniciar as operações. 
              Saldo disponível no Caixa 02: <strong>{formatCurrency(secondaryCashBalance)}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="openingBalance">Saldo Inicial (R$)</Label>
            <Input id="openingBalance" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="Ex: 100,00" type="number" step="0.01" autoFocus />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
            <Button type="submit">Confirmar e Abrir</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CloseCashRegisterDialog({ isOpen, onOpenChange, onClose, summary }: { isOpen: boolean, onOpenChange: (open: boolean) => void, onClose: () => void, summary: any }) {
  const totalGeralVendas = summary.totalSessionRevenue;
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Fechamento do Caixa?</AlertDialogTitle>
          <AlertDialogDescription>Revise os totais antes de fechar. Esta ação não pode ser desfeita.</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="text-sm space-y-2 my-4">
            <div className="flex justify-between"><span>Saldo Inicial:</span> <strong>{formatCurrency(summary.openingBalance)}</strong></div>
            <div className="flex justify-between"><span>(+) Vendas em Dinheiro:</span> <span>{formatCurrency(summary.cashRevenue)}</span></div>
            <div className="flex justify-between"><span>(+) Suprimentos:</span> <span>{formatCurrency(summary.totalIn)}</span></div>
            <div className="flex justify-between"><span>(-) Sangrias:</span> <span>{formatCurrency(summary.totalOut)}</span></div>
            <Separator />
            <div className="flex justify-between text-base font-bold"><span>(=) Total em Caixa (Esperado):</span> <strong>{formatCurrency(summary.expectedCash)}</strong></div>
            <Separator />
            <div className="flex justify-between"><span>Vendas em Cartão:</span> <span>{formatCurrency(summary.cardRevenue)}</span></div>
            <div className="flex justify-between"><span>Vendas em PIX:</span> <span>{formatCurrency(summary.pixRevenue)}</span></div>
            <Separator />
            <div className="flex justify-between"><span>Total Geral de Vendas:</span> <strong>{formatCurrency(totalGeralVendas)}</strong></div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onClose} className="bg-destructive hover:bg-destructive/90">
            Confirmar e Fechar Caixa
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function CashAdjustmentDialog({ isOpen, onOpenChange, type, onSave, adjustmentToEdit }: { isOpen: boolean, onOpenChange: (open: boolean) => void, type: 'in' | 'out', onSave: (details: { amount: number, description: string, destination?: 'none' | 'secondary_cash' | 'bank_account' }, idToUpdate?: string) => void, adjustmentToEdit?: CashAdjustment | null }) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [destination, setDestination] = useState<'none' | 'secondary_cash' | 'bank_account'>('none');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      if (adjustmentToEdit) {
        setAmount(String(adjustmentToEdit.amount));
        setDescription(adjustmentToEdit.description);
        setDestination(adjustmentToEdit.destination || 'none');
      } else {
        setAmount('');
        setDescription('');
        setDestination('none');
      }
    }
  }, [isOpen, adjustmentToEdit]);

  const isEditing = !!adjustmentToEdit;
  const title = isEditing ? 'Editar Movimentação' : (type === 'in' ? 'Suprimento de Caixa (Entrada)' : 'Sangria de Caixa (Retirada)');
  const dialogDesc = isEditing ? 'Altere os detalhes da movimentação.' : (type === 'in' ? 'Registre uma entrada de dinheiro no caixa (ex: reforço de troco).' : 'Registre uma retirada de dinheiro do caixa (ex: guardar em local seguro).');
  const label = type === 'in' ? 'Valor de Entrada (R$)' : 'Valor de Retirada (R$)'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(amount.replace(',', '.'));
    if (isNaN(value) || value <= 0) {
      toast({ title: "Valor Inválido", description: "Insira um valor positivo.", variant: "destructive" });
      return;
    }
    if (description.trim() === '') {
      toast({ title: "Descrição Obrigatória", description: "Forneça uma breve descrição para a movimentação.", variant: "destructive" });
      return;
    }
    onSave({ amount: value, description: description.trim(), destination }, adjustmentToEdit?.id);
    onOpenChange(false);
  };

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
  };


  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{dialogDesc}</DialogDescription></DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adjustment-amount">{label}</Label>
              <Input id="adjustment-amount" value={amount} onChange={(e) => setAmount(e.target.value)} type="number" step="0.01" placeholder="0,00" autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjustment-desc">Descrição</Label>
              <Input id="adjustment-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Troco inicial" />
            </div>
            {type === 'out' && !isEditing && (
              <div className="space-y-2">
                <Label htmlFor="adjustment-destination">Destino da Retirada</Label>
                <Select value={destination} onValueChange={(value) => setDestination(value as any)}>
                  <SelectTrigger id="adjustment-destination">
                    <SelectValue placeholder="Selecione um destino..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum (Registrar como Despesa)</SelectItem>
                    <SelectItem value="secondary_cash">Transferir para Caixa 02</SelectItem>
                    <SelectItem value="bank_account">Transferir para Conta Bancária</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TransferDialog({ isOpen, onOpenChange, maxAmount, onTransfer }: { 
  isOpen: boolean, onOpenChange: (open: boolean) => void, maxAmount: number, onTransfer: (details: { amount: number, destination: 'daily_cash' | 'bank_account' }) => void 
}) {
  const [amount, setAmount] = useState('');
  const [destination, setDestination] = useState<'daily_cash' | 'bank_account'>('daily_cash');
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(amount.replace(',', '.'));
    if (isNaN(value) || value <= 0) {
      toast({ title: "Valor Inválido", description: "Insira um valor positivo.", variant: "destructive" });
      return;
    }
    if (value > maxAmount) {
      toast({ title: "Saldo Insuficiente", description: `O valor máximo para transferência é ${formatCurrency(maxAmount)}.`, variant: "destructive" });
      return;
    }
    onTransfer({ amount: value, destination });
    onOpenChange(false);
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setAmount('');
      setDestination('daily_cash');
    }
    onOpenChange(open);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader><DialogTitle>Transferência do Caixa 02</DialogTitle><DialogDescription>Mova dinheiro do Caixa 02 para outro local. Saldo disponível: <strong>{formatCurrency(maxAmount)}</strong></DialogDescription></DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="transfer-destination">Destino</Label>
              <Select value={destination} onValueChange={(value) => setDestination(value as any)}>
                <SelectTrigger id="transfer-destination">
                  <SelectValue placeholder="Selecione um destino..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily_cash">Caixa Diário (Principal)</SelectItem>
                  <SelectItem value="bank_account">Conta Bancária</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transfer-amount">Valor a Transferir (R$)</Label>
              <Input id="transfer-amount" value={amount} onChange={(e) => setAmount(e.target.value)} type="number" step="0.01" placeholder="0,00" autoFocus />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
            <Button type="submit">Confirmar Transferência</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
        <form onSubmit={handleSubmit}>
          <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor={`${idPrefix}-balance-edit`}>Novo Saldo Total (R$)</Label>
            <Input id={`${idPrefix}-balance-edit`} value={balance} onChange={(e) => setBalance(e.target.value)} type="number" step="0.01" placeholder="0,00" autoFocus />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
