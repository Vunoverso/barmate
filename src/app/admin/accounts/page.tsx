
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Search, MoreHorizontal, Trash2, CheckCircle2, Ban, ArrowUpRight, Clock, Star, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import {
  subscribeToOrganizations,
  updateOrganizationStatus,
  deleteOrganizationData,
  timeAgo,
  type OrgDoc,
} from '@/lib/admin-data-access';

export default function AdminAccountsPage() {
  const [accounts, setAccounts] = useState<OrgDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [accountToDelete, setAccountToDelete] = useState<OrgDoc | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const unsub = subscribeToOrganizations(data => {
      setAccounts(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await updateOrganizationStatus(id, newStatus);
      toast({ title: "Status Atualizado", description: `A conta foi marcada como ${newStatus}.` });
    } catch {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const handleDeleteAccount = async () => {
    if (!accountToDelete) return;
    try {
      await deleteOrganizationData(accountToDelete.id);
      toast({ title: "Conta Exclu\u00edda", description: `${accountToDelete.tradeName} foi removido.`, variant: "destructive" });
    } catch {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    } finally {
      setAccountToDelete(null);
    }
  };

  const filteredAccounts = accounts.filter(acc =>
    acc.tradeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (acc.ownerName ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (acc.ownerEmail ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const trialCount = accounts.filter(a => a.status === 'trial').length;

  const trialDaysLeft = (org: OrgDoc) => {
    if (!org.trialEndsAt) return null;
    const diff = Math.ceil((new Date(org.trialEndsAt).getTime() - Date.now()) / 86400000);
    return diff > 0 ? diff : 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3 text-white">
            <Users className="h-8 w-8 text-orange-500" /> Gest\u00e3o de Organiza\u00e7\u00f5es
          </h1>
          <p className="text-zinc-400 font-medium">Controle de acesso e planos de todos os clientes.</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="border-orange-900 text-orange-500 font-black px-4 py-1">
            {trialCount} TRIALS ATIVOS
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
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="text-center py-12 text-zinc-600">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-bold uppercase text-xs">Nenhuma organiza\u00e7\u00e3o cadastrada ainda</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="uppercase font-bold text-[10px] tracking-widest border-zinc-800">
                  <TableHead className="text-zinc-400">Estabelecimento</TableHead>
                  <TableHead className="text-zinc-400">Dono / Contato</TableHead>
                  <TableHead className="text-zinc-400">Plano / Status</TableHead>
                  <TableHead className="text-zinc-400">Trial</TableHead>
                  <TableHead className="text-right text-zinc-400">A\u00e7\u00f5es</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.map((acc) => {
                  const daysLeft = trialDaysLeft(acc);
                  return (
                    <TableRow key={acc.id} className="border-zinc-800 hover:bg-zinc-800/50 group">
                      <TableCell>
                        <div className="font-black uppercase text-sm text-white">{acc.tradeName}</div>
                        <div className="text-[10px] text-zinc-500">ID: {acc.id}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-zinc-300 font-bold">{acc.ownerName ?? acc.ownerEmail ?? 'â€”'}</div>
                        <div className="text-[10px] text-zinc-500 uppercase">{timeAgo(acc.createdAt)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge className={`w-fit font-black uppercase text-[9px] ${acc.planId === 'pro' ? 'bg-orange-600' : 'bg-zinc-800'}`}>
                            {acc.planId}
                          </Badge>
                          <Badge variant="outline" className={`w-fit font-bold text-[10px] uppercase ${acc.status === 'active' ? 'border-green-900 text-green-500' : acc.status === 'trial' ? 'border-blue-900 text-blue-500' : 'border-zinc-700 text-zinc-500'}`}>
                            {acc.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {acc.status === 'trial' && daysLeft !== null ? (
                          <div className="flex items-center gap-2 text-blue-500">
                            <Clock className="h-3 w-3" />
                            <span className="text-xs font-black">{daysLeft}d restantes</span>
                          </div>
                        ) : (
                          <span className="text-zinc-600 text-xs">\u2014</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-white">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-white">
                            <DropdownMenuLabel className="text-[10px] uppercase text-zinc-500">Controles do Tenant</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(acc.id, 'active')} className="font-bold gap-2 cursor-pointer">
                              <CheckCircle2 className="h-4 w-4 text-green-500" /> Ativar Assinatura
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(acc.id, 'suspended')} className="font-bold gap-2 cursor-pointer">
                              <Ban className="h-4 w-4 text-orange-500" /> Suspender Acesso
                            </DropdownMenuItem>
                            {acc.status === 'trial' && (
                              <DropdownMenuItem className="font-bold gap-2 cursor-pointer text-blue-400">
                                <Star className="h-4 w-4" /> Estender Trial
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator className="bg-zinc-800" />
                            <DropdownMenuItem className="font-bold gap-2 cursor-pointer">
                              <ArrowUpRight className="h-4 w-4" /> Mascarar como Admin
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setAccountToDelete(acc)} className="font-bold gap-2 text-red-500 hover:bg-red-950 cursor-pointer">
                              <Trash2 className="h-4 w-4" /> Excluir permanentemente
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!accountToDelete} onOpenChange={() => setAccountToDelete(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-500 uppercase font-black">A\u00e7\u00e3o Irrevers\u00edvel!</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Voc\u00ea est\u00e1 removendo a organiza\u00e7\u00e3o <strong>{accountToDelete?.tradeName}</strong>. Todos os dados ser\u00e3o apagados do Firestore permanentemente.
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
