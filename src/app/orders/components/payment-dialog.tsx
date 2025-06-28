
"use client";

import type { PaymentMethod, Payment } from '@/types';
import { PAYMENT_METHODS, formatCurrency } from '@/lib/constants';
import { useState, useEffect, useMemo } from 'react';
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
import { Terminal, MinusCircle, Wallet, Info } from "lucide-react";
import { Separator } from '@/components/ui/separator';

interface PaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  totalAmount: number;
  allowCredit?: boolean;
  onSubmit: (saleDetails: {
    payments: Payment[];
    changeGiven: number;
    discountAmount: number;
    status: 'completed';
    leaveChangeAsCredit: boolean;
  }) => void;
}

const parseLocaleFloat = (value: string) => parseFloat(value.replace(',', '.')) || 0;

export default function PaymentDialog({ isOpen, onOpenChange, totalAmount, onSubmit, allowCredit = false }: PaymentDialogProps) {
  const [discount, setDiscount] = useState<string>('');
  const [cashAmount, setCashAmount] = useState<string>('');
  const [cardAmount, setCardAmount] = useState<string>('');
  const [pixAmount, setPixAmount] = useState<string>('');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [changeReturned, setChangeReturned] = useState<string>('');
  const [error, setError] = useState<string>('');

  const numDiscount = parseLocaleFloat(discount);
  const numCashAmount = parseLocaleFloat(cashAmount);
  const numCardAmount = parseLocaleFloat(cardAmount);
  const numPixAmount = parseLocaleFloat(pixAmount);
  
  const finalBalance = useMemo(() => totalAmount - numDiscount, [totalAmount, numDiscount]);
  const amountToPay = useMemo(() => Math.max(0, finalBalance), [finalBalance]);
  const totalPaid = useMemo(() => numCashAmount + numCardAmount + numPixAmount, [numCashAmount, numCardAmount, numPixAmount]);
  const remainingToPay = useMemo(() => amountToPay - totalPaid, [amountToPay, totalPaid]);

  const numCashTendered = parseLocaleFloat(cashTendered);
  const calculatedCashChange = useMemo(() => {
    if (numCashAmount <= 0) return 0;
    const tendered = numCashTendered > 0 ? numCashTendered : numCashAmount;
    return Math.max(0, tendered - numCashAmount);
  }, [numCashAmount, numCashTendered]);

  const numChangeReturned = parseLocaleFloat(changeReturned);
  const creditToLeave = useMemo(() => {
      if (!allowCredit || calculatedCashChange <= 0) return 0;
      return Math.max(0, calculatedCashChange - numChangeReturned);
  }, [allowCredit, calculatedCashChange, numChangeReturned]);

  const remainingCredit = finalBalance < 0 ? Math.abs(finalBalance) : 0;

  useEffect(() => {
    if (isOpen) {
      setDiscount('');
      setCashAmount('');
      setCardAmount('');
      setPixAmount('');
      setCashTendered('');
      setError('');
    }
  }, [isOpen]);
  
  useEffect(() => {
    setChangeReturned(calculatedCashChange > 0 ? calculatedCashChange.toFixed(2) : '');
  }, [calculatedCashChange]);

  const setPayFull = (method: PaymentMethod) => {
    const otherPaid = (method === 'cash' ? 0 : numCashAmount) + (method === 'card' ? 0 : numCardAmount) + (method === 'pix' ? 0 : numPixAmount);
    const amount = Math.max(0, amountToPay - otherPaid);
    const value = amount > 0 ? amount.toFixed(2) : '';
    if (method === 'cash') setCashAmount(value);
    if (method === 'card') setCardAmount(value);
    if (method === 'pix') setPixAmount(value);
  }

  const handleSubmit = () => {
    setError('');
    
    if (Math.abs(remainingToPay) > 0.001) {
      setError(`O valor pago não corresponde ao total. Faltam ${formatCurrency(remainingToPay)}.`);
      return;
    }
    
    if (allowCredit && numChangeReturned > calculatedCashChange) {
      setError('O troco devolvido não pode ser maior que o troco calculado.');
      return;
    }

    const payments: Payment[] = [];
    if (numCashAmount > 0) payments.push({ method: 'cash', amount: numCashAmount });
    if (numCardAmount > 0) payments.push({ method: 'card', amount: numCardAmount });
    if (numPixAmount > 0) payments.push({ method: 'pix', amount: numPixAmount });

    if (payments.length === 0 && amountToPay > 0) {
      setError('Nenhum método de pagamento informado.');
      return;
    }

    // Handle payment with existing credit
    if (finalBalance < 0) {
       onSubmit({
        payments: [], // No new payment
        discountAmount: numDiscount,
        changeGiven: 0,
        status: 'completed',
        leaveChangeAsCredit: false,
      });
      return;
    }

    onSubmit({
      payments,
      discountAmount: numDiscount,
      changeGiven: creditToLeave,
      status: 'completed',
      leaveChangeAsCredit: creditToLeave > 0
    });
  };

  const isSubmitDisabled = Math.abs(remainingToPay) > 0.001 || (allowCredit && numChangeReturned > calculatedCashChange) || (amountToPay > 0 && totalPaid === 0);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Processar Pagamento</DialogTitle>
          <DialogDescription>
            Total Original da Comanda: <span className="font-bold">{formatCurrency(totalAmount)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
           <div className="space-y-2">
              <Label htmlFor="discount">Desconto (R$)</Label>
              <Input
                id="discount"
                type="number"
                placeholder="0,00"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                step="0.01"
              />
            </div>
          
          <div className="flex justify-between items-center text-lg font-bold">
            <span>Total a Pagar:</span>
            <span className="text-primary">{formatCurrency(amountToPay)}</span>
          </div>

          <Separator />
          <p className="text-sm font-medium">Divisão do Pagamento</p>

          {amountToPay > 0 ? (
            <div className="space-y-3">
              {PAYMENT_METHODS.map(method => {
                const state = method.value === 'cash' ? cashAmount : (method.value === 'card' ? cardAmount : pixAmount);
                const setState = method.value === 'cash' ? setCashAmount : (method.value === 'card' ? setCardAmount : setPixAmount);
                return (
                  <div key={method.value} className="flex items-center gap-2">
                    <Label htmlFor={`pay-${method.value}`} className="w-24 flex items-center gap-2">
                       <method.icon className="h-5 w-5 text-muted-foreground" /> {method.name}
                    </Label>
                    <Input id={`pay-${method.value}`} type="number" placeholder="0,00" value={state} onChange={e => setState(e.target.value)} />
                    <Button variant="outline" size="sm" onClick={() => setPayFull(method.value)}>Total</Button>
                  </div>
                );
              })}
            </div>
          ) : (
             <Alert>
              <Wallet className="h-4 w-4" />
              <AlertTitle>Pagamento com Crédito</AlertTitle>
              <AlertDescription>O valor total será quitado com o crédito existente na comanda.</AlertDescription>
            </Alert>
          )}

          <div className={`p-3 rounded-md font-semibold text-center transition-colors ${remainingToPay === 0 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
            {remainingToPay === 0 ? `Total pago: ${formatCurrency(totalPaid)}` : `Restante: ${formatCurrency(remainingToPay)}`}
          </div>
          
          {numCashAmount > 0 && (
            <div className="pt-2 space-y-4 p-3 bg-muted/50 rounded-md">
                <p className="text-sm font-medium">Detalhes do Pagamento em Dinheiro</p>
                <div className="space-y-2">
                    <Label htmlFor="cashTendered">Valor Entregue (Dinheiro)</Label>
                    <Input id="cashTendered" type="number" placeholder="0,00" value={cashTendered} onChange={e => setCashTendered(e.target.value)} />
                </div>
                {calculatedCashChange > 0 && (
                    <div className="space-y-2">
                        <p className="text-sm font-medium">Troco Calculado: <span className="text-green-600 font-bold">{formatCurrency(calculatedCashChange)}</span></p>
                        {allowCredit ? (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="changeReturned">Troco Devolvido Efetivamente</Label>
                            <Input id="changeReturned" type="number" value={changeReturned} onChange={(e) => setChangeReturned(e.target.value)} step="0.01" />
                          </div>
                          {creditToLeave > 0 && (
                            <p className="text-sm text-blue-600">
                              Crédito a ser gerado para o cliente: <span className="font-bold">{formatCurrency(creditToLeave)}</span>
                            </p>
                          )}
                        </>
                      ) : (
                         <p className="text-sm text-green-600"> Troco a ser devolvido: <span className="font-bold">{formatCurrency(calculatedCashChange)}</span> </p>
                      )}
                    </div>
                )}
            </div>
          )}

          {remainingCredit > 0 && (
            <Alert variant="default" className="mt-4">
              <Info className="h-4 w-4" />
              <AlertTitle>Crédito Restante</AlertTitle>
              <AlertDescription>
                A comanda possui um crédito de {formatCurrency(remainingCredit)} que será usado nesta compra.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={isSubmitDisabled}>
            {finalBalance < 0 ? "Confirmar Uso do Crédito" : "Confirmar Pagamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

