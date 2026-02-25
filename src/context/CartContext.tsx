import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { FlightOffer, HotelOffer } from '../types';

export type CartItem =
  | {
      id: string;
      type: 'flight';
      title: string;
      subtitle: string;
      amount: number;
      currency: string;
      quantity: number;
      payload: FlightOffer;
    }
  | {
      id: string;
      type: 'hotel';
      title: string;
      subtitle: string;
      amount: number;
      currency: string;
      quantity: number;
      payload: HotelOffer;
    };

interface CartContextValue {
  items: CartItem[];
  count: number;
  totalAmount: number;
  currency: string;
  addFlight: (flight: FlightOffer) => void;
  addHotel: (hotel: HotelOffer) => void;
  removeItem: (id: string) => void;
  updateItemQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const addFlight = (flight: FlightOffer) => {
    const itemId = `flight-${flight.id}`;
    setItems((current) => {
      const existing = current.find((item) => item.id === itemId);
      if (existing) {
        return current.map((item) =>
          item.id === itemId ? { ...item, quantity: Math.min(99, item.quantity + 1) } : item
        );
      }
      return [
        ...current,
        {
          id: itemId,
          type: 'flight',
          title: `${flight.from} → ${flight.to}`,
          subtitle: `${flight.airline} • ${flight.direct ? 'Direct' : 'Escale'}`,
          amount: flight.price,
          currency: flight.currency,
          quantity: 1,
          payload: flight,
        },
      ];
    });
  };

  const addHotel = (hotel: HotelOffer) => {
    const itemId = `hotel-${hotel.id}`;
    setItems((current) => {
      const existing = current.find((item) => item.id === itemId);
      if (existing) {
        return current.map((item) =>
          item.id === itemId ? { ...item, quantity: Math.min(99, item.quantity + 1) } : item
        );
      }
      return [
        ...current,
        {
          id: itemId,
          type: 'hotel',
          title: hotel.name,
          subtitle: `${hotel.city} • ${hotel.stars}★`,
          amount: hotel.pricePerNight,
          currency: hotel.currency,
          quantity: 1,
          payload: hotel,
        },
      ];
    });
  };

  const removeItem = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const updateItemQuantity = (id: string, quantity: number) => {
    const safeQuantity = Math.max(1, Math.min(99, Math.round(quantity)));
    setItems((current) => current.map((item) => (item.id === id ? { ...item, quantity: safeQuantity } : item)));
  };

  const clearCart = () => {
    setItems([]);
  };

  const value = useMemo<CartContextValue>(() => {
    const totalAmount = items.reduce((sum, item) => sum + item.amount * item.quantity, 0);
    const currency = items[0]?.currency ?? 'EUR';
    return {
      items,
      count: items.reduce((sum, item) => sum + item.quantity, 0),
      totalAmount,
      currency,
      addFlight,
      addHotel,
      removeItem,
      updateItemQuantity,
      clearCart,
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart doit être utilisé à l\'intérieur de CartProvider.');
  }
  return context;
};
