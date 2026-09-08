// src/types/index.ts

export interface PriceTier {
  minQuantity: number;
  pricePerUnit: number;
}

export interface Variant {
  id: string;
  name: string;
  imageUrls?: string[];
  priceTiers?: PriceTier[];
}

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: number | string;
  brand?: string;
  name: string;
  categoryIds?: string[];
  categoryNames?: string[];
  priceTiers: PriceTier[];
  imageUrls: string[];
  variants?: Variant[];
  crossProductPromotions?: CrossPromotion[];
}

export interface CartItem extends Product {
  quantity: number;
  parentId?: number | string;
  customTotal?: number | null;
  finalPrice?: number | null;
  discountPercentage: number;
  manualTotal: number | null;
  manualPercentage: number;
  promoId?: string;
  isPromo?: boolean;
  includedItems?: CartItem[];
  manualPricePerUnit?: number | null;
}

export type PaymentMethod =
  | "Efectivo pesos"
  | "Efectivo dólares"
  | "Transferencia Macro"
  | "Transferencia Santander"
  | "Mercado Pago"
  | "Tarjeta de crédito NAVE";

export const PAYMENT_METHODS: PaymentMethod[] = [
  "Efectivo pesos",
  "Efectivo dólares",
  "Transferencia Macro",
  "Transferencia Santander",
  "Mercado Pago",
  "Tarjeta de crédito NAVE",
];

export interface OrderPayment {
  method: PaymentMethod | string;
  amount: number;
}

export interface Order {
  id: string; // uuid
  created_at: string;
  status: "PENDING_PAYMENT" | "COMPLETED" | string;
  date: {
    day: number;
    month: number;
    year: number;
    hour: number;
    minutes: number;
  };
  total: number;
  discounted_amount: number;
  items: {
    id: string;
    brand: string;
    name: string;
    quantity: number;
    finalPrice: number | null;
    discountPercentage: number;
  }[];
  buyer_details: {
    name: string;
    dni: string;
    phone: string;
  };
  seller_name: string;
  autoApplyPromos?: boolean;
  notes?: string | null;
  payment_method?: PaymentMethod | string | null;
  payments?: OrderPayment[] | null;
  promos_sold?: { id: string; title: string; quantity: number }[] | null;
}

export interface CrossPromotion {
  id: string;
  title: string;
  totalPrice: number;
  isPromo: boolean;
  items: {
    id: string;
    name: string;
    quantity: number;
    pricePerUnit: number;
    notes?: string;
    matchBy?: string;
  }[];
}
