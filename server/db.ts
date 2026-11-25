import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'maison_verri.db');
export const db = new DatabaseSync(dbPath);

db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      segment TEXT NOT NULL DEFAULT 'Standard',
      lifetime_value REAL NOT NULL DEFAULT 0,
      total_orders INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      department TEXT NOT NULL DEFAULT 'Executive Atelier',
      permissions_json TEXT NOT NULL DEFAULT '{"all":true}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS product_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      parent_id INTEGER REFERENCES product_categories(id) ON DELETE SET NULL,
      description TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES product_categories(id) ON DELETE RESTRICT,
      sku TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      brand TEXT NOT NULL DEFAULT 'MAISON VERRI',
      description TEXT NOT NULL,
      base_price REAL NOT NULL,
      discount_percent REAL NOT NULL DEFAULT 0,
      final_price REAL NOT NULL,
      cost_price REAL NOT NULL DEFAULT 0,
      collection_tag TEXT NOT NULL DEFAULT 'Atelier Core',
      gender_segment TEXT NOT NULL CHECK (gender_segment IN ('Women', 'Men', 'Kids', 'Accessories')),
      is_new_arrival INTEGER NOT NULL DEFAULT 0,
      is_trending INTEGER NOT NULL DEFAULT 0,
      is_best_seller INTEGER NOT NULL DEFAULT 0,
      is_featured INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
      rating_avg REAL NOT NULL DEFAULT 4.8,
      review_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS product_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      size TEXT NOT NULL,
      color TEXT NOT NULL,
      color_hex TEXT NOT NULL DEFAULT '#111111',
      variant_sku TEXT NOT NULL UNIQUE,
      price_override REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (product_id, size, color)
    );

    CREATE TABLE IF NOT EXISTS product_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      image_url TEXT NOT NULL,
      alt_text TEXT NOT NULL DEFAULT '',
      is_primary INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      variant_id INTEGER NOT NULL UNIQUE REFERENCES product_variants(id) ON DELETE CASCADE,
      stock_qty INTEGER NOT NULL DEFAULT 0,
      reserved_qty INTEGER NOT NULL DEFAULT 0,
      reorder_level INTEGER NOT NULL DEFAULT 5,
      warehouse_location TEXT NOT NULL DEFAULT 'Mumbai Flagship Vault',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS addresses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      street TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      postal_code TEXT NOT NULL,
      country TEXT NOT NULL DEFAULT 'India',
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
      discount_value REAL NOT NULL,
      min_order_amount REAL NOT NULL DEFAULT 0,
      max_uses INTEGER NOT NULL DEFAULT 500,
      used_count INTEGER NOT NULL DEFAULT 0,
      valid_from TEXT NOT NULL DEFAULT (datetime('now')),
      valid_until TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL UNIQUE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      customer_email TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      address_id INTEGER REFERENCES addresses(id) ON DELETE SET NULL,
      shipping_address_json TEXT NOT NULL,
      coupon_code TEXT,
      subtotal REAL NOT NULL,
      discount_amount REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      shipping_cost REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL,
      payment_method TEXT NOT NULL CHECK (payment_method IN ('UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'COD')),
      payment_status TEXT NOT NULL DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Paid', 'Failed', 'Refunded')),
      order_status TEXT NOT NULL DEFAULT 'Pending' CHECK (order_status IN ('Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled', 'Returned')),
      shipping_method TEXT NOT NULL DEFAULT 'Standard Atelier',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      variant_id INTEGER REFERENCES product_variants(id) ON DELETE SET NULL,
      product_name TEXT NOT NULL,
      size TEXT NOT NULL,
      color TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      unit_cost REAL NOT NULL DEFAULT 0,
      line_total REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      gateway TEXT NOT NULL CHECK (gateway IN ('Razorpay', 'COD')),
      gateway_order_id TEXT,
      gateway_payment_id TEXT,
      gateway_signature TEXT,
      method_detail TEXT DEFAULT '',
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Paid', 'Failed', 'Refunded')),
      paid_at TEXT,
      refund_amount REAL NOT NULL DEFAULT 0,
      refund_status TEXT NOT NULL DEFAULT 'None' CHECK (refund_status IN ('None', 'Partial', 'Full')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS shipments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
      carrier TEXT NOT NULL DEFAULT 'Verri Atelier Courier',
      tracking_number TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'Processing' CHECK (status IN ('Processing', 'Packed', 'In Transit', 'Out for Delivery', 'Delivered', 'Cancelled')),
      estimated_delivery TEXT,
      shipped_at TEXT,
      delivered_at TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      reviewer_name TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      title TEXT NOT NULL,
      comment TEXT NOT NULL,
      is_approved INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Requested' CHECK (status IN ('Requested', 'Approved', 'Refunded', 'Rejected')),
      refund_amount REAL NOT NULL DEFAULT 0,
      requested_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS contact_enquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT DEFAULT '',
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS website_settings (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS wishlists (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  seedInitialData();
}

function seedInitialData(): void {
  const existingCat = db.prepare('SELECT COUNT(*) AS cnt FROM product_categories').get() as { cnt: number };
  if (existingCat.cnt > 0) return;

  const IMG_HERO = '/src/assets/images/hero_luxury_atelier_1795602785980.jpg';
  const IMG_WOMEN = '/src/assets/images/collection_womens_tailoring_1795602786165.jpg';
  const IMG_MEN = '/src/assets/images/collection_mens_outerwear_1795602786989.jpg';
  const IMG_ACC = '/src/assets/images/collection_accessories_gold_1795602787910.jpg';
  const IMG_KIDS = '/src/assets/images/collection_kids_heritage_1795602787427.jpg';
  const IMG_GOWN = '/src/assets/images/product_evening_gown_silk_1795602788613.jpg';

  const insertCat = db.prepare(
    'INSERT INTO product_categories (name, slug, description, image_url, sort_order) VALUES (?, ?, ?, ?, ?)'
  );
  const cWomen = Number(insertCat.run("Women's Tailoring", 'womens-tailoring', 'Structured blazers, mulberry silk shirts, and fluid architectural silhouettes.', IMG_WOMEN, 1).lastInsertRowid);
  const cMen = Number(insertCat.run("Men's Outerwear", 'mens-outerwear', 'Double-breasted cashmere coats, fine merino knitwear, and crisp sartorial trousers.', IMG_MEN, 2).lastInsertRowid);
  const cCouture = Number(insertCat.run('Evening Couture', 'evening-couture', 'Bias-cut silk satin evening gowns and black-tie occasion pieces.', IMG_GOWN, 3).lastInsertRowid);
  const cAcc = Number(insertCat.run('Leather & Silk', 'leather-silk', 'Full-grain Italian calfskin bags with brushed gold hardware and hand-rolled foulards.', IMG_ACC, 4).lastInsertRowid);
  const cKids = Number(insertCat.run("Kids' Heritage", 'kids-heritage', 'Tailored organic linen blazers and heritage cable-knit apparel for younger wardrobes.', IMG_KIDS, 5).lastInsertRowid);

  const productsSeed = [
    {
      cat: cWomen,
      sku: 'MV-WT-101',
      name: 'Palazzo Cashmere & Wool Blazer',
      slug: 'palazzo-cashmere-wool-blazer',
      brand: 'MAISON VERRI',
      description: 'Double-faced Italian virgin wool blazer featuring horn buttons, hand-finished pick stitching, and an effortless draped lapel.',
      base: 24500,
      disc: 10,
      cost: 10800,
      col: 'Autumn / Winter 2026',
      gender: 'Women',
      newArr: 1,
      trend: 1,
      best: 1,
      feat: 1,
      imgs: [IMG_WOMEN, IMG_HERO],
      variants: [
        { size: 'XS', color: 'Champagne Beige', hex: '#D8C7B0', stock: 8 },
        { size: 'S', color: 'Champagne Beige', hex: '#D8C7B0', stock: 14 },
        { size: 'M', color: 'Champagne Beige', hex: '#D8C7B0', stock: 11 },
        { size: 'L', color: 'Obsidian Black', hex: '#141414', stock: 4 },
      ],
    },
    {
      cat: cWomen,
      sku: 'MV-WT-102',
      name: ' Como Mulberry Silk Drape Shirt',
      slug: 'como-mulberry-silk-drape-shirt',
      brand: 'MAISON VERRI',
      description: 'Woven from 22-momme Como mulberry silk with mother-of-pearl closures and elongated French cuffs.',
      base: 14200,
      disc: 0,
      cost: 5900,
      col: 'Atelier Core',
      gender: 'Women',
      newArr: 1,
      trend: 0,
      best: 1,
      feat: 1,
      imgs: [IMG_WOMEN, IMG_GOWN],
      variants: [
        { size: 'XS', color: 'Ivory', hex: '#F7F3EA', stock: 10 },
        { size: 'S', color: 'Ivory', hex: '#F7F3EA', stock: 16 },
        { size: 'M', color: 'Ivory', hex: '#F7F3EA', stock: 3 },
        { size: 'L', color: 'Champagne Beige', hex: '#D8C7B0', stock: 7 },
      ],
    },
    {
      cat: cCouture,
      sku: 'MV-EC-201',
      name: 'Nocturne Bias-Cut Silk Satin Gown',
      slug: 'nocturne-bias-cut-silk-satin-gown',
      brand: 'VERRI ATELIER',
      description: 'Sculptural obsidian silk satin evening dress cut on the true bias for fluid movement and an asymmetric pleated waist.',
      base: 42000,
      disc: 12,
      cost: 17500,
      col: 'Nocturne Capsule',
      gender: 'Women',
      newArr: 1,
      trend: 1,
      best: 1,
      feat: 1,
      imgs: [IMG_GOWN, IMG_HERO],
      variants: [
        { size: 'XS', color: 'Obsidian Black', hex: '#111111', stock: 5 },
        { size: 'S', color: 'Obsidian Black', hex: '#111111', stock: 9 },
        { size: 'M', color: 'Obsidian Black', hex: '#111111', stock: 6 },
        { size: 'L', color: 'Obsidian Black', hex: '#111111', stock: 0 },
      ],
    },
    {
      cat: cMen,
      sku: 'MV-MO-301',
      name: 'Sartorial Double-Breasted Cashmere Overcoat',
      slug: 'sartorial-double-breasted-cashmere-overcoat',
      brand: 'VERRI UOMO',
      description: 'Full-canvas tailored overcoat crafted from pure brushed cashmere with peak lapels and horn buttons.',
      base: 38500,
      disc: 15,
      cost: 16400,
      col: 'Autumn / Winter 2026',
      gender: 'Men',
      newArr: 1,
      trend: 1,
      best: 1,
      feat: 1,
      imgs: [IMG_MEN, IMG_HERO],
      variants: [
        { size: 'S', color: 'Obsidian Black', hex: '#141414', stock: 6 },
        { size: 'M', color: 'Obsidian Black', hex: '#141414', stock: 12 },
        { size: 'L', color: 'Obsidian Black', hex: '#141414', stock: 9 },
        { size: 'XL', color: 'Camel Travertine', hex: '#B99262', stock: 4 },
      ],
    },
    {
      cat: cMen,
      sku: 'MV-MO-302',
      name: 'Bologna Fine Merino Crewneck Knit',
      slug: 'bologna-fine-merino-crewneck-knit',
      brand: 'VERRI UOMO',
      description: 'Ultra-fine 18-gauge extra-long-staple merino wool sweater knitted for breathable four-season layering.',
      base: 12800,
      disc: 0,
      cost: 5100,
      col: 'Atelier Core',
      gender: 'Men',
      newArr: 0,
      trend: 1,
      best: 1,
      feat: 0,
      imgs: [IMG_MEN],
      variants: [
        { size: 'S', color: 'Champagne Beige', hex: '#D8C7B0', stock: 15 },
        { size: 'M', color: 'Champagne Beige', hex: '#D8C7B0', stock: 18 },
        { size: 'L', color: 'Obsidian Black', hex: '#141414', stock: 11 },
        { size: 'XL', color: 'Obsidian Black', hex: '#141414', stock: 7 },
      ],
    },
    {
      cat: cMen,
      sku: 'MV-MO-303',
      name: 'Milanese Pleated Wool Flannel Trousers',
      slug: 'milanese-pleated-wool-flannel-trousers',
      brand: 'VERRI UOMO',
      description: 'High-rise double-pleat tailored trousers in brushed slate flannel with side-tab waist adjusters.',
      base: 15600,
      disc: 10,
      cost: 6400,
      col: 'Atelier Core',
      gender: 'Men',
      newArr: 0,
      trend: 0,
      best: 1,
      feat: 0,
      imgs: [IMG_MEN, IMG_HERO],
      variants: [
        { size: 'S', color: 'Charcoal Slate', hex: '#363638', stock: 9 },
        { size: 'M', color: 'Charcoal Slate', hex: '#363638', stock: 14 },
        { size: 'L', color: 'Obsidian Black', hex: '#111111', stock: 10 },
      ],
    },
    {
      cat: cAcc,
      sku: 'MV-LS-401',
      name: 'Aurelia Calfskin Tote with Gold Clasp',
      slug: 'aurelia-calfskin-tote-gold-clasp',
      brand: 'MAISON VERRI',
      description: 'Architectural top-handle tote in full-grain Tuscan calfskin finished with custom brushed 18k gold-plated lock hardware.',
      base: 29800,
      disc: 5,
      cost: 11900,
      col: 'Signature Leather',
      gender: 'Accessories',
      newArr: 1,
      trend: 1,
      best: 1,
      feat: 1,
      imgs: [IMG_ACC, IMG_HERO],
      variants: [
        { size: 'One Size', color: 'Obsidian / Gold', hex: '#141414', stock: 7 },
        { size: 'One Size', color: 'Warm Travertine', hex: '#D8C7B0', stock: 3 },
      ],
    },
    {
      cat: cAcc,
      sku: 'MV-LS-402',
      name: 'Via Solferino Hand-Rolled Silk Foulard',
      slug: 'via-solferino-hand-rolled-silk-foulard',
      brand: 'MAISON VERRI',
      description: '90x90cm heritage square scarf in lustrous silk twill featuring golden architectural motifs and hand-rolled edges.',
      base: 7800,
      disc: 0,
      cost: 2800,
      col: 'Signature Silk',
      gender: 'Accessories',
      newArr: 1,
      trend: 1,
      best: 0,
      feat: 1,
      imgs: [IMG_ACC],
      variants: [
        { size: 'One Size', color: 'Champagne Gold', hex: '#C6A462', stock: 22 },
        { size: 'One Size', color: 'Ivory / Obsidian', hex: '#F3EDE2', stock: 14 },
      ],
    },
    {
      cat: cKids,
      sku: 'MV-KH-501',
      name: 'Junior Heritage Linen Tailored Blazer',
      slug: 'junior-heritage-linen-tailored-blazer',
      brand: 'VERRI ENFANT',
      description: 'Breathable Belgian linen tailored jacket for special occasions, lined in soft organic cotton voile with horn buttons.',
      base: 9400,
      disc: 10,
      cost: 3700,
      col: 'Seasonal Resort',
      gender: 'Kids',
      newArr: 1,
      trend: 0,
      best: 1,
      feat: 1,
      imgs: [IMG_KIDS],
      variants: [
        { size: '4Y', color: 'Sand Beige', hex: '#D6C6AE', stock: 8 },
        { size: '6Y', color: 'Sand Beige', hex: '#D6C6AE', stock: 11 },
        { size: '8Y', color: 'Sand Beige', hex: '#D6C6AE', stock: 6 },
        { size: '10Y', color: 'Sand Beige', hex: '#D6C6AE', stock: 4 },
      ],
    },
    {
      cat: cKids,
      sku: 'MV-KH-502',
      name: 'Petite Organic Cotton Cable-Knit Jumper',
      slug: 'petite-organic-cotton-cable-knit-jumper',
      brand: 'VERRI ENFANT',
      description: 'Plush heirloom cable-knit sweater crafted from GOTS-certified organic combed cotton in warm ivory.',
      base: 6200,
      disc: 15,
      cost: 2400,
      col: 'Autumn / Winter 2026',
      gender: 'Kids',
      newArr: 0,
      trend: 1,
      best: 1,
      feat: 0,
      imgs: [IMG_KIDS],
      variants: [
        { size: '4Y', color: 'Ivory', hex: '#F6F2E8', stock: 12 },
        { size: '6Y', color: 'Ivory', hex: '#F6F2E8', stock: 15 },
        { size: '8Y', color: 'Ivory', hex: '#F6F2E8', stock: 2 },
        { size: '10Y', color: 'Ivory', hex: '#F6F2E8', stock: 9 },
      ],
    },
    {
      cat: cWomen,
      sku: 'MV-WT-103',
      name: 'Travertine Belted Camel Wrap Coat',
      slug: 'travertine-belted-camel-wrap-coat',
      brand: 'MAISON VERRI',
      description: 'Signature sweeping camel wool-cashmere wrap coat seen in our Autumn/Winter atelier campaign, with matching sash belt.',
      base: 36000,
      disc: 10,
      cost: 15200,
      col: 'Autumn / Winter 2026',
      gender: 'Women',
      newArr: 1,
      trend: 1,
      best: 1,
      feat: 1,
      imgs: [IMG_HERO, IMG_WOMEN],
      variants: [
        { size: 'XS', color: 'Camel Travertine', hex: '#B99262', stock: 5 },
        { size: 'S', color: 'Camel Travertine', hex: '#B99262', stock: 9 },
        { size: 'M', color: 'Camel Travertine', hex: '#B99262', stock: 7 },
        { size: 'L', color: 'Obsidian Black', hex: '#141414', stock: 6 },
      ],
    },
    {
      cat: cCouture,
      sku: 'MV-EC-202',
      name: 'Verri Atelier Draped Silk Column Skirt',
      slug: 'verri-atelier-draped-silk-column-skirt',
      brand: 'VERRI ATELIER',
      description: 'Floor-skimming column skirt in heavy liquid silk crepe with subtle side drape and concealed zip.',
      base: 18900,
      disc: 20,
      cost: 7900,
      col: 'Special Discounts',
      gender: 'Women',
      newArr: 0,
      trend: 1,
      best: 0,
      feat: 0,
      imgs: [IMG_GOWN, IMG_WOMEN],
      variants: [
        { size: 'S', color: 'Obsidian Black', hex: '#111111', stock: 8 },
        { size: 'M', color: 'Obsidian Black', hex: '#111111', stock: 5 },
        { size: 'L', color: 'Champagne Gold', hex: '#C6A462', stock: 3 },
      ],
    },
  ];

  const insertProd = db.prepare(`
    INSERT INTO products (
      category_id, sku, name, slug, brand, description, base_price, discount_percent,
      final_price, cost_price, collection_tag, gender_segment, is_new_arrival,
      is_trending, is_best_seller, is_featured, status, rating_avg, review_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 4.9, 2)
  `);
  const insertImg = db.prepare(
    'INSERT INTO product_images (product_id, image_url, alt_text, is_primary, sort_order) VALUES (?, ?, ?, ?, ?)'
  );
  const insertVar = db.prepare(
    'INSERT INTO product_variants (product_id, size, color, color_hex, variant_sku) VALUES (?, ?, ?, ?, ?)'
  );
  const insertInv = db.prepare(
    'INSERT INTO inventory (variant_id, stock_qty, reserved_qty, reorder_level, warehouse_location) VALUES (?, ?, 0, 5, ?)'
  );

  const variantIdsByProduct: Array<{ prodId: number; name: string; price: number; cost: number; variants: Array<{ id: number; size: string; color: string }> }> = [];

  for (const p of productsSeed) {
    const finalPrice = Math.round(p.base * (1 - p.disc / 100));
    const prodId = Number(
      insertProd.run(
        p.cat, p.sku, p.name.trim(), p.slug, p.brand, p.description, p.base, p.disc,
        finalPrice, p.cost, p.col, p.gender, p.newArr, p.trend, p.best, p.feat
      ).lastInsertRowid
    );

    p.imgs.forEach((url, idx) => {
      insertImg.run(prodId, url, `${p.name.trim()} view ${idx + 1}`, idx === 0 ? 1 : 0, idx);
    });

    const vList: Array<{ id: number; size: string; color: string }> = [];
    p.variants.forEach((v, idx) => {
      const vSku = `${p.sku}-${v.size.replace(/\s+/g, '')}-${idx + 1}`;
      const varId = Number(insertVar.run(prodId, v.size, v.color, v.hex, vSku).lastInsertRowid);
      insertInv.run(varId, v.stock, 'Mumbai Flagship Vault');
      vList.push({ id: varId, size: v.size, color: v.color });
    });

    variantIdsByProduct.push({ prodId, name: p.name.trim(), price: finalPrice, cost: p.cost, variants: vList });
  }

  // Seed active coupons
  const insertCoupon = db.prepare(
    'INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, max_uses, used_count, valid_until, is_active) VALUES (?, ?, ?, ?, 1000, ?, ?, 1)'
  );
  insertCoupon.run('VERRI15', 'percent', 15, 5000, 12, '2027-12-31T23:59:59Z');
  insertCoupon.run('ATELIER500', 'fixed', 500, 3000, 8, '2027-12-31T23:59:59Z');
  insertCoupon.run('SEASON20', 'percent', 20, 15000, 5, '2027-12-31T23:59:59Z');

  // Seed historical customer profiles (non-login archive customers for BI analytics; real users can register)
  const insertUser = db.prepare(
    'INSERT INTO users (email, password_hash, full_name, phone, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const insertCust = db.prepare(
    'INSERT INTO customers (user_id, segment, lifetime_value, total_orders, created_at) VALUES (?, ?, ?, ?, ?)'
  );

  const sampleCustomers = [
    { email: 'ananya.kapoor@example.com', name: 'Ananya Kapoor', phone: '+91 98201 44120', seg: 'VIP', date: '2026-08-10 11:20:00' },
    { email: 'rohan.mehta@example.com', name: 'Rohan Mehta', phone: '+91 98112 77891', seg: 'Returning', date: '2026-08-22 15:40:00' },
    { email: 'meera.iyer@example.com', name: 'Meera Iyer', phone: '+91 99450 23190', seg: 'Atelier', date: '2026-09-14 09:15:00' },
    { email: 'vikram.singhania@example.com', name: 'Vikram Singhania', phone: '+91 98330 61204', seg: 'Returning', date: '2026-10-03 18:05:00' },
  ];

  const custIds: Array<{ userId: number; name: string; email: string }> = [];
  for (const c of sampleCustomers) {
    // Archive sample customer accounts with locked marker hash (cannot be logged into without password reset/registration)
    const uid = Number(insertUser.run(c.email, 'ARCHIVED_RECORD', c.name, c.phone, 'customer', c.date).lastInsertRowid);
    insertCust.run(uid, c.seg, 0, 0, c.date);
    custIds.push({ userId: uid, name: c.name, email: c.email });
  }

  // Seed historical orders across Aug–Nov 2026 for Power BI trends & P&L
  const insertOrder = db.prepare(`
    INSERT INTO orders (
      order_number, user_id, customer_email, customer_name, shipping_address_json,
      coupon_code, subtotal, discount_amount, tax_amount, shipping_cost, total_amount,
      payment_method, payment_status, order_status, shipping_method, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, variant_id, product_name, size, color, quantity, unit_price, unit_cost, line_total)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertPayment = db.prepare(`
    INSERT INTO payments (order_id, gateway, gateway_order_id, gateway_payment_id, method_detail, amount, status, paid_at, refund_amount, refund_status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertShipment = db.prepare(`
    INSERT INTO shipments (order_id, carrier, tracking_number, status, estimated_delivery, shipped_at, delivered_at, updated_at)
    VALUES (?, 'Verri Atelier Courier', ?, ?, ?, ?, ?, ?)
  `);

  const orderTemplates = [
    { num: 'MV-2026-1001', cust: 0, items: [[0, 1], [7, 1]], method: 'UPI', pStatus: 'Paid', oStatus: 'Delivered', date: '2026-08-14 12:10:00' },
    { num: 'MV-2026-1002', cust: 1, items: [[3, 1], [4, 2]], method: 'Credit Card', pStatus: 'Paid', oStatus: 'Delivered', date: '2026-08-27 16:45:00' },
    { num: 'MV-2026-1003', cust: 2, items: [[2, 1]], method: 'Net Banking', pStatus: 'Paid', oStatus: 'Delivered', date: '2026-09-05 14:22:00' },
    { num: 'MV-2026-1004', cust: 0, items: [[6, 1], [1, 1]], method: 'Credit Card', pStatus: 'Paid', oStatus: 'Delivered', date: '2026-09-18 19:10:00' },
    { num: 'MV-2026-1005', cust: 3, items: [[5, 2]], method: 'COD', pStatus: 'Paid', oStatus: 'Delivered', date: '2026-09-29 10:30:00' },
    { num: 'MV-2026-1006', cust: 1, items: [[8, 1], [9, 2]], method: 'Debit Card', pStatus: 'Paid', oStatus: 'Delivered', date: '2026-10-08 13:15:00' },
    { num: 'MV-2026-1007', cust: 2, items: [[10, 1]], method: 'UPI', pStatus: 'Paid', oStatus: 'Delivered', date: '2026-10-19 17:50:00' },
    { num: 'MV-2026-1008', cust: 0, items: [[11, 1], [7, 1]], method: 'Credit Card', pStatus: 'Refunded', oStatus: 'Returned', date: '2026-10-25 11:05:00' },
    { num: 'MV-2026-1009', cust: 3, items: [[3, 1]], method: 'COD', pStatus: 'Pending', oStatus: 'Shipped', date: '2026-11-04 15:20:00' },
    { num: 'MV-2026-1010', cust: 1, items: [[4, 1], [5, 1]], method: 'UPI', pStatus: 'Paid', oStatus: 'Confirmed', date: '2026-11-12 09:40:00' },
    { num: 'MV-2026-1011', cust: 2, items: [[0, 1], [6, 1]], method: 'Credit Card', pStatus: 'Paid', oStatus: 'Shipped', date: '2026-11-18 18:30:00' },
    { num: 'MV-2026-1012', cust: 0, items: [[2, 1]], method: 'UPI', pStatus: 'Failed', oStatus: 'Cancelled', date: '2026-11-22 14:12:00' },
    { num: 'MV-2026-1013', cust: 3, items: [[10, 1], [1, 1]], method: 'Net Banking', pStatus: 'Paid', oStatus: 'Pending', date: '2026-11-24 11:00:00' },
  ];

  for (const ot of orderTemplates) {
    const cust = custIds[ot.cust];
    let sub = 0;
    for (const [pIdx, qty] of ot.items) {
      sub += variantIdsByProduct[pIdx].price * qty;
    }
    const tax = Math.round(sub * 0.12);
    const total = sub + tax;
    const addrJson = JSON.stringify({
      full_name: cust.name,
      phone: '+91 98201 44120',
      street: '14 Altamount Road, Cumballa Hill',
      city: 'Mumbai',
      state: 'Maharashtra',
      postal_code: '400026',
      country: 'India',
    });

    const ordId = Number(
      insertOrder.run(
        ot.num, cust.userId, cust.email, cust.name, addrJson,
        null, sub, 0, tax, 0, total,
        ot.method, ot.pStatus, ot.oStatus, 'Express Concierge', ot.date, ot.date
      ).lastInsertRowid
    );

    for (const [pIdx, qty] of ot.items) {
      const prod = variantIdsByProduct[pIdx];
      const v = prod.variants[0];
      insertItem.run(ordId, prod.prodId, v.id, prod.name, v.size, v.color, qty, prod.price, prod.cost, prod.price * qty);
    }

    const gateway = ot.method === 'COD' ? 'COD' : 'Razorpay';
    const refundAmt = ot.pStatus === 'Refunded' ? total : 0;
    const refundStat = ot.pStatus === 'Refunded' ? 'Full' : 'None';
    insertPayment.run(
      ordId, gateway,
      gateway === 'Razorpay' ? `order_rzp_${ordId}881` : null,
      ot.pStatus === 'Paid' || ot.pStatus === 'Refunded' ? `pay_rzp_${ordId}992` : null,
      ot.method, total, ot.pStatus, ot.pStatus === 'Paid' ? ot.date : null, refundAmt, refundStat, ot.date
    );

    const shipStat = ot.oStatus === 'Delivered' ? 'Delivered' : ot.oStatus === 'Shipped' ? 'In Transit' : ot.oStatus === 'Cancelled' ? 'Cancelled' : 'Processing';
    insertShipment.run(
      ordId, `MV-TRK-${10000 + ordId}`, shipStat, ot.date.slice(0, 10),
      ot.oStatus === 'Shipped' || ot.oStatus === 'Delivered' ? ot.date : null,
      ot.oStatus === 'Delivered' ? ot.date : null, ot.date
    );

    if (ot.oStatus !== 'Cancelled' && ot.oStatus !== 'Returned') {
      db.prepare('UPDATE customers SET lifetime_value = lifetime_value + ?, total_orders = total_orders + 1 WHERE user_id = ?').run(total, cust.userId);
    }
  }

  db.prepare('INSERT INTO returns (order_id, user_id, reason, status, refund_amount, requested_at, resolved_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    8, custIds[0].userId, 'Size exchange requested after fitting', 'Refunded', 29792, '2026-10-27 10:00:00', '2026-10-29 16:00:00'
  );

  // Seed verified reviews
  const insertReview = db.prepare(
    'INSERT INTO reviews (product_id, reviewer_name, rating, title, comment, is_approved, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)'
  );
  insertReview.run(variantIdsByProduct[0].prodId, 'Ananya Kapoor', 5, 'Impeccable Milanese drape', 'The virgin wool feels weightless yet holds a razor-sharp shoulder line through an entire evening.', '2026-09-02 10:00:00');
  insertReview.run(variantIdsByProduct[0].prodId, 'Devika Nair', 5, 'True heirloom tailoring', 'Subtle horn buttons and gorgeous champagne tone. Worth every rupee.', '2026-10-14 14:30:00');
  insertReview.run(variantIdsByProduct[2].prodId, 'Meera Iyer', 5, 'Liquid silk perfection', 'Bias cut glides effortlessly without clinging. Wore it to a Mumbai gallery gala.', '2026-09-20 18:10:00');
  insertReview.run(variantIdsByProduct[3].prodId, 'Rohan Mehta', 5, 'Architectural warmth', 'Pure cashmere density is unmatched and the double-breasted cut looks timeless.', '2026-09-12 09:20:00');
  insertReview.run(variantIdsByProduct[6].prodId, 'Zoya Merchant', 5, 'Brushed gold clasp elevates everything', 'Supple Tuscan calfskin with structured interior pockets. My daily companion.', '2026-10-08 11:45:00');

  // Seed Website Settings
  const insertSetting = db.prepare('INSERT INTO website_settings (key, value_json) VALUES (?, ?)');
  insertSetting.run(
    'promo_bar',
    JSON.stringify({
      enabled: true,
      text: 'Complimentary Express Atelier Delivery over ₹8,000 · Use code VERRI15 for 15% off Autumn/Winter',
    })
  );
  insertSetting.run(
    'hero_banner',
    JSON.stringify({
      kicker: 'Autumn / Winter 2026 Atelier Collection',
      title: 'Quiet Architecture in Cashmere, Silk & Form',
      subtitle: 'Hand-finished tailoring, luminous Como silk, and Tuscan leather crafted for enduring wardrobes.',
      cta_label: 'Explore Collection',
      offer_label: 'Seasonal Privilege · 15% Off with VERRI15',
      image_url: IMG_HERO,
    })
  );
  insertSetting.run(
    'featured_brands',
    JSON.stringify(['MAISON VERRI', 'VERRI ATELIER', 'VERRI UOMO', 'VERRI ENFANT', 'LANIFICIO COMO'])
  );
  insertSetting.run(
    'operating_expenses_monthly',
    JSON.stringify({ amount: 185000, currency: 'INR', notes: 'Flagship showroom lease, atelier tailors & logistics' })
  );
}
