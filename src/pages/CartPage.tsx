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
  const { items, count, totalAmount, currency, removeItem, clearCart } = useCart();
  const [paymentMode, setPaymentMode] = useState<'hotel' | 'online'>('online');
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
        reservationType: paymentMode === 'online' ? 'flight' : 'hotel',
        reservationId: `cart-${Date.now()}`,
      });

      if (result.status === 'success') {
        await createPurchase({
          userId: user.id,
          amount: totalAmount,
          currency,
          paymentMode,
          paymentReference: result.reference,
          customer,
          items: items.map((item) => ({
            cartItemId: item.id,
            type: item.type,
            title: item.title,
            subtitle: item.subtitle,
            amount: item.amount,
            currency: item.currency,
          })),
        });
        clearCart();
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
    <main className="layout section-page-layout reservation-layout">
      <section className="section-page-header">
        <p className="hero-kicker">RESERVATION</p>
        <h1>{t('cartTitle')}</h1>
        <p>{t('cartSubtitle')}</p>
      </section>

      <section className="card booking-overview-card">
        <div className="booking-overview-head">
          <strong>{t('cartItemsCount', { count })}</strong>
          <button onClick={clearCart}>{t('cartClear')}</button>
        </div>

        <div className="booking-list">
          {items.map((item) => (
            <article className="booking-row" key={item.id}>
              <div>
                <h4>{item.title}</h4>
                <p>{item.subtitle}</p>
              </div>
              <div className="booking-row-side">
                <strong>
                  {item.amount} {item.currency}
                </strong>
                <button onClick={() => removeItem(item.id)}>{t('cartRemove')}</button>
              </div>
            </article>
          ))}
          {items.length === 0 && <p className="empty-copy">{t('cartEmpty')}</p>}
        </div>

        <div className="booking-total-row">
          <span>{t('cartTotal')}</span>
          <strong>
            {totalAmount} {currency}
          </strong>
        </div>
      </section>

      <section className="card reservation-confirm-card">
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

          <label className="checkbox-row">
            <input
              type="radio"
              name="paymentMode"
              checked={paymentMode === 'hotel'}
              onChange={() => setPaymentMode('hotel')}
            />
            {t('cartPayHotel')}
          </label>
          <label className="checkbox-row">
            <input
              type="radio"
              name="paymentMode"
              checked={paymentMode === 'online'}
              onChange={() => setPaymentMode('online')}
            />
            {t('cartPayOnline')}
          </label>

          <button className="primary" type="submit" disabled={loading}>
            {loading ? t('cartValidating') : t('cartConfirm')}
          </button>
        </form>

        {message && <p className="status-msg">{message}</p>}
      </section>
    </main>
  );
};
