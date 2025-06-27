
"use client";

import type { PaymentMethod } from '@/types';
import { PAYMENT_METHODS, formatCurrency } from '@/lib/constants';
import { useState, useEffect } from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import { Separator } from '@/components/ui/separator';

interface PaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  totalAmount: number;
  allowCredit?: boolean;
  onSubmit: (saleDetails: {
    paymentMethod: PaymentMethod;
    amountPaid?: number;
    changeGiven?: number; // This will represent the credit amount.
    discountAmount: number;
    status: 'completed';
    leaveChangeAsCredit: boolean;
  }) => void;
}

export default function PaymentDialog({ isOpen, onOpenChange, totalAmount, onSubmit, allowCredit = false }: PaymentDialogProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('cash');
  const [amountPaid, setAmountPaid] = useState<number | string>('');
  const [discount, setDiscount] = useState<number | string>('');
  const [changeReturned, setChangeReturned] = useState<number | string>('');
  const [error, setError] = useState<string>('');

  const numericDiscount = parseFloat(String(discount).replace(',', '.')) || 0;
  const finalBalance = totalAmount - numericDiscount;
  const amountToPay = Math.max(0, finalBalance);
  
  const paidAmountValue = parseFloat(String(amountPaid).replace(',', '.')) || 0;
  const calculatedChange = paidAmountValue > amountToPay ? paidAmountValue - amountToPay : 0;

  const changeReturnedValue = parseFloat(String(changeReturned).replace(',', '.')) || 0;
  const creditToLeave = allowCredit && calculatedChange > changeReturnedValue ? calculatedChange - changeReturnedValue : 0;
  const remainingCredit = finalBalance < 0 ? Math.abs(finalBalance) : 0;

  useEffect(() => {
    if (isOpen) {
      setSelectedMethod(totalAmount > 0 ? 'cash' : 'pix');
      setAmountPaid('');
      setDiscount('');
      setChangeReturned('');
      setError('');
    }
  }, [isOpen, totalAmount]);

  useEffect(() => {
    if (calculatedChange > 0) {
      setChangeReturned(calculatedChange.toFixed(2));
    } else {
      setChangeReturned('');
    }
    setError('');
  }, [calculatedChange]);


  const handleSubmit = () => {
    setError('');
    const validDiscount = Math.max(0, numericDiscount);

    if (amountToPay > 0) { // Standard payment flow
      if (selectedMethod === 'cash') {
        if (paidAmountValue < amountToPay) {
          setError('Valor pago é insuficiente.');
          return;
        }
        if (allowCredit) {
          if (changeReturnedValue > calculatedChange) {
              setError('O troco devolvido não pode ser maior que o troco calculado.');
              return;
          }
          if (changeReturnedValue < 0) {
              setError('O troco devolvido não pode ser negativo.');
              return;
          }
        }
        onSubmit({ 
            paymentMethod: 'cash', 
            amountPaid: paidAmountValue, 
            changeGiven: creditToLeave, 
            status: 'completed', 
            discountAmount: validDiscount, 
            leaveChangeAsCredit: creditToLeave > 0 
        });
      } else { // Card or PIX
        onSubmit({ paymentMethod: selectedMethod, status: 'completed', discountAmount: validDiscount, leaveChangeAsCredit: false });
      }
    } else { // Payment is fully covered by credit
      onSubmit({
        paymentMethod: 'pix', // Use a non-cash method for record keeping
        amountPaid: 0,
        changeGiven: 0,
        status: 'completed',
        discountAmount: validDiscount,
        leaveChangeAsCredit: false,
      });
    }
  };

  const isSubmitDisabled = () => {
    if (amountToPay > 0) {
        if (selectedMethod === 'cash') {
          if (isNaN(paidAmountValue) || paidAmountValue < amountToPay) {
            return true;
          }
          if (allowCredit) {
             const returnedValue = parseFloat(String(changeReturned));
             if (isNaN(returnedValue) || returnedValue < 0 || returnedValue > calculatedChange) {
               return true;
             }
          }
        }
    }
    return false;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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
          
          {remainingCredit > 0 && (
            <p className="text-sm text-blue-600 font-medium">
              Crédito Restante após esta compra: <span className="font-bold">{formatCurrency(remainingCredit)}</span>
            </p>
          )}

          <Separator />

          {amountToPay > 0 ? (
            <>
              <Label>Método de Pagamento</Label>
              <RadioGroup value={selectedMethod} onValueChange={(value) => setSelectedMethod(value as PaymentMethod)}>
                {PAYMENT_METHODS.map(method => (
                  <div key={method.value} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-muted/50">
                    <RadioGroupItem value={method.value} id={`payment-${method.value}`} />
                    <Label htmlFor={`payment-${method.value}`} className="flex items-center gap-2 cursor-pointer">
                      <method.icon className="h-5 w-5 text-muted-foreground" />
                      {method.name}
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              {selectedMethod === 'cash' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="amountPaid">Valor Pago</Label>
                    <Input
                      id="amountPaid"
                      type="number"
                      placeholder="0,00"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      min={amountToPay}
                      step="0.01"
                    />
                  </div>

                  {calculatedChange > 0 && (
                    <div className="pt-2 space-y-2 p-3 bg-muted/50 rounded-md">
                      <p className="text-sm font-medium">Troco Calculado: <span className="text-green-600 font-bold">{formatCurrency(calculatedChange)}</span></p>
                      
                      {allowCredit ? (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="changeReturned">Troco Devolvido Efetivamente</Label>
                            <Input
                              id="changeReturned"
                              type="number"
                              value={changeReturned}
                              onChange={(e) => setChangeReturned(e.target.value)}
                              step="0.01"
                            />
                          </div>
                          {creditToLeave > 0 && (
                            <p className="text-sm text-blue-600">
                              Crédito a ser gerado para o cliente: <span className="font-bold">{formatCurrency(creditToLeave)}</span>
                            </p>
                          )}
                        </>
                      ) : (
                         <p className="text-sm text-green-600">
                            Troco a ser devolvido: <span className="font-bold">{formatCurrency(calculatedChange)}</span>
                         </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <Alert>
              <Terminal className="h-4 w-4" />
              <AlertTitle>Pagamento com Crédito</AlertTitle>
              <AlertDescription>O valor total será quitado com o crédito existente na comanda.</AlertDescription>
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
          <Button onClick={handleSubmit} disabled={isSubmitDisabled()}>
            {amountToPay > 0 ? "Confirmar Pagamento" : "Confirmar Uso do Crédito"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
