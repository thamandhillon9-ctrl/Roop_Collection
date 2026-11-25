import React, { useEffect, useState } from 'react';
import { ArrowRight, Star } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/ProductCard';
import type { Product, ProductReview } from '../types';
import { safeImageUrl } from '../utils/format';

type CollectionTab = 'new' | 'trending' | 'bestseller' | 'discount';

export function HomePage() {
  const { navigate, settings, categories } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [activeTab, setActiveTab] = useState<CollectionTab>('new');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch('/api/products').then((r) => r.json()),
      fetch('/api/reviews/featured').then((r) => r.json()),
    ])
      .then(([prodData, revData]) => {
        if (!active) return;
        if (Array.isArray(prodData)) setProducts(prodData);
        if (Array.isArray(revData)) setReviews(revData);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const hero = settings.hero_banner || {
    kicker: 'Autumn / Winter 2026 Atelier Collection',
    title: 'Quiet Architecture in Cashmere, Silk & Form',
    subtitle: 'Hand-finished tailoring, luminous Como silk, and Tuscan leather crafted for enduring wardrobes.',
    cta_label: 'Explore Collection',
    offer_label: 'Seasonal Privilege · 15% Off with VERRI15',
    image_url: '/src/assets/images/hero_luxury_atelier_1795602785980.jpg',
  };

  const brands = settings.featured_brands || [
    'MAISON VERRI',
    'VERRI ATELIER',
    'VERRI UOMO',
    'VERRI ENFANT',
    'LANIFICIO COMO',
  ];

  const tabProducts = products.filter((p) => {
    if (activeTab === 'new') return p.is_new_arrival === 1;
    if (activeTab === 'trending') return p.is_trending === 1;
    if (activeTab === 'bestseller') return p.is_best_seller === 1;
    if (activeTab === 'discount') return p.discount_percent > 0;
    return true;
  });

  const segments = [
    {
      title: "Women's Wear",
      subtitle: 'Structured blazers, mulberry silk & evening couture',
      gender: 'Women',
      image: '/src/assets/images/collection_womens_tailoring_1795602786165.jpg',
    },
    {
      title: "Men's Wear",
      subtitle: 'Cashmere overcoats, fine merino & pleated flannel',
      gender: 'Men',
      image: '/src/assets/images/collection_mens_outerwear_1795602786989.jpg',
    },
    {
      title: "Kids' Wear",
      subtitle: 'Heirloom linen tailoring & organic cotton knits',
      gender: 'Kids',
      image: '/src/assets/images/collection_kids_heritage_1795602787427.jpg',
    },
    {
      title: 'Leather & Silk',
      subtitle: 'Tuscan calfskin totes & hand-rolled silk foulards',
      gender: 'Accessories',
      image: '/src/assets/images/collection_accessories_gold_1795602787910.jpg',
    },
  ];

  return (
    <main>
      {/* 1. Storefront Hero Banner */}
      <section className="relative bg-[#0D0D0D] text-white overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-[540px]">
          <div className="lg:col-span-5 px-6 sm:px-10 lg:px-12 py-14 lg:py-20 flex flex-col justify-center space-y-6 z-10">
            <p className="text-xs tracking-[0.18em] uppercase text-[#C6A462]">{hero.kicker}</p>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-[54px] font-medium leading-[1.08] text-white">
              {hero.title}
            </h1>
            <p className="text-sm sm:text-base text-[#D6CCB8] leading-relaxed max-w-md">
              {hero.subtitle}
            </p>
            <p className="text-xs text-[#C6A462] tracking-wide">{hero.offer_label}</p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => navigate('shop')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#B8924A] text-[#0D0D0D] text-xs font-semibold tracking-wider uppercase hover:bg-[#C6A462] transition-colors cursor-pointer"
              >
                <span>{hero.cta_label}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate('shop', { filters: { flag: 'discount' } })}
                className="px-5 py-3 border border-[#4A443C] text-xs font-medium text-[#EAE2D3] hover:border-[#C6A462] hover:text-white transition-colors cursor-pointer"
              >
                Seasonal Offers
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 relative min-h-[340px] lg:min-h-[540px]">
            <img
              src={safeImageUrl(hero.image_url)}
              alt="Maison Verri Autumn Winter Campaign"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover lg:absolute lg:inset-0"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0D0D0D] via-[#0D0D0D]/30 to-transparent lg:via-transparent" />
          </div>
        </div>
      </section>

      {/* 2. Department & Category Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-8 border-b border-[#E5DEC9]">
          <div>
            <p className="text-xs tracking-[0.16em] uppercase text-[#9A7736]">Curated Houses</p>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#111111] mt-1">
              Departments &amp; Seasonal Wardrobe
            </h2>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-[#57534E]">
            {categories.slice(0, 5).map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => navigate('shop', { filters: { category: cat.slug } })}
                className="hover:text-[#111111] underline underline-offset-4 decoration-[#D6CCB8] hover:decoration-[#B8924A] cursor-pointer"
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-8">
          {segments.map((seg) => (
            <button
              key={seg.gender}
              type="button"
              onClick={() => navigate('shop', { filters: { gender: seg.gender } })}
              className="group text-left bg-white border border-[#E7E0D3] overflow-hidden hover:border-[#B8924A] transition-colors cursor-pointer"
            >
              <div className="aspect-[4/3] w-full overflow-hidden bg-[#EAE2D3]">
                <img
                  src={seg.image}
                  alt={seg.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
              </div>
              <div className="p-4 space-y-1">
                <h3 className="font-serif text-xl text-[#111111] group-hover:text-[#9A7736] transition-colors">
                  {seg.title}
                </h3>
                <p className="text-xs text-[#78716C] line-clamp-1">{seg.subtitle}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 3. Featured Collections Grid (New Arrivals / Trending / Best Sellers / Special Discounts) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8">
          <div>
            <p className="text-xs tracking-[0.16em] uppercase text-[#9A7736]">Atelier Selection</p>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#111111] mt-1">
              Featured Edit
            </h2>
          </div>

          <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#EFE9DD] border border-[#E2D8C6] rounded-sm">
            {[
              { id: 'new', label: 'New Arrivals' },
              { id: 'trending', label: 'Trending' },
              { id: 'bestseller', label: 'Best Sellers' },
              { id: 'discount', label: 'Special Discounts' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as CollectionTab)}
                className={`px-4 py-1.5 text-xs font-medium rounded-sm transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[#111111] text-white'
                    : 'text-[#57534E] hover:text-[#111111]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-96 bg-[#EFE9DD] animate-pulse border border-[#E5DEC9]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {tabProducts.slice(0, 6).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}

        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => navigate('shop')}
            className="inline-flex items-center gap-2 px-7 py-3 border border-[#111111] text-xs font-semibold tracking-wider uppercase text-[#111111] hover:bg-[#111111] hover:text-white transition-colors cursor-pointer"
          >
            <span>View All {products.length} Pieces</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* 4. Craftsmanship, Featured Brands & Client Reviews */}
      <section className="bg-[#F2ECE1] border-y border-[#E2D8C6] py-16 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
          {/* Featured Houses / Brands */}
          <div className="flex flex-wrap items-center justify-between gap-6 pb-10 border-b border-[#DED3BE]">
            <span className="text-xs tracking-[0.16em] uppercase text-[#78716C]">Featured Atelier Labels</span>
            <div className="flex flex-wrap items-center gap-8">
              {brands.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => navigate('shop', { filters: { search: b } })}
                  className="font-serif text-lg tracking-[0.14em] text-[#111111] hover:text-[#9A7736] transition-colors cursor-pointer"
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Client Reviews */}
          <div className="space-y-6">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs tracking-[0.16em] uppercase text-[#9A7736]">Client Impressions</p>
                <h2 className="font-serif text-3xl text-[#111111] mt-1">Verified Atelier Reviews</h2>
              </div>
              <button
                type="button"
                onClick={() => navigate('about')}
                className="text-xs font-medium text-[#111111] underline underline-offset-4 decoration-[#B8924A] cursor-pointer"
              >
                Read Our Heritage Story
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {reviews.slice(0, 3).map((rev) => (
                <div key={rev.id} className="bg-white border border-[#E5DEC9] p-6 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-1 text-[#B8924A]">
                      {Array.from({ length: rev.rating }).map((_, idx) => (
                        <Star key={idx} className="w-3.5 h-3.5 fill-[#B8924A]" />
                      ))}
                    </div>
                    <h3 className="text-sm font-semibold text-[#111111]">{rev.title}</h3>
                    <p className="text-sm text-[#57534E] leading-relaxed">&ldquo;{rev.comment}&rdquo;</p>
                  </div>
                  <div className="pt-3 border-t border-[#F0EAE0] flex items-center justify-between text-xs text-[#78716C]">
                    <span className="font-medium text-[#111111]">{rev.reviewer_name}</span>
                    {rev.product_slug && (
                      <button
                        type="button"
                        onClick={() => navigate('product', { slug: rev.product_slug })}
                        className="hover:text-[#9A7736] truncate max-w-[160px] cursor-pointer"
                      >
                        {rev.product_name}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
