
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Frown, MessageCircle, TrendingDown, Target, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminCancellationsPage() {
  const requests = [
    { id: 'CR-1', org: 'Bar do Zé', reason: 'Preço alto', status: 'pending', date: '2024-05-20', ltv: 450 },
    { id: 'CR-2', org: 'Adega 24h', reason: 'Dificuldade técnica', status: 'reversed', date: '2024-05-18', ltv: 120 },
    { id: 'CR-3', org: 'Lounge VIP', reason: 'Fechamento do negócio', status: 'processed', date: '2024-05-15', ltv: 890 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3 text-white">
          <Frown className="h-8 w-8 text-red-500" /> Cancelamentos e Retenção
        </h1>
        <p className="text-zinc-400 font-medium">Análise de churn e solicitações de encerramento.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Churn Rate (30d)" value="2.1%" sub="-0.4% vs mês ant." icon={<TrendingDown className="text-red-500" />} />
        <StatCard label="Taxa de Retenção" value="15%" sub="Reversão de cancelamento" icon={<Target className="text-green-500" />} />
        <StatCard label="LTV Perdido" value="R$ 1.240" sub="Este mês" icon={<Frown className="text-orange-500" />} />
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white uppercase font-black">Solicitações de Churn</CardTitle>
          <CardDescription className="text-zinc-500">Ações rápidas para evitar a perda de clientes.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 uppercase text-[10px] font-bold tracking-widest">
                <TableHead className="text-zinc-400">Organização</TableHead>
                <TableHead className="text-zinc-400">Motivo</TableHead>
                <TableHead className="text-zinc-400">LTV Acumulado</TableHead>
                <TableHead className="text-zinc-400">Status</TableHead>
                <TableHead className="text-right text-zinc-400">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id} className="border-zinc-800">
                  <TableCell className="font-bold text-white uppercase">{r.org}</TableCell>
                  <TableCell className="text-zinc-400 text-xs">{r.reason}</TableCell>
                  <TableCell className="text-zinc-300 font-black">R$ {r.ltv}</TableCell>
                  <TableCell>
                    <Badge className={`uppercase text-[9px] font-black ${r.status === 'pending' ? 'bg-orange-600' : (r.status === 'reversed' ? 'bg-green-600' : 'bg-zinc-700')}`}>
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" className="h-7 border-zinc-800 text-zinc-400 hover:text-white text-[9px] uppercase font-black">
                            <MessageCircle className="h-3 w-3 mr-1" /> Oferecer Desconto
                        </Button>
                        <Button size="sm" className="h-7 bg-green-600 hover:bg-green-700 text-white text-[9px] uppercase font-black">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Marcar Retenção
                        </Button>
                    </div>
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

function StatCard({ label, value, sub, icon }: { label: string, value: string, sub: string, icon: any }) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-zinc-950 rounded-lg border border-zinc-800">{icon}</div>
          </div>
          <p className="text-2xl font-black text-white">{value}</p>
          <p className="text-[10px] font-black uppercase text-zinc-500">{label}</p>
          <p className="text-[9px] text-zinc-600 font-bold uppercase mt-1">{sub}</p>
        </CardContent>
      </Card>
    );
  }
