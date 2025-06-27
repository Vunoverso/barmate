
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
  const [changeReturned, setChangeReturned] = useState<number | string>(''); // The actual cash returned to customer
  const [error, setError] = useState<string>('');

  const numericDiscount = parseFloat(String(discount).replace(',', '.')) || 0;
  const finalTotal = totalAmount > 0 ? totalAmount - numericDiscount : 0;
  
  const paidAmountValue = parseFloat(String(amountPaid).replace(',', '.')) || 0;
  const calculatedChange = paidAmountValue > finalTotal ? paidAmountValue - finalTotal : 0;

  const changeReturnedValue = parseFloat(String(changeReturned).replace(',', '.')) || 0;
  // The credit is the difference between what should have been returned and what was actually returned.
  const creditToLeave = allowCredit && calculatedChange > changeReturnedValue ? calculatedChange - changeReturnedValue : 0;


  useEffect(() => {
    if (isOpen) {
      // Reset state when dialog opens
      setSelectedMethod('cash');
      setAmountPaid('');
      setDiscount('');
      setChangeReturned('');
      setError('');
    }
  }, [isOpen]);

  useEffect(() => {
    // When calculated change is updated, pre-fill the change returned input
    // This runs whenever calculatedChange updates
    if (calculatedChange > 0) {
      setChangeReturned(calculatedChange.toFixed(2));
    } else {
      setChangeReturned('');
    }
    // Reset error on dependency change, it will be re-validated on submit
    setError('');
  }, [calculatedChange]);


  const handleSubmit = () => {
    setError(''); // Clear previous errors
    const validDiscount = Math.max(0, numericDiscount);

    if (finalTotal < 0) {
      setError('O desconto não pode ser maior que o valor total.');
      return;
    }
    
    if (selectedMethod === 'cash') {
      if (paidAmountValue < finalTotal) {
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
      // The `changeGiven` prop in onSubmit is used by the parent component as the amount for credit.
      onSubmit({ 
          paymentMethod: 'cash', 
          amountPaid: paidAmountValue, 
          changeGiven: creditToLeave, 
          status: 'completed', 
          discountAmount: validDiscount, 
          leaveChangeAsCredit: creditToLeave > 0 
      });
    } else {
      onSubmit({ paymentMethod: selectedMethod, status: 'completed', discountAmount: validDiscount, leaveChangeAsCredit: false });
    }
  };

  const isSubmitDisabled = () => {
    if (finalTotal < 0) return true;
    if (selectedMethod === 'cash') {
      if (isNaN(paidAmountValue) || paidAmountValue < finalTotal) {
        return true;
      }
      if (allowCredit) {
         const returnedValue = parseFloat(String(changeReturned));
         if (isNaN(returnedValue) || returnedValue < 0 || returnedValue > calculatedChange) {
           return true;
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
            Total Original: <span className="font-bold">{formatCurrency(totalAmount)}</span>
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
            <span className="text-primary">{formatCurrency(finalTotal)}</span>
          </div>

          <Separator />

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
                  min={finalTotal}
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
            Confirmar Pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
