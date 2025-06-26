
"use client";

import type { Sale } from '@/types';
import { getSales, formatCurrency, PAYMENT_METHODS } from '@/lib/constants';
import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePickerWithRange } from '@/components/ui/date-picker-range'; 
import type { DateRange } from "react-day-picker";
import { addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Download, Filter, CalendarDays, ListFilter, MoreHorizontal, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ReportsClient() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30), 
    to: new Date(),
  });
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string[]>([]);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const handleSalesChange = () => {
      setSales(getSales());
    };
    handleSalesChange(); // Load initial sales
    window.addEventListener('salesChanged', handleSalesChange);
    return () => {
      window.removeEventListener('salesChanged', handleSalesChange);
    };
  }, []);

  const filteredSales = useMemo(() => {
    return sales
      .filter(sale => {
        const saleDate = new Date(sale.timestamp);
        if (dateRange?.from && saleDate < dateRange.from) return false;
        if (dateRange?.to && saleDate > addDays(dateRange.to, 1)) return false; 
        return true;
      })
      .filter(sale => {
        if (paymentMethodFilter.length === 0) return true;
        return paymentMethodFilter.includes(sale.paymentMethod);
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [sales, dateRange, paymentMethodFilter]);

  const totalRevenue = useMemo(() => {
    return filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  }, [filteredSales]);

  const totalSalesCount = filteredSales.length;

  const salesByPaymentMethod = useMemo(() => {
    const result: Record<string, { count: number, total: number }> = {};
    PAYMENT_METHODS.forEach(pm => result[pm.value] = { count: 0, total: 0 });
    filteredSales.forEach(sale => {
      if (result[sale.paymentMethod]) {
        result[sale.paymentMethod].count++;
        result[sale.paymentMethod].total += sale.totalAmount;
      }
    });
    return result;
  }, [filteredSales]);

  const confirmDeleteSale = (sale: Sale) => {
    setSaleToDelete(sale);
  };

  const handleDeleteSale = () => {
    if (!saleToDelete) return;

    // This is a temporary delete for the session as we use localStorage
    // In a real DB, this would be a "soft delete" or permanent removal.
    const updatedSales = sales.filter(s => s.id !== saleToDelete!.id);
    localStorage.setItem('barmate_sales', JSON.stringify(updatedSales));
    setSales(updatedSales); // Update local state to re-render

    toast({
      title: "Venda Removida",
      description: `A venda ID ${saleToDelete.id.substring(0,8)}... foi removida.`,
      variant: "destructive"
    });
    setSaleToDelete(null);
  };

  if (!isMounted) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Carregando relatórios...</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Aguarde um momento.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Relatório</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="mb-1 block">Período</Label>
            <DatePickerWithRange date={dateRange} onDateChange={setDateRange} className="w-full" />
          </div>
          <div>
            <Label className="mb-1 block">Método de Pagamento</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {paymentMethodFilter.length === 0
                    ? "Todos os Métodos"
                    : paymentMethodFilter.length === 1 
                      ? PAYMENT_METHODS.find(pm => pm.value === paymentMethodFilter[0])?.name
                      : `${paymentMethodFilter.length} selecionados`}
                  <ListFilter className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>Métodos de Pagamento</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {PAYMENT_METHODS.map((method) => (
                  <DropdownMenuCheckboxItem
                    key={method.value}
                    checked={paymentMethodFilter.includes(method.value)}
                    onCheckedChange={(checked) => {
                      setPaymentMethodFilter(prev => 
                        checked ? [...prev, method.value] : prev.filter(m => m !== method.value)
                      );
                    }}
                  >
                    <method.icon className="mr-2 h-4 w-4" />
                    {method.name}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="md:col-start-3 md:self-end">
            <Button className="w-full md:w-auto">
              <Download className="mr-2 h-4 w-4" /> Exportar Relatório
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Total no período filtrado
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{totalSalesCount}</div>
            <p className="text-xs text-muted-foreground">
              Total no período filtrado
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Detalhes das Vendas</CardTitle>
          <CardDescription>
            Lista de todas as vendas realizadas no período selecionado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID da Venda</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead>Método Pag.</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.length > 0 ? filteredSales.map(sale => (
                <TableRow key={sale.id}>
                  <TableCell className="font-medium">{sale.id.substring(0,8)}...</TableCell>
                  <TableCell>{format(new Date(sale.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                  <TableCell>{sale.items.reduce((sum, item) => sum + item.quantity, 0)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {PAYMENT_METHODS.find(pm => pm.value === sale.paymentMethod)?.name || sale.paymentMethod}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(sale.totalAmount)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuItem className="text-destructive" onClick={() => confirmDeleteSale(sale)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Remover
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Nenhuma venda encontrada para o período e filtros selecionados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
             Mostrando <strong>{filteredSales.length}</strong> vendas.
          </div>
        </CardFooter>
      </Card>

      {saleToDelete && (
        <AlertDialog open={!!saleToDelete} onOpenChange={() => setSaleToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Remoção de Venda</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover a venda ID "{saleToDelete.id.substring(0,8)}..." do relatório? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSaleToDelete(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteSale}
                className="bg-destructive hover:bg-destructive/90"
              >
                Remover Venda
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

// Dummy Label component if not available or for simplicity
const Label = ({ children, className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`} {...props}>
    {children}
  </label>
);
