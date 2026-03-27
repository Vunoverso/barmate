
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Zap, ChevronRight, CheckCircle2, Store, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CadastroPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ name: '', email: '', barName: '', password: '' });
  const { toast } = useToast();

  const handleNext = () => {
    if (step === 1 && (!formData.name || !formData.email)) {
      toast({ title: "Preencha seus dados", variant: "destructive" });
      return;
    }
    if (step === 2) {
      if (!formData.barName || !formData.password) {
        toast({ title: "Preencha os dados do bar", variant: "destructive" });
        return;
      }
      // Simulação de criação de conta SaaS Real
      const newOrgId = `org-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('barmate_admin_session', 'true');
      localStorage.setItem('barmate_current_org_id', newOrgId);
      localStorage.setItem('barName', formData.barName);
      localStorage.setItem('barmate_user_role', 'owner');
    }
    setStep(step + 1);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center space-y-2">
          <Link href="/" className="flex items-center justify-center gap-2 font-black text-2xl text-primary mb-8">
            <Zap className="fill-primary" />
            <span>BARMATE</span>
          </Link>
          <div className="flex justify-center gap-4 mb-8">
            <div className={`h-2 w-16 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`h-2 w-16 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`h-2 w-16 rounded-full ${step >= 3 ? 'bg-primary' : 'bg-muted'}`} />
          </div>
        </div>

        <Card className="shadow-2xl border-t-4 border-primary">
          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle className="text-2xl font-black uppercase flex items-center gap-2">
                  <User className="h-6 w-6 text-primary" /> Passo 1: Sobre você
                </CardTitle>
                <CardDescription>Comece criando seu perfil de administrador.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Seu Nome Completo</Label>
                  <Input placeholder="Ex: João da Silva" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Email Profissional</Label>
                  <Input type="email" placeholder="joao@seu-bar.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <Button onClick={handleNext} className="w-full h-12 text-lg font-bold">Continuar <ChevronRight className="ml-2 h-5 w-5" /></Button>
              </CardContent>
            </>
          )}

          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle className="text-2xl font-black uppercase flex items-center gap-2">
                  <Store className="h-6 w-6 text-primary" /> Passo 2: O Bar
                </CardTitle>
                <CardDescription>Qual o nome do estabelecimento que vamos gerenciar?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome do Estabelecimento</Label>
                  <Input placeholder="Ex: Boteco do Canal" value={formData.barName} onChange={e => setFormData({...formData, barName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Crie uma Senha Forte</Label>
                  <Input type="password" placeholder="Mínimo 8 caracteres" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                </div>
                <div className="flex gap-4">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-12">Voltar</Button>
                  <Button onClick={handleNext} className="flex-1 h-12 font-bold uppercase">Finalizar Cadastro</Button>
                </div>
              </CardContent>
            </>
          )}

          {step === 3 && (
            <CardContent className="py-12 text-center space-y-6">
              <div className="mx-auto bg-green-100 p-4 rounded-full w-fit mb-4">
                <CheckCircle2 className="h-16 w-16 text-green-600" />
              </div>
              <h2 className="text-3xl font-black uppercase">Tudo pronto, {formData.name.split(' ')[0]}!</h2>
              <p className="text-muted-foreground">Seu período de teste grátis de 7 dias começou agora. Vamos configurar seus primeiros produtos?</p>
              <Link href="/dashboard" className="block">
                <Button size="lg" className="w-full h-16 text-xl font-black uppercase shadow-xl shadow-primary/20">Acessar Meu Bar</Button>
              </Link>
            </CardContent>
          )}
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Já tem uma conta? <Link href="/login" className="text-primary font-bold underline">Faça login aqui</Link>
        </p>
      </div>
    </div>
  );
}
