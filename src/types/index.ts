
import type { LucideIcon } from 'lucide-react';

export type ProductCategory = {
  id: string;
  name: string;
  iconName: string;
  /** Optional ordering for digital menu (lower first). */
  displayOrder?: number;
  /** Hide entire category from public digital menu. */
  isVisibleInMenu?: boolean;
};

export interface Client {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  debtAmount?: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  stock?: number | null;
  isCombo?: boolean | null;
  comboItems?: number | null;
  /** Optional description shown in digital menu. */
  description?: string | null;
  /** Optional product image URL (Supabase Storage or external). */
  imageUrl?: string | null;
  /** Hide single product from public digital menu. */
  isVisibleInMenu?: boolean;
  /** Highlight in "recommended" rail of digital menu. */
  isFeatured?: boolean;
}

export interface OrderItem extends Product {
  lineItemId?: string;
  quantity: number;
  categoryName?: string; 
  categoryIconName?: string;
  claimedQuantity?: number; 
  isClaim?: boolean; 
  claimedFromId?: string;
  isDelivered?: boolean;
  isPreparing?: boolean; // Novo campo para controle de produção
  addedAt?: string; // ISO string of when the item was added
  forceKitchenVisible?: boolean; // Manual flag to show in kitchen even if old
  isPaid?: boolean; // Indica se o item individual já foi pago em uma separação de conta
  /** Quem lançou o item: 'staff' (garçom/operador) ou 'guest' (cliente via QR). */
  addedBy?: 'staff' | 'guest';
  /** Quando true, item ainda aguarda aprovação do garçom para virar pedido firme. */
  pendingApproval?: boolean;
  /** Observação livre escrita pelo cliente ao pedir (ex: "sem cebola"). */
  guestNote?: string | null;
}

export type PaymentMethod = 'cash' | 'credit' | 'debit' | 'pix';

export interface Payment {
  method: PaymentMethod;
  amount: number;
}

export interface Sale {
  id: string;
  timestamp: Date;
  items: OrderItem[];
  payments: Payment[];
  totalAmount: number;
  originalAmount: number;
  discountAmount: number;
  cashTendered?: number | null;
  changeGiven?: number | null;
  status: 'completed' | 'pending';
  leaveChangeAsCredit?: boolean | null;
}


export interface ActiveOrder {
  id: string;
  name: string;
  createdAt: Date;
  items: OrderItem[];
  status?: 'open' | 'paid';
  clientId?: string | null;
  clientName?: string | null;
  user_id?: string;
  isShared?: boolean;
  viewerCount?: number;
  updatedAt?: string;
  /** Mesa associada (cardápio digital). Mantido opcional para retrocompatibilidade. */
  tableId?: string | null;
  tableLabel?: string | null;
  /** Numero da comanda (display) opcionalmente fornecido pelo cliente ao escanear. */
  comandaNumber?: string | null;
}

export interface CashAdjustment {
  id: string;
  amount: number;
  type: 'in' | 'out'; // 'in' for suprimento, 'out' for sangria
  description: string;
  timestamp: string; // ISO String
  source?: 'secondary_cash' | 'bank_account'; // For 'in' types that are transfers
  destination?: 'secondary_cash' | 'bank_account'; // For 'out' types that are transfers
  isCorrection?: boolean;
}

export interface CashRegisterStatus {
  status: 'open' | 'closed';
  openingTime?: string; // ISO String
  openingBalance?: number;
  adjustments?: CashAdjustment[];
}

export interface SecondaryCashBox {
  baseBalance?: number;
}

export interface BankAccount {
  baseBalance?: number;
}


export interface FinancialEntry {
    id: string;
    description: string;
    amount: number;
    type: "expense" | "income";
    source: "daily_cash" | "secondary_cash" | "bank_account";
    timestamp: Date;
    saleId: string | null;
    adjustmentId: string | null;
    isCorrection?: boolean;
}

export interface TransactionFees {
  debitRate: number;
  creditRate: number;
  pixRate: number;
}

export interface GuestRequest {
  id: string;
  name: string;
  status: 'pending' | 'approved' | 'rejected';
  associatedOrderId?: string | null;
  intent?: 'create' | 'view';
  requestedAt: any; // Firestore Timestamp
  /** Mesa de origem quando o request veio do cardápio digital. */
  tableId?: string | null;
  tableLabel?: string | null;
  /** Numero da comanda fornecido pelo cliente (opcional). */
  comandaNumber?: string | null;
  /** Itens já pré-selecionados no carrinho do cliente (Fase 3). */
  cartItems?: OrderItem[];
  /** Tipo de requisição: 'service_call' para chamado de atendente, undefined para novo pedido. */
  requestType?: 'service_call';
  /** Razão do chamado de atendente. */
  reason?: 'waiter' | 'bill' | 'other';
  /** Mensagem associada ao chamado. */
  message?: string | null;
}

export interface Table {
  id: string;
  /** Slug curto (6 chars base32) usado no QR `/m/<slug>`. */
  slug: string;
  /** Numero/identificador da mesa exibido para o cliente. */
  number: string;
  /** Rótulo opcional ex: "Varanda 1". */
  label?: string | null;
  /** Descrição interna (não exibida ao cliente). */
  description?: string | null;
  /** Capacidade default. */
  defaultGuestCount?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ServiceCall {
  id: string;
  tableId?: string | null;
  tableLabel?: string | null;
  orderId?: string | null;
  guestName?: string | null;
  reason?: 'waiter' | 'bill' | 'other';
  message?: string | null;
  status: 'pending' | 'attended' | 'dismissed';
  createdAt: string;
}
