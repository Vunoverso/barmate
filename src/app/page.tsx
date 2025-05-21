
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HandCoins, Home, Package, LineChart, Settings, LogOut, LucideIcon, ShoppingBag } from 'lucide-react';


export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
      <Card className="w-full max-w-md text-center shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Bem-vindo ao BarMate!</CardTitle>
          <CardDescription className="text-lg text-muted-foreground pt-2">
            Seu sistema de gerenciamento de bar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            Utilize o menu lateral para navegar entre as funcionalidades: gerenciar comandas, cadastrar produtos, visualizar relatórios e ajustar configurações.
          </p>
          <Link href="/orders" passHref>
            <Button size="lg" className="w-full">
              <HandCoins className="mr-2 h-5 w-5" />
              Gerenciar Comandas
            </Button>
          </Link>
           <p className="text-xs text-muted-foreground pt-4">
            Esta é a página inicial. O antigo PDV/Caixa agora está em "Comandas".
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
