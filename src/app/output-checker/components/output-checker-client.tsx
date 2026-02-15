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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';

type ParsedExpense = {
  id: string;
  text: string;
  amount: number;
  description: string;
  duplicates: FinancialEntry[];
};

const parseExpenses = (text: string): Omit<ParsedExpense, 'id' | 'duplicates'>[] => {
  const lines = text.split('\n').filter(line => line.trim() !== '');
  return lines.map(line => {
    // Regex to find a number (with comma or dot decimal separator)
    const match = line.match(/(\d[\d.,]*)/);
    const amount = match ? parseFloat(match[0].replace(/\./g, '').replace(',', '.')) : 0;
    
    // Create description by removing the matched number and extra spaces
    const description = line.replace(match ? match[0] : '', '').replace(/\s\s+/g, ' ').trim();
    return { text: line, amount, description: description || 'Despesa sem descrição' };
  });
};

export default function OutputCheckerClient() {
  const [allEntries, setAllEntries] = useState<FinancialEntry[]>([]);
  const [pastedText, setPastedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<ParsedExpense[] | null>(null);
  const [viewingDuplicates, setViewingDuplicates] = useState<FinancialEntry[] | null>(null);
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


  const handleCheckExpense = () => {
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

    const from = dateRange.from;
    const to = dateRange.to || from;

    const relevantEntries = allEntries.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        const fromDate = new Date(from);
        fromDate.setHours(0, 0, 0, 0);
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        return entry.type === 'expense' && entryDate >= fromDate && entryDate <= toDate;
    });

    const parsed = parseExpenses(pastedText);

    const results = parsed.map((p, index) => {
        const duplicates = relevantEntries.filter(re => {
            // Check for same amount
            if (p.amount > 0 && Math.abs(re.amount - p.amount) < 0.01) {
                return true;
            }
            // Check for similar description (if a significant word from parsed is in the entry description)
            const parsedWords = p.description.toLowerCase().split(' ').filter(w => w.length > 3);
            if (p.description && parsedWords.length > 0 && parsedWords.some(pw => re.description.toLowerCase().includes(pw))) {
                return true;
            }
            return false;
        });

        return {
            ...p,
            id: `res-${Date.now()}-${index}`,
            duplicates,
        };
    });

    setVerificationResult(results);
    setIsLoading(false);
  };
  
  const handleCancel = () => {
    setPastedText('');
    setVerificationResult(null);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Conferência de Saídas</CardTitle>
          <CardDescription>
            Cole uma despesa ou lista de despesas, selecione o período, e o sistema verificará se lançamentos parecidos já existem.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="output-paste">Despesa(s) a ser(em) verificada(s)</Label>
                  <Textarea
                  id="output-paste"
                  placeholder="Ex: 150,25 mercado&#10;conta de luz 280,40"
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
                  {verificationResult.length === 0 ? (
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertTitle>Nenhuma despesa para analisar</AlertTitle>
                        <AlertDescription>O texto colado não continha despesas válidas.</AlertDescription>
                      </Alert>
                  ) : (
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Despesa Colada</TableHead>
                            <TableHead>Valor Extraído</TableHead>
                            <TableHead>Descrição Extraída</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {verificationResult.map(res => (
                            <TableRow key={res.id}>
                              <TableCell className="text-muted-foreground text-xs">{res.text}</TableCell>
                              <TableCell>{formatCurrency(res.amount)}</TableCell>
                              <TableCell>{res.description}</TableCell>
                              <TableCell className="text-center">
                                {res.duplicates.length > 0 ? (
                                  <Button variant="destructive" size="sm" onClick={() => setViewingDuplicates(res.duplicates)}>
                                    <AlertTriangle className="mr-2 h-4 w-4" />
                                    {res.duplicates.length} {res.duplicates.length === 1 ? 'Suspeita' : 'Suspeitas'}
                                  </Button>
                                ) : (
                                  <div className="flex items-center justify-center text-green-600">
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    <span>OK</span>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
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
                          Verificar Despesa(s)
                      </>
                  )}
              </Button>
          )}
        </CardFooter>
      </Card>
      
      {viewingDuplicates && (
        <Dialog open={!!viewingDuplicates} onOpenChange={() => setViewingDuplicates(null)}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Possíveis Despesas Duplicadas</DialogTitle>
                    <DialogDescription>
                        Encontramos as seguintes despesas já lançadas no período que podem ser a mesma. Compare visualmente.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
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
                                {viewingDuplicates.map(entry => (
                                    <TableRow key={entry.id}>
                                        <TableCell>{format(new Date(entry.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                                        <TableCell>{entry.description}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(entry.amount)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                     </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button>Fechar</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}
    </>
  );
}
