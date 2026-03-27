
"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Frown, MessageCircle, TrendingDown, Target, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { subscribeToCancellations, updateCancellationStatus, timeAgo, type CancellationDoc } from '@/lib/admin-data-access';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/constants';

export default function AdminCancellationsPage() {
  const [requests, setRequests] = useState<CancellationDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsub = subscribeToCancellations(data => {
      setRequests(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleAction = async (id: string, status: 'reversed' | 'processed') => {
    try {
      await updateCancellationStatus(id, status);
      toast({ title: status === 'reversed' ? 'Cliente retido!' : 'Cancelamento processado' });
    } catch {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' });
    }
  };

  const pending = requests.filter(r => r.status === 'pending').length;
  const retained = requests.filter(r => r.status === 'reversed').length;
  const ltvLost = requests.filter(r => r.status === 'processed').reduce((s, r) => s + (r.ltv || 0), 0);
  const retentionRate = requests.length ? Math.round((retained / requests.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3 text-white">
          <Frown className="h-8 w-8 text-red-500" /> Cancelamentos e Retenção
        </h1>
        <p className="text-zinc-400 font-medium">Análise de churn e solicitações de encerramento.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Pendentes" value={String(pending)} sub="aguardando ação" icon={<TrendingDown className="text-red-500" />} />
        <StatCard label="Taxa de Retenção" value={`${retentionRate}%`} sub="cancelamentos revertidos" icon={<Target className="text-green-500" />} />
        <StatCard label="LTV Perdido" value={formatCurrency(ltvLost)} sub="cancelamentos processados" icon={<Frown className="text-orange-500" />} />
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white uppercase font-black">Solicitações de Churn</CardTitle>
          <CardDescription className="text-zinc-500">Ações rápidas para evitar a perda de clientes.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 text-zinc-600">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-bold uppercase text-xs">Nenhuma solicitação de cancelamento</p>
            </div>
          ) : (
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
                    <TableCell>
                      <div className="font-bold text-white uppercase">{r.org}</div>
                      <div className="text-[10px] text-zinc-500">{timeAgo(r.createdAt)}</div>
                    </TableCell>
                    <TableCell className="text-zinc-400 text-xs">{r.reason}</TableCell>
                    <TableCell className="text-zinc-300 font-black">{formatCurrency(r.ltv || 0)}</TableCell>
                    <TableCell>
                      <Badge className={`uppercase text-[9px] font-black ${r.status === 'pending' ? 'bg-orange-600' : r.status === 'reversed' ? 'bg-green-600' : 'bg-zinc-700'}`}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {r.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <Button onClick={() => handleAction(r.id, 'reversed')} variant="outline" size="sm" className="h-7 border-zinc-800 text-zinc-400 hover:text-white text-[9px] uppercase font-black">
                            <MessageCircle className="h-3 w-3 mr-1" /> Reter
                          </Button>
                          <Button onClick={() => handleAction(r.id, 'processed')} size="sm" className="h-7 bg-green-600 hover:bg-green-700 text-white text-[9px] uppercase font-black">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Processar
                          </Button>
                        </div>
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
