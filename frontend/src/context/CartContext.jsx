// Purpose: React context chia se state ung dung nhu gio hang hoac ngon ngu.
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import bookingService from '../services/booking.service';
import { useAuth } from '../hooks/useAuth';

const CartContext = createContext();

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [cartCount, setCartCount] = useState(0);

  const fetchCart = useCallback(async () => {
    if (!user) {
      setCartItems([]);
      setCartCount(0);
      return;
    }
    try {
      const res = await bookingService.getMyPendingLocks();
      const items = res.data?.data || [];
      // Filter out expired locks immediately
      const activeItems = items.filter(item => new Date(item.sessionExpiresAt || item.expiresAt).getTime() > Date.now());
      setCartItems(activeItems);
      setCartCount(activeItems.length);
    } catch (err) {
      console.error('Failed to fetch cart:', err);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Start an interval to remove expired items automatically
  useEffect(() => {
    const timer = setInterval(() => {
      setCartItems(prevItems => {
        const now = Date.now();
        const activeItems = prevItems.filter(item => new Date(item.sessionExpiresAt || item.expiresAt).getTime() > now);
        if (activeItems.length !== prevItems.length) {
          setCartCount(activeItems.length);
          return activeItems;
        }
        return prevItems;
      });
    }, 1000); // Check every second

    return () => clearInterval(timer);
  }, []);

  const refreshCart = () => {
    fetchCart();
  };

  return (
    <CartContext.Provider value={{ cartItems, cartCount, refreshCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
