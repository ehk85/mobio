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
      payload: FlightOffer;
    }
  | {
      id: string;
      type: 'hotel';
      title: string;
      subtitle: string;
      amount: number;
      currency: string;
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
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const addFlight = (flight: FlightOffer) => {
    const itemId = `flight-${flight.id}`;
    setItems((current) => {
      if (current.some((item) => item.id === itemId)) return current;
      return [
        ...current,
        {
          id: itemId,
          type: 'flight',
          title: `${flight.from} → ${flight.to}`,
          subtitle: `${flight.airline} • ${flight.direct ? 'Direct' : 'Escale'}`,
          amount: flight.price,
          currency: flight.currency,
          payload: flight,
        },
      ];
    });
  };

  const addHotel = (hotel: HotelOffer) => {
    const itemId = `hotel-${hotel.id}`;
    setItems((current) => {
      if (current.some((item) => item.id === itemId)) return current;
      return [
        ...current,
        {
          id: itemId,
          type: 'hotel',
          title: hotel.name,
          subtitle: `${hotel.city} • ${hotel.stars}★`,
          amount: hotel.pricePerNight,
          currency: hotel.currency,
          payload: hotel,
        },
      ];
    });
  };

  const removeItem = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setItems([]);
  };

  const value = useMemo<CartContextValue>(() => {
    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
    const currency = items[0]?.currency ?? 'EUR';
    return {
      items,
      count: items.length,
      totalAmount,
      currency,
      addFlight,
      addHotel,
      removeItem,
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
