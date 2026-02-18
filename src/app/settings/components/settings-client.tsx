
"use client";

import type { ProductCategory, TransactionFees } from '@/types';
import { DATA_KEYS, LUCIDE_ICON_MAP } from '@/lib/constants';
import { getProductCategories, saveProductCategories, getTransactionFees, saveTransactionFees, clearFinancialData } from '@/lib/data-access';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Save, Edit3, Trash2, PlusCircle, Download, Upload, AlertTriangle, ImagePlus, X } from 'lucide-react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Slider } from '@/components/ui/slider';

interface EditCategoryDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  category: ProductCategory | null;
  onSave: (updatedCategory: ProductCategory) => void;
}

function EditCategoryDialog({ isOpen, onOpenChange, category, onSave }: EditCategoryDialogProps) {
  const [name, setName] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (category) {
      setName(category.name);
    }
  }, [category]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Erro", description: "O nome da categoria não pode ser vazio.", variant: "destructive" });
      return;
    }
    if (category) {
      onSave({ ...category, name: name.trim() });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar Nome da Categoria</DialogTitle>
            <DialogDescription>Altere o nome de exibição da categoria "{category?.name}". O ID interno não será alterado.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="categoryName">Novo Nome da Categoria</Label>
            <Input
              id="categoryName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Digite o novo nome"
              autoFocus
            />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
            <Button type="submit">Salvar Alterações</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddCategoryDialog({ isOpen, onOpenChange, onSave }: { isOpen: boolean; onOpenChange: (isOpen: boolean) => void; onSave: (data: { name: string; iconName: string }) => void; }) {
  const [name, setName] = useState('');
  const [iconName, setIconName] = useState('');
  const { toast } = useToast();
  const availableIcons = Object.keys(LUCIDE_ICON_MAP);

  useEffect(() => {
    if (isOpen) {
        setName('');
        setIconName('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Erro", description: "O nome da categoria não pode ser vazio.", variant: "destructive" });
      return;
    }
    if (!iconName) {
        toast({ title: "Erro", description: "Selecione um ícone para a categoria.", variant: "destructive" });
        return;
    }
    onSave({ name: name.trim(), iconName });
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Adicionar Nova Categoria</DialogTitle>
            <DialogDescription>Crie uma nova categoria para organizar seus produtos.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newCategoryName">Nome da Categoria</Label>
              <Input
                id="newCategoryName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Porções"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newCategoryIcon">Ícone</Label>
              <Select onValueChange={setIconName} value={iconName}>
                  <SelectTrigger id="newCategoryIcon">
                      <SelectValue placeholder="Selecione um ícone" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableIcons.map(iconKey => {
                        const IconComponent = LUCIDE_ICON_MAP[iconKey];
                        return (
                          <SelectItem key={iconKey} value={iconKey}>
                              <div className="flex items-center gap-2">
                                  {IconComponent && <IconComponent className="h-4 w-4 text-muted-foreground" />}
                                  {iconKey}
                              </div>
                          </SelectItem>
                        )
                    })}
                  </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
            <Button type="submit">Salvar Categoria</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function SettingsClient() {
  const [isMounted, setIsMounted] = useState(false);
  const [barName, setBarName] = useState('');
  const [barCnpj, setBarCnpj] = useState('');
  const [barAddress, setBarAddress] = useState('');
  const [barLogo, setBarLogo] = useState('');
  const [barLogoScale, setBarLogoScale] = useState(1);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [transactionFees, setTransactionFees] = useState<TransactionFees>({ debitRate: 0, creditRate: 0, pixRate: 0 });
  const [isImporting, setIsImporting] = useState(false);
  const [importAlertOpen, setImportAlertOpen] = useState(false);
  const [clearFinancialsAlertOpen, setClearFinancialsAlertOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();

  const loadData = useCallback(() => {
    setBarName(localStorage.getItem('barName') || 'BarMate');
    setBarCnpj(localStorage.getItem('barCnpj') || '');
    setBarAddress(localStorage.getItem('barAddress') || '');
    setBarLogo(localStorage.getItem('barLogo') || '');
    setBarLogoScale(parseFloat(localStorage.getItem('barLogoScale') || '1'));
    setTransactionFees(getTransactionFees());
    setProductCategories(getProductCategories());
  }, []);

  useEffect(() => {
    loadData();
    setIsMounted(true);
    window.addEventListener('storage', loadData);
    return () => {
      window.removeEventListener('storage', loadData);
    }
  }, [loadData]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 1024 * 1024) {
            toast({ title: "Arquivo muito grande", description: "O logotipo deve ter menos de 1MB.", variant: "destructive" });
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setBarLogo(reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };

  const handleSaveCompanyDetails = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (barName.trim() === '') {
      toast({
        title: "Erro",
        description: "O nome do estabelecimento não pode estar vazio.",
        variant: "destructive",
      });
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
        } catch (err) {
            console.error("Erro ao sincronizar marca com a nuvem:", err);
        }
    }

    window.dispatchEvent(new Event('storage'));
    toast({
      title: "Sucesso!",
      description: "Dados do estabelecimento e marca atualizados.",
      action: <Save className="text-green-500" />,
    });
  };

  const handleSaveTransactionFees = (e?: React.FormEvent) => {
    e?.preventDefault();
    saveTransactionFees(transactionFees);
    toast({
        title: "Taxas Salvas!",
        description: "As taxas de transação foram atualizadas.",
        action: <Save className="text-green-500" />,
    });
  };

  const [isEditCategoryDialogOpen, setIsEditCategoryDialogOpen] = useState(false);
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<ProductCategory | null>(null);

  const handleOpenEditCategoryDialog = (category: ProductCategory) => {
    setEditingCategory(category);
    setIsEditCategoryDialogOpen(true);
  };

  const handleSaveCategory = (updatedCategory: ProductCategory) => {
    const updatedCategories = productCategories.map(cat =>
      cat.id === updatedCategory.id ? updatedCategory : cat
    );
    saveProductCategories(updatedCategories);
    toast({ title: "Categoria Atualizada", description: `Categoria "${updatedCategory.name}" salva com sucesso.`});
  };

  const handleAddNewCategory = (data: { name: string; iconName: string }) => {
    const newId = `cat_${data.name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20)}_${Date.now()}`;
    const newCategory: ProductCategory = {
        id: newId,
        name: data.name,
        iconName: data.iconName,
    };
    const updatedCategories = [...productCategories, newCategory];
    saveProductCategories(updatedCategories);
    toast({ title: "Categoria Adicionada", description: `A categoria "${data.name}" foi criada com sucesso.`});
  };

  const confirmDeleteCategory = (category: ProductCategory) => {
    setCategoryToDelete(category);
  };

  const handleDeleteCategory = () => {
    if (!categoryToDelete) return;

    const updatedCategories = productCategories.filter(cat => cat.id !== categoryToDelete.id);
    saveProductCategories(updatedCategories);
    toast({ title: "Categoria Removida", description: `Categoria "${categoryToDelete.name}" removida com sucesso.`, variant: "default" });
    setCategoryToDelete(null);
  };

  const handleExportData = () => {
    toast({ title: "Exportando dados...", description: "Aguarde enquanto preparamos seu backup." });
    try {
        const backupData: { [key: string]: any } = {};
        DATA_KEYS.forEach(key => {
            const data = localStorage.getItem(key);
            if (data !== null) {
                try {
                  if (['barName', 'barCnpj', 'barAddress', 'barLogo', 'barLogoScale'].includes(key)) {
                    backupData[key] = data;
                  } else {
                    backupData[key] = JSON.parse(data);
                  }
                } catch(e) {
                   console.warn(`Could not parse localStorage item ${key}, skipping.`, e);
                }
            }
        });

        const jsonString = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `barmate_backup_${format(new Date(), 'yyyy-MM-dd')}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast({ title: "Backup Concluído!", description: "Seu arquivo de backup foi baixado." });
    } catch (error) {
        console.error("Export error:", error);
        toast({ title: "Erro na Exportação", description: "Não foi possível gerar o arquivo de backup.", variant: "destructive" });
    }
  };

  const handleTriggerImport = () => {
    setImportAlertOpen(true);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    toast({ title: "Importando dados...", description: "Isso pode levar alguns instantes." });

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const text = e.target?.result as string;
            const data = JSON.parse(text);

            if (typeof data !== 'object' || data === null) {
              throw new Error("Arquivo de backup inválido.");
            }
            
            Object.keys(data).forEach(key => {
                if (DATA_KEYS.includes(key)) {
                    if (['barName', 'barCnpj', 'barAddress', 'barLogo', 'barLogoScale'].includes(key)) {
                      localStorage.setItem(key, data[key]);
                    } else {
                      localStorage.setItem(key, JSON.stringify(data[key]));
                    }
                }
            });
            
            toast({ title: "Importação Concluída!", description: "Todos os dados foram restaurados. A página será recarregada." });
            setTimeout(() => window.location.reload(), 2000);
        } catch (innerError) {
            console.error("Import processing error:", innerError);
            toast({ title: "Erro ao Processar Arquivo", description: "O arquivo JSON é inválido ou está corrompido.", variant: "destructive" });
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) {
               fileInputRef.current.value = "";
            }
        }
    };
    reader.readAsText(file);
  };
  
  const handleClearFinancialHistory = () => {
    clearFinancialData();
    setClearFinancialsAlertOpen(false);
    toast({ title: "Histórico Financeiro Zerado" });
  };

  if (!isMounted) return null;

  return (
    <>
      <div className="space-y-8">
        <Card>
          <form onSubmit={handleSaveCompanyDetails}>
            <CardHeader>
              <CardTitle>Identidade do Estabelecimento</CardTitle>
              <CardDescription>Defina sua marca e os dados que aparecerão nos recibos e no celular dos clientes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Logotipo do Bar</Label>
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                    <div className="relative h-32 w-32 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/30">
                        {barLogo ? (
                            <>
                                <img 
                                    src={barLogo} 
                                    alt="Logo" 
                                    className="h-full w-full object-contain transition-transform duration-200" 
                                    style={{ transform: `scale(${barLogoScale})` }}
                                />
                                <Button 
                                    type="button" 
                                    variant="destructive" 
                                    size="icon" 
                                    className="absolute top-1 right-1 h-6 w-6 rounded-full"
                                    onClick={() => setBarLogo('')}
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            </>
                        ) : (
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                <ImagePlus className="h-8 w-8" />
                                <span className="text-[10px] uppercase font-bold text-center px-2">Subir Logo</span>
                            </div>
                        )}
                    </div>
                    <div className="flex-1 space-y-4 w-full">
                        <div className="space-y-2">
                            <input
                                type="file"
                                ref={logoInputRef}
                                onChange={handleLogoUpload}
                                accept="image/*"
                                className="hidden"
                            />
                            <Button type="button" variant="outline" onClick={() => logoInputRef.current?.click()}>
                                Escolher Imagem
                            </Button>
                            <p className="text-xs text-muted-foreground">PNG ou JPG até 1MB.</p>
                        </div>
                        
                        {barLogo && (
                            <div className="space-y-3 pt-2">
                                <div className="flex justify-between items-center">
                                    <Label className="text-xs font-bold uppercase opacity-70">Ajustar Tamanho</Label>
                                    <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">{Math.round(barLogoScale * 100)}%</span>
                                </div>
                                <Slider 
                                    value={[barLogoScale]} 
                                    min={0.5} 
                                    max={2.5} 
                                    step={0.05} 
                                    onValueChange={([val]) => setBarLogoScale(val)}
                                    className="w-full max-w-xs"
                                />
                            </div>
                        )}
                    </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="barName">Nome do Estabelecimento</Label>
                  <Input id="barName" value={barName} onChange={(e) => setBarName(e.target.value)} placeholder="Nome do bar" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="barCnpj">CNPJ</Label>
                  <Input id="barCnpj" value={barCnpj} onChange={(e) => setBarCnpj(e.target.value)} placeholder="00.000.000/0001-00" />
                </div>
              </div>
              <div className="space-y-2">
                  <Label htmlFor="barAddress">Endereço</Label>
                  <Textarea id="barAddress" value={barAddress} onChange={(e) => setBarAddress(e.target.value)} placeholder="Endereço completo" />
              </div>
              <Button type="submit"><Save className="mr-2 h-4 w-4" /> Salvar Identidade</Button>
            </CardContent>
          </form>
        </Card>

        <Card>
          <form onSubmit={handleSaveTransactionFees}>
            <CardHeader>
                <CardTitle>Taxas de Transação</CardTitle>
                <CardDescription>Percentuais descontados em vendas por cartão/PIX.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="debitRate">Taxa de Débito (%)</Label>
                        <Input id="debitRate" type="number" step="0.01" value={transactionFees.debitRate} onChange={(e) => setTransactionFees(prev => ({ ...prev, debitRate: parseFloat(e.target.value) || 0 }))} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="creditRate">Taxa de Crédito (%)</Label>
                        <Input id="creditRate" type="number" step="0.01" value={transactionFees.creditRate} onChange={(e) => setTransactionFees(prev => ({ ...prev, creditRate: parseFloat(e.target.value) || 0 }))} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="pixRate">Taxa de PIX (%)</Label>
                        <Input id="pixRate" type="number" step="0.01" value={transactionFees.pixRate} onChange={(e) => setTransactionFees(prev => ({ ...prev, pixRate: parseFloat(e.target.value) || 0 }))} />
                    </div>
                </div>
                <Button type="submit"><Save className="mr-2 h-4 w-4" /> Salvar Taxas</Button>
            </CardContent>
          </form>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Categorias de Produtos</CardTitle>
                  <CardDescription>Gerencie a organização do seu catálogo.</CardDescription>
                </div>
                <Button onClick={() => setIsAddCategoryDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Nova Categoria</Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Ícone</TableHead><TableHead>Nome</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
              <TableBody>
                {productCategories.map((category) => {
                  const IconComponent = LUCIDE_ICON_MAP[category.iconName] || Package;
                  return (
                    <TableRow key={category.id}>
                      <TableCell><IconComponent className="h-5 w-5 text-muted-foreground" /></TableCell>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleOpenEditCategoryDialog(category)}>Renomear</Button>
                        <Button variant="destructive" size="sm" onClick={() => confirmDeleteCategory(category)} disabled={productCategories.length <= 1}>Remover</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-destructive">
            <CardHeader><CardTitle className="text-destructive">Zona de Perigo</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-4">
                <Button variant="destructive" onClick={() => setClearFinancialsAlertOpen(true)}><Trash2 className="mr-2 h-4 w-4" /> Zerar Financeiro</Button>
                <Button variant="outline" onClick={handleExportData}><Download className="mr-2 h-4 w-4" /> Exportar Backup</Button>
                <Button variant="outline" onClick={handleTriggerImport}><Upload className="mr-2 h-4 w-4" /> Importar Backup</Button>
            </CardContent>
        </Card>
      </div>

      {editingCategory && <EditCategoryDialog isOpen={isEditCategoryDialogOpen} onOpenChange={setIsEditCategoryDialogOpen} category={editingCategory} onSave={handleSaveCategory} />}
      <AddCategoryDialog isOpen={isAddCategoryDialogOpen} onOpenChange={setIsAddCategoryDialogOpen} onSave={handleAddNewCategory} />
      
      <AlertDialog open={importAlertOpen} onOpenChange={setImportAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Importar Backup?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação substituirá todos os dados atuais. Recomendamos exportar um backup antes.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setImportAlertOpen(false); fileInputRef.current?.click(); }} className="bg-destructive">Substituir Dados</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={clearFinancialsAlertOpen} onOpenChange={setClearFinancialsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zerar Histórico Financeiro?</AlertDialogTitle>
            <AlertDialogDescription>Vendas e registros de caixa serão apagados permanentemente. Produtos e clientes não serão afetados.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearFinancialHistory} className="bg-destructive">Zerar Agora</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {categoryToDelete && (
        <AlertDialog open={!!categoryToDelete} onOpenChange={() => setCategoryToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover Categoria?</AlertDialogTitle>
              <AlertDialogDescription>Deseja remover "{categoryToDelete.name}"? Produtos vinculados precisarão ser reatribuídos.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteCategory} className="bg-destructive">Remover</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
