
"use client";

import { clearFinancialData, getTransactionFees, saveTransactionFees, getCompanyDetails, saveCompanyDetails, getOpenOrders, getProducts, getProductCategories, getClients, getSales, getFinancialEntries, getCashRegisterStatus, getClosedSessions, getMenuBranding, saveMenuBranding } from '@/lib/data-access';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Save, ImagePlus, X, Download, Upload, Trash2, Percent, ListChecks } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
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
import CategoryManagement from './category-management';

export default function SettingsClient() {
  const [isMounted, setIsMounted] = useState(false);
  const [barName, setBarName] = useState('');
  const [barCnpj, setBarCnpj] = useState('');
  const [barAddress, setBarAddress] = useState('');
  const [barLogo, setBarLogo] = useState('');
  const [barLogoScale, setBarLogoScale] = useState(1);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [operationMode, setOperationMode] = useState<'counter_only' | 'table_only' | 'table_delivery'>('table_only');
  const [customerFacingMessage, setCustomerFacingMessage] = useState('');
  const [enableServiceBell, setEnableServiceBell] = useState(true);
  const [beverageChecklistText, setBeverageChecklistText] = useState('');

  // Fee states
  const [debitRate, setDebitRate] = useState('0');
  const [creditRate, setCreditRate] = useState('0');
  const [pixRate, setPixRate] = useState('0');

  const [importAlertOpen, setImportAlertOpen] = useState(false);
  const [clearFinancialsAlertOpen, setClearFinancialsAlertOpen] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ordersFileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const loadData = useCallback(() => {
    const companyDetails = getCompanyDetails();
    setBarName(companyDetails.barName);
    setBarCnpj(companyDetails.barCnpj);
    setBarAddress(companyDetails.barAddress);
    setBarLogo(companyDetails.barLogo);
    setBarLogoScale(companyDetails.barLogoScale);

    const branding = getMenuBranding();
    setWhatsappNumber((branding.whatsappNumber ?? '').trim());
    setOperationMode(branding.operationMode ?? 'table_only');
    setCustomerFacingMessage((branding.customerFacingMessage ?? '').trim());
    setEnableServiceBell(branding.enableServiceBell ?? true);
    setBeverageChecklistText(Array.isArray(branding.beverageChecklist) ? branding.beverageChecklist.join('\n') : '');

    const fees = getTransactionFees();
    setDebitRate(fees.debitRate.toString().replace('.', ','));
    setCreditRate(fees.creditRate.toString().replace('.', ','));
    setPixRate(fees.pixRate.toString().replace('.', ','));
  }, []);

  useEffect(() => {
    loadData();
    setIsMounted(true);
    window.addEventListener('barmate-app-state-changed', loadData);
    return () => window.removeEventListener('barmate-app-state-changed', loadData);
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
    await saveCompanyDetails({
      barName: barName.trim(),
      barCnpj: barCnpj.trim(),
      barAddress: barAddress.trim(),
      barLogo,
      barLogoScale,
    });
    const currentBranding = getMenuBranding();
    const beverageChecklist = beverageChecklistText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    await saveMenuBranding({
      ...currentBranding,
      whatsappNumber: whatsappNumber.trim() || null,
      operationMode,
      customerFacingMessage: customerFacingMessage.trim() || null,
      enableServiceBell,
      beverageChecklist,
    });
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
      const allData: Record<string, any> = {
        company: getCompanyDetails(),
        productCategories: getProductCategories(),
        products: getProducts(),
        sales: getSales(),
        openOrders: getOpenOrders(),
        clients: getClients(),
        financialEntries: getFinancialEntries(),
        cashRegisterStatus: getCashRegisterStatus(),
        closedSessions: getClosedSessions(),
      };

      const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `barmate_backup_completo_${format(new Date(), 'yyyy-MM-dd')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "Backup Exportado!", description: "O arquivo completo foi baixado com sucesso." });
    } catch (e) {
      toast({ title: "Erro ao exportar", variant: "destructive" });
    }
  };

  const handleExportOrdersOnly = () => {
    try {
      const blob = new Blob([JSON.stringify(getOpenOrders(), null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `barmate_apenas_comandas_${format(new Date(), 'yyyy-MM-dd')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "Comandas Exportadas!", description: "As mesas ativas foram salvas." });
    } catch (e) {
      toast({ title: "Erro ao exportar comandas", variant: "destructive" });
    }
  };

  const handleOrdersFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (!Array.isArray(data)) throw new Error("Arquivo inválido");

        await saveCompanyDetails(getCompanyDetails());
        void data;

        toast({ title: "Comandas Restauradas!", description: "As mesas foram recuperadas com sucesso." });
        setTimeout(() => window.location.reload(), 1000);
      } catch (err) {
        toast({ title: "Erro na Importação", description: "O arquivo selecionado não é um backup de comandas válido.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.company) void saveCompanyDetails(data.company);
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
            <div className="space-y-2">
              <Label>WhatsApp para Pedidos</Label>
              <Input
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="Ex: 5511999998888"
              />
              <p className="text-xs text-muted-foreground">Use somente números, incluindo DDI e DDD. Exemplo: 55 + 11 + número.</p>
            </div>
            <div className="space-y-2">
              <Label>Modo Operacional do Cardápio</Label>
              <select
                value={operationMode}
                onChange={(e) => setOperationMode(e.target.value as 'counter_only' | 'table_only' | 'table_delivery')}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="counter_only">Somente Balcão</option>
                <option value="table_only">Somente Mesa</option>
                <option value="table_delivery">Mesa + Delivery</option>
              </select>
              <p className="text-xs text-muted-foreground">Adapta textos e comportamento do menu para o tipo de operação do restaurante.</p>
            </div>
            <div className="space-y-2">
              <Label>Mensagem do Cliente no Cardápio</Label>
              <Textarea
                value={customerFacingMessage}
                onChange={(e) => setCustomerFacingMessage(e.target.value)}
                placeholder="Ex: Faça seu pedido que será entregue na mesa."
              />
            </div>
            <div className="space-y-2">
              <Label>Checklist de Bebidas (uma opção por linha)</Label>
              <Textarea
                value={beverageChecklistText}
                onChange={(e) => setBeverageChecklistText(e.target.value)}
                placeholder={'Copo\nCanudo\nGelo\nLimão\nLaranja'}
              />
              <p className="text-xs text-muted-foreground">Esses itens aparecem no personalizador de bebidas para o cliente marcar quantidade ou todos.</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="enableServiceBell"
                type="checkbox"
                checked={enableServiceBell}
                onChange={(e) => setEnableServiceBell(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="enableServiceBell">Habilitar botão de chamar atendente (sininho)</Label>
            </div>
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

      <CategoryManagement />

      <Card>
        <CardHeader><CardTitle>Gestão de Comandas (Segurança Extra)</CardTitle><CardDescription>Exportar ou restaurar apenas as mesas abertas no momento.</CardDescription></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button variant="outline" onClick={handleExportOrdersOnly} className="flex flex-col h-auto py-4 gap-2 border-primary/20 hover:bg-primary/5">
            <Download className="h-6 w-6 text-primary" /><div className="text-center"><p className="font-bold">Exportar Comandas</p><p className="text-[10px] opacity-60">Salvar apenas as mesas ativas</p></div>
          </Button>
          <Button variant="outline" onClick={() => ordersFileInputRef.current?.click()} className="flex flex-col h-auto py-4 gap-2 border-primary/20 hover:bg-primary/5">
            <Upload className="h-6 w-6 text-primary" /><div className="text-center"><p className="font-bold">Importar Comandas</p><p className="text-[10px] opacity-60">Restaurar mesas de um arquivo</p></div>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Gestão de Dados (Backup Geral)</CardTitle><CardDescription>Backup completo do seu sistema (Produtos, Clientes e Configurações).</CardDescription></CardHeader>
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
      <input type="file" ref={ordersFileInputRef} onChange={handleOrdersFileChange} accept=".json" className="hidden" />

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
