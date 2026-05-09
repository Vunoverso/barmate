"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ActiveOrder, Product, ProductCategory } from '@/types';
import { getArchivedOrders, removeCounterSaleDraft } from '@/lib/data-access';
import { formatCurrency } from '@/lib/constants';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Bell, BellRing, FileX, Loader2, Minus, Plus, ShoppingCart, UtensilsCrossed } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ORDER_POLL_INTERVAL_MS = 5000;

type MenuPayload = {
  products: Product[];
  categories: ProductCategory[];
  branding?: {
    allowGuestSelfOrder?: boolean;
    requireWaiterApproval?: boolean;
    whatsappNumber?: string | null;
  };
};

type CheckoutPaymentMethod = 'dinheiro' | 'pix' | 'debito' | 'credito';

type CheckoutData = {
  customerName: string;
  phone: string;
  cep: string;
  addressLine: string;
  addressNumber: string;
  neighborhood: string;
  city: string;
  state: string;
  complement: string;
  paymentMethod: CheckoutPaymentMethod;
  cashAmount: string;
};

export default function MyOrderClient({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<ActiveOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuProducts, setMenuProducts] = useState<Product[]>([]);
  const [menuCategories, setMenuCategories] = useState<ProductCategory[]>([]);
  const [allowGuestSelfOrder, setAllowGuestSelfOrder] = useState(true);
  const [requireWaiterApproval, setRequireWaiterApproval] = useState(true);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);
  const [isSubmittingCart, setIsSubmittingCart] = useState(false);
  const [isCallingWaiter, setIsCallingWaiter] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [guestCart, setGuestCart] = useState<Record<string, number>>({});
  const [checkout, setCheckout] = useState<CheckoutData>({
    customerName: '',
    phone: '',
    cep: '',
    addressLine: '',
    addressNumber: '',
    neighborhood: '',
    city: '',
    state: '',
    complement: '',
    paymentMethod: 'pix',
    cashAmount: '',
  });
  const prevItemsCount = useRef<number>(0);
  const { toast } = useToast();

  const normalizeDigits = (value: string) => value.replace(/\D/g, '');

  useEffect(() => {
    if (!order?.name) return;
    setCheckout((current) => {
      if (current.customerName.trim()) return current;
      return { ...current, customerName: order.name };
    });
  }, [order?.name]);

  const playNotificationSound = () => {
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, context.currentTime);
      gain.gain.setValueAtTime(0.1, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.5);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.5);
    } catch {
      // Ignora bloqueios de autoplay de áudio.
    }
  };

  useEffect(() => {
    if (!orderId) {
      setOrder(null);
      setError('Comanda inválida.');
      setIsLoading(false);
      return;
    }

    let active = true;

    const loadOrder = async () => {
      try {
        const response = await fetch(`/api/public/order/${encodeURIComponent(orderId)}`, {
          cache: 'no-store',
        });

        if (!response.ok) {
          const archivedOrders = getArchivedOrders();
          const foundArchived = archivedOrders.find((item) => item.id === orderId) ?? null;

          if (!active) return;
          setOrder(foundArchived);
          setError(foundArchived ? null : 'Acesso encerrado ou comanda não encontrada.');
          setIsLoading(false);
          return;
        }

        const data = await response.json() as ActiveOrder;
        if (!active) return;

        const currentItemsCount = (data.items ?? []).reduce((sum, item) => sum + item.quantity, 0);
        if (prevItemsCount.current > 0 && currentItemsCount > prevItemsCount.current) {
          playNotificationSound();
          toast({
            title: 'Comanda atualizada',
            description: 'Novo item adicionado na sua comanda.',
            action: <BellRing className="h-4 w-4 text-primary animate-bounce" />,
          });
        }
        prevItemsCount.current = currentItemsCount;

        setOrder(data);
        setError(null);
        setIsLoading(false);
      } catch {
        if (!active) return;
        setError('Erro ao conectar com o servidor.');
        setIsLoading(false);
      }
    };

    void loadOrder();
    const interval = setInterval(() => {
      void loadOrder();
    }, ORDER_POLL_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [orderId, toast]);

  const orderTotal = useMemo(() => {
    if (!order) return 0;
    return (order.items ?? []).reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [order]);

  const openedAt = order?.createdAt ? new Date(order.createdAt) : null;

  const cartEntries = useMemo(() => {
    return Object.entries(guestCart)
      .map(([productId, quantity]) => {
        const product = menuProducts.find((item) => item.id === productId);
        if (!product) return null;
        return { product, quantity };
      })
      .filter((entry): entry is { product: Product; quantity: number } => Boolean(entry && entry.quantity > 0));
  }, [guestCart, menuProducts]);

  const cartTotal = useMemo(() => {
    return cartEntries.reduce((sum, entry) => sum + entry.product.price * entry.quantity, 0);
  }, [cartEntries]);

  const loadMenu = async () => {
    if (!order) return;

    setIsLoadingMenu(true);
    try {
      const response = await fetch(`/api/public/order/${encodeURIComponent(order.id)}/menu`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        toast({ title: 'Não foi possível carregar o cardápio', variant: 'destructive' });
        return;
      }

      const data = await response.json() as MenuPayload;
      setMenuProducts(data.products ?? []);
      setMenuCategories(data.categories ?? []);
      setAllowGuestSelfOrder(data.branding?.allowGuestSelfOrder ?? true);
      setRequireWaiterApproval(data.branding?.requireWaiterApproval ?? true);
      setWhatsappNumber(normalizeDigits(data.branding?.whatsappNumber ?? ''));
      setIsMenuOpen(true);
    } catch {
      toast({ title: 'Erro ao carregar cardápio', variant: 'destructive' });
    } finally {
      setIsLoadingMenu(false);
    }
  };

  const changeCartQty = (productId: string, delta: number) => {
    setGuestCart((current) => {
      const nextQty = Math.max(0, Math.min(20, (current[productId] ?? 0) + delta));
      const next = { ...current };
      if (nextQty === 0) {
        delete next[productId];
      } else {
        next[productId] = nextQty;
      }
      return next;
    });
  };

  const submitGuestOrder = async (options?: { sendViaWhatsApp?: boolean }) => {
    if (!order || cartEntries.length === 0) return;

    setIsSubmittingCart(true);
    try {
      const response = await fetch(`/api/public/order/${encodeURIComponent(order.id)}/add-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartEntries.map((entry) => ({
            productId: entry.product.id,
            quantity: entry.quantity,
          })),
          checkout: {
            customerName: checkout.customerName.trim(),
            phone: normalizeDigits(checkout.phone),
            cep: normalizeDigits(checkout.cep),
            addressLine: checkout.addressLine.trim(),
            addressNumber: checkout.addressNumber.trim(),
            neighborhood: checkout.neighborhood.trim(),
            city: checkout.city.trim(),
            state: checkout.state.trim(),
            complement: checkout.complement.trim() || null,
            paymentMethod: checkout.paymentMethod,
            cashAmount: checkout.paymentMethod === 'dinheiro' ? Number(checkout.cashAmount.replace(',', '.')) || null : null,
          },
        }),
      });

      if (!response.ok) {
        toast({ title: 'Não foi possível enviar o pedido', variant: 'destructive' });
        return;
      }

      setGuestCart({});
      setIsCheckoutOpen(false);
      setIsMenuOpen(false);
      toast({
        title: 'Pedido enviado',
        description: requireWaiterApproval
          ? 'Seu pedido foi enviado e aguarda confirmação do atendente.'
          : 'Seu pedido foi adicionado na comanda.',
      });

      if (options?.sendViaWhatsApp) {
        if (!whatsappNumber) {
          toast({
            title: 'WhatsApp não configurado',
            description: 'Peça ao estabelecimento para configurar o número nas Configurações.',
            variant: 'destructive',
          });
          return;
        }

        const addressParts = [
          checkout.addressLine,
          checkout.addressNumber,
          checkout.neighborhood,
          checkout.city,
          checkout.state,
          checkout.cep ? `CEP ${checkout.cep}` : '',
          checkout.complement ? `Compl: ${checkout.complement}` : '',
        ].filter(Boolean);

        const paymentLine = checkout.paymentMethod === 'dinheiro'
          ? `Dinheiro${checkout.cashAmount ? ` (troco para R$ ${checkout.cashAmount})` : ''}`
          : checkout.paymentMethod === 'pix'
            ? 'PIX'
            : checkout.paymentMethod === 'debito'
              ? 'Cartão de débito'
              : 'Cartão de crédito';

        const itemsText = cartEntries
          .map((entry) => `- ${entry.quantity}x ${entry.product.name} (${formatCurrency(entry.product.price * entry.quantity)})`)
          .join('\n');

        const message = [
          `Olá! Novo pedido da comanda ${order.name}.`,
          '',
          `Cliente: ${checkout.customerName || order.name}`,
          `Telefone: ${checkout.phone || '-'}`,
          '',
          'Endereço:',
          addressParts.join(', ') || '-',
          '',
          `Pagamento: ${paymentLine}`,
          '',
          'Itens:',
          itemsText,
          '',
          `Total: ${formatCurrency(cartTotal)}`,
        ].join('\n');

        const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch {
      toast({ title: 'Erro ao enviar pedido', variant: 'destructive' });
    } finally {
      setIsSubmittingCart(false);
    }
  };

  const handleLookupCep = async () => {
    const cep = normalizeDigits(checkout.cep);
    if (cep.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!response.ok) return;
      const data = await response.json() as {
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
        erro?: boolean;
      };
      if (data.erro) return;

      setCheckout((current) => ({
        ...current,
        addressLine: current.addressLine || (data.logradouro ?? ''),
        neighborhood: current.neighborhood || (data.bairro ?? ''),
        city: current.city || (data.localidade ?? ''),
        state: current.state || (data.uf ?? ''),
      }));
    } catch {
      // Sem bloqueio do fluxo em caso de falha no ViaCEP.
    }
  };

  const validateCheckoutForWhatsApp = () => {
    if (!checkout.customerName.trim()) return 'Informe o nome do cliente.';
    if (normalizeDigits(checkout.phone).length < 10) return 'Informe um telefone válido.';
    if (normalizeDigits(checkout.cep).length !== 8) return 'Informe um CEP válido com 8 dígitos.';
    if (!checkout.addressLine.trim()) return 'Informe o endereço.';
    if (!checkout.addressNumber.trim()) return 'Informe o número do endereço.';
    if (!checkout.neighborhood.trim()) return 'Informe o bairro.';
    if (!checkout.city.trim()) return 'Informe a cidade.';
    if (!checkout.state.trim()) return 'Informe o estado.';
    if (checkout.paymentMethod === 'dinheiro' && (!checkout.cashAmount.trim() || Number(checkout.cashAmount.replace(',', '.')) <= 0)) {
      return 'Informe o valor em dinheiro para calcular o troco.';
    }
    return null;
  };

  const callWaiter = async () => {
    if (!order) return;

    setIsCallingWaiter(true);
    try {
      const response = await fetch(`/api/public/order/${encodeURIComponent(order.id)}/service-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'waiter' }),
      });

      if (!response.ok) {
        toast({ title: 'Não foi possível chamar atendente', variant: 'destructive' });
        return;
      }

      toast({ title: 'Atendente chamado', description: 'A equipe foi notificada.' });
    } catch {
      toast({ title: 'Erro de conexão', variant: 'destructive' });
    } finally {
      setIsCallingWaiter(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Carregando sua comanda...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 md:gap-8 md:p-8 min-h-screen">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto bg-muted rounded-full p-4 w-fit mb-4">
              <FileX className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle>Comanda indisponível</CardTitle>
            <CardDescription>
              {error || 'O acesso a esta comanda foi encerrado pelo estabelecimento ou ela foi fechada.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                removeCounterSaleDraft('barmate_last_order_id');
                window.location.href = '/guest/register';
              }}
            >
              Solicitar novo acesso
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-4 p-4 md:gap-8 md:p-8 min-h-screen bg-muted/30">
      <Card className="w-full max-w-xl shadow-xl border-t-4 border-t-primary">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 rounded-full p-4 w-fit mb-4">
            <ShoppingCart className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Sua Comanda: {order.name}</CardTitle>
          <CardDescription>
            Abertura: {openedAt ? format(openedAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'Data indisponível'}
          </CardDescription>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {order.tableLabel && <Badge variant="secondary">{order.tableLabel}</Badge>}
            {order.comandaNumber && <Badge variant="secondary">Comanda {order.comandaNumber}</Badge>}
            {order.status === 'paid' && <Badge className="bg-green-600">Comanda paga</Badge>}
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-base">Item</TableHead>
                <TableHead className="text-center text-base">Qtd.</TableHead>
                <TableHead className="text-right text-base">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.length > 0 ? (
                order.items.map((item, index) => (
                  <TableRow key={item.lineItemId || `${item.id}-${index}`}>
                    <TableCell>
                      <div className="font-semibold text-sm">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{formatCurrency(item.price)}</div>
                      {item.pendingApproval && (
                        <div className="text-[10px] mt-1 font-bold uppercase tracking-wide text-amber-600">
                          Aguardando confirmação
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-medium">{item.quantity}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(item.price * item.quantity)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-muted-foreground italic">
                    Nenhum item na sua comanda ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>

        <CardFooter className="flex-col gap-3 bg-muted/10 p-6">
          <Separator className="mb-1" />
          <div className="w-full flex justify-between text-xl font-black">
            <span>TOTAL:</span>
            <span className="text-primary">{formatCurrency(orderTotal)}</span>
          </div>

          <div className="grid w-full gap-2 sm:grid-cols-2">
            <Button onClick={() => void loadMenu()} disabled={isLoadingMenu}>
              <UtensilsCrossed className="mr-2 h-4 w-4" />
              {isLoadingMenu ? 'Carregando...' : 'Abrir Cardápio'}
            </Button>
            <Button variant="outline" onClick={() => void callWaiter()} disabled={isCallingWaiter}>
              <Bell className="mr-2 h-4 w-4" />
              {isCallingWaiter ? 'Chamando...' : 'Chamar Atendente'}
            </Button>
          </div>
        </CardFooter>
      </Card>

      <p className="text-[10px] uppercase tracking-widest text-muted-foreground text-center max-w-md mt-1 font-bold">
        Página atualizada automaticamente. Para fechar a conta, chame um atendente.
      </p>

      <Dialog open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cardápio da Mesa</DialogTitle>
            <DialogDescription>
              Escolha os itens e envie direto para sua comanda.
            </DialogDescription>
          </DialogHeader>

          {!allowGuestSelfOrder ? (
            <div className="rounded-md border p-4 text-sm text-muted-foreground">
              O autoatendimento está desativado neste estabelecimento. Use o botão "Chamar Atendente".
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-[1fr_260px]">
              <ScrollArea className="h-[50vh] pr-2">
                <div className="space-y-4">
                  {menuCategories.map((category) => {
                    const products = menuProducts.filter((product) => product.categoryId === category.id);
                    if (products.length === 0) return null;

                    return (
                      <div key={category.id} className="space-y-2">
                        <h4 className="text-sm font-black uppercase tracking-wide text-muted-foreground">{category.name}</h4>
                        <div className="space-y-2">
                          {products.map((product) => {
                            const qty = guestCart[product.id] ?? 0;
                            return (
                              <div key={product.id} className="rounded-md border p-3 flex items-center justify-between gap-3">
                                <div className="min-w-0 flex items-center gap-3">
                                  {product.imageUrl ? (
                                    <img
                                      src={product.imageUrl}
                                      alt={product.name}
                                      className="h-12 w-12 rounded-md object-cover border"
                                    />
                                  ) : null}
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold truncate">{product.name}</p>
                                    {product.description ? (
                                      <p className="text-xs text-muted-foreground break-words">{product.description}</p>
                                    ) : null}
                                    <p className="text-xs text-muted-foreground">{formatCurrency(product.price)}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => changeCartQty(product.id, -1)}>
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                  <span className="w-6 text-center text-sm font-bold">{qty}</span>
                                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => changeCartQty(product.id, 1)}>
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              <div className="rounded-md border bg-muted/20 p-3 flex flex-col gap-3 h-fit">
                <h4 className="text-sm font-black uppercase tracking-wide">Resumo</h4>
                <div className="text-xs text-muted-foreground">
                  {cartEntries.length === 0 ? 'Nenhum item selecionado.' : `${cartEntries.length} item(ns) no pedido.`}
                </div>
                <div className="text-lg font-black text-primary">{formatCurrency(cartTotal)}</div>
                {requireWaiterApproval && (
                  <div className="text-[11px] text-amber-700 bg-amber-100 rounded px-2 py-1">
                    Pedidos enviados pelo cliente ficam pendentes até confirmação do atendente.
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMenuOpen(false)}>Fechar</Button>
            <Button
              variant="secondary"
              onClick={() => setIsCheckoutOpen(true)}
              disabled={!allowGuestSelfOrder || cartEntries.length === 0}
            >
              Finalizar via WhatsApp
            </Button>
            <Button
              onClick={() => void submitGuestOrder()}
              disabled={!allowGuestSelfOrder || cartEntries.length === 0 || isSubmittingCart}
            >
              {isSubmittingCart ? 'Enviando...' : 'Enviar Pedido'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Finalizar Pedido no WhatsApp</DialogTitle>
            <DialogDescription>
              Preencha seus dados para enviar o pedido com endereço, pagamento e troco.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label>Nome</Label>
              <Input
                value={checkout.customerName}
                onChange={(e) => setCheckout((c) => ({ ...c, customerName: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Telefone</Label>
                <Input
                  value={checkout.phone}
                  onChange={(e) => setCheckout((c) => ({ ...c, phone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div className="grid gap-2">
                <Label>CEP</Label>
                <Input
                  value={checkout.cep}
                  onChange={(e) => setCheckout((c) => ({ ...c, cep: e.target.value }))}
                  onBlur={() => void handleLookupCep()}
                  placeholder="00000-000"
                />
              </div>
            </div>

            <div className="grid grid-cols-[1fr_120px] gap-3">
              <div className="grid gap-2">
                <Label>Endereço</Label>
                <Input
                  value={checkout.addressLine}
                  onChange={(e) => setCheckout((c) => ({ ...c, addressLine: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Número</Label>
                <Input
                  value={checkout.addressNumber}
                  onChange={(e) => setCheckout((c) => ({ ...c, addressNumber: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-2 col-span-2">
                <Label>Bairro</Label>
                <Input
                  value={checkout.neighborhood}
                  onChange={(e) => setCheckout((c) => ({ ...c, neighborhood: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>UF</Label>
                <Input
                  value={checkout.state}
                  onChange={(e) => setCheckout((c) => ({ ...c, state: e.target.value.toUpperCase().slice(0, 2) }))}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Cidade</Label>
              <Input
                value={checkout.city}
                onChange={(e) => setCheckout((c) => ({ ...c, city: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label>Complemento (opcional)</Label>
              <Input
                value={checkout.complement}
                onChange={(e) => setCheckout((c) => ({ ...c, complement: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Forma de Pagamento</Label>
                <Select
                  value={checkout.paymentMethod}
                  onValueChange={(value: CheckoutPaymentMethod) => setCheckout((c) => ({ ...c, paymentMethod: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="debito">Cartão de débito</SelectItem>
                    <SelectItem value="credito">Cartão de crédito</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {checkout.paymentMethod === 'dinheiro' ? (
                <div className="grid gap-2">
                  <Label>Troco para (R$)</Label>
                  <Input
                    value={checkout.cashAmount}
                    onChange={(e) => setCheckout((c) => ({ ...c, cashAmount: e.target.value }))}
                    placeholder="Ex: 100,00"
                  />
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label>Total</Label>
                  <Input value={formatCurrency(cartTotal)} readOnly />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCheckoutOpen(false)}>Cancelar</Button>
            <Button
              disabled={isSubmittingCart || cartEntries.length === 0}
              onClick={() => {
                const validation = validateCheckoutForWhatsApp();
                if (validation) {
                  toast({ title: validation, variant: 'destructive' });
                  return;
                }
                void submitGuestOrder({ sendViaWhatsApp: true });
              }}
            >
              {isSubmittingCart ? 'Enviando...' : 'Enviar via WhatsApp'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
