import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Copy,
  Database,
  FolderTree,
  Lock,
  MessageSquare,
  Package,
  Plus,
  Settings,
  ShoppingCart,
  Tag,
  Trash2,
  Users,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { PowerBIDashboards } from '../components/PowerBIDashboards';
import type { OrderRecord, Product } from '../types';
import { formatDate, formatINR } from '../utils/format';

type AdminTab =
  | 'bi'
  | 'products'
  | 'categories'
  | 'orders'
  | 'customers'
  | 'coupons'
  | 'settings'
  | 'blueprints';

export function AdminDashboardPage() {
  const { user, token, setAuthSession, apiFetch, categories, settings, refreshGlobalData, notify, navigate } = useStore();

  const [adminStatus, setAdminStatus] = useState<{ hasAdminAccount: boolean; passcodeConfigured: boolean } | null>(null);
  const [authForm, setAuthForm] = useState({ email: '', password: '', full_name: '', passcode: '' });
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>('bi');

  // Admin data states
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [returnsList, setReturnsList] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [deliverables, setDeliverables] = useState<Record<string, string> | null>(null);
  const [activeDocKey, setActiveDocKey] = useState<'schemaSql' | 'rlsSql' | 'powerBiViewsSql' | 'powerBiGuideMd' | 'deploymentMd'>('schemaSql');

  // Product Form
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProd, setNewProd] = useState({
    category_id: '',
    sku: '',
    name: '',
    brand: 'MAISON VERRI',
    description: '',
    base_price: 18000,
    discount_percent: 0,
    cost_price: 7500,
    gender_segment: 'Women',
    collection_tag: 'Autumn / Winter 2026',
    image_url: '/src/assets/images/collection_womens_tailoring_1795602786165.jpg',
    size: 'M',
    color: 'Champagne Beige',
    stock_qty: 12,
  });

  // Category Form
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  // Coupon Form
  const [newCoupon, setNewCoupon] = useState({ code: '', discount_type: 'percent', discount_value: 10, min_order_amount: 5000 });

  // Settings Form
  const [promoText, setPromoText] = useState(settings.promo_bar?.text || '');
  const [heroTitle, setHeroTitle] = useState(settings.hero_banner?.title || '');
  const [heroOffer, setHeroOffer] = useState(settings.hero_banner?.offer_label || '');
  const [opExAmount, setOpExAmount] = useState(settings.operating_expenses_monthly?.amount || 185000);

  useEffect(() => {
    fetch('/api/auth/admin-status')
      .then((r) => r.json())
      .then(setAdminStatus)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setPromoText(settings.promo_bar?.text || '');
    setHeroTitle(settings.hero_banner?.title || '');
    setHeroOffer(settings.hero_banner?.offer_label || '');
    setOpExAmount(settings.operating_expenses_monthly?.amount || 185000);
  }, [settings]);

  const loadAdminTab = async (tab: AdminTab) => {
    if (!token || user?.role !== 'admin') return;
    try {
      if (tab === 'products') {
        const res = await apiFetch<Product[]>('/api/products?includeInactive=1');
        setProducts(res);
      } else if (tab === 'orders') {
        const [ords, rets] = await Promise.all([
          apiFetch<OrderRecord[]>('/api/admin/orders'),
          apiFetch<any[]>('/api/admin/returns'),
        ]);
        setOrders(ords);
        setReturnsList(rets);
      } else if (tab === 'customers') {
        const [custs, enqs] = await Promise.all([
          apiFetch<any[]>('/api/admin/customers'),
          apiFetch<any[]>('/api/admin/enquiries'),
        ]);
        setCustomers(custs);
        setEnquiries(enqs);
      } else if (tab === 'coupons') {
        const [cpns, revs] = await Promise.all([
          apiFetch<any[]>('/api/admin/coupons'),
          apiFetch<any[]>('/api/admin/reviews'),
        ]);
        setCoupons(cpns);
        setReviews(revs);
      } else if (tab === 'blueprints') {
        const docs = await apiFetch<Record<string, string>>('/api/admin/deliverables');
        setDeliverables(docs);
      }
    } catch (err: any) {
      notify(err.message || 'Unable to load admin data.', 'error');
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      loadAdminTab(activeTab);
    }
  }, [activeTab, user?.role, token]);

  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthSubmitting(true);
    try {
      let res: Response;
      if (adminStatus?.passcodeConfigured || !adminStatus?.hasAdminAccount) {
        res = await fetch('/api/auth/admin-bootstrap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(authForm),
        });
      } else {
        res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authForm.email, password: authForm.password }),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Admin authentication failed');
      if (data.user?.role !== 'admin') {
        throw new Error('This account does not have Administrator privileges.');
      }
      setAuthSession(data.token, data.user);
      notify('Admin session verified.', 'success');
    } catch (err: any) {
      notify(err.message || 'Authentication failed.', 'error');
    } finally {
      setAuthSubmitting(false);
    }
  };

  if (!user || user.role !== 'admin') {
    const isClaimMode = adminStatus && !adminStatus.passcodeConfigured && !adminStatus.hasAdminAccount;
    const isPasscodeMode = adminStatus?.passcodeConfigured;

    return (
      <main className="max-w-md mx-auto px-4 py-16">
        <div className="bg-white border border-[#E5DEC9] p-8 space-y-6">
          <div className="text-center space-y-2">
            <Lock className="w-7 h-7 text-[#B8924A] mx-auto" />
            <p className="text-xs tracking-[0.16em] uppercase text-[#9A7736]">Executive Console</p>
            <h1 className="font-serif text-3xl text-[#111111]">
              {isClaimMode
                ? 'First-Run Admin Setup'
                : isPasscodeMode
                ? 'Owner Passcode Verification'
                : 'Admin Portal Sign In'}
            </h1>
            <p className="text-xs text-[#78716C]">
              {isClaimMode
                ? 'Claim the initial Store Director account to unlock catalog management and Power BI analytics.'
                : isPasscodeMode
                ? 'Enter your configured owner passcode to unlock the management workspace.'
                : 'Sign in with your administrator credentials.'}
            </p>
          </div>

          <form onSubmit={handleAdminAuth} className="space-y-4">
            {isPasscodeMode ? (
              <div>
                <label className="block text-xs font-medium text-[#111111] mb-1">Admin Passcode</label>
                <input
                  type="password"
                  required
                  value={authForm.passcode}
                  onChange={(e) => setAuthForm({ ...authForm, passcode: e.target.value })}
                  className="w-full border border-[#D6CCB8] px-3 py-2 text-sm bg-[#FAF8F5]"
                />
              </div>
            ) : (
              <>
                {isClaimMode && (
                  <div>
                    <label className="block text-xs font-medium text-[#111111] mb-1">Director Name</label>
                    <input
                      type="text"
                      required
                      value={authForm.full_name}
                      onChange={(e) => setAuthForm({ ...authForm, full_name: e.target.value })}
                      placeholder="e.g. Atelier Director"
                      className="w-full border border-[#D6CCB8] px-3 py-2 text-sm bg-[#FAF8F5]"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-[#111111] mb-1">Admin Email</label>
                  <input
                    type="email"
                    required
                    value={authForm.email}
                    onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                    placeholder="director@maisonverri.com"
                    className="w-full border border-[#D6CCB8] px-3 py-2 text-sm bg-[#FAF8F5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#111111] mb-1">Password (min 8 chars)</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={authForm.password}
                    onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                    className="w-full border border-[#D6CCB8] px-3 py-2 text-sm bg-[#FAF8F5]"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={authSubmitting}
              className="w-full py-3 bg-[#111111] text-white text-xs font-semibold uppercase tracking-wider cursor-pointer"
            >
              {authSubmitting
                ? 'Verifying...'
                : isClaimMode
                ? 'Initialize Admin Account'
                : 'Enter Management Workspace'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/products', {
        method: 'POST',
        body: JSON.stringify({
          ...newProd,
          category_id: Number(newProd.category_id || categories[0]?.id),
          images: [newProd.image_url],
          variants: [
            {
              size: newProd.size,
              color: newProd.color,
              color_hex: '#141414',
              stock_qty: Number(newProd.stock_qty),
              reorder_level: 5,
            },
          ],
          is_new_arrival: true,
          is_featured: true,
        }),
      });
      setShowAddProduct(false);
      notify('Product added to database.', 'success');
      loadAdminTab('products');
    } catch (err: any) {
      notify(err.message || 'Failed to add product.', 'error');
    }
  };

  const handleUpdateStock = async (variantId: number, qty: number) => {
    try {
      await apiFetch(`/api/admin/inventory/${variantId}`, {
        method: 'PATCH',
        body: JSON.stringify({ stock_qty: qty }),
      });
      notify('Inventory updated.', 'success');
      loadAdminTab('products');
    } catch (err: any) {
      notify(err.message || 'Stock update failed.', 'error');
    }
  };

  const handleUpdateDiscount = async (productId: number, discount_percent: number) => {
    try {
      await apiFetch(`/api/admin/products/${productId}`, {
        method: 'PUT',
        body: JSON.stringify({ discount_percent }),
      });
      notify('Product discount updated.', 'success');
      loadAdminTab('products');
    } catch (err: any) {
      notify(err.message || 'Failed to update discount.', 'error');
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    await apiFetch(`/api/admin/products/${productId}`, { method: 'DELETE' });
    notify('Product removed/archived.', 'neutral');
    loadAdminTab('products');
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/categories', {
        method: 'POST',
        body: JSON.stringify({ name: newCatName, description: newCatDesc }),
      });
      setNewCatName('');
      setNewCatDesc('');
      refreshGlobalData();
      notify('Category created.', 'success');
    } catch (err: any) {
      notify(err.message || 'Unable to create category.', 'error');
    }
  };

  const handleOrderStatus = async (orderId: number, order_status: string) => {
    await apiFetch(`/api/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ order_status }),
    });
    notify('Order status updated.', 'success');
    loadAdminTab('orders');
  };

  const handleRefundOrder = async (orderId: number) => {
    await apiFetch(`/api/admin/payments/${orderId}/refund`, { method: 'POST', body: JSON.stringify({}) });
    notify('Refund processed.', 'success');
    loadAdminTab('orders');
  };

  const handleReturnDecision = async (returnId: number, status: string) => {
    await apiFetch(`/api/admin/returns/${returnId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    notify(`Return marked ${status}.`, 'success');
    loadAdminTab('orders');
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await Promise.all([
        apiFetch('/api/admin/settings', {
          method: 'PUT',
          body: JSON.stringify({ key: 'promo_bar', value: { enabled: true, text: promoText } }),
        }),
        apiFetch('/api/admin/settings', {
          method: 'PUT',
          body: JSON.stringify({
            key: 'hero_banner',
            value: { ...(settings.hero_banner || {}), title: heroTitle, offer_label: heroOffer },
          }),
        }),
        apiFetch('/api/admin/settings', {
          method: 'PUT',
          body: JSON.stringify({
            key: 'operating_expenses_monthly',
            value: { amount: Number(opExAmount) || 185000, currency: 'INR', notes: 'Monthly Atelier OpEx' },
          }),
        }),
      ]);
      await refreshGlobalData();
      notify('Storefront settings saved.', 'success');
    } catch (err: any) {
      notify(err.message || 'Failed to save settings.', 'error');
    }
  };

  const sidebarItems: Array<{ id: AdminTab; label: string; icon: any }> = [
    { id: 'bi', label: 'Power BI Suite', icon: BarChart3 },
    { id: 'products', label: 'Products & Stock', icon: Package },
    { id: 'categories', label: 'Categories', icon: FolderTree },
    { id: 'orders', label: 'Orders & Returns', icon: ShoppingCart },
    { id: 'customers', label: 'Customers & Inbox', icon: Users },
    { id: 'coupons', label: 'Coupons & Reviews', icon: Tag },
    { id: 'settings', label: 'Banners & OpEx', icon: Settings },
    { id: 'blueprints', label: 'SQL & BI Blueprints', icon: Database },
  ];

  return (
    <div className="min-h-screen bg-[#F5F1EA] flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full lg:w-64 bg-[#0D0D0D] text-[#EAE2D3] shrink-0 border-r border-[#26231F]">
        <div className="p-6 border-b border-[#26231F]">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[#C6A462]">Atelier Operations</p>
          <p className="font-serif text-xl text-white mt-1">Admin &amp; BI Console</p>
        </div>
        <nav className="p-3 flex lg:flex-col gap-1 overflow-x-auto">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-3 px-3.5 py-2.5 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  active ? 'bg-[#B8924A] text-[#0D0D0D] font-semibold' : 'text-[#A8A095] hover:text-white hover:bg-[#1B1916]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="bg-white border-b border-[#E5DEC9] px-6 py-4 flex items-center justify-between gap-4">
          <div className="text-xs text-[#78716C]">
            <span>Maison Verri</span>
            <span className="mx-2">/</span>
            <span className="font-semibold text-[#111111]">
              {sidebarItems.find((s) => s.id === activeTab)?.label}
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate('home')}
            className="text-xs font-medium text-[#9A7736] hover:underline cursor-pointer"
          >
            View Live Storefront
          </button>
        </div>

        <div className="p-6 max-w-7xl mx-auto space-y-6">
          {activeTab === 'bi' && <PowerBIDashboards />}

          {/* PRODUCTS & STOCK */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-3xl text-[#111111]">Catalog &amp; Variant Inventory</h2>
                <button
                  type="button"
                  onClick={() => setShowAddProduct((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#111111] text-white text-xs font-semibold uppercase tracking-wider cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Product</span>
                </button>
              </div>

              {showAddProduct && (
                <form onSubmit={handleAddProduct} className="bg-white border border-[#E5DEC9] p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <input type="text" required placeholder="SKU (e.g. MV-WT-199)" value={newProd.sku} onChange={(e) => setNewProd({ ...newProd, sku: e.target.value })} className="border border-[#D6CCB8] px-3 py-2" />
                  <input type="text" required placeholder="Product Name" value={newProd.name} onChange={(e) => setNewProd({ ...newProd, name: e.target.value })} className="border border-[#D6CCB8] px-3 py-2" />
                  <select value={newProd.category_id || categories[0]?.id || ''} onChange={(e) => setNewProd({ ...newProd, category_id: e.target.value })} className="border border-[#D6CCB8] px-3 py-2">
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select value={newProd.gender_segment} onChange={(e) => setNewProd({ ...newProd, gender_segment: e.target.value })} className="border border-[#D6CCB8] px-3 py-2">
                    <option value="Women">Women</option>
                    <option value="Men">Men</option>
                    <option value="Kids">Kids</option>
                    <option value="Accessories">Accessories</option>
                  </select>
                  <input type="number" required placeholder="Base Price (INR)" value={newProd.base_price} onChange={(e) => setNewProd({ ...newProd, base_price: Number(e.target.value) })} className="border border-[#D6CCB8] px-3 py-2" />
                  <input type="number" placeholder="Cost Price (COGS)" value={newProd.cost_price} onChange={(e) => setNewProd({ ...newProd, cost_price: Number(e.target.value) })} className="border border-[#D6CCB8] px-3 py-2" />
                  <input type="text" placeholder="Initial Size (e.g. M)" value={newProd.size} onChange={(e) => setNewProd({ ...newProd, size: e.target.value })} className="border border-[#D6CCB8] px-3 py-2" />
                  <input type="text" placeholder="Color" value={newProd.color} onChange={(e) => setNewProd({ ...newProd, color: e.target.value })} className="border border-[#D6CCB8] px-3 py-2" />
                  <input type="number" placeholder="Opening Stock" value={newProd.stock_qty} onChange={(e) => setNewProd({ ...newProd, stock_qty: Number(e.target.value) })} className="border border-[#D6CCB8] px-3 py-2" />
                  <input type="text" placeholder="Description" value={newProd.description} onChange={(e) => setNewProd({ ...newProd, description: e.target.value })} className="sm:col-span-2 border border-[#D6CCB8] px-3 py-2" />
                  <button type="submit" className="bg-[#B8924A] text-[#0D0D0D] font-semibold py-2 cursor-pointer">Save Product</button>
                </form>
              )}

              <div className="bg-white border border-[#E5DEC9] overflow-x-auto">
                <table className="w-full text-xs text-left tabular-nums">
                  <thead className="bg-[#FAF8F5] border-b border-[#E5DEC9] text-[#78716C]">
                    <tr>
                      <th className="py-3 px-4">SKU / Name</th>
                      <th className="py-3 px-4">Segment</th>
                      <th className="py-3 px-4 text-right">Base Price</th>
                      <th className="py-3 px-4 text-right">Discount %</th>
                      <th className="py-3 px-4 text-right">Final</th>
                      <th className="py-3 px-4">Variant Stock</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE9DD]">
                    {products.map((p) => (
                      <tr key={p.id}>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-[#111111]">{p.name}</p>
                          <p className="font-mono text-[11px] text-[#78716C]">{p.sku} · {p.status}</p>
                        </td>
                        <td className="py-3 px-4">{p.gender_segment}</td>
                        <td className="py-3 px-4 text-right">{formatINR(p.base_price)}</td>
                        <td className="py-3 px-4 text-right">
                          <input
                            type="number"
                            min={0}
                            max={90}
                            defaultValue={p.discount_percent}
                            onBlur={(e) => {
                              const val = Number(e.target.value);
                              if (val !== p.discount_percent) handleUpdateDiscount(p.id, val);
                            }}
                            className="w-14 border border-[#D6CCB8] px-1.5 py-1 text-right font-mono"
                          />
                        </td>
                        <td className="py-3 px-4 text-right font-semibold">{formatINR(p.final_price)}</td>
                        <td className="py-3 px-4 space-y-1">
                          {p.variants.map((v) => (
                            <div key={v.id} className="flex items-center gap-2">
                              <span className="w-24 truncate text-[11px]">{v.size} · {v.color}</span>
                              <input
                                type="number"
                                min={0}
                                defaultValue={v.stock_qty}
                                onBlur={(e) => {
                                  const qty = Number(e.target.value);
                                  if (qty !== v.stock_qty) handleUpdateStock(v.id, qty);
                                }}
                                className="w-14 border border-[#D6CCB8] px-1.5 py-0.5 text-right font-mono"
                              />
                            </div>
                          ))}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(p.id)}
                            aria-label="Delete product"
                            className="p-1.5 text-red-700 hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CATEGORIES */}
          {activeTab === 'categories' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <form onSubmit={handleAddCategory} className="lg:col-span-4 bg-white border border-[#E5DEC9] p-5 space-y-3 h-fit">
                <h3 className="font-serif text-2xl text-[#111111]">Add Category</h3>
                <input type="text" required placeholder="Category Name" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} className="w-full border border-[#D6CCB8] px-3 py-2 text-xs" />
                <textarea rows={2} placeholder="Description" value={newCatDesc} onChange={(e) => setNewCatDesc(e.target.value)} className="w-full border border-[#D6CCB8] px-3 py-2 text-xs" />
                <button type="submit" className="w-full py-2.5 bg-[#111111] text-white text-xs font-semibold uppercase cursor-pointer">Create Category</button>
              </form>
              <div className="lg:col-span-8 bg-white border border-[#E5DEC9] divide-y divide-[#EFE9DD]">
                {categories.map((c) => (
                  <div key={c.id} className="p-4 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-sm text-[#111111]">{c.name}</p>
                      <p className="text-[#78716C]">{c.description} ({c.product_count} active products)</p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await apiFetch(`/api/admin/categories/${c.id}`, { method: 'DELETE' });
                          refreshGlobalData();
                        } catch (err: any) {
                          notify(err.message, 'error');
                        }
                      }}
                      className="text-red-700 hover:underline cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ORDERS & RETURNS */}
          {activeTab === 'orders' && (
            <div className="space-y-8">
              <div className="bg-white border border-[#E5DEC9] overflow-x-auto">
                <table className="w-full text-xs text-left tabular-nums">
                  <thead className="bg-[#FAF8F5] border-b border-[#E5DEC9] text-[#78716C]">
                    <tr>
                      <th className="py-3 px-4">Order</th>
                      <th className="py-3 px-4">Client</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4">Payment</th>
                      <th className="py-3 px-4">Order Status</th>
                      <th className="py-3 px-4">Tracking</th>
                      <th className="py-3 px-4 text-right">Refund</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE9DD]">
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td className="py-3 px-4">
                          <p className="font-mono font-semibold text-[#111111]">{o.order_number}</p>
                          <p className="text-[11px] text-[#78716C]">{formatDate(o.created_at)}</p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium">{o.customer_name}</p>
                          <p className="text-[11px] text-[#78716C]">{o.customer_email}</p>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold">{formatINR(o.total_amount)}</td>
                        <td className="py-3 px-4">{o.payment_method} · {o.payment_status}</td>
                        <td className="py-3 px-4">
                          <select
                            value={o.order_status}
                            onChange={(e) => handleOrderStatus(o.id, e.target.value)}
                            className="border border-[#D6CCB8] px-2 py-1 bg-[#FAF8F5]"
                          >
                            {['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled', 'Returned'].map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-4 font-mono">{o.shipment?.tracking_number}</td>
                        <td className="py-3 px-4 text-right">
                          {o.payment_status === 'Paid' && (
                            <button
                              type="button"
                              onClick={() => handleRefundOrder(o.id)}
                              className="px-2.5 py-1 border border-red-300 text-red-700 hover:bg-red-50 cursor-pointer"
                            >
                              Issue Refund
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {returnsList.length > 0 && (
                <div className="bg-white border border-[#E5DEC9] p-5 space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#111111]">Return Requests</h3>
                  {returnsList.map((r) => (
                    <div key={r.id} className="flex flex-wrap items-center justify-between gap-4 py-2 border-b border-[#F3EDE2] text-xs">
                      <div>
                        <span className="font-mono font-semibold">{r.order_number}</span> · {r.customer_name} — {r.reason}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{r.status}</span>
                        {r.status === 'Requested' && (
                          <>
                            <button type="button" onClick={() => handleReturnDecision(r.id, 'Approved')} className="px-2 py-1 border border-[#111111] cursor-pointer">Approve</button>
                            <button type="button" onClick={() => handleReturnDecision(r.id, 'Refunded')} className="px-2 py-1 bg-[#111111] text-white cursor-pointer">Refund</button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CUSTOMERS & ENQUIRIES */}
          {activeTab === 'customers' && (
            <div className="space-y-8">
              <div className="bg-white border border-[#E5DEC9] p-5 space-y-3">
                <h3 className="font-serif text-2xl text-[#111111]">Registered &amp; Purchasing Clients</h3>
                <table className="w-full text-xs text-left tabular-nums">
                  <thead className="border-b border-[#E5DEC9] text-[#78716C]">
                    <tr><th className="py-2">Name</th><th className="py-2">Email</th><th className="py-2">Segment</th><th className="py-2 text-right">Orders</th><th className="py-2 text-right">LTV</th></tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3EDE2]">
                    {customers.map((c) => (
                      <tr key={c.id}>
                        <td className="py-2 font-medium">{c.full_name}</td>
                        <td className="py-2">{c.email}</td>
                        <td className="py-2">{c.segment}</td>
                        <td className="py-2 text-right">{c.total_orders}</td>
                        <td className="py-2 text-right font-semibold">{formatINR(c.lifetime_value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-white border border-[#E5DEC9] p-5 space-y-3">
                <h3 className="font-serif text-2xl text-[#111111] flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-[#B8924A]" /> Contact Enquiries ({enquiries.length})
                </h3>
                {enquiries.length === 0 ? (
                  <p className="text-xs text-[#78716C]">No enquiries submitted yet.</p>
                ) : (
                  enquiries.map((eq) => (
                    <div key={eq.id} className="p-3 border border-[#EFE9DD] flex flex-wrap justify-between gap-4 text-xs">
                      <div>
                        <p className="font-semibold text-[#111111]">{eq.subject} — {eq.name} ({eq.email})</p>
                        <p className="text-[#57534E] mt-1">{eq.message}</p>
                      </div>
                      <select
                        value={eq.status}
                        onChange={async (e) => {
                          await apiFetch(`/api/admin/enquiries/${eq.id}`, {
                            method: 'PATCH',
                            body: JSON.stringify({ status: e.target.value }),
                          });
                          loadAdminTab('customers');
                        }}
                        className="border border-[#D6CCB8] px-2 py-1 h-fit"
                      >
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* COUPONS & REVIEWS */}
          {activeTab === 'coupons' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 bg-white border border-[#E5DEC9] p-5 space-y-4">
                <h3 className="font-serif text-2xl text-[#111111]">Promotional Coupons</h3>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await apiFetch('/api/admin/coupons', { method: 'POST', body: JSON.stringify(newCoupon) });
                    setNewCoupon({ code: '', discount_type: 'percent', discount_value: 10, min_order_amount: 5000 });
                    loadAdminTab('coupons');
                    notify('Coupon created.', 'success');
                  }}
                  className="grid grid-cols-2 gap-2 text-xs pb-4 border-b border-[#EFE9DD]"
                >
                  <input type="text" required placeholder="Code (e.g. LUXE20)" value={newCoupon.code} onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value })} className="border border-[#D6CCB8] px-2.5 py-2" />
                  <select value={newCoupon.discount_type} onChange={(e) => setNewCoupon({ ...newCoupon, discount_type: e.target.value })} className="border border-[#D6CCB8] px-2.5 py-2">
                    <option value="percent">Percent %</option>
                    <option value="fixed">Fixed INR</option>
                  </select>
                  <input type="number" required placeholder="Value" value={newCoupon.discount_value} onChange={(e) => setNewCoupon({ ...newCoupon, discount_value: Number(e.target.value) })} className="border border-[#D6CCB8] px-2.5 py-2" />
                  <button type="submit" className="bg-[#111111] text-white font-semibold uppercase cursor-pointer">Add Coupon</button>
                </form>

                <div className="divide-y divide-[#EFE9DD]">
                  {coupons.map((c) => (
                    <div key={c.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono font-semibold text-[#111111]">{c.code}</span>
                        <span className="text-[#57534E] ml-2">
                          {c.discount_type === 'percent' ? `${c.discount_value}%` : formatINR(c.discount_value)} off · Used {c.used_count}x
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await apiFetch(`/api/admin/coupons/${c.id}/toggle`, { method: 'PATCH' });
                          loadAdminTab('coupons');
                        }}
                        className="underline cursor-pointer"
                      >
                        {c.is_active ? 'Active' : 'Paused'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-6 bg-white border border-[#E5DEC9] p-5 space-y-4">
                <h3 className="font-serif text-2xl text-[#111111]">Client Reviews Moderation</h3>
                <div className="divide-y divide-[#EFE9DD]">
                  {reviews.map((r) => (
                    <div key={r.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                      <div>
                        <p className="font-semibold text-[#111111]">{r.product_name} · {r.rating}/5 ★</p>
                        <p className="text-[#57534E]">{r.title} — {r.reviewer_name}</p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await apiFetch(`/api/admin/reviews/${r.id}`, {
                            method: 'PATCH',
                            body: JSON.stringify({ is_approved: !r.is_approved }),
                          });
                          loadAdminTab('coupons');
                        }}
                        className="px-2.5 py-1 border border-[#D6CCB8] cursor-pointer shrink-0"
                      >
                        {r.is_approved ? 'Approved' : 'Hidden'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* BANNERS & SETTINGS */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveSettings} className="bg-white border border-[#E5DEC9] p-6 max-w-2xl space-y-4">
              <h2 className="font-serif text-3xl text-[#111111]">Storefront Content &amp; P&amp;L OpEx</h2>
              <div>
                <label className="block text-xs font-medium text-[#111111] mb-1">Top Announcement Promo Bar</label>
                <input type="text" value={promoText} onChange={(e) => setPromoText(e.target.value)} className="w-full border border-[#D6CCB8] px-3 py-2 text-sm bg-[#FAF8F5]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#111111] mb-1">Hero Campaign Headline</label>
                <input type="text" value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} className="w-full border border-[#D6CCB8] px-3 py-2 text-sm bg-[#FAF8F5]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#111111] mb-1">Hero Promotional Offer Label</label>
                <input type="text" value={heroOffer} onChange={(e) => setHeroOffer(e.target.value)} className="w-full border border-[#D6CCB8] px-3 py-2 text-sm bg-[#FAF8F5]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#111111] mb-1">Monthly Operating Expenses (INR for P&amp;L BI Dashboard)</label>
                <input type="number" value={opExAmount} onChange={(e) => setOpExAmount(Number(e.target.value))} className="w-full border border-[#D6CCB8] px-3 py-2 text-sm bg-[#FAF8F5] font-mono" />
              </div>
              <button type="submit" className="px-6 py-2.5 bg-[#111111] text-white text-xs font-semibold uppercase tracking-wider cursor-pointer">
                Save Changes
              </button>
            </form>
          )}

          {/* SQL & POWER BI BLUEPRINTS */}
          {activeTab === 'blueprints' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1 p-1 bg-[#EFE9DD] border border-[#E2D8C6]">
                  {[
                    { id: 'schemaSql' as const, label: 'supabase/schema.sql' },
                    { id: 'rlsSql' as const, label: 'supabase/rls.sql' },
                    { id: 'powerBiViewsSql' as const, label: 'supabase/powerbi_views.sql' },
                    { id: 'powerBiGuideMd' as const, label: 'Power BI & DAX Guide' },
                    { id: 'deploymentMd' as const, label: 'Deployment Guide' },
                  ].map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setActiveDocKey(doc.id)}
                      className={`px-3 py-1.5 text-xs font-medium cursor-pointer ${
                        activeDocKey === doc.id ? 'bg-[#111111] text-white' : 'text-[#57534E]'
                      }`}
                    >
                      {doc.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const txt = deliverables?.[activeDocKey] || '';
                    navigator.clipboard.writeText(txt);
                    notify('Copied deliverable script to clipboard.', 'success');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#111111] text-xs font-medium cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Script</span>
                </button>
              </div>
              <pre className="bg-[#0D0D0D] text-[#EAE2D3] p-5 text-xs font-mono overflow-x-auto max-h-[540px] border border-[#26231F]">
                {deliverables?.[activeDocKey] || 'Loading blueprint files...'}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
