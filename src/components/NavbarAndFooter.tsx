import React, { useState } from 'react';
import { Menu, Search, ShoppingBag, User as UserIcon, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { PageRoute } from '../types';

export function TopNavigation() {
  const { route, navigate, cartCount, setIsCartOpen, settings, user } = useStore();
  const [promoDismissed, setPromoDismissed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const promoBar = settings.promo_bar;
  const showPromo = !promoDismissed && promoBar?.enabled !== false && promoBar?.text;

  const navItems: Array<{ label: string; target: PageRoute }> = [
    { label: 'Shop', target: 'shop' },
    { label: 'Collections', target: 'home' },
    { label: 'Orders', target: 'orders' },
    { label: 'About', target: 'about' },
    { label: 'Contact', target: 'contact' },
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchOpen(false);
    navigate('shop', { filters: { search: searchQuery.trim() } });
  };

  return (
    <div className="sticky top-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#E5DEC9] no-print">
      {showPromo && (
        <div className="bg-[#0D0D0D] text-[#F5F0E8] px-4 py-1.5 text-xs flex items-center justify-center relative">
          <span className="truncate pr-6 tracking-wide">{promoBar?.text}</span>
          <button
            type="button"
            onClick={() => setPromoDismissed(true)}
            aria-label="Dismiss announcement"
            className="absolute right-3 text-[#C6A462] hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Strict 3-Zone Top Bar Contract */}
      <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-Element Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Toggle navigation menu"
            className="md:hidden p-2 -ml-2 text-[#111111]"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <button
            type="button"
            onClick={() => navigate('home')}
            className="font-serif text-xl sm:text-2xl tracking-[0.14em] font-semibold text-[#111111] whitespace-nowrap shrink-0 cursor-pointer"
          >
            MAISON VERRI
          </button>
        </div>

        {/* Zone 2: 5 Clean Single-Line Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#4A4640]">
          {navItems.map((item) => {
            const active = route === item.target;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => navigate(item.target)}
                className={`whitespace-nowrap shrink-0 py-1 border-b transition-colors cursor-pointer ${
                  active
                    ? 'text-[#111111] border-[#B8924A]'
                    : 'border-transparent hover:text-[#111111] hover:border-[#D6CCB8]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Compact Primary Action Cluster */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="Search catalog"
            className="p-2 text-[#4A4640] hover:text-[#111111] transition-colors cursor-pointer"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate('account')}
            aria-label="Account and Wishlist"
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#4A4640] hover:text-[#111111] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <UserIcon className="w-4 h-4" />
            <span>{user ? user.full_name.split(' ')[0] : 'Account'}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#111111] text-[#FAF8F5] text-xs font-medium rounded-sm hover:bg-[#262422] transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-[#C6A462]" />
            <span>Bag ({cartCount})</span>
          </button>
        </div>
      </header>

      {/* Expandable Search Bar */}
      {searchOpen && (
        <div className="border-t border-[#E5DEC9] bg-white px-4 py-3">
          <form onSubmit={handleSearchSubmit} className="max-w-3xl mx-auto flex items-center gap-3">
            <Search className="w-4 h-4 text-[#78716C] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cashmere coats, mulberry silk, leather totes, or SKU..."
              autoFocus
              className="flex-1 text-sm bg-transparent focus:outline-none text-[#111111]"
            />
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#111111] text-white text-xs font-medium rounded-sm whitespace-nowrap cursor-pointer"
            >
              Search
            </button>
          </form>
        </div>
      )}

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E5DEC9] bg-[#FAF8F5] px-4 py-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                navigate(item.target);
              }}
              className="block w-full text-left py-2.5 text-sm font-medium text-[#111111] border-b border-[#EAE2D3]"
            >
              {item.label}
            </button>
          ))}
          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('account');
              }}
              className="text-sm font-medium text-[#111111] py-2"
            >
              Account &amp; Profile
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('wishlist');
              }}
              className="text-sm font-medium text-[#111111] py-2"
            >
              Wishlist
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('admin');
              }}
              className="text-sm font-medium text-[#9A7736] py-2"
            >
              Admin Portal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Footer() {
  const { navigate, notify } = useStore();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Subscription failed');
      }
      setEmail('');
      notify('Welcome to the Maison Verri Private Client Journal.', 'success');
    } catch (err: any) {
      notify(err.message || 'Unable to subscribe.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="bg-[#0D0D0D] text-[#EAE2D3] border-t border-[#26231F] mt-20 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-[#26231F]">
          <div className="space-y-4">
            <h3 className="font-serif text-2xl tracking-[0.12em] text-white">MAISON VERRI</h3>
            <p className="text-sm text-[#A8A095] leading-relaxed">
              Architectural tailoring, fine Como silks, and full-grain Tuscan leather crafted for enduring modern wardrobes.
            </p>
            <p className="text-xs text-[#C6A462]">Kala Ghoda Flagship · Mumbai · Milan</p>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold tracking-wider text-white uppercase">Boutique</h4>
            <ul className="space-y-2 text-sm text-[#A8A095]">
              <li>
                <button type="button" onClick={() => navigate('shop', { filters: { gender: 'Women' } })} className="hover:text-white cursor-pointer">
                  Women&apos;s Tailoring
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('shop', { filters: { gender: 'Men' } })} className="hover:text-white cursor-pointer">
                  Men&apos;s Outerwear
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('shop', { filters: { gender: 'Kids' } })} className="hover:text-white cursor-pointer">
                  Kids&apos; Heritage
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('shop', { filters: { gender: 'Accessories' } })} className="hover:text-white cursor-pointer">
                  Leather &amp; Silk
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('wishlist')} className="hover:text-white cursor-pointer">
                  Saved Wishlist
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold tracking-wider text-white uppercase">Client Care &amp; House</h4>
            <ul className="space-y-2 text-sm text-[#A8A095]">
              <li>
                <button type="button" onClick={() => navigate('about')} className="hover:text-white cursor-pointer">
                  About the Maison
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('contact')} className="hover:text-white cursor-pointer">
                  Contact &amp; Flagship Map
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('size-guide')} className="hover:text-white cursor-pointer">
                  Size Guide
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('faq')} className="hover:text-white cursor-pointer">
                  Frequently Asked Questions
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('shipping')} className="hover:text-white cursor-pointer">
                  Shipping Policy
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('returns')} className="hover:text-white cursor-pointer">
                  Return &amp; Refund Policy
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-semibold tracking-wider text-white uppercase">Private Client List</h4>
            <p className="text-sm text-[#A8A095]">
              Receive seasonal lookbooks, private capsule invitations, and archive releases.
            </p>
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                className="flex-1 min-w-0 bg-[#1A1816] border border-[#322E29] px-3 py-2 text-sm text-white placeholder-[#78716C] focus:outline-none focus:border-[#C6A462]"
              />
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-[#B8924A] text-[#0D0D0D] text-xs font-semibold rounded-sm hover:bg-[#C6A462] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {submitting ? 'Joining...' : 'Join'}
              </button>
            </form>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#78716C]">
          <p>© {new Date().getFullYear()} MAISON VERRI Atelier Pvt. Ltd. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-6">
            <button type="button" onClick={() => navigate('privacy')} className="hover:text-[#EAE2D3] cursor-pointer">
              Privacy Policy
            </button>
            <button type="button" onClick={() => navigate('terms')} className="hover:text-[#EAE2D3] cursor-pointer">
              Terms &amp; Conditions
            </button>
            <button type="button" onClick={() => navigate('admin')} className="text-[#C6A462] hover:text-white cursor-pointer">
              Admin &amp; Power BI Portal
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
