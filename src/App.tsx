import React, { useEffect, useState } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { TopNavigation, Footer } from './components/NavbarAndFooter';
import { CartDrawer } from './components/CartDrawer';
import { HomePage } from './pages/HomePage';
import { ShopPage } from './pages/ShopPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrdersPage } from './pages/OrdersPage';
import { AccountAndWishlistPage } from './pages/AccountPage';
import { AboutPage, ContactPage, PolicyAndGuidePage } from './pages/AboutContactPolicyPages';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

function AppShell() {
  const { route, toasts } = useStore();
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);

  useEffect(() => {
    const handler = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handler);
    return () => window.removeEventListener('gmp-quota-exceeded', handler);
  }, []);

  const renderPage = () => {
    switch (route) {
      case 'home':
        return <HomePage />;
      case 'shop':
        return <ShopPage />;
      case 'product':
        return <ProductDetailPage />;
      case 'checkout':
        return <CheckoutPage />;
      case 'orders':
        return <OrdersPage />;
      case 'account':
        return <AccountAndWishlistPage mode="account" />;
      case 'wishlist':
        return <AccountAndWishlistPage mode="wishlist" />;
      case 'about':
        return <AboutPage />;
      case 'contact':
        return <ContactPage />;
      case 'admin':
        return <AdminDashboardPage />;
      case 'privacy':
      case 'terms':
      case 'shipping':
      case 'returns':
      case 'faq':
      case 'size-guide':
        return <PolicyAndGuidePage page={route} />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#111111]">
      {mapsQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {route !== 'admin' && <TopNavigation />}

      <div className="flex-1">{renderPage()}</div>

      {route !== 'admin' && <Footer />}
      <CartDrawer />

      {/* Toast Notifications */}
      {toasts.length > 0 && (
        <div className="fixed bottom-5 right-5 z-50 space-y-2 max-w-sm no-print">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`px-4 py-3 text-xs font-medium shadow-lg border ${
                t.tone === 'error'
                  ? 'bg-red-950 text-white border-red-800'
                  : t.tone === 'success'
                  ? 'bg-[#0D0D0D] text-[#EAE2D3] border-[#B8924A]'
                  : 'bg-white text-[#111111] border-[#D6CCB8]'
              }`}
            >
              {t.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppShell />
    </StoreProvider>
  );
}
