
"use client";

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ActiveOrder } from '@/types';
import { formatCurrency } from '@/lib/constants';
import { getCompanyDetails } from '@/lib/data-access';
import { toValidDate } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface OrderStatementProps {
  order: ActiveOrder;
}

export const OrderStatement = ({ order }: OrderStatementProps) => {
  const [barDetails, setBarDetails] = useState({ name: 'BarMate', cnpj: '', address: '' });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const { barName: name, barCnpj: cnpj, barAddress: address } = getCompanyDetails();
      setBarDetails({ name, cnpj, address });
    }
  }, []);

  const total = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const openedAt = toValidDate(order.createdAt);

  return (
    <div className="printable-content bg-white text-black font-mono w-full text-sm leading-tight p-2">
      <div className="text-center mb-2">
        <h2 className="font-bold text-base">{barDetails.name}</h2>
        {barDetails.address && <p>{barDetails.address}</p>}
        {barDetails.cnpj && <p>CNPJ: {barDetails.cnpj}</p>}
      </div>

      <hr className="border-dashed border-black my-2" />

      <div className="text-center mb-2">
        <p className="font-bold">EXTRATO DE CONSUMO</p>
        <p>Comanda: {order.name}</p>
        <p>Abertura: {openedAt ? format(openedAt, "dd/MM/yyyy HH:mm", { locale: ptBR }) : 'Data indisponível'}</p>
      </div>
      
      <hr className="border-dashed border-black my-2" />

      <table className="w-full">
        <thead>
          <tr className="border-b border-dotted border-black">
            <th className="text-left font-bold">ITEM</th>
            <th className="text-right font-bold">QTD</th>
            <th className="text-right font-bold">VL. UN.</th>
            <th className="text-right font-bold">VL. TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, index) => (
            <tr key={item.lineItemId || `item-${index}`} className="border-b border-dotted border-black last:border-b-0">
              <td className="uppercase">{item.name}</td>
              <td className="text-right">{item.quantity}</td>
              <td className="text-right">{formatCurrency(item.price)}</td>
              <td className="text-right">{formatCurrency(item.price * item.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <hr className="border-dashed border-black my-2" />
      
      <div className="space-y-1">
        <div className="flex justify-between font-bold text-sm">
          <span>TOTAL A PAGAR</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>
      
      <hr className="border-dashed border-black my-2" />

      <p className="text-center">OBRIGADO PELA PREFERÊNCIA!</p>
    </div>
  );
};

    