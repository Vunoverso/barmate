
"use client";

import type { ProductCategory } from '@/types';
import { LUCIDE_ICON_MAP, DATA_KEYS } from '@/lib/constants';
import { getProductCategories, saveProductCategories, clearFinancialData } from '@/lib/data-access';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Save, ImagePlus, X, Download, Upload, Trash2, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';

export default function SettingsClient() {
  const [isMounted, setIsMounted] = useState(false);
  const [barName, setBarName] = useState('');
  const [barCnpj, setBarCnpj] = useState('');
  const [barAddress, setBarAddress] = useState('');
  const [barLogo, setBarLogo] = useState('');
  const [barLogoScale, setBarLogoScale] = useState(1);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [importAlertOpen, setImportAlertOpen] = useState(false);
  const [clearFinancialsAlertOpen, setClearFinancialsAlertOpen] = useState(false);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const loadData = useCallback(() => {
    setBarName(localStorage.getItem('barName') || 'BarMate');
    setBarCnpj(localStorage.getItem('barCnpj') || '');
    setBarAddress(localStorage.getItem('barAddress') || '');
    setBarLogo(localStorage.getItem('barLogo') || '');
    setBarLogoScale(parseFloat(localStorage.getItem('barLogoScale') || '1'));
    setProductCategories(getProductCategories());
  }, []);

  useEffect(() => {
    loadData();
    setIsMounted(true);
  }, [loadData]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 1024 * 1024) {
            toast({ title: "Arquivo muito grande", description: "O logotipo deve ter menos de 1MB.", variant: "destructive" });
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => setBarLogo(reader.result as string);
        reader.readAsDataURL(file);
    }
  };

  const handleSaveCompanyDetails = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (barName.trim() === '') {
      toast({ title: "Erro", description: "O nome do estabelecimento não pode estar vazio.", variant: "destructive" });
      return;
    }
    localStorage.setItem('barName', barName.trim());
    localStorage.setItem('barCnpj', barCnpj.trim());
    localStorage.setItem('barAddress', barAddress.trim());
    localStorage.setItem('barLogo', barLogo);
    localStorage.setItem('barLogoScale', barLogoScale.toString());
    
    if (db) {
        try {
            await setDoc(doc(db, 'settings', 'global'), {
                barName: barName.trim(),
                barLogo: barLogo,
                barLogoScale: barLogoScale,
                updatedAt: new Date().toISOString()
            }, { merge: true });
        } catch (err) {}
    }
    toast({ title: "Sucesso!", description: "Dados atualizados." });
  };

  const handleExportAllData = () => {
    try {
      const allData: Record<string, any> = {};
      DATA_KEYS.forEach(key => {
        const val = localStorage.getItem(key);
        if (val) allData[key] = JSON.parse(val);
      });
      const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `barmate_backup_completo_${format(new Date(), 'yyyy-MM-dd')}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast({ title: "Backup Exportado!" });
    } catch (e) {
      toast({ title: "Erro ao exportar", variant: "destructive" });
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        Object.entries(data).forEach(([key, val]) => {
          localStorage.setItem(key, JSON.stringify(val));
        });
        toast({ title: "Dados Importados!", description: "A página será recarregada." });
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        toast({ title: "Arquivo inválido", variant: "destructive" });
      }
    };
    reader.readAsText(file);
  };

  const handleClearFinancialHistory = () => {
    clearFinancialData();
    toast({ title: "Histórico Zerado", description: "Vendas e caixa foram limpos com sucesso." });
    setClearFinancialsAlertOpen(false);
    setTimeout(() => window.location.reload(), 1000);
  };

  if (!isMounted) return null;

  return (
    <div className="space-y-8 pb-20">
      <Card>
        <form onSubmit={handleSaveCompanyDetails}>
          <CardHeader>
            <CardTitle>Identidade do Estabelecimento</CardTitle>
            <CardDescription>Defina sua marca para recibos e tela do cliente.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label>Logotipo do Bar</Label>
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                  <div className="h-32 w-32 rounded-full border-4 border-dashed flex items-center justify-center bg-muted/30 overflow-hidden relative shadow-inner">
                      {barLogo ? (
                          <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-white">
                              <img 
                                src={barLogo} 
                                alt="Logo" 
                                className="max-w-none transition-transform" 
                                style={{ transform: `scale(${barLogoScale})`, width: '128px', height: '128px', objectFit: 'contain' }} 
                              />
                              <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 rounded-full" onClick={() => setBarLogo('')}><X className="h-3 w-3" /></Button>
                          </div>
                      ) : (
                          <div className="flex flex-col items-center gap-2 text-muted-foreground"><ImagePlus className="h-8 w-8" /><span className="text-[10px] font-bold uppercase">Logo</span></div>
                      )}
                  </div>
                  <div className="flex-1 space-y-4 w-full">
                      <input type="file" ref={logoInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
                      <Button type="button" variant="outline" onClick={() => logoInputRef.current?.click()}>Escolher Imagem</Button>
                      {barLogo && (
                          <div className="space-y-2 pt-2">
                              <Label className="text-xs font-bold uppercase opacity-70">Ajustar Escala: {Math.round(barLogoScale * 100)}%</Label>
                              <Slider value={[barLogoScale]} min={0.5} max={3.0} step={0.05} onValueChange={([val]) => setBarLogoScale(val)} className="w-full max-w-xs" />
                          </div>
                      )}
                  </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="barName">Nome do Bar</Label><Input id="barName" value={barName} onChange={(e) => setBarName(e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="barCnpj">CNPJ</Label><Input id="barCnpj" value={barCnpj} onChange={(e) => setBarCnpj(e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label htmlFor="barAddress">Endereço</Label><Textarea id="barAddress" value={barAddress} onChange={(e) => setBarAddress(e.target.value)} /></div>
            <Button type="submit"><Save className="mr-2 h-4 w-4" /> Salvar Identidade</Button>
          </CardContent>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gestão de Dados</CardTitle>
          <CardDescription>Gerencie backups e limpeza de histórico do sistema.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button variant="outline" onClick={handleExportAllData} className="flex flex-col h-auto py-4 gap-2">
            <Download className="h-6 w-6 text-primary" />
            <div className="text-center">
              <p className="font-bold">Exportar Backup</p>
              <p className="text-[10px] opacity-60">Baixar todos os dados</p>
            </div>
          </Button>
          <Button variant="outline" onClick={() => setImportAlertOpen(true)} className="flex flex-col h-auto py-4 gap-2">
            <Upload className="h-6 w-6 text-blue-500" />
            <div className="text-center">
              <p className="font-bold">Importar Backup</p>
              <p className="text-[10px] opacity-60">Restaurar de arquivo JSON</p>
            </div>
          </Button>
          <Button variant="outline" onClick={() => setClearFinancialsAlertOpen(true)} className="flex flex-col h-auto py-4 gap-2 border-destructive/20 hover:bg-destructive/5">
            <Trash2 className="h-6 w-6 text-destructive" />
            <div className="text-center">
              <p className="font-bold text-destructive">Zerar Histórico</p>
              <p className="text-[10px] opacity-60">Limpar caixa e vendas</p>
            </div>
          </Button>
        </CardContent>
      </Card>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />

      <AlertDialog open={importAlertOpen} onOpenChange={setImportAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Importar Backup?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação substituirá todos os dados atuais (produtos, vendas, clientes). Recomenda-se exportar um backup antes.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setImportAlertOpen(false); fileInputRef.current?.click(); }} className="bg-blue-600">Continuar e Escolher Arquivo</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={clearFinancialsAlertOpen} onOpenChange={setClearFinancialsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive" /> Atenção!</AlertDialogTitle>
            <AlertDialogDescription>Você está prestes a zerar todo o histórico de vendas, caixa e entradas financeiras. Seus produtos e clientes NÃO serão apagados. Deseja continuar?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearFinancialHistory} className="bg-destructive hover:bg-destructive/90">Sim, Zerar Histórico</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
