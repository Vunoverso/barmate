
"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Search, MoreHorizontal, Trash2, CheckCircle2, Ban, ArrowUpRight, Clock, Star } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export default function AdminAccountsPage() {
  const [accounts, setAccounts] = useState([
    { id: 'org-1', name: 'Boteco do João', owner: 'João Silva', plan: 'Pro', status: 'active', revenue: 199.00, createdAt: '2024-05-10', trialDays: 0 },
    { id: 'org-2', name: 'Bar da Esquina', owner: 'Maria Oliveira', plan: 'Essential', status: 'active', revenue: 99.00, createdAt: '2024-05-12', trialDays: 0 },
    { id: 'org-3', name: 'Chopp Express', owner: 'Carlos Souza', plan: 'Trial', status: 'trial', revenue: 0, createdAt: '2024-05-21', trialDays: 6 },
    { id: 'org-4', name: 'Night Club', owner: 'Ana Santos', plan: 'Pro', status: 'suspended', revenue: 0, createdAt: '2024-04-01', trialDays: 0 },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [accountToDelete, setAccountToDelete] = useState<any>(null);
  const { toast } = useToast();

  const handleUpdateStatus = (id: string, newStatus: string) => {
    setAccounts(prev => prev.map(acc => acc.id === id ? { ...acc, status: newStatus } : acc));
    toast({ title: "Status Atualizado", description: `A conta foi marcada como ${newStatus}.` });
  };

  const handleDeleteAccount = () => {
    if (!accountToDelete) return;
    setAccounts(prev => prev.filter(acc => acc.id !== accountToDelete.id));
    toast({ title: "Conta Excluída", description: `O estabelecimento ${accountToDelete.name} foi removido.`, variant: "destructive" });
    setAccountToDelete(null);
  };

  const filteredAccounts = accounts.filter(acc => 
    acc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    acc.owner.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3 text-white">
            <Users className="h-8 w-8 text-orange-500" /> Gestão de Organizações
          </h1>
          <p className="text-zinc-400 font-medium">Controle de acesso e planos de todos os clientes.</p>
        </div>
        <div className="flex gap-2">
            <Badge variant="outline" className="border-orange-900 text-orange-500 font-black px-4 py-1">
                {accounts.filter(a => a.status === 'trial').length} TRIALS ATIVOS
            </Badge>
        </div>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
              <Input 
                placeholder="Buscar bar ou dono..." 
                className="pl-8 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Button className="bg-orange-600 hover:bg-orange-700 text-white font-bold uppercase text-xs">Criar Tenant Manual</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="uppercase font-bold text-[10px] tracking-widest border-zinc-800">
                <TableHead className="text-zinc-400">Estabelecimento</TableHead>
                <TableHead className="text-zinc-400">Dono / Contato</TableHead>
                <TableHead className="text-zinc-400">Plano / Status</TableHead>
                <TableHead className="text-zinc-400">Trial</TableHead>
                <TableHead className="text-right text-zinc-400">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAccounts.map((acc) => (
                <TableRow key={acc.id} className="border-zinc-800 hover:bg-zinc-800/50 group">
                  <TableCell>
                    <div className="font-black uppercase text-sm text-white">{acc.name}</div>
                    <div className="text-[10px] text-zinc-500">ID: {acc.id}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-zinc-300 font-bold">{acc.owner}</div>
                    <div className="text-[10px] text-zinc-500 uppercase">{new Date(acc.createdAt).toLocaleDateString()}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                        <Badge className={`w-fit font-black uppercase text-[9px] ${acc.plan === 'Pro' ? 'bg-orange-600' : 'bg-zinc-800'}`}>
                        {acc.plan}
                        </Badge>
                        <Badge variant="outline" className={`w-fit font-bold text-[10px] uppercase ${acc.status === 'active' ? 'border-green-900 text-green-500' : (acc.status === 'trial' ? 'border-blue-900 text-blue-500' : 'border-zinc-700 text-zinc-500')}`}>
                        {acc.status}
                        </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    {acc.status === 'trial' ? (
                        <div className="flex items-center gap-2 text-blue-500">
                            <Clock className="h-3 w-3" />
                            <span className="text-xs font-black">{acc.trialDays}d restantes</span>
                        </div>
                    ) : (
                        <span className="text-zinc-600 text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-white"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-white">
                        <DropdownMenuLabel className="text-[10px] uppercase text-zinc-500">Controles do Tenant</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleUpdateStatus(acc.id, 'active')} className="font-bold gap-2 cursor-pointer"><CheckCircle2 className="h-4 w-4 text-green-500" /> Ativar Assinatura</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateStatus(acc.id, 'suspended')} className="font-bold gap-2 cursor-pointer"><Ban className="h-4 w-4 text-orange-500" /> Suspender Acesso</DropdownMenuItem>
                        {acc.status === 'trial' && (
                            <DropdownMenuItem className="font-bold gap-2 cursor-pointer text-blue-400"><Star className="h-4 w-4" /> Estender Trial</DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator className="bg-zinc-800" />
                        <DropdownMenuItem className="font-bold gap-2 cursor-pointer"><ArrowUpRight className="h-4 w-4" /> Mascarar como Admin</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setAccountToDelete(acc)} className="font-bold gap-2 text-red-500 hover:bg-red-950 cursor-pointer"><Trash2 className="h-4 w-4" /> Excluir permanentemente</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!accountToDelete} onOpenChange={() => setAccountToDelete(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-500 uppercase font-black">Ação Irreversível!</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Você está removendo a organização <strong>{accountToDelete?.name}</strong>. Todos os produtos, comandas e histórico financeiro serão apagados do Firestore permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-none hover:bg-zinc-700 text-white">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount} className="bg-red-600 hover:bg-red-700 border-none font-black uppercase">Excluir Tudo</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
