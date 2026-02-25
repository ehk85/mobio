import { useState } from 'react';
import { processPayment } from '../services/payments';
import { useCart } from '../context/CartContext';
import { useI18n } from '../context/I18nContext';
import { getCurrentUser } from '../services/auth';
import { createPurchase } from '../services/purchases';

type CustomerFormData = {
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  zipCode: string;
  notes: string;
};

export const CartPage = () => {
  const { t } = useI18n();
  const { items, count, totalAmount, currency, removeItem, updateItemQuantity } = useCart();
  const [paymentMode, setPaymentMode] = useState<'card' | 'wallet' | 'split'>('card');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validateCart = async (customer: CustomerFormData) => {
    const user = getCurrentUser();
    if (!user) {
      setMessage(t('purchaseLoginRequired'));
      return;
    }

    if (items.length === 0) {
      setMessage(t('cartEmptyError'));
      return;
    }

    setLoading(true);
    try {
      const result = await processPayment({
        amount: totalAmount,
        currency,
        reservationType: 'flight',
        reservationId: `cart-${Date.now()}`,
        paymentMode,
      });

      if (result.status === 'success') {
        await createPurchase({
          userId: user.id,
          amount: totalAmount,
          currency,
          paymentMode: 'online',
          paymentReference: result.reference,
          customer,
          items: items.map((item) => ({
            cartItemId: item.id,
            type: item.type,
            title: `${item.title} x${item.quantity}`,
            subtitle: item.subtitle,
            amount: Number((item.amount * item.quantity).toFixed(2)),
            currency: item.currency,
          })),
        });
        window.location.reload();
        setMessage(t('cartHistorySaved'));
        return;
      }

      setMessage(result.message);
    } catch {
      setMessage(t('cartHistorySaveError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="layout section-page-layout reservation-layout cart-modern-layout">
      <section className="section-page-header">
        <p className="hero-kicker">RESERVATION</p>
        <h1>{t('cartTitle')}</h1>
        <p>{t('cartSubtitle')}</p>
      </section>

      <section className="cart-modern-grid">
        <article className="card cart-modern-main">
          <header className="cart-modern-head">
            <span>Product</span>
            <span>Quantity</span>
            <span>Total</span>
            <span>Action</span>
          </header>

          <div className="cart-modern-list">
            {items.map((item) => {
              const lineTotal = Number((item.amount * item.quantity).toFixed(2));
              return (
                <article className="cart-modern-row" key={item.id}>
                  <div className="cart-modern-product">
                    <img
                      src={`https://picsum.photos/seed/cart-${item.id}/120/120`}
                      alt={item.title}
                      loading="lazy"
                    />
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.subtitle}</p>
                    </div>
                  </div>

                  <div className="cart-qty-group">
                    <button
                      type="button"
                      onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    >
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button type="button" onClick={() => updateItemQuantity(item.id, item.quantity + 1)}>
                      +
                    </button>
                  </div>

                  <strong className="cart-line-total">
                    ${lineTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </strong>

                  <button className="cart-trash-btn" onClick={() => removeItem(item.id)}>
                    🗑
                  </button>
                </article>
              );
            })}
            {items.length === 0 && <p className="empty-copy">{t('cartEmpty')}</p>}
          </div>
        </article>

        <aside className="card cart-modern-summary">
          <h3>Order Summary</h3>
          <div className="cart-summary-row">
            <span>Sub Total</span>
            <strong>
              {totalAmount.toFixed(2)} {currency}
            </strong>
          </div>
          <div className="cart-summary-row muted">
            <span>Items</span>
            <span>{count}</span>
          </div>
          <div className="cart-summary-row total">
            <span>{t('cartTotal')}</span>
            <strong>
              {totalAmount.toFixed(2)} {currency}
            </strong>
          </div>

          <div className="cart-payment-modes">
            <p>Payment Method</p>
            <label className={`cart-pay-chip ${paymentMode === 'card' ? 'active' : ''}`}>
              <input
                type="radio"
                name="paymentMode"
                checked={paymentMode === 'card'}
                onChange={() => setPaymentMode('card')}
              />
              Visa / Mastercard
            </label>
            <label className={`cart-pay-chip ${paymentMode === 'wallet' ? 'active' : ''}`}>
              <input
                type="radio"
                name="paymentMode"
                checked={paymentMode === 'wallet'}
                onChange={() => setPaymentMode('wallet')}
              />
              PayPal / Apple Pay / Google Pay
            </label>
            <label className={`cart-pay-chip ${paymentMode === 'split' ? 'active' : ''}`}>
              <input
                type="radio"
                name="paymentMode"
                checked={paymentMode === 'split'}
                onChange={() => setPaymentMode('split')}
              />
              Klarna / Alma
            </label>
          </div>
        </aside>
      </section>

      <section className="card reservation-confirm-card cart-modern-form-card">
        <h3>{t('cartConfirmTitle')}</h3>
        <form
          className="grid"
          onSubmit={(event) => {
            event.preventDefault();

            const form = new FormData(event.currentTarget);
            const customer: CustomerFormData = {
              firstName: String(form.get('firstName') ?? ''),
              lastName: String(form.get('lastName') ?? ''),
              email: String(form.get('email') ?? ''),
              country: String(form.get('country') ?? ''),
              zipCode: String(form.get('zipCode') ?? ''),
              notes: String(form.get('notes') ?? ''),
            };

            void validateCart(customer);
          }}
        >
          <label>
            {t('cartFirstName')}
            <input name="firstName" required />
          </label>
          <label>
            {t('cartLastName')}
            <input name="lastName" required />
          </label>
          <label>
            {t('commonEmail')}
            <input name="email" type="email" defaultValue={getCurrentUser()?.email ?? ''} required />
          </label>
          <label>
            {t('cartCountry')}
            <input name="country" required />
          </label>
          <label>
            {t('cartZipCode')}
            <input name="zipCode" required />
          </label>
          <label>
            {t('cartNotes')}
            <input name="notes" />
          </label>

          <button className="primary cart-checkout-btn" type="submit" disabled={loading}>
            {loading ? t('cartValidating') : 'Checkout Now'}
          </button>
        </form>

        {message && <p className="status-msg">{message}</p>}
      </section>
    </main>
  );
};
