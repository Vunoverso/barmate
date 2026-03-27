
"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import type { ActiveOrder } from '@/types';
import { getArchivedOrders } from '@/lib/data-access';
import { formatCurrency } from '@/lib/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileX, ShoppingCart, Loader2, BellRing } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, increment } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export default function MyOrderClient({ orderId }: { orderId: string }) {
    const [order, setOrder] = useState<ActiveOrder | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const hasIncremented = useRef(false);
    const prevItemsCount = useRef<number>(0);
    const { toast } = useToast();

    const playNotificationSound = () => {
        try {
            const context = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, context.currentTime);
            gain.gain.setValueAtTime(0.1, context.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.5);
            oscillator.connect(gain);
            gain.connect(context.destination);
            oscillator.start();
            oscillator.stop(context.currentTime + 0.5);
        } catch (e) {}
    };

    useEffect(() => {
        if (!orderId || !db) {
            setIsLoading(false);
            setOrder(null);
            return;
        }

        const docRef = doc(db, 'open_orders', orderId);

        if (!hasIncremented.current) {
            updateDoc(docRef, { viewerCount: increment(1) })
                .catch(async (err) => {
                    const permissionError = new FirestorePermissionError({
                        path: docRef.path,
                        operation: 'update',
                        requestResourceData: { viewerCount: 'increment' }
                    } satisfies SecurityRuleContext);
                    errorEmitter.emit('permission-error', permissionError);
                });
            hasIncremented.current = true;
        }

        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
                
                const newOrder = {
                    ...data,
                    id: docSnap.id,
                    createdAt: createdAt
                } as ActiveOrder;

                const currentItemsCount = newOrder.items.reduce((sum, item) => sum + item.quantity, 0);
                if (prevItemsCount.current > 0 && currentItemsCount > prevItemsCount.current) {
                    playNotificationSound();
                    toast({
                        title: "Novo item lançado!",
                        description: "Sua comanda acaba de ser atualizada pelo garçom.",
                        action: <BellRing className="h-4 w-4 text-primary animate-bounce" />
                    });
                }
                prevItemsCount.current = currentItemsCount;

                setOrder(newOrder);
                setError(null);
            } else {
                const archivedOrders = getArchivedOrders();
                const foundArchived = archivedOrders.find(o => o.id === orderId);
                setOrder(foundArchived || null);
                if (!foundArchived) {
                    setError("Acesso encerrado ou comanda não encontrada.");
                }
            }
            setIsLoading(false);
        }, async (err) => {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'get',
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
            setError("Erro ao conectar com o servidor.");
            setIsLoading(false);
        });

        return () => {
            unsubscribe();
            if (hasIncremented.current) {
                updateDoc(docRef, { viewerCount: increment(-1) })
                    .catch(() => {});
                hasIncremented.current = false;
            }
        };
    }, [orderId, toast]);


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
                        <CardTitle>Comanda Indisponível</CardTitle>
                        <CardDescription>
                            {error || "O acesso a esta comanda foi encerrado pelo estabelecimento ou ela foi fechada."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button 
                            variant="outline" 
                            className="w-full"
                            onClick={() => {
                                localStorage.removeItem('barmate_last_order_id');
                                window.location.href = '/guest/register';
                            }}
                        >
                            Solicitar Novo Acesso
                        </Button>
                    </CardContent>
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
                                            {item.isCombo && (
                                                <div className="mt-1 text-[10px] font-bold text-primary uppercase">
                                                    ENTREGUES: {item.claimedQuantity || 0} DE {(item.comboItems || 0) * item.quantity}
                                                </div>
                                            )}
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
