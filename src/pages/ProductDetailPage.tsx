import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, Heart, Ruler, ShieldCheck, Star, Truck, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/ProductCard';
import type { Product, ProductVariant } from '../types';
import { formatDate, formatINR, safeImageUrl } from '../utils/format';

export function ProductDetailPage() {
  const { productSlug, navigate, addToCart, wishlistIds, toggleWishlist, user, apiFetch, notify } = useStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [qty, setQty] = useState(1);
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  const [revName, setRevName] = useState(user?.full_name || '');
  const [revRating, setRevRating] = useState(5);
  const [revTitle, setRevTitle] = useState('');
  const [revComment, setRevComment] = useState('');
  const [submittingRev, setSubmittingRev] = useState(false);

  const loadProduct = async () => {
    if (!productSlug) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(productSlug)}`);
      if (!res.ok) throw new Error('Product not found');
      const data = (await res.json()) as Product;
      setProduct(data);
      setSelectedImageIdx(0);
      const firstInStock = data.variants?.find((v) => v.stock_qty > 0) || data.variants?.[0] || null;
      setSelectedVariant(firstInStock);
      setQty(1);
    } catch {
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProduct();
  }, [productSlug]);

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-7 h-[540px] bg-[#EFE9DD] animate-pulse" />
          <div className="lg:col-span-5 h-[540px] bg-[#EFE9DD] animate-pulse" />
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="font-serif text-3xl text-[#111111]">Piece Not Found</h1>
        <button
          type="button"
          onClick={() => navigate('shop')}
          className="px-6 py-2.5 bg-[#111111] text-white text-xs font-medium cursor-pointer"
        >
          Return to Catalog
        </button>
      </main>
    );
  }

  const images = product.images?.length ? product.images : [];
  const activeImg = safeImageUrl(images[selectedImageIdx]?.image_url);
  const wishlisted = wishlistIds.includes(product.id);
  const unitPrice = selectedVariant?.price_override ?? product.final_price;
  const stockCount = selectedVariant?.stock_qty ?? 0;

  const handleBuyNow = () => {
    if (!selectedVariant || stockCount <= 0) {
      notify('Please select an available size and color.', 'error');
      return;
    }
    addToCart(product, selectedVariant.id, qty);
    navigate('checkout');
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingRev(true);
    try {
      await apiFetch(`/api/products/${product.id}/reviews`, {
        method: 'POST',
        body: JSON.stringify({
          reviewer_name: revName || user?.full_name || 'Verified Client',
          rating: revRating,
          title: revTitle,
          comment: revComment,
        }),
      });
      setRevTitle('');
      setRevComment('');
      notify('Thank you. Your review has been published.', 'success');
      await loadProduct();
    } catch (err: any) {
      notify(err.message || 'Unable to submit review.', 'error');
    } finally {
      setSubmittingRev(false);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
      <button
        type="button"
        onClick={() => navigate('shop')}
        className="inline-flex items-center gap-2 text-xs text-[#57534E] hover:text-[#111111] cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Collection</span>
      </button>

      {/* Contiguous Purchase Module */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
        {/* Left Sticky Gallery */}
        <div className="lg:col-span-7 space-y-4 lg:sticky lg:top-24">
          <div className="aspect-[4/3] w-full bg-[#EFE9DD] border border-[#E5DEC9] overflow-hidden">
            {activeImg ? (
              <img
                src={activeImg}
                alt={product.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-serif text-2xl text-[#111111]">
                {product.name}
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setSelectedImageIdx(idx)}
                  className={`aspect-[4/3] overflow-hidden border cursor-pointer ${
                    selectedImageIdx === idx ? 'border-[#111111]' : 'border-[#E5DEC9] opacity-75 hover:opacity-100'
                  }`}
                >
                  <img
                    src={safeImageUrl(img.image_url)}
                    alt={img.alt_text || product.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Purchase Panel */}
        <div className="lg:col-span-5 bg-white border border-[#E5DEC9] p-6 sm:p-8 space-y-6">
          <div className="space-y-2 border-b border-[#EFE9DD] pb-5">
            <div className="flex items-center gap-2 text-xs text-[#78716C]">
              <span>{product.brand}</span>
              <span aria-hidden="true">·</span>
              <span>{product.category_name}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{product.sku}</span>
            </div>

            <h1 className="font-serif text-3xl text-[#111111] leading-tight">{product.name}</h1>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-baseline gap-3 tabular-nums">
                <span className="text-2xl font-semibold text-[#111111]">{formatINR(unitPrice)}</span>
                {product.discount_percent > 0 && (
                  <>
                    <span className="text-sm text-[#8A8277] line-through">{formatINR(product.base_price)}</span>
                    <span className="text-xs font-semibold text-[#9A7736]">Save {product.discount_percent}%</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-1 text-xs text-[#57534E]">
                <Star className="w-3.5 h-3.5 fill-[#B8924A] text-[#B8924A]" />
                <span className="font-medium text-[#111111] tabular-nums">{product.rating_avg}</span>
                <span>({product.review_count})</span>
              </div>
            </div>
          </div>

          <p className="text-sm text-[#4A4640] leading-relaxed">{product.description}</p>

          {/* Variant Selector */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#111111]">
                Select Size &amp; Finish
              </span>
              <button
                type="button"
                onClick={() => setShowSizeGuide(true)}
                className="inline-flex items-center gap-1 text-xs text-[#9A7736] hover:underline cursor-pointer"
              >
                <Ruler className="w-3.5 h-3.5" />
                <span>Size Guide</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {product.variants.map((v) => {
                const active = selectedVariant?.id === v.id;
                const soldOut = v.stock_qty <= 0;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      setSelectedVariant(v);
                      setQty(1);
                    }}
                    className={`flex items-center justify-between px-3 py-2.5 border text-left text-xs transition-colors cursor-pointer ${
                      active
                        ? 'border-[#111111] bg-[#111111] text-white'
                        : soldOut
                        ? 'border-[#E5DEC9] bg-[#FAF8F5] text-[#A8A095]'
                        : 'border-[#D6CCB8] bg-[#FAF8F5] text-[#111111] hover:border-[#B8924A]'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span
                        className="w-3 h-3 rounded-full border border-black/20 shrink-0"
                        style={{ backgroundColor: v.color_hex }}
                      />
                      <span className="font-medium">{v.size}</span>
                      <span className="opacity-75 truncate">· {v.color}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className={stockCount > 0 ? 'text-emerald-800 font-medium' : 'text-red-700 font-medium'}>
                {stockCount > 5
                  ? `In Stock (${stockCount} available)`
                  : stockCount > 0
                  ? `Limited Stock — Only ${stockCount} left`
                  : 'Currently Out of Stock'}
              </span>
              <span className="text-[#78716C] font-mono">{selectedVariant?.variant_sku}</span>
            </div>
          </div>

          {/* Quantity & Actions */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center border border-[#D6CCB8]">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="px-3 py-2.5 text-sm hover:bg-[#FAF8F5] cursor-pointer"
                >
                  −
                </button>
                <span className="px-4 text-xs font-semibold tabular-nums">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(Math.max(1, stockCount), q + 1))}
                  className="px-3 py-2.5 text-sm hover:bg-[#FAF8F5] cursor-pointer"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                disabled={!selectedVariant || stockCount <= 0}
                onClick={() => selectedVariant && addToCart(product, selectedVariant.id, qty)}
                className="flex-1 py-3 bg-[#111111] text-white text-xs font-semibold tracking-wider uppercase hover:bg-[#272420] disabled:bg-[#C6BEB2] transition-colors cursor-pointer"
              >
                Add to Bag
              </button>

              <button
                type="button"
                onClick={() => toggleWishlist(product.id)}
                aria-label="Toggle wishlist"
                className="p-3 border border-[#D6CCB8] hover:border-[#B8924A] cursor-pointer"
              >
                <Heart className={`w-4 h-4 ${wishlisted ? 'fill-[#B8924A] text-[#B8924A]' : 'text-[#111111]'}`} />
              </button>
            </div>

            <button
              type="button"
              disabled={!selectedVariant || stockCount <= 0}
              onClick={handleBuyNow}
              className="w-full py-3 bg-[#B8924A] text-[#0D0D0D] text-xs font-semibold tracking-wider uppercase hover:bg-[#C6A462] disabled:opacity-50 transition-colors cursor-pointer"
            >
              Buy Now — Express Checkout
            </button>
          </div>

          <div className="pt-4 border-t border-[#EFE9DD] space-y-2 text-xs text-[#57534E]">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#B8924A]" />
              <span>Complimentary insured delivery on orders above ₹8,000</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#B8924A]" />
              <span>14-day effortless returns &amp; complimentary atelier alterations</span>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Reviews Section */}
      <section className="border-t border-[#E5DEC9] pt-12 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 space-y-6">
          <h2 className="font-serif text-3xl text-[#111111]">Client Reviews ({product.reviews?.length || 0})</h2>
          {product.reviews && product.reviews.length > 0 ? (
            <div className="space-y-4">
              {product.reviews.map((rev) => (
                <div key={rev.id} className="bg-white border border-[#E5DEC9] p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[#B8924A]">
                      {Array.from({ length: rev.rating }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-[#B8924A]" />
                      ))}
                    </div>
                    <span className="text-xs text-[#78716C]">{formatDate(rev.created_at)}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-[#111111]">{rev.title}</h3>
                  <p className="text-sm text-[#4A4640]">{rev.comment}</p>
                  <p className="text-xs text-[#78716C] pt-1 inline-flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-700" />
                    <span>{rev.reviewer_name}</span>
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#78716C]">Be the first client to review this garment.</p>
          )}
        </div>

        <form onSubmit={handleReviewSubmit} className="lg:col-span-5 bg-white border border-[#E5DEC9] p-6 space-y-4 h-fit">
          <h3 className="font-serif text-2xl text-[#111111]">Write a Review</h3>
          {!user && (
            <div>
              <label className="block text-xs font-medium text-[#111111] mb-1">Your Name</label>
              <input
                type="text"
                required
                value={revName}
                onChange={(e) => setRevName(e.target.value)}
                placeholder="Full name"
                className="w-full border border-[#D6CCB8] px-3 py-2 text-sm bg-[#FAF8F5]"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-[#111111] mb-1">Rating</label>
            <select
              value={revRating}
              onChange={(e) => setRevRating(Number(e.target.value))}
              className="w-full border border-[#D6CCB8] px-3 py-2 text-sm bg-[#FAF8F5]"
            >
              <option value={5}>5 Stars — Exceptional</option>
              <option value={4}>4 Stars — Very Good</option>
              <option value={3}>3 Stars — Good</option>
              <option value={2}>2 Stars — Fair</option>
              <option value={1}>1 Star — Needs Improvement</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#111111] mb-1">Headline</label>
            <input
              type="text"
              required
              value={revTitle}
              onChange={(e) => setRevTitle(e.target.value)}
              placeholder="Summary of fit and fabric"
              className="w-full border border-[#D6CCB8] px-3 py-2 text-sm bg-[#FAF8F5]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#111111] mb-1">Review</label>
            <textarea
              required
              rows={3}
              value={revComment}
              onChange={(e) => setRevComment(e.target.value)}
              placeholder="Share your thoughts on craftsmanship, drape, and sizing..."
              className="w-full border border-[#D6CCB8] px-3 py-2 text-sm bg-[#FAF8F5]"
            />
          </div>
          <button
            type="submit"
            disabled={submittingRev}
            className="w-full py-2.5 bg-[#111111] text-white text-xs font-semibold uppercase tracking-wider cursor-pointer"
          >
            {submittingRev ? 'Submitting...' : 'Publish Review'}
          </button>
        </form>
      </section>

      {/* Related Products */}
      {product.related && product.related.length > 0 && (
        <section className="border-t border-[#E5DEC9] pt-12 space-y-6">
          <h2 className="font-serif text-3xl text-[#111111]">Complementary Pieces</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {product.related.map((rel) => (
              <ProductCard key={rel.id} product={rel} />
            ))}
          </div>
        </section>
      )}

      {/* Size Guide Modal */}
      {showSizeGuide && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5DEC9] max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFE9DD] pb-3">
              <h3 className="font-serif text-2xl text-[#111111]">Maison Verri Atelier Size Guide</h3>
              <button type="button" onClick={() => setShowSizeGuide(false)} className="p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left tabular-nums">
                <thead className="bg-[#FAF8F5] border-b border-[#E5DEC9]">
                  <tr>
                    <th className="py-2 px-3">Size</th>
                    <th className="py-2 px-3">Chest (in)</th>
                    <th className="py-2 px-3">Waist (in)</th>
                    <th className="py-2 px-3">Hip (in)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE9DD]">
                  <tr><td className="py-2 px-3 font-medium">XS</td><td className="py-2 px-3">32–33</td><td className="py-2 px-3">25–26</td><td className="py-2 px-3">35–36</td></tr>
                  <tr><td className="py-2 px-3 font-medium">S</td><td className="py-2 px-3">34–35</td><td className="py-2 px-3">27–28</td><td className="py-2 px-3">37–38</td></tr>
                  <tr><td className="py-2 px-3 font-medium">M</td><td className="py-2 px-3">36–37</td><td className="py-2 px-3">29–30</td><td className="py-2 px-3">39–40</td></tr>
                  <tr><td className="py-2 px-3 font-medium">L</td><td className="py-2 px-3">38–40</td><td className="py-2 px-3">31–33</td><td className="py-2 px-3">41–43</td></tr>
                  <tr><td className="py-2 px-3 font-medium">XL</td><td className="py-2 px-3">41–43</td><td className="py-2 px-3">34–36</td><td className="py-2 px-3">44–46</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-[#78716C]">
              Kids Heritage sizes (4Y–10Y) correspond to age in years. Contact our Kala Ghoda atelier for complimentary bespoke tailoring adjustments.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
