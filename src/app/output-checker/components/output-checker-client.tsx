"use client";

import { useState, useEffect, useCallback } from 'react';
import type { FinancialEntry } from '@/types';
import { getFinancialEntries } from '@/lib/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DatePickerWithRange } from '@/components/ui/date-picker-range';
import type { DateRange } from "react-day-picker";
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/lib/constants';

// Tipo de resultado para a verificação, agora local.
type VerificationResult = {
  isDuplicate: boolean;
  summary: string;
  foundEntries: {
    id: string;
    date: string;
    description: string;
    amount: number;
  }[];
}


export default function OutputCheckerClient() {
  const [allEntries, setAllEntries] = useState<FinancialEntry[]>([]);
  const [pastedText, setPastedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  useEffect(() => {
    const entries = getFinancialEntries();
    setAllEntries(entries);
  }, []);

  const handleVerify = () => {
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

    // 1. Analisa o valor do texto colado.
    const amountRegex = /((?:[0-9]{1,3}(?:\.[0-9]{3})*|[0-9]+)(?:,[0-9]{1,2}))|([0-9]+(?:\.[0-9]{1,2})?)/;
    const match = pastedText.match(amountRegex);

    if (!match) {
        toast({ title: "Valor não encontrado", description: "Não foi possível encontrar um valor numérico no texto colado. Ex: '150,25' ou '150.25'.", variant: "destructive" });
        setIsLoading(false);
        return;
    }
    
    // Normaliza a string para ser analisada: remove pontos de milhares, troca vírgula por ponto.
    const parsedAmount = parseFloat(match[0].replace(/\./g, '').replace(',', '.'));
    
    if (isNaN(parsedAmount)) {
        toast({ title: "Valor inválido", description: "O valor numérico encontrado não é válido.", variant: "destructive" });
        setIsLoading(false);
        return;
    }

    // 2. Filtra as entradas financeiras por data e tipo
    const fromDate = new Date(dateRange.from);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
    toDate.setHours(23, 59, 59, 999);

    const relevantExpenses = allEntries.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        return entry.type === 'expense' && entryDate >= fromDate && entryDate <= toDate;
    });

    // 3. Encontra lançamentos com valor idêntico
    const foundEntries = relevantExpenses.filter(entry => Math.abs(entry.amount - parsedAmount) < 0.01);
    
    const result: VerificationResult = {
        isDuplicate: foundEntries.length > 0,
        summary: foundEntries.length > 0
            ? `Atenção: Encontrei ${foundEntries.length} despesa(s) com valor idêntico.`
            : `Nenhuma despesa com o valor ${formatCurrency(parsedAmount)} foi encontrada neste período.`,
        foundEntries: foundEntries.map(e => ({
            id: e.id,
            date: e.timestamp.toString(),
            description: e.description,
            amount: e.amount,
        }))
    };

    setVerificationResult(result);
    setIsLoading(false);
  };


  return (
    <div className="grid md:grid-cols-2 gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Conferência de Saídas</CardTitle>
          <CardDescription>
            Cole uma despesa (valor e descrição) e o sistema irá conferir se uma saída com valor idêntico já foi lançada no período selecionado.
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
            {isLoading ? 'Verificando...' : 'Verificar Despesa'}
            <Search className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>

      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Resultado da Verificação</CardTitle>
          <CardDescription>A análise da busca será exibida aqui.</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex items-center justify-center">
          {isLoading && <p>Buscando...</p>}
          {!isLoading && !verificationResult && <p className="text-muted-foreground text-center">Aguardando verificação...</p>}
          {verificationResult && (
            <div className="w-full space-y-4">
              <div className={`flex items-center gap-2 p-4 rounded-lg ${verificationResult.isDuplicate ? 'bg-yellow-100 dark:bg-yellow-900/50' : 'bg-green-100 dark:bg-green-900/50'}`}>
                {verificationResult.isDuplicate ? <AlertCircle className="h-6 w-6 text-yellow-600" /> : <CheckCircle className="h-6 w-6 text-green-600" />}
                <p className={`font-semibold ${verificationResult.isDuplicate ? 'text-yellow-800 dark:text-yellow-200' : 'text-green-800 dark:text-green-200'}`}>
                  {verificationResult.summary}
                </p>
              </div>
              
              {verificationResult.foundEntries && verificationResult.foundEntries.length > 0 && (
                <div>
                    <h3 className="font-semibold mb-2">Despesas Encontradas:</h3>
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
