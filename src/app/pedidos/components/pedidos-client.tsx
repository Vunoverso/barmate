
"use client";

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import type { ActiveOrder, OrderItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChefHat, CheckCircle2, Clock, Printer, QrCode, Copy } from 'lucide-react';
import { formatDistanceToNow, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

const KITCHEN_CATEGORIES = ['cat_lanches', 'cat_porcoes', 'cat_sobremesas'];

export default function PedidosClient() {
    const [orders, setOrders] = useState<ActiveOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (!db) return;
        const unsubscribe = onSnapshot(collection(db, 'open_orders'), (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt)
            } as any));
            setOrders(data);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const isDateToday = (dateSource?: string | Date) => {
        if (!dateSource) return false;
        return isToday(new Date(dateSource));
    };

    const groupedKitchenOrders = useMemo(() => {
        const groups: Record<string, { id: string, orderName: string, createdAt: Date, items: OrderItem[] }> = {};
        
        orders.forEach(order => {
            const pendingItems = order.items.filter(item => {
                const isKitchenCategory = KITCHEN_CATEGORIES.includes(item.categoryId || '');
                const isNotDelivered = !item.isDelivered;
                // Item shows if: It's from Today OR was manually forced to kitchen
                const isNewOrForced = isDateToday(item.addedAt) || item.forceKitchenVisible === true;
                
                return isKitchenCategory && isNotDelivered && isNewOrForced;
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
            item.lineItemId === lineItemId ? { ...item, isDelivered: true, forceKitchenVisible: false } : item
        );

        try {
            await updateDoc(doc(db, 'open_orders', orderId), { items: updatedItems });
            toast({ title: "Item entregue!" });
        } catch (err) {
            toast({ title: "Erro ao atualizar", variant: "destructive" });
        }
    };

    const handlePrintKitchen = (orderName: string, items: OrderItem[]) => {
        const printWindow = window.open('', '', 'width=400,height=600');
        if (printWindow) {
            const itemsHtml = items.map(item => `
                <div style="font-size: 20px; margin-bottom: 10px; border-bottom: 1px dotted #ccc; padding-bottom: 5px;">
                    <strong>${item.quantity}x</strong> ${item.name.toUpperCase()}
                </div>
            `).join('');

            printWindow.document.write(`
                <html>
                <head><style>body{font-family:monospace;padding:10px;text-align:center;} h2{margin:0;} hr{border:none;border-top:1px dashed #000;margin:10px 0;}</style></head>
                <body>
                    <h2>PEDIDO PRODUÇÃO</h2>
                    <hr>
                    <div style="font-size: 22px; font-weight: bold;">${orderName}</div>
                    <hr>
                    <div style="text-align: left;">
                        ${itemsHtml}
                    </div>
                    <hr>
                    <div>Emissão: ${new Date().toLocaleTimeString('pt-BR')}</div>
                </body>
                </html>
            `);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 250);
        }
    };

    if (isLoading) {
        return <div className="flex justify-center p-20"><ChefHat className="h-10 w-10 animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsShareDialogOpen(true)}>
                        <QrCode className="mr-2 h-4 w-4" /> Monitor de Cozinha (QR Code)
                    </Button>
                </div>
                <Badge variant="secondary" className="font-bold opacity-70">FILTRANDO PEDIDOS DE HOJE</Badge>
            </div>

            {groupedKitchenOrders.length === 0 ? (
                <Card className="text-center py-20 bg-muted/20 border-dashed border-2">
                    <CardHeader>
                        <ChefHat className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
                        <CardTitle className="text-muted-foreground">Nenhum pedido pendente hoje</CardTitle>
                        <CardDescription>Os lanches e porções do dia aparecerão aqui automaticamente.</CardDescription>
                    </CardHeader>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {groupedKitchenOrders.map((group) => (
                        <Card key={group.id} className="border-t-4 border-t-primary shadow-xl flex flex-col">
                            <CardHeader className="pb-3 bg-muted/5">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <Badge className="text-xl font-black uppercase bg-primary text-primary-foreground px-3">
                                            {group.orderName}
                                        </Badge>
                                        <div className="flex items-center text-[10px] text-muted-foreground font-bold uppercase pt-1">
                                            <Clock className="mr-1 h-3 w-3" />
                                            Aguardando {formatDistanceToNow(group.createdAt, { locale: ptBR })}
                                        </div>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-muted-foreground"
                                        onClick={() => handlePrintKitchen(group.orderName, group.items)}
                                    >
                                        <Printer className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <Separator />
                            <CardContent className="flex-grow pt-4 space-y-4">
                                {group.items.map((item) => (
                                    <div key={item.lineItemId} className="flex items-center justify-between gap-3 group">
                                        <div className="flex items-start gap-2 min-w-0">
                                            <span className="text-primary font-black text-xl leading-none">{item.quantity}x</span>
                                            <div className="min-w-0">
                                                <span className="font-bold text-sm uppercase leading-tight truncate block">
                                                    {item.name}
                                                </span>
                                                {item.forceKitchenVisible && (
                                                    <span className="text-[8px] font-black text-orange-600 uppercase">Envio Manual</span>
                                                )}
                                            </div>
                                        </div>
                                        <Button 
                                            size="sm" 
                                            variant="secondary" 
                                            className="h-8 w-8 rounded-full shrink-0 hover:bg-green-600 hover:text-white transition-colors"
                                            onClick={() => handleMarkAsDelivered(group.id, item.lineItemId!)}
                                        >
                                            <CheckCircle2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </CardContent>
                            <CardFooter className="pt-2 pb-4 bg-muted/5 mt-auto">
                                <Button 
                                    className="w-full bg-green-600 hover:bg-green-700 text-white font-black uppercase text-xs h-10"
                                    onClick={async () => {
                                        for(const item of group.items) {
                                            await handleMarkAsDelivered(group.id, item.lineItemId!);
                                        }
                                    }}
                                >
                                    ENTREGAR TUDO
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

            <ShareKitchenDialog isOpen={isShareDialogOpen} onOpenChange={setIsShareDialogOpen} />
        </div>
    );
}

function ShareKitchenDialog({ isOpen, onOpenChange }: { isOpen: boolean, onOpenChange: (o: boolean) => void }) {
    const [url, setUrl] = useState('');
    const { toast } = useToast();
    
    useEffect(() => {
        if (isOpen) {
            let origin = window.location.origin;
            if (origin.includes('cloudworkstations.dev') && !origin.includes('9000-')) origin = origin.replace(/\d+-/, '9000-');
            setUrl(`${origin}/kitchen-view`);
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Monitor da Cozinha</DialogTitle>
                    <DialogDescription>Use este QR Code para abrir os pedidos em um tablet ou celular na cozinha.</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4 py-4">
                    <div className="bg-white p-4 rounded-xl border-2 border-primary/10">
                        {url && <img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`} alt="QR Code Cozinha" className="w-48 h-48" />}
                    </div>
                    <div className="flex gap-2 w-full">
                        <Input value={url} readOnly />
                        <Button size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(url); toast({ title: "Link copiado!" }); }}>
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <DialogFooter><Button variant="secondary" onClick={() => onOpenChange(false)}>Fechar</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
