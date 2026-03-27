
"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LifeBuoy, Clock, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { subscribeToTickets, updateTicketStatus, timeAgo, type TicketDoc } from '@/lib/admin-data-access';
import { useToast } from '@/hooks/use-toast';

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<TicketDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsub = subscribeToTickets(data => {
      setTickets(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await updateTicketStatus(id, status);
      toast({ title: 'Ticket atualizado' });
    } catch {
      toast({ title: 'Erro ao atualizar ticket', variant: 'destructive' });
    }
  };

  const openCount = tickets.filter(t => t.status === 'open').length;
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length;
  const closedCount = tickets.filter(t => t.status === 'closed').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3 text-white">
          <LifeBuoy className="h-8 w-8 text-blue-500" /> Suporte Global
        </h1>
        <p className="text-zinc-400 font-medium">Gestão de chamados e atendimento ao cliente.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatSmall label="Tickets Abertos" value={String(openCount)} icon={<AlertCircle className="text-red-500" />} />
        <StatSmall label="Em Atendimento" value={String(inProgressCount)} icon={<Clock className="text-orange-500" />} />
        <StatSmall label="Resolvidos" value={String(closedCount)} icon={<CheckCircle2 className="text-green-500" />} />
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white uppercase font-black">Fila de Atendimento</CardTitle>
          <CardDescription className="text-zinc-500">Chamados pendentes de todos os estabelecimentos.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12 text-zinc-600">
              <LifeBuoy className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-bold uppercase text-xs">Nenhum ticket de suporte ainda</p>
            </div>
          ) : (
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
                      <Badge variant="outline" className={`uppercase text-[9px] ${t.priority === 'high' ? 'border-red-900 text-red-500' : t.priority === 'medium' ? 'border-orange-900 text-orange-500' : 'border-zinc-700 text-zinc-500'}`}>
                        {t.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-zinc-500 text-xs">{timeAgo(t.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      {t.status !== 'closed' ? (
                        <Button onClick={() => handleUpdateStatus(t.id, t.status === 'open' ? 'in_progress' : 'closed')} variant="ghost" size="sm" className="text-orange-500 font-bold uppercase text-[10px]">
                          {t.status === 'open' ? 'Iniciar' : 'Fechar'}
                        </Button>
                      ) : (
                        <Badge className="bg-zinc-800 text-zinc-500 text-[9px] font-black uppercase">Fechado</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
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
