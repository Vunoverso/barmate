
"use client";

import type { PaymentMethod, Sale, Payment } from '@/types';
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

interface PaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  totalAmount: number;
  onSubmit: (saleDetails: Omit<Sale, 'id' | 'timestamp' | 'items' | 'totalAmount' | 'originalAmount' | 'discountAmount'>) => void;
}

export default function PaymentDialog({ isOpen, onOpenChange, totalAmount, onSubmit }: PaymentDialogProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('cash');
  const [amountPaid, setAmountPaid] = useState<number | string>('');
  const [change, setChange] = useState<number>(0);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      // Reset state when dialog opens
      setSelectedMethod('cash');
      setAmountPaid('');
      setChange(0);
      setError('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedMethod === 'cash' && totalAmount > 0) {
      const paid = parseFloat(String(amountPaid));
      if (!isNaN(paid) && paid >= totalAmount) {
        setChange(paid - totalAmount);
        setError('');
      } else if (!isNaN(paid) && paid < totalAmount) {
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
  }, [amountPaid, selectedMethod, totalAmount]);

  const handleSubmit = () => {
    if (selectedMethod === 'cash') {
      const paid = parseFloat(String(amountPaid));
      if (isNaN(paid) || paid < totalAmount) {
        setError('Valor pago inválido ou insuficiente.');
        return;
      }
      const payment: Payment = { method: 'cash', amount: totalAmount };
      onSubmit({ payments: [payment], cashTendered: paid, changeGiven: change, status: 'completed' });
    } else {
      const payment: Payment = { method: selectedMethod, amount: totalAmount };
      onSubmit({ payments: [payment], status: 'completed' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Processar Pagamento</DialogTitle>
          <DialogDescription>
            Total da comanda: <span className="font-bold text-primary">{formatCurrency(totalAmount)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
                min={totalAmount}
                step="0.01"
              />
              {parseFloat(String(amountPaid)) >= totalAmount && change >=0 && (
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
          <Button onClick={handleSubmit} disabled={selectedMethod === 'cash' && (parseFloat(String(amountPaid)) < totalAmount || isNaN(parseFloat(String(amountPaid))))}>
            Confirmar Pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    