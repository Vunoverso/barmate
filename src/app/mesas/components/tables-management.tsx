"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, MessageCircle, QrCode, Trash2, Printer, Check } from "lucide-react";
import { getTables, saveTables } from "@/lib/data-access";
import type { Table } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const slugChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const makeSlug = () => {
  let slug = "";
  for (let i = 0; i < 6; i += 1) {
    slug += slugChars[Math.floor(Math.random() * slugChars.length)];
  }
  return slug.toLowerCase();
};

export default function TablesManagement() {
  const [tables, setTables] = useState<Table[]>([]);
  const [tableNumber, setTableNumber] = useState("");
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [printingTable, setPrintingTable] = useState<Table | null>(null);
  const [barName, setBarName] = useState("Meu Bar");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setTables(getTables());
    const loadSession = async () => {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        if (!response.ok) return;
        const session = await response.json() as { user?: { organizationId?: string } };
        setOrganizationId(session.user?.organizationId ?? null);
      } catch {
        setOrganizationId(null);
      }
    };
    void loadSession();
  }, []);

  const activeCount = useMemo(() => tables.filter((table) => table.isActive).length, [tables]);

  const saveAndSync = async (nextTables: Table[]) => {
    setTables(nextTables);
    await saveTables(nextTables);
  };

  const buildTableUrl = (table: Table) => {
    if (typeof window === "undefined") return "";
    const baseUrl = `${window.location.origin}/m/${table.slug}`;
    if (!organizationId) return baseUrl;
    return `${baseUrl}?org=${encodeURIComponent(organizationId)}`;
  };

  const handleCreateTable = async () => {
    const normalizedNumber = tableNumber.trim();
    if (!normalizedNumber) {
      toast({ title: "Informe o número da mesa", variant: "destructive" });
      return;
    }
    if (tables.some((table) => table.number.toLowerCase() === normalizedNumber.toLowerCase())) {
      toast({ title: "Mesa já existe", description: "Use outro número/identificação.", variant: "destructive" });
      return;
    }
    const now = new Date().toISOString();
    const nextTable: Table = {
      id: `tbl-${Date.now()}`,
      slug: makeSlug(),
      number: normalizedNumber,
      label: `Mesa ${normalizedNumber}`,
      description: null,
      defaultGuestCount: null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    await saveAndSync([nextTable, ...tables]);
    setTableNumber("");
    toast({ title: "✓ Mesa criada!", description: "QR disponível abaixo." });
  };

  const handleToggleActive = async (target: Table) => {
    const now = new Date().toISOString();
    const nextTables = tables.map((table) =>
      table.id === target.id ? { ...table, isActive: !table.isActive, updatedAt: now } : table,
    );
    await saveAndSync(nextTables);
  };

  const handleDelete = async (target: Table) => {
    const nextTables = tables.filter((table) => table.id !== target.id);
    await saveAndSync(nextTables);
    setDeletingId(null);
    toast({ title: "Mesa removida" });
  };

  const copyTableLink = async (table: Table) => {
    const url = buildTableUrl(table);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(table.id);
      toast({ title: "✓ Link copiado!" });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({ title: "Erro ao copiar", variant: "destructive" });
    }
  };

  const shareViaWhatsApp = (table: Table) => {
    const url = buildTableUrl(table);
    const text = `Olá! Este é o link da ${table.label || `Mesa ${table.number}`}. Abra no celular para acessar o cardápio e pedir direto: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <div className="rounded-lg bg-white dark:bg-slate-900 p-2">
              <QrCode className="h-6 w-6 text-blue-600" />
            </div>
            Mesas e QR Codes
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Simples: crie mesas, imprima etiquetas QR e compartilhe via WhatsApp
          </p>
          
          <div className="space-y-2">
            <Label htmlFor="table-number" className="text-sm font-semibold">Nova Mesa</Label>
            <div className="flex gap-2">
              <Input
                id="table-number"
                placeholder="Ex: 01, Varanda, Bistrô..."
                value={tableNumber}
                onChange={(event) => setTableNumber(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleCreateTable();
                  }
                }}
                className="text-base"
              />
              <Button 
                onClick={() => void handleCreateTable()}
                className="whitespace-nowrap bg-blue-600 hover:bg-blue-700"
              >
                + Adicionar
              </Button>
            </div>
          </div>

          <div className="flex gap-4 text-xs font-semibold">
            <div className="flex items-center gap-2 rounded-lg bg-white dark:bg-slate-900 px-3 py-2">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <span>Total: {tables.length}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-white dark:bg-slate-900 px-3 py-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span>Ativas: {activeCount}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {tables.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <QrCode className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Nenhuma mesa. Adicione a primeira acima!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tables.map((table) => {
            const url = buildTableUrl(table);
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(url)}`;
            const isCopied = copiedId === table.id;

            return (
              <Card key={table.id} className="overflow-hidden transition-all hover:shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg">{table.label || `Mesa ${table.number}`}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">{table.slug}</p>
                    </div>
                    <Badge 
                      variant={table.isActive ? "default" : "secondary"}
                      className={table.isActive ? "bg-green-500/20 text-green-700 dark:text-green-400" : ""}
                    >
                      {table.isActive ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="flex justify-center rounded-lg bg-slate-50 dark:bg-slate-900 p-2">
                    <img src={qrUrl} alt={`QR ${table.number}`} className="h-40 w-40" />
                  </div>

                  <div className="flex gap-1">
                    <Input 
                      value={url} 
                      readOnly 
                      className="text-xs h-8 bg-muted flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={() => void copyTableLink(table)}
                    >
                      {isCopied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      size="sm" 
                      className="gap-1 bg-green-600 hover:bg-green-700"
                      onClick={() => shareViaWhatsApp(table)}
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="gap-1"
                      onClick={() => setPrintingTable(table)}
                    >
                      <Printer className="h-4 w-4" />
                      <span className="hidden sm:inline">Imprimir</span>
                    </Button>
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => void handleToggleActive(table)}
                    >
                      {table.isActive ? "Inativar" : "Ativar"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                      onClick={() => setDeletingId(table.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {printingTable && (
        <Dialog open={!!printingTable} onOpenChange={(open) => {
          if (!open) setPrintingTable(null);
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>📋 Etiqueta QR - Mesa {printingTable.number}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bar-name-input">Nome do Estabelecimento</Label>
                <Input
                  id="bar-name-input"
                  placeholder="Ex: Meu Bar"
                  value={barName}
                  onChange={(e) => setBarName(e.target.value)}
                  className="text-base"
                />
              </div>
              
              <div className="flex justify-center">
                <div className="flex flex-col items-center gap-3 p-4 bg-white text-black rounded-lg border-2" style={{ width: "280px" }}>
                  <p className="text-base font-bold">{barName}</p>
                  <p className="text-[11px] text-gray-600">Cardápio Digital</p>
                  <div className="border-t w-full" />
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(buildTableUrl(printingTable))}`} 
                    alt="QR Code" 
                    className="w-40 h-40"
                  />
                  <div className="border-t w-full" />
                  <p className="text-2xl font-black">MESA {printingTable.number}</p>
                </div>
              </div>
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setPrintingTable(null)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  const printWindow = window.open("", "", "height=500,width=500");
                  if (printWindow && printingTable) {
                    const html = `<!DOCTYPE html><html><head><title>Etiqueta QR - Mesa ${printingTable.number}</title><style>body { margin: 0; padding: 20px; font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f5f5f5; } .label { width: 280px; padding: 20px; background: white; color: black; border: 2px solid #333; text-align: center; } .bar-name { font-size: 16px; font-weight: bold; margin: 0; } .subtitle { font-size: 10px; color: #666; margin: 2px 0 10px; } .divider { border-top: 2px solid #333; margin: 10px 0; } .qr { width: 160px; height: 160px; margin: 10px auto; } .table-number { font-size: 28px; font-weight: bold; margin: 10px 0; }</style></head><body><div class="label"><p class="bar-name">${barName}</p><p class="subtitle">Cardápio Digital</p><div class="divider"></div><img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(buildTableUrl(printingTable))}" alt="QR" class="qr"><div class="divider"></div><p class="table-number">MESA ${printingTable.number}</p></div></body></html>`;
                    printWindow.document.write(html);
                    printWindow.document.close();
                    printWindow.print();
                  }
                }}
                className="gap-2"
              >
                <Printer className="h-4 w-4" /> Imprimir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {deletingId && (
        <Dialog open={!!deletingId} onOpenChange={(open) => {
          if (!open) setDeletingId(null);
        }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Remover Mesa?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Tem certeza? Esta ação não pode ser desfeita.
            </p>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setDeletingId(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  const table = tables.find((t) => t.id === deletingId);
                  if (table) void handleDelete(table);
                }}
              >
                Remover
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
