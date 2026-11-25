import React, { useEffect, useState } from 'react';
import { Heart, LogOut, MapPin, Plus, Trash2, User as UserIcon } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/ProductCard';
import type { Address, Product } from '../types';

export function AccountAndWishlistPage({ mode }: { mode: 'account' | 'wishlist' }) {
  const { user, token, setAuthSession, logout, apiFetch, wishlistIds, navigate, notify } = useStore();

  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [profileName, setProfileName] = useState(user?.full_name || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [newAddr, setNewAddr] = useState<Address>({
    full_name: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
  });

  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);

  useEffect(() => {
    setProfileName(user?.full_name || '');
    setProfilePhone(user?.phone || '');
  }, [user]);

  useEffect(() => {
    if (!token) return;
    apiFetch<Address[]>('/api/auth/addresses')
      .then((list) => Array.isArray(list) && setAddresses(list))
      .catch(() => {});
  }, [token, apiFetch]);

  useEffect(() => {
    if (wishlistIds.length === 0) {
      setWishlistProducts([]);
      return;
    }
    fetch('/api/products')
      .then((r) => r.json())
      .then((all: Product[]) => {
        if (Array.isArray(all)) {
          setWishlistProducts(all.filter((p) => wishlistIds.includes(p.id)));
        }
      })
      .catch(() => {});
  }, [wishlistIds]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const endpoint = authTab === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body =
        authTab === 'login'
          ? { email, password }
          : { email, password, full_name: fullName, phone };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');
      setAuthSession(data.token, data.user);
      notify(`Welcome, ${data.user.full_name}.`, 'success');
    } catch (err: any) {
      notify(err.message || 'Authentication failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch<{ user: typeof user }>('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ full_name: profileName, phone: profilePhone }),
      });
      setAuthSession(token, res.user);
      notify('Profile updated.', 'success');
    } catch (err: any) {
      notify(err.message || 'Unable to update profile.', 'error');
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await apiFetch<Address>('/api/auth/addresses', {
        method: 'POST',
        body: JSON.stringify(newAddr),
      });
      setAddresses((prev) => [created, ...prev]);
      setNewAddr({ full_name: '', phone: '', street: '', city: '', state: '', postal_code: '', country: 'India' });
      notify('Address saved.', 'success');
    } catch (err: any) {
      notify(err.message || 'Unable to save address.', 'error');
    }
  };

  const handleDeleteAddress = async (id: number) => {
    await apiFetch(`/api/auth/addresses/${id}`, { method: 'DELETE' });
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  };

  if (mode === 'wishlist') {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <div className="pb-6 border-b border-[#E5DEC9] flex items-end justify-between">
          <div>
            <p className="text-xs tracking-[0.16em] uppercase text-[#9A7736]">Saved Selection</p>
            <h1 className="font-serif text-4xl text-[#111111] mt-1">My Wishlist ({wishlistProducts.length})</h1>
          </div>
          <button
            type="button"
            onClick={() => navigate('shop')}
            className="text-xs font-medium underline underline-offset-4 cursor-pointer"
          >
            Continue Browsing
          </button>
        </div>

        {wishlistProducts.length === 0 ? (
          <div className="bg-white border border-[#E5DEC9] p-12 text-center space-y-4">
            <Heart className="w-8 h-8 text-[#B8924A] mx-auto" />
            <p className="font-serif text-2xl text-[#111111]">Your wishlist is currently empty</p>
            <button
              type="button"
              onClick={() => navigate('shop')}
              className="px-6 py-2.5 bg-[#111111] text-white text-xs font-semibold uppercase tracking-wider cursor-pointer"
            >
              Discover Collection
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {wishlistProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </main>
    );
  }

  if (!user) {
    return (
      <main className="max-w-lg mx-auto px-4 py-14 space-y-6">
        <div className="bg-white border border-[#E5DEC9] p-8 space-y-6">
          <div className="text-center space-y-1">
            <p className="text-xs tracking-[0.16em] uppercase text-[#9A7736]">Private Client Portal</p>
            <h1 className="font-serif text-3xl text-[#111111]">
              {authTab === 'login' ? 'Sign In to Maison Verri' : 'Create Client Account'}
            </h1>
          </div>

          <div className="grid grid-cols-2 bg-[#FAF8F5] border border-[#E5DEC9] p-1">
            <button
              type="button"
              onClick={() => setAuthTab('login')}
              className={`py-2 text-xs font-semibold cursor-pointer ${authTab === 'login' ? 'bg-[#111111] text-white' : 'text-[#57534E]'}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setAuthTab('register')}
              className={`py-2 text-xs font-semibold cursor-pointer ${authTab === 'register' ? 'bg-[#111111] text-white' : 'text-[#57534E]'}`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authTab === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-[#111111] mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full border border-[#D6CCB8] px-3 py-2 text-sm bg-[#FAF8F5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#111111] mb-1">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full border border-[#D6CCB8] px-3 py-2 text-sm bg-[#FAF8F5]"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-[#111111] mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-[#D6CCB8] px-3 py-2 text-sm bg-[#FAF8F5]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#111111] mb-1">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-[#D6CCB8] px-3 py-2 text-sm bg-[#FAF8F5]"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-[#111111] text-white text-xs font-semibold uppercase tracking-wider cursor-pointer"
            >
              {submitting ? 'Please wait...' : authTab === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="pt-4 border-t border-[#EFE9DD] text-center">
            <button
              type="button"
              onClick={() => navigate('admin')}
              className="text-xs text-[#9A7736] hover:underline cursor-pointer"
            >
              Store Owner? Open Admin &amp; Power BI Portal
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E5DEC9]">
        <div>
          <p className="text-xs tracking-[0.16em] uppercase text-[#9A7736]">Client Profile</p>
          <h1 className="font-serif text-4xl text-[#111111] mt-1">Welcome, {user.full_name}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('orders')}
            className="px-4 py-2 border border-[#111111] text-xs font-medium cursor-pointer"
          >
            My Orders
          </button>
          <button
            type="button"
            onClick={() => navigate('wishlist')}
            className="px-4 py-2 border border-[#D6CCB8] text-xs font-medium cursor-pointer"
          >
            Wishlist ({wishlistIds.length})
          </button>
          {user.role === 'admin' && (
            <button
              type="button"
              onClick={() => navigate('admin')}
              className="px-4 py-2 bg-[#B8924A] text-[#0D0D0D] text-xs font-semibold cursor-pointer"
            >
              Admin Dashboard
            </button>
          )}
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs text-red-700 border border-red-200 hover:bg-red-50 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Profile Form */}
        <form onSubmit={handleProfileSave} className="lg:col-span-5 bg-white border border-[#E5DEC9] p-6 space-y-4 h-fit">
          <div className="flex items-center gap-2 border-b border-[#EFE9DD] pb-3">
            <UserIcon className="w-4 h-4 text-[#B8924A]" />
            <h2 className="font-serif text-2xl text-[#111111]">Personal Details</h2>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#111111] mb-1">Email</label>
            <input type="email" disabled value={user.email} className="w-full border border-[#E5DEC9] px-3 py-2 text-sm bg-[#F2ECE1] text-[#78716C]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#111111] mb-1">Full Name</label>
            <input type="text" required value={profileName} onChange={(e) => setProfileName(e.target.value)} className="w-full border border-[#D6CCB8] px-3 py-2 text-sm bg-[#FAF8F5]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#111111] mb-1">Phone</label>
            <input type="tel" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} className="w-full border border-[#D6CCB8] px-3 py-2 text-sm bg-[#FAF8F5]" />
          </div>
          <button type="submit" className="w-full py-2.5 bg-[#111111] text-white text-xs font-semibold uppercase tracking-wider cursor-pointer">
            Save Profile
          </button>
        </form>

        {/* Saved Addresses */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-[#E5DEC9] p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-[#EFE9DD] pb-3">
              <MapPin className="w-4 h-4 text-[#B8924A]" />
              <h2 className="font-serif text-2xl text-[#111111]">Saved Delivery Addresses</h2>
            </div>

            {addresses.length === 0 ? (
              <p className="text-sm text-[#78716C]">No saved addresses yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {addresses.map((addr) => (
                  <div key={addr.id} className="border border-[#E5DEC9] p-4 text-xs space-y-1 relative">
                    <button
                      type="button"
                      onClick={() => addr.id && handleDeleteAddress(addr.id)}
                      aria-label="Delete address"
                      className="absolute top-3 right-3 text-[#8A8277] hover:text-red-700 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <p className="font-semibold text-[#111111]">{addr.full_name}</p>
                    <p className="text-[#57534E]">{addr.street}</p>
                    <p className="text-[#57534E]">{addr.city}, {addr.state} {addr.postal_code}</p>
                    <p className="text-[#78716C]">{addr.phone}</p>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleAddAddress} className="pt-4 border-t border-[#EFE9DD] space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#111111] flex items-center gap-1">
                <Plus className="w-3.5 h-3.5 text-[#B8924A]" /> Add New Address
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" required placeholder="Recipient Name" value={newAddr.full_name} onChange={(e) => setNewAddr({ ...newAddr, full_name: e.target.value })} className="border border-[#D6CCB8] px-3 py-2 text-xs bg-[#FAF8F5]" />
                <input type="tel" required placeholder="Phone" value={newAddr.phone} onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })} className="border border-[#D6CCB8] px-3 py-2 text-xs bg-[#FAF8F5]" />
                <input type="text" required placeholder="Street Address" value={newAddr.street} onChange={(e) => setNewAddr({ ...newAddr, street: e.target.value })} className="sm:col-span-2 border border-[#D6CCB8] px-3 py-2 text-xs bg-[#FAF8F5]" />
                <input type="text" required placeholder="City" value={newAddr.city} onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })} className="border border-[#D6CCB8] px-3 py-2 text-xs bg-[#FAF8F5]" />
                <input type="text" required placeholder="State" value={newAddr.state} onChange={(e) => setNewAddr({ ...newAddr, state: e.target.value })} className="border border-[#D6CCB8] px-3 py-2 text-xs bg-[#FAF8F5]" />
                <input type="text" required placeholder="Postal Code" value={newAddr.postal_code} onChange={(e) => setNewAddr({ ...newAddr, postal_code: e.target.value })} className="border border-[#D6CCB8] px-3 py-2 text-xs bg-[#FAF8F5]" />
                <button type="submit" className="bg-[#111111] text-white text-xs font-semibold uppercase tracking-wider py-2 cursor-pointer">
                  Save Address
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
