
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, ShieldCheck, Zap, Server, Database, Lock } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3 text-white">
          <Settings className="h-8 w-8 text-zinc-500" /> Configurações Globais
        </h1>
        <p className="text-zinc-400 font-medium">Controle de infraestrutura e parâmetros do SaaS.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-zinc-900 border-zinc-800 text-white">
          <CardHeader>
            <CardTitle className="uppercase font-black flex items-center gap-2">
              <Zap className="h-5 w-5 text-orange-500" /> Preços dos Planos
            </CardTitle>
            <CardDescription className="text-zinc-500">Defina os valores das mensalidades para novos clientes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Plano Essencial (R$)</Label>
              <Input className="bg-zinc-950 border-zinc-800" defaultValue="99.00" />
            </div>
            <div className="space-y-2">
              <Label>Plano Profissional (R$)</Label>
              <Input className="bg-zinc-950 border-zinc-800" defaultValue="199.00" />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full bg-orange-600 hover:bg-orange-700">Salvar Alterações</Button>
          </CardFooter>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800 text-white">
          <CardHeader>
            <CardTitle className="uppercase font-black flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-500" /> Segurança e Infra
            </CardTitle>
            <CardDescription className="text-zinc-500">Controle de estado global da plataforma.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Modo de Manutenção</Label>
                <p className="text-[10px] text-zinc-500">Bloqueia o acesso de todos os bares.</p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Novos Cadastros</Label>
                <p className="text-[10px] text-zinc-500">Permite ou suspende a criação de novas contas.</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Backup Automático Cloud</Label>
                <p className="text-[10px] text-zinc-500">Executa backup total a cada 24h.</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-zinc-900 border-red-900 border-dashed">
        <CardHeader>
          <CardTitle className="text-red-500 uppercase font-black flex items-center gap-2">
            <Lock className="h-5 w-5" /> Área de Risco
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-4">
          <Button variant="outline" className="border-red-900 text-red-500 hover:bg-red-950 font-bold">Limpar Logs de Erro</Button>
          <Button variant="outline" className="border-red-900 text-red-500 hover:bg-red-950 font-bold">Resetar Cache de CDN</Button>
        </CardContent>
      </Card>
    </div>
  );
}
