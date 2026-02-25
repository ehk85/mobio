import { env } from '../config/env';

export interface PurchaseLineItem {
  cartItemId: string;
  type: 'flight' | 'hotel';
  title: string;
  subtitle: string;
  amount: number;
  currency: string;
}

export interface PurchaseCustomer {
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  zipCode: string;
  notes: string;
}

export interface PurchaseRecord {
  id: string;
  userId: string;
  orderNumber: string;
  status: 'in-progress' | 'delivered';
  amount: number;
  currency: string;
  paymentMode: 'hotel' | 'online';
  paymentReference?: string;
  customer: PurchaseCustomer;
  items: PurchaseLineItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePurchasePayload {
  userId: string;
  amount: number;
  currency: string;
  paymentMode: 'hotel' | 'online';
  paymentReference?: string;
  items: PurchaseLineItem[];
  customer: PurchaseCustomer;
}

export const createPurchase = async (payload: CreatePurchasePayload): Promise<PurchaseRecord> => {
  const response = await fetch(`${env.apiServerUrl}/purchases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(err?.message ?? 'Impossible d’enregistrer cet achat.');
  }

  return (await response.json()) as PurchaseRecord;
};

export const fetchPurchaseHistory = async (userId: string): Promise<PurchaseRecord[]> => {
  const response = await fetch(`${env.apiServerUrl}/purchases/user/${encodeURIComponent(userId)}`);

  if (!response.ok) {
    const err = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(err?.message ?? 'Impossible de charger l’historique des achats.');
  }

  const data = (await response.json()) as { results?: PurchaseRecord[] };
  return data.results ?? [];
};
