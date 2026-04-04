
"use client";

import { DATA_KEYS, KEY_OPEN_ORDERS } from '@/lib/constants';
import { clearFinancialData, getTransactionFees, saveTransactionFees, getCurrentOrgId, saveCompatibilityKeyValue } from '@/lib/data-access';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Save, ImagePlus, X, Download, Upload, Trash2, Percent, Star, Send, MessageSquareHeart } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { db } from '@/lib/firebase';
import { isSupabaseProvider } from '@/lib/backend-provider';
import { doc, setDoc, collection, addDoc, serverTimestamp, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
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
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export default function SettingsClient() {
  const [isMounted, setIsMounted] = useState(false);
  const [barName, setBarName] = useState('');
  const [barCnpj, setBarCnpj] = useState('');
  const [barAddress, setBarAddress] = useState('');
  const [barLogo, setBarLogo] = useState('');
  const [barLogoScale, setBarLogoScale] = useState(1);
  
  const [testimonial, setTestimonial] = useState('');
  const [rating, setRating] = useState(5);
  const [isSubmittingTestimonial, setIsSubmittingTestimonial] = useState(false);
  
  const [debitRate, setDebitRate] = useState('0');
  const [creditRate, setCreditRate] = useState('0');
  const [pixRate, setPixRate] = useState('0');

  const [importAlertOpen, setImportAlertOpen] = useState(false);
  const [clearFinancialsAlertOpen, setClearFinancialsAlertOpen] = useState(false);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const safeDeserialize = (raw: string) => {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  };

  const persistBackupEntry = (key: string, value: unknown) => {
    saveCompatibilityKeyValue(key, value);
  };

  const restoreOpenOrdersToCloud = async (orders: unknown) => {
    const orgId = getCurrentOrgId();
    if (!db || !orgId || !Array.isArray(orders)) return;

    const q = query(collection(db, 'open_orders'), where('organizationId', '==', orgId));
    const existing = await getDocs(q);
    const batch = writeBatch(db);

    existing.docs.forEach(docSnap => batch.delete(docSnap.ref));

    orders.forEach((order: any) => {
      if (!order?.id) return;
      const createdAt = order.createdAt || new Date().toISOString();
      batch.set(doc(db, 'open_orders', String(order.id)), {
        ...order,
        items: Array.isArray(order.items) ? order.items : [],
        organizationId: orgId,
        createdAt,
        updatedAt: new Date().toISOString(),
      });
    });

    await batch.commit();
  };

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
    const orgId = getCurrentOrgId();
    if (!orgId) return;

    saveCompatibilityKeyValue('barName', barName.trim());
    saveCompatibilityKeyValue('barCnpj', barCnpj.trim());
    saveCompatibilityKeyValue('barAddress', barAddress.trim());
    saveCompatibilityKeyValue('barLogo', barLogo);
    saveCompatibilityKeyValue('barLogoScale', barLogoScale);
    
    if (db && !isSupabaseProvider) {
        const docRef = doc(db, 'settings', orgId);
        const data = {
            barName: barName.trim(),
            barLogo: barLogo,
            barLogoScale: barLogoScale,
            updatedAt: new Date().toISOString()
        };
        
        setDoc(docRef, data, { merge: true })
            .catch(async (err) => {
                const permissionError = new FirestorePermissionError({
                    path: docRef.path,
                    operation: 'update',
                    requestResourceData: data
                } satisfies SecurityRuleContext);
                errorEmitter.emit('permission-error', permissionError);
            });
    }
    toast({ title: "Identidade Salva!", description: "Os dados do estabelecimento foram atualizados." });
  };

  const handleSaveFees = () => {
    const debit = parseFloat(debitRate.replace(',', '.'));
    const credit = parseFloat(creditRate.replace(',', '.'));
    const pix = parseFloat(pixRate.replace(',', '.'));

    if (isNaN(debit) || isNaN(credit) || isNaN(pix)) {
        toast({ title: "Valores Inválidos", description: "Verifique as taxas informadas.", variant: "destructive" });
        return;
    }

    saveTransactionFees({ debitRate: debit, creditRate: credit, pixRate: pix });
    toast({ title: "Taxas Atualizadas", description: "As taxas de transação foram salvas com sucesso." });
  };

  const handleSendTestimonial = () => {
    if (!testimonial.trim()) {
      toast({ title: "Mensagem vazia", description: "Escreva algo sobre sua experiência.", variant: "destructive" });
      return;
    }

    setIsSubmittingTestimonial(true);
    const orgId = getCurrentOrgId();

    if (!db || !orgId) {
      setIsSubmittingTestimonial(false);
      return;
    }

    const testimonialData = {
      organizationId: orgId,
      barName: barName || 'BarMate User',
      authorName: "Proprietário",
      content: testimonial.trim(),
      rating: rating,
      status: 'pending' as const,
      createdAt: serverTimestamp()
    };

    const testimonialsCol = collection(db, 'testimonials');

    addDoc(testimonialsCol, testimonialData)
      .then(() => {
        toast({ title: "Depoimento Enviado!", description: "Obrigado! Seu feedback foi enviado para moderação." });
        setTestimonial('');
        setRating(5);
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: testimonialsCol.path,
          operation: 'create',
          requestResourceData: testimonialData,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
        toast({ title: "Erro no envio", description: "Não foi possível enviar seu depoimento neste momento.", variant: "destructive" });
      })
      .finally(() => {
        setIsSubmittingTestimonial(false);
      });
  };

  const handleExportFullBackup = () => {
    toast({ title: "Gerando backup...", description: "Aguarde um momento." });
    const fullData: Record<string, any> = {};
    DATA_KEYS.forEach(key => {
        const val = localStorage.getItem(key);
        if (val !== null) fullData[key] = safeDeserialize(val);
    });

    const blob = new Blob([JSON.stringify(fullData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `barmate_backup_completo_${format(new Date(), 'yyyy-MM-dd')}.json`;
    link.click();
    toast({ title: "Backup Concluído!", description: "Seu arquivo de segurança foi baixado." });
  };

  const handleImportFullBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const data = JSON.parse(event.target?.result as string);
            Object.entries(data).forEach(([key, value]) => {
                persistBackupEntry(key, value);
            });

            // As comandas ativas são carregadas do Firebase nas telas de operação.
            // Por isso, além do localStorage, restauramos também em open_orders.
            await restoreOpenOrdersToCloud(data[KEY_OPEN_ORDERS]);

            const importedOrders = Array.isArray(data[KEY_OPEN_ORDERS]) ? data[KEY_OPEN_ORDERS].length : 0;
            toast({
              title: "Restauração Concluída!",
              description: `Backup aplicado. ${importedOrders} comanda(s) restaurada(s) na nuvem.`,
            });
            setTimeout(() => window.location.reload(), 1500);
        } catch (err) {
            toast({ title: "Erro na Importação", description: "O arquivo selecionado é inválido.", variant: "destructive" });
        } finally {
            e.target.value = '';
        }
    };
    reader.readAsText(file);
  };

  if (!isMounted) return null;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg border-t-4 border-primary">
          <CardHeader>
            <CardTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
              <ImagePlus className="h-5 w-5 text-primary" /> Identidade Visual
            </CardTitle>
            <CardDescription>Configure como seu bar aparece para os clientes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center gap-4 p-4 border-2 border-dashed rounded-xl bg-muted/30">
              {barLogo ? (
                <div className="relative group">
                  <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-background bg-white flex items-center justify-center">
                    <img 
                      src={barLogo} 
                      alt="Logo Preview" 
                      className="max-w-none transition-transform" 
                      style={{ transform: `scale(${barLogoScale})`, width: '128px', height: '128px', objectFit: 'contain' }} 
                    />
                  </div>
                  <Button size="icon" variant="destructive" className="absolute -top-2 -right-2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setBarLogo('')}><X className="h-4 w-4" /></Button>
                </div>
              ) : (
                <div className="h-32 w-32 rounded-full bg-muted flex items-center justify-center border-4 border-background cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => logoInputRef.current?.click()}>
                  <ImagePlus className="h-8 w-8 text-muted-foreground opacity-20" />
                </div>
              )}
              <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
              <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>Escolher Logotipo</Button>
            </div>

            {barLogo && (
              <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-black uppercase opacity-60">
                  <span>Escala do Logo</span>
                  <span>{Math.round(barLogoScale * 100)}%</span>
                </div>
                <Slider value={[barLogoScale]} min={0.5} max={2} step={0.1} onValueChange={([val]) => setBarLogoScale(val)} />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase opacity-60">Nome do Estabelecimento</Label>
              <Input value={barName} onChange={e => setBarName(e.target.value)} placeholder="Ex: Boteco do Canal" />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full font-black uppercase" onClick={() => handleSaveCompanyDetails()}><Save className="mr-2 h-4 w-4" /> Salvar Identidade</Button>
          </CardFooter>
        </Card>

        <Card className="shadow-lg border-t-4 border-pink-500">
          <CardHeader>
            <CardTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
              <MessageSquareHeart className="h-5 w-5 text-pink-500" /> Seu Depoimento
            </CardTitle>
            <CardDescription>O que você acha do BarMate? Seu feedback pode aparecer na nossa home.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star 
                  key={star} 
                  className={cn(
                    "h-8 w-8 cursor-pointer transition-all hover:scale-110", 
                    rating >= star ? "fill-yellow-500 text-yellow-500" : "fill-none text-zinc-300"
                  )} 
                  onClick={() => setRating(star)}
                />
              ))}
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase opacity-60">Sua Experiência</Label>
              <Textarea 
                placeholder="Ex: O sistema agilizou muito o atendimento das mesas..." 
                className="min-h-[120px] text-sm"
                value={testimonial}
                onChange={(e) => setTestimonial(e.target.value)}
              />
              <p className="text-[9px] text-muted-foreground italic">Seu depoimento passará por moderação antes de ser publicado.</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full font-black uppercase bg-pink-600 hover:bg-pink-700 text-white" 
              onClick={handleSendTestimonial}
              disabled={isSubmittingTestimonial}
            >
              {isSubmittingTestimonial ? "Enviando..." : <><Send className="mr-2 h-4 w-4" /> Enviar para o BarMate</>}
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-lg border-t-4 border-orange-500">
          <CardHeader>
            <CardTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
              <Percent className="h-5 w-5 text-orange-500" /> Taxas de Transação
            </CardTitle>
            <CardDescription>Configure os custos da sua maquininha para relatórios precisos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase opacity-60">Débito (%)</Label>
                <Input value={debitRate} onChange={e => setDebitRate(e.target.value)} placeholder="1,99" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase opacity-60">Crédito (%)</Label>
                <Input value={creditRate} onChange={e => setCreditRate(e.target.value)} placeholder="4,99" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase opacity-60">PIX (%)</Label>
              <Input value={pixRate} onChange={e => setPixRate(e.target.value)} placeholder="0,99" />
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full font-black uppercase border-orange-500/20 text-orange-600 hover:bg-orange-50" onClick={handleSaveFees}>Atualizar Taxas</Button>
          </CardFooter>
        </Card>

        <Card className="shadow-lg border-t-4 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-xl font-black uppercase tracking-tighter">Soberania de Dados</CardTitle>
            <CardDescription>Exportação e Importação completa do sistema.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start gap-3 h-12" onClick={handleExportFullBackup}>
              <Download className="h-5 w-5 text-primary" />
              <div className="text-left">
                <p className="text-xs font-black uppercase">Exportar Backup Completo</p>
                <p className="text-[9px] opacity-60">Todos os produtos, vendas e clientes.</p>
              </div>
            </Button>
            
            <Button variant="outline" className="w-full justify-start gap-3 h-12" onClick={() => setImportAlertOpen(true)}>
              <Upload className="h-5 w-5 text-green-600" />
              <div className="text-left">
                <p className="text-xs font-black uppercase">Restaurar do Arquivo</p>
                <p className="text-[9px] opacity-60">Substitui os dados locais pelo backup.</p>
              </div>
            </Button>

            <Separator className="my-2" />

            <Button variant="ghost" className="w-full justify-start gap-3 h-12 text-destructive hover:bg-destructive/10" onClick={() => setClearFinancialsAlertOpen(true)}>
              <Trash2 className="h-5 w-5" />
              <div className="text-left">
                <p className="text-xs font-black uppercase">Limpar Financeiro</p>
                <p className="text-[9px] opacity-60">Reseta apenas vendas e histórico de caixa.</p>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>

      <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImportFullBackup} />

      <AlertDialog open={importAlertOpen} onOpenChange={setImportAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Importar Backup Completo?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação irá substituir todos os seus dados atuais.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setImportAlertOpen(false); fileInputRef.current?.click(); }} className="bg-destructive hover:bg-destructive/90">Sim, Substituir Tudo</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={clearFinancialsAlertOpen} onOpenChange={setClearFinancialsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive font-black uppercase">Atenção!</AlertDialogTitle>
            <AlertDialogDescription>Você está prestes a apagar todo o histórico de vendas, entradas e saídas. Deseja continuar?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { clearFinancialData(); setClearFinancialsAlertOpen(false); toast({ title: "Financeiro Resetado" }); }} className="bg-destructive hover:bg-destructive/90">Apagar Histórico</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
