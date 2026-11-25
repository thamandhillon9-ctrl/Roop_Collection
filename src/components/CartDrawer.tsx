import React, { useState } from 'react';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatINR } from '../utils/format';

export function CartDrawer() {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    updateCartQty,
    removeFromCart,
    cartSubtotal,
    navigate,
    notify,
  } = useStore();
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount_amount: number } | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  if (!isCartOpen) return null;

  const discount = appliedCoupon ? appliedCoupon.discount_amount : 0;
  const discountedSub = Math.max(0, cartSubtotal - discount);
  const estimatedTax = Math.round(discountedSub * 0.12);
  const estimatedShipping = discountedSub === 0 ? 0 : discountedSub >= 8000 ? 0 : 250;
  const finalTotal = discountedSub + estimatedTax + estimatedShipping;

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setCheckingCoupon(true);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponInput.trim(), subtotal: cartSubtotal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid coupon');
      setAppliedCoupon({ code: data.code, discount_amount: data.discount_amount });
      notify(`Coupon ${data.code} applied.`, 'success');
    } catch (err: any) {
      notify(err.message || 'Unable to apply coupon.', 'error');
    } finally {
      setCheckingCoupon(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-xs no-print">
      <div className="w-full max-w-md bg-[#FAF8F5] h-full flex flex-col border-l border-[#E5DEC9] shadow-2xl">
        <div className="px-6 py-4 border-b border-[#E5DEC9] flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-4 h-4 text-[#B8924A]" />
            <h2 className="font-serif text-xl font-semibold text-[#111111]">Shopping Bag</h2>
          </div>
          <button
            type="button"
            onClick={() => setIsCartOpen(false)}
            aria-label="Close shopping bag"
            className="p-2 text-[#57534E] hover:text-[#111111] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-16 space-y-4">
              <ShoppingBag className="w-10 h-10 text-[#C6A462]" />
              <div className="space-y-1">
                <p className="font-serif text-xl text-[#111111]">Your atelier bag is empty</p>
                <p className="text-sm text-[#78716C]">Explore seasonal tailoring, cashmere, and leather pieces.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCartOpen(false);
                  navigate('shop');
                }}
                className="px-6 py-2.5 bg-[#111111] text-white text-xs font-medium rounded-sm cursor-pointer"
              >
                Explore Collection
              </button>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.variant_id} className="flex gap-4 pb-4 border-b border-[#EAE2D3]">
                <img
                  src={item.image_url}
                  alt={item.name}
                  referrerPolicy="no-referrer"
                  className="w-20 h-24 object-cover bg-[#EAE2D3] shrink-0"
                />
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-[#111111] truncate">{item.name}</h3>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.variant_id)}
                        aria-label="Remove item"
                        className="text-[#8A8277] hover:text-[#111111] p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-[#78716C] mt-0.5">
                      {item.size} · {item.color}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="inline-flex items-center border border-[#D6CCB8] bg-white">
                      <button
                        type="button"
                        onClick={() => updateCartQty(item.variant_id, item.quantity - 1)}
                        aria-label="Decrease quantity"
                        className="px-2 py-1 text-[#111111] hover:bg-[#F5F0E8] cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-3 text-xs font-medium tabular-nums">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateCartQty(item.variant_id, item.quantity + 1)}
                        aria-label="Increase quantity"
                        className="px-2 py-1 text-[#111111] hover:bg-[#F5F0E8] cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-sm font-semibold text-[#111111] tabular-nums">
                      {formatINR(item.unit_price * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-6 bg-white border-t border-[#E5DEC9] space-y-4">
            <form onSubmit={handleApplyCoupon} className="flex gap-2">
              <input
                type="text"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                placeholder="Coupon code (e.g. VERRI15)"
                className="flex-1 border border-[#D6CCB8] px-3 py-2 text-xs bg-[#FAF8F5] focus:outline-none focus:border-[#B8924A]"
              />
              <button
                type="submit"
                disabled={checkingCoupon}
                className="px-4 py-2 border border-[#111111] text-xs font-medium text-[#111111] hover:bg-[#111111] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
              >
                {checkingCoupon ? 'Checking' : 'Apply'}
              </button>
            </form>

            <div className="space-y-1.5 text-xs text-[#57534E] tabular-nums">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-[#111111] font-medium">{formatINR(cartSubtotal)}</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between text-[#9A7736]">
                  <span>Discount ({appliedCoupon.code})</span>
                  <span>-{formatINR(discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Estimated GST (12%)</span>
                <span>{formatINR(estimatedTax)}</span>
              </div>
              <div className="flex justify-between">
                <span>Atelier Delivery</span>
                <span>{estimatedShipping === 0 ? 'Complimentary' : formatINR(estimatedShipping)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#EAE2D3] text-sm font-semibold text-[#111111]">
                <span>Estimated Total</span>
                <span>{formatINR(finalTotal)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsCartOpen(false);
                navigate('checkout');
              }}
              className="w-full py-3 bg-[#111111] text-white text-xs font-semibold tracking-wider uppercase hover:bg-[#272420] transition-colors cursor-pointer"
            >
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
