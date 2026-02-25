import { env } from '../config/env';

export interface PaymentPayload {
  amount: number;
  currency: string;
  reservationType: 'flight' | 'hotel';
  reservationId: string;
  paymentMode?: 'card' | 'wallet' | 'split';
}

export interface PaymentResult {
  status: 'success' | 'failed';
  message: string;
  reference?: string;
}

export const processPayment = async (payload: PaymentPayload): Promise<PaymentResult> => {
  if (!env.paymentServerUrl) {
    return {
      status: 'success',
      message: 'Paiement simulé (mode développement).',
      reference: `MOCK-${Date.now()}`,
    };
  }

  const response = await fetch(`${env.paymentServerUrl}/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return {
      status: 'failed',
      message: 'Paiement refusé.',
    };
  }

  return (await response.json()) as PaymentResult;
};
