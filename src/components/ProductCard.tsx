import React, { useState } from 'react';
import { Heart, ShoppingBag } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { Product } from '../types';
import { formatINR, safeImageUrl } from '../utils/format';

export function ProductCard({ product }: { product: Product }) {
  const { navigate, wishlistIds, toggleWishlist, addToCart } = useStore();
  const [imgError, setImgError] = useState(false);

  const primaryUrl = safeImageUrl(product.images?.[0]?.image_url);
  const wishlisted = wishlistIds.includes(product.id);
  const firstAvailableVariant = product.variants?.find((v) => v.stock_qty > 0) || product.variants?.[0];

  return (
    <article className="group flex flex-col bg-white border border-[#E7E0D3] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div
        onClick={() => navigate('product', { slug: product.slug })}
        className="relative aspect-[4/3] w-full overflow-hidden bg-[#F2ECE1] cursor-pointer"
      >
        {primaryUrl && !imgError ? (
          <img
            src={primaryUrl}
            alt={product.name}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#F5F0E8] to-[#E5DEC9]">
            <span className="font-serif text-lg text-[#111111]">{product.name}</span>
            <span className="text-xs text-[#78716C] mt-1">{product.brand}</span>
          </div>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(product.id);
          }}
          aria-label={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
          className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white text-[#111111] rounded-sm transition-colors cursor-pointer"
        >
          <Heart className={`w-4 h-4 ${wishlisted ? 'fill-[#B8924A] text-[#B8924A]' : 'text-[#111111]'}`} />
        </button>

        {!product.in_stock && (
          <div className="absolute bottom-3 left-3 bg-[#111111]/85 text-white px-2.5 py-1 text-xs">
            Sold Out
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-[#78716C]">
            <span>{product.brand}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{product.category_name}</span>
          </div>

          <h3
            onClick={() => navigate('product', { slug: product.slug })}
            className="text-[15px] font-semibold text-[#111111] leading-snug cursor-pointer hover:text-[#9A7736] transition-colors line-clamp-2"
          >
            {product.name}
          </h3>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[#F0EAE0]">
          <div className="flex items-baseline gap-2 tabular-nums">
            <span className="text-[15px] font-semibold text-[#111111]">
              {formatINR(product.final_price)}
            </span>
            {product.discount_percent > 0 && (
              <>
                <span className="text-xs text-[#8A8277] line-through">
                  {formatINR(product.base_price)}
                </span>
                <span className="text-xs font-medium text-[#9A7736]">
                  -{product.discount_percent}%
                </span>
              </>
            )}
          </div>

          {firstAvailableVariant && product.in_stock && (
            <button
              type="button"
              onClick={() => addToCart(product, firstAvailableVariant.id, 1)}
              aria-label={`Quick add ${product.name} to bag`}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#111111] hover:text-[#9A7736] py-1 px-2 border border-[#E5DEC9] hover:border-[#B8924A] rounded-sm transition-colors cursor-pointer whitespace-nowrap"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
