
"use client";

import type { ProductCategory } from '@/types';
import { LUCIDE_ICON_MAP } from '@/lib/constants';
import { getProductCategories, saveProductCategories } from '@/lib/data-access';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Save, PlusCircle, ImagePlus, X, Package } from 'lucide-react';
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
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';

export default function SettingsClient() {
  const [isMounted, setIsMounted] = useState(false);
  const [barName, setBarName] = useState('');
  const [barCnpj, setBarCnpj] = useState('');
  const [barAddress, setBarAddress] = useState('');
  const [barLogo, setBarLogo] = useState('');
  const [barLogoScale, setBarLogoScale] = useState(1);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const logoInputRef = useRef<HTMLInputElement>(null);
  
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

  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<ProductCategory | null>(null);

  if (!isMounted) return null;

  return (
    <>
      <div className="space-y-8">
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
                            <>
                                <img src={barLogo} alt="Logo" className="h-full w-full object-cover transition-transform" style={{ transform: `scale(${barLogoScale})` }} />
                                <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 rounded-full" onClick={() => setBarLogo('')}><X className="h-3 w-3" /></Button>
                            </>
                        ) : (
                            <div className="flex flex-col items-center gap-2 text-muted-foreground"><ImagePlus className="h-8 w-8" /><span className="text-[10px] font-bold">SUBIR LOGO</span></div>
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
          <CardHeader><CardTitle>Categorias</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Ícone</TableHead><TableHead>Nome</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
              <TableBody>
                {productCategories.map((category) => {
                  const Icon = LUCIDE_ICON_MAP[category.iconName] || Package;
                  return (
                    <TableRow key={category.id}>
                      <TableCell><Icon className="h-5 w-5 text-muted-foreground" /></TableCell>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="destructive" size="sm" onClick={() => setCategoryToDelete(category)} disabled={productCategories.length <= 1}>Remover</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <Button onClick={() => setIsAddCategoryDialogOpen(true)} className="mt-4"><PlusCircle className="mr-2 h-4 w-4" /> Nova Categoria</Button>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!categoryToDelete} onOpenChange={() => setCategoryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remover Categoria?</AlertDialogTitle><AlertDialogDescription>Isso não apagará os produtos.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { saveProductCategories(productCategories.filter(c => c.id !== categoryToDelete?.id)); setCategoryToDelete(null); }} className="bg-destructive">Remover</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
