
"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Loader2, CreditCard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/constants';
import {
  subscribeToOrganizations,
  computeMRR,
  computeConversionRate,
  timeAgo,
  type OrgDoc,
} from '@/lib/admin-data-access';

const PLAN_PRICES: Record<string, number> = { trial: 0, essential: 99, pro: 199, enterprise: 499 };

export default function AdminRevenuePage() {
  const [orgs, setOrgs] = useState<OrgDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToOrganizations(data => {
      setOrgs(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const mrr = computeMRR(orgs);
  const activeOrgs = orgs.filter(o => o.status === 'active');
  const trialOrgs = orgs.filter(o => o.status === 'trial');
  const conversionRate = computeConversionRate(orgs);

  const stats = [
    { label: 'MRR Atual', value: formatCurrency(mrr), trend: 'neutral' },
    { label: 'Contas Ativas', value: String(activeOrgs.length), trend: 'up' },
    { label: 'Em Trial', value: String(trialOrgs.length), trend: 'neutral' },
    { label: 'Taxa Conversão', value: `${conversionRate}%`, trend: conversionRate > 0 ? 'up' : 'neutral' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3 text-white">
          <TrendingUp className="h-8 w-8 text-green-500" /> Receita da Plataforma
        </h1>
        <p className="text-zinc-400 font-medium">Métricas financeiras e performance de vendas SaaS.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            {stats.map((stat, i) => (
              <Card key={i} className="bg-zinc-900 border-zinc-800">
                <CardContent className="pt-6">
                  <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">{stat.label}</p>
                  <div className="flex items-end justify-between">
                    <p className="text-2xl font-black text-white">{stat.value}</p>
                    {stat.trend === 'up' && <ArrowUpRight className="h-4 w-4 text-green-500" />}
                    {stat.trend === 'down' && <ArrowDownRight className="h-4 w-4 text-red-500" />}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white uppercase font-black text-xl">Assinaturas Ativas</CardTitle>
              <CardDescription className="text-zinc-500">Receita recorrente por organização.</CardDescription>
            </CardHeader>
            <CardContent>
              {activeOrgs.length === 0 ? (
                <div className="text-center py-12 text-zinc-600">
                  <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-bold uppercase text-xs">Nenhuma assinatura ativa ainda</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 uppercase text-[10px] font-bold tracking-widest">
                      <TableHead className="text-zinc-400">Organização</TableHead>
                      <TableHead className="text-zinc-400">Plano</TableHead>
                      <TableHead className="text-zinc-400">Desde</TableHead>
                      <TableHead className="text-zinc-400 text-right">MRR</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeOrgs.map(org => (
                      <TableRow key={org.id} className="border-zinc-800">
                        <TableCell className="font-bold text-white uppercase">{org.tradeName}</TableCell>
                        <TableCell>
                          <Badge className={`uppercase text-[9px] font-black ${org.planId === 'pro' ? 'bg-orange-600' : 'bg-zinc-700'}`}>
                            {org.planId}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-zinc-400 text-xs">{timeAgo(org.createdAt)}</TableCell>
                        <TableCell className="text-right font-black text-white">{formatCurrency(PLAN_PRICES[org.planId] ?? 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
