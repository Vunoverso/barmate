
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { ActiveOrder } from '@/types';
import { getArchivedOrders } from '@/lib/data-access';
import { formatCurrency } from '@/lib/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileX, ShoppingCart } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export default function MyOrderClient({ orderId }: { orderId: string }) {
    const [order, setOrder] = useState<ActiveOrder | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!orderId) {
            setIsLoading(false);
            setOrder(null);
            return;
        }

        const docRef = doc(db, 'open_orders', orderId);

        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as ActiveOrder;
                // Firestore timestamps might need conversion
                setOrder({
                    ...data,
                    createdAt: (data.createdAt as any).toDate ? (data.createdAt as any).toDate() : new Date(data.createdAt)
                });
            } else {
                // If not in open_orders, check local archived orders as a fallback.
                // In a full cloud app, this might also be a DB query.
                const archivedOrders = getArchivedOrders();
                const foundArchived = archivedOrders.find(o => o.id === orderId);
                setOrder(foundArchived || null);
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching real-time order:", error);
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
        return <div className="text-center p-10">Carregando sua comanda...</div>;
    }

    if (!order) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 md:gap-8 md:p-8">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <div className="mx-auto bg-muted rounded-full p-4 w-fit mb-4">
                            <FileX className="h-12 w-12 text-destructive" />
                        </div>
                        <CardTitle>Comanda não encontrada</CardTitle>
                        <CardDescription>Não conseguimos encontrar sua comanda. Ela pode ter sido fechada ou o link é inválido.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }
    
    return (
        <div className="flex flex-1 flex-col items-center gap-4 p-4 md:gap-8 md:p-8">
            <Card className="w-full max-w-lg">
                <CardHeader className="text-center">
                     <div className="mx-auto bg-muted rounded-full p-4 w-fit mb-4">
                        <ShoppingCart className="h-10 w-10 text-primary" />
                    </div>
                    <CardTitle>Sua Comanda: {order.name}</CardTitle>
                    <CardDescription>
                        Abertura: {format(new Date(order.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </CardDescription>
                    {order.status === 'paid' && <Badge className="w-fit mx-auto mt-2 bg-green-600">Paga</Badge>}
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead className="text-center">Qtd.</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {order.items.length > 0 ? (
                                order.items.map((item, index) => (
                                    <TableRow key={item.lineItemId || `${item.id}-${index}`}>
                                        <TableCell>
                                            <div className="font-medium">{item.name}</div>
                                            <div className="text-xs text-muted-foreground">{formatCurrency(item.price)}</div>
                                        </TableCell>
                                        <TableCell className="text-center">{item.quantity}</TableCell>
                                        <TableCell className="text-right font-semibold">{formatCurrency(item.price * item.quantity)}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">
                                        Nenhum item na sua comanda ainda.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
                <CardFooter className="flex-col gap-2">
                     <Separator className="mb-4" />
                     <div className="w-full flex justify-between text-lg font-bold">
                        <span>Total:</span>
                        <span>{formatCurrency(orderTotal)}</span>
                    </div>
                </CardFooter>
            </Card>
            <p className="text-xs text-muted-foreground text-center max-w-md mt-4">Esta página é atualizada automaticamente. Para fechar a conta, por favor, chame um atendente.</p>
        </div>
    );
}
