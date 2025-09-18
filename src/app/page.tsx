
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { DollarSign, Users, BarChart, Activity, HandCoins, Store, Banknote, TrendingUp } from "lucide-react";

export default function DashboardPage() {
  const version = "v1.3.0";

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      {/* Top Row Cards */}
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita de Hoje</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 42,00</div>
            <p className="text-xs text-muted-foreground">Total de vendas no dia</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas de Hoje</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+4</div>
            <p className="text-xs text-muted-foreground">Transações realizadas hoje</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio de Hoje</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 10,50</div>
            <p className="text-xs text-muted-foreground">Valor médio por venda</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status do Caixa</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Aberto</div>
            <p className="text-xs text-muted-foreground">Caixa Diário</p>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row Cards */}
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-2">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>Acesse as funções mais importantes com um clique.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Link href="/orders" passHref>
                <Button size="lg" className="w-full h-24 flex-col items-start justify-start p-4" variant="outline">
                    <HandCoins className="h-6 w-6 mb-2" />
                    <span className="text-base font-semibold">Comandas</span>
                    <span className="text-xs font-normal text-muted-foreground">Gerenciar comandas</span>
                </Button>
            </Link>
            <Link href="/counter-sale" passHref>
                <Button size="lg" className="w-full h-24 flex-col items-start justify-start p-4" variant="outline">
                    <Store className="h-6 w-6 mb-2" />
                    <span className="text-base font-semibold">Venda Balcão</span>
                    <span className="text-xs font-normal text-muted-foreground">Realizar venda rápida</span>
                </Button>
            </Link>
            <Link href="/cash-register" passHref>
                <Button size="lg" className="w-full h-24 flex-col items-start justify-start p-4" variant="outline">
                    <Banknote className="h-6 w-6 mb-2" />
                    <span className="text-base font-semibold">Ir para o Caixa</span>
                    <span className="text-xs font-normal text-muted-foreground">Gerenciar caixa diário</span>
                </Button>
            </Link>
            <Link href="/financial" passHref>
                <Button size="lg" className="w-full h-24 flex-col items-start justify-start p-4" variant="outline">
                    <TrendingUp className="h-6 w-6 mb-2" />
                    <span className="text-base font-semibold">Financeiro</span>
                    <span className="text-xs font-normal text-muted-foreground">Ver relatórios</span>
                </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Saldos Atuais</CardTitle>
            <CardDescription>Visão geral dos seus caixas e contas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="font-medium">Caixa Diário</span>
                <span className="font-bold">R$ 144,00</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="font-medium">Caixa 02 (Secundário)</span>
                <span className="font-bold">R$ 1.950,00</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="font-medium">Conta Bancária</span>
                <span className="font-bold">R$ 974,34</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <footer className="flex justify-center p-4 mt-auto">
        <span className="text-xs text-muted-foreground">{version}</span>
      </footer>
    </div>
  );
}
