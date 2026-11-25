import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { CartItem, Category, PageRoute, Product, User, WebsiteSettings } from '../types';

export interface ShopFilterParams {
  gender?: string;
  category?: string;
  collection?: string;
  flag?: string;
  search?: string;
}

interface ToastMessage {
  id: number;
  text: string;
  tone: 'neutral' | 'success' | 'error';
}

interface StoreContextValue {
  route: PageRoute;
  productSlug: string | null;
  shopFilters: ShopFilterParams;
  navigate: (nextRoute: PageRoute, opts?: { slug?: string; filters?: ShopFilterParams }) => void;
  user: User | null;
  token: string | null;
  setAuthSession: (token: string | null, user: User | null) => void;
  logout: () => void;
  apiFetch: <T = any>(url: string, options?: RequestInit) => Promise<T>;
  categories: Category[];
  settings: WebsiteSettings;
  refreshGlobalData: () => Promise<void>;
  cart: CartItem[];
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addToCart: (product: Product, variantId: number, quantity?: number) => void;
  updateCartQty: (variantId: number, quantity: number) => void;
  removeFromCart: (variantId: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartSubtotal: number;
  wishlistIds: number[];
  toggleWishlist: (productId: number) => Promise<void>;
  toasts: ToastMessage[];
  notify: (text: string, tone?: 'neutral' | 'success' | 'error') => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [route, setRoute] = useState<PageRoute>('home');
  const [productSlug, setProductSlug] = useState<string | null>(null);
  const [shopFilters, setShopFilters] = useState<ShopFilterParams>({});

  // Auth token kept strictly in React memory (never localStorage/sessionStorage)
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<WebsiteSettings>({});
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [wishlistIds, setWishlistIds] = useState<number[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const notify = useCallback((text: string, tone: 'neutral' | 'success' | 'error' = 'neutral') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev.slice(-2), { id, text, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  const apiFetch = useCallback(
    async <T = any>(url: string, options: RequestInit = {}): Promise<T> => {
      const headers = new Headers(options.headers || {});
      if (!headers.has('Content-Type') && options.body) {
        headers.set('Content-Type', 'application/json');
      }
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      const res = await fetch(url, { ...options, headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      return data as T;
    },
    [token]
  );

  const refreshGlobalData = useCallback(async () => {
    try {
      const [catsRes, setRes] = await Promise.all([
        fetch('/api/categories').then((r) => r.json()),
        fetch('/api/settings').then((r) => r.json()),
      ]);
      if (Array.isArray(catsRes)) setCategories(catsRes);
      if (setRes && typeof setRes === 'object') setSettings(setRes);
    } catch {
      // ignore initial network hiccup
    }
  }, []);

  useEffect(() => {
    refreshGlobalData();
  }, [refreshGlobalData]);

  useEffect(() => {
    if (!token) return;
    fetch('/api/auth/wishlist', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((ids) => {
        if (Array.isArray(ids)) setWishlistIds(ids);
      })
      .catch(() => {});
  }, [token]);

  const setAuthSession = useCallback((newToken: string | null, newUser: User | null) => {
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setWishlistIds([]);
    notify('Signed out of Maison Verri.', 'neutral');
  }, [notify]);

  const navigate = useCallback(
    (nextRoute: PageRoute, opts?: { slug?: string; filters?: ShopFilterParams }) => {
      setRoute(nextRoute);
      if (opts?.slug !== undefined) setProductSlug(opts.slug);
      if (opts?.filters !== undefined) setShopFilters(opts.filters);
      else if (nextRoute === 'shop' && !opts?.filters) setShopFilters({});
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    []
  );

  const addToCart = useCallback(
    (product: Product, variantId: number, quantity = 1) => {
      const variant = product.variants.find((v) => v.id === variantId) || product.variants[0];
      if (!variant || variant.stock_qty <= 0) {
        notify('This selection is currently out of stock.', 'error');
        return;
      }
      const primaryImg = product.images[0]?.image_url || '';
      setCart((prev) => {
        const existing = prev.find((i) => i.variant_id === variant.id);
        if (existing) {
          const nextQty = Math.min(variant.stock_qty, existing.quantity + quantity);
          return prev.map((i) => (i.variant_id === variant.id ? { ...i, quantity: nextQty, max_stock: variant.stock_qty } : i));
        }
        return [
          ...prev,
          {
            product_id: product.id,
            variant_id: variant.id,
            slug: product.slug,
            name: product.name,
            brand: product.brand,
            image_url: primaryImg,
            size: variant.size,
            color: variant.color,
            unit_price: variant.price_override ?? product.final_price,
            quantity: Math.min(variant.stock_qty, quantity),
            max_stock: variant.stock_qty,
          },
        ];
      });
      setIsCartOpen(true);
      notify(`Added ${product.name} to your bag.`, 'success');
    },
    [notify]
  );

  const updateCartQty = useCallback((variantId: number, quantity: number) => {
    setCart((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.variant_id !== variantId)
        : prev.map((i) => (i.variant_id === variantId ? { ...i, quantity: Math.min(i.max_stock, quantity) } : i))
    );
  }, []);

  const removeFromCart = useCallback((variantId: number) => {
    setCart((prev) => prev.filter((i) => i.variant_id !== variantId));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const toggleWishlist = useCallback(
    async (productId: number) => {
      if (token) {
        try {
          const res = await apiFetch<{ wishlisted: boolean }>('/api/auth/wishlist/toggle', {
            method: 'POST',
            body: JSON.stringify({ product_id: productId }),
          });
          setWishlistIds((prev) => (res.wishlisted ? [...new Set([...prev, productId])] : prev.filter((id) => id !== productId)));
          notify(res.wishlisted ? 'Saved to wishlist.' : 'Removed from wishlist.', 'neutral');
          return;
        } catch {
          // fallback
        }
      }
      setWishlistIds((prev) => {
        const exists = prev.includes(productId);
        notify(exists ? 'Removed from wishlist.' : 'Saved to wishlist.', 'neutral');
        return exists ? prev.filter((id) => id !== productId) : [...prev, productId];
      });
    },
    [token, apiFetch, notify]
  );

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartSubtotal = cart.reduce((acc, item) => acc + item.unit_price * item.quantity, 0);

  return (
    <StoreContext.Provider
      value={{
        route,
        productSlug,
        shopFilters,
        navigate,
        user,
        token,
        setAuthSession,
        logout,
        apiFetch,
        categories,
        settings,
        refreshGlobalData,
        cart,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        cartCount,
        cartSubtotal,
        wishlistIds,
        toggleWishlist,
        toasts,
        notify,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
