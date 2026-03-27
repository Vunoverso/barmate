
"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Users, CreditCard, TrendingUp, LifeBuoy, Clock, ArrowUpRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import {
  subscribeToOrganizations,
  subscribeToTickets,
  computeMRR,
  computeConversionRate,
  timeAgo,
  type OrgDoc,
  type TicketDoc,
} from '@/lib/admin-data-access';
import { formatCurrency } from '@/lib/constants';

export default function AdminGlobalDashboard() {
  const [orgs, setOrgs] = useState<OrgDoc[]>([]);
  const [tickets, setTickets] = useState<TicketDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubOrgs = subscribeToOrganizations(data => {
      setOrgs(data);
      setLoading(false);
    });
    const unsubTickets = subscribeToTickets(setTickets);
    return () => { unsubOrgs(); unsubTickets(); };
  }, []);

  const mrr = computeMRR(orgs);
  const conversionRate = computeConversionRate(orgs);
  const openTickets = tickets.filter(t => t.status !== 'closed').length;
  const recentOrgs = orgs.slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter flex items-center gap-3 text-white">
            <ShieldAlert className="h-10 w-10 text-orange-500" /> Backoffice SaaS
          </h1>
          <p className="text-zinc-400 font-medium">Monitoramento em tempo real da rede BarMate.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="font-bold border-zinc-800 text-zinc-400 hover:bg-zinc-900">Exportar Logs</Button>
          <Button className="font-black bg-orange-600 hover:bg-orange-700 text-white" asChild>
            <Link href="/admin/settings">Configurações Globais</Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard icon={<Users className="text-blue-500" />} label="Estabelecimentos" value={String(orgs.length)} sub={`${orgs.filter(o => o.status === 'trial').length} trials ativos`} href="/admin/accounts" />
            <StatCard icon={<CreditCard className="text-green-500" />} label="MRR Plataforma" value={formatCurrency(mrr)} sub="Receita recorrente" href="/admin/revenue" />
            <StatCard icon={<TrendingUp className="text-orange-500" />} label="Taxa Conversão" value={`${conversionRate}%`} sub="Trial → Pago" href="/admin/revenue" />
            <StatCard icon={<LifeBuoy className="text-red-500" />} label="Suporte Aberto" value={String(openTickets)} sub="Tickets aguardando" href="/admin/tickets" />
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-2 bg-zinc-900 border-zinc-800 text-white">
              <CardHeader>
                <CardTitle className="uppercase font-black">Performance da Rede</CardTitle>
                <CardDescription className="text-zinc-500">Atividade dos usuários nos últimos 7 dias.</CardDescription>
              </CardHeader>
              <CardContent className="h-[250px] flex items-center justify-center border border-zinc-800 border-dashed rounded-lg mx-6 mb-6">
                <p className="text-zinc-600 font-bold uppercase tracking-widest text-xs">Gráfico de Atividade (Em desenvolvimento)</p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800 text-white">
              <CardHeader>
                <CardTitle className="uppercase font-black">Atividade Recente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentOrgs.length === 0 ? (
                  <p className="text-zinc-600 text-xs font-bold uppercase text-center py-4">Nenhuma atividade ainda</p>
                ) : (
                  recentOrgs.map(org => (
                    <ActivityItem
                      key={org.id}
                      text={`Nova conta: ${org.tradeName}`}
                      time={timeAgo(org.createdAt)}
                      type={org.planId !== 'trial' ? 'upgrade' : 'new'}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, sub, href }: { icon: any, label: string, value: string, sub: string, href: string }) {
  return (
    <Link href={href}>
      <Card className="border shadow-lg bg-zinc-900 border-zinc-800 hover:border-orange-500/50 transition-colors cursor-pointer group">
        <CardContent className="pt-6">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 group-hover:border-orange-500/30 transition-colors">{icon}</div>
            <ArrowUpRight className="h-4 w-4 text-zinc-700 group-hover:text-orange-500 transition-colors" />
          </div>
          <p className="text-3xl font-black tracking-tighter text-white">{value}</p>
          <p className="text-[10px] font-bold uppercase text-zinc-500 mt-1">{label}</p>
          <div className="flex items-center gap-1 mt-3">
            <Clock className="h-3 w-3 text-zinc-600" />
            <p className="text-[9px] text-zinc-400 font-black uppercase tracking-wide">{sub}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function ActivityItem({ text, time, type }: { text: string, time: string, type: string }) {
  const colors: Record<string, string> = {
    new: "bg-blue-500",
    payment: "bg-green-500",
    support: "bg-orange-500",
    upgrade: "bg-purple-500"
  };

  return (
    <div className="flex items-center gap-3">
      <div className={`h-2 w-2 rounded-full ${colors[type] || 'bg-zinc-500'}`} />
      <div className="flex-1">
        <p className="text-xs font-bold text-zinc-300">{text}</p>
        <p className="text-[10px] text-zinc-600 uppercase">{time}</p>
      </div>
    </div>
  );
}
