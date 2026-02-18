
"use client";

import { useState, useEffect, useMemo } from 'react';
import type { ActiveOrder } from '@/types';
import { getArchivedOrders } from '@/lib/data-access';
import { formatCurrency } from '@/lib/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileX, ShoppingCart, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export default function MyOrderClient({ orderId }: { orderId: string }) {
    const [order, setOrder] = useState<ActiveOrder | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!orderId || !db) {
            setIsLoading(false);
            setOrder(null);
            return;
        }

        setIsLoading(true);
        const docRef = doc(db, 'open_orders', orderId);

        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                // Firestore timestamps might need conversion
                const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
                
                setOrder({
                    ...data,
                    id: docSnap.id,
                    createdAt: createdAt
                } as ActiveOrder);
                setError(null);
            } else {
                // Se não estiver na nuvem, tenta no arquivo local (útil para testes ou históricos)
                const archivedOrders = getArchivedOrders();
                const foundArchived = archivedOrders.find(o => o.id === orderId);
                setOrder(foundArchived || null);
                if (!foundArchived) {
                    setError("Comanda não encontrada.");
                }
            }
            setIsLoading(false);
        }, (err) => {
            console.error("Error fetching real-time order:", err);
            setError("Erro ao conectar com o servidor.");
            setIsLoading(false);
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, [orderId]);


    const orderTotal = useMemo(() => {
        if (!order) return 0;
        return order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }, [order]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground animate-pulse">Carregando sua comanda...</p>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 md:gap-8 md:p-8 min-h-screen">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <div className="mx-auto bg-muted rounded-full p-4 w-fit mb-4">
                            <FileX className="h-12 w-12 text-destructive" />
                        </div>
                        <CardTitle>Comanda não encontrada</CardTitle>
                        <CardDescription>
                            {error || "Não conseguimos encontrar sua comanda. Ela pode ter sido fechada ou o link é inválido."}
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }
    
    return (
        <div className="flex flex-1 flex-col items-center gap-4 p-4 md:gap-8 md:p-8 min-h-screen bg-muted/30">
            <Card className="w-full max-w-lg shadow-xl border-t-4 border-t-primary">
                <CardHeader className="text-center">
                     <div className="mx-auto bg-primary/10 rounded-full p-4 w-fit mb-4">
                        <ShoppingCart className="h-10 w-10 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Sua Comanda: {order.name}</CardTitle>
                    <CardDescription>
                        Abertura: {format(new Date(order.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </CardDescription>
                    {order.status === 'paid' && (
                        <Badge className="w-fit mx-auto mt-2 bg-green-600 px-4 py-1 text-sm">Comanda Paga</Badge>
                    )}
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-base">Item</TableHead>
                                <TableHead className="text-center text-base">Qtd.</TableHead>
                                <TableHead className="text-right text-base">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {order.items.length > 0 ? (
                                order.items.map((item, index) => (
                                    <TableRow key={item.lineItemId || `${item.id}-${index}`}>
                                        <TableCell>
                                            <div className="font-semibold text-sm">{item.name}</div>
                                            <div className="text-xs text-muted-foreground">{formatCurrency(item.price)}</div>
                                        </TableCell>
                                        <TableCell className="text-center font-medium">{item.quantity}</TableCell>
                                        <TableCell className="text-right font-bold">{formatCurrency(item.price * item.quantity)}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground italic">
                                        Nenhum item na sua comanda ainda.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
                <CardFooter className="flex-col gap-2 bg-muted/10 p-6">
                     <Separator className="mb-4" />
                     <div className="w-full flex justify-between text-xl font-black">
                        <span>TOTAL:</span>
                        <span className="text-primary">{formatCurrency(orderTotal)}</span>
                    </div>
                </CardFooter>
            </Card>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground text-center max-w-md mt-4 font-bold">
                Esta página é atualizada automaticamente em tempo real.<br/>
                Para fechar a conta, por favor, chame um atendente.
            </p>
        </div>
    );
}
