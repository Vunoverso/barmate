
"use client";

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import type { ActiveOrder, OrderItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChefHat, CheckCircle2, Clock, BellRing } from 'lucide-react';
import { formatDistanceToNow, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

const KITCHEN_CATEGORIES = ['cat_lanches', 'cat_porcoes', 'cat_sobremesas'];

export default function KitchenViewClient() {
    const [orders, setOrders] = useState<ActiveOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

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
        const ordersRef = collection(db, 'open_orders');
        
        const unsubscribe = onSnapshot(ordersRef, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt)
            } as any));
            
            if (!isFirstLoad) {
                const currentKitchenCount = data.reduce((acc, o) => acc + o.items.filter((i: any) => 
                    KITCHEN_CATEGORIES.includes(i.categoryId) && !i.isDelivered && (isToday(new Date(i.addedAt)) || i.forceKitchenVisible)
                ).length, 0);
                const prevKitchenCount = orders.reduce((acc, o) => acc + o.items.filter((i: any) => 
                    KITCHEN_CATEGORIES.includes(i.categoryId) && !i.isDelivered && (isToday(new Date(i.addedAt)) || i.forceKitchenVisible)
                ).length, 0);
                
                if (currentKitchenCount > prevKitchenCount) {
                    playNotificationSound();
                    toast({ title: "NOVO PEDIDO!", description: "Um novo item chegou para preparo.", action: <BellRing className="h-4 w-4 text-primary" /> });
                }
            }

            setOrders(data);
            setIsLoading(false);
            isFirstLoad = false;
        }, async (err) => {
            const permissionError = new FirestorePermissionError({
                path: ordersRef.path,
                operation: 'list',
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        });
        return () => unsubscribe();
    }, [orders, toast]);

    const groupedKitchenOrders = useMemo(() => {
        const groups: Record<string, { id: string, orderName: string, createdAt: Date, items: OrderItem[] }> = {};
        
        orders.forEach(order => {
            const pendingItems = order.items.filter(item => {
                const isKitchen = KITCHEN_CATEGORIES.includes(item.categoryId || '');
                const isNotDelivered = !item.isDelivered;
                const isNewOrForced = isToday(new Date(item.addedAt || 0)) || item.forceKitchenVisible === true;
                return isKitchen && isNotDelivered && isNewOrForced;
            });
            
            if (pendingItems.length > 0) {
                groups[order.id] = {
                    id: order.id,
                    orderName: order.name,
                    createdAt: order.createdAt,
                    items: pendingItems
                };
            }
        });
        
        return Object.values(groups).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }, [orders]);

    const handleMarkAsDelivered = async (orderId: string, lineItemId: string) => {
        if (!db) return;
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        const updatedItems = order.items.map(item => 
            item.lineItemId === lineItemId ? { ...item, isDelivered: true, isPreparing: false, forceKitchenVisible: false } : item
        );

        const docRef = doc(db, 'open_orders', orderId);
        const data = { 
            items: updatedItems,
            updatedAt: new Date().toISOString()
        };

        updateDoc(docRef, data)
            .catch(async (err) => {
                const permissionError = new FirestorePermissionError({
                    path: docRef.path,
                    operation: 'update',
                    requestResourceData: data,
                } satisfies SecurityRuleContext);
                errorEmitter.emit('permission-error', permissionError);
            });
    };

    const handleTogglePreparing = async (orderId: string, lineItemId: string) => {
        if (!db) return;
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        const updatedItems = order.items.map(item => 
            item.lineItemId === lineItemId ? { ...item, isPreparing: !item.isPreparing } : item
        );

        const docRef = doc(db, 'open_orders', orderId);
        const data = { 
            items: updatedItems,
            updatedAt: new Date().toISOString()
        };

        updateDoc(docRef, data)
            .catch(async (err) => {
                const permissionError = new FirestorePermissionError({
                    path: docRef.path,
                    operation: 'update',
                    requestResourceData: data,
                } satisfies SecurityRuleContext);
                errorEmitter.emit('permission-error', permissionError);
            });
    };

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center bg-slate-950"><ChefHat className="h-12 w-12 animate-spin text-primary" /></div>;
    }

    return (
        <div className="min-h-screen bg-slate-950 p-4">
            <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                    <ChefHat className="h-8 w-8 text-primary" />
                    <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Produção</h1>
                </div>
                <div className="flex items-center gap-4">
                    <Badge variant="outline" className="text-white border-white/20 px-4 py-1">
                        PEDIDOS DE HOJE
                    </Badge>
                    <Badge className="text-white bg-primary px-4 py-1">
                        {groupedKitchenOrders.length} COMANDAS
                    </Badge>
                </div>
            </div>

            {groupedKitchenOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-40 text-white/20">
                    <ChefHat className="h-20 w-20 mb-4" />
                    <p className="text-xl font-bold uppercase">Aguardando novos pedidos...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {groupedKitchenOrders.map((group) => (
                        <Card key={group.id} className="bg-slate-900 border-white/10 shadow-2xl flex flex-col">
                            <CardHeader className="pb-3 border-b border-white/5 bg-white/5">
                                <div className="flex justify-between items-start">
                                    <Badge className="text-xl font-black bg-white text-slate-950 px-3 uppercase">{group.orderName}</Badge>
                                    <div className="flex items-center text-[10px] text-white/40 font-bold uppercase pt-1">
                                        <Clock className="mr-1 h-3 w-3" />
                                        {formatDistanceToNow(group.createdAt, { locale: ptBR })}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow py-6 space-y-6">
                                {group.items.map((item) => (
                                    <div key={item.lineItemId} className="flex flex-col gap-2">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="text-2xl font-black text-white flex items-start gap-3 min-w-0">
                                                <span className="text-primary">{item.quantity}x</span>
                                                <div className="min-w-0">
                                                    <span className="uppercase leading-tight truncate block">{item.name}</span>
                                                    {item.forceKitchenVisible && (
                                                        <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Manual</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-2 shrink-0">
                                                <Button 
                                                    size="icon" 
                                                    className={`h-12 w-12 rounded-xl transition-colors ${item.isPreparing ? 'bg-orange-500 hover:bg-orange-600' : 'bg-white/5 hover:bg-white/20'} text-white`}
                                                    onClick={() => handleTogglePreparing(group.id, item.lineItemId!)}
                                                >
                                                    <Clock className="h-6 w-6" />
                                                </Button>
                                                <Button 
                                                    size="icon" 
                                                    className="h-12 w-12 rounded-xl bg-white/10 hover:bg-green-600 text-white transition-colors"
                                                    onClick={() => handleMarkAsDelivered(group.id, item.lineItemId!)}
                                                >
                                                    <CheckCircle2 className="h-6 w-6" />
                                                </Button>
                                            </div>
                                        </div>
                                        {item.isPreparing && (
                                            <Badge variant="outline" className="w-fit text-[9px] font-black text-orange-500 border-orange-500/30 bg-orange-500/5 uppercase tracking-widest animate-pulse ml-10">
                                                Em Produção
                                            </Badge>
                                        )}
                                    </div>
                                ))}
                            </CardContent>
                            <CardFooter className="pt-0 pb-4">
                                <Button 
                                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg h-14 rounded-xl"
                                    onClick={async () => {
                                        for(const item of group.items) {
                                            await handleMarkAsDelivered(group.id, item.lineItemId!);
                                        }
                                    }}
                                >
                                    <CheckCircle2 className="mr-2 h-6 w-6" /> ENTREGAR TUDO
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
