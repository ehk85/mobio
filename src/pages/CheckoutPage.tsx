import { useState } from 'react';
import type { FormEvent } from 'react';
import { processPayment } from '../services/payments';

export const CheckoutPage = () => {
  const [amount, setAmount] = useState(100);
  const [currency, setCurrency] = useState('EUR');
  const [reservationType, setReservationType] = useState<'flight' | 'hotel'>('flight');
  const [reservationId, setReservationId] = useState('demo-123');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    const result = await processPayment({
      amount,
      currency,
      reservationType,
      reservationId,
    });
    setMessage(`${result.message}${result.reference ? ` Réf: ${result.reference}` : ''}`);
    setLoading(false);
  };

  return (
    <main className="layout checkout-layout">
      <section className="checkout-panel">
        <div className="checkout-header">
          <p className="hero-kicker">SECURE PAYMENT</p>
          <h1>Finaliser votre réservation</h1>
          <p>Validez votre vol ou hôtel avec un paiement rapide et sécurisé.</p>
        </div>

        <div className="checkout-grid">
          <form onSubmit={submit} className="card checkout-card grid">
            <label>
              Type réservation
              <select
                value={reservationType}
                onChange={(e) => setReservationType(e.target.value as 'flight' | 'hotel')}
              >
                <option value="flight">Vol</option>
                <option value="hotel">Hôtel</option>
              </select>
            </label>
            <label>
              Référence réservation
              <input value={reservationId} onChange={(e) => setReservationId(e.target.value)} required />
            </label>
            <label>
              Montant
              <input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                required
              />
            </label>
            <label>
              Devise
              <input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} required />
            </label>
            <button className="primary" type="submit" disabled={loading}>
              {loading ? 'Traitement...' : 'Payer'}
            </button>
            {message && <p className="status-msg">{message}</p>}
          </form>

          <aside className="card checkout-side">
            <h2>Résumé</h2>
            <div className="summary-row">
              <span>Type</span>
              <strong>{reservationType === 'flight' ? 'Vol' : 'Hôtel'}</strong>
            </div>
            <div className="summary-row">
              <span>Référence</span>
              <strong>{reservationId || '-'}</strong>
            </div>
            <div className="summary-row total">
              <span>Total</span>
              <strong>
                {amount || 0} {currency}
              </strong>
            </div>
            <p>Les paiements sont simulés si aucun backend paiement n’est configuré.</p>
          </aside>
        </div>
      </section>
    </main>
  );
};
