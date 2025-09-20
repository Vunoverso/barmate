
import type { Product, Sale, PaymentMethod, ProductCategory, FinancialEntry, SecondaryCashBox, BankAccount, CashRegisterStatus, Payment, TransactionFees, CashAdjustment, OrderItem, ActiveOrder } from '@/types';
import { Beer, Wine, Martini, Coffee, UtensilsCrossed, CakeSlice, CircleDollarSign, CreditCard, QrCode, Package, Banknote, type LucideIcon, Wallet } from 'lucide-react';
import { supabase } from './supabaseClient';

// --- Generic LocalStorage/Supabase Helpers ---

const getFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
    if (typeof window === 'undefined') return defaultValue;
    const storedValue = window.localStorage.getItem(key);
    try {
        return storedValue ? JSON.parse(storedValue) : defaultValue;
    } catch (error) {
        console.error(`Error parsing localStorage key "${key}":`, error);
        return defaultValue;
    }
};

const saveToLocalStorage = <T,>(key: string, value: T) => {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
        window.dispatchEvent(new Event('storage'));
    } catch (error) {
        console.error(`Error saving to localStorage key "${key}":`, error);
    }
};

const getFromSupabase = async <T,>(table: string, key: string, defaultValue: T): Promise<T> => {
    if (!supabase) return getFromLocalStorage(key, defaultValue);
    try {
        const { data, error } = await supabase.from(table).select('*').eq('id', key).single();
        if (error && error.code !== 'PGRST116') throw error; // 'PGRST116' is "JSON object requested, but row not found"
        return data ? (data as any).data : defaultValue;
    } catch (error) {
        console.error(`Error fetching from Supabase table "${table}" key "${key}":`, error);
        return getFromLocalStorage(key, defaultValue); // Fallback
    }
}

const saveToSupabase = async (table: string, key: string, value: any): Promise<void> => {
    window.dispatchEvent(new Event('storage')); // Optimistic update
    if (!supabase) {
        saveToLocalStorage(key, value);
        return;
    }
    try {
        const { error } = await supabase.from(table).upsert({ id: key, data: value }, { onConflict: 'id' });
        if (error) throw error;
    } catch (error) {
        console.error(`Error saving to Supabase table "${table}" key "${key}":`, error);
    }
}

export const INITIAL_PRODUCT_CATEGORIES: ProductCategory[] = [
    { id: 'cat_alcoolicas', name: 'Bebidas Alcoólicas', iconName: 'Beer' },
    { id: 'cat_nao_alcoolicas', name: 'Bebidas Não Alcoólicas', iconName: 'Martini' },
    { id: 'cat_cafes', name: 'Outros', iconName: 'Coffee' },
    { id: 'cat_lanches', name: 'Lanches', iconName: 'UtensilsCrossed' },
    { id: 'cat_outros', name: 'Doces', iconName: 'Package' },
    { id: 'cat_gelos_1751233766129', name: 'Gelos', iconName: 'Package' },
    { id: 'cat_doses_1756500736217', name: '.Doses', iconName: 'Martini' },
    { id: 'cat_cop_o_1756500824433', name: 'Copão', iconName: 'Beer' },
    { id: 'cat_caipirinhas_1756501145617', name: 'Caipirinhas', iconName: 'Wine' },
    { id: 'cat_drinks_1756501505560', name: '.Drinks', iconName: 'Martini' },
];

export const INITIAL_PRODUCTS: Product[] = [
    { id: '4', name: 'Refrigerante Lata', price: 6.00, categoryId: 'cat_nao_alcoolicas', stock: 150, isCombo: null, comboItems: null },
    { id: '6', name: 'Água Mineral', price: 3.00, categoryId: 'cat_nao_alcoolicas', stock: 200, isCombo: null, comboItems: null },
    { id: '9', name: 'Porção de Mini Pastel', price: 18.00, categoryId: 'cat_lanches', stock: 60, isCombo: null, comboItems: null },
    { id: '10', name: 'Porção de Batata Frita', price: 20.00, categoryId: 'cat_lanches', stock: 75, isCombo: null, comboItems: null },
    { id: '11', name: 'Pastel Médio', price: 5.00, categoryId: 'cat_lanches', stock: 120, isCombo: false, comboItems: null },
    { id: '12', name: 'Coxinha Requeijão', price: 5.00, categoryId: 'cat_lanches', stock: 40, isCombo: null, comboItems: null },
    { id: '13', name: 'Coxinha Frango', price: 7.00, categoryId: 'cat_lanches', stock: 50, isCombo: null, comboItems: null },
    { id: 'prod-1751039867904', name: 'Guaraná 2l', price: 8.00, categoryId: 'cat_nao_alcoolicas', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1751041766897', 'name': 'Boa Lata', price: 6.00, categoryId: 'cat_alcoolicas', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1751041775342', name: 'Brahma Lata', price: 6.00, categoryId: 'cat_alcoolicas', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1751041784688', name: 'Litrinho', price: 5.00, categoryId: 'cat_alcoolicas', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1751041977097', name: 'Litrão Boa', price: 14.00, categoryId: 'cat_alcoolicas', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1751041989546', name: 'Litrão Brahma', price: 14.00, categoryId: 'cat_alcoolicas', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1751042001771', name: 'Litrão Burguesa', price: 10.00, categoryId: 'cat_alcoolicas', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1751046072790', name: 'Caçulinha', price: 3.00, categoryId: 'cat_nao_alcoolicas', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1751053428816', name: 'Doce pingo de Leite', price: 1.00, categoryId: 'cat_outros', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1751053439322', name: 'Paçoca', price: 2.50, categoryId: 'cat_outros', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1751053482199', name: 'Freegel', price: 2.50, categoryId: 'cat_outros', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1751053491747', name: 'Bala', price: 0.10, categoryId: 'cat_outros', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1751053518890', name: 'Salgadinhos - Snack', price: 3.00, categoryId: 'cat_lanches', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1751053555446', name: 'Dose: Conh, Vel, Old, Canel', price: 5.00, categoryId: 'cat_doses_1756500736217', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1751053571441', name: 'Dose, Smirnoff, Chanceller', price: 8.00, categoryId: 'cat_doses_1756500736217', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1751053959839', name: 'Copão Chan/Smirnoff 500ml', price: 16.00, categoryId: 'cat_cop_o_1756500824433', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1751054003985', name: 'Copão Chan/Smirnoff 700ml', price: 18.00, categoryId: 'cat_cop_o_1756500824433', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1751054045524', name: 'Copão Old, Black, 500ml', price: 12.00, categoryId: 'cat_cop_o_1756500824433', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1751054091130', name: 'Copão Old, Black 700ml', price: 14.00, categoryId: 'cat_cop_o_1756500824433', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1751054235029', name: 'Caipirinha Suiça 500ml', price: 18.00, categoryId: 'cat_caipirinhas_1756501145617', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1751054310013', name: 'Caipirinha Velho B. 500ml', price: 14.00, categoryId: 'cat_caipirinhas_1756501145617', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1751054389085', name: 'Caipirinha Suiça 700ml', price: 22.00, categoryId: 'cat_caipirinhas_1756501145617', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1751054424501', name: 'Caipirinha Velho B. 700ml ', price: 16.00, categoryId: 'cat_caipirinhas_1756501145617', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1751054488734', name: 'Energetico 2l', price: 15.00, categoryId: 'cat_nao_alcoolicas', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1751054518235', name: 'Energético Big Lata', price: 10.00, categoryId: 'cat_nao_alcoolicas', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1751054526270', name: 'Monster', price: 12.00, categoryId: 'cat_nao_alcoolicas', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1751054542329', name: 'Ice', price: 10.00, categoryId: 'cat_alcoolicas', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1751054556571', name: 'Bud Zero long', price: 8.00, categoryId: 'cat_alcoolicas', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1751054581351', name: 'Guaraviton', price: 5.00, categoryId: 'cat_nao_alcoolicas', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1751054647461', name: 'Enrolado Salsicha', price: 7.00, categoryId: 'cat_lanches', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1751054663995', name: 'Bola de Pres e Queijo', price: 7.00, categoryId: 'cat_lanches', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1751117100368', name: 'Porção Batata/Calab', price: 35.00, categoryId: 'cat_lanches', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1751151129717', name: 'Drink Gin Morango 700ml', price: 20.00, categoryId: 'cat_drinks_1756501505560', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1751151145451', name: 'Drink Gin Morango 500ml', price: 18.00, categoryId: 'cat_drinks_1756501505560', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1751163190318', name: 'Cigarro Egypt', price: 6.00, categoryId: 'cat_cafes', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1751230528773', name: 'Pirulito', price: 2.00, categoryId: 'cat_outros', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1751233703629', name: 'Gelo Sabores', price: 3.00, categoryId: 'cat_gelos_1751233766129', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1751234546004', name: 'Pizza Frita', price: 8.00, categoryId: 'cat_lanches', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1751235420286', name: 'Troca/ Smirnof', price: 2.00, categoryId: 'cat_caipirinhas_1756501145617', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1751550966986', name: 'Caçulinha Refri', price: 3.00, categoryId: 'cat_nao_alcoolicas', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1751587450959', name: 'Porção Calabreza', price: 29.90, categoryId: 'cat_lanches', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1751717009029', name: 'Heinneken Long', price: 10.00, categoryId: 'cat_alcoolicas', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1751832758151', name: 'Eergético copao 700ml', price: 10.00, categoryId: 'cat_nao_alcoolicas', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1751832986080', name: 'Mini Foçaça Doce', price: 3.50, categoryId: 'cat_lanches', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1751833065880', name: 'Fogazza', price: 8.00, categoryId: 'cat_lanches', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1752026443378', name: 'Amendoim', price: 3.00, categoryId: 'cat_lanches', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1752191703013', name: 'Caipirinha Smirnoff 500ml', price: 16.00, categoryId: 'cat_caipirinhas_1756501145617', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1752191719465', name: 'Caipirinha Smirnoff 700ml', price: 18.00, categoryId: 'cat_caipirinhas_1756501145617', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1752193386649', name: 'Heinneken Lata', price: 10.00, categoryId: 'cat_alcoolicas', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1752345564272', name: 'Pé de Moça', price: 2.50, categoryId: 'cat_outros', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1752354724070', name: 'Beats', price: 8.00, categoryId: 'cat_alcoolicas', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1752432435259', name: 'BUD lata', price: 8.00, categoryId: 'cat_alcoolicas', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1752432474546', name: 'MAK Whisky Dose', price: 9.00, categoryId: 'cat_doses_1756500736217', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1752805356848', name: 'Porção Mandioca', price: 20.00, categoryId: 'cat_lanches', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1752888413197', name: 'Doce de Leite', price: 3.00, categoryId: 'cat_outros', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1752899659793', name: 'Hamburguer', price: 20.00, categoryId: 'cat_lanches', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1752955084682', name: 'Dose Jurupinga', price: 8.00, categoryId: 'cat_cop_o_1756500824433', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1753044218094', name: 'Porção Mandioca C/ Queijo', price: 25.00, categoryId: 'cat_lanches', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1753309708619', name: 'Copo Smirnoff', price: 10.00, categoryId: 'cat_cop_o_1756500824433', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1753312010859', name: 'Cigarro Solto', price: 0.50, categoryId: 'cat_cafes', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1753320485714', name: 'Risoles Queijo', price: 7.00, categoryId: 'cat_lanches', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1753551168321', name: 'Gatorade', price: 10.00, categoryId: 'cat_nao_alcoolicas', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1753640027893', name: 'Água c/ Gás', price: 4.00, categoryId: 'cat_nao_alcoolicas', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1753649013041', name: 'Copo Energético 500ml', price: 8.00, categoryId: 'cat_nao_alcoolicas', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1753655035530', name: 'Batata Meia Porção', price: 10.00, categoryId: 'cat_lanches', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1753721577957', name: 'Chiclete BRINQ', price: 0.50, categoryId: 'cat_outros', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1753998770546', name: 'Rifa FACAS', price: 1.00, categoryId: 'cat_cafes', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1754230638331', name: 'Red Label Dose', price: 15.00, categoryId: 'cat_doses_1756500736217', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1754526694819', name: 'Porção Promocional', price: 25.00, categoryId: 'cat_lanches', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1754610401420', name: 'Chup-Chup', price: 1.00, categoryId: 'cat_outros', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1754698560258', name: 'Pizza  Pedaço', price: 5.00, categoryId: 'cat_lanches', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1754760397301', name: 'Dose Old Red Apple/Honey', price: 6.00, categoryId: 'cat_doses_1756500736217', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1754760423970', name: 'Dose Menta', price: 6.00, categoryId: 'cat_doses_1756500736217', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1754760448411', name: 'Copão Menta Maçâ Mel 500ml', price: 14.00, categoryId: 'cat_cop_o_1756500824433', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1754760464595', name: 'Copão Menta Maçã Mel  700ml', price: 16.00, categoryId: 'cat_cop_o_1756500824433', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1754779417140', name: 'Copão Red Label 500ml', price: 22.00, categoryId: 'cat_cop_o_1756500824433', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1754779442181', name: 'Copão  Red Label 700ml', price: 32.00, categoryId: 'cat_cop_o_1756500824433', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1754852919813', name: 'Mini Pastel c/ Cheddar', price: 20.00, categoryId: 'cat_lanches', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1754877400440', name: 'água de coco', price: 3.00, categoryId: 'cat_nao_alcoolicas', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1755213541831', name: 'Meia Porção Calabreza', price: 15.00, categoryId: 'cat_lanches', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1755218169136', name: 'Crystal Lata', price: 5.00, categoryId: 'cat_alcoolicas', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1755452355805', name: 'Jack Coca', price: 10.00, categoryId: 'cat_alcoolicas', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1755909592063', name: 'Espetinho', price: 7.00, categoryId: 'cat_lanches', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1755909604993', name: 'Jantar', price: 20.00, categoryId: 'cat_lanches', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1755909988154', name: 'Rifa facas', price: 5.00, categoryId: 'cat_cafes', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1755915135649', name: 'Fanta 2l', price: 10.00, categoryId: 'cat_nao_alcoolicas', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1755992245535', name: 'Diplink', price: 1.50, categoryId: 'cat_outros', stock: 0, isCombo: null, comboItems: null },
    { id: 'prod-1755995597845', name: 'Combo Burguesa', price: 27.00, categoryId: 'cat_alcoolicas', stock: 0, isCombo: true, comboItems: 3 },
    { id: 'prod-1756070296458', name: 'Combo boa 2', price: 28.00, categoryId: 'cat_alcoolicas', stock: 0, isCombo: true, comboItems: 2 },
    { id: 'prod-1756076440939', name: 'Suco Del Vale 450ml', price: 5.00, categoryId: 'cat_nao_alcoolicas', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1756328269633', name: 'Bala Lilith Maçã Verde', price: 2.00, categoryId: 'cat_outros', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1756341313637', name: 'Batida Vinho 500ml', price: 10.00, categoryId: 'cat_drinks_1756501505560', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1756515550988', name: 'Pizza Mini', price: 10.00, categoryId: 'cat_lanches', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1756684956893', name: 'Torcida', price: 4.50, categoryId: 'cat_lanches', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1756730140786', name: 'café', price: 3.00, categoryId: 'cat_nao_alcoolicas', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1756842130837', name: 'Bolo Pedaço', price: 4.00, categoryId: 'cat_lanches', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1757024665367', name: 'Goiabeta', price: 7.00, categoryId: 'cat_doses_1756500736217', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1757029259306', name: 'Fogazza Frango', price: 8.00, categoryId: 'cat_alcoolicas', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1757094580196', name: 'Cigarro Chester', price: 15.00, categoryId: 'cat_cafes', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1757113177863', name: 'Litrão Promo(1)', price: 10.00, categoryId: 'cat_alcoolicas', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1757113194750', name: 'Litrão Promo (2)', price: 12.00, categoryId: 'cat_alcoolicas', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1757113227803', name: 'Mini Pastel Promo(1)', price: 12.00, categoryId: 'cat_lanches', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1757113245742', name: 'Mini Pastel Promo (2)', price: 15.00, categoryId: 'cat_lanches', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1757277565421', name: 'Cigarro Winston', price: 10.00, categoryId: 'cat_cafes', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1757295642819', name: 'trident', price: 4.50, categoryId: 'cat_outros', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1757295742663', name: 'halls', price: 3.50, categoryId: 'cat_outros', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1757337611317', name: 'Pé de Moça', price: 2.50, categoryId: 'cat_outros', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1757424939826', name: 'Amstel lata 350ml', price: 6.00, categoryId: 'cat_alcoolicas', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1757621516067', name: 'Doce Leite em Pó', price: 2.00, categoryId: 'cat_outros', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1757626961147', name: 'Empada', price: 8.00, categoryId: 'cat_lanches', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1757692349157', name: 'X MORTADELA', price: 5.00, categoryId: 'cat_lanches', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1757694299347', name: 'Enrolado Mort.', price: 5.00, categoryId: 'cat_lanches', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1757718149513', name: 'porção KARINA', price: 10.00, categoryId: 'cat_lanches', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1757726210076', name: 'Coca 2l', price: 15.00, categoryId: 'cat_nao_alcoolicas', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1757735881190', name: 'pastel grande', price: 10.00, categoryId: 'cat_lanches', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1757958531219', name: 'POWERADE', price: 7.00, categoryId: 'cat_nao_alcoolicas', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1758240849203', name: 'Dose Paratudo', price: 5.00, categoryId: 'cat_doses_1756500736217', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1758243780811', name: 'COM 3 BOA', price: 42.00, categoryId: 'cat_alcoolicas', stock: 0, isCombo: true, comboItems: 3 },
    { id: 'prod-1758248021903', name: 'h2o', price: 7.00, categoryId: 'cat_nao_alcoolicas', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1758309928671', name: 'Burguesa Lata', price: 5.00, categoryId: 'cat_alcoolicas', stock: 0, isCombo: false, comboItems: null },
    { id: 'prod-1758322472705', name: 'Caipirinha Menta', price: 16.00, categoryId: 'cat_caipirinhas_1756501145617', stock: 0, isCombo: false, comboItems: null },
];

export const LUCIDE_ICON_MAP: { [key: string]: LucideIcon } = {
    Beer, Wine, Martini, Coffee, UtensilsCrossed, CakeSlice, Package, Banknote, Wallet
};

export const PAYMENT_METHODS: { value: PaymentMethod, name: string, icon: LucideIcon }[] = [
  { value: 'cash', name: 'Dinheiro', icon: CircleDollarSign },
  { value: 'debit', name: 'Débito', icon: CreditCard },
  { value: 'credit', name: 'Crédito', icon: CreditCard },
  { value: 'pix', name: 'PIX', icon: QrCode },
];

export const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
};


// --- Data Functions ---

// Product Categories
const PRODUCT_CATEGORIES_KEY = 'barmate_productCategories_v2';
export const getProductCategories = async (): Promise<ProductCategory[]> => {
    if (supabase) {
        const { data, error } = await supabase.from('product_categories').select('*');
        if (error) {
            console.error("Error fetching product categories:", error);
            return getFromLocalStorage(PRODUCT_CATEGORIES_KEY, INITIAL_PRODUCT_CATEGORIES);
        }
        if (!data || data.length === 0) {
            await saveProductCategories(INITIAL_PRODUCT_CATEGORIES);
            return INITIAL_PRODUCT_CATEGORIES;
        }
        return data;
    }
    return getFromLocalStorage(PRODUCT_CATEGORIES_KEY, INITIAL_PRODUCT_CATEGORIES);
};
export const saveProductCategories = async (categories: ProductCategory[]) => {
    if (supabase) {
        const { error } = await supabase.from('product_categories').upsert(categories, { onConflict: 'id' });
        if (error) console.error("Error saving product categories:", error);
    }
    saveToLocalStorage(PRODUCT_CATEGORIES_KEY, categories);
    window.dispatchEvent(new Event('storage'));
};

// Products
const PRODUCTS_KEY = 'barmate_products_v2';
export const getProducts = async (): Promise<Product[]> => {
    if (supabase) {
        const { data, error } = await supabase.from('products').select('*');
        if (error) {
            console.error("Error fetching products:", error);
            return getFromLocalStorage(PRODUCTS_KEY, INITIAL_PRODUCTS);
        }
        if (!data || data.length === 0) {
            await saveProducts(INITIAL_PRODUCTS);
            return INITIAL_PRODUCTS;
        }
        return data.map(p => ({...p, isCombo: p.is_combo, comboItems: p.combo_items}));
    }
    return getFromLocalStorage(PRODUCTS_KEY, INITIAL_PRODUCTS);
};
export const saveProducts = async (products: Product[]) => {
    if (supabase) {
        const productsToSave = products.map(p => ({...p, is_combo: p.isCombo, combo_items: p.comboItems, isCombo: undefined, comboItems: undefined }));
        const { error } = await supabase.from('products').upsert(productsToSave, { onConflict: 'id' });
        if (error) console.error("Error saving products:", error);
    }
    saveToLocalStorage(PRODUCTS_KEY, products);
    window.dispatchEvent(new Event('storage'));
};

// Sales
const SALES_KEY = 'barmate_sales_v2';
export const getSales = async (): Promise<Sale[]> => {
    if (supabase) {
        const { data, error } = await supabase.from('sales').select('*');
        if (error) {
            console.error("Error fetching sales:", error);
            return getFromLocalStorage(SALES_KEY, []);
        }
        return (data || []).map((s: any) => ({ ...s, timestamp: new Date(s.timestamp) }));
    }
    return getFromLocalStorage(SALES_KEY, []);
};
export const addSale = async (sale: Omit<Sale, 'id'> & { id?: string }) => {
    const newSale = { ...sale, id: sale.id || `sale-${Date.now()}` };
    const allSales = await getSales();
    const updatedSales = [...allSales, newSale];

    if (supabase) {
        const saleToSave = { 
            ...newSale,
            total_amount: newSale.totalAmount,
            original_amount: newSale.originalAmount,
            discount_amount: newSale.discountAmount,
            cash_tendered: newSale.cashTendered,
            change_given: newSale.changeGiven,
            leave_change_as_credit: newSale.leaveChangeAsCredit
        };
        const { error } = await supabase.from('sales').insert(saleToSave as any);
        if (error) console.error("Error adding sale:", error);

         // Add fee entries if applicable
        const fees = await getTransactionFees();
        for (const payment of newSale.payments) {
            let feeRate = 0;
            if (payment.method === 'debit') feeRate = fees.debitRate;
            else if (payment.method === 'credit') feeRate = fees.creditRate;
            else if (payment.method === 'pix') feeRate = fees.pixRate;

            if (feeRate > 0) {
                await addFinancialEntry({
                    description: `Taxa ${payment.method.toUpperCase()} da venda #${newSale.id.slice(-6)}`,
                    amount: payment.amount * (feeRate / 100),
                    type: 'expense',
                    source: 'bank_account',
                    timestamp: new Date(),
                    saleId: newSale.id
                });
            }
        }
    }
    
    saveToLocalStorage(SALES_KEY, updatedSales);
    window.dispatchEvent(new Event('storage'));
};
export const removeSale = async (saleId: string) => {
    const allSales = await getSales();
    const saleToRemove = allSales.find(s => s.id === saleId);
    if (!saleToRemove) return;

    const updatedSales = allSales.filter(s => s.id !== saleId);
    if (supabase) {
        await supabase.from('sales').delete().eq('id', saleId);
        // Also remove associated fee entries
        await supabase.from('financial_entries').delete().eq('saleId', saleId);
    }
    saveToLocalStorage(SALES_KEY, updatedSales);
    window.dispatchEvent(new Event('storage'));
};
export const saveSales = (sales: Sale[]) => {
    saveToLocalStorage(SALES_KEY, sales); // Should be handled by addSale/removeSale
    window.dispatchEvent(new Event('storage'));
};

// Active Orders
const OPEN_ORDERS_KEY = 'barmate_openOrders_v2';
export const getOpenOrders = async (): Promise<ActiveOrder[]> => {
    if (supabase) {
        const { data, error } = await supabase.from('active_orders').select('*');
        if (error) {
            console.error("Error fetching open orders:", error);
            return getFromLocalStorage(OPEN_ORDERS_KEY, []);
        }
        return (data || []).map((o: any) => ({ ...o, createdAt: new Date(o.created_at) }));
    }
    return getFromLocalStorage(OPEN_ORDERS_KEY, []);
};
export const saveOpenOrders = async (orders: ActiveOrder[]) => {
     if (supabase) {
        // Delete all and insert, simpler than upserting all
        await supabase.from('active_orders').delete().neq('id', 'dummy-id-to-not-delete-all-if-empty');
        const ordersToSave = orders.map(o => ({...o, created_at: o.createdAt.toISOString() }));
        const { error } = await supabase.from('active_orders').insert(ordersToSave as any);
        if (error) console.error("Error saving open orders:", error);
    }
    saveToLocalStorage(OPEN_ORDERS_KEY, orders);
    window.dispatchEvent(new Event('storage'));
};

// --- Financial Data ---

const FINANCIAL_ENTRIES_KEY = 'barmate_financialEntries_v2';
export const getFinancialEntries = async (): Promise<FinancialEntry[]> => {
    if (supabase) {
        const { data, error } = await supabase.from('financial_entries').select('*');
        if (error) {
            console.error("Error fetching financial entries:", error);
            return getFromLocalStorage(FINANCIAL_ENTRIES_KEY, []);
        }
        return (data || []).map((e: any) => ({ ...e, timestamp: new Date(e.timestamp) }));
    }
    return getFromLocalStorage(FINANCIAL_ENTRIES_KEY, []);
};
export const addFinancialEntry = async (entry: Omit<FinancialEntry, 'id'> & {id?: string}) => {
    const newEntry = { ...entry, id: entry.id || `fin-${Date.now()}` };
    const allEntries = await getFinancialEntries();
    const updatedEntries = [...allEntries, newEntry];
    if (supabase) {
        const { error } = await supabase.from('financial_entries').insert(newEntry as any);
        if (error) console.error("Error adding financial entry:", error);
    }
    saveToLocalStorage(FINANCIAL_ENTRIES_KEY, updatedEntries);
    window.dispatchEvent(new Event('storage'));
};
export const removeFinancialEntry = async (entryId: string) => {
    const allEntries = await getFinancialEntries();
    const updatedEntries = allEntries.filter(e => e.id !== entryId);
    if (supabase) {
        await supabase.from('financial_entries').delete().eq('id', entryId);
    }
    saveToLocalStorage(FINANCIAL_ENTRIES_KEY, updatedEntries);
    window.dispatchEvent(new Event('storage'));
};

// Balances
const SECONDARY_CASH_BOX_KEY = 'barmate_secondaryCashBox_v2';
export const getSecondaryCashBox = (): Promise<SecondaryCashBox> => getFromSupabase('balances', 'secondary_cash', { balance: 0 });
export const saveSecondaryCashBox = (box: SecondaryCashBox) => saveToSupabase('balances', 'secondary_cash', box);

const BANK_ACCOUNT_KEY = 'barmate_bankAccount_v2';
export const getBankAccount = (): Promise<BankAccount> => getFromSupabase('balances', 'bank_account', { balance: 0 });
export const saveBankAccount = (account: BankAccount) => saveToSupabase('balances', 'bank_account', account);


// Cash Register Status
const CASH_REGISTER_STATUS_KEY = 'barmate_cashRegisterStatus_v2';
export const getCashRegisterStatus = (): Promise<CashRegisterStatus> => getFromSupabase('balances', 'cash_register_status', { status: 'closed', adjustments: [] });
export const saveCashRegisterStatus = (status: CashRegisterStatus) => saveToSupabase('balances', 'cash_register_status', status);

// Transaction Fees
const TRANSACTION_FEES_KEY = 'barmate_transactionFees_v2';
export const getTransactionFees = (): Promise<TransactionFees> => getFromSupabase('balances', 'transaction_fees', { debitRate: 0, creditRate: 0, pixRate: 0 });
export const saveTransactionFees = (fees: TransactionFees) => saveToSupabase('balances', 'transaction_fees', fees);

    