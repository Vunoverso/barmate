
import type { Product, Sale, PaymentMethod, ProductCategory, FinancialEntry, SecondaryCashBox, BankAccount, CashRegisterStatus, Payment, TransactionFees, ActiveOrder, Client, CashAdjustment, GuestRequest } from '@/types';
import { Beer, Wine, Martini, Coffee, UtensilsCrossed, CakeSlice, Package, Banknote, CreditCard, QrCode, Wallet, Users, type LucideIcon } from 'lucide-react';

// --- DATA KEYS ---
export const DATA_KEYS = [
    'barmate_productCategories_v2',
    'barmate_products_v2',
    'barmate_sales_v2',
    'barmate_openOrders_v2',
    'barmate_clients_v2',
    'barmate_financialEntries_v2',
    'barmate_cashRegisterStatus_v2',
    'barmate_transactionFees_v2',
    'barmate_counterSaleOrderItems_v2',
    'barmate_closedCashSessions_v2',
    'barmate_archivedOrders_v2',
    'barmate_guestSession_v2',
    'barName',
    'barCnpj',
    'barAddress',
    'barLogo',
    'barLogoScale'
];
export const KEY_PRODUCT_CATEGORIES = 'barmate_productCategories_v2';
export const KEY_PRODUCTS = 'barmate_products_v2';
export const KEY_SALES = 'barmate_sales_v2';
export const KEY_OPEN_ORDERS = 'barmate_openOrders_v2';
export const KEY_ARCHIVED_ORDERS = 'barmate_archivedOrders_v2';
export const KEY_CLIENTS = 'barmate_clients_v2';
export const KEY_FINANCIAL_ENTRIES = 'barmate_financialEntries_v2';
export const KEY_CASH_REGISTER_STATUS = 'barmate_cashRegisterStatus_v2';
export const KEY_TRANSACTION_FEES = 'barmate_transactionFees_v2';
export const KEY_CLOSED_SESSIONS = 'barmate_closedCashSessions_v2';
export const KEY_SECONDARY_CASH_BOX = 'barmate_secondaryCashBox_v2';
export const KEY_BANK_ACCOUNT = 'barmate_bankAccount_v2';
export const KEY_VISUALLY_REMOVED_FINANCIAL_ENTRIES = 'barmate_session_visuallyRemovedFinancialEntries';
export const KEY_VISUALLY_REMOVED_ADJUSTMENTS = 'barmate_session_visuallyRemovedAdjustments';


// --- INITIAL DATA (CLEAN STATE) ---
export const INITIAL_PRODUCT_CATEGORIES: ProductCategory[] = [
  { id: 'cat_cervejas', name: 'Cervejas', iconName: 'Beer' },
  { id: 'cat_destilados', name: 'Bebidas Alcoólicas', iconName: 'Martini' },
  { id: 'cat_vinhos', name: 'Vinhos', iconName: 'Wine' },
  { id: 'cat_sem_alcool', name: 'Sem Álcool', iconName: 'Coffee' },
  { id: 'cat_lanches', name: 'Lanches', iconName: 'UtensilsCrossed' },
  { id: 'cat_porcoes', name: 'Porções', iconName: 'UtensilsCrossed' },
  { id: 'cat_sobremesas', name: 'Sobremesas', iconName: 'CakeSlice' },
  { id: 'cat_outros', name: 'Outros', iconName: 'Package' },
];

export const INITIAL_PRODUCTS: Product[] = [
    // Cervejas
    { id: 'prod_1', name: 'Cerveja Pilsen 600ml', price: 12.00, categoryId: 'cat_cervejas', stock: 100 },
    { id: 'prod_2', name: 'Cerveja IPA Long Neck', price: 15.00, categoryId: 'cat_cervejas', stock: 50 },
    { id: 'prod_22', name: 'Balde com 6 Pilsen Long Neck', price: 60.00, categoryId: 'cat_cervejas', stock: 20, isCombo: true, comboItems: 6},

    // Bebidas Alcoólicas (Destilados/Drinks)
    { id: 'prod_6', name: 'Caipirinha de Limão', price: 18.00, categoryId: 'cat_destilados', stock: null },
    { id: 'prod_7', name: 'Gin Tônica', price: 28.00, categoryId: 'cat_destilados', stock: null },
    { id: 'prod_8', name: 'Mojito', price: 22.00, categoryId: 'cat_destilados', stock: null },
    { id: 'prod_19', name: 'Dose de Whisky 12 Anos', price: 30.00, categoryId: 'cat_destilados', stock: null },

    // Vinhos
    { id: 'prod_4', name: 'Taça de Vinho Tinto Seco', price: 25.00, categoryId: 'cat_vinhos', stock: null },
    { id: 'prod_5', name: 'Garrafa de Vinho Branco Suave', price: 80.00, categoryId: 'cat_vinhos', stock: 10 },

    // Sem Álcool
    { id: 'prod_9', name: 'Refrigerante Lata', price: 6.00, categoryId: 'cat_sem_alcool', stock: 200 },
    { id: 'prod_10', name: 'Água com Gás', price: 4.00, categoryId: 'cat_sem_alcool', stock: 150 },
    { id: 'prod_11', name: 'Suco Natural de Laranja', price: 9.00, categoryId: 'cat_sem_alcool', stock: null },

    // Lanches
    { id: 'prod_coxa', name: 'Coxa Creme', price: 12.00, categoryId: 'cat_lanches', stock: 30 },
    { id: 'prod_misto', name: 'Misto Quente', price: 10.00, categoryId: 'cat_lanches', stock: null },
    { id: 'prod_burger', name: 'X-Burguer Clássico', price: 22.00, categoryId: 'cat_lanches', stock: null },

    // Porções
    { id: 'prod_13', name: 'Batata Frita Especial', price: 35.00, categoryId: 'cat_porcoes', stock: null },
    { id: 'prod_14', name: 'Anéis de Cebola', price: 28.00, categoryId: 'cat_porcoes', stock: null },
    { id: 'prod_15', name: 'Frango a Passarinho', price: 45.00, categoryId: 'cat_porcoes', stock: null },

    // Sobremesas
    { id: 'prod_17', name: 'Petit Gâteau', price: 22.00, categoryId: 'cat_sobremesas', stock: 30 },
    { id: 'prod_18', name: 'Pudim de Leite', price: 15.00, categoryId: 'cat_sobremesas', stock: 25 },

    // Outros
    { id: 'prod_20', name: 'Couvert Artístico', price: 10.00, categoryId: 'cat_outros', stock: null },
    { id: 'prod_21', name: 'Taxa de Serviço (10%)', price: 0, categoryId: 'cat_outros', stock: null },
];

export const INITIAL_SALES: Sale[] = [];
export const INITIAL_OPEN_ORDERS: ActiveOrder[] = [];
export const INITIAL_ARCHIVED_ORDERS: ActiveOrder[] = [];
export const INITIAL_CLIENTS: Client[] = [];
export const INITIAL_FINANCIAL_ENTRIES: FinancialEntry[] = [];
export const INITIAL_CASH_REGISTER_STATUS: CashRegisterStatus = { status: 'closed', adjustments: [] };
export const INITIAL_SECONDARY_CASH_BOX: SecondaryCashBox = { baseBalance: 0 };
export const INITIAL_BANK_ACCOUNT: BankAccount = { baseBalance: 0 };
export const INITIAL_TRANSACTION_FEES: TransactionFees = { debitRate: 1.99, creditRate: 4.99, pixRate: 0.99 };


// --- UI Helpers ---

export const LUCIDE_ICON_MAP: Record<string, LucideIcon> = {
  Beer, Wine, Martini, Coffee, UtensilsCrossed, CakeSlice, Package, Wallet, Users
};

export const PAYMENT_METHODS: { name: string; value: PaymentMethod; icon: LucideIcon }[] = [
  { name: 'Dinheiro', value: 'cash', icon: Banknote },
  { name: 'Cartão de Débito', value: 'debit', icon: CreditCard },
  { name: 'Cartão de Crédito', value: 'credit', icon: CreditCard },
  { name: 'PIX', value: 'pix', icon: QrCode },
];

export function formatCurrency(value: number) {
  if (typeof value !== 'number') return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const SOURCE_MAP: Record<FinancialEntry['source'], string> = {
  daily_cash: 'Caixa Diário',
  secondary_cash: 'Caixa 02',
  bank_account: 'Conta Bancária',
};
