
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LifeBuoy, MessageSquare, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function AdminTicketsPage() {
  const tickets = [
    { id: 'T-101', org: 'Boteco do João', subject: 'Impressora não funciona', priority: 'high', status: 'open', time: '14 min atrás' },
    { id: 'T-102', org: 'Chopp Express', subject: 'Dúvida no fechamento de caixa', priority: 'medium', status: 'in_progress', time: '2 horas atrás' },
    { id: 'T-103', org: 'Bar da Esquina', subject: 'Como cadastrar combo?', priority: 'low', status: 'closed', time: '1 dia atrás' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3 text-white">
          <LifeBuoy className="h-8 w-8 text-blue-500" /> Suporte Global
        </h1>
        <p className="text-zinc-400 font-medium">Gestão de chamados e atendimento ao cliente.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatSmall label="Tickets Abertos" value="3" icon={<AlertCircle className="text-red-500" />} />
        <StatSmall label="Em Atendimento" value="1" icon={<Clock className="text-orange-500" />} />
        <StatSmall label="Resolvidos Hoje" value="12" icon={<CheckCircle2 className="text-green-500" />} />
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white uppercase font-black">Fila de Atendimento</CardTitle>
          <CardDescription className="text-zinc-500">Chamados pendentes de todos os estabelecimentos.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 uppercase text-[10px] font-bold tracking-widest">
                <TableHead className="text-zinc-400">ID / Org</TableHead>
                <TableHead className="text-zinc-400">Assunto</TableHead>
                <TableHead className="text-zinc-400">Urgência</TableHead>
                <TableHead className="text-zinc-400">Tempo</TableHead>
                <TableHead className="text-right text-zinc-400">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((t) => (
                <TableRow key={t.id} className="border-zinc-800">
                  <TableCell>
                    <div className="font-black text-white">{t.id}</div>
                    <div className="text-[10px] text-zinc-500 uppercase">{t.org}</div>
                  </TableCell>
                  <TableCell className="text-zinc-300 font-medium">{t.subject}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`uppercase text-[9px] ${t.priority === 'high' ? 'border-red-900 text-red-500' : 'border-zinc-700 text-zinc-500'}`}>
                      {t.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-zinc-500 text-xs">{t.time}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="text-orange-500 font-bold uppercase text-[10px]">Responder</Button>
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

function StatSmall({ label, value, icon }: { label: string, value: string, icon: any }) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="pt-6 flex items-center gap-4">
        <div className="p-2 bg-zinc-950 rounded-lg border border-zinc-800">{icon}</div>
        <div>
          <p className="text-2xl font-black text-white">{value}</p>
          <p className="text-[10px] font-black uppercase text-zinc-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
