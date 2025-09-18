
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { HandCoins, Store, Banknote, TrendingUp } from "lucide-react";
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from "@/components/ui/table";

export default function DashboardPage() {
  const version = "v1.3.0";

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      {/* Top Row Cards */}
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita de Hoje</CardTitle>
            <span className="text-muted-foreground">💵</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 0,00</div>
            <p className="text-xs text-muted-foreground">Total de vendas no dia</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas de Hoje</CardTitle>
            <span className="text-muted-foreground">🛒</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+0</div>
            <p className="text-xs text-muted-foreground">Transações realizadas hoje</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <span className="text-muted-foreground">📊</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 0,00</div>
            <p className="text-xs text-muted-foreground">Valor médio por venda</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status do Caixa</CardTitle>
            <span className="text-muted-foreground">🟢</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Fechado</div>
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
            <CardTitle>Produtos Mais Vendidos</CardTitle>
            <CardDescription>Visão geral dos seus produtos mais populares.</CardDescription>
          </CardHeader>
          <CardContent>
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-right">Vendas</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow>
                        <TableCell>
                            <div className="font-medium">Cerveja Pilsen</div>
                            <div className="text-sm text-muted-foreground">Bebidas Alcoólicas</div>
                        </TableCell>
                        <TableCell className="text-right">120</TableCell>
                    </TableRow>
                     <TableRow>
                        <TableCell>
                            <div className="font-medium">X-Burger Clássico</div>
                            <div className="text-sm text-muted-foreground">Lanches</div>
                        </TableCell>
                        <TableCell className="text-right">85</TableCell>
                    </TableRow>
                     <TableRow>
                        <TableCell>
                            <div className="font-medium">Porção de Batata Frita</div>
                            <div className="text-sm text-muted-foreground">Lanches</div>
                        </TableCell>
                        <TableCell className="text-right">210</TableCell>
                    </TableRow>
                </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <footer className="flex justify-center p-4 mt-auto">
        <span className="text-xs text-muted-foreground">{version}</span>
      </footer>
    </div>
  );
}
