
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, ShieldCheck, Zap, Lock, Video, Layout } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [prices, setPrices] = useState({
    essential: '99.00',
    pro: '199.00'
  });
  
  const [content, setContent] = useState({
    homeVideoUrl: ''
  });

  const [infra, setInfra] = useState({
    maintenance: false,
    newRegistrations: true,
    autoBackup: true
  });

  useEffect(() => {
    try {
      const savedPrices = localStorage.getItem('barmate_saas_prices');
      if (savedPrices) {
        setPrices(JSON.parse(savedPrices));
      }
      const savedInfra = localStorage.getItem('barmate_saas_infra');
      if (savedInfra) {
        setInfra(JSON.parse(savedInfra));
      }
      const savedContent = localStorage.getItem('barmate_saas_content');
      if (savedContent) {
        setContent(JSON.parse(savedContent));
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
    }
  }, []);

  const handleSaveSettings = () => {
    try {
      localStorage.setItem('barmate_saas_prices', JSON.stringify(prices));
      localStorage.setItem('barmate_saas_infra', JSON.stringify(infra));
      localStorage.setItem('barmate_saas_content', JSON.stringify(content));
      
      toast({
        title: "Configurações Salvas",
        description: "Os parâmetros globais da plataforma foram atualizados com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao Salvar",
        description: "Não foi possível salvar as alterações no momento.",
        variant: "destructive"
      });
    }
  };

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
              <Input 
                className="bg-zinc-950 border-zinc-800 text-white" 
                value={prices.essential} 
                onChange={(e) => setPrices(prev => ({...prev, essential: e.target.value}))}
              />
            </div>
            <div className="space-y-2">
              <Label>Plano Profissional (R$)</Label>
              <Input 
                className="bg-zinc-950 border-zinc-800 text-white" 
                value={prices.pro} 
                onChange={(e) => setPrices(prev => ({...prev, pro: e.target.value}))}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full bg-orange-600 hover:bg-orange-700 font-black uppercase" onClick={handleSaveSettings}>
              Salvar Alterações
            </Button>
          </CardFooter>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800 text-white">
          <CardHeader>
            <CardTitle className="uppercase font-black flex items-center gap-2">
              <Layout className="h-5 w-5 text-blue-500" /> Marketing e Conteúdo
            </CardTitle>
            <CardDescription className="text-zinc-500">Gerencie o que é exibido na Landing Page.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Video className="h-4 w-4" /> Link do Vídeo (YouTube ou MP4)</Label>
              <Input 
                placeholder="Ex: https://www.youtube.com/watch?v=..." 
                className="bg-zinc-950 border-zinc-800 text-white" 
                value={content.homeVideoUrl} 
                onChange={(e) => setContent(prev => ({...prev, homeVideoUrl: e.target.value}))}
              />
              <p className="text-[10px] text-zinc-500">Este vídeo substituirá a imagem principal na Home.</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full bg-zinc-800 hover:bg-zinc-700 font-black uppercase" onClick={handleSaveSettings}>
              Atualizar Conteúdo
            </Button>
          </CardFooter>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800 text-white">
          <CardHeader>
            <CardTitle className="uppercase font-black flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-500" /> Segurança e Infra
            </CardTitle>
            <CardDescription className="text-zinc-500">Controle de estado global da plataforma.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Modo de Manutenção</Label>
                <p className="text-[10px] text-zinc-500">Bloqueia o acesso de todos os bares.</p>
              </div>
              <Switch 
                checked={infra.maintenance} 
                onCheckedChange={(val) => setInfra(prev => ({...prev, maintenance: val}))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Novos Cadastros</Label>
                <p className="text-[10px] text-zinc-500">Permite ou suspende a criação de novas contas.</p>
              </div>
              <Switch 
                checked={infra.newRegistrations} 
                onCheckedChange={(val) => setInfra(prev => ({...prev, newRegistrations: val}))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Backup Automático Cloud</Label>
                <p className="text-[10px] text-zinc-500">Executa backup total a cada 24h.</p>
              </div>
              <Switch 
                checked={infra.autoBackup} 
                onCheckedChange={(val) => setInfra(prev => ({...prev, autoBackup: val}))}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full border-zinc-800 text-zinc-400 hover:text-white" onClick={handleSaveSettings}>
              Atualizar Infraestrutura
            </Button>
          </CardFooter>
        </Card>

        <Card className="bg-zinc-900 border-red-900 border-dashed">
          <CardHeader>
            <CardTitle className="text-red-500 uppercase font-black flex items-center gap-2">
              <Lock className="h-5 w-5" /> Área de Risco
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row gap-4">
            <Button variant="outline" className="border-red-900 text-red-500 hover:bg-red-950 font-bold" onClick={() => toast({ title: "Logs Limpos", variant: "destructive" })}>
              Limpar Logs de Erro
            </Button>
            <Button variant="outline" className="border-red-900 text-red-500 hover:bg-red-950 font-bold" onClick={() => toast({ title: "Cache Resetado", variant: "destructive" })}>
              Resetar Cache de CDN
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
