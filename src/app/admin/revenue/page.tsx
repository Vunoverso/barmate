
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, CreditCard, ArrowUpRight, ArrowDownRight, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/constants';

export default function AdminRevenuePage() {
  const stats = [
    { label: 'MRR Atual', value: 4580.00, change: '+12%', trend: 'up' },
    { label: 'Churn Rate', value: '2.4%', change: '-1%', trend: 'down' },
    { label: 'Novas Assinaturas', value: 14, change: '+5', trend: 'up' },
    { label: 'LTV Médio', value: 850.00, change: '+R$ 40', trend: 'up' },
  ];

  const recentPayments = [
    { id: 'pay-1', org: 'Boteco do João', amount: 199.00, status: 'paid', date: '2024-05-22' },
    { id: 'pay-2', org: 'Bar da Esquina', amount: 99.00, status: 'paid', date: '2024-05-21' },
    { id: 'pay-3', org: 'Chopp Express', amount: 199.00, status: 'pending', date: '2024-05-21' },
    { id: 'pay-4', org: 'Night Club', amount: 199.00, status: 'failed', date: '2024-05-20' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3 text-white">
          <TrendingUp className="h-8 w-8 text-green-500" /> Receita da Plataforma
        </h1>
        <p className="text-zinc-400 font-medium">Métricas financeiras e performance de vendas SaaS.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat, i) => (
          <Card key={i} className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-6">
              <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">{stat.label}</p>
              <div className="flex items-end justify-between">
                <p className="text-2xl font-black text-white">
                  {typeof stat.value === 'number' ? formatCurrency(stat.value) : stat.value}
                </p>
                <Badge variant="outline" className={`text-[10px] ${stat.trend === 'up' ? 'text-green-500 border-green-900' : 'text-red-500 border-red-900'}`}>
                  {stat.trend === 'up' ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                  {stat.change}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white uppercase font-black text-xl">Pagamentos Recentes</CardTitle>
          <CardDescription className="text-zinc-500">Histórico de faturamento de todos os tenants.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 uppercase text-[10px] font-bold tracking-widest">
                <TableHead className="text-zinc-400">Organização</TableHead>
                <TableHead className="text-zinc-400">Data</TableHead>
                <TableHead className="text-zinc-400">Valor</TableHead>
                <TableHead className="text-zinc-400 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentPayments.map((pay) => (
                <TableRow key={pay.id} className="border-zinc-800">
                  <TableCell className="font-bold text-white uppercase">{pay.org}</TableCell>
                  <TableCell className="text-zinc-400">{new Date(pay.date).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell className="text-white font-black">{formatCurrency(pay.amount)}</TableCell>
                  <TableCell className="text-right">
                    <Badge className={`uppercase text-[9px] font-black ${pay.status === 'paid' ? 'bg-green-600' : (pay.status === 'pending' ? 'bg-zinc-700' : 'bg-red-600')}`}>
                      {pay.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
