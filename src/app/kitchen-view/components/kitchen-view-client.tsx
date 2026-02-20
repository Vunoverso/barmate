
"use client";

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import type { ActiveOrder, OrderItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChefHat, CheckCircle2, Clock, BellRing } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

const KITCHEN_CATEGORIES = ['cat_lanches', 'cat_porcoes', 'cat_sobremesas'];

export default function KitchenViewClient() {
    const [orders, setOrders] = useState<ActiveOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    // Som de novo pedido
    const playNotificationSound = () => {
        try {
            const context = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(440, context.currentTime);
            gain.gain.setValueAtTime(0.1, context.currentTime);
            oscillator.connect(gain);
            gain.connect(context.destination);
            oscillator.start();
            oscillator.stop(context.currentTime + 0.3);
        } catch (e) {}
    };

    useEffect(() => {
        if (!db) return;
        let isFirstLoad = true;
        const unsubscribe = onSnapshot(collection(db, 'open_orders'), (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt)
            } as any));
            
            // Tocar som se houver novo pedido que não estava antes
            if (!isFirstLoad) {
                const currentKitchenCount = data.reduce((acc, o) => acc + o.items.filter((i: any) => KITCHEN_CATEGORIES.includes(i.categoryId) && !i.isDelivered).length, 0);
                const prevKitchenCount = orders.reduce((acc, o) => acc + o.items.filter((i: any) => KITCHEN_CATEGORIES.includes(i.categoryId) && !i.isDelivered).length, 0);
                if (currentKitchenCount > prevKitchenCount) {
                    playNotificationSound();
                    toast({ title: "NOVO PEDIDO!", description: "Um novo item chegou para preparo.", action: <BellRing className="h-4 w-4 text-primary" /> });
                }
            }

            setOrders(data);
            setIsLoading(false);
            isFirstLoad = false;
        });
        return () => unsubscribe();
    }, [orders, toast]);

    const kitchenItems = useMemo(() => {
        const items: { orderId: string, orderName: string, item: OrderItem, createdAt: Date }[] = [];
        orders.forEach(order => {
            order.items.forEach(item => {
                if (KITCHEN_CATEGORIES.includes(item.categoryId) && !item.isDelivered) {
                    items.push({
                        orderId: order.id,
                        orderName: order.name,
                        item: item,
                        createdAt: order.createdAt
                    });
                }
            });
        });
        return items.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }, [orders]);

    const handleMarkAsDelivered = async (orderId: string, lineItemId: string) => {
        if (!db) return;
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        const updatedItems = order.items.map(item => 
            item.lineItemId === lineItemId ? { ...item, isDelivered: true } : item
        );

        try {
            await updateDoc(doc(db, 'open_orders', orderId), { items: updatedItems });
        } catch (err) {}
    };

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center"><ChefHat className="h-12 w-12 animate-spin text-primary" /></div>;
    }

    return (
        <div className="min-h-screen bg-slate-950 p-4">
            <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                    <ChefHat className="h-8 w-8 text-primary" />
                    <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Monitor de Produção</h1>
                </div>
                <Badge variant="outline" className="text-white border-white/20 px-4 py-1">
                    {kitchenItems.length} PENDENTES
                </Badge>
            </div>

            {kitchenItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-40 text-white/20">
                    <ChefHat className="h-20 w-20 mb-4" />
                    <p className="text-xl font-bold uppercase">Aguardando novos pedidos...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {kitchenItems.map((entry, idx) => (
                        <Card key={`${entry.orderId}-${entry.item.lineItemId}-${idx}`} className="bg-slate-900 border-white/10 shadow-2xl">
                            <CardHeader className="pb-2 border-b border-white/5">
                                <div className="flex justify-between items-start">
                                    <Badge className="text-lg font-black bg-white text-slate-950 px-3">{entry.orderName}</Badge>
                                    <div className="flex items-center text-[10px] text-white/40 font-bold uppercase">
                                        <Clock className="mr-1 h-3 w-3" />
                                        {formatDistanceToNow(entry.createdAt, { addSuffix: true, locale: ptBR })}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="py-6">
                                <div className="text-3xl font-black text-white flex items-start gap-3">
                                    <span className="text-primary">{entry.item.quantity}x</span>
                                    <span className="uppercase leading-tight">{entry.item.name}</span>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-0">
                                <Button 
                                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg h-16 rounded-xl"
                                    onClick={() => handleMarkAsDelivered(entry.orderId, entry.item.lineItemId!)}
                                >
                                    <CheckCircle2 className="mr-2 h-6 w-6" /> PRONTO!
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
