
"use client";

import type { CashRegisterStatus, Sale } from '@/types';
import { getSales, formatCurrency, PAYMENT_METHODS } from '@/lib/constants';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { DoorClosed, DoorOpen, Calculator, PiggyBank, CircleDollarSign, CreditCard, QrCode } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const CASH_REGISTER_STATUS_KEY = 'barmate_cashRegisterStatus';
const CLOSED_SESSIONS_KEY = 'barmate_closedCashSessions';

export default function CashRegisterClient() {
  const [isMounted, setIsMounted] = useState(false);
  const [cashStatus, setCashStatus] = useState<CashRegisterStatus>({ status: 'closed' });
  const [sales, setSales] = useState<Sale[]>([]);
  const { toast } = useToast();

  const [isOpeningDialog, setIsOpeningDialog] = useState(false);
  const [isClosingDialog, setIsClosingDialog] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Load cash status
    const storedStatus = localStorage.getItem(CASH_REGISTER_STATUS_KEY);
    if (storedStatus) {
      try {
        setCashStatus(JSON.parse(storedStatus));
      } catch (e) {
        setCashStatus({ status: 'closed' });
      }
    }
    // Load sales and listen for changes
    const handleSalesChange = () => setSales(getSales());
    handleSalesChange();
    window.addEventListener('salesChanged', handleSalesChange);
    return () => window.removeEventListener('salesChanged', handleSalesChange);
  }, []);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem(CASH_REGISTER_STATUS_KEY, JSON.stringify(cashStatus));
    }
  }, [cashStatus, isMounted]);

  const handleOpenCashRegister = (openingBalance: number) => {
    setCashStatus({
      status: 'open',
      openingBalance: openingBalance,
      openingTime: new Date().toISOString(),
    });
    setIsOpeningDialog(false);
    toast({
      title: "Caixa Aberto!",
      description: `Caixa iniciado com um saldo de ${formatCurrency(openingBalance)}.`,
    });
  };

  const handleCloseCashRegister = () => {
    // Here you would typically save the session summary to a persistent store
    // For now, we just log it and add it to a list in localStorage
    const closedSession = {
      ...sessionSummary,
      id: `session-${Date.now()}`,
      closingTime: new Date().toISOString(),
    };
    
    const allClosedSessions = JSON.parse(localStorage.getItem(CLOSED_SESSIONS_KEY) || '[]');
    allClosedSessions.push(closedSession);
    localStorage.setItem(CLOSED_SESSIONS_KEY, JSON.stringify(allClosedSessions));

    setCashStatus({ status: 'closed' });
    setIsClosingDialog(false);
    toast({
      title: "Caixa Fechado",
      description: "O resumo do caixa foi salvo. Pronto para começar um novo dia!",
      variant: 'default'
    });
  };

  const sessionSummary = useMemo(() => {
    if (cashStatus.status !== 'open' || !cashStatus.openingTime) {
      return {
        openingBalance: 0,
        sessionSales: [],
        totalRevenue: 0,
        cashRevenue: 0,
        cardRevenue: 0,
        pixRevenue: 0,
        expectedCash: 0,
      };
    }
    const openingTime = new Date(cashStatus.openingTime);
    const sessionSales = sales.filter(sale => new Date(sale.timestamp) >= openingTime);

    const totalRevenue = sessionSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const cashRevenue = sessionSales
      .filter(s => s.paymentMethod === 'cash')
      .reduce((sum, s) => sum + s.totalAmount, 0);
    const cardRevenue = sessionSales
      .filter(s => s.paymentMethod === 'card')
      .reduce((sum, s) => sum + s.totalAmount, 0);
    const pixRevenue = sessionSales
      .filter(s => s.paymentMethod === 'pix')
      .reduce((sum, s) => sum + s.totalAmount, 0);
    
    const openingBalance = cashStatus.openingBalance || 0;
    const expectedCash = openingBalance + cashRevenue;

    return {
      openingBalance,
      sessionSales,
      totalRevenue,
      cashRevenue,
      cardRevenue,
      pixRevenue,
      expectedCash,
      openingTime: cashStatus.openingTime,
    };
  }, [cashStatus, sales]);

  if (!isMounted) {
    return (
      <Card>
        <CardHeader><CardTitle>Carregando...</CardTitle></CardHeader>
        <CardContent><p>Aguarde um momento enquanto carregamos o estado do caixa.</p></CardContent>
      </Card>
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
        />
      </>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Resumo do Caixa Atual</CardTitle>
          <CardDescription>
            Caixa aberto em {format(new Date(cashStatus.openingTime!), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <SummaryCard title="Saldo Inicial" value={formatCurrency(sessionSummary.openingBalance)} icon={PiggyBank} />
              <SummaryCard title="Total de Vendas" value={formatCurrency(sessionSummary.totalRevenue)} icon={Calculator} />
              <SummaryCard title="Saldo Final (Esperado)" value={formatCurrency(sessionSummary.expectedCash)} icon={CircleDollarSign} description="Saldo inicial + Vendas em dinheiro" />
          </div>
          <Separator />
          <div>
            <h3 className="text-lg font-medium mb-2">Vendas por Método de Pagamento</h3>
            <div className="space-y-2 text-muted-foreground">
              <div className="flex justify-between items-center"><span className="flex items-center gap-2"><CircleDollarSign className="h-4 w-4" />Dinheiro</span> <strong>{formatCurrency(sessionSummary.cashRevenue)}</strong></div>
              <div className="flex justify-between items-center"><span className="flex items-center gap-2"><CreditCard className="h-4 w-4" />Cartão</span> <strong>{formatCurrency(sessionSummary.cardRevenue)}</strong></div>
              <div className="flex justify-between items-center"><span className="flex items-center gap-2"><QrCode className="h-4 w-4" />PIX</span> <strong>{formatCurrency(sessionSummary.pixRevenue)}</strong></div>
            </div>
          </div>
        </CardContent>
        <CardContent>
          <Button size="lg" variant="destructive" className="w-full" onClick={() => setIsClosingDialog(true)}>
            <DoorClosed className="mr-2 h-5 w-5" />
            Fechar Caixa
          </Button>
        </CardContent>
      </Card>
      <CloseCashRegisterDialog 
        isOpen={isClosingDialog}
        onOpenChange={setIsClosingDialog}
        onClose={handleCloseCashRegister}
        summary={sessionSummary}
      />
    </>
  );
}

function SummaryCard({ title, value, icon: Icon, description }: { title: string, value: string, icon: React.ElementType, description?: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  )
}


function OpenCashRegisterDialog({ isOpen, onOpenChange, onOpen }: { isOpen: boolean, onOpenChange: (open: boolean) => void, onOpen: (balance: number) => void }) {
  const [balance, setBalance] = useState('');
  const { toast } = useToast();

  const handleSubmit = () => {
    const balanceValue = parseFloat(balance.replace(',', '.'));
    if (isNaN(balanceValue) || balanceValue < 0) {
      toast({
        title: "Valor Inválido",
        description: "Por favor, insira um saldo inicial válido.",
        variant: 'destructive',
      });
      return;
    }
    onOpen(balanceValue);
  };

  return (
     <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Abrir Caixa</DialogTitle>
          <DialogDescription>
            Insira o valor inicial em dinheiro no caixa (para troco).
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2">
          <Label htmlFor="openingBalance">Saldo Inicial (R$)</Label>
          <Input
            id="openingBalance"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            placeholder="Ex: 100,00"
            type="number"
            step="0.01"
            autoFocus
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button onClick={handleSubmit}>Confirmar e Abrir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CloseCashRegisterDialog({ isOpen, onOpenChange, onClose, summary }: { isOpen: boolean, onOpenChange: (open: boolean) => void, onClose: () => void, summary: any }) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Fechamento do Caixa?</AlertDialogTitle>
          <AlertDialogDescription>
            Revise os totais antes de fechar. Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="text-sm space-y-2">
            <div className="flex justify-between"><span>Saldo Inicial:</span> <strong>{formatCurrency(summary.openingBalance)}</strong></div>
            <Separator />
            <div className="flex justify-between"><span>Vendas em Dinheiro:</span> <span>{formatCurrency(summary.cashRevenue)}</span></div>
            <div className="flex justify-between"><span>Vendas em Cartão:</span> <span>{formatCurrency(summary.cardRevenue)}</span></div>
            <div className="flex justify-between"><span>Vendas em PIX:</span> <span>{formatCurrency(summary.pixRevenue)}</span></div>
            <Separator />
            <div className="flex justify-between"><span>Total de Vendas:</span> <strong>{formatCurrency(summary.totalRevenue)}</strong></div>
            <Separator />
            <div className="flex justify-between text-base font-bold"><span>Total em Caixa (Esperado):</span> <strong>{formatCurrency(summary.expectedCash)}</strong></div>
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
