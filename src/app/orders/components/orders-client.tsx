
"use client";

import type { Product, OrderItem, Sale, ActiveOrder, ProductCategory, Payment, FinancialEntry, Client } from '@/types';
import { getProducts, formatCurrency, getProductCategories, LUCIDE_ICON_MAP, addSale, getOpenOrders, saveOpenOrders, addFinancialEntry, getClients, saveClients, getArchivedOrders, saveArchivedOrders } from '@/lib/constants';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, MinusCircle, Trash2, Search, LayoutGrid, List, CheckCircle, ShoppingCart, PlusSquare, FileText, XCircle, Package, Edit, Merge, Wallet, Archive, UserPlus, Printer } from 'lucide-react';
import PaymentDialog from './payment-dialog';
import CreateOrderDialog from './create-order-dialog';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OrderStatement } from './order-statement';

const groupProductsByCategoryId = (products: Product[], categories: ProductCategory[]) => {
  if (!categories.length) return {};
  return products.reduce((acc, product) => {
    const category = categories.find(c => c.id === product.categoryId);
    const categoryName = category ? category.name : 'Outros';
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(product);
    return acc;
  }, {} as Record<string, Product[]>);
};

const updateOrderNameBasedOnTotal = (order: ActiveOrder): ActiveOrder => {
    const total = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (total >= 0) {
        const newName = order.name.replace(/ \((Com Crédito|Crédito de Troco)\)/, '');
        return { ...order, name: newName };
    }
    return order;
};


export default function OrdersClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [openOrders, setOpenOrders] = useState<ActiveOrder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isCreateOrderDialogOpen, setIsCreateOrderDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<ActiveOrder | null>(null);
  const [orderToArchive, setOrderToArchive] = useState<ActiveOrder | null>(null);
  const [orderToEdit, setOrderToEdit] = useState<ActiveOrder | null>(null);
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const [isCreditDialogOpen, setIsCreditDialogOpen] = useState(false);
  const [isAssociateClientDialogOpen, setIsAssociateClientDialogOpen] = useState(false);
  const [orderToPrint, setOrderToPrint] = useState<ActiveOrder | null>(null);
  const statementRef = useRef<HTMLDivElement>(null);


  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [activeDisplayCategory, setActiveDisplayCategory] = useState<string>('Todos');

 const fetchData = useCallback(() => {
    setIsLoading(true);
    const fetchedProducts = getProducts();
    const fetchedCategories = getProductCategories();
    const fetchedOrders = getOpenOrders();
    const fetchedClients = getClients();

    setProducts(fetchedProducts);
    setProductCategories(fetchedCategories);
    setOpenOrders(fetchedOrders);
    setClients(fetchedClients);

    if (currentOrderId && !fetchedOrders.some(o => o.id === currentOrderId)) {
      setCurrentOrderId(fetchedOrders.length > 0 ? fetchedOrders[0].id : null);
    } else if (!currentOrderId && fetchedOrders.length > 0) {
      setCurrentOrderId(fetchedOrders[0].id);
    } else if (fetchedOrders.length === 0) {
      setCurrentOrderId(null);
    }
    setIsLoading(false);
  }, [currentOrderId]);

  useEffect(() => {
    fetchData();
    window.addEventListener('storage', fetchData);
    return () => window.removeEventListener('storage', fetchData);
  }, [fetchData]);

  const filteredOpenOrders = useMemo(() => {
    return openOrders.filter(o => o.name.toLowerCase().includes(orderSearchTerm.toLowerCase()));
  }, [openOrders, orderSearchTerm]);

  const currentOrder = useMemo(() => {
    return openOrders.find(o => o.id === currentOrderId);
  }, [openOrders, currentOrderId]);

  const totalOpenOrdersValue = useMemo(() => {
    return openOrders
      .filter(order => order.status !== 'paid')
      .reduce((total, order) => {
        const orderTotal = order.items.reduce((orderSum, item) => orderSum + (item.price * item.quantity), 0);
        return total + orderTotal;
      }, 0);
  }, [openOrders]);

  const currentOrderItems = useMemo(() => {
    if (!currentOrder) return [];
    
    return currentOrder.items.map(item => {
        const productDetails = products.find(p => p.id === item.id);
        if (!productDetails) return item; 

        const category = productCategories.find(c => c.id === productDetails.categoryId);
        return { 
            ...item, 
            categoryName: category?.name, 
            categoryIconName: category?.iconName 
        };
    });
  }, [currentOrder, products, productCategories]);


  const filteredProducts = useMemo(() => {
    return products.filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase()));
  }, [products, productSearchTerm]);
  
  const productsByCategoryDisplay = useMemo(() => groupProductsByCategoryId(filteredProducts, productCategories), [filteredProducts, productCategories]);
  const displayCategories = useMemo(() => {
      if (!productCategories.length) return [];
      return Object.keys(productsByCategoryDisplay).sort();
  }, [productsByCategoryDisplay, productCategories]);

  
  useEffect(() => {
    if (displayCategories.length > 0 && (activeDisplayCategory === 'Todos' || !displayCategories.includes(activeDisplayCategory))) {
        setActiveDisplayCategory(displayCategories[0]);
    }
  }, [displayCategories, activeDisplayCategory]);


  const handleOpenCreateOrderDialog = useCallback(() => {
    setIsCreateOrderDialogOpen(true);
  }, []);

  const handleCreateNewOrder = useCallback((details: { name: string; clientId: string | null; }) => {
    const newOrderId = `order-${Date.now()}`;
    const newOrder: ActiveOrder = {
      id: newOrderId,
      name: details.name,
      clientId: details.clientId,
      items: [],
      createdAt: new Date(),
    };
    const updatedOrders = [...getOpenOrders(), newOrder];
    saveOpenOrders(updatedOrders);
    setCurrentOrderId(newOrderId); // Select the new order
    toast({ title: "Nova Comanda Criada", description: `${newOrder.name} pronta para itens.`});
  }, [toast]);

  const handleSelectOrder = useCallback((orderId: string) => {
    setCurrentOrderId(orderId);
  }, []);

  const handleEditOrder = useCallback(() => {
    const order = openOrders.find(o => o.id === currentOrderId);
    if (order) {
      setOrderToEdit(order);
    }
  }, [openOrders, currentOrderId]);
  
  const handleSaveOrderName = useCallback((orderId: string, newName: string) => {
      const updatedOrders = getOpenOrders().map(order => 
          order.id === orderId ? { ...order, name: newName } : order
      );
      saveOpenOrders(updatedOrders);
      setOrderToEdit(null);
      toast({ title: "Comanda Atualizada", description: `O nome foi alterado para "${newName}".` });
  }, [toast]);

  const confirmDeleteOrder = useCallback((order: ActiveOrder) => {
    setOrderToDelete(order);
  }, []);

  const handleDeleteOrder = useCallback(() => {
    if (!orderToDelete) return;
    
    const orderIdToDelete = orderToDelete.id;
    const orderName = orderToDelete.name;

    const oldOrders = getOpenOrders();
    const updatedOrders = oldOrders.filter(order => order.id !== orderIdToDelete);
    
    let nextSelectedId: string | null = null;
    if (currentOrderId === orderIdToDelete) {
        if (updatedOrders.length > 0) {
            const deletedIndex = oldOrders.findIndex(o => o.id === orderIdToDelete);
            nextSelectedId = updatedOrders[deletedIndex]?.id || updatedOrders[deletedIndex - 1]?.id || updatedOrders[0].id;
        }
    } else {
      nextSelectedId = currentOrderId;
    }
    
    saveOpenOrders(updatedOrders);
    setOrderToDelete(null);
    if (currentOrderId === orderIdToDelete) {
      setCurrentOrderId(nextSelectedId);
    }
    toast({ title: "Comanda Removida", description: `${orderName} foi removida.`, variant: "destructive" });
  }, [orderToDelete, currentOrderId, toast]);

    const confirmArchiveOrder = useCallback((order: ActiveOrder) => {
        setOrderToArchive(order);
    }, []);

    const handleArchiveOrder = useCallback(() => {
        if (!orderToArchive || !orderToArchive.clientId) return;

        // Save the order to the archived list
        const allArchivedOrders = getArchivedOrders();
        saveArchivedOrders([...allArchivedOrders, orderToArchive]);

        // Remove from open orders
        const oldOrders = getOpenOrders();
        const updatedOrders = oldOrders.filter(order => order.id !== orderToArchive.id);

        let nextSelectedId: string | null = null;
        if (currentOrderId === orderToArchive.id) {
            if (updatedOrders.length > 0) {
                const deletedIndex = oldOrders.findIndex(o => o.id === orderToArchive.id);
                nextSelectedId = updatedOrders[deletedIndex]?.id || updatedOrders[deletedIndex - 1]?.id || updatedOrders[0].id;
            }
        } else {
          nextSelectedId = currentOrderId;
        }

        saveOpenOrders(updatedOrders);
        setOrderToArchive(null);
        if (currentOrderId === orderToArchive.id) {
          setCurrentOrderId(nextSelectedId);
        }

        toast({
            title: "Comanda Arquivada como Dívida",
            description: `A comanda de ${orderToArchive.name} foi movida para o histórico de dívidas do cliente.`,
        });

    }, [orderToArchive, currentOrderId, toast]);
  
  const handleMergeOrders = useCallback((sourceOrderIds: string[]) => {
    if (!currentOrderId || sourceOrderIds.length === 0) return;
    
    const allOrders = getOpenOrders();
    let destinationOrder = allOrders.find(o => o.id === currentOrderId);
    if (!destinationOrder) return;
    
    const sourceOrders = allOrders.filter(o => sourceOrderIds.includes(o.id));
    const allItemsToMerge = [...destinationOrder.items, ...sourceOrders.flatMap(o => o.items)];

    const mergedItems = allItemsToMerge.reduce((acc, item) => {
        const isGroupable = !item.isCombo && !item.id.startsWith('combo-') && item.price > 0 && !item.id.startsWith('payment-') && !item.id.startsWith('credit-');
        const existingItem = isGroupable ? acc.find(i => i.id === item.id) : null;
        
        if (existingItem) {
            existingItem.quantity += item.quantity;
        } else {
            acc.push({ ...item });
        }
        return acc;
    }, [] as OrderItem[]);

    const updatedOrder: ActiveOrder = { ...destinationOrder, items: mergedItems };
    const finalOrders = allOrders
        .filter(o => !sourceOrderIds.includes(o.id))
        .map(o => o.id === currentOrderId ? updatedOrder : o);
            
    saveOpenOrders(finalOrders);
    setIsMergeDialogOpen(false);
    toast({ title: "Comandas Juntadas!", description: `${sourceOrderIds.length} comandas foram juntadas em "${destinationOrder.name}".`});
  }, [currentOrderId, toast]);


  const handleAddCredit = useCallback(({ amount, description, source }: { amount: number; description: string; source: 'permuta' | 'dinheiro' | 'cartao' | 'pix' }) => {
    if (!currentOrderId) {
        toast({ title: "Nenhuma comanda selecionada", variant: "destructive" });
        return;
    }

    const allOrders = getOpenOrders();
    const orderToUpdate = allOrders.find(o => o.id === currentOrderId);
    if (!orderToUpdate) return;
    
    const creditItem: OrderItem = {
        id: `credit-${Date.now()}`,
        lineItemId: `line-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: `Crédito: ${description}`,
        price: -amount, // Negative price for credit
        quantity: 1,
        categoryId: 'cat_outros',
        isCombo: false, 
        comboItems: null
    };

    const newName = `${orderToUpdate.name.replace(' (Com Crédito)', '').replace(' (Crédito de Troco)', '')} (Com Crédito)`;
    const updatedOrder = { ...orderToUpdate, items: [...orderToUpdate.items, creditItem], name: newName };
    const newOpenOrders = allOrders.map(order => order.id === currentOrderId ? updatedOrder : order);
    saveOpenOrders(newOpenOrders);

    if (source !== 'permuta') {
        const entrySource = source === 'dinheiro' ? 'daily_cash' : 'bank_account';
        const entry: Omit<FinancialEntry, 'id' | 'timestamp'> = {
            description: `Crédito para ${orderToUpdate.name}: ${description}`,
            amount: amount,
            type: 'income',
            source: entrySource,
            saleId: null,
            adjustmentId: null
        };
        addFinancialEntry(entry);

        toast({ title: "Crédito Adicionado e Registrado", description: `${formatCurrency(amount)} adicionado à comanda e registrado como entrada.` });
    } else {
        toast({ title: "Crédito Adicionado", description: `${formatCurrency(amount)} adicionado à comanda como permuta/cortesia.` });
    }

    setIsCreditDialogOpen(false);
  }, [currentOrderId, toast]);

    const handleAssociateClient = useCallback((orderId: string, clientId: string) => {
        const client = getClients().find(c => c.id === clientId);
        if (!client) return;

        const allOrders = getOpenOrders();
        const updatedOrders = allOrders.map(order => {
            if (order.id === orderId) {
                return { ...order, clientId: client.id, name: client.name };
            }
            return order;
        });

        saveOpenOrders(updatedOrders);
        toast({ title: "Cliente Associado", description: `A comanda foi associada a ${client.name}.` });
    }, [toast]);

  const addToOrder = useCallback((product: Product) => {
    if (!currentOrderId) {
      toast({ title: "Nenhuma comanda selecionada", description: "Crie ou selecione uma comanda para adicionar produtos.", variant: "destructive" });
      return;
    }
    
    const allOrders = getOpenOrders();
    const orderToUpdate = allOrders.find(order => order.id === currentOrderId);
    if (!orderToUpdate) return;
    
    let updatedItems: OrderItem[];
    
    const isNormalProduct = !product.isCombo;
    const existingItemIndex = isNormalProduct 
        ? orderToUpdate.items.findIndex(item => item.id === product.id && !item.isCombo && item.price === product.price)
        : -1;

    if (existingItemIndex > -1) {
        updatedItems = [...orderToUpdate.items];
        const existingItem = updatedItems[existingItemIndex];
        updatedItems[existingItemIndex] = { ...existingItem, quantity: existingItem.quantity + 1 };
    } else {
        const newItem: OrderItem = {
            ...product,
            lineItemId: `line-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            quantity: 1,
            claimedQuantity: 0,
        };
        updatedItems = [...orderToUpdate.items, newItem];
    }
    
    let updatedOrder: ActiveOrder = { ...orderToUpdate, items: updatedItems };

    const currentTotal = updatedOrder.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (updatedOrder.status === 'paid' && currentTotal > 0) {
      delete updatedOrder.status;
    }
    updatedOrder = updateOrderNameBasedOnTotal(updatedOrder);

    const newOpenOrders = allOrders.map(order => (order.id === currentOrderId ? updatedOrder : order));
    saveOpenOrders(newOpenOrders);
  }, [currentOrderId, toast]);
  

  const updateQuantity = useCallback((lineItemId: string, quantity: number) => {
    if (!currentOrderId) return;
    const allOrders = getOpenOrders();
    const updatedOrders = allOrders.map(order => {
        if (order.id === currentOrderId) {
            let updatedItems;
            if (quantity <= 0) {
                updatedItems = order.items.filter(item => item.lineItemId !== lineItemId);
            } else {
                updatedItems = order.items.map(item =>
                    item.lineItemId === lineItemId ? { ...item, quantity } : item
                );
            }
            let updatedOrder = { ...order, items: updatedItems };
            updatedOrder = updateOrderNameBasedOnTotal(updatedOrder);
            return updatedOrder;
        }
        return order;
    });
    saveOpenOrders(updatedOrders);
  }, [currentOrderId]);

  const removeFromOrder = useCallback((lineItemId: string) => {
    if (!currentOrderId) return;
    const allOrders = getOpenOrders();
    const updatedOrders = allOrders.map(order => {
        if (order.id === currentOrderId) {
            let updatedOrder = { ...order, items: order.items.filter(item => item.lineItemId !== lineItemId) };
            updatedOrder = updateOrderNameBasedOnTotal(updatedOrder);
            return updatedOrder;
        }
        return order;
    });
    saveOpenOrders(updatedOrders);
  }, [currentOrderId]);

  const handleClaimItem = useCallback((lineItemId: string) => {
    if (!currentOrderId) return;

    let orderToPotentiallyClose: ActiveOrder | null = null;
    const allOrders = getOpenOrders();
    
    const updatedOrdersList = allOrders.map(order => {
        if (order.id === currentOrderId) {
            const newItems = order.items.map(item => {
                if (item.lineItemId === lineItemId && item.isCombo) {
                    const claimed = item.claimedQuantity || 0;
                    const totalItems = (item.comboItems || 1) * item.quantity;
                    if (claimed < totalItems) {
                        return { ...item, claimedQuantity: claimed + 1 };
                    }
                }
                return item;
            });
            
            const updatedOrder: ActiveOrder = { ...order, items: newItems };
            
            const hasUnclaimedCombos = newItems.some(item => {
                if (!item.isCombo) return false;
                const totalComboItems = (item.comboItems || 1) * item.quantity;
                const claimed = item.claimedQuantity || 0;
                return claimed < totalComboItems;
            });

            if (updatedOrder.status === 'paid' && !hasUnclaimedCombos) {
                orderToPotentiallyClose = updatedOrder;
                return null;
            }
            
            return updatedOrder;
        }
        return order;
    }).filter(Boolean) as ActiveOrder[];

    if (orderToPotentiallyClose) {
        toast({ title: "Comanda Finalizada", description: `Todos os itens do combo de "${orderToPotentiallyClose.name}" foram liberados e a comanda foi fechada.`});
        const deletedIndex = allOrders.findIndex(o => o.id === currentOrderId);
        let nextSelectedId: string | null = null;
        if (updatedOrdersList.length > 0) {
            nextSelectedId = updatedOrdersList[deletedIndex]?.id || updatedOrdersList[deletedIndex - 1]?.id || updatedOrdersList[0].id;
        }
        setCurrentOrderId(nextSelectedId);
    }
    
    saveOpenOrders(updatedOrdersList);

  }, [currentOrderId, toast]);


  const { orderTotal, consumedTotal } = useMemo(() => {
    if (!currentOrderItems) return { orderTotal: 0, consumedTotal: 0 };
    const total = currentOrderItems.reduce((total, item) => total + item.price * item.quantity, 0);
    const consumed = currentOrderItems
      .filter(item => item.price > 0)
      .reduce((total, item) => total + item.price * item.quantity, 0);
    return { orderTotal: total, consumedTotal: consumed };
  }, [currentOrderItems]);
  
 const handlePayment = useCallback((details: { 
    sale: Omit<Sale, 'id' | 'timestamp' | 'name'>, 
    leaveChangeAsCredit: boolean,
    isPartial: boolean
  }) => {
    const { sale, isPartial, leaveChangeAsCredit } = details;
    const allOrders = getOpenOrders();
    const currentOrderForPayment = allOrders.find(o => o.id === currentOrderId);
    if (!currentOrderForPayment) {
      toast({ title: "Erro", description: "Nenhuma comanda selecionada para pagamento.", variant: "destructive"});
      return;
    }

    const saleName = currentOrderForPayment.name || 'Venda';
    
    addSale({ ...sale, name: saleName });
    
    if (isPartial) {
        const totalPaid = sale.payments.reduce((acc, p) => acc + p.amount, 0);
        const paymentItem: OrderItem = {
            id: `payment-${Date.now()}`,
            lineItemId: `line-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: `Pagamento Parcial (${sale.payments.map(p => p.method).join(', ')})`,
            price: -totalPaid,
            quantity: 1,
            categoryId: 'cat_outros',
            isCombo: false,
            comboItems: null
        };
        const updatedOrder: ActiveOrder = { ...currentOrderForPayment, items: [...currentOrderForPayment.items, paymentItem] };
        const newOpenOrders = allOrders.map(o => o.id === currentOrderId ? updatedOrder : o);
        saveOpenOrders(newOpenOrders);
        toast({ title: "Pagamento Parcial Recebido!", description: `${formatCurrency(totalPaid)} foi abatido da comanda.` });
    } else {
        // Full payment logic
        const hasUnclaimedCombos = currentOrderForPayment.items.some(item => {
            if (!item.isCombo) return false;
            const totalComboItems = (item.comboItems || 1) * item.quantity;
            const claimed = item.claimedQuantity || 0;
            return claimed < totalComboItems;
        });

        if (hasUnclaimedCombos) {
            // Keep order open, mark as paid
            const updatedOrder: ActiveOrder = { ...currentOrderForPayment, status: 'paid', items: sale.items };
            const newOpenOrders = allOrders.map(o => o.id === currentOrderId ? updatedOrder : o);
            saveOpenOrders(newOpenOrders);
            toast({ title: "Comanda Paga!", description: `A comanda foi paga, mas permanece aberta para liberação dos itens do combo.` });

        } else {
            // Full payment, close the order
            const currentIndex = allOrders.findIndex(o => o.id === currentOrderId);
            let nextOrdersState = allOrders.filter(order => order.id !== currentOrderId);
            let nextSelectedOrderId: string | null = null;
            
            if (leaveChangeAsCredit && sale.changeGiven && sale.changeGiven > 0) {
                const newCreditOrder: ActiveOrder = {
                    id: `order-credit-${Date.now()}`, name: `${saleName.replace(/ \((Com Crédito|Crédito de Troco)\)/, '')} (Crédito de Troco)`, items: [{
                        id: `credit-${Date.now()}`,
                        lineItemId: `line-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        name: `Crédito de Troco`, price: -sale.changeGiven, quantity: 1, categoryId: 'cat_outros', isCombo: false, comboItems: null,
                    }], createdAt: new Date(), clientId: currentOrderForPayment.clientId,
                };
                nextOrdersState.push(newCreditOrder);
                nextSelectedOrderId = newCreditOrder.id;
                toast({ title: "Comanda de Crédito Criada", description: `Uma nova comanda foi aberta para ${saleName} com um crédito de ${formatCurrency(sale.changeGiven)}.` });
            } else {
                if (nextOrdersState.length > 0) {
                    nextSelectedOrderId = nextOrdersState[currentIndex] ? nextOrdersState[currentIndex].id : nextOrdersState[nextOrdersState.length - 1].id;
                }
                if (!leaveChangeAsCredit) {
                     toast({
                        title: "Venda Concluída!",
                        description: `Venda de ${formatCurrency(sale.totalAmount)} (${saleName}) registrada com sucesso.`,
                        action: <CheckCircle className="text-green-500" />,
                    });
                }
            }
            saveOpenOrders(nextOrdersState);
            setCurrentOrderId(nextSelectedOrderId);
        }
    }
  }, [currentOrderId, toast]);
  

  const allowPartialPayment = true;

  const handlePrintOrder = useCallback(() => {
    if (currentOrder) {
        setOrderToPrint(currentOrder);
    }
  }, [currentOrder]);

  const handleActualPrint = () => {
    const node = statementRef.current;
    if (!node) {
        toast({ title: "Erro", description: "Não foi possível encontrar a comanda para imprimir.", variant: "destructive" });
        return;
    }

    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
        document.querySelectorAll('link[rel="stylesheet"], style').forEach(styleSheet => {
            printWindow.document.head.appendChild(styleSheet.cloneNode(true));
        });

        printWindow.document.body.innerHTML = node.outerHTML;

        const printSpecificStyles = printWindow.document.createElement('style');
        printSpecificStyles.innerHTML = `
            @page { size: 80mm auto; margin: 0; }
            body { 
                background: white !important; 
                margin: 0;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .printable-content {
                width: 76mm;
                margin: 0 auto !important;
                padding: 2mm !important;
                box-sizing: border-box !important;
                border-left: 1px dotted black !important;
                border-right: 1px dotted black !important;
                color: black !important;
            }
            /* Ensure all text within is black for printing */
            .printable-content * {
                color: black !important;
            }
        `;
        printWindow.document.head.appendChild(printSpecificStyles);
        
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }, 500); // Wait for styles to apply
    } else {
        toast({ title: "Erro de Pop-up", description: "Não foi possível abrir a janela de impressão. Verifique se pop-ups estão bloqueados.", variant: "destructive" });
    }
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Carregando dados...</p>
      </div>
    );
  }

  const renderOrderItems = () => {
    const elements: React.ReactNode[] = [];
    currentOrderItems.forEach((item, index) => {
        const isMarker = item.id.startsWith('payment-') || item.id.startsWith('credit-');
        const IconComponent = item.categoryIconName ? (LUCIDE_ICON_MAP[item.categoryIconName] || Package) : Package;
        const uniqueKey = item.lineItemId || `${item.id}-${index}`;

        if (item.isCombo) {
          const totalComboItems = (item.comboItems || 1) * item.quantity;
          const claimed = item.claimedQuantity || 0;
          const remaining = totalComboItems - claimed;
          elements.push(
            <li key={uniqueKey} className="flex flex-col gap-1.5 p-1.5 rounded-md border bg-muted/30">
              <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-x-2">
                <div className="flex-shrink-0">
                  <IconComponent className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium truncate text-xs leading-tight flex items-center gap-2">
                    {item.name}
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Combo</Badge>
                  </div>
                  <div className="text-[10px] text-muted-foreground">{formatCurrency(item.price)} x {item.quantity}</div>
                </div>
                <div className="flex items-center gap-0 shrink-0">
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => item.lineItemId && updateQuantity(item.lineItemId, item.quantity - 1)}>
                    <MinusCircle className="h-3 w-3" />
                  </Button>
                  <span className="w-5 text-center text-xs font-medium">{item.quantity}</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => item.lineItemId && updateQuantity(item.lineItemId, item.quantity + 1)}>
                    <PlusCircle className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive/80 h-6 w-6" onClick={() => item.lineItemId && removeFromOrder(item.lineItemId)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <div className="w-[60px] text-right shrink-0">
                  <p className="font-semibold text-xs">{formatCurrency(item.price * item.quantity)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pl-6">
                <div className="text-xs text-muted-foreground">
                  Liberados: <span className="font-semibold text-foreground">{claimed} de {totalComboItems}</span>
                </div>
                <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => item.lineItemId && handleClaimItem(item.lineItemId)} disabled={remaining <= 0}>
                  Liberar 1
                </Button>
              </div>
            </li>
          );
        } else {
            // Render the item itself (unified logic for non-combos)
            elements.push(
                <li key={uniqueKey} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-x-2 p-1.5 rounded-md border">
                  <div className="flex-shrink-0">
                    <IconComponent className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate text-xs leading-tight flex items-center gap-2">
                        {item.name}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{formatCurrency(item.price)}</div>
                  </div>
                  <div className="flex items-center gap-0 shrink-0">
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => item.lineItemId && updateQuantity(item.lineItemId, item.quantity - 1)} disabled={item.price < 0}>
                      <MinusCircle className="h-3 w-3" />
                    </Button>
                    <span className="w-5 text-center text-xs font-medium">{item.quantity}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => item.lineItemId && updateQuantity(item.lineItemId, item.quantity + 1)} disabled={item.price < 0}>
                      <PlusCircle className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive/80 h-6 w-6" onClick={() => item.lineItemId && removeFromOrder(item.lineItemId)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="w-[60px] text-right shrink-0">
                    <p className="font-semibold text-xs">{formatCurrency(item.price * item.quantity)}</p>
                  </div>
                </li>
            );
        }
        
        // If it's a marker, add a separator after it
        if (isMarker) {
            elements.push(
                <li key={`sep-${item.id}-${index}`} aria-hidden="true" className="!my-3">
                    <div className="flex items-center">
                        <div className="flex-grow border-t border-dashed"></div>
                        <span className="flex-shrink mx-2 text-[10px] text-muted-foreground uppercase">Novos Itens</span>
                        <div className="flex-grow border-t border-dashed"></div>
                    </div>
                </li>
            );
        }
    });
    return elements;
};

  return (
    <TooltipProvider>
      <div className="grid md:grid-cols-12 gap-4 h-[calc(100vh-100px)]">
        <div className="md:col-span-3 flex flex-col h-full">
          <Card className="flex-grow flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Comandas Abertas
                 <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                       <Button size="icon" variant="outline" className="h-8 w-8" onClick={handlePrintOrder} disabled={!currentOrder || currentOrder.items.length === 0}>
                            <Printer className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Imprimir Comanda</p></TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setIsMergeDialogOpen(true)} disabled={!currentOrderId || openOrders.length < 2}>
                        <Merge className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Juntar Comandas</p></TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon" variant="outline" className="h-8 w-8" onClick={handleEditOrder} disabled={!currentOrderId}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Editar Nome</p></TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                       <Button size="icon" className="h-8 w-8" onClick={handleOpenCreateOrderDialog}>
                        <PlusSquare className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Nova Comanda</p></TooltipContent>
                  </Tooltip>
                 </div>
              </CardTitle>
              <div className="flex items-center gap-2 pt-2">
                 <div className="relative flex-grow">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar..."
                      value={orderSearchTerm}
                      onChange={(e) => setOrderSearchTerm(e.target.value)}
                      className="pl-8 h-9"
                    />
                 </div>
                 <Tooltip>
                    <TooltipTrigger asChild>
                        <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={() => setIsCreditDialogOpen(true)} disabled={!currentOrderId}>
                            <Wallet className="h-4 w-4"/>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Adicionar Crédito</p></TooltipContent>
                 </Tooltip>
              </div>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden p-0">
              <ScrollArea className="h-full p-2">
                {filteredOpenOrders.length === 0 ? (
                  <p className="text-muted-foreground text-center py-10">Nenhuma comanda encontrada.</p>
                ) : (
                  <div className="space-y-2">
                    {filteredOpenOrders.map(order => {
                       const total = order.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
                       const isCredit = total < 0;
                       let variant: "secondary" | "outline" = currentOrderId === order.id ? "secondary" : "outline";
                       let customClass = "";
                       if (currentOrderId === order.id) {
                           if (isCredit) {
                               customClass = "bg-amber-400 dark:bg-amber-600 text-black dark:text-white border-amber-500 dark:border-amber-700 hover:bg-amber-500/90 dark:hover:bg-amber-600/90";
                           }
                       } else {
                           if (isCredit) {
                               customClass = "bg-amber-200/50 dark:bg-amber-800/30 border-amber-400/50 hover:bg-amber-200 dark:hover:bg-amber-800/50";
                           }
                       }

                      return (
                      <div
                        key={order.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSelectOrder(order.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            handleSelectOrder(order.id);
                          }
                        }}
                        className={cn(
                          buttonVariants({ variant }),
                          "w-full h-auto py-1 px-2 cursor-pointer group flex items-center justify-between",
                          customClass
                        )}
                      >
                        <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-2">
                              <div className="font-semibold text-xs truncate block max-w-full">{order.name}</div>
                              {order.status === 'paid' && <Badge variant="default" className="bg-green-600 hover:bg-green-700 h-4 text-[10px] px-1.5">Paga</Badge>}
                           </div>
                           <div className="text-[0.65rem] text-muted-foreground flex items-center gap-1.5">
                              <span>{order.items.length} item(s)</span>
                              <span>{format(new Date(order.createdAt), "dd/MM HH:mm", { locale: ptBR })}</span>
                           </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                           <div className="font-semibold text-xs">{formatCurrency(total)}</div>
                        </div>
                      </div>
                    )})}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
            <CardFooter className="p-2 border-t">
                 <div className="text-xs text-muted-foreground w-full">
                    {filteredOpenOrders.length} de {openOrders.length} comanda(s). Total: <span className="font-semibold text-primary">{formatCurrency(totalOpenOrdersValue)}</span>
                 </div>
            </CardFooter>
          </Card>
        </div>

        <div className="md:col-span-5 flex flex-col h-full">
          <Card className="flex-grow flex flex-col">
            <CardHeader>
              <CardTitle>Selecionar Produtos</CardTitle>
              <div className="flex items-center gap-2 pt-2">
                <Search className="h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Buscar produtos..."
                  value={productSearchTerm}
                  onChange={(e) => setProductSearchTerm(e.target.value)}
                  className="max-w-sm"
                  disabled={!currentOrderId}
                />
                <div className="ml-auto flex items-center gap-2">
                  <Button variant={viewMode === 'grid' ? 'secondary' : 'outline'} size="icon" onClick={() => setViewMode('grid')} disabled={!currentOrderId}>
                    <LayoutGrid className="h-5 w-5" />
                  </Button>
                  <Button variant={viewMode === 'list' ? 'secondary' : 'outline'} size="icon" onClick={() => setViewMode('list')} disabled={!currentOrderId}>
                    <List className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              {!currentOrderId && openOrders.length > 0 && <CardDescription className="text-destructive pt-2">Selecione uma comanda para adicionar produtos.</CardDescription>}
              {!currentOrderId && openOrders.length === 0 && <CardDescription className="text-destructive pt-2">Crie uma nova comanda para começar.</CardDescription>}
            </CardHeader>
            <Tabs value={activeDisplayCategory} onValueChange={setActiveDisplayCategory} className="flex-grow flex flex-col overflow-hidden">
              <div className="w-full overflow-x-auto pb-2 px-4">
                  <TabsList className="whitespace-nowrap">
                      <TabsTrigger value="Todos" disabled={!currentOrderId}>Todos</TabsTrigger>
                      {displayCategories.map(categoryName => (
                          <TabsTrigger key={categoryName} value={categoryName} disabled={!currentOrderId}>{categoryName}</TabsTrigger>
                      ))}
                  </TabsList>
              </div>
              <ScrollArea className="flex-grow p-4">
                {currentOrderId ? (
                  <>
                    <TabsContent value="Todos" className="mt-0">
                      <ProductDisplay products={filteredProducts} productCategories={productCategories} addToOrder={addToOrder} viewMode={viewMode} />
                    </TabsContent>
                    {displayCategories.map(categoryName => (
                      <TabsContent key={categoryName} value={categoryName} className="mt-0">
                        <ProductDisplay products={productsByCategoryDisplay[categoryName] || []} productCategories={productCategories} addToOrder={addToOrder} viewMode={viewMode} />
                      </TabsContent>
                    ))}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <FileText className="h-16 w-16 mb-4" />
                      <p>Selecione ou crie uma comanda</p>
                      <p>para visualizar os produtos.</p>
                  </div>
                )}
              </ScrollArea>
            </Tabs>
          </Card>
        </div>

        <div className="md:col-span-4 flex flex-col h-full">
          <Card className="flex-grow flex flex-col">
            <CardHeader>
              <div className="flex justify-between items-start">
                  <div className="flex-grow min-w-0">
                    <CardTitle className="flex items-center gap-2 truncate">
                      <ShoppingCart className="h-6 w-6 text-primary shrink-0" />
                      <span className="truncate">{currentOrder ? currentOrder.name : "Comanda"}</span>
                    </CardTitle>
                    <div className="text-sm text-muted-foreground pt-1 flex items-center gap-2">
                       {currentOrder ? (
                        <>
                          <span>{currentOrderItems.length} {currentOrderItems.length === 1 ? 'item' : 'itens'}</span>
                          <span className="text-xs">&bull;</span>
                          <span>{format(new Date(currentOrder.createdAt), "dd/MM HH:mm", { locale: ptBR })}</span>
                        </>
                       ) : ( <span>Nenhum item na comanda.</span> )}
                    </div>
                  </div>
                   <div className="flex flex-col items-end shrink-0 ml-2">
                        {currentOrder && orderTotal < 0 ? (
                          <div className="text-right">
                           <Badge variant="secondary" className="bg-amber-400 dark:bg-amber-600 text-black dark:text-white text-base">Em Crédito: {formatCurrency(Math.abs(orderTotal))}</Badge>
                           <p className="text-xs text-muted-foreground mt-1">Consumo: {formatCurrency(consumedTotal)}</p>
                          </div>
                        ) : (
                          currentOrder && <span className="text-primary font-bold text-xl">{formatCurrency(orderTotal)}</span>
                        )}
                        {currentOrder?.status === 'paid' && <Badge variant="default" className="bg-green-600 hover:bg-green-700 mt-1">PAGA</Badge>}
                        {currentOrder && !currentOrder.clientId && (
                            <Button variant="outline" size="sm" className="mt-2" onClick={() => setIsAssociateClientDialogOpen(true)}>
                                <UserPlus className="mr-2 h-4 w-4" />
                                Associar Cliente
                            </Button>
                        )}
                    </div>
              </div>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden p-0">
              <ScrollArea className="h-full p-4">
                {!currentOrderId ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <ShoppingCart className="h-16 w-16 mb-4 opacity-50" />
                      <p>Nenhuma comanda selecionada.</p>
                  </div>
                ) : currentOrderItems.length === 0 ? (
                  <p className="text-muted-foreground text-center py-10">Nenhum item nesta comanda.</p>
                ) : (
                  <ul className="space-y-2">
                    {renderOrderItems()}
                  </ul>
                )}
              </ScrollArea>
            </CardContent>
            <Separator />
            <CardFooter className="flex flex-col gap-2 p-2">
               <Button
                size="lg"
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                disabled={orderTotal === 0 || !currentOrderId || currentOrder?.status === 'paid'}
                onClick={() => setIsPaymentDialogOpen(true)}
              >
                Realizar Pagamento
              </Button>
              <div className="grid grid-cols-2 gap-2 w-full">
                <Button
                    variant="outline"
                    className="w-full"
                    disabled={!currentOrderId || !currentOrder?.clientId || orderTotal <= 0}
                    onClick={() => currentOrder && confirmArchiveOrder(currentOrder)}
                >
                    <Archive className="mr-2 h-4 w-4" />
                    Arquivar Dívida
                </Button>
                <Button
                    variant="destructive"
                    className="w-full"
                    disabled={!currentOrderId}
                    onClick={() => currentOrder && confirmDeleteOrder(currentOrder)}
                >
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancelar Comanda
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>

      <CreateOrderDialog
        isOpen={isCreateOrderDialogOpen}
        onOpenChange={setIsCreateOrderDialogOpen}
        onSubmit={handleCreateNewOrder}
        clients={clients}
      />
      
      {orderToEdit && (
        <EditOrderNameDialog
            isOpen={!!orderToEdit}
            onOpenChange={() => setOrderToEdit(null)}
            order={orderToEdit}
            onSave={handleSaveOrderName}
        />
      )}

       {currentOrder && (
          <MergeOrdersDialog
              isOpen={isMergeDialogOpen}
              onOpenChange={setIsMergeDialogOpen}
              currentOrder={currentOrder}
              allOrders={openOrders}
              onMerge={handleMergeOrders}
          />
       )}
       
      {currentOrder && (
        <AssociateClientDialog
          isOpen={isAssociateClientDialogOpen}
          onOpenChange={setIsAssociateClientDialogOpen}
          orderId={currentOrder.id}
          clients={clients}
          onAssociate={handleAssociateClient}
        />
      )}

        <AddCreditDialog
            isOpen={isCreditDialogOpen}
            onOpenChange={setIsCreditDialogOpen}
            onSave={handleAddCredit}
        />


      <PaymentDialog
        isOpen={isPaymentDialogOpen}
        onOpenChange={(open) => {
            if (!open) {
                setIsPaymentDialogOpen(false);
            }
        }}
        totalAmount={orderTotal}
        currentOrder={currentOrder}
        onSubmit={handlePayment}
        allowCredit={true}
        allowPartialPayment={allowPartialPayment}
      />

      {orderToDelete && (
        <AlertDialog open={!!orderToDelete} onOpenChange={() => setOrderToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover a comanda "{orderToDelete.name}"? Todos os itens serão perdidos. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteOrder}
                className="bg-destructive hover:bg-destructive/90"
              >
                Remover Comanda
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

        {orderToArchive && (
            <AlertDialog open={!!orderToArchive} onOpenChange={() => setOrderToArchive(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Arquivar Comanda como Dívida?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja arquivar a comanda "{orderToArchive.name}"? O valor de <strong className="text-foreground">{formatCurrency(orderTotal)}</strong> será adicionado à dívida do cliente e a comanda será removida das comandas em aberto.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleArchiveOrder}>
                            Sim, Arquivar Dívida
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        )}
      <Dialog open={!!orderToPrint} onOpenChange={(open) => { if (!open) setOrderToPrint(null) }}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Imprimir Comanda: {orderToPrint?.name}</DialogTitle>
                  <DialogDescription>
                      Pré-visualização da comanda para impressão ou envio.
                  </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                  <div ref={statementRef}>
                      {orderToPrint && <OrderStatement order={orderToPrint} />}
                  </div>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setOrderToPrint(null)}>Fechar</Button>
                  <Button onClick={handleActualPrint}>
                      <Printer className="mr-2 h-4 w-4" /> Imprimir
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

interface ProductDisplayProps {
  products: Product[];
  productCategories: ProductCategory[];
  addToOrder: (product: Product) => void;
  viewMode: 'grid' | 'list';
}

function ProductDisplay({ products, productCategories, addToOrder, viewMode }: ProductDisplayProps) {
  if (products.length === 0) {
    return <p className="text-muted-foreground text-center py-10">Nenhum produto encontrado.</p>;
  }
  
  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
        {products.map(product => {
          const category = productCategories.find(c => c.id === product.categoryId);
          const IconComponent = category ? (LUCIDE_ICON_MAP[category.iconName] || Package) : Package;
          return (
            <Card key={product.id} className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group" onClick={() => addToOrder(product)}>
              <div className="aspect-square bg-muted flex items-center justify-center p-2 group-hover:bg-muted/80 transition-colors relative">
                <IconComponent className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground group-hover:text-primary transition-colors" />
                {product.isCombo && <Badge className="absolute top-1 right-1 text-xs px-1.5 py-0.5" variant="secondary">Combo</Badge>}
              </div>
              <CardContent className="p-1.5 sm:p-2">
                <h3 className="font-medium truncate text-[11px] leading-tight">{product.name}</h3>
                <p className="text-primary font-semibold text-xs sm:text-sm">{formatCurrency(product.price)}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {products.map(product => {
        const category = productCategories.find(c => c.id === product.categoryId);
        const IconComponent = category ? (LUCIDE_ICON_MAP[category.iconName] || Package) : Package;
        const categoryName = category ? category.name : "Desconhecida";
        return (
          <Card key={product.id} className="flex items-center p-1.5 cursor-pointer hover:bg-muted/50 transition-colors group" onClick={() => addToOrder(product)}>
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-muted rounded-md flex items-center justify-center mr-2 group-hover:bg-muted/80 transition-colors">
              <IconComponent className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="flex-grow">
              <div className="font-medium text-xs sm:text-sm flex items-center gap-2 truncate">
                {product.name}
                {product.isCombo && <Badge variant="secondary" className="text-xs px-1.5 py-0">Combo</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">{categoryName}</p>
            </div>
            <p className="text-primary font-semibold text-sm sm:text-base">{formatCurrency(product.price)}</p>
          </Card>
        );
      })}
    </div>
  );
}

// --- Edit Order Name Dialog ---
interface EditOrderNameDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    order: ActiveOrder;
    onSave: (orderId: string, newName: string) => void;
}

function EditOrderNameDialog({ isOpen, onOpenChange, order, onSave }: EditOrderNameDialogProps) {
    const [name, setName] = useState('');
    const { toast } = useToast();

    useEffect(() => {
        if (order) {
            setName(order.name);
        }
    }, [order]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast({ title: "Nome Inválido", description: "O nome da comanda não pode ser vazio.", variant: "destructive" });
            return;
        }
        onSave(order.id, name.trim());
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                    <DialogTitle>Editar Nome da Comanda</DialogTitle>
                    <DialogDescription>Altere o nome de identificação desta comanda.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <Label htmlFor="editOrderName">Novo Nome</Label>
                    <Input
                        id="editOrderName"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoFocus
                    />
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                    <Button type="submit">Salvar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
        </Dialog>
    );
}

// --- Merge Orders Dialog ---
interface MergeOrdersDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentOrder: ActiveOrder;
  allOrders: ActiveOrder[];
  onMerge: (sourceOrderIds: string[]) => void;
}

function MergeOrdersDialog({ isOpen, onOpenChange, currentOrder, allOrders, onMerge }: MergeOrdersDialogProps) {
    const [selectedOrders, setSelectedOrders] = useState<Record<string, boolean>>({});

    const otherOrders = allOrders.filter(o => o.id !== currentOrder.id);
    const orderIdsToMerge = Object.keys(selectedOrders).filter(id => selectedOrders[id]);

    useEffect(() => {
        if (isOpen) {
            setSelectedOrders({});
        }
    }, [isOpen]);

    const handleToggleOrder = (orderId: string) => {
        setSelectedOrders(prev => ({ ...prev, [orderId]: !prev[orderId] }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onMerge(orderIdsToMerge);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                    <DialogTitle>Juntar Comandas</DialogTitle>
                    <DialogDescription>
                        Selecione as comandas para juntar na comanda <strong>{currentOrder.name}</strong>. Os itens serão movidos e as comandas de origem serão removidas.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    {otherOrders.length > 0 ? (
                        <ScrollArea className="h-64 border rounded-md p-2">
                            <div className="space-y-2">
                                {otherOrders.map(order => (
                                    <div key={order.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50">
                                        <Checkbox
                                            id={`merge-${order.id}`}
                                            checked={selectedOrders[order.id] || false}
                                            onCheckedChange={() => handleToggleOrder(order.id)}
                                        />
                                        <Label htmlFor={`merge-${order.id}`} className="font-normal flex-grow cursor-pointer">
                                            <div className="flex justify-between items-center">
                                                <span>{order.name}</span>
                                                <span className="text-muted-foreground text-xs">{formatCurrency(order.items.reduce((acc, item) => acc + item.price * item.quantity, 0))}</span>
                                            </div>
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    ) : (
                        <p className="text-center text-muted-foreground py-10">Nenhuma outra comanda aberta para juntar.</p>
                    )}
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                    <Button type="submit" disabled={orderIdsToMerge.length === 0}>
                        <Merge className="mr-2 h-4 w-4" />
                        Juntar {orderIdsToMerge.length > 0 ? `(${orderIdsToMerge.length})` : ''} Comandas
                    </Button>
                </DialogFooter>
              </form>
            </DialogContent>
        </Dialog>
    );
}

// --- Add Credit Dialog ---
interface AddCreditDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (details: { amount: number; description: string; source: 'permuta' | 'dinheiro' | 'cartao' | 'pix' }) => void;
}

function AddCreditDialog({ isOpen, onOpenChange, onSave }: AddCreditDialogProps) {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [source, setSource] = useState<'permuta' | 'dinheiro' | 'cartao' | 'pix' | ''>('');
    const { toast } = useToast();

    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setDescription('');
            setSource('');
        }
    }, [isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const value = parseFloat(amount.replace(',', '.'));
        if (isNaN(value) || value <= 0) {
            toast({ title: "Valor Inválido", description: "O valor do crédito deve ser positivo.", variant: "destructive" });
            return;
        }
        if (!description.trim()) {
            toast({ title: "Descrição Obrigatória", description: "Forneça um motivo para o crédito.", variant: "destructive" });
            return;
        }
        if (!source) {
            toast({ title: "Origem Obrigatória", description: "Selecione a origem do valor do crédito.", variant: "destructive" });
            return;
        }
        onSave({ amount: value, description: description.trim(), source: source as any });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                    <DialogTitle>Adicionar Crédito à Comanda</DialogTitle>
                    <DialogDescription>
                        Insira um valor que será usado para abater futuras compras nesta comanda.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="credit-amount">Valor do Crédito (R$)</Label>
                        <Input
                            id="credit-amount"
                            type="number"
                            step="0.01"
                            placeholder="50,00"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            autoFocus
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="credit-source">Origem do Crédito</Label>
                        <Select onValueChange={(value) => setSource(value as any)} value={source}>
                            <SelectTrigger id="credit-source">
                                <SelectValue placeholder="Selecione a origem do valor..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="permuta">Permuta / Cortesia (Não afeta o caixa)</SelectItem>
                                <SelectItem value="dinheiro">Dinheiro (Entra no Caixa Diário)</SelectItem>
                                <SelectItem value="cartao">Cartão (Entra na Conta Bancária)</SelectItem>
                                <SelectItem value="pix">PIX (Entra na Conta Bancária)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="credit-description">Descrição/Motivo</Label>
                        <Input
                            id="credit-description"
                            placeholder="Ex: Troca de produto, adiantamento"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                    <Button type="submit">Adicionar Crédito</Button>
                </DialogFooter>
              </form>
            </DialogContent>
        </Dialog>
    );
}

interface AssociateClientDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  clients: Client[];
  onAssociate: (orderId: string, clientId: string) => void;
}

function AssociateClientDialog({ isOpen, onOpenChange, orderId, clients, onAssociate }: AssociateClientDialogProps) {
  const [selectedClientId, setSelectedClientId] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) {
      setSelectedClientId('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      toast({ title: "Nenhum cliente selecionado", variant: "destructive" });
      return;
    }
    onAssociate(orderId, selectedClientId);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Associar Cliente à Comanda</DialogTitle>
            <DialogDescription>
              Selecione um cliente cadastrado para vincular a esta comanda.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="client-associate-select">Cliente</Label>
            <Select onValueChange={setSelectedClientId} value={selectedClientId}>
              <SelectTrigger id="client-associate-select">
                <SelectValue placeholder="Selecione um cliente..." />
              </SelectTrigger>
              <SelectContent>
                {clients.length > 0 ? (
                  clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">Nenhum cliente cadastrado.</div>
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
            <Button type="submit" disabled={!selectedClientId}>Confirmar Associação</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

    

    

    



    