import crypto from 'node:crypto';
import { Router } from 'express';
import { db } from '../db.ts';
import { type AuthRequest, optionalAuth, requireAuth } from '../auth.ts';

export const storefrontRouter = Router();

const SIM_RAZORPAY_SECRET = crypto.randomBytes(24).toString('hex');

function enrichProducts(rows: any[]) {
  if (rows.length === 0) return [];
  const imgStmt = db.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, sort_order ASC');
  const varStmt = db.prepare(`
    SELECT pv.*, COALESCE(inv.stock_qty, 0) AS stock_qty, COALESCE(inv.reorder_level, 5) AS reorder_level
    FROM product_variants pv
    LEFT JOIN inventory inv ON inv.variant_id = pv.id
    WHERE pv.product_id = ?
    ORDER BY pv.id ASC
  `);

  return rows.map((p) => {
    const images = imgStmt.all(p.id);
    const variants = varStmt.all(p.id) as Array<{ stock_qty: number }>;
    const total_stock = variants.reduce((acc, v) => acc + Number(v.stock_qty || 0), 0);
    return {
      ...p,
      images,
      variants,
      total_stock,
      in_stock: total_stock > 0,
    };
  });
}

// Public website settings
storefrontRouter.get('/settings', (_req, res) => {
  const rows = db.prepare('SELECT key, value_json FROM website_settings').all() as Array<{ key: string; value_json: string }>;
  const settings: Record<string, any> = {};
  for (const r of rows) {
    try {
      settings[r.key] = JSON.parse(r.value_json);
    } catch {
      settings[r.key] = r.value_json;
    }
  }
  res.json(settings);
});

// Categories
storefrontRouter.get('/categories', (_req, res) => {
  const rows = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.status = 'active') AS product_count
    FROM product_categories c
    ORDER BY c.sort_order ASC, c.id ASC
  `).all();
  res.json(rows);
});

// Products listing with dynamic parameterized filtering & sorting
storefrontRouter.get('/products', (req, res) => {
  try {
    const {
      category,
      gender,
      brand,
      size,
      color,
      minPrice,
      maxPrice,
      search,
      sort,
      collection,
      flag,
      includeInactive,
    } = req.query;

    const conditions: string[] = [];
    const params: any[] = [];

    if (!includeInactive) {
      conditions.push("p.status = 'active'");
    }
    if (category && typeof category === 'string' && category !== 'all') {
      conditions.push('(c.slug = ? OR CAST(c.id AS TEXT) = ?)');
      params.push(category, category);
    }
    if (gender && typeof gender === 'string' && gender !== 'all') {
      conditions.push('p.gender_segment = ?');
      params.push(gender);
    }
    if (brand && typeof brand === 'string' && brand !== 'all') {
      conditions.push('p.brand = ?');
      params.push(brand);
    }
    if (collection && typeof collection === 'string' && collection !== 'all') {
      conditions.push('p.collection_tag = ?');
      params.push(collection);
    }
    if (flag === 'new') conditions.push('p.is_new_arrival = 1');
    if (flag === 'trending') conditions.push('p.is_trending = 1');
    if (flag === 'bestseller') conditions.push('p.is_best_seller = 1');
    if (flag === 'discount') conditions.push('p.discount_percent > 0');

    if (minPrice && !Number.isNaN(Number(minPrice))) {
      conditions.push('p.final_price >= ?');
      params.push(Number(minPrice));
    }
    if (maxPrice && !Number.isNaN(Number(maxPrice))) {
      conditions.push('p.final_price <= ?');
      params.push(Number(maxPrice));
    }
    if (search && typeof search === 'string' && search.trim()) {
      const q = `%${search.trim()}%`;
      conditions.push('(p.name LIKE ? OR p.description LIKE ? OR p.brand LIKE ? OR p.sku LIKE ? OR c.name LIKE ?)');
      params.push(q, q, q, q, q);
    }
    if (size && typeof size === 'string' && size !== 'all') {
      conditions.push('EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.size = ?)');
      params.push(size);
    }
    if (color && typeof color === 'string' && color !== 'all') {
      conditions.push('EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.color = ?)');
      params.push(color);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    let orderBy = 'ORDER BY p.is_featured DESC, p.id DESC';
    if (sort === 'price_asc') orderBy = 'ORDER BY p.final_price ASC';
    else if (sort === 'price_desc') orderBy = 'ORDER BY p.final_price DESC';
    else if (sort === 'discount') orderBy = 'ORDER BY p.discount_percent DESC, p.final_price ASC';
    else if (sort === 'popularity') orderBy = 'ORDER BY p.is_best_seller DESC, p.rating_avg DESC';
    else if (sort === 'latest') orderBy = 'ORDER BY p.created_at DESC, p.id DESC';

    const sql = `
      SELECT p.*, c.name AS category_name, c.slug AS category_slug
      FROM products p
      JOIN product_categories c ON c.id = p.category_id
      ${whereClause}
      ${orderBy}
    `;
    const rows = db.prepare(sql).all(...params);
    res.json(enrichProducts(rows));
  } catch (error) {
    console.error('List products error:', error);
    res.status(500).json({ error: 'Failed to load catalog.' });
  }
});

// Product detail + reviews + related
storefrontRouter.get('/products/:slug', (req, res) => {
  try {
    const prod = db
      .prepare(`
        SELECT p.*, c.name AS category_name, c.slug AS category_slug
        FROM products p
        JOIN product_categories c ON c.id = p.category_id
        WHERE p.slug = ? OR CAST(p.id AS TEXT) = ?
        LIMIT 1
      `)
      .get(req.params.slug, req.params.slug) as any;

    if (!prod) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    const [enriched] = enrichProducts([prod]);
    const reviews = db
      .prepare('SELECT * FROM reviews WHERE product_id = ? AND is_approved = 1 ORDER BY created_at DESC')
      .all(prod.id);
    const relatedRows = db
      .prepare(`
        SELECT p.*, c.name AS category_name, c.slug AS category_slug
        FROM products p
        JOIN product_categories c ON c.id = p.category_id
        WHERE p.status = 'active' AND p.id != ? AND (p.category_id = ? OR p.gender_segment = ?)
        ORDER BY p.is_best_seller DESC
        LIMIT 4
      `)
      .all(prod.id, prod.category_id, prod.gender_segment);

    res.json({
      ...enriched,
      reviews,
      related: enrichProducts(relatedRows),
    });
  } catch (error) {
    console.error('Product detail error:', error);
    res.status(500).json({ error: 'Failed to load product details.' });
  }
});

// Public approved testimonials for Home
storefrontRouter.get('/reviews/featured', (_req, res) => {
  const rows = db
    .prepare(`
      SELECT r.*, p.name AS product_name, p.slug AS product_slug
      FROM reviews r
      JOIN products p ON p.id = r.product_id
      WHERE r.is_approved = 1 AND r.rating >= 4
      ORDER BY r.created_at DESC
      LIMIT 6
    `)
    .all();
  res.json(rows);
});

// Submit product review
storefrontRouter.post('/products/:id/reviews', optionalAuth, (req: AuthRequest, res) => {
  try {
    const productId = Number(req.params.id);
    const { reviewer_name, rating, title, comment } = req.body ?? {};
    const numRating = Number(rating);
    if (!Number.isFinite(productId) || !Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
      res.status(400).json({ error: 'Rating must be between 1 and 5.' });
      return;
    }
    if (!title || !comment || typeof title !== 'string' || typeof comment !== 'string') {
      res.status(400).json({ error: 'Review title and comment are required.' });
      return;
    }
    const authorName = req.user?.full_name || (typeof reviewer_name === 'string' && reviewer_name.trim() ? reviewer_name.trim() : 'Verified Client');

    const info = db
      .prepare('INSERT INTO reviews (product_id, user_id, reviewer_name, rating, title, comment, is_approved) VALUES (?, ?, ?, ?, ?, ?, 1)')
      .run(productId, req.user?.id ?? null, authorName, numRating, title.trim(), comment.trim());

    const stats = db
      .prepare('SELECT AVG(rating) AS avg_r, COUNT(*) AS cnt FROM reviews WHERE product_id = ? AND is_approved = 1')
      .get(productId) as { avg_r: number; cnt: number };
    db.prepare('UPDATE products SET rating_avg = ?, review_count = ? WHERE id = ?').run(
      Math.round((stats.avg_r || numRating) * 10) / 10,
      stats.cnt || 1,
      productId
    );

    const created = db.prepare('SELECT * FROM reviews WHERE id = ?').get(Number(info.lastInsertRowid));
    res.status(201).json(created);
  } catch (error) {
    console.error('Submit review error:', error);
    res.status(500).json({ error: 'Unable to submit review.' });
  }
});

// Coupon validation
storefrontRouter.post('/coupons/validate', (req, res) => {
  try {
    const { code, subtotal } = req.body ?? {};
    if (!code || typeof code !== 'string') {
      res.status(400).json({ error: 'Please enter a coupon code.' });
      return;
    }
    const coupon = db
      .prepare('SELECT * FROM coupons WHERE UPPER(code) = UPPER(?) AND is_active = 1')
      .get(code.trim()) as any;
    if (!coupon) {
      res.status(404).json({ error: 'Invalid or inactive coupon code.' });
      return;
    }
    if (new Date(coupon.valid_until).getTime() < Date.now()) {
      res.status(400).json({ error: 'This coupon has expired.' });
      return;
    }
    if (coupon.used_count >= coupon.max_uses) {
      res.status(400).json({ error: 'This coupon has reached its redemption limit.' });
      return;
    }
    const sub = Number(subtotal) || 0;
    if (sub < coupon.min_order_amount) {
      res.status(400).json({
        error: `Minimum order of ₹${Number(coupon.min_order_amount).toLocaleString('en-IN')} required for ${coupon.code}.`,
      });
      return;
    }
    const discountAmount =
      coupon.discount_type === 'percent'
        ? Math.round((sub * coupon.discount_value) / 100)
        : Math.min(sub, coupon.discount_value);

    res.json({
      valid: true,
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      discount_amount: discountAmount,
    });
  } catch (error) {
    console.error('Coupon validate error:', error);
    res.status(500).json({ error: 'Unable to validate coupon.' });
  }
});

// Helper: calculate authoritative server-side totals from cart items
function calculateOrderTotals(
  items: Array<{ product_id: number; variant_id: number; quantity: number }>,
  couponCode?: string,
  shippingMethod?: string
) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Your shopping bag is empty.');
  }

  let subtotal = 0;
  const resolvedItems: Array<{
    product_id: number;
    variant_id: number;
    product_name: string;
    size: string;
    color: string;
    quantity: number;
    unit_price: number;
    unit_cost: number;
    line_total: number;
  }> = [];

  for (const item of items) {
    const qty = Math.floor(Number(item.quantity));
    if (!Number.isFinite(qty) || qty <= 0) {
      throw new Error('Invalid item quantity.');
    }
    const row = db
      .prepare(`
        SELECT p.id AS product_id, p.name AS product_name, p.final_price, p.cost_price,
               pv.id AS variant_id, pv.size, pv.color, pv.price_override,
               COALESCE(inv.stock_qty, 0) AS stock_qty
        FROM product_variants pv
        JOIN products p ON p.id = pv.product_id
        LEFT JOIN inventory inv ON inv.variant_id = pv.id
        WHERE pv.id = ? AND p.id = ? AND p.status = 'active'
      `)
      .get(Number(item.variant_id), Number(item.product_id)) as any;

    if (!row) {
      throw new Error('One or more items in your bag are no longer available.');
    }
    if (row.stock_qty < qty) {
      throw new Error(`Insufficient stock for ${row.product_name} (${row.size} / ${row.color}). Only ${row.stock_qty} left.`);
    }
    const unitPrice = row.price_override ?? row.final_price;
    const lineTotal = Math.round(unitPrice * qty);
    subtotal += lineTotal;
    resolvedItems.push({
      product_id: row.product_id,
      variant_id: row.variant_id,
      product_name: row.product_name,
      size: row.size,
      color: row.color,
      quantity: qty,
      unit_price: unitPrice,
      unit_cost: row.cost_price,
      line_total: lineTotal,
    });
  }

  let discountAmount = 0;
  let validCouponCode: string | null = null;
  if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
    const coupon = db
      .prepare('SELECT * FROM coupons WHERE UPPER(code) = UPPER(?) AND is_active = 1')
      .get(couponCode.trim()) as any;
    if (coupon && new Date(coupon.valid_until).getTime() >= Date.now() && subtotal >= coupon.min_order_amount && coupon.used_count < coupon.max_uses) {
      discountAmount =
        coupon.discount_type === 'percent'
          ? Math.round((subtotal * coupon.discount_value) / 100)
          : Math.min(subtotal, coupon.discount_value);
      validCouponCode = coupon.code;
    }
  }

  const discountedSub = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round(discountedSub * 0.12);
  const isExpress = shippingMethod === 'Express Concierge';
  const shippingCost = isExpress ? 450 : discountedSub >= 8000 ? 0 : 250;
  const totalAmount = discountedSub + taxAmount + shippingCost;

  return {
    resolvedItems,
    subtotal,
    discountAmount,
    validCouponCode,
    taxAmount,
    shippingCost,
    totalAmount,
  };
}

// Create Razorpay order (live Razorpay API when keys present, or server-signed checkout order)
storefrontRouter.post('/payments/razorpay/create-order', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { items, coupon_code, shipping_method } = req.body ?? {};
    const totals = calculateOrderTotals(items, coupon_code, shipping_method);
    const amountPaise = Math.round(totals.totalAmount * 100);
    const receipt = `mv_rcpt_${Date.now()}`;

    const keyId = process.env.RAZORPAY_KEY_ID?.trim();
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

    if (keyId && keySecret) {
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: 'INR',
          receipt,
        }),
      });
      if (!rzpRes.ok) {
        const errText = await rzpRes.text();
        console.error('Razorpay order error:', errText);
        res.status(502).json({ error: 'Unable to reach Razorpay gateway.' });
        return;
      }
      const rzpOrder = (await rzpRes.json()) as { id: string; amount: number; currency: string };
      res.json({
        mode: 'live',
        key_id: keyId,
        razorpay_order_id: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        totals,
      });
      return;
    }

    const simOrderId = `order_mv_${crypto.randomBytes(8).toString('hex')}`;
    const simPaymentId = `pay_mv_${crypto.randomBytes(8).toString('hex')}`;
    const simSignature = crypto
      .createHmac('sha256', SIM_RAZORPAY_SECRET)
      .update(`${simOrderId}|${simPaymentId}`)
      .digest('hex');

    res.json({
      mode: 'sandbox',
      key_id: 'rzp_sandbox_maison_verri',
      razorpay_order_id: simOrderId,
      sandbox_payment_id: simPaymentId,
      sandbox_signature: simSignature,
      amount: amountPaise,
      currency: 'INR',
      totals,
    });
  } catch (error: any) {
    res.status(400).json({ error: error?.message || 'Failed to initialize payment.' });
  }
});

// Verify Razorpay signature and place order atomically
storefrontRouter.post('/payments/razorpay/verify', optionalAuth, (req: AuthRequest, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      simulate_failure,
      items,
      shipping_address,
      coupon_code,
      shipping_method,
      payment_method,
      notes,
    } = req.body ?? {};

    if (!shipping_address || !shipping_address.full_name || !shipping_address.street || !shipping_address.city || !shipping_address.postal_code) {
      res.status(400).json({ error: 'Complete shipping address is required.' });
      return;
    }

    const totals = calculateOrderTotals(items, coupon_code, shipping_method);
    const secret = process.env.RAZORPAY_KEY_SECRET?.trim() || SIM_RAZORPAY_SECRET;

    if (simulate_failure) {
      res.status(402).json({
        verified: false,
        error: 'Payment declined by issuing bank / UPI gateway. Please try another payment method.',
      });
      return;
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      res.status(400).json({ verified: false, error: 'Incomplete payment verification payload.' });
      return;
    }

    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const a = Buffer.from(String(razorpay_signature));
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      res.status(400).json({ verified: false, error: 'Payment signature verification failed.' });
      return;
    }

    const createdOrder = persistOrderTransaction({
      userId: req.user?.id ?? null,
      customerEmail: req.user?.email || shipping_address.email || 'guest@maisonverri.com',
      customerName: shipping_address.full_name,
      shippingAddress: shipping_address,
      shippingMethod: shipping_method || 'Standard Atelier',
      paymentMethod: payment_method || 'UPI',
      paymentStatus: 'Paid',
      orderStatus: 'Confirmed',
      gateway: 'Razorpay',
      gatewayOrderId: razorpay_order_id,
      gatewayPaymentId: razorpay_payment_id,
      gatewaySignature: razorpay_signature,
      notes: notes || '',
      totals,
    });

    res.status(201).json({ verified: true, order: createdOrder });
  } catch (error: any) {
    console.error('Payment verify error:', error);
    res.status(400).json({ verified: false, error: error?.message || 'Payment verification failed.' });
  }
});

// Place COD Order
storefrontRouter.post('/orders', optionalAuth, (req: AuthRequest, res) => {
  try {
    const { items, shipping_address, coupon_code, shipping_method, payment_method, notes } = req.body ?? {};
    if (!shipping_address || !shipping_address.full_name || !shipping_address.street || !shipping_address.city || !shipping_address.postal_code) {
      res.status(400).json({ error: 'Complete delivery address is required.' });
      return;
    }
    const totals = calculateOrderTotals(items, coupon_code, shipping_method);
    const createdOrder = persistOrderTransaction({
      userId: req.user?.id ?? null,
      customerEmail: req.user?.email || shipping_address.email || 'guest@maisonverri.com',
      customerName: shipping_address.full_name,
      shippingAddress: shipping_address,
      shippingMethod: shipping_method || 'Standard Atelier',
      paymentMethod: payment_method === 'COD' ? 'COD' : 'COD',
      paymentStatus: 'Pending',
      orderStatus: 'Confirmed',
      gateway: 'COD',
      gatewayOrderId: null,
      gatewayPaymentId: null,
      gatewaySignature: null,
      notes: notes || '',
      totals,
    });
    res.status(201).json({ order: createdOrder });
  } catch (error: any) {
    console.error('Create COD order error:', error);
    res.status(400).json({ error: error?.message || 'Unable to place order.' });
  }
});

function persistOrderTransaction(input: {
  userId: number | null;
  customerEmail: string;
  customerName: string;
  shippingAddress: any;
  shippingMethod: string;
  paymentMethod: string;
  paymentStatus: 'Pending' | 'Paid';
  orderStatus: 'Pending' | 'Confirmed';
  gateway: 'Razorpay' | 'COD';
  gatewayOrderId: string | null;
  gatewayPaymentId: string | null;
  gatewaySignature: string | null;
  notes: string;
  totals: ReturnType<typeof calculateOrderTotals>;
}) {
  db.exec('BEGIN IMMEDIATE;');
  try {
    const orderNum = `MV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 89999)}`;
    const ordInfo = db
      .prepare(`
        INSERT INTO orders (
          order_number, user_id, customer_email, customer_name, shipping_address_json,
          coupon_code, subtotal, discount_amount, tax_amount, shipping_cost, total_amount,
          payment_method, payment_status, order_status, shipping_method, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        orderNum,
        input.userId,
        input.customerEmail,
        input.customerName,
        JSON.stringify(input.shippingAddress),
        input.totals.validCouponCode,
        input.totals.subtotal,
        input.totals.discountAmount,
        input.totals.taxAmount,
        input.totals.shippingCost,
        input.totals.totalAmount,
        input.paymentMethod,
        input.paymentStatus,
        input.orderStatus,
        input.shippingMethod,
        input.notes
      );

    const orderId = Number(ordInfo.lastInsertRowid);
    const insertItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, variant_id, product_name, size, color, quantity, unit_price, unit_cost, line_total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const deductInv = db.prepare(
      "UPDATE inventory SET stock_qty = stock_qty - ?, updated_at = datetime('now') WHERE variant_id = ? AND stock_qty >= ?"
    );

    for (const item of input.totals.resolvedItems) {
      const updated = deductInv.run(item.quantity, item.variant_id, item.quantity);
      if (updated.changes === 0) {
        throw new Error(`Stock exhausted for ${item.product_name} (${item.size}).`);
      }
      insertItem.run(
        orderId,
        item.product_id,
        item.variant_id,
        item.product_name,
        item.size,
        item.color,
        item.quantity,
        item.unit_price,
        item.unit_cost,
        item.line_total
      );
    }

    if (input.totals.validCouponCode) {
      db.prepare('UPDATE coupons SET used_count = used_count + 1 WHERE code = ?').run(input.totals.validCouponCode);
    }

    db.prepare(`
      INSERT INTO payments (order_id, gateway, gateway_order_id, gateway_payment_id, gateway_signature, method_detail, amount, status, paid_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      orderId,
      input.gateway,
      input.gatewayOrderId,
      input.gatewayPaymentId,
      input.gatewaySignature,
      input.paymentMethod,
      input.totals.totalAmount,
      input.paymentStatus,
      input.paymentStatus === 'Paid' ? new Date().toISOString() : null
    );

    const estDate = new Date(Date.now() + (input.shippingMethod === 'Express Concierge' ? 2 : 5) * 86400000)
      .toISOString()
      .slice(0, 10);
    db.prepare(`
      INSERT INTO shipments (order_id, carrier, tracking_number, status, estimated_delivery)
      VALUES (?, 'Verri Atelier Courier', ?, 'Processing', ?)
    `).run(orderId, `MV-TRK-${10000 + orderId}`, estDate);

    if (input.userId) {
      db.prepare(`
        UPDATE customers
        SET lifetime_value = lifetime_value + ?,
            total_orders = total_orders + 1,
            segment = CASE WHEN total_orders + 1 >= 3 THEN 'VIP' WHEN total_orders + 1 >= 2 THEN 'Returning' ELSE segment END
        WHERE user_id = ?
      `).run(input.totals.totalAmount, input.userId);
    }

    db.exec('COMMIT;');
    return getHydratedOrder(orderId);
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

export function getHydratedOrder(orderId: number) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
  if (!order) return null;
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
  const payment = db.prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY id DESC LIMIT 1').get(orderId);
  const shipment = db.prepare('SELECT * FROM shipments WHERE order_id = ?').get(orderId);
  const returns = db.prepare('SELECT * FROM returns WHERE order_id = ?').all(orderId);
  return {
    ...order,
    shipping_address: JSON.parse(order.shipping_address_json || '{}'),
    items,
    payment,
    shipment,
    returns,
  };
}

// Customer My Orders & Lookup by Order Number
storefrontRouter.get('/orders/my', optionalAuth, (req: AuthRequest, res) => {
  const orderNumber = typeof req.query.order_number === 'string' ? req.query.order_number.trim() : '';
  let rows: Array<{ id: number }> = [];
  if (orderNumber) {
    rows = db.prepare('SELECT id FROM orders WHERE order_number = ? ORDER BY created_at DESC').all(orderNumber) as Array<{ id: number }>;
  } else if (req.user) {
    rows = db
      .prepare('SELECT id FROM orders WHERE user_id = ? OR customer_email = ? ORDER BY created_at DESC')
      .all(req.user.id, req.user.email) as Array<{ id: number }>;
  }
  res.json(rows.map((r) => getHydratedOrder(r.id)).filter(Boolean));
});

storefrontRouter.get('/orders/:id', optionalAuth, (req: AuthRequest, res) => {
  const order = getHydratedOrder(Number(req.params.id));
  if (!order) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }
  if (order.user_id && req.user && order.user_id !== req.user.id && req.user.role !== 'admin') {
    res.status(403).json({ error: 'Access denied.' });
    return;
  }
  res.json(order);
});

storefrontRouter.post('/orders/:id/cancel', requireAuth, (req: AuthRequest, res) => {
  const orderId = Number(req.params.id);
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
  if (!order) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }
  if (order.user_id !== req.user!.id && req.user!.role !== 'admin') {
    res.status(403).json({ error: 'Access denied.' });
    return;
  }
  if (!['Pending', 'Confirmed'].includes(order.order_status)) {
    res.status(400).json({ error: 'Only pending or confirmed orders can be cancelled.' });
    return;
  }

  db.exec('BEGIN IMMEDIATE;');
  try {
    db.prepare("UPDATE orders SET order_status = 'Cancelled', payment_status = CASE WHEN payment_status = 'Paid' THEN 'Refunded' ELSE payment_status END, updated_at = datetime('now') WHERE id = ?").run(orderId);
    db.prepare("UPDATE shipments SET status = 'Cancelled', updated_at = datetime('now') WHERE order_id = ?").run(orderId);
    db.prepare("UPDATE payments SET status = CASE WHEN status = 'Paid' THEN 'Refunded' ELSE status END, refund_amount = CASE WHEN status = 'Paid' THEN amount ELSE 0 END, refund_status = CASE WHEN status = 'Paid' THEN 'Full' ELSE 'None' END WHERE order_id = ?").run(orderId);
    const items = db.prepare('SELECT variant_id, quantity FROM order_items WHERE order_id = ?').all(orderId) as Array<{ variant_id: number; quantity: number }>;
    for (const item of items) {
      if (item.variant_id) {
        db.prepare('UPDATE inventory SET stock_qty = stock_qty + ? WHERE variant_id = ?').run(item.quantity, item.variant_id);
      }
    }
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
  res.json({ order: getHydratedOrder(orderId) });
});

storefrontRouter.post('/orders/:id/return', requireAuth, (req: AuthRequest, res) => {
  const orderId = Number(req.params.id);
  const { reason } = req.body ?? {};
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
  if (!order) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }
  if (order.user_id !== req.user!.id && req.user!.role !== 'admin') {
    res.status(403).json({ error: 'Access denied.' });
    return;
  }
  if (!reason || typeof reason !== 'string' || !reason.trim()) {
    res.status(400).json({ error: 'Please specify a reason for return.' });
    return;
  }
  db.prepare('INSERT INTO returns (order_id, user_id, reason, status, refund_amount) VALUES (?, ?, ?, ?, ?)').run(
    orderId,
    req.user!.id,
    reason.trim(),
    'Requested',
    order.total_amount
  );
  res.status(201).json({ order: getHydratedOrder(orderId) });
});

// Contact Enquiry
storefrontRouter.post('/contact', (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body ?? {};
    if (!name || !email || !subject || !message) {
      res.status(400).json({ error: 'Name, email, subject, and message are required.' });
      return;
    }
    const info = db
      .prepare('INSERT INTO contact_enquiries (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)')
      .run(String(name).trim(), String(email).trim(), phone ? String(phone).trim() : '', String(subject).trim(), String(message).trim());
    res.status(201).json({ id: Number(info.lastInsertRowid), status: 'Open' });
  } catch (error) {
    console.error('Contact enquiry error:', error);
    res.status(500).json({ error: 'Failed to send message.' });
  }
});

// Newsletter
storefrontRouter.post('/newsletter', (req, res) => {
  try {
    const { email } = req.body ?? {};
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    db.prepare('INSERT OR IGNORE INTO newsletter_subscribers (email) VALUES (?)').run(email.trim().toLowerCase());
    res.status(201).json({ subscribed: true });
  } catch (error) {
    console.error('Newsletter error:', error);
    res.status(500).json({ error: 'Failed to subscribe.' });
  }
});
