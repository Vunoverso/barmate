"use client";

import { useState, useEffect, useCallback } from 'react';
import type { FinancialEntry } from '@/types';
import { getFinancialEntries } from '@/lib/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, Bot } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { checkExpense, type CheckExpenseOutput } from '@/ai/flows/check-outputs-flow';
import { DatePickerWithRange } from '@/components/ui/date-picker-range';
import type { DateRange } from "react-day-picker";
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/lib/constants';

export default function OutputCheckerClient() {
  const [allEntries, setAllEntries] = useState<FinancialEntry[]>([]);
  const [pastedText, setPastedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<CheckExpenseOutput | null>(null);
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  useEffect(() => {
    const entries = getFinancialEntries();
    setAllEntries(entries);
  }, []);

  const handleVerify = async () => {
    if (!pastedText.trim()) {
      toast({ title: "Cole a despesa", description: "A área de texto não pode estar vazia.", variant: "destructive" });
      return;
    }
    if (!dateRange || !dateRange.from) {
        toast({ title: "Selecione um período", description: "Você precisa definir um período para a busca.", variant: "destructive" });
        return;
    }

    setIsLoading(true);
    setVerificationResult(null);

    // Filter entries by date range and type 'expense'
    const fromDate = new Date(dateRange.from);
    fromDate.setHours(0,0,0,0);
    const toDate = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
    toDate.setHours(23, 59, 59, 999);

    const relevantExpenses = allEntries.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        return entry.type === 'expense' && entryDate >= fromDate && entryDate <= toDate;
    });

    try {
      const result = await checkExpense({
        pastedText: pastedText,
        financialEntriesJson: JSON.stringify(relevantExpenses.map(e => ({ id: e.id, date: e.timestamp, description: e.description, amount: e.amount })), null, 2),
        dateRange: {
            from: fromDate.toISOString(),
            to: toDate.toISOString()
        }
      });
      setVerificationResult(result);
    } catch (error) {
      console.error("AI verification failed:", error);
      toast({ title: "Erro na Verificação", description: "A IA não conseguiu processar a solicitação. Tente novamente.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Conferência de Saídas</CardTitle>
          <CardDescription>
            Cole uma despesa (valor e descrição) e a IA irá conferir se uma saída similar já foi lançada no período selecionado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Período para Verificar</Label>
            <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="output-paste">Cole a despesa aqui</Label>
            <Textarea
              id="output-paste"
              placeholder="Ex:&#10;135,90 mercado&#10;conta de luz 250,00"
              className="min-h-40"
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleVerify} disabled={isLoading}>
            {isLoading ? 'Verificando...' : 'Verificar com IA'}
            <Bot className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>

      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Resultado da Verificação</CardTitle>
          <CardDescription>A análise da IA será exibida aqui.</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex items-center justify-center">
          {isLoading && <p>Analisando...</p>}
          {!isLoading && !verificationResult && <p className="text-muted-foreground text-center">Aguardando verificação...</p>}
          {verificationResult && (
            <div className="w-full space-y-4">
              <div className={`flex items-center gap-2 p-4 rounded-lg ${verificationResult.isDuplicate ? 'bg-red-100 dark:bg-red-900/50' : 'bg-green-100 dark:bg-green-900/50'}`}>
                {verificationResult.isDuplicate ? <AlertCircle className="h-6 w-6 text-red-600" /> : <CheckCircle className="h-6 w-6 text-green-600" />}
                <p className={`font-semibold ${verificationResult.isDuplicate ? 'text-red-800 dark:text-red-200' : 'text-green-800 dark:text-green-200'}`}>
                  {verificationResult.summary}
                </p>
              </div>
              
              {verificationResult.foundEntries && verificationResult.foundEntries.length > 0 && (
                <div>
                    <h3 className="font-semibold mb-2">Despesas Similares Encontradas:</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                        {verificationResult.foundEntries.map((entry) => (
                          <li key={entry.id} className="p-2 border rounded-md">
                            <p><strong>Descrição:</strong> {entry.description}</p>
                            <p><strong>Valor:</strong> {formatCurrency(entry.amount)}</p>
                            <p><strong>Data:</strong> {format(new Date(entry.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                          </li>
                        ))}
                    </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
