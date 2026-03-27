
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Zap, Flame, Crown } from 'lucide-react';

export default function PlanosPage() {
  return (
    <div className="container mx-auto px-4 py-20 max-w-6xl">
      <div className="text-center space-y-4 mb-16">
        <h1 className="text-4xl md:text-6xl font-black uppercase">Escolha o <span className="text-primary">plano ideal</span></h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Transparência total. Comece grátis e escale conforme seu negócio cresce.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Essencial */}
        <Card className="relative overflow-hidden border-2">
          <CardHeader>
            <div className="bg-muted w-fit p-3 rounded-xl mb-4"><Zap className="h-6 w-6 text-muted-foreground" /></div>
            <CardTitle className="text-2xl font-black uppercase">Essencial</CardTitle>
            <CardDescription>Para bares iniciantes e pequenos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black">R$ 99</span>
              <span className="text-muted-foreground">/mês</span>
            </div>
            <ul className="space-y-3">
              <PlanFeature text="Até 10 Mesas Ativas" />
              <PlanFeature text="Cadastro de 50 Produtos" />
              <PlanFeature text="Relatórios Básicos" />
              <PlanFeature text="1 Usuário Admin" />
              <PlanFeature text="Suporte via Email" />
            </ul>
          </CardContent>
          <CardFooter>
            <Link href="/cadastro" className="w-full">
              <Button variant="outline" className="w-full h-12 font-bold uppercase">Começar Agora</Button>
            </Link>
          </CardFooter>
        </Card>

        {/* Profissional */}
        <Card className="relative overflow-hidden border-primary border-4 shadow-2xl scale-105 z-10">
          <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 text-[10px] font-black uppercase tracking-widest">Mais Vendido</div>
          <CardHeader>
            <div className="bg-primary/10 w-fit p-3 rounded-xl mb-4"><Flame className="h-6 w-6 text-primary" /></div>
            <CardTitle className="text-2xl font-black uppercase text-primary">Profissional</CardTitle>
            <CardDescription>Gestão completa para crescer.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black">R$ 199</span>
              <span className="text-muted-foreground">/mês</span>
            </div>
            <ul className="space-y-3 font-medium">
              <PlanFeature text="Mesas Ilimitadas" checked />
              <PlanFeature text="Produtos Ilimitados" checked />
              <PlanFeature text="Relatórios Financeiros Avançados" checked />
              <PlanFeature text="Até 5 Usuários (Garçons)" checked />
              <PlanFeature text="Monitor de Cozinha" checked />
              <PlanFeature text="Suporte Prioritário" checked />
            </ul>
          </CardContent>
          <CardFooter>
            <Link href="/cadastro" className="w-full">
              <Button size="lg" className="w-full h-14 text-lg font-black uppercase shadow-lg shadow-primary/20">Assinar Plano</Button>
            </Link>
          </CardFooter>
        </Card>

        {/* Enterprise */}
        <Card className="relative overflow-hidden border-2">
          <CardHeader>
            <div className="bg-muted w-fit p-3 rounded-xl mb-4"><Crown className="h-6 w-6 text-yellow-600" /></div>
            <CardTitle className="text-2xl font-black uppercase">Enterprise</CardTitle>
            <CardDescription>Para redes e grandes operações.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black">Sob Consulta</span>
            </div>
            <ul className="space-y-3">
              <PlanFeature text="Múltiplas Unidades" />
              <PlanFeature text="Gestão de Estoque Avançada" />
              <PlanFeature text="Integrações com APIs" />
              <PlanFeature text="Gerente de Conta Dedicado" />
              <PlanFeature text="Treinamento de Equipe" />
            </ul>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full h-12 font-bold uppercase">Falar com Consultor</Button>
          </CardFooter>
        </Card>
      </div>

      <div className="mt-20 text-center">
        <p className="text-muted-foreground mb-4">Ainda com dúvidas? Teste o Plano Profissional por 7 dias grátis.</p>
        <Link href="/cadastro">
          <Button variant="link" className="text-primary font-bold text-lg underline">Criar conta teste →</Button>
        </Link>
      </div>
    </div>
  );
}

function PlanFeature({ text, checked }: { text: string, checked?: boolean }) {
  return (
    <li className="flex items-center gap-3 text-sm">
      <Check className={`h-5 w-5 ${checked ? 'text-primary' : 'text-muted-foreground'}`} />
      <span>{text}</span>
    </li>
  );
}
