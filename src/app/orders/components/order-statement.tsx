
"use client";

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ActiveOrder } from '@/types';
import { formatCurrency } from '@/lib/constants';
import { useEffect, useState } from 'react';

interface OrderStatementProps {
  order: ActiveOrder;
}

export const OrderStatement = ({ order }: OrderStatementProps) => {
  const [barDetails, setBarDetails] = useState({ name: 'BarMate', cnpj: '', address: '' });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const name = localStorage.getItem('barName') || 'BarMate';
      const cnpj = localStorage.getItem('barCnpj') || '';
      const address = localStorage.getItem('barAddress') || '';
      setBarDetails({ name, cnpj, address });
    }
  }, []);

  const total = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="printable-content bg-white text-black font-mono w-full text-[10px] leading-tight">
      <div className="text-center mb-2">
        <h2 className="font-bold text-sm">{barDetails.name}</h2>
        {barDetails.address && <p>{barDetails.address}</p>}
        {barDetails.cnpj && <p>CNPJ: {barDetails.cnpj}</p>}
      </div>

      <hr className="border-dashed border-black my-2" />

      <div className="text-center mb-2">
        <p className="font-bold">EXTRATO DE CONSUMO</p>
        <p>Comanda: {order.name}</p>
        <p>Abertura: {format(new Date(order.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
      </div>
      
      <hr className="border-dashed border-black my-2" />

      <table className="w-full">
        <thead>
          <tr>
            <th>ITEM</th>
            <th>QTD</th>
            <th>VL. UN.</th>
            <th>VL. TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, index) => (
            <tr key={item.lineItemId || `item-${index}`}>
              <td className="uppercase">{item.name}</td>
              <td>{item.quantity}</td>
              <td>{formatCurrency(item.price)}</td>
              <td>{formatCurrency(item.price * item.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <hr className="border-dashed border-black my-2" />
      
      <div className="space-y-1">
        <div className="flex justify-between font-bold text-xs">
          <span>TOTAL A PAGAR</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>
      
      <hr className="border-dashed border-black my-2" />

      <p className="text-center">OBRIGADO PELA PREFERÊNCIA!</p>
    </div>
  );
};
