
"use client";

import type { CashRegisterStatus, Sale, SecondaryCashBox, CashAdjustment, BankAccount, FinancialEntry } from '@/types';
import { getSales, formatCurrency, getSecondaryCashBox, saveSecondaryCashBox, getBankAccount, saveBankAccount, getFinancialEntries, saveFinancialEntries, saveCashRegisterStatus, getCashRegisterStatus } from '@/lib/constants';
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


const CLOSED_SESSIONS_KEY = 'barmate_closedCashSessions_v2'; // Still local, as it's just a log

export default function CashRegisterClient() {
  const [isLoading, setIsLoading] = useState(true);
  const [cashStatus, setCashStatus] = useState<CashRegisterStatus>({ status: 'closed', adjustments: [] });
  const [secondaryCashBox, setSecondaryCashBox] = useState<SecondaryCashBox>({ balance: 0 });
  const [bankAccount, setBankAccount] = useState<BankAccount>({ balance: 0 });
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

  useEffect(() => {
    const handleStorageChange = async () => {
        setIsLoading(true);
        try {
            const [salesData, secondaryCashData, bankAccountData, cashRegisterStatusData] = await Promise.all([
                getSales(),
                getSecondaryCashBox(),
                getBankAccount(),
                getCashRegisterStatus(),
            ]);
            setSales(salesData);
            setSecondaryCashBox(secondaryCashData);
            setBankAccount(bankAccountData);
            setCashStatus(cashRegisterStatusData);
        } catch (e) {
            console.error("Failed to load cash register data", e);
            toast({ title: "Erro ao Carregar Dados", description: "Não foi possível buscar dados da nuvem.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };
    
    handleStorageChange();
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    }
  }, [toast]);

  useEffect(() => {
    if (!isLoading) {
      saveCashRegisterStatus(cashStatus);
    }
  }, [cashStatus, isLoading]);

  const handleOpenCashRegister = async (openingBalance: number) => {
    const currentSecondaryBox = await getSecondaryCashBox();

    if (currentSecondaryBox.balance < openingBalance) {
      toast({
        title: "Saldo Insuficiente no Caixa 02",
        description: `Não há saldo suficiente no Caixa 02 para abrir o caixa diário com ${formatCurrency(openingBalance)}.`,
        variant: "destructive",
      });
      return;
    }
    
    await saveSecondaryCashBox({ balance: currentSecondaryBox.balance - openingBalance });

    const newStatus: CashRegisterStatus = {
      status: 'open',
      openingBalance: openingBalance,
      openingTime: new Date().toISOString(),
      adjustments: [],
    };
    setCashStatus(newStatus);
    setIsOpeningDialog(false);
    toast({
      title: "Caixa Diário Aberto!",
      description: `${formatCurrency(openingBalance)} foram transferidos do Caixa 02 para o caixa diário.`,
    });
  };

  const handleSaveAdjustment = (details: { amount: number; description: string; destination?: 'none' | 'secondary_cash' | 'bank_account' }, idToUpdate?: string) => {
    if (cashStatus.status !== 'open') return;

    if (idToUpdate) { // Editing existing adjustment
        const originalAdjustment = cashStatus.adjustments?.find(adj => adj.id === idToUpdate);
        if (!originalAdjustment) return;
        
        revertAdjustment(originalAdjustment);
        
        const updatedAdjustment: CashAdjustment = { ...originalAdjustment, amount: details.amount, description: details.description };
        
        applyAdjustment(updatedAdjustment);

        setCashStatus(prev => ({...prev, adjustments: prev.adjustments?.map(adj => adj.id === idToUpdate ? updatedAdjustment : adj)}));
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
        setCashStatus(prev => ({...prev, adjustments: [...(prev.adjustments || []), newAdjustment]}));
        
        toast({ title: `Movimentação Registrada!`, description: `${adjustmentType === 'in' ? 'Suprimento' : 'Sangria'} de ${formatCurrency(details.amount)} adicionado.` });
    }
    
    setIsAdjustmentDialogOpen(false);
    setEditingAdjustment(null);
  };
  
  const applyAdjustment = async (adjustment: CashAdjustment) => {
    if (adjustment.type === 'out') { // Sangria
        if (adjustment.destination === 'secondary_cash') {
            const currentBox = await getSecondaryCashBox();
            await saveSecondaryCashBox({ balance: currentBox.balance + adjustment.amount });
        } else if (adjustment.destination === 'bank_account') {
            const currentAccount = await getBankAccount();
            await saveBankAccount({ balance: currentAccount.balance + adjustment.amount });
        }
    }
  }
  
  const revertAdjustment = async (adjustment: CashAdjustment) => {
    const { type, amount, destination, source } = adjustment;

    if (type === 'out') { // Sangria reversal
      if (destination === 'secondary_cash') {
        const currentBox = await getSecondaryCashBox();
        await saveSecondaryCashBox({ balance: currentBox.balance - amount });
      } else if (destination === 'bank_account') {
        const currentAccount = await getBankAccount();
        await saveBankAccount({ balance: currentAccount.balance - amount });
      }
    } 
    else if (type === 'in') { // Suprimento reversal
      if (source === 'secondary_cash') {
        const currentBox = await getSecondaryCashBox();
        await saveSecondaryCashBox({ balance: currentBox.balance + amount });
      }
    }
  }

  const handleDeleteAdjustment = () => {
    if (!adjustmentToDelete || cashStatus.status !== 'open') return;
    revertAdjustment(adjustmentToDelete);
    setCashStatus(prev => ({ ...prev, adjustments: prev.adjustments?.filter(adj => adj.id !== adjustmentToDelete.id) }));
    toast({ title: "Movimentação Removida", variant: "destructive" });
    setAdjustmentToDelete(null);
  };

  const handleEditInitialBalance = (newBalance: number) => {
    if (cashStatus.status !== 'open') return;
    setCashStatus(prev => ({ ...prev, openingBalance: newBalance }));
    toast({ title: "Saldo Inicial Atualizado", description: `O saldo foi definido para ${formatCurrency(newBalance)}.` });
    setIsEditInitialBalanceDialogOpen(false);
  };

  const handleTransfer = async (details: { amount: number; destination: 'daily_cash' | 'bank_account' }) => {
    const { amount, destination } = details;
    const currentSecondaryBox = await getSecondaryCashBox();

    if (currentSecondaryBox.balance < amount) {
        toast({ title: "Saldo Insuficiente", description: "O Caixa 02 não possui saldo suficiente para esta transferência.", variant: "destructive" });
        return;
    }
    
    await saveSecondaryCashBox({ balance: currentSecondaryBox.balance - amount });

    if (destination === 'daily_cash') {
      if (cashStatus.status !== 'open') {
        toast({ title: "Caixa Fechado", description: "Não é possível transferir para o caixa diário pois ele está fechado.", variant: "destructive" });
        await saveSecondaryCashBox({ balance: currentSecondaryBox.balance }); // Rollback
        return;
      }
      const transferAdjustment: CashAdjustment = {
          id: `adj-transfer-${Date.now()}`, amount, type: 'in', description: `Transferência do Caixa 02`, timestamp: new Date().toISOString(), source: 'secondary_cash'
      };
      setCashStatus(prev => ({ ...prev, adjustments: [...(prev.adjustments || []), transferAdjustment] }));
      toast({ title: "Transferência Realizada", description: `${formatCurrency(amount)} movido do Caixa 02 para o Caixa Diário.` });

    } else if (destination === 'bank_account') {
      const currentAccount = await getBankAccount();
      await saveBankAccount({ balance: currentAccount.balance + amount });
      toast({ title: "Transferência Realizada", description: `${formatCurrency(amount)} movido do Caixa 02 para a Conta Bancária.` });
    }

    setIsTransferDialogOpen(false);
  }

  const handleEditCaixa02 = async (newBalance: number) => {
    await saveSecondaryCashBox({ balance: newBalance });
    toast({ title: "Caixa 02 Atualizado", description: `O saldo foi definido para ${formatCurrency(newBalance)}.` });
    setIsEditCaixa02DialogOpen(false);
  }

  const handleEditBankAccount = async (newBalance: number) => {
    await saveBankAccount({ balance: newBalance });
    toast({ title: "Conta Bancária Atualizada", description: `O saldo foi definido para ${formatCurrency(newBalance)}.` });
    setIsEditBankAccountDialogOpen(false);
  }

  const handleCloseCashRegister = async () => {
    const finalCashAmount = sessionSummary.expectedCash;

    if (finalCashAmount > 0) {
        const currentSecondaryBox = await getSecondaryCashBox();
        await saveSecondaryCashBox({ balance: currentSecondaryBox.balance + finalCashAmount });
    }

    const closedSession = {
      ...sessionSummary,
      id: `session-${Date.now()}`,
      closingTime: new Date().toISOString(),
      transferredToCaixa02: finalCashAmount,
    };
    
    const allClosedSessions = JSON.parse(localStorage.getItem(CLOSED_SESSIONS_KEY) || '[]');
    allClosedSessions.push(closedSession);
    localStorage.setItem(CLOSED_SESSIONS_KEY, JSON.stringify(allClosedSessions));

    setCashStatus({ status: 'closed', adjustments: [] });
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
        if (sale.leaveChangeAsCredit && sale.cashTendered && sale.cashTendered > 0) {
            return total + sale.cashTendered;
        }
        const cashPayment = sale.payments.find(p => p.method === 'cash')?.amount ?? 0;
        return total + cashPayment;
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

    const expectedCash = openingBalance + cashRevenue + totalIn - totalOut;

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
          secondaryCashBalance={secondaryCashBox.balance}
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
                        <p className="text-3xl font-bold">{formatCurrency(secondaryCashBox.balance)}</p>
                    </div>
                    <Button className="w-full" onClick={() => setIsTransferDialogOpen(true)} disabled={secondaryCashBox.balance <= 0}>
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
                        <p className="text-3xl font-bold">{formatCurrency(bankAccount.balance)}</p>
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
        maxAmount={secondaryCashBox.balance}
        onTransfer={handleTransfer}
      />
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
