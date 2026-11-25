import React, { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/ProductCard';
import type { Product } from '../types';

export function ShopPage() {
  const { shopFilters, categories } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState(shopFilters.search || '');
  const [gender, setGender] = useState(shopFilters.gender || 'all');
  const [category, setCategory] = useState(shopFilters.category || 'all');
  const [brand, setBrand] = useState('all');
  const [size, setSize] = useState('all');
  const [color, setColor] = useState('all');
  const [maxPrice, setMaxPrice] = useState(50000);
  const [sort, setSort] = useState('popularity');
  const [flag, setFlag] = useState(shopFilters.flag || '');
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  useEffect(() => {
    setSearch(shopFilters.search || '');
    setGender(shopFilters.gender || 'all');
    setCategory(shopFilters.category || 'all');
    setFlag(shopFilters.flag || '');
  }, [shopFilters]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = new URLSearchParams();
    if (gender !== 'all') params.set('gender', gender);
    if (category !== 'all') params.set('category', category);
    if (brand !== 'all') params.set('brand', brand);
    if (size !== 'all') params.set('size', size);
    if (color !== 'all') params.set('color', color);
    if (maxPrice < 50000) params.set('maxPrice', String(maxPrice));
    if (search.trim()) params.set('search', search.trim());
    if (sort) params.set('sort', sort);
    if (flag) params.set('flag', flag);

    fetch(`/api/products?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (active && Array.isArray(data)) setProducts(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [gender, category, brand, size, color, maxPrice, search, sort, flag]);

  const uniqueBrands = useMemo(
    () => ['MAISON VERRI', 'VERRI ATELIER', 'VERRI UOMO', 'VERRI ENFANT'],
    []
  );

  const resetAll = () => {
    setSearch('');
    setGender('all');
    setCategory('all');
    setBrand('all');
    setSize('all');
    setColor('all');
    setMaxPrice(50000);
    setFlag('');
    setSort('popularity');
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-8 border-b border-[#E5DEC9]">
        <div>
          <p className="text-xs tracking-[0.16em] uppercase text-[#9A7736]">The Atelier Catalog</p>
          <h1 className="font-serif text-4xl text-[#111111] mt-1">
            {gender !== 'all' ? `${gender}'s Collection` : flag === 'discount' ? 'Seasonal Offers' : 'All Garments & Leather'}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search piece or SKU..."
              className="pl-9 pr-3 py-2 bg-white border border-[#D6CCB8] text-xs w-56 focus:outline-none focus:border-[#B8924A]"
            />
          </div>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort products"
            className="px-3 py-2 bg-white border border-[#D6CCB8] text-xs text-[#111111] focus:outline-none focus:border-[#B8924A]"
          >
            <option value="popularity">Sort: Popularity</option>
            <option value="latest">Sort: Latest Arrivals</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="discount">Highest Discount</option>
          </select>

          <button
            type="button"
            onClick={() => setShowFiltersMobile((v) => !v)}
            className="lg:hidden inline-flex items-center gap-1.5 px-3 py-2 border border-[#111111] text-xs font-medium"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8">
        {/* Filter Sidebar */}
        <aside className={`lg:col-span-3 space-y-6 ${showFiltersMobile ? 'block' : 'hidden lg:block'}`}>
          <div className="bg-white border border-[#E5DEC9] p-5 space-y-6">
            <div className="flex items-center justify-between border-b border-[#EFE9DD] pb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#111111]">Refine Selection</span>
              <button type="button" onClick={resetAll} className="text-xs text-[#9A7736] hover:underline cursor-pointer">
                Reset
              </button>
            </div>

            {/* Department / Gender */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#111111]">Department</label>
              <div className="flex flex-wrap gap-1.5">
                {['all', 'Women', 'Men', 'Kids', 'Accessories'].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`px-2.5 py-1 text-xs border transition-colors cursor-pointer ${
                      gender === g
                        ? 'bg-[#111111] text-white border-[#111111]'
                        : 'bg-[#FAF8F5] text-[#57534E] border-[#E5DEC9] hover:border-[#B8924A]'
                    }`}
                  >
                    {g === 'all' ? 'All' : g}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#111111]">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-[#D6CCB8] bg-[#FAF8F5] px-3 py-2 text-xs focus:outline-none"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#111111]">House Label</label>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full border border-[#D6CCB8] bg-[#FAF8F5] px-3 py-2 text-xs focus:outline-none"
              >
                <option value="all">All Labels</option>
                {uniqueBrands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Size */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#111111]">Size</label>
              <div className="flex flex-wrap gap-1.5">
                {['all', 'XS', 'S', 'M', 'L', 'XL', '4Y', '6Y', '8Y', 'One Size'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    className={`px-2 py-1 text-xs border cursor-pointer ${
                      size === s
                        ? 'bg-[#111111] text-white border-[#111111]'
                        : 'bg-[#FAF8F5] text-[#57534E] border-[#E5DEC9]'
                    }`}
                  >
                    {s === 'all' ? 'Any' : s}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#111111]">Color</label>
              <select
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full border border-[#D6CCB8] bg-[#FAF8F5] px-3 py-2 text-xs focus:outline-none"
              >
                <option value="all">All Palettes</option>
                <option value="Obsidian Black">Obsidian Black</option>
                <option value="Champagne Beige">Champagne Beige</option>
                <option value="Ivory">Ivory</option>
                <option value="Camel Travertine">Camel Travertine</option>
                <option value="Charcoal Slate">Charcoal Slate</option>
                <option value="Sand Beige">Sand Beige</option>
              </select>
            </div>

            {/* Price Ceiling */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-[#111111]">Max Price</span>
                <span className="font-mono tabular-nums text-[#9A7736]">₹{maxPrice.toLocaleString('en-IN')}</span>
              </div>
              <input
                type="range"
                min={5000}
                max={50000}
                step={1000}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-[#B8924A]"
              />
            </div>

            {/* Discount Toggle */}
            <label className="flex items-center gap-2 text-xs text-[#111111] cursor-pointer">
              <input
                type="checkbox"
                checked={flag === 'discount'}
                onChange={(e) => setFlag(e.target.checked ? 'discount' : '')}
                className="accent-[#B8924A]"
              />
              <span>Only Special Discounts</span>
            </label>
          </div>
        </aside>

        {/* Product Grid */}
        <section className="lg:col-span-9">
          <div className="flex items-center justify-between mb-4 text-xs text-[#78716C]">
            <span className="tabular-nums">{products.length} pieces matching selection</span>
            {(gender !== 'all' || category !== 'all' || search || flag) && (
              <button
                type="button"
                onClick={resetAll}
                className="inline-flex items-center gap-1 text-[#111111] hover:text-[#9A7736] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear active filters</span>
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="h-96 bg-[#EFE9DD] animate-pulse border border-[#E5DEC9]" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white border border-[#E5DEC9] p-12 text-center space-y-3">
              <p className="font-serif text-2xl text-[#111111]">No garments match your current filters</p>
              <p className="text-sm text-[#78716C]">Try clearing one or more filters to browse the full collection.</p>
              <button
                type="button"
                onClick={resetAll}
                className="px-5 py-2.5 bg-[#111111] text-white text-xs font-medium cursor-pointer"
              >
                Show All Pieces
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
