
"use client";

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Sale } from '@/types';
import { formatCurrency, PAYMENT_METHODS } from '@/lib/constants';
import { useEffect, useState } from 'react';

interface ReceiptProps {
  sale: Sale;
  orderName: string | undefined;
}

export const Receipt = ({ sale, orderName }: ReceiptProps) => {
  const [barDetails, setBarDetails] = useState({ name: 'BarMate', cnpj: '', address: '' });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const name = localStorage.getItem('barName') || 'BarMate';
      const cnpj = localStorage.getItem('barCnpj') || '';
      const address = localStorage.getItem('barAddress') || '';
      setBarDetails({ name, cnpj, address });
    }
  }, []);

  const consumedItems = sale.items.filter(item => item.price > 0);
  const creditItems = sale.items.filter(item => item.price < 0);
  const consumedTotal = consumedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const creditTotal = creditItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);


  return (
    <div className="bg-white text-black font-mono p-2 w-full text-[10px] leading-tight border border-black">
      <div className="text-center mb-2">
        <h2 className="font-bold text-sm">{barDetails.name}</h2>
        {barDetails.address && <p>{barDetails.address}</p>}
        {barDetails.cnpj && <p>CNPJ: {barDetails.cnpj}</p>}
      </div>

      <hr className="border-dashed border-black my-2" />

      <div className="text-center mb-2">
        <p className="font-bold">CUPOM NÃO FISCAL</p>
        <p>Comanda: {orderName || sale.id.slice(-6)}</p>
        <p>{format(new Date(sale.timestamp), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</p>
      </div>
      
      <hr className="border-dashed border-black my-2" />

      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left font-normal">ITEM</th>
            <th className="text-right font-normal">QTD</th>
            <th className="text-right font-normal">VL. UN.</th>
            <th className="text-right font-normal">VL. TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {consumedItems.map((item, index) => (
            <tr key={item.lineItemId || `${item.id}-${index}`}>
              <td className="text-left uppercase align-top">{item.name}</td>
              <td className="text-right align-top">{item.quantity}</td>
              <td className="text-right align-top">{formatCurrency(item.price)}</td>
              <td className="text-right align-top">{formatCurrency(item.price * item.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <hr className="border-dashed border-black my-2" />
      
      <div className="space-y-1">
        <div className="flex justify-between">
          <span>SUBTOTAL</span>
          <span>{formatCurrency(consumedTotal)}</span>
        </div>
        {creditTotal < 0 && (
            <div className="flex justify-between">
            <span>CRÉDITOS UTILIZADOS</span>
            <span>{formatCurrency(creditTotal)}</span>
            </div>
        )}
        {sale.discountAmount > 0 && (
          <div className="flex justify-between">
            <span>DESCONTO</span>
            <span>- {formatCurrency(sale.discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-xs">
          <span>TOTAL</span>
          <span>{formatCurrency(sale.totalAmount)}</span>
        </div>
      </div>
      
      <hr className="border-dashed border-black my-2" />
      
      <div className="space-y-1">
         <p className="font-bold text-center">PAGAMENTO</p>
         {sale.payments.map((p, index) => (
            <div key={index} className="flex justify-between capitalize">
                <span>{PAYMENT_METHODS.find(pm => pm.value === p.method)?.name || p.method}</span>
                <span>{formatCurrency(p.amount)}</span>
            </div>
         ))}
         {sale.cashTendered && sale.cashTendered > sale.payments.find(p => p.method === 'cash')?.amount! && (
            <div className="flex justify-between">
                <span>VALOR PAGO (DINHEIRO)</span>
                <span>{formatCurrency(sale.cashTendered)}</span>
            </div>
         )}
         {sale.changeGiven && !sale.leaveChangeAsCredit && (
             <div className="flex justify-between">
                <span>TROCO</span>
                <span>{formatCurrency(sale.cashTendered! - (sale.totalAmount + sale.discountAmount))}</span>
            </div>
         )}
      </div>

       {sale.leaveChangeAsCredit && sale.changeGiven && sale.changeGiven > 0 && (
        <>
            <hr className="border-dashed border-black my-2" />
            <div className="text-center font-bold">
                <p>CRÉDITO DE TROCO GERADO:</p>
                <p className="text-xs">{formatCurrency(sale.changeGiven)}</p>
            </div>
        </>
      )}

      <hr className="border-dashed border-black my-2" />

      <p className="text-center">OBRIGADO PELA PREFERÊNCIA!</p>

    </div>
  );
};
