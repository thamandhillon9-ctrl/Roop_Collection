import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, CreditCard, Lock, Printer, ShieldCheck, Smartphone, Truck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { Address, OrderRecord } from '../types';
import { formatDate, formatINR } from '../utils/format';

export function CheckoutPage() {
  const { cart, cartSubtotal, clearCart, user, token, apiFetch, navigate, notify } = useStore();

  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [address, setAddress] = useState<Address>({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    street: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
  });

  const [shippingMethod, setShippingMethod] = useState<'Standard Atelier' | 'Express Concierge'>('Standard Atelier');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Credit Card' | 'Debit Card' | 'Net Banking' | 'COD'>('UPI');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount_amount: number } | null>(null);
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [razorpaySession, setRazorpaySession] = useState<{
    mode: string;
    razorpay_order_id: string;
    sandbox_payment_id?: string;
    sandbox_signature?: string;
    amount: number;
  } | null>(null);
  const [upiHandle, setUpiHandle] = useState('client@okaxis');
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');

  const [completedOrder, setCompletedOrder] = useState<OrderRecord | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    apiFetch<Address[]>('/api/auth/addresses')
      .then((list) => {
        if (Array.isArray(list) && list.length > 0) {
          setSavedAddresses(list);
          const def = list.find((a) => a.is_default === 1) || list[0];
          setAddress({ ...def, email: user?.email || '' });
        }
      })
      .catch(() => {});
  }, [token, apiFetch, user?.email]);

  const discount = appliedCoupon?.discount_amount || 0;
  const discountedSub = Math.max(0, cartSubtotal - discount);
  const taxAmount = Math.round(discountedSub * 0.12);
  const shippingCost = shippingMethod === 'Express Concierge' ? 450 : discountedSub >= 8000 ? 0 : 250;
  const totalAmount = discountedSub + taxAmount + shippingCost;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim(), subtotal: cartSubtotal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid coupon');
      setAppliedCoupon({ code: data.code, discount_amount: data.discount_amount });
      notify(`Coupon ${data.code} applied.`, 'success');
    } catch (err: any) {
      notify(err.message || 'Coupon invalid.', 'error');
    }
  };

  const validateAddress = () => {
    if (!address.full_name.trim() || !address.phone.trim() || !address.street.trim() || !address.city.trim() || !address.state.trim() || !address.postal_code.trim()) {
      notify('Please complete all delivery address fields.', 'error');
      return false;
    }
    return true;
  };

  const cartPayload = cart.map((c) => ({
    product_id: c.product_id,
    variant_id: c.variant_id,
    quantity: c.quantity,
  }));

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (!validateAddress()) return;

    setPaymentError(null);
    setSubmitting(true);

    try {
      if (paymentMethod === 'COD') {
        const res = await apiFetch<{ order: OrderRecord }>('/api/orders', {
          method: 'POST',
          body: JSON.stringify({
            items: cartPayload,
            shipping_address: address,
            coupon_code: appliedCoupon?.code || null,
            shipping_method: shippingMethod,
            payment_method: 'COD',
            notes,
          }),
        });
        clearCart();
        setCompletedOrder(res.order);
        notify('Cash on Delivery order confirmed.', 'success');
      } else {
        const rzpInit = await apiFetch<any>('/api/payments/razorpay/create-order', {
          method: 'POST',
          body: JSON.stringify({
            items: cartPayload,
            coupon_code: appliedCoupon?.code || null,
            shipping_method: shippingMethod,
          }),
        });
        setRazorpaySession(rzpInit);
      }
    } catch (err: any) {
      notify(err.message || 'Unable to process checkout.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyRazorpay = async (simulateFailure = false) => {
    if (!razorpaySession) return;
    setSubmitting(true);
    setPaymentError(null);
    try {
      const res = await apiFetch<{ verified: boolean; order: OrderRecord }>('/api/payments/razorpay/verify', {
        method: 'POST',
        body: JSON.stringify({
          razorpay_order_id: razorpaySession.razorpay_order_id,
          razorpay_payment_id: razorpaySession.sandbox_payment_id || `pay_${Date.now()}`,
          razorpay_signature: razorpaySession.sandbox_signature || '',
          simulate_failure: simulateFailure,
          items: cartPayload,
          shipping_address: address,
          coupon_code: appliedCoupon?.code || null,
          shipping_method: shippingMethod,
          payment_method: paymentMethod,
          notes,
        }),
      });
      setRazorpaySession(null);
      clearCart();
      setCompletedOrder(res.order);
      notify('Payment verified and order confirmed.', 'success');
    } catch (err: any) {
      setRazorpaySession(null);
      setPaymentError(err.message || 'Payment authorization failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Payment Success & Receipt Screen
  if (completedOrder) {
    return (
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-14 space-y-8">
        <div className="bg-white border border-[#E5DEC9] p-8 space-y-6">
          <div className="flex items-start justify-between gap-4 border-b border-[#EFE9DD] pb-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-7 h-7 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs uppercase tracking-widest text-[#9A7736]">Payment Receipt &amp; Confirmation</p>
                <h1 className="font-serif text-3xl text-[#111111] mt-1">
                  Order {completedOrder.order_number} Confirmed
                </h1>
                <p className="text-sm text-[#57534E] mt-1">
                  Placed on {formatDate(completedOrder.created_at)} · Payment Status: {completedOrder.payment_status} ({completedOrder.payment_method})
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-[#111111] text-xs font-medium hover:bg-[#111111] hover:text-white cursor-pointer no-print"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Receipt</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div className="space-y-1">
              <p className="font-semibold text-[#111111] uppercase tracking-wider">Delivery Destination</p>
              <p className="text-[#4A4640]">{completedOrder.shipping_address.full_name}</p>
              <p className="text-[#4A4640]">{completedOrder.shipping_address.street}</p>
              <p className="text-[#4A4640]">
                {completedOrder.shipping_address.city}, {completedOrder.shipping_address.state} {completedOrder.shipping_address.postal_code}
              </p>
              <p className="text-[#4A4640]">{completedOrder.shipping_address.phone}</p>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-[#111111] uppercase tracking-wider">Transaction &amp; Shipment</p>
              <p className="text-[#4A4640]">Gateway: {completedOrder.payment?.gateway || 'COD'}</p>
              {completedOrder.payment?.gateway_payment_id && (
                <p className="font-mono text-[#57534E]">Payment ID: {completedOrder.payment.gateway_payment_id}</p>
              )}
              <p className="text-[#4A4640]">Tracking: {completedOrder.shipment?.tracking_number}</p>
              <p className="text-[#4A4640]">Est. Delivery: {completedOrder.shipment?.estimated_delivery}</p>
            </div>
          </div>

          <div className="border-t border-[#EFE9DD] pt-4 space-y-2">
            {completedOrder.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-[#111111]">
                  {item.product_name} ({item.size} · {item.color}) × {item.quantity}
                </span>
                <span className="font-mono tabular-nums text-[#111111]">{formatINR(item.line_total)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-[#EFE9DD] pt-4 space-y-1 text-xs text-[#57534E] tabular-nums">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatINR(completedOrder.subtotal)}</span></div>
            {completedOrder.discount_amount > 0 && (
              <div className="flex justify-between text-[#9A7736]"><span>Discount</span><span>-{formatINR(completedOrder.discount_amount)}</span></div>
            )}
            <div className="flex justify-between"><span>GST (12%)</span><span>{formatINR(completedOrder.tax_amount)}</span></div>
            <div className="flex justify-between"><span>Shipping</span><span>{completedOrder.shipping_cost === 0 ? 'Complimentary' : formatINR(completedOrder.shipping_cost)}</span></div>
            <div className="flex justify-between pt-2 border-t border-[#EFE9DD] text-base font-semibold text-[#111111]">
              <span>Total Amount</span>
              <span>{formatINR(completedOrder.total_amount)}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2 no-print">
            <button
              type="button"
              onClick={() => navigate('orders')}
              className="px-6 py-2.5 bg-[#111111] text-white text-xs font-semibold uppercase tracking-wider cursor-pointer"
            >
              Track Order
            </button>
            <button
              type="button"
              onClick={() => navigate('shop')}
              className="px-6 py-2.5 border border-[#D6CCB8] text-xs font-medium text-[#111111] cursor-pointer"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (cart.length === 0) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="font-serif text-3xl text-[#111111]">Your Shopping Bag is Empty</h1>
        <p className="text-sm text-[#78716C]">Add pieces from our collection before proceeding to checkout.</p>
        <button
          type="button"
          onClick={() => navigate('shop')}
          className="px-6 py-2.5 bg-[#111111] text-white text-xs font-semibold uppercase tracking-wider cursor-pointer"
        >
          Browse Catalog
        </button>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="pb-6 border-b border-[#E5DEC9]">
        <p className="text-xs tracking-[0.16em] uppercase text-[#9A7736]">Secure Atelier Checkout</p>
        <h1 className="font-serif text-4xl text-[#111111] mt-1">Delivery &amp; Payment</h1>
      </div>

      {paymentError && (
        <div className="mt-6 bg-red-50 border border-red-200 p-4 flex items-center justify-between gap-4 text-sm text-red-900">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-700 shrink-0" />
            <span>{paymentError}</span>
          </div>
          <button
            type="button"
            onClick={() => setPaymentError(null)}
            className="text-xs font-semibold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-10 pt-8">
        <div className="lg:col-span-7 space-y-8">
          {/* Saved Address Quick Pick */}
          {savedAddresses.length > 0 && (
            <div className="bg-white border border-[#E5DEC9] p-5 space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#111111]">Saved Addresses</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {savedAddresses.map((sa) => (
                  <button
                    key={sa.id}
                    type="button"
                    onClick={() => setAddress({ ...sa, email: user?.email || '' })}
                    className="p-3 border border-[#D6CCB8] hover:border-[#B8924A] text-left text-xs space-y-1 cursor-pointer"
                  >
                    <p className="font-semibold text-[#111111]">{sa.full_name}</p>
                    <p className="text-[#57534E]">{sa.street}, {sa.city}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Delivery Address Form */}
          <div className="bg-white border border-[#E5DEC9] p-6 space-y-4">
            <h2 className="font-serif text-2xl text-[#111111]">1. Client &amp; Delivery Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#111111] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={address.full_name}
                  onChange={(e) => setAddress({ ...address, full_name: e.target.value })}
                  className="w-full border border-[#D6CCB8] px-3 py-2 text-sm bg-[#FAF8F5]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#111111] mb-1">Email for Receipt</label>
                <input
                  type="email"
                  required
                  value={address.email || ''}
                  onChange={(e) => setAddress({ ...address, email: e.target.value })}
                  className="w-full border border-[#D6CCB8] px-3 py-2 text-sm bg-[#FAF8F5]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#111111] mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={address.phone}
                  onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                  placeholder="+91 98..."
                  className="w-full border border-[#D6CCB8] px-3 py-2 text-sm bg-[#FAF8F5]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#111111] mb-1">Postal Code</label>
                <input
                  type="text"
                  required
                  value={address.postal_code}
                  onChange={(e) => setAddress({ ...address, postal_code: e.target.value })}
                  className="w-full border border-[#D6CCB8] px-3 py-2 text-sm bg-[#FAF8F5]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#111111] mb-1">Street Address</label>
                <input
                  type="text"
                  required
                  value={address.street}
                  onChange={(e) => setAddress({ ...address, street: e.target.value })}
                  className="w-full border border-[#D6CCB8] px-3 py-2 text-sm bg-[#FAF8F5]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#111111] mb-1">City</label>
                <input
                  type="text"
                  required
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  className="w-full border border-[#D6CCB8] px-3 py-2 text-sm bg-[#FAF8F5]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#111111] mb-1">State</label>
                <input
                  type="text"
                  required
                  value={address.state}
                  onChange={(e) => setAddress({ ...address, state: e.target.value })}
                  className="w-full border border-[#D6CCB8] px-3 py-2 text-sm bg-[#FAF8F5]"
                />
              </div>
            </div>
          </div>

          {/* Shipping Method */}
          <div className="bg-white border border-[#E5DEC9] p-6 space-y-4">
            <h2 className="font-serif text-2xl text-[#111111]">2. Shipping Method</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  id: 'Standard Atelier' as const,
                  desc: 'Insured 4–5 business days delivery',
                  cost: discountedSub >= 8000 ? 'Complimentary' : '₹250',
                },
                {
                  id: 'Express Concierge' as const,
                  desc: 'Priority 1–2 business days garment box',
                  cost: '₹450',
                },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setShippingMethod(m.id)}
                  className={`p-4 border text-left transition-colors cursor-pointer ${
                    shippingMethod === m.id ? 'border-[#111111] bg-[#FAF8F5]' : 'border-[#E5DEC9]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-[#111111]">
                    <span className="inline-flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-[#B8924A]" />
                      {m.id}
                    </span>
                    <span>{m.cost}</span>
                  </div>
                  <p className="text-xs text-[#78716C] mt-1">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-white border border-[#E5DEC9] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl text-[#111111]">3. Payment Method</h2>
              <span className="inline-flex items-center gap-1 text-xs text-[#78716C]">
                <Lock className="w-3.5 h-3.5 text-[#B8924A]" />
                <span>256-Bit Razorpay Verified</span>
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: 'UPI' as const, label: 'UPI (GPay, PhonePe, BHIM)', icon: Smartphone },
                { id: 'Credit Card' as const, label: 'Credit Card (Razorpay)', icon: CreditCard },
                { id: 'Debit Card' as const, label: 'Debit Card (Razorpay)', icon: CreditCard },
                { id: 'Net Banking' as const, label: 'Net Banking', icon: ShieldCheck },
                { id: 'COD' as const, label: 'Cash on Delivery (COD)', icon: Truck },
              ].map((pm) => {
                const Icon = pm.icon;
                return (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setPaymentMethod(pm.id)}
                    className={`p-3.5 border text-left flex items-center gap-3 text-xs font-medium cursor-pointer ${
                      paymentMethod === pm.id
                        ? 'border-[#111111] bg-[#111111] text-white'
                        : 'border-[#E5DEC9] bg-[#FAF8F5] text-[#111111]'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-[#C6A462] shrink-0" />
                    <span>{pm.label}</span>
                  </button>
                );
              })}
            </div>
            <div>
              <label className="block text-xs font-medium text-[#111111] mb-1">Atelier Tailoring Notes (Optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Gift packaging, delivery time preference..."
                className="w-full border border-[#D6CCB8] px-3 py-2 text-sm bg-[#FAF8F5]"
              />
            </div>
          </div>
        </div>

        {/* Order Summary Panel */}
        <aside className="lg:col-span-5">
          <div className="bg-white border border-[#E5DEC9] p-6 space-y-5 sticky top-24">
            <h2 className="font-serif text-2xl text-[#111111] border-b border-[#EFE9DD] pb-3">Order Summary</h2>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {cart.map((item) => (
                <div key={item.variant_id} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={item.image_url} alt={item.name} referrerPolicy="no-referrer" className="w-12 h-14 object-cover bg-[#EFE9DD] shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-[#111111] truncate">{item.name}</p>
                      <p className="text-[#78716C]">{item.size} · {item.color} × {item.quantity}</p>
                    </div>
                  </div>
                  <span className="font-mono tabular-nums text-[#111111] shrink-0">{formatINR(item.unit_price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2 border-t border-[#EFE9DD]">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="Promo code (VERRI15 / ATELIER500)"
                className="flex-1 border border-[#D6CCB8] px-3 py-2 text-xs bg-[#FAF8F5]"
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                className="px-4 py-2 border border-[#111111] text-xs font-medium cursor-pointer"
              >
                Apply
              </button>
            </div>

            <div className="space-y-2 text-xs text-[#57534E] tabular-nums border-t border-[#EFE9DD] pt-4">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatINR(cartSubtotal)}</span></div>
              {appliedCoupon && (
                <div className="flex justify-between text-[#9A7736]"><span>Coupon ({appliedCoupon.code})</span><span>-{formatINR(discount)}</span></div>
              )}
              <div className="flex justify-between"><span>GST (12%)</span><span>{formatINR(taxAmount)}</span></div>
              <div className="flex justify-between"><span>Shipping ({shippingMethod})</span><span>{shippingCost === 0 ? 'Complimentary' : formatINR(shippingCost)}</span></div>
              <div className="flex justify-between pt-3 border-t border-[#E5DEC9] text-base font-semibold text-[#111111]">
                <span>Total Payable</span>
                <span>{formatINR(totalAmount)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-[#111111] text-white text-xs font-semibold tracking-wider uppercase hover:bg-[#272420] transition-colors cursor-pointer"
            >
              {submitting
                ? 'Processing...'
                : paymentMethod === 'COD'
                ? `Place COD Order (${formatINR(totalAmount)})`
                : `Pay ${formatINR(totalAmount)} with Razorpay`}
            </button>
          </div>
        </aside>
      </form>

      {/* Razorpay Interactive Payment Verification Modal */}
      {razorpaySession && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border border-[#D6CCB8] max-w-md w-full overflow-hidden shadow-2xl">
            <div className="bg-[#0D0D0D] text-white p-5 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-[#C6A462] uppercase tracking-widest">Razorpay Secure Gateway</p>
                <p className="font-serif text-xl mt-0.5">MAISON VERRI</p>
              </div>
              <div className="text-right tabular-nums">
                <p className="text-xs text-[#A8A095]">Payable</p>
                <p className="text-lg font-semibold text-white">{formatINR(razorpaySession.amount / 100)}</p>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="text-xs text-[#57534E] bg-[#FAF8F5] border border-[#E5DEC9] p-3">
                <p className="font-medium text-[#111111]">Method: {paymentMethod}</p>
                <p className="font-mono text-[11px] mt-1">Order Ref: {razorpaySession.razorpay_order_id}</p>
              </div>

              {paymentMethod === 'UPI' && (
                <div>
                  <label className="block text-xs font-medium text-[#111111] mb-1">Enter UPI ID / VPA</label>
                  <input
                    type="text"
                    value={upiHandle}
                    onChange={(e) => setUpiHandle(e.target.value)}
                    className="w-full border border-[#D6CCB8] px-3 py-2 text-sm bg-[#FAF8F5]"
                  />
                </div>
              )}

              {(paymentMethod === 'Credit Card' || paymentMethod === 'Debit Card') && (
                <div className="text-xs text-[#57534E] border border-[#E5DEC9] p-3 space-y-1">
                  <p className="font-medium text-[#111111]">Tokenized Card Authorization</p>
                  <p>Card numbers are never stored on Maison Verri servers. Authorization is verified directly via HMAC-SHA256 signature.</p>
                </div>
              )}

              {paymentMethod === 'Net Banking' && (
                <div>
                  <label className="block text-xs font-medium text-[#111111] mb-1">Select Bank</label>
                  <select
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    className="w-full border border-[#D6CCB8] px-3 py-2 text-sm bg-[#FAF8F5]"
                  >
                    <option>HDFC Bank</option>
                    <option>ICICI Bank</option>
                    <option>State Bank of India</option>
                    <option>Axis Bank</option>
                    <option>Kotak Mahindra Bank</option>
                  </select>
                </div>
              )}

              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleVerifyRazorpay(false)}
                  className="w-full py-3 bg-[#111111] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#272420] cursor-pointer"
                >
                  {submitting ? 'Verifying Signature...' : 'Authorize & Complete Payment'}
                </button>
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleVerifyRazorpay(true)}
                    className="flex-1 py-2 border border-red-300 text-red-700 text-xs hover:bg-red-50 cursor-pointer"
                  >
                    Simulate Payment Failure
                  </button>
                  <button
                    type="button"
                    onClick={() => setRazorpaySession(null)}
                    className="flex-1 py-2 border border-[#D6CCB8] text-xs text-[#57534E] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
