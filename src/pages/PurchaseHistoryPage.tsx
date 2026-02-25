import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../context/I18nContext';
import { getCurrentUser } from '../services/auth';
import { fetchPurchaseHistory } from '../services/purchases';

type PurchaseStatus = 'in-progress' | 'delivered';

type PurchaseItem = {
  id: string;
  status: PurchaseStatus;
  date: string;
  shippedAt: string;
  deliveredAt: string;
  location: string;
  image: string;
  amount: number;
  currency: string;
  paymentReference?: string;
};

export const PurchaseHistoryPage = () => {
  const { t, locale } = useI18n();
  const user = useMemo(() => getCurrentUser(), []);
  const [purchases, setPurchases] = useState<PurchaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!user) {
        setLoading(false);
        setPurchases([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await fetchPurchaseHistory(user.id);
        if (cancelled) return;

        const mapped = data.map((purchase) => {
          const purchaseDate = new Date(purchase.createdAt);
          const shippedDate = new Date(purchaseDate.getTime() + 24 * 60 * 60 * 1000);
          const deliveredDate = new Date(purchaseDate.getTime() + 3 * 24 * 60 * 60 * 1000);
          const firstItem = purchase.items[0];
          const image =
            firstItem?.type === 'hotel'
              ? 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=500&q=80'
              : 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=500&q=80';

          return {
            id: purchase.orderNumber,
            status: purchase.status,
            date: purchaseDate.toLocaleDateString(locale),
            shippedAt: shippedDate.toLocaleDateString(locale),
            deliveredAt: deliveredDate.toLocaleDateString(locale),
            location:
              purchase.customer.country || purchase.customer.zipCode
                ? `${purchase.customer.country} ${purchase.customer.zipCode}`.trim()
                : t('purchaseUnknownLocation'),
            image,
            amount: purchase.amount,
            currency: purchase.currency,
            paymentReference: purchase.paymentReference,
          } satisfies PurchaseItem;
        });

        setPurchases(mapped);
      } catch {
        if (cancelled) return;
        setError(t('purchaseLoadError'));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [locale, t, user]);

  return (
    <main className="layout section-page-layout purchase-layout">
      <section className="section-page-header">
        <p className="hero-kicker">ORDERS</p>
        <h1>{t('purchaseTitle')}</h1>
        <p>{t('purchaseSubtitle')}</p>
      </section>

      <section className="purchase-grid">
        <aside className="card purchase-sidebar">
          <button type="button" className="purchase-side-link active">
            {t('purchaseMenuHistory')}
          </button>
          <button type="button" className="purchase-side-link">
            {t('purchaseMenuFAQ')}
          </button>
          <button type="button" className="purchase-side-link">
            {t('purchaseMenuExit')}
          </button>
        </aside>

        <section className="purchase-list">
          {!user && <p className="empty-copy">{t('purchaseLoginRequired')}</p>}
          {user && loading && <p className="empty-copy">{t('purchaseLoading')}</p>}
          {user && !loading && error && <p className="empty-copy">{error}</p>}
          {user && !loading && !error && purchases.length === 0 && (
            <p className="empty-copy">{t('purchaseEmpty')}</p>
          )}

          {user &&
            !loading &&
            !error &&
            purchases.map((purchase, index) => (
            <article key={`${purchase.id}-${index}`} className="card order-card">
              <div className="order-timeline">
                <div className="timeline-step active">
                  <span />
                  <div>
                    <strong>{t('purchaseStepDepart')}</strong>
                    <small>{purchase.date}</small>
                  </div>
                </div>
                <div className={`timeline-step ${purchase.status !== 'in-progress' ? 'active' : ''}`}>
                  <span />
                  <div>
                    <strong>{t('purchaseStepShipped')}</strong>
                    <small>{purchase.shippedAt}</small>
                  </div>
                </div>
                <div className={`timeline-step ${purchase.status === 'delivered' ? 'active' : ''}`}>
                  <span />
                  <div>
                    <strong>{t('purchaseStepDelivered')}</strong>
                    <small>{purchase.deliveredAt}</small>
                  </div>
                </div>
              </div>

              <div className="order-content">
                <img src={purchase.image} alt="Order item" />
                <div className="order-info">
                  <h3>{purchase.id}</h3>
                  <span className={`order-status ${purchase.status}`}>
                    {purchase.status === 'in-progress' ? t('purchaseInProgress') : t('purchaseDelivered')}
                  </span>
                  <p>{purchase.date}</p>
                  <p>
                    <strong>{t('cartTotal')}</strong> {purchase.amount} {purchase.currency}
                  </p>
                  <p>
                    <strong>{t('purchaseLocation')}</strong> {purchase.location}
                  </p>
                  {purchase.paymentReference ? (
                    <p>
                      <strong>{t('purchaseReference')}</strong> {purchase.paymentReference}
                    </p>
                  ) : null}
                </div>
                <button type="button" className="order-more-btn">
                  {t('purchaseMoreDetails')}
                </button>
              </div>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
};
