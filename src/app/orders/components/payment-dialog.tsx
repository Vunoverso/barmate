
"use client";

import type { PaymentMethod, Payment, Sale, OrderItem, ActiveOrder } from '@/types';
import { PAYMENT_METHODS, formatCurrency } from '@/lib/constants';
import { getProductCategories } from '@/lib/data-access';
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
import { Receipt } from './receipt';
import { useToast } from '@/hooks/use-toast';

interface PaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  totalAmount: number;
  currentOrder: ActiveOrder | undefined;
  allowCredit?: boolean;
  allowPartialPayment?: boolean;
  onSubmit: (details: { 
    sale: Omit<Sale, 'id' | 'timestamp' | 'name'>, 
    leaveChangeAsCredit: boolean,
    isPartial: boolean,
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
  
  const totalChange = useMemo(() => {
    let calculatedChange = 0;
    const overpayment = totalPaid - amountToPay;

    if (numCashTendered > 0) {
        // If cash tendered is provided, change is based on that relative to the cash portion due.
        const cashDue = amountToPay - (numDebitAmount + numCreditAmount + numPixAmount);
        if (numCashTendered > cashDue) {
            calculatedChange = numCashTendered - cashDue;
        }
    } else if (overpayment > 0) {
        // If no cash tendered, change can only come from overpayment in cash.
        calculatedChange = Math.min(overpayment, numCashAmount);
    }
    return Math.max(0, calculatedChange);
  }, [amountToPay, totalPaid, numCashAmount, numDebitAmount, numCreditAmount, numPixAmount, numCashTendered]);


  const resetState = () => {
    setDiscount('');
    setCashAmount('');
    setDebitAmount('');
    setCreditAmount('');
    setPixAmount('');
    setCashTendered('');
    setLeaveChangeAsCredit(false);
    setError('');
    setSaleCompleted(null);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
       resetState();
    }
    onOpenChange(open);
  };

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
    if (totalPaid <= 0 && amountToPay > 0) return true;
    if (!allowPartialPayment && roundedRemaining !== 0 && Math.abs(roundedRemaining) > 0.01) {
        return true;
    }
    return false;
  }, [totalPaid, amountToPay, allowPartialPayment, remainingToPay]);


  const handleProcessPayment = () => {
    setError('');
    const roundedRemaining = Math.round(remainingToPay * 100) / 100;

    if (isSubmitDisabled) {
      if (totalPaid <= 0 && amountToPay > 0) setError('Nenhum valor de pagamento foi inserido.');
      else if (!allowPartialPayment && roundedRemaining !== 0) setError(`O valor pago não corresponde ao total. Faltam ${formatCurrency(remainingToPay)}.`);
      return;
    }

    const payments: Payment[] = [];
    if (numCashAmount > 0) payments.push({ method: 'cash', amount: numCashAmount });
    if (numDebitAmount > 0) payments.push({ method: 'debit', amount: numDebitAmount });
    if (numCreditAmount > 0) payments.push({ method: 'credit', amount: numCreditAmount });
    if (numPixAmount > 0) payments.push({ method: 'pix', amount: numPixAmount });

    const finalCashTendered = numCashTendered > 0 ? numCashTendered : (numCashAmount > 0 ? numCashAmount : undefined);
    const consumedTotal = currentOrder?.items.filter(i => i.price > 0).reduce((sum, i) => sum + i.price * i.quantity, 0) || totalAmount;
    
    // Change to be credited is the total change if the checkbox is checked, otherwise it's 0.
    const changeToCredit = leaveChangeAsCredit ? totalChange : 0;

    const isPartialNow = allowPartialPayment && roundedRemaining > 0.01;
    
    const saleObject: Omit<Sale, 'id' | 'timestamp' | 'name'> = {
        items: currentOrder?.items || [],
        payments,
        originalAmount: isPartialNow ? totalPaid : consumedTotal,
        totalAmount: isPartialNow ? totalPaid : amountToPay,
        discountAmount: isPartialNow ? 0 : numDiscount,
        cashTendered: finalCashTendered,
        changeGiven: changeToCredit, // This now correctly represents the credit amount
        status: 'completed',
        leaveChangeAsCredit: leaveChangeAsCredit, // This is now directly from the checkbox
    }
    
    if (isPartialNow) {
        onSubmit({ sale: saleObject, leaveChangeAsCredit: false, isPartial: true });
        onOpenChange(false);
    } else {
        setSaleCompleted({
            id: currentOrder?.id || `sale-${Date.now()}`,
            timestamp: new Date(),
            ...saleObject,
        });
         onSubmit({ sale: saleObject, leaveChangeAsCredit, isPartial: false });
    }
  };

  const handleDownloadReceipt = async () => {
    if (!receiptRef.current) {
        toast({ title: "Erro", description: "Não foi possível encontrar o recibo para baixar.", variant: "destructive" });
        return;
    };
    try {
        const printWindow = window.open('', '', 'width=800,height=600');
        if (printWindow) {
            document.querySelectorAll('link[rel="stylesheet"], style').forEach(styleSheet => {
                printWindow.document.head.appendChild(styleSheet.cloneNode(true));
            });

            const contentNode = receiptRef.current;
            printWindow.document.body.innerHTML = contentNode.outerHTML;

            const printSpecificStyles = printWindow.document.createElement('style');
            printSpecificStyles.innerHTML = `
                @page { size: 80mm auto; margin: 0; }
                body { 
                    background: white !important; 
                    margin: 0;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .printable-content {
                    width: 76mm;
                    margin: 0 auto !important;
                    padding: 2mm !important;
                    box-sizing: border-box !important;
                    border-left: 1px dotted black !important;
                    border-right: 1px dotted black !important;
                    color: black !important;
                }
                .printable-content * {
                    color: black !important;
                }
            `;
            printWindow.document.head.appendChild(printSpecificStyles);
        
            setTimeout(() => {
                printWindow.focus();
                printWindow.print();
                printWindow.close();
            }, 500);
        }
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

        const printWindow = window.open('', '', 'width=800,height=600');
        if (printWindow) {
            document.querySelectorAll('link[rel="stylesheet"], style').forEach(styleSheet => {
                printWindow.document.head.appendChild(styleSheet.cloneNode(true));
            });

            printWindow.document.body.innerHTML = node.outerHTML;

            const printSpecificStyles = printWindow.document.createElement('style');
            printSpecificStyles.innerHTML = `
                @page { size: 80mm auto; margin: 0; }
                body { 
                    background: white !important; 
                    margin: 0;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .printable-content {
                    width: 76mm;
                    margin: 0 auto !important;
                    padding: 2mm !important;
                    box-sizing: border-box !important;
                    border-left: 1px dotted black !important;
                    border-right: 1px dotted black !important;
                    color: black !important;
                }
                /* Ensure all text within is black for printing */
                .printable-content * {
                    color: black !important;
                }
            `;
            printWindow.document.head.appendChild(printSpecificStyles);
        
            setTimeout(() => {
                printWindow.focus();
                printWindow.print();
                printWindow.close();
            }, 500); // Wait for styles to apply
        } else {
            toast({ title: "Erro de Pop-up", description: "Não foi possível abrir a janela de impressão. Verifique se pop-ups estão bloqueados.", variant: "destructive" });
        }
    };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
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
            <div ref={receiptRef}>
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
            
            {(numCashAmount > 0) && (
              <div className="space-y-3 p-3 bg-muted/50 rounded-md">
                  <p className="text-sm font-medium">Detalhes do Pagamento em Dinheiro</p>
                  <div className="space-y-1">
                      <Label htmlFor="cashTendered">Valor Entregue (Dinheiro)</Label>
                      <Input id="cashTendered" type="text" placeholder="Ex: 50,00" value={cashTendered} onChange={e => setCashTendered(e.target.value)} className="h-9"/>
                  </div>
                  {totalChange > 0 && (
                     <div className="space-y-2 pt-2">
                        <div className="flex justify-between items-center">
                            <p className="text-sm font-medium">Troco Total Calculado:</p>
                            <p className="font-bold">{formatCurrency(totalChange)}</p>
                        </div>
                        <div className="items-top flex space-x-2 pt-2">
                            <Checkbox id="leaveChangeAsCredit" checked={leaveChangeAsCredit} onCheckedChange={(checked) => setLeaveChangeAsCredit(Boolean(checked))} />
                            <div className="grid gap-1.5 leading-none">
                                <label
                                htmlFor="leaveChangeAsCredit"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                Gerar nova comanda com o troco de {formatCurrency(totalChange)}?
                                </label>
                                <p className="text-xs text-muted-foreground">
                                Se não marcado, o troco é considerado devolvido em dinheiro.
                                </p>
                            </div>
                        </div>
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
            <div className="w-full flex justify-between">
                <Button variant="secondary" onClick={() => handleOpenChange(false)}>Fechar</Button>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handlePrintReceipt}>
                        <Printer className="mr-2 h-4 w-4" />
                        Imprimir
                    </Button>
                    <Button onClick={handleDownloadReceipt} disabled>
                        <Download className="mr-2 h-4 w-4" />
                        Baixar
                    </Button>
                </div>
            </div>
          ) : (
            <>
                <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancelar</Button>
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
