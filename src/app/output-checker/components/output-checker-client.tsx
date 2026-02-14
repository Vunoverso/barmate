"use client";

import { useState, useEffect, useCallback } from 'react';
import type { ActiveOrder, OrderItem } from '@/types';
import { getOpenOrders } from '@/lib/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, Bot } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { checkOutputs, type CheckOutputsOutput } from '@/ai/flows/check-outputs-flow';
import { Separator } from '@/components/ui/separator';

export default function OutputCheckerClient() {
  const [openOrders, setOpenOrders] = useState<ActiveOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [pastedText, setPastedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<CheckOutputsOutput | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const orders = getOpenOrders();
    setOpenOrders(orders);
    // Auto-select the first order if available
    if (orders.length > 0) {
      setSelectedOrderId(orders[0].id);
    }
  }, []);

  const handleVerify = async () => {
    if (!selectedOrderId) {
      toast({ title: "Selecione uma comanda", description: "Você precisa selecionar uma comanda para conferir.", variant: "destructive" });
      return;
    }
    if (!pastedText.trim()) {
      toast({ title: "Cole a lista de saída", description: "A área de texto não pode estar vazia.", variant: "destructive" });
      return;
    }

    const selectedOrder = openOrders.find(o => o.id === selectedOrderId);
    if (!selectedOrder) {
      toast({ title: "Comanda não encontrada", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setVerificationResult(null);

    try {
      const result = await checkOutputs({
        pastedText: pastedText,
        orderItemsJson: JSON.stringify(selectedOrder.items, null, 2),
        orderName: selectedOrder.name
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
            Selecione uma comanda, cole a lista de itens separados por linha e a IA irá conferir se bate com o pedido.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="order-select">Comanda para Verificar</Label>
            <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
              <SelectTrigger id="order-select">
                <SelectValue placeholder="Selecione uma comanda..." />
              </SelectTrigger>
              <SelectContent>
                {openOrders.length > 0 ? (
                  openOrders.map(order => (
                    <SelectItem key={order.id} value={order.id}>
                      {order.name} ({order.items.length} itens)
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">Nenhuma comanda aberta.</div>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="output-paste">Cole a lista de itens aqui</Label>
            <Textarea
              id="output-paste"
              placeholder="Ex:&#10;2x Cerveja Pilsen&#10;1x Batata Frita"
              className="min-h-48"
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleVerify} disabled={isLoading || !selectedOrderId}>
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
              <div className={`flex items-center gap-2 p-4 rounded-lg ${verificationResult.isCorrect ? 'bg-green-100 dark:bg-green-900/50' : 'bg-red-100 dark:bg-red-900/50'}`}>
                {verificationResult.isCorrect ? <CheckCircle className="h-6 w-6 text-green-600" /> : <AlertCircle className="h-6 w-6 text-red-600" />}
                <p className={`font-semibold ${verificationResult.isCorrect ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                  {verificationResult.summary}
                </p>
              </div>
              
              {verificationResult.discrepancies && verificationResult.discrepancies.length > 0 && (
                <div>
                    <h3 className="font-semibold mb-2">Detalhes das Divergências:</h3>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                        {verificationResult.discrepancies.map((item, index) => (
                          <li key={index}>{item}</li>
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
