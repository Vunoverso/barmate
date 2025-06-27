
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
  onSubmit: (saleDetails: {
    paymentMethod: PaymentMethod;
    amountPaid?: number;
    changeGiven?: number;
    discountAmount: number;
    status: 'completed';
  }) => void;
}

export default function PaymentDialog({ isOpen, onOpenChange, totalAmount, onSubmit }: PaymentDialogProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('cash');
  const [amountPaid, setAmountPaid] = useState<number | string>('');
  const [discount, setDiscount] = useState<number | string>('');
  const [change, setChange] = useState<number>(0);
  const [error, setError] = useState<string>('');

  const numericDiscount = parseFloat(String(discount).replace(',', '.')) || 0;
  const finalTotal = totalAmount > 0 ? totalAmount - numericDiscount : 0;


  useEffect(() => {
    if (isOpen) {
      // Reset state when dialog opens
      setSelectedMethod('cash');
      setAmountPaid('');
      setDiscount('');
      setChange(0);
      setError('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedMethod === 'cash' && finalTotal >= 0) {
      const paid = parseFloat(String(amountPaid));
      if (!isNaN(paid) && paid >= finalTotal) {
        setChange(paid - finalTotal);
        setError('');
      } else if (!isNaN(paid) && paid < finalTotal) {
        setChange(0);
        setError('Valor pago é insuficiente.');
      } else {
        setChange(0);
        setError('');
      }
    } else {
      setChange(0);
      setError('');
    }
  }, [amountPaid, selectedMethod, finalTotal]);

  const handleSubmit = () => {
    const validDiscount = Math.max(0, numericDiscount);

    if (finalTotal < 0) {
      setError('O desconto não pode ser maior que o valor total.');
      return;
    }
    
    if (selectedMethod === 'cash') {
      const paid = parseFloat(String(amountPaid));
      if (isNaN(paid) || paid < finalTotal) {
        setError('Valor pago inválido ou insuficiente.');
        return;
      }
      onSubmit({ paymentMethod: 'cash', amountPaid: paid, changeGiven: change, status: 'completed', discountAmount: validDiscount });
    } else {
      onSubmit({ paymentMethod: selectedMethod, status: 'completed', discountAmount: validDiscount });
    }
  };

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
              {parseFloat(String(amountPaid)) >= finalTotal && change >=0 && (
                <p className="text-sm text-green-600">Troco: {formatCurrency(change)}</p>
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
          <Button onClick={handleSubmit} disabled={selectedMethod === 'cash' && (parseFloat(String(amountPaid)) < finalTotal || isNaN(parseFloat(String(amountPaid)))) || finalTotal < 0}>
            Confirmar Pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
