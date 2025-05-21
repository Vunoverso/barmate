
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Save } from 'lucide-react';

export default function SettingsClient() {
  const [barName, setBarName] = useState('');
  const [initialBarName, setInitialBarName] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const storedName = localStorage.getItem('barName') || 'BarMate';
    setBarName(storedName);
    setInitialBarName(storedName);
  }, []);

  const handleSave = () => {
    if (barName.trim() === '') {
      toast({
        title: "Erro",
        description: "O nome do bar não pode estar vazio.",
        variant: "destructive",
      });
      return;
    }
    localStorage.setItem('barName', barName);
    setInitialBarName(barName); // Update initial name to reflect saved state
    // Dispatch a custom event to notify other components like AppLayout
    window.dispatchEvent(new Event('barNameChanged'));
    toast({
      title: "Sucesso!",
      description: "Nome do bar atualizado.",
      action: <Save className="text-green-500" />,
    });
  };

  const isChanged = barName !== initialBarName;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nome do Estabelecimento</CardTitle>
        <CardDescription>Altere o nome do seu bar que será exibido no sistema.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="barName">Nome do Bar</Label>
          <Input
            id="barName"
            value={barName}
            onChange={(e) => setBarName(e.target.value)}
            placeholder="Digite o nome do bar"
          />
        </div>
        <Button onClick={handleSave} disabled={!isChanged || barName.trim() === ''}>
          <Save className="mr-2 h-4 w-4" />
          Salvar Alterações
        </Button>
      </CardContent>
    </Card>
  );
}
