
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, CheckCircle2, ArrowUpCircle, History, ReceiptText, ShieldCheck } from 'lucide-react';
import { formatCurrency } from '@/lib/constants';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

export default function BillingPage() {
  const [currentPlan, setCurrentPlan] = useState({
    name: 'Profissional',
    status: 'active',
    price: 199.00,
    nextBilling: '2024-06-22',
    trial: false
  });
  const { toast } = useToast();

  const handleUpgrade = async () => {
    toast({ title: "Redirecionando...", description: "Estamos preparando seu checkout seguro." });
    const response = await fetch('/api/billing/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: 'profissional' }),
    });

    if (response.status === 401) {
      window.location.href = '/login?next=/billing';
      return;
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.url) {
      toast({ title: "Erro no checkout", description: payload?.message || "Nao foi possivel iniciar o checkout.", variant: "destructive" });
      return;
    }

    window.location.href = payload.url;
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">Assinatura e Cobrança</h1>
          <p className="text-muted-foreground font-medium">Gerencie seu plano e pagamentos com segurança.</p>
        </div>
        <Badge variant="outline" className="w-fit py-1 px-4 border-primary/20 text-primary flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" /> Pagamento Processado pelo Stripe
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Plano Atual */}
        <Card className="md:col-span-2 shadow-xl border-t-4 border-primary">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl font-black uppercase tracking-tighter">Seu Plano: {currentPlan.name}</CardTitle>
                <CardDescription>Cobrança mensal recorrente.</CardDescription>
              </div>
              <Badge className="bg-green-600 font-black uppercase px-3">Ativo</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">Valor Mensal</p>
                <p className="text-3xl font-black text-primary">{formatCurrency(currentPlan.price)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">Próxima Cobrança</p>
                <p className="text-xl font-bold">{new Date(currentPlan.nextBilling).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">Recursos Ativos</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm font-medium">
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Mesas Ilimitadas</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Monitor de Cozinha</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Relatórios de Lucratividade</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Suporte Prioritário 24/7</div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex gap-3 bg-muted/5 border-t">
            <Button className="font-black uppercase text-xs px-6" onClick={handleUpgrade}>
              <ArrowUpCircle className="mr-2 h-4 w-4" /> Alterar Plano
            </Button>
            <Button variant="outline" className="font-bold uppercase text-xs text-destructive hover:bg-destructive/5 border-destructive/20">
              Cancelar Assinatura
            </Button>
          </CardFooter>
        </Card>

        {/* Método de Pagamento */}
        <Card className="shadow-lg h-fit">
          <CardHeader>
            <CardTitle className="text-lg font-black uppercase tracking-tighter flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" /> Cartão Salvo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border-2 rounded-xl border-primary/10 bg-muted/30">
              <div className="flex justify-between items-center mb-4">
                <div className="h-8 w-12 bg-zinc-800 rounded flex items-center justify-center">
                  <div className="h-4 w-4 bg-orange-500 rounded-full" />
                  <div className="h-4 w-4 bg-red-500 rounded-full -ml-2" />
                </div>
                <Badge variant="outline" className="text-[10px] font-black">PADRÃO</Badge>
              </div>
              <p className="font-black tracking-widest text-lg">•••• 4421</p>
              <div className="flex justify-between mt-2 text-[10px] font-bold uppercase opacity-60">
                <span>Exp: 12/28</span>
                <span>Mastercard</span>
              </div>
            </div>
            <Button variant="ghost" className="w-full font-black uppercase text-[10px] tracking-widest">Gerenciar no Stripe</Button>
          </CardContent>
        </Card>
      </div>

      {/* Histórico */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
            <History className="h-5 w-5 text-primary" /> Histórico de Faturas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary"><ReceiptText className="h-5 w-5" /></div>
                  <div>
                    <p className="font-black text-sm uppercase">Fatura #{2024000 + i}</p>
                    <p className="text-[10px] font-bold uppercase opacity-40">Pago em 22/{5-i}/2024</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <p className="font-black text-sm">R$ 199,00</p>
                  <Button variant="outline" size="sm" className="font-bold uppercase text-[10px]">VER RECIBO</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
