import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import { db } from '../db.ts';
import { requireAdmin } from '../auth.ts';
import { getHydratedOrder } from './storefront.ts';

export const adminRouter = Router();
adminRouter.use(requireAdmin);

// Categories CRUD
adminRouter.post('/categories', (req, res) => {
  try {
    const { name, slug, description, image_url, sort_order } = req.body ?? {};
    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'Category name is required.' });
      return;
    }
    const cleanSlug = (slug || name).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
    const info = db
      .prepare('INSERT INTO product_categories (name, slug, description, image_url, sort_order) VALUES (?, ?, ?, ?, ?)')
      .run(name.trim(), cleanSlug, description || '', image_url || '', Number(sort_order) || 10);
    const row = db.prepare('SELECT * FROM product_categories WHERE id = ?').get(Number(info.lastInsertRowid));
    res.status(201).json(row);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Unable to create category.' });
  }
});

adminRouter.delete('/categories/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM product_categories WHERE id = ?').run(Number(req.params.id));
    res.json({ deleted: true });
  } catch {
    res.status(400).json({ error: 'Cannot delete a category that still has products assigned.' });
  }
});

// Products CRUD + Variants & Inventory
adminRouter.post('/products', (req, res) => {
  try {
    const {
      category_id,
      sku,
      name,
      brand,
      description,
      base_price,
      discount_percent,
      cost_price,
      collection_tag,
      gender_segment,
      is_new_arrival,
      is_trending,
      is_best_seller,
      is_featured,
      status,
      images,
      variants,
    } = req.body ?? {};

    if (!category_id || !sku || !name || !base_price || !gender_segment) {
      res.status(400).json({ error: 'Category, SKU, Name, Base Price, and Segment are required.' });
      return;
    }

    const base = Number(base_price);
    const disc = Number(discount_percent) || 0;
    const cost = Number(cost_price) || Math.round(base * 0.42);
    const finalPrice = Math.round(base * (1 - disc / 100));
    const slug = `${String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-4)}`;

    db.exec('BEGIN IMMEDIATE;');
    try {
      const info = db
        .prepare(`
          INSERT INTO products (
            category_id, sku, name, slug, brand, description, base_price, discount_percent,
            final_price, cost_price, collection_tag, gender_segment, is_new_arrival,
            is_trending, is_best_seller, is_featured, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          Number(category_id),
          String(sku).trim(),
          String(name).trim(),
          slug,
          brand ? String(brand).trim() : 'MAISON VERRI',
          description ? String(description).trim() : '',
          base,
          disc,
          finalPrice,
          cost,
          collection_tag || 'Atelier Core',
          gender_segment,
          is_new_arrival ? 1 : 0,
          is_trending ? 1 : 0,
          is_best_seller ? 1 : 0,
          is_featured ? 1 : 0,
          status || 'active'
        );

      const productId = Number(info.lastInsertRowid);
      const imgList: string[] = Array.isArray(images) && images.length > 0
        ? images
        : ['/src/assets/images/collection_womens_tailoring_1795602786165.jpg'];
      const insertImg = db.prepare('INSERT INTO product_images (product_id, image_url, alt_text, is_primary, sort_order) VALUES (?, ?, ?, ?, ?)');
      imgList.forEach((url, idx) => {
        insertImg.run(productId, String(url), String(name), idx === 0 ? 1 : 0, idx);
      });

      const varList = Array.isArray(variants) && variants.length > 0
        ? variants
        : [{ size: 'M', color: 'Obsidian Black', color_hex: '#141414', stock_qty: 10, reorder_level: 5 }];
      const insertVar = db.prepare('INSERT INTO product_variants (product_id, size, color, color_hex, variant_sku) VALUES (?, ?, ?, ?, ?)');
      const insertInv = db.prepare('INSERT INTO inventory (variant_id, stock_qty, reorder_level, warehouse_location) VALUES (?, ?, ?, ?)');

      varList.forEach((v: any, idx: number) => {
        const vSku = `${String(sku).trim()}-${String(v.size || 'M').replace(/\s+/g, '')}-${idx + 1}`;
        const varId = Number(insertVar.run(productId, v.size || 'M', v.color || 'Obsidian Black', v.color_hex || '#141414', vSku).lastInsertRowid);
        insertInv.run(varId, Number(v.stock_qty) || 0, Number(v.reorder_level) || 5, 'Mumbai Flagship Vault');
      });

      db.exec('COMMIT;');
      const created = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
      res.status(201).json(created);
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Failed to create product.' });
  }
});

adminRouter.put('/products/:id', (req, res) => {
  try {
    const productId = Number(req.params.id);
    const {
      category_id,
      name,
      brand,
      description,
      base_price,
      discount_percent,
      cost_price,
      collection_tag,
      gender_segment,
      is_new_arrival,
      is_trending,
      is_best_seller,
      is_featured,
      status,
      images,
    } = req.body ?? {};

    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(productId) as any;
    if (!existing) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    const base = base_price !== undefined ? Number(base_price) : existing.base_price;
    const disc = discount_percent !== undefined ? Number(discount_percent) : existing.discount_percent;
    const cost = cost_price !== undefined ? Number(cost_price) : existing.cost_price;
    const finalPrice = Math.round(base * (1 - disc / 100));

    db.prepare(`
      UPDATE products SET
        category_id = ?, name = ?, brand = ?, description = ?, base_price = ?, discount_percent = ?,
        final_price = ?, cost_price = ?, collection_tag = ?, gender_segment = ?,
        is_new_arrival = ?, is_trending = ?, is_best_seller = ?, is_featured = ?, status = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      category_id !== undefined ? Number(category_id) : existing.category_id,
      name ?? existing.name,
      brand ?? existing.brand,
      description ?? existing.description,
      base,
      disc,
      finalPrice,
      cost,
      collection_tag ?? existing.collection_tag,
      gender_segment ?? existing.gender_segment,
      is_new_arrival !== undefined ? (is_new_arrival ? 1 : 0) : existing.is_new_arrival,
      is_trending !== undefined ? (is_trending ? 1 : 0) : existing.is_trending,
      is_best_seller !== undefined ? (is_best_seller ? 1 : 0) : existing.is_best_seller,
      is_featured !== undefined ? (is_featured ? 1 : 0) : existing.is_featured,
      status ?? existing.status,
      productId
    );

    if (Array.isArray(images) && images.length > 0) {
      db.prepare('DELETE FROM product_images WHERE product_id = ?').run(productId);
      const insertImg = db.prepare('INSERT INTO product_images (product_id, image_url, alt_text, is_primary, sort_order) VALUES (?, ?, ?, ?, ?)');
      images.forEach((url: string, idx: number) => {
        insertImg.run(productId, String(url), name ?? existing.name, idx === 0 ? 1 : 0, idx);
      });
    }

    res.json(db.prepare('SELECT * FROM products WHERE id = ?').get(productId));
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Failed to update product.' });
  }
});

adminRouter.delete('/products/:id', (req, res) => {
  try {
    const productId = Number(req.params.id);
    const hasOrders = db.prepare('SELECT 1 FROM order_items WHERE product_id = ? LIMIT 1').get(productId);
    if (hasOrders) {
      db.prepare("UPDATE products SET status = 'archived', updated_at = datetime('now') WHERE id = ?").run(productId);
      res.json({ archived: true });
      return;
    }
    db.prepare('DELETE FROM products WHERE id = ?').run(productId);
    res.json({ deleted: true });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Failed to delete product.' });
  }
});

// Inventory stock update per variant
adminRouter.patch('/inventory/:variantId', (req, res) => {
  const variantId = Number(req.params.variantId);
  const stockQty = Math.max(0, Math.floor(Number(req.body?.stock_qty)));
  const reorderLevel = req.body?.reorder_level !== undefined ? Math.max(0, Math.floor(Number(req.body.reorder_level))) : undefined;

  if (!Number.isFinite(stockQty)) {
    res.status(400).json({ error: 'Invalid stock quantity.' });
    return;
  }
  if (reorderLevel !== undefined) {
    db.prepare("UPDATE inventory SET stock_qty = ?, reorder_level = ?, updated_at = datetime('now') WHERE variant_id = ?").run(
      stockQty,
      reorderLevel,
      variantId
    );
  } else {
    db.prepare("UPDATE inventory SET stock_qty = ?, updated_at = datetime('now') WHERE variant_id = ?").run(stockQty, variantId);
  }
  res.json(db.prepare('SELECT * FROM inventory WHERE variant_id = ?').get(variantId));
});

// Orders Management
adminRouter.get('/orders', (_req, res) => {
  const rows = db.prepare('SELECT id FROM orders ORDER BY created_at DESC, id DESC').all() as Array<{ id: number }>;
  res.json(rows.map((r) => getHydratedOrder(r.id)).filter(Boolean));
});

adminRouter.patch('/orders/:id/status', (req, res) => {
  const orderId = Number(req.params.id);
  const { order_status, payment_status, tracking_number, shipment_status } = req.body ?? {};
  const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
  if (!existing) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }

  if (order_status) {
    db.prepare("UPDATE orders SET order_status = ?, updated_at = datetime('now') WHERE id = ?").run(order_status, orderId);
    if (order_status === 'Delivered') {
      db.prepare("UPDATE shipments SET status = 'Delivered', delivered_at = datetime('now'), updated_at = datetime('now') WHERE order_id = ?").run(orderId);
      if (existing.payment_method === 'COD' && !payment_status) {
        db.prepare("UPDATE orders SET payment_status = 'Paid' WHERE id = ?").run(orderId);
        db.prepare("UPDATE payments SET status = 'Paid', paid_at = datetime('now') WHERE order_id = ?").run(orderId);
      }
    } else if (order_status === 'Shipped') {
      db.prepare("UPDATE shipments SET status = 'In Transit', shipped_at = COALESCE(shipped_at, datetime('now')), updated_at = datetime('now') WHERE order_id = ?").run(orderId);
    }
  }

  if (payment_status) {
    db.prepare("UPDATE orders SET payment_status = ?, updated_at = datetime('now') WHERE id = ?").run(payment_status, orderId);
    db.prepare('UPDATE payments SET status = ? WHERE order_id = ?').run(payment_status, orderId);
  }

  if (tracking_number || shipment_status) {
    const ship = db.prepare('SELECT * FROM shipments WHERE order_id = ?').get(orderId) as any;
    if (ship) {
      db.prepare("UPDATE shipments SET tracking_number = ?, status = ?, updated_at = datetime('now') WHERE order_id = ?").run(
        tracking_number || ship.tracking_number,
        shipment_status || ship.status,
        orderId
      );
    }
  }

  res.json({ order: getHydratedOrder(orderId) });
});

adminRouter.post('/payments/:orderId/refund', (req, res) => {
  const orderId = Number(req.params.orderId);
  const payment = db.prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY id DESC LIMIT 1').get(orderId) as any;
  if (!payment) {
    res.status(404).json({ error: 'Payment record not found.' });
    return;
  }
  const amount = req.body?.amount ? Math.min(payment.amount, Number(req.body.amount)) : payment.amount;
  const refundStatus = amount >= payment.amount ? 'Full' : 'Partial';
  db.prepare("UPDATE payments SET status = 'Refunded', refund_amount = ?, refund_status = ? WHERE id = ?").run(
    amount,
    refundStatus,
    payment.id
  );
  db.prepare("UPDATE orders SET payment_status = 'Refunded', order_status = 'Returned', updated_at = datetime('now') WHERE id = ?").run(orderId);
  res.json({ order: getHydratedOrder(orderId) });
});

// Returns Management
adminRouter.get('/returns', (_req, res) => {
  const rows = db.prepare(`
    SELECT r.*, o.order_number, o.customer_name, o.customer_email
    FROM returns r
    JOIN orders o ON o.id = r.order_id
    ORDER BY r.requested_at DESC
  `).all();
  res.json(rows);
});

adminRouter.patch('/returns/:id', (req, res) => {
  const returnId = Number(req.params.id);
  const { status } = req.body ?? {};
  const ret = db.prepare('SELECT * FROM returns WHERE id = ?').get(returnId) as any;
  if (!ret) {
    res.status(404).json({ error: 'Return request not found.' });
    return;
  }
  db.prepare("UPDATE returns SET status = ?, resolved_at = datetime('now') WHERE id = ?").run(status, returnId);
  if (status === 'Refunded') {
    db.prepare("UPDATE orders SET order_status = 'Returned', payment_status = 'Refunded', updated_at = datetime('now') WHERE id = ?").run(ret.order_id);
    db.prepare("UPDATE payments SET status = 'Refunded', refund_amount = amount, refund_status = 'Full' WHERE order_id = ?").run(ret.order_id);
  }
  res.json(db.prepare('SELECT * FROM returns WHERE id = ?').get(returnId));
});

// Customers CRM
adminRouter.get('/customers', (_req, res) => {
  const rows = db.prepare(`
    SELECT u.id, u.email, u.full_name, u.phone, u.created_at,
           COALESCE(c.segment, 'Standard') AS segment,
           COUNT(o.id) AS total_orders,
           COALESCE(SUM(CASE WHEN o.order_status NOT IN ('Cancelled', 'Returned') THEN o.total_amount ELSE 0 END), 0) AS lifetime_value
    FROM users u
    LEFT JOIN customers c ON c.user_id = u.id
    LEFT JOIN orders o ON o.user_id = u.id
    WHERE u.role = 'customer'
    GROUP BY u.id
    ORDER BY lifetime_value DESC
  `).all();
  res.json(rows);
});

// Coupons CRUD
adminRouter.get('/coupons', (_req, res) => {
  res.json(db.prepare('SELECT * FROM coupons ORDER BY id DESC').all());
});

adminRouter.post('/coupons', (req, res) => {
  try {
    const { code, discount_type, discount_value, min_order_amount, max_uses, valid_until } = req.body ?? {};
    if (!code || !discount_type || !discount_value) {
      res.status(400).json({ error: 'Code, type, and discount value are required.' });
      return;
    }
    const info = db
      .prepare('INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, max_uses, valid_until) VALUES (?, ?, ?, ?, ?, ?)')
      .run(
        String(code).trim().toUpperCase(),
        discount_type === 'fixed' ? 'fixed' : 'percent',
        Number(discount_value),
        Number(min_order_amount) || 0,
        Number(max_uses) || 500,
        valid_until || '2027-12-31T23:59:59Z'
      );
    res.status(201).json(db.prepare('SELECT * FROM coupons WHERE id = ?').get(Number(info.lastInsertRowid)));
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Unable to create coupon.' });
  }
});

adminRouter.patch('/coupons/:id/toggle', (req, res) => {
  const id = Number(req.params.id);
  db.prepare('UPDATE coupons SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?').run(id);
  res.json(db.prepare('SELECT * FROM coupons WHERE id = ?').get(id));
});

adminRouter.delete('/coupons/:id', (req, res) => {
  db.prepare('DELETE FROM coupons WHERE id = ?').run(Number(req.params.id));
  res.json({ deleted: true });
});

// Reviews Moderation
adminRouter.get('/reviews', (_req, res) => {
  res.json(
    db.prepare(`
      SELECT r.*, p.name AS product_name
      FROM reviews r
      JOIN products p ON p.id = r.product_id
      ORDER BY r.created_at DESC
    `).all()
  );
});

adminRouter.patch('/reviews/:id', (req, res) => {
  const id = Number(req.params.id);
  const approved = req.body?.is_approved ? 1 : 0;
  db.prepare('UPDATE reviews SET is_approved = ? WHERE id = ?').run(approved, id);
  res.json(db.prepare('SELECT * FROM reviews WHERE id = ?').get(id));
});

// Contact Enquiries
adminRouter.get('/enquiries', (_req, res) => {
  res.json(db.prepare('SELECT * FROM contact_enquiries ORDER BY created_at DESC').all());
});

adminRouter.patch('/enquiries/:id', (req, res) => {
  const id = Number(req.params.id);
  db.prepare('UPDATE contact_enquiries SET status = ? WHERE id = ?').run(req.body?.status || 'Resolved', id);
  res.json(db.prepare('SELECT * FROM contact_enquiries WHERE id = ?').get(id));
});

// Website Settings (Banners, Promo Bar, OpEx)
adminRouter.put('/settings', (req, res) => {
  const { key, value } = req.body ?? {};
  if (!key || typeof key !== 'string') {
    res.status(400).json({ error: 'Setting key is required.' });
    return;
  }
  db.prepare(`
    INSERT INTO website_settings (key, value_json, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = datetime('now')
  `).run(key, JSON.stringify(value));
  res.json({ updated: true, key, value });
});

// ============================================================================
// POWER BI INTEGRATED ANALYTICS ENGINE (All 7 Dashboards + Interactive Filters)
// ============================================================================
adminRouter.get('/bi/analytics', (req, res) => {
  try {
    const { startDate, endDate, categoryId, productId, customerEmail, paymentMethod, orderStatus } = req.query;

    const ordConds: string[] = ['1=1'];
    const ordParams: any[] = [];

    if (startDate && typeof startDate === 'string') {
      ordConds.push('date(o.created_at) >= date(?)');
      ordParams.push(startDate);
    }
    if (endDate && typeof endDate === 'string') {
      ordConds.push('date(o.created_at) <= date(?)');
      ordParams.push(endDate);
    }
    if (customerEmail && typeof customerEmail === 'string' && customerEmail !== 'all') {
      ordConds.push('o.customer_email = ?');
      ordParams.push(customerEmail);
    }
    if (paymentMethod && typeof paymentMethod === 'string' && paymentMethod !== 'all') {
      ordConds.push('o.payment_method = ?');
      ordParams.push(paymentMethod);
    }
    if (orderStatus && typeof orderStatus === 'string' && orderStatus !== 'all') {
      ordConds.push('o.order_status = ?');
      ordParams.push(orderStatus);
    }
    if (categoryId && typeof categoryId === 'string' && categoryId !== 'all') {
      ordConds.push('EXISTS (SELECT 1 FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = o.id AND p.category_id = ?)');
      ordParams.push(Number(categoryId));
    }
    if (productId && typeof productId === 'string' && productId !== 'all') {
      ordConds.push('EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.product_id = ?)');
      ordParams.push(Number(productId));
    }

    const ordWhere = ordConds.join(' AND ');

    const itemConds = [...ordConds];
    const itemParams = [...ordParams];
    if (categoryId && typeof categoryId === 'string' && categoryId !== 'all') {
      itemConds.push('p.category_id = ?');
      itemParams.push(Number(categoryId));
    }
    if (productId && typeof productId === 'string' && productId !== 'all') {
      itemConds.push('oi.product_id = ?');
      itemParams.push(Number(productId));
    }
    const itemWhere = itemConds.join(' AND ');

    // A. Sales Dashboard
    const salesAgg = db.prepare(`
      SELECT
        COUNT(DISTINCT o.id) AS total_orders,
        COALESCE(SUM(CASE WHEN o.order_status NOT IN ('Cancelled', 'Returned') THEN o.total_amount ELSE 0 END), 0) AS total_revenue,
        COALESCE(SUM(o.total_amount), 0) AS gross_order_value
      FROM orders o
      WHERE ${ordWhere}
    `).get(...ordParams) as { total_orders: number; total_revenue: number; gross_order_value: number };

    const unitsAgg = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN o.order_status NOT IN ('Cancelled', 'Returned') THEN oi.quantity ELSE 0 END), 0) AS units_sold,
        COALESCE(SUM(CASE WHEN o.order_status NOT IN ('Cancelled', 'Returned') THEN oi.quantity * oi.unit_cost ELSE 0 END), 0) AS total_cogs
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      WHERE ${itemWhere}
    `).get(...itemParams) as { units_sold: number; total_cogs: number };

    const activeOrdersCount = db.prepare(`
      SELECT COUNT(DISTINCT o.id) AS cnt FROM orders o WHERE ${ordWhere} AND o.order_status NOT IN ('Cancelled', 'Returned')
    `).get(...ordParams) as { cnt: number };

    const aov = activeOrdersCount.cnt > 0 ? Math.round(salesAgg.total_revenue / activeOrdersCount.cnt) : 0;

    const monthlyTrend = db.prepare(`
      SELECT strftime('%Y-%m', o.created_at) AS month,
             COUNT(DISTINCT o.id) AS orders,
             COALESCE(SUM(CASE WHEN o.order_status NOT IN ('Cancelled', 'Returned') THEN o.total_amount ELSE 0 END), 0) AS revenue
      FROM orders o
      WHERE ${ordWhere}
      GROUP BY strftime('%Y-%m', o.created_at)
      ORDER BY month ASC
    `).all(...ordParams) as Array<{ month: string; orders: number; revenue: number }>;

    let salesGrowthPct = 0;
    if (monthlyTrend.length >= 2) {
      const prev = monthlyTrend[monthlyTrend.length - 2].revenue;
      const curr = monthlyTrend[monthlyTrend.length - 1].revenue;
      salesGrowthPct = prev > 0 ? Math.round(((curr - prev) / prev) * 1000) / 10 : 0;
    }

    const dailyTrend = db.prepare(`
      SELECT date(o.created_at) AS day,
             COUNT(DISTINCT o.id) AS orders,
             COALESCE(SUM(CASE WHEN o.order_status NOT IN ('Cancelled', 'Returned') THEN o.total_amount ELSE 0 END), 0) AS revenue
      FROM orders o
      WHERE ${ordWhere}
      GROUP BY date(o.created_at)
      ORDER BY day ASC
      LIMIT 30
    `).all(...ordParams);

    // B. Product Performance Dashboard
    const productPerf = db.prepare(`
      SELECT p.id, p.sku, p.name, c.name AS category_name, p.final_price, p.cost_price,
             COALESCE(SUM(CASE WHEN o.order_status NOT IN ('Cancelled', 'Returned') THEN oi.quantity ELSE 0 END), 0) AS units_sold,
             COALESCE(SUM(CASE WHEN o.order_status NOT IN ('Cancelled', 'Returned') THEN oi.line_total ELSE 0 END), 0) AS revenue,
             COALESCE(SUM(CASE WHEN o.order_status NOT IN ('Cancelled', 'Returned') THEN (oi.line_total - oi.quantity * oi.unit_cost) ELSE 0 END), 0) AS gross_profit
      FROM products p
      JOIN product_categories c ON c.id = p.category_id
      LEFT JOIN order_items oi ON oi.product_id = p.id
      LEFT JOIN orders o ON o.id = oi.order_id AND ${ordWhere}
      WHERE p.status = 'active'
      GROUP BY p.id
      ORDER BY revenue DESC
    `).all(...ordParams) as any[];

    const categoryWiseSales = db.prepare(`
      SELECT c.name AS category,
             COALESCE(SUM(CASE WHEN o.order_status NOT IN ('Cancelled', 'Returned') THEN oi.quantity ELSE 0 END), 0) AS units,
             COALESCE(SUM(CASE WHEN o.order_status NOT IN ('Cancelled', 'Returned') THEN oi.line_total ELSE 0 END), 0) AS revenue
      FROM product_categories c
      LEFT JOIN products p ON p.category_id = c.id
      LEFT JOIN order_items oi ON oi.product_id = p.id
      LEFT JOIN orders o ON o.id = oi.order_id AND ${ordWhere}
      GROUP BY c.id
      ORDER BY revenue DESC
    `).all(...ordParams);

    const sizeWiseSales = db.prepare(`
      SELECT oi.size, SUM(oi.quantity) AS units, SUM(oi.line_total) AS revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      WHERE ${itemWhere} AND o.order_status NOT IN ('Cancelled', 'Returned')
      GROUP BY oi.size
      ORDER BY units DESC
    `).all(...itemParams);

    const colorWiseSales = db.prepare(`
      SELECT oi.color, SUM(oi.quantity) AS units, SUM(oi.line_total) AS revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      WHERE ${itemWhere} AND o.order_status NOT IN ('Cancelled', 'Returned')
      GROUP BY oi.color
      ORDER BY units DESC
    `).all(...itemParams);

    // C. Inventory Dashboard
    const inventoryRows = db.prepare(`
      SELECT pv.id AS variant_id, p.id AS product_id, p.sku, p.name, c.name AS category_name,
             pv.size, pv.color, inv.stock_qty, inv.reorder_level, inv.warehouse_location,
             p.cost_price, p.final_price,
             (inv.stock_qty * p.cost_price) AS cost_valuation,
             (inv.stock_qty * p.final_price) AS retail_valuation
      FROM inventory inv
      JOIN product_variants pv ON pv.id = inv.variant_id
      JOIN products p ON p.id = pv.product_id
      JOIN product_categories c ON c.id = p.category_id
      WHERE p.status = 'active'
      ORDER BY inv.stock_qty ASC
    `).all() as any[];

    const totalAvailableStock = inventoryRows.reduce((s, r) => s + r.stock_qty, 0);
    const lowStockItems = inventoryRows.filter((r) => r.stock_qty > 0 && r.stock_qty <= r.reorder_level);
    const outOfStockItems = inventoryRows.filter((r) => r.stock_qty === 0);
    const inventoryCostValuation = inventoryRows.reduce((s, r) => s + r.cost_valuation, 0);
    const inventoryRetailValuation = inventoryRows.reduce((s, r) => s + r.retail_valuation, 0);

    // D. Customer Dashboard
    const customerRows = db.prepare(`
      SELECT o.customer_email, o.customer_name,
             COUNT(DISTINCT o.id) AS orders_count,
             COALESCE(SUM(CASE WHEN o.order_status NOT IN ('Cancelled', 'Returned') THEN o.total_amount ELSE 0 END), 0) AS revenue,
             MIN(o.created_at) AS first_order,
             MAX(o.created_at) AS last_order
      FROM orders o
      WHERE ${ordWhere}
      GROUP BY o.customer_email
      ORDER BY revenue DESC
    `).all(...ordParams) as any[];

    const totalCustomersCount = customerRows.length;
    const returningCustomersCount = customerRows.filter((c) => c.orders_count > 1).length;
    const newCustomersCount = totalCustomersCount - returningCustomersCount;
    const avgLtv = totalCustomersCount > 0 ? Math.round(customerRows.reduce((s, c) => s + c.revenue, 0) / totalCustomersCount) : 0;
    const purchaseFrequency = totalCustomersCount > 0 ? Math.round((salesAgg.total_orders / totalCustomersCount) * 100) / 100 : 0;

    // E. Payment Dashboard
    const paymentSummary = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN o.payment_status = 'Paid' THEN o.total_amount ELSE 0 END), 0) AS total_paid,
        COALESCE(SUM(CASE WHEN o.payment_status = 'Pending' THEN o.total_amount ELSE 0 END), 0) AS pending_payments,
        COALESCE(SUM(CASE WHEN o.payment_status = 'Failed' THEN o.total_amount ELSE 0 END), 0) AS failed_payments,
        COUNT(CASE WHEN o.payment_method = 'COD' THEN 1 END) AS cod_orders,
        COALESCE(SUM(CASE WHEN o.payment_method != 'COD' AND o.order_status NOT IN ('Cancelled', 'Returned') THEN o.total_amount ELSE 0 END), 0) AS online_sales,
        COALESCE(SUM(CASE WHEN o.payment_method = 'COD' AND o.order_status NOT IN ('Cancelled', 'Returned') THEN o.total_amount ELSE 0 END), 0) AS cod_sales,
        COALESCE(SUM(COALESCE(pay.refund_amount, 0)), 0) AS refund_amount
      FROM orders o
      LEFT JOIN payments pay ON pay.order_id = o.id
      WHERE ${ordWhere}
    `).get(...ordParams) as any;

    const methodBreakdown = db.prepare(`
      SELECT o.payment_method AS method, COUNT(*) AS orders, COALESCE(SUM(o.total_amount), 0) AS amount
      FROM orders o
      WHERE ${ordWhere}
      GROUP BY o.payment_method
      ORDER BY amount DESC
    `).all(...ordParams);

    // F. Order Dashboard
    const orderStatusRows = db.prepare(`
      SELECT o.order_status AS status, COUNT(*) AS count, COALESCE(SUM(o.total_amount), 0) AS amount
      FROM orders o
      WHERE ${ordWhere}
      GROUP BY o.order_status
    `).all(...ordParams) as Array<{ status: string; count: number; amount: number }>;

    const statusMap: Record<string, number> = {
      Pending: 0,
      Confirmed: 0,
      Shipped: 0,
      Delivered: 0,
      Cancelled: 0,
      Returned: 0,
    };
    orderStatusRows.forEach((r) => {
      statusMap[r.status] = r.count;
    });
    const fulfilmentRate = salesAgg.total_orders > 0 ? Math.round((statusMap.Delivered / salesAgg.total_orders) * 1000) / 10 : 0;

    // G. Profit & Loss Dashboard
    const opExSetting = db.prepare("SELECT value_json FROM website_settings WHERE key = 'operating_expenses_monthly'").get() as { value_json: string } | undefined;
    const monthlyOpEx = opExSetting ? JSON.parse(opExSetting.value_json).amount || 185000 : 185000;
    const monthsCount = Math.max(1, monthlyTrend.length);
    const totalOpEx = monthlyOpEx * monthsCount;
    const grossProfit = Math.round(salesAgg.total_revenue - unitsAgg.total_cogs);
    const netProfit = Math.round(grossProfit - totalOpEx);
    const profitMarginPct = salesAgg.total_revenue > 0 ? Math.round((netProfit / salesAgg.total_revenue) * 1000) / 10 : 0;

    const monthlyPnl = db.prepare(`
      SELECT strftime('%Y-%m', o.created_at) AS month,
             COALESCE(SUM(CASE WHEN o.order_status NOT IN ('Cancelled', 'Returned') THEN oi.line_total ELSE 0 END), 0) AS revenue,
             COALESCE(SUM(CASE WHEN o.order_status NOT IN ('Cancelled', 'Returned') THEN oi.quantity * oi.unit_cost ELSE 0 END), 0) AS cogs
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      WHERE ${ordWhere}
      GROUP BY strftime('%Y-%m', o.created_at)
      ORDER BY month ASC
    `).all(...ordParams).map((m: any) => ({
      month: m.month,
      revenue: Math.round(m.revenue),
      cogs: Math.round(m.cogs),
      gross_profit: Math.round(m.revenue - m.cogs),
      operating_expenses: monthlyOpEx,
      net_profit: Math.round(m.revenue - m.cogs - monthlyOpEx),
    }));

    res.json({
      sales: {
        totalSales: salesAgg.gross_order_value,
        totalOrders: salesAgg.total_orders,
        totalRevenue: salesAgg.total_revenue,
        averageOrderValue: aov,
        totalUnitsSold: unitsAgg.units_sold,
        salesGrowthPct,
        monthlyTrend,
        dailyTrend,
      },
      productPerformance: {
        top10Products: productPerf.slice(0, 10),
        lowestProducts: [...productPerf].reverse().slice(0, 5),
        categoryWiseSales,
        sizeWiseSales,
        colorWiseSales,
        fastMoving: productPerf.filter((p) => p.units_sold >= 2),
        slowMoving: productPerf.filter((p) => p.units_sold < 2),
      },
      inventory: {
        totalAvailableStock,
        lowStockCount: lowStockItems.length,
        outOfStockCount: outOfStockItems.length,
        inventoryCostValuation,
        inventoryRetailValuation,
        reorderAlerts: [...outOfStockItems, ...lowStockItems].slice(0, 15),
        allVariants: inventoryRows,
      },
      customers: {
        totalCustomers: totalCustomersCount,
        newCustomers: newCustomersCount,
        returningCustomers: returningCustomersCount,
        purchaseFrequency,
        averageLtv: avgLtv,
        topCustomers: customerRows.slice(0, 10),
      },
      payments: {
        ...paymentSummary,
        methodBreakdown,
      },
      orders: {
        totalOrders: salesAgg.total_orders,
        ...statusMap,
        fulfilmentRate,
        statusBreakdown: orderStatusRows,
      },
      pnl: {
        totalRevenue: salesAgg.total_revenue,
        cogs: Math.round(unitsAgg.total_cogs),
        grossProfit,
        operatingExpenses: totalOpEx,
        monthlyOperatingExpenses: monthlyOpEx,
        netProfit,
        profitMarginPct,
        monthlyPnl,
      },
      filterOptions: {
        categories: db.prepare('SELECT id, name FROM product_categories ORDER BY name ASC').all(),
        products: db.prepare('SELECT id, name FROM products ORDER BY name ASC').all(),
        customers: db.prepare('SELECT DISTINCT customer_email AS email, customer_name AS name FROM orders ORDER BY customer_name ASC').all(),
      },
    });
  } catch (error) {
    console.error('BI analytics error:', error);
    res.status(500).json({ error: 'Failed to compute analytics.' });
  }
});

// CSV / Excel-compatible Report Export
adminRouter.get('/bi/export', (req, res) => {
  const reportType = String(req.query.type || 'sales');
  let rows: any[] = [];

  if (reportType === 'inventory') {
    rows = db.prepare(`
      SELECT p.sku, p.name, c.name AS category, pv.size, pv.color, inv.stock_qty, inv.reorder_level, p.cost_price, p.final_price
      FROM inventory inv
      JOIN product_variants pv ON pv.id = inv.variant_id
      JOIN products p ON p.id = pv.product_id
      JOIN product_categories c ON c.id = p.category_id
    `).all();
  } else if (reportType === 'customers') {
    rows = db.prepare(`
      SELECT o.customer_name, o.customer_email, COUNT(*) AS orders, SUM(o.total_amount) AS total_spent
      FROM orders o
      GROUP BY o.customer_email
    `).all();
  } else if (reportType === 'products') {
    rows = db.prepare(`
      SELECT p.sku, p.name, c.name AS category, p.base_price, p.discount_percent, p.final_price, p.cost_price,
             COALESCE(SUM(oi.quantity), 0) AS units_sold, COALESCE(SUM(oi.line_total), 0) AS revenue
      FROM products p
      JOIN product_categories c ON c.id = p.category_id
      LEFT JOIN order_items oi ON oi.product_id = p.id
      GROUP BY p.id
    `).all();
  } else {
    rows = db.prepare(`
      SELECT order_number, customer_name, customer_email, subtotal, discount_amount, tax_amount, shipping_cost, total_amount, payment_method, payment_status, order_status, created_at
      FROM orders
      ORDER BY created_at DESC
    `).all();
  }

  const headers = rows.length > 0 ? Object.keys(rows[0]) : ['no_data'];
  const escapeCsv = (val: any) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csvLines = [headers.join(','), ...rows.map((r) => headers.map((h) => escapeCsv(r[h])).join(','))];
  const csvBody = '\uFEFF' + csvLines.join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="maison-verri-${reportType}-report.csv"`);
  res.send(csvBody);
});

// Read SQL & Power BI documentation deliverables safely from project directories
adminRouter.get('/deliverables', (_req, res) => {
  const safeRead = (relPath: string) => {
    const full = path.resolve(process.cwd(), relPath);
    return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
  };
  res.json({
    schemaSql: safeRead('supabase/schema.sql'),
    rlsSql: safeRead('supabase/rls.sql'),
    powerBiViewsSql: safeRead('supabase/powerbi_views.sql'),
    powerBiGuideMd: safeRead('docs/POWER_BI_INTEGRATION.md'),
    deploymentMd: safeRead('docs/DEPLOYMENT.md'),
  });
});
