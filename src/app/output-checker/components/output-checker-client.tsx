"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { FinancialEntry } from '@/types';
import { getFinancialEntries, formatCurrency } from '@/lib/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Search, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DatePickerWithRange } from '@/components/ui/date-picker-range';
import { addDays, format } from 'date-fns';
import type { DateRange } from "react-day-picker";
import { ptBR } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Let's assume the flow is exported correctly from the AI folder
import { checkExpense, type CheckExpenseOutput } from '@/ai/flows/check-outputs-flow';


export default function OutputCheckerClient() {
  const [allEntries, setAllEntries] = useState<FinancialEntry[]>([]);
  const [pastedText, setPastedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<CheckExpenseOutput | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  
  const { toast } = useToast();

  const loadData = useCallback(() => {
    setAllEntries(getFinancialEntries());
  }, []);
  
  useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    return () => {
      window.removeEventListener('storage', loadData);
    }
  }, [loadData]);


  const handleCheckExpense = async () => {
    if (!pastedText.trim()) {
        toast({ title: "Texto vazio", description: "Por favor, cole a despesa que deseja verificar.", variant: "destructive" });
        return;
    }
    if (!dateRange?.from) {
         toast({ title: "Período inválido", description: "Por favor, selecione um período de datas para a verificação.", variant: "destructive" });
        return;
    }

    setIsLoading(true);
    setVerificationResult(null);

    try {
        const from = dateRange.from;
        const to = dateRange.to || from; // If 'to' is not set, use 'from'

        const relevantEntries = allEntries.filter(entry => {
            const entryDate = new Date(entry.timestamp);
            const fromDate = new Date(from);
            fromDate.setHours(0, 0, 0, 0);
            const toDate = new Date(to);
            toDate.setHours(23, 59, 59, 999);
            return entry.type === 'expense' && entryDate >= fromDate && entryDate <= toDate;
        });
        
        const result = await checkExpense({
            pastedText: pastedText,
            financialEntriesJson: JSON.stringify(relevantEntries),
            dateRange: {
                from: from.toISOString(),
                to: to.toISOString(),
            }
        });

        setVerificationResult(result);

    } catch (error) {
        console.error("AI check error:", error);
        toast({
            title: "Erro na Verificação",
            description: "Ocorreu um erro ao comunicar com a IA. Verifique o console para mais detalhes.",
            variant: "destructive"
        });
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleCancel = () => {
    setPastedText('');
    setVerificationResult(null);
  }

  const ResultIcon = useMemo(() => {
    if (!verificationResult) return null;
    if (verificationResult.isDuplicate) return <AlertTriangle className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4 text-green-600" />;
  }, [verificationResult]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conferência de Saídas</CardTitle>
        <CardDescription>
          Cole uma despesa (ex: "150,25 mercado"), selecione o período, e a IA verificará se um lançamento similar já existe para evitar duplicidade.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-2">
                <Label htmlFor="output-paste">Despesa a ser verificada</Label>
                <Textarea
                id="output-paste"
                placeholder="Cole o valor e a descrição da despesa aqui..."
                className="min-h-24"
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                disabled={isLoading}
                />
            </div>
             <div className="space-y-2">
                <Label>Período de Verificação</Label>
                <DatePickerWithRange 
                    date={dateRange} 
                    onDateChange={setDateRange} 
                    className="w-full"
                    disabled={(date) => date > new Date() || date < new Date("2000-01-01")}
                />
             </div>
        </div>

        {verificationResult && (
            <div>
                <h3 className="font-semibold mb-2">Resultado da Análise</h3>
                 <Alert variant={verificationResult.isDuplicate ? "destructive" : "default"}>
                    {ResultIcon}
                    <AlertTitle className="font-bold">{verificationResult.summary}</AlertTitle>
                    {verificationResult.isDuplicate && (
                        <AlertDescription className="mt-2">
                            <p className="mb-2">A(s) seguinte(s) despesa(s) já lançada(s) no período selecionado parece(m) ser a mesma. Analise visualmente antes de fazer um novo lançamento:</p>
                             <div className="border rounded-md overflow-hidden bg-background mt-4">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Data</TableHead>
                                            <TableHead>Descrição</TableHead>
                                            <TableHead className="text-right">Valor</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {verificationResult.foundEntries.map(entry => (
                                            <TableRow key={entry.id}>
                                                <TableCell>{format(new Date(entry.date), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                                                <TableCell>{entry.description}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(entry.amount)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                             </div>
                        </AlertDescription>
                    )}
                 </Alert>
            </div>
        )}

      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        {verificationResult ? (
          <Button variant="outline" onClick={handleCancel}>Fazer Nova Verificação</Button>
        ) : (
            <Button onClick={handleCheckExpense} disabled={isLoading}>
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verificando...
                    </>
                ) : (
                    <>
                        <Search className="mr-2 h-4 w-4" />
                        Verificar Despesa
                    </>
                )}
            </Button>
        )}
      </CardFooter>
    </Card>
  );
}
