
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Zap, Flame, Crown } from 'lucide-react';
import { loadSiteContent, getDefaultContent, type Plan } from '@/lib/site-content-access';
import { SiteFooter } from '@/components/layout/site-footer';

const ICON_MAP = {
  'zap': Zap,
  'flame': Flame,
  'crown': Crown
};

export default function PlanosPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
   loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setIsLoading(true);
      const siteContent = await loadSiteContent();
      if (siteContent && siteContent.plans) {
        setPlans(siteContent.plans);
      } else {
        const defaultContent = getDefaultContent();
        setPlans(defaultContent.plans);
      }
    } catch (error) {
      console.error("Erro ao carregar planos:", error);
      const defaultContent = getDefaultContent();
      setPlans(defaultContent.plans);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="container mx-auto px-4 py-20 text-center">Carregando planos...</div>;
  }

  return (
    <>
    <div className="container mx-auto px-4 py-20 max-w-6xl">
      <div className="text-center space-y-4 mb-16">
        <h1 className="text-4xl md:text-6xl font-black uppercase">Escolha o <span className="text-primary">plano ideal</span></h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Transparência total. Comece grátis e escale conforme seu negócio cresce.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {plans.map((plan) => {
          const IconComponent = ICON_MAP[plan.icon as keyof typeof ICON_MAP] || Zap;
          const isFeatured = plan.isFeatured || plan.id === 'pro';
          
          return (
            <Card 
              key={plan.id}
              className={`relative overflow-hidden border-2 ${
                isFeatured 
                  ? 'border-primary border-4 shadow-2xl scale-105 z-10' 
                  : ''
              }`}
            >
              {plan.badge && (
                <div className={`absolute top-0 right-0 ${
                  isFeatured 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-zinc-800 text-zinc-300'
                } px-4 py-1 text-[10px] font-black uppercase tracking-widest`}>
                  {plan.badge}
                </div>
              )}
              
              <CardHeader>
                <div className={`w-fit p-3 rounded-xl mb-4 ${
                  isFeatured 
                    ? 'bg-primary/10' 
                    : 'bg-muted'
                }`}>
                  <IconComponent className={`h-6 w-6 ${
                    isFeatured 
                      ? 'text-primary' 
                      : 'text-muted-foreground'
                  }`} />
                </div>
                <CardTitle className={`text-2xl font-black uppercase ${
                  isFeatured ? 'text-primary' : ''
                }`}>
                  {plan.name}
                </CardTitle>
                <CardDescription>{plan.subtitle}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black">R$ {plan.price}</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>

                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <PlanFeature key={idx} text={feature.text} checked={feature.checked} />
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Link href="/cadastro" className="w-full">
                  <Button 
                    {...(isFeatured ? { size: 'lg' } : {})}
                    variant={isFeatured ? 'default' : 'outline'}
                    className={`w-full font-bold uppercase ${
                      isFeatured 
                        ? 'h-14 text-lg font-black shadow-lg shadow-primary/20' 
                        : 'h-12'
                    }`}
                  >
                    {plan.id === 'pro' ? 'Assinar Plano' : 'Começar Agora'}
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <div className="mt-20 text-center">
        <p className="text-muted-foreground mb-4">Ainda com dúvidas? Teste o Plano Profissional por 7 dias grátis.</p>
        <Link href="/cadastro">
          <Button variant="link" className="text-primary font-bold text-lg underline">Criar conta teste →</Button>
        </Link>
      </div>
    </div>
      <SiteFooter />
    </>
  );
}

function PlanFeature({ text, checked }: { text: string; checked?: boolean }) {
  return (
    <li className={`flex items-center gap-3 ${checked ? 'font-medium' : ''}`}>
      {checked ? (
        <Check className="h-5 w-5 text-green-500 flex-shrink-0 font-bold" />
      ) : (
        <div className="h-5 w-5 rounded border border-muted-foreground flex-shrink-0" />
      )}
      <span>{text}</span>
    </li>
  );
}
