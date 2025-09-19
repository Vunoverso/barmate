
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/constants";

interface SummaryTableProps {
    data: {
        period: string;
        income: number;
        expenses: number;
        balance: number;
    }[];
    isBalanceVisible?: boolean;
}

export const SummaryTable = ({ data, isBalanceVisible = true }: SummaryTableProps) => (
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead>Período</TableHead>
                <TableHead className="text-right">Receita</TableHead>
                <TableHead className="text-right">Despesas</TableHead>
                <TableHead className="text-right">Balanço</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {data.length > 0 ? data.map(row => (
                <TableRow key={row.period}>
                    <TableCell className="font-medium capitalize">{row.period}</TableCell>
                    <TableCell className="text-right">{isBalanceVisible ? formatCurrency(row.income) : '******'}</TableCell>
                    <TableCell className="text-right text-destructive">{isBalanceVisible ? formatCurrency(row.expenses) : '******'}</TableCell>
                    <TableCell className={`text-right font-bold ${row.balance >= 0 ? 'text-green-600' : 'text-destructive'}`}>{isBalanceVisible ? formatCurrency(row.balance) : '******'}</TableCell>
                </TableRow>
            )) : (
                <TableRow><TableCell colSpan={4} className="h-24 text-center">Nenhum dado para este período.</TableCell></TableRow>
            )}
        </TableBody>
    </Table>
);
