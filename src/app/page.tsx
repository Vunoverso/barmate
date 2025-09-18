
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect, useMemo } from 'react';
import { getSales, getCashRegisterStatus, getProducts, formatCurrency, getSecondaryCashBox, getBankAccount } from '@/lib/constants';
import type { Sale, CashRegisterStatus, Product, SecondaryCashBox, BankAccount } from '@/types';
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowUpRight, BarChart3, Users, DollarSign, Package, Banknote, Store, HandCoins, TrendingUp } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const version = "v1.3.0";

  useEffect(() => {
    setIsMounted(true);
    
    const handleStorageChange = () => {
      setSales(getSales());
      setProducts(getProducts());
    };

    handleStorageChange();
    
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const dailyStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaysSales = sales.filter(sale => new Date(sale.timestamp) >= today);
    const totalRevenue = todaysSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const salesCount = todaysSales.length;
    const ticketMedio = salesCount > 0 ? totalRevenue / salesCount : 0;
    
    const allItems = todaysSales.flatMap(sale => sale.items);
    const productSales = allItems.reduce((acc, item) => {
        if(item.price > 0) { // Count only products, not credits/payments
            acc[item.id] = (acc[item.id] || 0) + item.quantity;
        }
        return acc;
    }, {} as Record<string, number>);

    const topProducts = Object.entries(productSales)
      .sort(([, qtyA], [, qtyB]) => qtyB - qtyA)
      .slice(0, 5)
      .map(([productId, quantity]) => {
        const productDetails = products.find(p => p.id === productId);
        return {
          name: productDetails?.name || 'Produto Desconhecido',
          quantity
        };
      });

    return { totalRevenue, salesCount, ticketMedio, topProducts };
  }, [sales, products]);


  if (!isMounted) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Carregando dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita de Hoje</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dailyStats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">Total de vendas no dia</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas de Hoje</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{dailyStats.salesCount}</div>
             <p className="text-xs text-muted-foreground">Transações realizadas hoje</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio de Hoje</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dailyStats.ticketMedio)}</div>
            <p className="text-xs text-muted-foreground">Valor médio por venda</p>
          </CardContent>
        </Card>
      </div>

       <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-2">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>Acesse as funções mais importantes com um clique.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <Link href="/orders" passHref>
                <Button size="lg" className="w-full h-20" variant="outline">
                    <HandCoins className="h-6 w-6 mr-4" />
                    <span className="flex flex-col items-start">
                        <span className="text-base font-semibold">Comandas</span>
                        <span className="text-xs font-normal">Gerenciar comandas</span>
                    </span>
                </Button>
            </Link>
             <Link href="/counter-sale" passHref>
                <Button size="lg" className="w-full h-20" variant="outline">
                    <Store className="h-6 w-6 mr-4" />
                     <span className="flex flex-col items-start">
                        <span className="text-base font-semibold">Venda Balcão</span>
                        <span className="text-xs font-normal">Realizar venda rápida</span>
                    </span>
                </Button>
            </Link>
             <Link href="/cash-register" passHref>
                <Button size="lg" className="w-full h-20" variant="outline">
                     <Banknote className="h-6 w-6 mr-4" />
                      <span className="flex flex-col items-start">
                        <span className="text-base font-semibold">Ir para o Caixa</span>
                        <span className="text-xs font-normal">Gerenciar caixa diário</span>
                    </span>
                </Button>
            </Link>
             <Link href="/financial" passHref>
                <Button size="lg" className="w-full h-20" variant="outline">
                     <TrendingUp className="h-6 w-6 mr-4" />
                     <span className="flex flex-col items-start">
                        <span className="text-base font-semibold">Financeiro</span>
                        <span className="text-xs font-normal">Ver relatórios</span>
                    </span>
                </Button>
            </Link>
          </CardContent>
        </Card>
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle>Produtos Mais Vendidos Hoje</CardTitle>
              <CardDescription>
                Os 5 produtos com maior quantidade vendida no dia.
              </CardDescription>
            </div>
            <Button asChild size="sm" className="ml-auto gap-1">
              <Link href="/products">
                Ver Todos
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Quantidade Vendida</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyStats.topProducts.length > 0 ? (
                    dailyStats.topProducts.map((p, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="font-medium">{p.name}</div>
                      </TableCell>
                      <TableCell className="text-right">{p.quantity}</TableCell>
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={2} className="h-24 text-center">
                            Nenhuma venda registrada hoje ainda.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <footer className="flex justify-center p-4">
        <span className="text-xs text-muted-foreground">{version}</span>
      </footer>
    </div>
  );
}
