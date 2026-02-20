
"use client";

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import type { ActiveOrder, OrderItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChefHat, CheckCircle2, Clock, Printer, QrCode, Copy } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
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
                id: d.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt)
            } as any));
            setOrders(data);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

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
            toast({ title: "Item entregue!" });
        } catch (err) {
            toast({ title: "Erro ao atualizar", variant: "destructive" });
        }
    };

    const handlePrintKitchen = (orderName: string, item: OrderItem) => {
        const printWindow = window.open('', '', 'width=400,height=600');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                <head><style>body{font-family:monospace;padding:10px;text-align:center;} h2{margin:0;} hr{border:none;border-top:1px dashed #000;margin:10px 0;}</style></head>
                <body>
                    <h2>PEDIDO COZINHA</h2>
                    <hr>
                    <div style="font-size: 20px; font-weight: bold;">${orderName}</div>
                    <hr>
                    <div style="font-size: 24px; font-weight: bold;">${item.quantity}x ${item.name.toUpperCase()}</div>
                    <hr>
                    <div>Emissão: ${new Date().toLocaleTimeString('pt-BR')}</div>
                </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.print();
            printWindow.close();
        }
    };

    if (isLoading) {
        return <div className="flex justify-center p-20"><ChefHat className="h-10 w-10 animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsShareDialogOpen(true)}>
                    <QrCode className="mr-2 h-4 w-4" /> Ver no Celular/Tablet
                </Button>
            </div>

            {kitchenItems.length === 0 ? (
                <Card className="text-center py-20 bg-muted/20 border-dashed border-2">
                    <CardHeader>
                        <ChefHat className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
                        <CardTitle className="text-muted-foreground">Nenhum pedido pendente</CardTitle>
                        <CardDescription>Os lanches e porções aparecerão aqui automaticamente.</CardDescription>
                    </CardHeader>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {kitchenItems.map((entry, idx) => (
                        <Card key={`${entry.orderId}-${entry.item.lineItemId}-${idx}`} className="border-l-4 border-l-primary shadow-md">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <Badge variant="secondary" className="text-lg font-black uppercase">{entry.orderName}</Badge>
                                    <div className="flex items-center text-[10px] text-muted-foreground font-bold">
                                        <Clock className="mr-1 h-3 w-3" />
                                        {formatDistanceToNow(entry.createdAt, { addSuffix: true, locale: ptBR })}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl font-black flex items-baseline gap-2">
                                    <span className="text-primary text-2xl">{entry.item.quantity}x</span>
                                    <span className="uppercase truncate">{entry.item.name}</span>
                                </div>
                            </CardContent>
                            <CardFooter className="flex gap-2 pt-2 border-t bg-muted/5">
                                <Button 
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold h-12"
                                    onClick={() => handleMarkAsDelivered(entry.orderId, entry.item.lineItemId!)}
                                >
                                    <CheckCircle2 className="mr-2 h-5 w-5" /> ENTREGAR
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="icon" 
                                    className="h-12 w-12"
                                    onClick={() => handlePrintKitchen(entry.orderName, entry.item)}
                                >
                                    <Printer className="h-5 w-5" />
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
