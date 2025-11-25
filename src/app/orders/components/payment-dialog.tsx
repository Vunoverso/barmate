
"use client";

import type { PaymentMethod, Payment, Sale, OrderItem, ActiveOrder } from '@/types';
import { PAYMENT_METHODS, formatCurrency, getProductCategories } from '@/lib/constants';
import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Banknote, HelpCircle, Download, Printer } from "lucide-react";
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import html2canvas from 'html2canvas';
import { Receipt } from './receipt';
import { useToast } from '@/hooks/use-toast';

interface PaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  totalAmount: number;
  currentOrder: ActiveOrder | undefined;
  allowCredit?: boolean;
  allowPartialPayment?: boolean;
  onSubmit: (saleDetails: {
    payments: Payment[];
    changeGiven: number;
    discountAmount: number;
    status: 'completed';
    leaveChangeAsCredit: boolean;
    cashTendered?: number; // Added to track full cash amount
  }) => void;
}

const parseLocaleFloat = (value: string) => parseFloat(value.replace(',', '.')) || 0;

export default function PaymentDialog({ isOpen, onOpenChange, totalAmount, currentOrder, onSubmit, allowCredit = false, allowPartialPayment = false }: PaymentDialogProps) {
  const [discount, setDiscount] = useState<string>('');
  const [cashAmount, setCashAmount] = useState<string>('');
  const [debitAmount, setDebitAmount] = useState<string>('');
  const [creditAmount, setCreditAmount] = useState<string>('');
  const [pixAmount, setPixAmount] = useState<string>('');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [leaveChangeAsCredit, setLeaveChangeAsCredit] = useState(false);
  const [error, setError] = useState<string>('');
  const [saleCompleted, setSaleCompleted] = useState<Sale | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);


  const numDiscount = parseLocaleFloat(discount);
  const numCashAmount = parseLocaleFloat(cashAmount);
  const numDebitAmount = parseLocaleFloat(debitAmount);
  const numCreditAmount = parseLocaleFloat(creditAmount);
  const numPixAmount = parseLocaleFloat(pixAmount);
  
  const finalBalance = useMemo(() => totalAmount - numDiscount, [totalAmount, numDiscount]);
  const amountToPay = useMemo(() => Math.max(0, finalBalance), [finalBalance]);
  const totalPaid = useMemo(() => numCashAmount + numDebitAmount + numCreditAmount + numPixAmount, [numCashAmount, numDebitAmount, numCreditAmount, numPixAmount]);
  const remainingToPay = useMemo(() => amountToPay - totalPaid, [amountToPay, totalPaid]);

  const numCashTendered = parseLocaleFloat(cashTendered);
  const calculatedCashChange = useMemo(() => {
    // If a specific cash tendered amount is entered, use it to calculate change against the cash portion of the payment
    if (numCashTendered > 0 && numCashAmount > 0) {
      return Math.max(0, numCashTendered - numCashAmount);
    }
    // Otherwise, if there is overpayment in total, consider that as potential change/credit
    if (totalPaid > amountToPay) {
      // The change is the portion of the overpayment made in cash
      const overpayment = totalPaid - amountToPay;
      return Math.min(overpayment, numCashAmount);
    }
    return 0;
  }, [numCashAmount, numCashTendered, totalPaid, amountToPay]);
  
  const changeToReturn = useMemo(() => {
    if (leaveChangeAsCredit) return 0;
    return calculatedCashChange;
  }, [calculatedCashChange, leaveChangeAsCredit]);

  const creditToLeave = useMemo(() => {
    if (!leaveChangeAsCredit) return 0;
    return calculatedCashChange;
  }, [calculatedCashChange, leaveChangeAsCredit]);


  useEffect(() => {
    if (isOpen) {
      setDiscount('');
      setCashAmount('');
      setDebitAmount('');
      setCreditAmount('');
      setPixAmount('');
      setCashTendered('');
      setLeaveChangeAsCredit(false);
      setError('');
      setSaleCompleted(null);
      setSubmitted(false);
    } else {
      // If dialog is closed and a payment was submitted, run the onSubmit callback
      if (submitted && saleCompleted) {
        onSubmit({
          payments: saleCompleted.payments,
          discountAmount: saleCompleted.discountAmount,
          changeGiven: saleCompleted.changeGiven || 0,
          status: 'completed',
          leaveChangeAsCredit: saleCompleted.leaveChangeAsCredit || false,
          cashTendered: saleCompleted.cashTendered || undefined,
        });
      }
    }
  }, [isOpen]);

  const setPayFull = (method: PaymentMethod) => {
    const otherPaid = 
      (method === 'cash' ? 0 : numCashAmount) + 
      (method === 'debit' ? 0 : numDebitAmount) + 
      (method === 'credit' ? 0 : numCreditAmount) + 
      (method === 'pix' ? 0 : numPixAmount);
    const amount = Math.max(0, amountToPay - otherPaid);
    const value = amount > 0 ? amount.toFixed(2).replace('.', ',') : '';

    if (method === 'cash') setCashAmount(value);
    if (method === 'debit') setDebitAmount(value);
    if (method === 'credit') setCreditAmount(value);
    if (method === 'pix') setPixAmount(value);
  }

  const isSubmitDisabled = useMemo(() => {
    const roundedRemaining = Math.round(remainingToPay * 100) / 100;

    if (totalPaid <= 0 && amountToPay > 0) {
      return true;
    }
    if (!allowPartialPayment && roundedRemaining !== 0) {
        // Allow for small floating point inaccuracies by checking against a small epsilon
        return Math.abs(roundedRemaining) > 0.01;
    }
    return false;
  }, [totalPaid, amountToPay, allowPartialPayment, remainingToPay]);


  const handleProcessPayment = () => {
    setError('');

    if (isSubmitDisabled) {
      if (totalPaid <= 0 && amountToPay > 0) {
        setError('Nenhum valor de pagamento foi inserido.');
      } else if (!allowPartialPayment && Math.abs(remainingToPay) > 0.01) {
        setError(`O valor pago não corresponde ao total. Faltam ${formatCurrency(remainingToPay)}.`);
      }
      return;
    }

    const payments: Payment[] = [];
    if (numCashAmount > 0) payments.push({ method: 'cash', amount: numCashAmount });
    if (numDebitAmount > 0) payments.push({ method: 'debit', amount: numDebitAmount });
    if (numCreditAmount > 0) payments.push({ method: 'credit', amount: numCreditAmount });
    if (numPixAmount > 0) payments.push({ method: 'pix', amount: numPixAmount });

    const finalCashTendered = numCashTendered > 0 ? numCashTendered : (numCashAmount > 0 ? numCashAmount : undefined);
    
    const consumedTotal = currentOrder?.items.filter(i => i.price > 0).reduce((sum, i) => sum + i.price * i.quantity, 0) || totalAmount;

    const completedSale: Sale = {
        id: currentOrder?.id || `sale-${Date.now()}`,
        timestamp: new Date(),
        items: currentOrder?.items || [],
        payments,
        originalAmount: consumedTotal,
        totalAmount: amountToPay,
        discountAmount: numDiscount,
        cashTendered: finalCashTendered,
        changeGiven: creditToLeave > 0 ? creditToLeave : changeToReturn,
        status: 'completed',
        leaveChangeAsCredit: leaveChangeAsCredit && creditToLeave > 0,
    };
    
    setSaleCompleted(completedSale);
    setSubmitted(true); // Mark as submitted to trigger finalization on close
  };

  const handleDownloadReceipt = async () => {
    if (!receiptRef.current) {
        toast({ title: "Erro", description: "Não foi possível encontrar o recibo para baixar.", variant: "destructive" });
        return;
    };
    try {
        const canvas = await html2canvas(receiptRef.current, {
            scale: 2, // Higher scale for better quality
            backgroundColor: '#ffffff',
        });
        const image = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = image;
        link.download = `recibo-${saleCompleted?.id.slice(-6) || 'venda'}.png`;
        link.click();
    } catch (err) {
        console.error(err);
        toast({ title: "Erro ao gerar imagem", description: "Não foi possível criar a imagem do recibo.", variant: "destructive" });
    }
  };
  
    const handlePrintReceipt = () => {
        const node = receiptRef.current;
        if (!node) {
            toast({ title: "Erro", description: "Não foi possível encontrar o recibo para imprimir.", variant: "destructive" });
            return;
        }

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write('<html><head><title>Recibo</title>');
            // A simple stylesheet to somewhat mimic the component's style for printing
            printWindow.document.write(`
                <style>
                    body { font-family: monospace; line-height: 1.2; font-size: 10px; color: black; background-color: white; margin: 0; padding: 10px; width: 300px; }
                    .receipt-container { max-width: 300px; margin: 0 auto; }
                    table { width: 100%; border-collapse: collapse; }
                    hr { border: none; border-top: 1px dashed black; margin: 8px 0; }
                    .text-center { text-align: center; }
                    .font-bold { font-weight: bold; }
                    .text-sm { font-size: 12px; }
                    .text-xs { font-size: 10px; }
                    .mb-2 { margin-bottom: 8px; }
                    .w-full { width: 100%; }
                    .text-left { text-align: left; }
                    .text-right { text-align: right; }
                    .align-top { vertical-align: top; }
                    .uppercase { text-transform: uppercase; }
                    .space-y-1 > * + * { margin-top: 4px; }
                    .justify-between { display: flex; justify-content: space-between; }
                    .capitalize { text-transform: capitalize; }
                </style>
            `);
            printWindow.document.write('</head><body><div class="receipt-container">');
            printWindow.document.write(node.innerHTML);
            printWindow.document.write('</div></body></html>');
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 250); // Timeout to ensure styles and content are loaded
        } else {
            toast({ title: "Erro de Pop-up", description: "Não foi possível abrir a janela de impressão. Verifique se pop-ups estão bloqueados.", variant: "destructive" });
        }
    };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md grid grid-rows-[auto_1fr_auto] max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>{saleCompleted ? 'Venda Finalizada' : 'Processar Pagamento'}</DialogTitle>
          <DialogDescription>
            {saleCompleted 
             ? `Recibo para ${currentOrder?.name || 'a venda'}.`
             : `Total Original da Comanda: ${formatCurrency(totalAmount)}`}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="px-6">
        {saleCompleted ? (
            <div ref={receiptRef} className="bg-white p-2">
                <Receipt sale={saleCompleted} orderName={currentOrder?.name} />
            </div>
        ) : (
         <TooltipProvider>
          <div className="space-y-4 pb-4">
            <div className="space-y-1">
                <Label htmlFor="discount">Desconto (R$)</Label>
                <Input
                  id="discount"
                  type="text"
                  placeholder="0,00"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="h-9"
                />
            </div>
            
            <div className="flex justify-between items-center text-base font-bold">
              <span>Total a Pagar:</span>
              <span className="text-primary">{formatCurrency(amountToPay)}</span>
            </div>

            <Separator />
            <p className="text-sm font-medium">Divisão do Pagamento</p>

            {amountToPay > 0 ? (
              <div className="space-y-2">
                {PAYMENT_METHODS.map(method => {
                  const state = method.value === 'cash' ? cashAmount : (method.value === 'debit' ? debitAmount : (method.value === 'credit' ? creditAmount : pixAmount));
                  const setState = method.value === 'cash' ? setCashAmount : (method.value === 'debit' ? setDebitAmount : (method.value === 'credit' ? setCreditAmount : setPixAmount));
                  return (
                    <div key={method.value} className="flex items-center gap-2">
                      <Label htmlFor={`pay-${method.value}`} className="w-24 flex items-center gap-2 text-sm">
                        <method.icon className="h-4 w-4 text-muted-foreground" /> {method.name}
                      </Label>
                      <Input id={`pay-${method.value}`} type="text" placeholder="0,00" value={state} onChange={e => setState(e.target.value)} className="h-9" />
                      <Button variant="outline" size="sm" onClick={() => setPayFull(method.value)}>Total</Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Alert>
                <Banknote className="h-4 w-4" />
                <AlertTitle>Pagamento com Crédito</AlertTitle>
                <AlertDescription>O valor total será quitado com o crédito existente na comanda.</AlertDescription>
              </Alert>
            )}

            <div className={`p-2 rounded-md font-semibold text-center text-sm transition-colors ${Math.abs(remainingToPay) < 0.01 ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : (remainingToPay > 0 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300')}`}>
              {Math.abs(remainingToPay) < 0.01 ? `Total pago: ${formatCurrency(totalPaid)}` : 
              remainingToPay > 0 ? `Faltante: ${formatCurrency(remainingToPay)}` :
              `Troco/Crédito: ${formatCurrency(Math.abs(remainingToPay))}`
              }
            </div>
            
            {numCashAmount > 0 && (
              <div className="space-y-3 p-3 bg-muted/50 rounded-md">
                  <p className="text-sm font-medium">Detalhes do Pagamento em Dinheiro</p>
                  <div className="space-y-1">
                      <Label htmlFor="cashTendered">Valor Entregue (Dinheiro)</Label>
                      <Input id="cashTendered" type="text" placeholder="0,00" value={cashTendered} onChange={e => setCashTendered(e.target.value)} className="h-9"/>
                  </div>
                  {calculatedCashChange > 0 && (
                     <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <p className="text-sm font-medium">Troco Calculado:</p>
                            <p className="text-green-600 font-bold">{formatCurrency(calculatedCashChange)}</p>
                        </div>
                        {allowCredit && (
                          <>
                           <div className="items-top flex space-x-2">
                            <Checkbox id="leaveCredit" checked={leaveChangeAsCredit} onCheckedChange={(checked) => setLeaveChangeAsCredit(checked as boolean)} />
                            <div className="grid gap-1.5 leading-none">
                              <label
                                htmlFor="leaveCredit"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                Deixar troco como crédito
                              </label>
                              <p className="text-xs text-muted-foreground">
                                Uma nova comanda será aberta com o valor do troco como crédito.
                              </p>
                            </div>
                           </div>
                           <div className="text-sm text-blue-600 text-center font-medium pt-1">
                            {creditToLeave > 0 ? `Crédito a gerar: ${formatCurrency(creditToLeave)}` : `Troco a devolver: ${formatCurrency(changeToReturn)}`}
                           </div>
                          </>
                        )}
                     </div>
                  )}
              </div>
            )}

            {error && (
              <Alert variant="destructive" className="p-2">
                <Terminal className="h-4 w-4" />
                <AlertTitle className="text-sm">Erro</AlertTitle>
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}
          </div>
         </TooltipProvider>
        )}
        </ScrollArea>

        <DialogFooter className="p-6 pt-4 border-t">
          {saleCompleted ? (
            <>
                <DialogClose asChild>
                    <Button variant="secondary">Fechar</Button>
                </DialogClose>
                <Button variant="outline" onClick={handlePrintReceipt}>
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimir
                </Button>
                <Button onClick={handleDownloadReceipt}>
                    <Download className="mr-2 h-4 w-4" />
                    Baixar
                </Button>
            </>
          ) : (
            <>
                <DialogClose asChild>
                    <Button variant="outline">Cancelar</Button>
                </DialogClose>
                <Button onClick={handleProcessPayment} disabled={isSubmitDisabled}>
                    Realizar Pagamento
                </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
