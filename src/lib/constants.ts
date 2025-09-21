

import type { Product, Sale, PaymentMethod, ProductCategory, FinancialEntry, SecondaryCashBox, BankAccount, CashRegisterStatus, Payment, TransactionFees, ActiveOrder } from '@/types';
import { Beer, Wine, Martini, Coffee, UtensilsCrossed, CakeSlice, CircleDollarSign, CreditCard, QrCode, Package, Banknote, type LucideIcon, Wallet } from 'lucide-react';

// --- LocalStorage Helper Functions ---
const saveToLocalStorage = <T,>(key: string, value: T) => {
  if (typeof window !== 'undefined') {
    try {
      const serializedValue = JSON.stringify(value);
      window.localStorage.setItem(key, serializedValue);
      // Dispara um evento para que outros componentes possam reagir à mudança.
      window.dispatchEvent(new StorageEvent('storage', { key }));
    } catch (error) {
      console.error(`Error saving to localStorage key "${key}":`, error);
    }
  }
};

const getFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') {
    return defaultValue;
  }
  try {
    const storedValue = window.localStorage.getItem(key);
    if (storedValue === null || storedValue === 'undefined') {
      // Se não encontrar nada, salva o valor padrão e o retorna.
      saveToLocalStorage(key, defaultValue);
      return defaultValue;
    }
    return JSON.parse(storedValue);
  } catch (error) {
    console.error(`Error parsing localStorage key "${key}":`, error);
    return defaultValue;
  }
};


// --- DATA KEYS ---
const KEY_PRODUCT_CATEGORIES = 'barmate_productCategories_v2';
const KEY_PRODUCTS = 'barmate_products_v2';
const KEY_SALES = 'barmate_sales_v2';
const KEY_OPEN_ORDERS = 'barmate_openOrders_v2';
const KEY_FINANCIAL_ENTRIES = 'barmate_financialEntries_v2';
const KEY_CASH_REGISTER_STATUS = 'barmate_cashRegisterStatus_v2';
const KEY_SECONDARY_CASH_BOX = 'barmate_secondaryCashBox_v2';
const KEY_BANK_ACCOUNT = 'barmate_bankAccount_v2';
const KEY_TRANSACTION_FEES = 'barmate_transactionFees_v2';


// --- INITIAL DATA ---
const INITIAL_PRODUCT_CATEGORIES: ProductCategory[] = [
    {
      "id": "cat_alcoolicas",
      "name": "Bebidas Alcoólicas",
      "iconName": "Beer"
    },
    {
      "id": "cat_nao_alcoolicas",
      "name": "Bebidas Não Alcoólicas",
      "iconName": "Martini"
    },
    {
      "id": "cat_cafes",
      "name": "Outros",
      "iconName": "Coffee"
    },
    {
      "id": "cat_lanches",
      "name": "Lanches",
      "iconName": "UtensilsCrossed"
    },
    {
      "id": "cat_outros",
      "name": "Doces",
      "iconName": "Package"
    },
    {
      "id": "cat_gelos_1751233766129",
      "name": "Gelos",
      "iconName": "Package"
    },
    {
      "id": "cat_doses_1756500736217",
      "name": ".Doses",
      "iconName": "Martini"
    },
    {
      "id": "cat_cop_o_1756500824433",
      "name": "Copão",
      "iconName": "Beer"
    },
    {
      "id": "cat_caipirinhas_1756501145617",
      "name": "Caipirinhas",
      "iconName": "Wine"
    },
    {
      "id": "cat_drinks_1756501505560",
      "name": ".Drinks",
      "iconName": "Martini"
    }
  ];

const INITIAL_PRODUCTS: Product[] = [
    {
      "id": "4",
      "name": "Refrigerante Lata",
      "price": 6,
      "categoryId": "cat_nao_alcoolicas",
      "stock": 150
    },
    {
      "id": "6",
      "name": "Água Mineral",
      "price": 3,
      "categoryId": "cat_nao_alcoolicas",
      "stock": 200
    },
    {
      "id": "9",
      "name": "Porção de Mini Pastel",
      "price": 18,
      "categoryId": "cat_lanches",
      "stock": 60
    },
    {
      "id": "10",
      "name": "Porção de Batata Frita",
      "price": 20,
      "categoryId": "cat_lanches",
      "stock": 75
    },
    {
      "id": "11",
      "name": "Pastel Médio",
      "price": 5,
      "categoryId": "cat_lanches",
      "stock": 120,
      "isCombo": false
    },
    {
      "id": "12",
      "name": "Coxinha Requeijão",
      "price": 5,
      "categoryId": "cat_lanches",
      "stock": 40
    },
    {
      "id": "13",
      "name": "Coxinha Frango",
      "price": 7,
      "categoryId": "cat_lanches",
      "stock": 50
    },
    {
      "id": "prod-1751039867904",
      "name": "Guaraná 2l",
      "price": 8,
      "categoryId": "cat_nao_alcoolicas",
      "stock": 0
    },
    {
      "id": "prod-1751041766897",
      "name": "Boa Lata",
      "price": 6,
      "categoryId": "cat_alcoolicas",
      "stock": 0
    },
    {
      "id": "prod-1751041775342",
      "name": "Brahma Lata",
      "price": 6,
      "categoryId": "cat_alcoolicas",
      "stock": 0
    },
    {
      "id": "prod-1751041784688",
      "name": "Litrinho",
      "price": 5,
      "categoryId": "cat_alcoolicas",
      "stock": 0
    },
    {
      "id": "prod-1751041977097",
      "name": "Litrão Boa",
      "price": 14,
      "categoryId": "cat_alcoolicas",
      "stock": 0
    },
    {
      "id": "prod-1751041989546",
      "name": "Litrão Brahma",
      "price": 14,
      "categoryId": "cat_alcoolicas",
      "stock": 0
    },
    {
      "id": "prod-1751042001771",
      "name": "Litrão Burguesa",
      "price": 10,
      "categoryId": "cat_alcoolicas",
      "stock": 0
    },
    {
      "id": "prod-1751046072790",
      "name": "Caçulinha",
      "price": 3,
      "categoryId": "cat_nao_alcoolicas",
      "stock": 0
    },
    {
      "id": "prod-1751053428816",
      "name": "Doce pingo de Leite",
      "price": 1,
      "categoryId": "cat_outros",
      "stock": 0
    },
    {
      "id": "prod-1751053439322",
      "name": "Paçoca",
      "price": 2.5,
      "categoryId": "cat_outros",
      "stock": 0
    },
    {
      "id": "prod-1751053482199",
      "name": "Freegel",
      "price": 2.5,
      "categoryId": "cat_outros",
      "stock": 0
    },
    {
      "id": "prod-1751053491747",
      "name": "Bala",
      "price": 0.1,
      "categoryId": "cat_outros",
      "stock": 0
    },
    {
      "id": "prod-1751053518890",
      "name": "Salgadinhos - Snack",
      "price": 3,
      "categoryId": "cat_lanches",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1751053555446",
      "name": "Dose: Conh, Vel, Old, Canel",
      "price": 5,
      "categoryId": "cat_doses_1756500736217",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1751053571441",
      "name": "Dose, Smirnoff, Chanceller",
      "price": 8,
      "categoryId": "cat_doses_1756500736217",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1751053959839",
      "name": "Copão Chan/Smirnoff 500ml",
      "price": 16,
      "categoryId": "cat_cop_o_1756500824433",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1751054003985",
      "name": "Copão Chan/Smirnoff 700ml",
      "price": 18,
      "categoryId": "cat_cop_o_1756500824433",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1751054045524",
      "name": "Copão Old, Black, 500ml",
      "price": 12,
      "categoryId": "cat_cop_o_1756500824433",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1751054091130",
      "name": "Copão Old, Black 700ml",
      "price": 14,
      "categoryId": "cat_cop_o_1756500824433",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1751054235029",
      "name": "Caipirinha Suiça 500ml",
      "price": 18,
      "categoryId": "cat_caipirinhas_1756501145617",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1751054310013",
      "name": "Caipirinha Velho B. 500ml",
      "price": 14,
      "categoryId": "cat_caipirinhas_1756501145617",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1751054389085",
      "name": "Caipirinha Suiça 700ml",
      "price": 22,
      "categoryId": "cat_caipirinhas_1756501145617",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1751054424501",
      "name": "Caipirinha Velho B. 700ml ",
      "price": 16,
      "categoryId": "cat_caipirinhas_1756501145617",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1751054488734",
      "name": "Energetico 2l",
      "price": 15,
      "categoryId": "cat_nao_alcoolicas",
      "stock": 0
    },
    {
      "id": "prod-1751054518235",
      "name": "Energético Big Lata",
      "price": 10,
      "categoryId": "cat_nao_alcoolicas",
      "stock": 0
    },
    {
      "id": "prod-1751054526270",
      "name": "Monster",
      "price": 12,
      "categoryId": "cat_nao_alcoolicas",
      "stock": 0
    },
    {
      "id": "prod-1751054542329",
      "name": "Ice",
      "price": 10,
      "categoryId": "cat_alcoolicas",
      "stock": 0
    },
    {
      "id": "prod-1751054556571",
      "name": "Bud Zero long",
      "price": 8,
      "categoryId": "cat_alcoolicas",
      "stock": 0
    },
    {
      "id": "prod-1751054581351",
      "name": "Guaraviton",
      "price": 5,
      "categoryId": "cat_nao_alcoolicas",
      "stock": 0
    },
    {
      "id": "prod-1751054647461",
      "name": "Enrolado Salsicha",
      "price": 7,
      "categoryId": "cat_lanches",
      "stock": 0
    },
    {
      "id": "prod-1751054663995",
      "name": "Bola de Pres e Queijo",
      "price": 7,
      "categoryId": "cat_lanches",
      "stock": 0
    },
    {
      "id": "prod-1751117100368",
      "name": "Porção Batata/Calab",
      "price": 35,
      "categoryId": "cat_lanches",
      "stock": 0
    },
    {
      "id": "prod-1751151129717",
      "name": "Drink Gin Morango 700ml",
      "price": 20,
      "categoryId": "cat_drinks_1756501505560",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1751151145451",
      "name": "Drink Gin Morango 500ml",
      "price": 18,
      "categoryId": "cat_drinks_1756501505560",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1751163190318",
      "name": "Cigarro Egypt",
      "price": 6,
      "categoryId": "cat_cafes",
      "stock": 0
    },
    {
      "id": "prod-1751230528773",
      "name": "Pirulito",
      "price": 2,
      "categoryId": "cat_outros",
      "stock": 0
    },
    {
      "id": "prod-1751233703629",
      "name": "Gelo Sabores",
      "price": 3,
      "categoryId": "cat_gelos_1751233766129",
      "stock": 0
    },
    {
      "id": "prod-1751234546004",
      "name": "Pizza Frita",
      "price": 8,
      "categoryId": "cat_lanches",
      "stock": 0
    },
    {
      "id": "prod-1751235420286",
      "name": "Troca/ Smirnof",
      "price": 2,
      "categoryId": "cat_caipirinhas_1756501145617",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1751550966986",
      "name": "Caçulinha Refri",
      "price": 3,
      "categoryId": "cat_nao_alcoolicas",
      "stock": 0
    },
    {
      "id": "prod-1751587450959",
      "name": "Porção Calabreza",
      "price": 29.9,
      "categoryId": "cat_lanches",
      "stock": 0
    },
    {
      "id": "prod-1751717009029",
      "name": "Heinneken Long",
      "price": 10,
      "categoryId": "cat_alcoolicas",
      "stock": 0
    },
    {
      "id": "prod-1751832758151",
      "name": "Eergético copao 700ml",
      "price": 10,
      "categoryId": "cat_nao_alcoolicas",
      "stock": 0
    },
    {
      "id": "prod-1751832986080",
      "name": "Mini Foçaça Doce",
      "price": 3.5,
      "categoryId": "cat_lanches",
      "stock": 0
    },
    {
      "id": "prod-1751833065880",
      "name": "Fogazza",
      "price": 8,
      "categoryId": "cat_lanches",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1752026443378",
      "name": "Amendoim",
      "price": 3,
      "categoryId": "cat_lanches",
      "stock": 0
    },
    {
      "id": "prod-1752191703013",
      "name": "Caipirinha Smirnoff 500ml",
      "price": 16,
      "categoryId": "cat_caipirinhas_1756501145617",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1752191719465",
      "name": "Caipirinha Smirnoff 700ml",
      "price": 18,
      "categoryId": "cat_caipirinhas_1756501145617",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1752193386649",
      "name": "Heinneken Lata",
      "price": 10,
      "categoryId": "cat_alcoolicas",
      "stock": 0
    },
    {
      "id": "prod-1752345564272",
      "name": "Pé de Moça",
      "price": 2.5,
      "categoryId": "cat_outros",
      "stock": 0
    },
    {
      "id": "prod-1752354724070",
      "name": "Beats",
      "price": 8,
      "categoryId": "cat_alcoolicas",
      "stock": 0
    },
    {
      "id": "prod-1752432435259",
      "name": "BUD lata",
      "price": 8,
      "categoryId": "cat_alcoolicas",
      "stock": 0
    },
    {
      "id": "prod-1752432474546",
      "name": "MAK Whisky Dose",
      "price": 9,
      "categoryId": "cat_doses_1756500736217",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1752805356848",
      "name": "Porção Mandioca",
      "price": 20,
      "categoryId": "cat_lanches",
      "stock": 0
    },
    {
      "id": "prod-1752888413197",
      "name": "Doce de Leite",
      "price": 3,
      "categoryId": "cat_outros",
      "stock": 0
    },
    {
      "id": "prod-1752899659793",
      "name": "Hamburguer",
      "price": 20,
      "categoryId": "cat_lanches",
      "stock": 0
    },
    {
      "id": "prod-1752955084682",
      "name": "Dose Jurupinga",
      "price": 8,
      "categoryId": "cat_cop_o_1756500824433",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1753044218094",
      "name": "Porção Mandioca C/ Queijo",
      "price": 25,
      "categoryId": "cat_lanches",
      "stock": 0
    },
    {
      "id": "prod-1753309708619",
      "name": "Copo Smirnoff",
      "price": 10,
      "categoryId": "cat_cop_o_1756500824433",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1753312010859",
      "name": "Cigarro Solto",
      "price": 0.5,
      "categoryId": "cat_cafes",
      "stock": 0
    },
    {
      "id": "prod-1753320485714",
      "name": "Risoles Queijo",
      "price": 7,
      "categoryId": "cat_lanches",
      "stock": 0
    },
    {
      "id": "prod-1753551168321",
      "name": "Gatorade",
      "price": 10,
      "categoryId": "cat_nao_alcoolicas",
      "stock": 0
    },
    {
      "id": "prod-1753640027893",
      "name": "Água c/ Gás",
      "price": 4,
      "categoryId": "cat_nao_alcoolicas",
      "stock": 0
    },
    {
      "id": "prod-1753649013041",
      "name": "Copo Energético 500ml",
      "price": 8,
      "categoryId": "cat_nao_alcoolicas",
      "stock": 0
    },
    {
      "id": "prod-1753655035530",
      "name": "Batata Meia Porção",
      "price": 10,
      "categoryId": "cat_lanches",
      "stock": 0
    },
    {
      "id": "prod-1753721577957",
      "name": "Chiclete BRINQ",
      "price": 0.5,
      "categoryId": "cat_outros",
      "stock": 0
    },
    {
      "id": "prod-1753998770546",
      "name": "Rifa FACAS",
      "price": 1,
      "categoryId": "cat_cafes",
      "stock": 0
    },
    {
      "id": "prod-1754230638331",
      "name": "Red Label Dose",
      "price": 15,
      "categoryId": "cat_doses_1756500736217",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1754526694819",
      "name": "Porção Promocional",
      "price": 25,
      "categoryId": "cat_lanches",
      "stock": 0
    },
    {
      "id": "prod-1754610401420",
      "name": "Chup-Chup",
      "price": 1,
      "categoryId": "cat_outros",
      "stock": 0
    },
    {
      "id": "prod-1754698560258",
      "name": "Pizza  Pedaço",
      "price": 5,
      "categoryId": "cat_lanches",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1754760397301",
      "name": "Dose Old Red Apple/Honey",
      "price": 6,
      "categoryId": "cat_doses_1756500736217",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1754760423970",
      "name": "Dose Menta",
      "price": 6,
      "categoryId": "cat_doses_1756500736217",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1754760448411",
      "name": "Copão Menta Maçâ Mel 500ml",
      "price": 14,
      "categoryId": "cat_cop_o_1756500824433",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1754760464595",
      "name": "Copão Menta Maçã Mel  700ml",
      "price": 16,
      "categoryId": "cat_cop_o_1756500824433",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1754779417140",
      "name": "Copão Red Label 500ml",
      "price": 22,
      "categoryId": "cat_cop_o_1756500824433",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1754779442181",
      "name": "Copão  Red Label 700ml",
      "price": 32,
      "categoryId": "cat_cop_o_1756500824433",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1754852919813",
      "name": "Mini Pastel c/ Cheddar",
      "price": 20,
      "categoryId": "cat_lanches",
      "stock": 0
    },
    {
      "id": "prod-1754877400440",
      "name": "água de coco",
      "price": 3,
      "categoryId": "cat_nao_alcoolicas",
      "stock": 0
    },
    {
      "id": "prod-1755213541831",
      "name": "Meia Porção Calabreza",
      "price": 15,
      "categoryId": "cat_lanches",
      "stock": 0
    },
    {
      "id": "prod-1755218169136",
      "name": "Crystal Lata",
      "price": 5,
      "categoryId": "cat_alcoolicas",
      "stock": 0
    },
    {
      "id": "prod-1755452355805",
      "name": "Jack Coca",
      "price": 10,
      "categoryId": "cat_alcoolicas",
      "stock": 0
    },
    {
      "id": "prod-1755909592063",
      "name": "Espetinho",
      "price": 7,
      "categoryId": "cat_lanches",
      "stock": 0
    },
    {
      "id": "prod-1755909604993",
      "name": "Jantar",
      "price": 20,
      "categoryId": "cat_lanches",
      "stock": 0
    },
    {
      "id": "prod-1755909988154",
      "name": "Rifa facas",
      "price": 5,
      "categoryId": "cat_cafes",
      "stock": 0
    },
    {
      "id": "prod-1755915135649",
      "name": "Fanta 2l",
      "price": 10,
      "categoryId": "cat_nao_alcoolicas",
      "stock": 0
    },
    {
      "id": "prod-1755992245535",
      "name": "Diplink",
      "price": 1.5,
      "categoryId": "cat_outros",
      "stock": 0
    },
    {
      "id": "prod-1755995597845",
      "name": "Combo Burguesa",
      "price": 27,
      "categoryId": "cat_alcoolicas",
      "stock": 0,
      "isCombo": true,
      "comboItems": 3
    },
    {
      "id": "prod-1756070296458",
      "name": "Combo boa 2",
      "price": 28,
      "categoryId": "cat_alcoolicas",
      "stock": 0,
      "isCombo": true,
      "comboItems": 2
    },
    {
      "id": "prod-1756076440939",
      "name": "Suco Del Vale 450ml",
      "price": 5,
      "categoryId": "cat_nao_alcoolicas",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1756328269633",
      "name": "Bala Lilith Maçã Verde",
      "price": 2,
      "categoryId": "cat_outros",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1756341313637",
      "name": "Batida Vinho 500ml",
      "price": 10,
      "categoryId": "cat_drinks_1756501505560",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1756515550988",
      "name": "Pizza Mini",
      "price": 10,
      "categoryId": "cat_lanches",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1756684956893",
      "name": "Torcida",
      "price": 4.5,
      "categoryId": "cat_lanches",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1756730140786",
      "name": "café",
      "price": 3,
      "categoryId": "cat_nao_alcoolicas",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1756842130837",
      "name": "Bolo Pedaço",
      "price": 4,
      "categoryId": "cat_lanches",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1757024665367",
      "name": "Goiabeta",
      "price": 7,
      "categoryId": "cat_doses_1756500736217",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1757029259306",
      "name": "Fogazza Frango",
      "price": 8,
      "categoryId": "cat_lanches",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1757094580196",
      "name": "Cigarro Chester",
      "price": 15,
      "categoryId": "cat_cafes",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1757113177863",
      "name": "Litrão Promo(1)",
      "price": 10,
      "categoryId": "cat_alcoolicas",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1757113194750",
      "name": "Litrão Promo (2)",
      "price": 12,
      "categoryId": "cat_alcoolicas",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1757113227803",
      "name": "Mini Pastel Promo(1)",
      "price": 12,
      "categoryId": "cat_lanches",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1757113245742",
      "name": "Mini Pastel Promo (2)",
      "price": 15,
      "categoryId": "cat_lanches",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1757277565421",
      "name": "Cigarro Winston",
      "price": 10,
      "categoryId": "cat_cafes",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1757295642819",
      "name": "trident",
      "price": 4.5,
      "categoryId": "cat_outros",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1757295742663",
      "name": "halls",
      "price": 3.5,
      "categoryId": "cat_outros",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1757337611317",
      "name": "Pé de Moça",
      "price": 2.5,
      "categoryId": "cat_outros",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1757424939826",
      "name": "Amstel lata 350ml",
      "price": 6,
      "categoryId": "cat_alcoolicas",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1757621516067",
      "name": "Doce Leite em Pó",
      "price": 2,
      "categoryId": "cat_outros",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1757626961147",
      "name": "Empada",
      "price": 8,
      "categoryId": "cat_lanches",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1757692349157",
      "name": "X MORTADELA",
      "price": 5,
      "categoryId": "cat_lanches",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1757694299347",
      "name": "Enrolado Mort.",
      "price": 5,
      "categoryId": "cat_lanches",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1757718149513",
      "name": "porção KARINA",
      "price": 10,
      "categoryId": "cat_lanches",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1757726210076",
      "name": "Coca 2l",
      "price": 15,
      "categoryId": "cat_nao_alcoolicas",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1757735881190",
      "name": "pastel grande",
      "price": 10,
      "categoryId": "cat_lanches",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1757958531219",
      "name": "POWERADE",
      "price": 7,
      "categoryId": "cat_nao_alcoolicas",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1758240849203",
      "name": "Dose Paratudo",
      "price": 5,
      "categoryId": "cat_doses_1756500736217",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1758243780811",
      "name": "COM 3 BOA",
      "price": 42,
      "categoryId": "cat_alcoolicas",
      "stock": 0,
      "isCombo": true,
      "comboItems": 3
    },
    {
      "id": "prod-1758248021903",
      "name": "h2o",
      "price": 7,
      "categoryId": "cat_nao_alcoolicas",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1758309928671",
      "name": "Burguesa Lata",
      "price": 5,
      "categoryId": "cat_alcoolicas",
      "stock": 0,
      "isCombo": false
    },
    {
      "id": "prod-1758322472705",
      "name": "Caipirinha Menta",
      "price": 16,
      "categoryId": "cat_caipirinhas_1756501145617",
      "stock": 0,
      "isCombo": false
    }
  ];

const INITIAL_SALES: Sale[] = [];
const INITIAL_OPEN_ORDERS: ActiveOrder[] = [];
const INITIAL_FINANCIAL_ENTRIES: FinancialEntry[] = [];
const INITIAL_CASH_REGISTER_STATUS: CashRegisterStatus = { status: 'closed', adjustments: [] };
const INITIAL_SECONDARY_CASH_BOX: SecondaryCashBox = { balance: 0 };
const INITIAL_BANK_ACCOUNT: BankAccount = { balance: 0 };
const INITIAL_TRANSACTION_FEES: TransactionFees = { debitRate: 0, creditRate: 0, pixRate: 0 };


// --- Data Accessor Functions ---

export const getProductCategories = (): ProductCategory[] => getFromLocalStorage(KEY_PRODUCT_CATEGORIES, INITIAL_PRODUCT_CATEGORIES);
export const saveProductCategories = (categories: ProductCategory[]) => saveToLocalStorage(KEY_PRODUCT_CATEGORIES, categories);

export const getProducts = (): Product[] => getFromLocalStorage(KEY_PRODUCTS, INITIAL_PRODUCTS);
export const saveProducts = (products: Product[]) => saveToLocalStorage(KEY_PRODUCTS, products);

export const getSales = (): Sale[] => getFromLocalStorage(KEY_SALES, INITIAL_SALES);
export const saveSales = (sales: Sale[]) => saveToLocalStorage(KEY_SALES, sales);

export const getOpenOrders = (): ActiveOrder[] => getFromLocalStorage(KEY_OPEN_ORDERS, INITIAL_OPEN_ORDERS);
export const saveOpenOrders = (orders: ActiveOrder[]) => saveToLocalStorage(KEY_OPEN_ORDERS, orders);

export const getFinancialEntries = (): FinancialEntry[] => getFromLocalStorage(KEY_FINANCIAL_ENTRIES, INITIAL_FINANCIAL_ENTRIES);
export const saveFinancialEntries = (entries: FinancialEntry[]) => saveToLocalStorage(KEY_FINANCIAL_ENTRIES, entries);

export const getCashRegisterStatus = (): CashRegisterStatus => getFromLocalStorage(KEY_CASH_REGISTER_STATUS, INITIAL_CASH_REGISTER_STATUS);
export const saveCashRegisterStatus = (status: CashRegisterStatus, options?: { silent?: boolean }) => saveToLocalStorage(KEY_CASH_REGISTER_STATUS, status);

export const getSecondaryCashBox = (): SecondaryCashBox => getFromLocalStorage(KEY_SECONDARY_CASH_BOX, INITIAL_SECONDARY_CASH_BOX);
export const saveSecondaryCashBox = (box: SecondaryCashBox, options?: { silent?: boolean }) => saveToLocalStorage(KEY_SECONDARY_CASH_BOX, box);

export const getBankAccount = (): BankAccount => getFromLocalStorage(KEY_BANK_ACCOUNT, INITIAL_BANK_ACCOUNT);
export const saveBankAccount = (account: BankAccount, options?: { silent?: boolean }) => saveToLocalStorage(KEY_BANK_ACCOUNT, account);

export const getTransactionFees = (): TransactionFees => getFromLocalStorage(KEY_TRANSACTION_FEES, INITIAL_TRANSACTION_FEES);
export const saveTransactionFees = (fees: TransactionFees, options?: { silent?: boolean }) => saveToLocalStorage(KEY_TRANSACTION_FEES, fees);


// --- Business Logic Functions ---

export const addSale = (sale: Omit<Sale, 'id' | 'timestamp'> & { timestamp?: Date }) => {
  const newSale: Sale = {
    ...sale,
    id: `sale-${Date.now()}`,
    timestamp: sale.timestamp || new Date(),
  };

  const currentSales = getSales();
  const updatedSales = [...currentSales, newSale];
  saveSales(updatedSales);

  const fees = getTransactionFees();
  const newFinancialEntries: Omit<FinancialEntry, 'id'|'timestamp'>[] = [];

  newSale.payments.forEach(p => {
    let feeRate = 0;
    const isBankTransaction = ['debit', 'credit', 'pix'].includes(p.method);

    if (p.method === 'debit') feeRate = fees.debitRate;
    if (p.method === 'credit') feeRate = fees.creditRate;
    if (p.method === 'pix') feeRate = fees.pixRate;

    if (isBankTransaction) {
      // Add the income from the sale to the bank account
      newFinancialEntries.push({
        description: `Venda #${newSale.id.slice(-6)} via ${p.method}`,
        amount: p.amount,
        type: 'income',
        source: 'bank_account',
        saleId: newSale.id,
        adjustmentId: null
      });

      // Add the transaction fee as an expense from the bank account
      if (feeRate > 0) {
        const feeAmount = p.amount * (feeRate / 100);
        if (feeAmount > 0) {
          newFinancialEntries.push({
            description: `Taxa ${p.method} venda #${newSale.id.slice(-6)}`,
            amount: feeAmount,
            type: 'expense',
            source: 'bank_account',
            saleId: newSale.id,
            adjustmentId: null
          });
        }
      }
    }
  });

  if (newFinancialEntries.length > 0) {
    addFinancialEntry(newFinancialEntries);
  }
};

export const removeSale = (saleId: string) => {
  const currentSales = getSales();
  const updatedSales = currentSales.filter(s => s.id !== saleId);
  saveSales(updatedSales);

  const currentFinancials = getFinancialEntries();
  const updatedFinancials = currentFinancials.filter(e => e.saleId !== saleId);
  saveFinancialEntries(updatedFinancials);
}

export const addFinancialEntry = (entry: Omit<FinancialEntry, 'id' | 'timestamp'> | Omit<FinancialEntry, 'id' | 'timestamp'>[]) => {
    const currentEntries = getFinancialEntries();
    const entriesToAdd = Array.isArray(entry) ? entry : [entry];

    const newEntries: FinancialEntry[] = entriesToAdd.map(e => ({
        ...e,
        id: `fin-${Date.now()}-${Math.random()}`,
        timestamp: new Date()
    }));

    // Update balances based on the new entries
    newEntries.forEach(e => {
        if (e.source === 'bank_account') {
            const currentAccount = getBankAccount();
            const newBalance = e.type === 'income' 
                ? currentAccount.balance + e.amount 
                : currentAccount.balance - e.amount;
            saveBankAccount({ balance: newBalance });
        }
        // NOTE: 'daily_cash' and 'secondary_cash' are handled separately
        // in their respective components to avoid double-counting or complex state management here.
    });


    saveFinancialEntries([...currentEntries, ...newEntries]);
};

export const removeFinancialEntry = (entryId: string) => {
  const currentEntries = getFinancialEntries();
  const entryToRemove = currentEntries.find(e => e.id === entryId);
  if (!entryToRemove) return;

  const updatedEntries = currentEntries.filter(e => e.id !== entryId);
  saveFinancialEntries(updatedEntries);

  // Revert balance changes upon deletion
  if (entryToRemove.source === 'bank_account') {
    const currentAccount = getBankAccount();
    const newBalance = entryToRemove.type === 'income'
        ? currentAccount.balance - entryToRemove.amount // Revert income by subtracting
        : currentAccount.balance + entryToRemove.amount; // Revert expense by adding
    saveBankAccount({ balance: newBalance });
  } else if (entryToRemove.source === 'secondary_cash' && entryToRemove.type === 'expense') {
     const currentBox = getSecondaryCashBox();
     saveSecondaryCashBox({ balance: currentBox.balance + entryToRemove.amount });
  } else if (entryToRemove.source === 'daily_cash' && entryToRemove.type === 'expense') {
    const cashStatus = getCashRegisterStatus();
    if(cashStatus.status === 'open') {
        const adjustment: CashAdjustment = {
            id: `adj-revert-${Date.now()}`,
            amount: entryToRemove.amount,
            type: 'in', // Revert an expense by adding money back
            description: `Estorno despesa: ${entryToRemove.description}`,
            timestamp: new Date().toISOString(),
            isCorrection: true, // Mark as a system correction
        };
        saveCashRegisterStatus({...cashStatus, adjustments: [...(cashStatus.adjustments || []), adjustment]});
    }
  }
}

// --- UI Helpers ---

export const LUCIDE_ICON_MAP: Record<string, LucideIcon> = {
  Beer, Wine, Martini, Coffee, UtensilsCrossed, CakeSlice, Package, Wallet
};

export const PAYMENT_METHODS: { name: string; value: PaymentMethod; icon: LucideIcon }[] = [
  { name: 'Dinheiro', value: 'cash', icon: Banknote },
  { name: 'Cartão de Débito', value: 'debit', icon: CreditCard },
  { name: 'Cartão de Crédito', value: 'credit', icon: CreditCard },
  { name: 'PIX', value: 'pix', icon: QrCode },
];

export const formatCurrency = (value: number) => {
  if (typeof value !== 'number') return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};
