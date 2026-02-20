
"use client";

import { DATA_KEYS } from '@/lib/constants';
import { clearFinancialData, getTransactionFees, saveTransactionFees } from '@/lib/data-access';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Save, ImagePlus, X, Download, Upload, Trash2, Percent } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
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

export default function SettingsClient() {
  const [isMounted, setIsMounted] = useState(false);
  const [barName, setBarName] = useState('');
  const [barCnpj, setBarCnpj] = useState('');
  const [barAddress, setBarAddress] = useState('');
  const [barLogo, setBarLogo] = useState('');
  const [barLogoScale, setBarLogoScale] = useState(1);
  
  // Fee states
  const [debitRate, setDebitRate] = useState('0');
  const [creditRate, setCreditRate] = useState('0');
  const [pixRate, setPixRate] = useState('0');

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
    
    const fees = getTransactionFees();
    setDebitRate(fees.debitRate.toString().replace('.', ','));
    setCreditRate(fees.creditRate.toString().replace('.', ','));
    setPixRate(fees.pixRate.toString().replace('.', ','));
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
    toast({ title: "Identidade Salva!", description: "Os dados do estabelecimento foram atualizados." });
  };

  const handleSaveFees = () => {
    const debit = parseFloat(debitRate.replace(',', '.'));
    const credit = parseFloat(creditRate.replace(',', '.'));
    const pix = parseFloat(pixRate.replace(',', '.'));

    if (isNaN(debit) || isNaN(credit) || isNaN(pix)) {
        toast({ title: "Erro nas taxas", description: "Certifique-se de usar números válidos.", variant: "destructive" });
        return;
    }

    saveTransactionFees({
        debitRate: debit,
        creditRate: credit,
        pixRate: pix
    });
    toast({ title: "Taxas Atualizadas!", description: "As taxas de transação foram salvas com sucesso." });
  };

  const handleExportAllData = () => {
    try {
      const allData: Record<string, any> = {};
      DATA_KEYS.forEach(key => {
        const val = localStorage.getItem(key);
        if (val) {
            try {
                // Tenta converter para objeto se for JSON
                allData[key] = JSON.parse(val);
            } catch (e) {
                // Salva como texto puro se não for JSON (como barName)
                allData[key] = val;
            }
        }
      });
      
      const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `barmate_backup_${format(new Date(), 'yyyy-MM-dd')}.json`;
      
      // Essencial para navegadores baseados em Chromium
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      toast({ title: "Backup Exportado!", description: "O arquivo JSON foi baixado com sucesso." });
    } catch (e) {
      console.error("Export error:", e);
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
          // Salva como string JSON se for objeto/array, ou como texto puro se for valor simples
          const valueToStore = (typeof val === 'object' && val !== null) ? JSON.stringify(val) : String(val);
          localStorage.setItem(key, valueToStore);
        });
        toast({ title: "Dados Importados!", description: "Recarregando o sistema..." });
        setTimeout(() => window.location.reload(), 1000);
      } catch (err) {
        toast({ title: "Arquivo inválido", description: "O arquivo selecionado não é um backup válido do BarMate.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
  };

  if (!isMounted) return null;

  return (
    <div className="space-y-8 pb-20">
      <Card>
        <form onSubmit={handleSaveCompanyDetails}>
          <CardHeader><CardTitle>Identidade do Estabelecimento</CardTitle><CardDescription>Configure como o cliente vê sua marca no celular.</CardDescription></CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label>Logotipo do Bar</Label>
              <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="h-32 w-32 rounded-full border-4 border-dashed flex items-center justify-center bg-muted/30 overflow-hidden relative">
                      {barLogo ? (
                          <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-white">
                              <img src={barLogo} alt="Logo" className="max-w-none transition-transform" style={{ transform: `scale(${barLogoScale})`, width: '128px', height: '128px', objectFit: 'contain' }} />
                              <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 rounded-full" onClick={() => setBarLogo('')}><X className="h-3 w-3" /></Button>
                          </div>
                      ) : (
                          <ImagePlus className="h-8 w-8 text-muted-foreground" />
                      )}
                  </div>
                  <div className="flex-1 space-y-4 w-full">
                      <input type="file" ref={logoInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
                      <Button type="button" variant="outline" onClick={() => logoInputRef.current?.click()}>Escolher Imagem</Button>
                      {barLogo && (
                          <div className="space-y-2 pt-2">
                              <Label className="text-xs font-bold uppercase">Escala do Logo: {Math.round(barLogoScale * 100)}%</Label>
                              <Slider value={[barLogoScale]} min={0.5} max={3.0} step={0.05} onValueChange={([val]) => setBarLogoScale(val)} className="w-full max-w-xs" />
                          </div>
                      )}
                  </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Nome do Bar</Label><Input value={barName} onChange={(e) => setBarName(e.target.value)} /></div>
              <div className="space-y-2"><Label>CNPJ</Label><Input value={barCnpj} onChange={(e) => setBarCnpj(e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>Endereço</Label><Textarea value={barAddress} onChange={(e) => setBarAddress(e.target.value)} /></div>
            <Button type="submit"><Save className="mr-2 h-4 w-4" /> Salvar Identidade</Button>
          </CardContent>
        </form>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Taxas de Transação</CardTitle>
            <CardDescription>Defina as taxas para calcular o lucro líquido real nos relatórios.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
                <Label className="flex items-center gap-2"><Percent className="h-3 w-3" /> Débito (%)</Label>
                <Input value={debitRate} onChange={e => setDebitRate(e.target.value)} placeholder="0,00" />
            </div>
            <div className="space-y-2">
                <Label className="flex items-center gap-2"><Percent className="h-3 w-3" /> Crédito (%)</Label>
                <Input value={creditRate} onChange={e => setCreditRate(e.target.value)} placeholder="0,00" />
            </div>
            <div className="space-y-2">
                <Label className="flex items-center gap-2"><Percent className="h-3 w-3" /> PIX (%)</Label>
                <Input value={pixRate} onChange={e => setPixRate(e.target.value)} placeholder="0,00" />
            </div>
        </CardContent>
        <CardFooter>
            <Button onClick={handleSaveFees} variant="secondary"><Save className="mr-2 h-4 w-4" /> Salvar Taxas</Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader><CardTitle>Gestão de Dados</CardTitle><CardDescription>Backup completo do seu sistema.</CardDescription></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button variant="outline" onClick={handleExportAllData} className="flex flex-col h-auto py-4 gap-2">
            <Download className="h-6 w-6 text-primary" /><div className="text-center"><p className="font-bold">Exportar Backup</p><p className="text-[10px] opacity-60">Baixar todos os dados (JSON)</p></div>
          </Button>
          <Button variant="outline" onClick={() => setImportAlertOpen(true)} className="flex flex-col h-auto py-4 gap-2">
            <Upload className="h-6 w-6 text-blue-500" /><div className="text-center"><p className="font-bold">Importar Backup</p><p className="text-[10px] opacity-60">Restaurar de arquivo salvo</p></div>
          </Button>
          <Button variant="outline" onClick={() => setClearFinancialsAlertOpen(true)} className="flex flex-col h-auto py-4 gap-2 border-destructive/20 hover:bg-destructive/5">
            <Trash2 className="h-6 w-6 text-destructive" /><div className="text-center"><p className="font-bold text-destructive">Zerar Financeiro</p><p className="text-[10px] opacity-60">Limpa vendas e caixa</p></div>
          </Button>
        </CardContent>
      </Card>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />

      <AlertDialog open={importAlertOpen} onOpenChange={setImportAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Importar Backup?</AlertDialogTitle><AlertDialogDescription>Esta ação substituirá permanentemente todos os seus dados atuais (produtos, clientes, vendas e caixa).</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { setImportAlertOpen(false); fileInputRef.current?.click(); }} className="bg-blue-600">Continuar e Restaurar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={clearFinancialsAlertOpen} onOpenChange={setClearFinancialsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirmar Limpeza Financeira?</AlertDialogTitle><AlertDialogDescription>Deseja zerar todo o histórico de vendas, caixa e sessões? Seus produtos e clientes NÃO serão apagados.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { clearFinancialData(); toast({ title: "Limpando..." }); setTimeout(() => window.location.reload(), 1000); }} className="bg-destructive hover:bg-destructive/90">Sim, Zerar Agora</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
