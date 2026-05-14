"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { db, collection, onSnapshot, doc, updateDoc } from '@/lib/db-sync-client';
import type { ActiveOrder, OrderItem } from '@/types';
import { getMenuBranding } from '@/lib/data-access';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChefHat, CheckCircle2, Clock, BellRing, AlertTriangle, MessageSquare } from 'lucide-react';
import { formatDistanceToNow, isToday, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { toValidDate } from '@/lib/utils';

const KITCHEN_CATEGORIES = ['cat_lanches', 'cat_porcoes', 'cat_sobremesas'];
const DEFAULT_ESTIMATED_PREP_MINUTES = 15;

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

const isPendingKitchenItem = (item: OrderItem) => {
    const addedAt = toValidDate(item.addedAt);
    const isKitchen = KITCHEN_CATEGORIES.includes(item.categoryId || '');
    const isNotDelivered = !item.isDelivered;
    const isApproved = !item.pendingApproval;
    const isNewOrForced = (addedAt ? isToday(addedAt) : false) || item.forceKitchenVisible === true;
    return isKitchen && isNotDelivered && isApproved && isNewOrForced;
};

const countPendingKitchenItems = (orders: ActiveOrder[]) => orders.reduce(
    (total, order) => total + order.items.filter(isPendingKitchenItem).length,
    0
);

function ItemTimer({ prepStartedAt, estimatedMinutes }: { prepStartedAt?: string | null; estimatedMinutes: number }) {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (!prepStartedAt) return;
        const start = new Date(prepStartedAt).getTime();
        const update = () => setElapsed(Math.floor((Date.now() - start) / 1000));
        update();
        const interval = setInterval(update, 10000);
        return () => clearInterval(interval);
    }, [prepStartedAt]);

    if (!prepStartedAt) return null;

    const elapsedMin = Math.floor(elapsed / 60);
    const elapsedSec = elapsed % 60;
    const isLate = elapsedMin >= estimatedMinutes;

    return (
        <div className={`flex items-center gap-1 text-xs font-bold mt-1 ml-10 ${isLate ? 'text-red-400 animate-pulse' : 'text-orange-400'}`}>
            {isLate ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
            {elapsedMin}:{String(elapsedSec).padStart(2, '0')}
            {isLate && <span className="ml-1">ATRASADO</span>}
        </div>
    );
}

export default function KitchenViewClient() {
    const [orders, setOrders] = useState<ActiveOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [estimatedPrepMinutes, setEstimatedPrepMinutes] = useState(DEFAULT_ESTIMATED_PREP_MINUTES);
    const ordersRef = useRef<ActiveOrder[]>([]);
    const { toast } = useToast();

    useEffect(() => {
        const branding = getMenuBranding();
        setEstimatedPrepMinutes(branding.estimatedPrepMinutes ?? DEFAULT_ESTIMATED_PREP_MINUTES);
    }, []);

    useEffect(() => {
        if (!db) {
            setIsLoading(false);
            return;
        }

        let isFirstLoad = true;
        const unsubscribe = onSnapshot(collection(db, 'open_orders'), (snapshot) => {
            const data = snapshot.docs.map((d) => {
                const payload = d.data();
                return {
                    id: d.id,
                    ...payload,
                    createdAt: toValidDate(payload.createdAt) ?? new Date(),
                } as ActiveOrder;
            });

            if (!isFirstLoad) {
                const currentKitchenCount = countPendingKitchenItems(data);
                const prevKitchenCount = countPendingKitchenItems(ordersRef.current);

                if (currentKitchenCount > prevKitchenCount) {
                    playNotificationSound();
                    toast({ title: "NOVO PEDIDO!", description: "Um novo item chegou para preparo.", action: <BellRing className="h-4 w-4 text-primary" /> });
                }
            }

            ordersRef.current = data;
            setOrders(data);
            setIsLoading(false);
            isFirstLoad = false;
        }, () => {
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [toast]);

    const groupedKitchenOrders = useMemo(() => {
        const groups: Record<string, { id: string; orderName: string; createdAt: Date; items: OrderItem[] }> = {};

        orders.forEach(order => {
            const pendingItems = order.items.filter(isPendingKitchenItem);
            if (pendingItems.length > 0) {
                groups[order.id] = {
                    id: order.id,
                    orderName: order.name,
                    createdAt: order.createdAt,
                    items: pendingItems,
                };
            }
        });

        return Object.values(groups).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }, [orders]);

    const handleMarkAsDelivered = async (orderId: string, lineItemId: string, markAll = false) => {
        if (!db) return;
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        const updatedItems = order.items.map(item => {
            const shouldMark = markAll ? isPendingKitchenItem(item) : item.lineItemId === lineItemId;
            if (!shouldMark) return item;
            return { ...item, isDelivered: true, isPreparing: false, forceKitchenVisible: false };
        });

        const stillPending = updatedItems.filter(isPendingKitchenItem);
        const newCustomerStatus = stillPending.length === 0 && order.customerStatus !== 'finalizado'
            ? 'finalizado'
            : order.customerStatus;

        try {
            await updateDoc(doc(db, 'open_orders', orderId), {
                items: updatedItems,
                ...(newCustomerStatus !== order.customerStatus ? { customerStatus: newCustomerStatus } : {}),
                updatedAt: new Date().toISOString(),
            });
        } catch (err) {}
    };

    const handleTogglePreparing = async (orderId: string, lineItemId: string) => {
        if (!db) return;
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        const now = new Date().toISOString();
        const updatedItems = order.items.map(item => {
            if (item.lineItemId !== lineItemId) return item;
            const starting = !item.isPreparing;
            return {
                ...item,
                isPreparing: starting,
                prepStartedAt: starting ? (item.prepStartedAt ?? now) : item.prepStartedAt,
            };
        });

        const newCustomerStatus = order.customerStatus !== 'em_producao' ? 'em_producao' : order.customerStatus;

        try {
            await updateDoc(doc(db, 'open_orders', orderId), {
                items: updatedItems,
                customerStatus: newCustomerStatus,
                updatedAt: new Date().toISOString(),
            });
        } catch (err) {}
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950">
                <ChefHat className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 p-4">
            <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                    <ChefHat className="h-8 w-8 text-primary" />
                    <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Producao</h1>
                </div>
                <div className="flex items-center gap-4">
                    <Badge variant="outline" className="text-white border-white/20 px-4 py-1">
                        ~{estimatedPrepMinutes} min
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
                    {groupedKitchenOrders.map((group) => {
                        const ageMinutes = differenceInMinutes(new Date(), group.createdAt);
                        const isOrderLate = ageMinutes >= estimatedPrepMinutes;
                        return (
                            <Card key={group.id} className={`bg-slate-900 border-white/10 shadow-2xl flex flex-col ${isOrderLate ? 'ring-2 ring-red-500/60' : ''}`}>
                                <CardHeader className="pb-3 border-b border-white/5 bg-white/5">
                                    <div className="flex justify-between items-start">
                                        <Badge className="text-xl font-black bg-white text-slate-950 px-3 uppercase">{group.orderName}</Badge>
                                        <div className={`flex items-center text-[10px] font-bold uppercase pt-1 ${isOrderLate ? 'text-red-400 animate-pulse' : 'text-white/40'}`}>
                                            {isOrderLate ? <AlertTriangle className="mr-1 h-3 w-3" /> : <Clock className="mr-1 h-3 w-3" />}
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
                                                    Em Producao
                                                </Badge>
                                            )}
                                            <ItemTimer prepStartedAt={item.prepStartedAt} estimatedMinutes={estimatedPrepMinutes} />
                                            {item.guestNote && (
                                                <div className="flex items-start gap-1 ml-10 mt-1">
                                                    <MessageSquare className="h-3 w-3 text-yellow-400 mt-0.5 shrink-0" />
                                                    <span className="text-xs text-yellow-300 font-medium leading-snug">{item.guestNote}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </CardContent>
                                <CardFooter className="pt-0 pb-4">
                                    <Button
                                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg h-14 rounded-xl"
                                        onClick={() => handleMarkAsDelivered(group.id, '', true)}
                                    >
                                        <CheckCircle2 className="mr-2 h-6 w-6" /> ENTREGAR TUDO
                                    </Button>
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
