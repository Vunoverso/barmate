
"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LifeBuoy, MessageSquare, BookOpen, Clock, CheckCircle2, ChevronRight, HelpCircle } from 'lucide-react';
import { SiteFooter } from '@/components/layout/site-footer';
import { useToast } from '@/hooks/use-toast';

export default function SupportPage() {
  const [step, setStep] = useState('home');
  const { toast } = useToast();

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: "Chamado Enviado!", description: "Nossa equipe responderá em breve." });
    setStep('home');
  };

  return (
    <>
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="text-center md:text-left">
        <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center justify-center md:justify-start gap-3">
          <LifeBuoy className="h-8 w-8 text-primary" /> Central de Atendimento
        </h1>
        <p className="text-muted-foreground font-medium">Como podemos ajudar o seu bar hoje?</p>
      </div>

      {step === 'home' && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* FAQ / Documentação */}
          <Card className="hover:shadow-xl transition-all cursor-pointer group border-2 border-transparent hover:border-primary/20">
            <CardHeader>
              <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4"><BookOpen className="h-8 w-8" /></div>
              <CardTitle className="text-2xl font-black uppercase tracking-tighter">Base de Conhecimento</CardTitle>
              <CardDescription>Encontre tutoriais e respostas para as dúvidas mais comuns.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <FaqItem label="Como cadastrar impressora térmica?" />
              <FaqItem label="Como funciona o monitor de cozinha?" />
              <FaqItem label="Configurando taxas de cartão" />
              <FaqItem label="Gerando QR Code por mesa" />
            </CardContent>
            <CardFooter>
              <Button variant="ghost" className="w-full font-black uppercase text-xs tracking-widest text-primary">Ver todos os artigos <ChevronRight className="ml-2 h-4 w-4" /></Button>
            </CardFooter>
          </Card>

          {/* Abrir Chamado */}
          <Card className="hover:shadow-xl transition-all cursor-pointer border-2 border-transparent hover:border-primary/20 overflow-hidden" onClick={() => setStep('ticket')}>
            <div className="bg-primary p-1 text-center text-[10px] font-black uppercase text-white tracking-[0.2em]">Fale com um Humano</div>
            <CardHeader>
              <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4"><MessageSquare className="h-8 w-8" /></div>
              <CardTitle className="text-2xl font-black uppercase tracking-tighter">Suporte via Chat / Ticket</CardTitle>
              <CardDescription>Nosso tempo médio de resposta é de apenas 15 minutos em horário comercial.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm font-bold opacity-60"><Clock className="h-4 w-4" /> Seg à Sex: 09h às 22h</div>
              <div className="flex items-center gap-3 text-sm font-bold opacity-60"><Clock className="h-4 w-4" /> Sáb e Feriados: 10h às 18h</div>
            </CardContent>
            <CardFooter>
              <Button className="w-full h-14 font-black uppercase text-lg shadow-xl shadow-primary/20">Abrir Novo Chamado</Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {step === 'ticket' && (
        <Card className="max-w-2xl mx-auto shadow-2xl border-t-4 border-primary">
          <CardHeader>
            <CardTitle className="text-2xl font-black uppercase tracking-tighter">Descreva o seu problema</CardTitle>
            <CardDescription>Quanto mais detalhes você fornecer, mais rápido poderemos te ajudar.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitTicket} className="space-y-6">
              <div className="space-y-2">
                <Label className="uppercase text-[10px] font-black opacity-50">Assunto do Chamado</Label>
                <Input placeholder="Ex: Erro ao fechar comanda na mesa 5" className="font-bold" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="uppercase text-[10px] font-black opacity-50">Categoria</Label>
                  <Select required>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tech">Problema Técnico</SelectItem>
                      <SelectItem value="billing">Dúvida de Pagamento</SelectItem>
                      <SelectItem value="feature">Sugestão de Recurso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="uppercase text-[10px] font-black opacity-50">Urgência</Label>
                  <Select defaultValue="medium">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa - Posso esperar</SelectItem>
                      <SelectItem value="medium">Média - Preciso hoje</SelectItem>
                      <SelectItem value="high">Alta - Meu bar parou!</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="uppercase text-[10px] font-black opacity-50">Mensagem Detalhada</Label>
                <Textarea placeholder="Explique o que aconteceu passo a passo..." className="min-h-[150px] font-medium" required />
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1 font-bold uppercase" onClick={() => setStep('home')}>Cancelar</Button>
                <Button type="submit" className="flex-1 font-black uppercase">Enviar Chamado</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
      <SiteFooter />
    </>
  );
}

function FaqItem({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors border">
      <span className="text-sm font-bold opacity-70">{label}</span>
      <HelpCircle className="h-4 w-4 opacity-20" />
    </div>
  );
}
