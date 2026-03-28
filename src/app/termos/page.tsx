
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, ChevronLeft, ShieldCheck, Scale, FileText, Gavel } from 'lucide-react';
import { SiteFooter } from '@/components/layout/site-footer';

export default function TermosDeUsoPage() {
  const lastUpdate = "22 de Maio de 2024";

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      {/* Header Simples */}
      <header className="bg-background border-b h-16 flex items-center mb-8">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 font-black text-xl text-primary tracking-tighter">
            <Zap className="fill-primary h-5 w-5" />
            <span>BARMATE</span>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm" className="font-bold uppercase text-[10px]">
              <ChevronLeft className="mr-1 h-4 w-4" /> Voltar para Home
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 max-w-4xl">
        <div className="space-y-6 text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">Termos de <span className="text-primary">Uso</span></h1>
          <p className="text-muted-foreground font-medium italic">Última atualização: {lastUpdate}</p>
        </div>

        <div className="grid gap-8">
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-primary mb-2">
              <ShieldCheck className="h-6 w-6" />
              <h2 className="text-xl font-bold uppercase tracking-tight">1. Aceitação dos Termos</h2>
            </div>
            <Card>
              <CardContent className="pt-6 text-sm leading-relaxed text-muted-foreground space-y-4">
                <p>Ao se cadastrar e utilizar a plataforma <strong>BarMate</strong>, você (doravante denominado "Usuário" ou "Estabelecimento") concorda integralmente com estes termos. O BarMate é um software como serviço (SaaS) destinado à gestão operacional de bares e restaurantes.</p>
                <p>Se você não concordar com qualquer parte destes termos, você deve interromper imediatamente o uso da plataforma.</p>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-primary mb-2">
              <FileText className="h-6 w-6" />
              <h2 className="text-xl font-bold uppercase tracking-tight">2. O Serviço e Período de Teste (Trial)</h2>
            </div>
            <Card>
              <CardContent className="pt-6 text-sm leading-relaxed text-muted-foreground space-y-4">
                <p>O BarMate oferece um período de teste gratuito de <strong>7 (sete) dias</strong>. Durante este período, o Usuário tem acesso total às funcionalidades do plano contratado para avaliação.</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Após o período de teste, o acesso será suspenso caso não haja a confirmação de uma assinatura paga.</li>
                  <li>O BarMate se reserva o direito de alterar, suspender ou descontinuar funcionalidades para melhoria do sistema sem aviso prévio.</li>
                </ul>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-primary mb-2">
              <Scale className="h-6 w-6" />
              <h2 className="text-xl font-bold uppercase tracking-tight">3. Responsabilidades do Estabelecimento</h2>
            </div>
            <Card>
              <CardContent className="pt-6 text-sm leading-relaxed text-muted-foreground space-y-4">
                <p>O Usuário é o único responsável pela veracidade dos dados inseridos, incluindo preços, estoques e fechamento de comandas.</p>
                <p><strong>Compliance Fiscal:</strong> O BarMate é uma ferramenta de gestão operacional. O Estabelecimento é responsável por emitir notas fiscais e cumprir com todas as obrigações tributárias municipais, estaduais e federais decorrentes de suas vendas.</p>
                <p><strong>Segurança de Acesso:</strong> O Usuário deve manter a confidencialidade de sua senha e é responsável por todas as atividades realizadas em sua conta.</p>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-primary mb-2">
              <Zap className="h-6 w-6" />
              <h2 className="text-xl font-bold uppercase tracking-tight">4. Dados e Infraestrutura</h2>
            </div>
            <Card>
              <CardContent className="pt-6 text-sm leading-relaxed text-muted-foreground space-y-4">
                <p>O BarMate utiliza uma arquitetura híbrida de dados para garantir performance:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Dados em Nuvem (Google Firestore):</strong> Comandas abertas e solicitações de clientes são sincronizadas em tempo real.</li>
                  <li><strong>Dados Locais (LocalStorage):</strong> O sistema utiliza o cache do navegador para agilizar a interface. Limpar o cache do navegador sem um backup exportado pode resultar na perda de preferências visuais locais.</li>
                  <li><strong>Backups:</strong> É altamente recomendado que o Usuário utilize a ferramenta de "Exportar Backup" regularmente na aba de Configurações para garantir a soberania de seus dados históricos.</li>
                </ul>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-primary mb-2">
              <Gavel className="h-6 w-6" />
              <h2 className="text-xl font-bold uppercase tracking-tight">5. Pagamentos e Cancelamento</h2>
            </div>
            <Card>
              <CardContent className="pt-6 text-sm leading-relaxed text-muted-foreground space-y-4">
                <p>As assinaturas são mensais e recorrentes. O não pagamento resulta na suspensão automática do acesso após 5 (cinco) dias de atraso.</p>
                <p><strong>Cancelamento:</strong> Pode ser solicitado a qualquer momento pelo painel de Assinatura. Não haverá reembolso proporcional para períodos já iniciados, garantindo o acesso até o final do ciclo atual pago.</p>
              </CardContent>
            </Card>
          </section>

          <div className="pt-10 border-t text-center space-y-4">
            <p className="text-sm text-muted-foreground font-medium">Dúvidas sobre estes termos? Entre em contato conosco.</p>
            <Link href="/suporte">
              <Button className="font-bold uppercase text-xs px-8">Central de Suporte</Button>
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
