"use client";

import { useState, useEffect } from "react";
import { db, collection, onSnapshot } from "@/lib/supabase-firestore";
import type { ActiveOrder } from "@/types";
import { getSales } from "@/lib/data-access";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { HandCoins, ClipboardList, ChefHat, CircleDollarSign, CheckCheck } from "lucide-react";
import { isToday } from "date-fns";

const VERSION = "v1.3.3";

export default function DashboardPage() {
  const [openOrders, setOpenOrders] = useState<ActiveOrder[]>([]);
  const [salesToday, setSalesToday] = useState(0);
  const [revenueToday, setRevenueToday] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!db) { setIsLoaded(true); return; }
    const unsubscribe = onSnapshot(collection(db, "open_orders"), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ActiveOrder));
      setOpenOrders(data);
      setIsLoaded(true);
    }, () => setIsLoaded(true));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const all = getSales();
    const today = all.filter(s => s.closedAt && isToday(new Date(s.closedAt)));
    setSalesToday(today.length);
    const total = today.reduce((acc, s) => {
      const paid = (s.payments ?? []).reduce((sum: number, p: { amount?: number }) => sum + (p.amount ?? 0), 0);
      return acc + paid;
    }, 0);
    setRevenueToday(total);
  }, []);

  const inProduction = openOrders.reduce((total, order) =>
    total + order.items.filter(i => i.isPreparing && !i.isDelivered).length, 0
  );

  const metrics = [
    { icon: <ClipboardList className="h-6 w-6 text-primary" />, label: "Comandas Abertas", value: isLoaded ? openOrders.length : "..." },
    { icon: <ChefHat className="h-6 w-6 text-orange-500" />, label: "Itens em Produção", value: isLoaded ? inProduction : "..." },
    { icon: <CheckCheck className="h-6 w-6 text-green-500" />, label: "Vendas Hoje", value: salesToday },
    { icon: <CircleDollarSign className="h-6 w-6 text-emerald-500" />, label: "Faturamento Hoje", value: `R$ ${revenueToday.toFixed(2).replace('.', ',')}` },
  ];

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-bold">Painel</h1>
        <p className="text-sm text-muted-foreground">Visão geral em tempo real.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{m.label}</CardTitle>
              {m.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{m.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <Link href="/orders">
          <Button size="lg">
            <HandCoins className="mr-2 h-5 w-5" />
            Gerenciar Comandas
          </Button>
        </Link>
        <Link href="/kitchen-view">
          <Button size="lg" variant="outline">
            <ChefHat className="mr-2 h-5 w-5" />
            Visão da Cozinha
          </Button>
        </Link>
      </div>

      <footer className="mt-auto">
        <span className="text-xs text-muted-foreground">{VERSION}</span>
      </footer>
    </div>
  );
}
