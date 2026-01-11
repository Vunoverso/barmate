"use client";

import type { CashRegisterStatus, Sale, SecondaryCashBox, CashAdjustment, BankAccount, FinancialEntry } from '@/types';
import { getSales, formatCurrency, getFinancialEntries, saveFinancialEntries, saveCashRegisterStatus, getCashRegisterStatus, addFinancialEntry, KEY_CLOSED_SESSIONS, getVisuallyRemovedAdjustments, saveVisuallyRemovedAdjustments, getSales as getAllSales, saveSales } from '@/lib/constants';
import { useState, useEffect, useMemo, useCallback } from 'react';
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


type AccountType = 'daily_cash' | 'secondary_cash' | 'bank_account';

const ACCOUNT_NAMES: Record<AccountType, string> = {
    daily_cash: 'Caixa Diário',
    secondary_cash: 'Caixa 02',
    bank_account: 'Conta Bancária'
};

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
  const [visuallyRemovedAdjustments, setVisuallyRemovedAdjustments] = useState<string[]>([]);
  
  const loadInitialData = useCallback(() => {
    setIsLoading(true);
    setCashStatus(getCashRegisterStatus());
    setAllFinancialEntries(getFinancialEntries());
    setSales(getSales());
    setVisuallyRemovedAdjustments(getVisuallyRemovedAdjustments());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadInitialData();

    const handleStorageChange = (event: StorageEvent) => {
        if (event.key === 'barmate_cashRegisterStatus_v2' || event.key === 'barmate_financialEntries_v2' || event.key === 'barmate_sales_v2') {
            loadInitialData();
        }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadInitialData]); 


  // Calculated balances
    const dailyCashBalance = useMemo(() => {
        if (cashStatus.status !== 'open' || !cashStatus.openingTime) return 0;
        
        return allFinancialEntries
            .filter(e => e.source === 'daily_cash' && new Date(e.timestamp) >= new Date(cashStatus.openingTime!))
            .reduce((acc, e) => acc + (e.type === 'income' ? e.amount : -e.amount), 0);
    }, [allFinancialEntries, cashStatus]);

    const secondaryCashBoxBalance = useMemo(() => {
        return allFinancialEntries
        .filter(e => e.source === 'secondary_cash')
        .reduce((acc, e) => acc + (e.type === 'income' ? e.amount : -e.amount), 0);
    }, [allFinancialEntries]);
  
    const bankAccountBalance = useMemo(() => {
        return allFinancialEntries
        .filter(e => e.source === 'bank_account')
        .reduce((acc, e) => acc + (e.type === 'income' ? e.amount : -e.amount), 0);
    }, [allFinancialEntries]);

    const balances: Record<AccountType, number> = {
        daily_cash: dailyCashBalance,
        secondary_cash: secondaryCashBoxBalance,
        bank_account: bankAccountBalance
    };


  const handleOpenCashRegister = (openingBalance: number) => {
    if (secondaryCashBoxBalance < openingBalance) {
      toast({
        title: "Saldo Insuficiente no Caixa 02",
        description: `Não há saldo suficiente no Caixa 02 para abrir o caixa diário com ${formatCurrency(openingBalance)}.`,
        variant: "destructive",
      });
      return;
    }
    
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
    const currentCashStatus = getCashRegisterStatus();
    if (currentCashStatus.status !== 'open') return;

    if (idToUpdate && editingAdjustment) { // Editing existing adjustment
        const allEntries = getFinancialEntries();
        // Update the original entry directly without creating estorno
        const newEntries = allEntries.map(entry => {
            if (entry.adjustmentId === idToUpdate) {
                 const updatedEntry = {
                    ...entry,
                    amount: details.amount,
                    description: `${editingAdjustment.type === 'in' ? 'Entrada/Suprimento' : 'Saída/Despesa'}: ${details.description}`,
                };
                 // If the adjustment was a transfer out, update the corresponding income entry too
                if (editingAdjustment.type === 'out' && editingAdjustment.destination) {
                    const correspondingIncomeEntry = allEntries.find(e => e.adjustmentId === idToUpdate && e.type === 'income');
                    if (correspondingIncomeEntry) {
                        return allEntries.map(e => {
                            if (e.id === correspondingIncomeEntry.id) {
                                return { ...e, amount: details.amount, description: `Entrada de Sangria: ${details.description}`};
                            }
                            if (e.id === entry.id) {
                                return updatedEntry;
                            }
                            return e;
                        }).flat();
                    }
                }
                return updatedEntry;
            }
            return entry;
        }).flat();
        saveFinancialEntries(newEntries);

        const updatedAdjustment: CashAdjustment = { ...editingAdjustment, amount: details.amount, description: details.description };
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
        
        const newAdjustments = [...(currentCashStatus.adjustments || []), newAdjustment];
        saveCashRegisterStatus({ ...currentCashStatus, adjustments: newAdjustments });
        
        applyAdjustment(newAdjustment);
        
        toast({ title: `Movimentação Registrada!`, description: `${adjustmentType === 'in' ? 'Suprimento' : 'Sangria'} de ${formatCurrency(details.amount)} adicionado.` });
    }
    
    setIsAdjustmentDialogOpen(false);
    setEditingAdjustment(null);
  };
  
  const applyAdjustment = (adjustment: CashAdjustment) => {
      const entriesToAdd: Omit<FinancialEntry, 'id'|'timestamp'>[] = [];
      
       entriesToAdd.push({
        description: `${adjustment.type === 'in' ? 'Entrada/Suprimento' : 'Saída/Despesa'}: ${adjustment.description}`,
        amount: adjustment.amount,
        type: adjustment.type === 'in' ? 'income' : 'expense',
        source: 'daily_cash',
        saleId: null,
        adjustmentId: adjustment.id
      });
      
      if (adjustment.type === 'out' && adjustment.destination) { 
          if (adjustment.destination === 'secondary_cash') {
              entriesToAdd.push({ description: `Entrada de Sangria: ${adjustment.description}`, amount: adjustment.amount, type: 'income', source: 'secondary_cash', saleId: null, adjustmentId: adjustment.id });

          } else if (adjustment.destination === 'bank_account') {
              entriesToAdd.push({ description: `Depósito de Sangria: ${adjustment.description}`, amount: adjustment.amount, type: 'income', source: 'bank_account', saleId: null, adjustmentId: adjustment.id });
          }
      }
      addFinancialEntry(entriesToAdd);
  }
  
  const handleDeleteAdjustment = (revert: boolean) => {
    if (!adjustmentToDelete) return;

    if (revert) {
        // Find all financial entries related to this adjustmentId and remove them
        const allEntries = getFinancialEntries();
        const entriesToKeep = allEntries.filter(e => e.adjustmentId !== adjustmentToDelete.id);
        saveFinancialEntries(entriesToKeep);
        
        // Remove adjustment from cash register status
        const currentCashStatus = getCashRegisterStatus();
        if (currentCashStatus.status === 'open') {
            const newAdjustments = currentCashStatus.adjustments?.filter(adj => adj.id !== adjustmentToDelete.id) || [];
            saveCashRegisterStatus({ ...currentCashStatus, adjustments: newAdjustments });
        }

        toast({ title: "Movimentação Revertida", description: "A movimentação e seus impactos financeiros foram estornados.", variant: "default" });

    } else { 
        // Just hide it visually for this session
        const currentRemoved = getVisuallyRemovedAdjustments();
        const newRemoved = [...currentRemoved, adjustmentToDelete.id];
        saveVisuallyRemovedAdjustments(newRemoved);
        setVisuallyRemovedAdjustments(newRemoved); // Update local state immediately

        toast({ title: "Movimentação Removida do Histórico", description: "A movimentação foi removida apenas da visualização da sessão atual.", variant: "default" });
    }
    
    setAdjustmentToDelete(null);
  };

  const handleTransfer = (details: { amount: number; source: AccountType; destination: AccountType }) => {
    const { amount, source, destination } = details;
    const transferId = `transfer-${Date.now()}`;

    addFinancialEntry([
        { description: `Transferência para ${ACCOUNT_NAMES[destination]}`, amount: amount, type: 'expense', source: source, saleId: null, adjustmentId: transferId },
        { description: `Transferência de ${ACCOUNT_NAMES[source]}`, amount: amount, type: 'income', source: destination, saleId: null, adjustmentId: transferId }
    ]);
    
    // If the transfer involves the daily cash, it needs to be an adjustment
    if (source === 'daily_cash' || destination === 'daily_cash') {
        const currentCashStatus = getCashRegisterStatus();
        if (currentCashStatus.status === 'open') {
            const isToDaily = destination === 'daily_cash';
            const adjustment: CashAdjustment = {
                id: transferId,
                amount: amount,
                type: isToDaily ? 'in' : 'out',
                description: isToDaily ? `Transferência de ${ACCOUNT_NAMES[source]}` : `Transferência para ${ACCOUNT_NAMES[destination]}`,
                timestamp: new Date().toISOString(),
                source: isToDaily ? source : undefined,
                destination: !isToDaily ? destination : undefined,
            };
            const newAdjustments = [...(currentCashStatus.adjustments || []), adjustment];
            saveCashRegisterStatus({ ...currentCashStatus, adjustments: newAdjustments });
        }
    }

    toast({ title: "Transferência Realizada!", description: `${formatCurrency(amount)} movido de ${ACCOUNT_NAMES[source]} para ${ACCOUNT_NAMES[destination]}.` });
    setIsTransferDialogOpen(false);
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
    saveVisuallyRemovedAdjustments([]); // Clear session removals
    
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
        const salePayments = sale.payments || [];
        const cashPayment = salePayments.find(p => p.method === 'cash')?.amount ?? 0;
        return total + cashPayment;
    }, 0);
    
    const cardRevenue = sessionSales.reduce((total, sale) => {
        const salePayments = sale.payments || [];
        const cardPaymentsAmount = salePayments.filter(p => p.method === 'credit' || p.method === 'debit').reduce((sum, p) => sum + p.amount, 0);
        return total + cardPaymentsAmount;
    }, 0);

    const pixRevenue = sessionSales.reduce((total, sale) => {
        const salePayments = sale.payments || [];
        const pixPayment = salePayments.find(p => p.method === 'pix')?.amount || 0;
        return total + pixPayment;
    }, 0);
    
    const openingBalance = cashStatus.openingBalance || 0;
    const adjustments = cashStatus.adjustments || [];
    
    // Total 'in' adjustments, EXCLUDING the opening balance entry for the summary display
    const totalIn = adjustments.filter(a => a.type === 'in' && a.description !== 'Valor de Abertura' && !visuallyRemovedAdjustments.includes(a.id)).reduce((sum, a) => sum + a.amount, 0);
    // Total 'out' adjustments
    const totalOut = adjustments.filter(a => a.type === 'out' && !visuallyRemovedAdjustments.includes(a.id)).reduce((sum, a) => sum + a.amount, 0);
    
    const totalCashFromSales = sessionSales.reduce((sum, sale) => {
        const salePayments = sale.payments || [];
        return sum + (salePayments.find(p => p.method === 'cash')?.amount || 0);
    }, 0);
    
    // Correct calculation for expected cash
    const expectedCash = (openingBalance + totalCashFromSales + totalIn) - totalOut;
    
    return {
      openingBalance, sessionSales, totalSessionRevenue, cashRevenue, cardRevenue, pixRevenue, expectedCash, openingTime: cashStatus.openingTime, adjustments, totalIn, totalOut
    };
  }, [cashStatus, sales, visuallyRemovedAdjustments]);

  const sortedAdjustments = useMemo(() => {
    if (!cashStatus.adjustments) return [];
    return [...cashStatus.adjustments]
        .filter(adj => !visuallyRemovedAdjustments.includes(adj.id)) 
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [cashStatus.adjustments, visuallyRemovedAdjustments]);


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
                                    <span className="flex items-center gap-2"><ArrowUpCircle className="h-4 w-4 text-green-600"/>Suprimentos (Entradas Adicionais)</span>
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
                    <CardTitle>Operações entre Contas</CardTitle>
                    <CardDescription>Mova dinheiro entre Caixa Diário, Caixa 02 e Conta Bancária.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button className="w-full" onClick={() => setIsTransferDialogOpen(true)}>
                        <ArrowRightLeft className="mr-2 h-4 w-4" /> Realizar Transferência
                    </Button>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        Caixa 02 (Secundário)
                    </CardTitle>
                    <CardDescription>Use para guardar valores separadamente.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="text-center">
                        <p className="text-sm text-muted-foreground">Saldo Atual</p>
                        <p className="text-3xl font-bold">{formatCurrency(secondaryCashBoxBalance)}</p>
                    </div>
                </CardContent>
             </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        Conta Bancária
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
                Como você deseja remover a movimentação "{adjustmentToDelete.description}"?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="sm:justify-between gap-2">
                <Button variant="secondary" onClick={() => handleDeleteAdjustment(false)}>
                    Apenas Excluir do Histórico
                </Button>
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2">
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDeleteAdjustment(true)} className="bg-destructive hover:bg-destructive/90">
                        Excluir e Estornar Valor
                    </AlertDialogAction>
                </div>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      <TransferDialog
        isOpen={isTransferDialogOpen}
        onOpenChange={setIsTransferDialogOpen}
        balances={balances}
        onTransfer={handleTransfer}
        cashStatus={cashStatus.status}
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
  const totalEntradasAdicionais = summary.totalIn; // This is already without opening balance

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
            <div className="flex justify-between"><span>(+) Suprimentos:</span> <span>{formatCurrency(totalEntradasAdicionais)}</span></div>
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
            {type === 'out' && (
              <div className="space-y-2">
                <Label htmlFor="adjustment-destination">Destino da Retirada</Label>
                <Select value={destination} onValueChange={(value) => setDestination(value as any)} disabled={isEditing}>
                  <SelectTrigger id="adjustment-destination">
                    <SelectValue placeholder="Selecione um destino..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum (Registrar como Despesa)</SelectItem>
                    <SelectItem value="secondary_cash">Transferir para Caixa 02</SelectItem>
                    <SelectItem value="bank_account">Transferir para Conta Bancária</SelectItem>
                  </SelectContent>
                </Select>
                 {isEditing && <p className="text-xs text-muted-foreground">O destino não pode ser alterado após a criação.</p>}
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

function TransferDialog({ isOpen, onOpenChange, balances, onTransfer, cashStatus }: { 
  isOpen: boolean, 
  onOpenChange: (open: boolean) => void, 
  balances: Record<AccountType, number>,
  onTransfer: (details: { amount: number; source: AccountType; destination: AccountType }) => void,
  cashStatus: 'open' | 'closed'
}) {
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState<AccountType | ''>('');
  const [destination, setDestination] = useState<AccountType | ''>('');
  const { toast } = useToast();

  const availableAccounts = useMemo(() => {
      const all: { id: AccountType, name: string }[] = [
          { id: 'secondary_cash', name: ACCOUNT_NAMES.secondary_cash },
          { id: 'bank_account', name: ACCOUNT_NAMES.bank_account },
      ];
      if (cashStatus === 'open') {
          all.unshift({ id: 'daily_cash', name: ACCOUNT_NAMES.daily_cash });
      }
      return all;
  }, [cashStatus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(amount.replace(',', '.'));
    
    if (!source || !destination) {
        toast({ title: "Seleção Incompleta", description: "Selecione as contas de origem e destino.", variant: "destructive" });
        return;
    }
    if (source === destination) {
        toast({ title: "Seleção Inválida", description: "A conta de origem não pode ser igual à de destino.", variant: "destructive" });
        return;
    }
    if (isNaN(value) || value <= 0) {
      toast({ title: "Valor Inválido", description: "Insira um valor positivo.", variant: "destructive" });
      return;
    }
    if (value > balances[source]) {
      toast({ title: "Saldo Insuficiente", description: `A conta de origem (${ACCOUNT_NAMES[source]}) não tem saldo suficiente.`, variant: "destructive" });
      return;
    }
    onTransfer({ amount: value, source, destination });
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setAmount('');
      setSource('');
      setDestination('');
    }
    onOpenChange(open);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Transferência entre Contas</DialogTitle>
            <DialogDescription>Mova valores entre os seus caixas e conta bancária.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="transfer-source">Origem</Label>
              <Select onValueChange={(value) => setSource(value as AccountType)} value={source}>
                <SelectTrigger id="transfer-source">
                  <SelectValue placeholder="Selecione a conta de origem..." />
                </SelectTrigger>
                <SelectContent>
                  {availableAccounts.map(account => (
                      <SelectItem key={account.id} value={account.id} disabled={balances[account.id] <= 0}>
                        {account.name} ({formatCurrency(balances[account.id])})
                      </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transfer-destination">Destino</Label>
              <Select onValueChange={(value) => setDestination(value as AccountType)} value={destination} disabled={!source}>
                <SelectTrigger id="transfer-destination">
                  <SelectValue placeholder="Selecione a conta de destino..." />
                </SelectTrigger>
                <SelectContent>
                   {availableAccounts.filter(acc => acc.id !== source).map(account => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                  ))}
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
