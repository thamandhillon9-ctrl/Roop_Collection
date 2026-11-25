-- ============================================================================
-- MAISON VERRI — Power BI Star Schema Views & Date Dimension
-- Connect Power BI to Supabase PostgreSQL via these curated BI views.
-- ============================================================================

-- 1. Date Dimension View (5-year rolling calendar)
CREATE OR REPLACE VIEW public.vw_bi_dim_date AS
SELECT
  d::date AS date_key,
  EXTRACT(YEAR FROM d)::int AS year_num,
  EXTRACT(QUARTER FROM d)::int AS quarter_num,
  'Q' || EXTRACT(QUARTER FROM d)::int AS quarter_label,
  EXTRACT(MONTH FROM d)::int AS month_num,
  TO_CHAR(d, 'Mon YYYY') AS month_year,
  TO_CHAR(d, 'YYYY-MM') AS year_month_sort,
  EXTRACT(WEEK FROM d)::int AS week_num,
  EXTRACT(DOW FROM d)::int AS day_of_week,
  TO_CHAR(d, 'Dy') AS day_name
FROM generate_series('2024-01-01'::date, '2028-12-31'::date, '1 day'::interval) AS d;

-- 2. Product Dimension View
CREATE OR REPLACE VIEW public.vw_bi_dim_products AS
SELECT
  p.id AS product_id,
  p.sku,
  p.name AS product_name,
  p.brand,
  p.gender_segment,
  p.collection_tag,
  c.name AS category_name,
  p.base_price,
  p.discount_percent,
  p.final_price,
  p.cost_price,
  (p.final_price - p.cost_price) AS unit_gross_margin,
  p.status
FROM public.products p
JOIN public.product_categories c ON c.id = p.category_id;

-- 3. Customer Dimension View
CREATE OR REPLACE VIEW public.vw_bi_dim_customers AS
SELECT
  u.id AS user_id,
  u.full_name AS customer_name,
  u.email,
  COALESCE(cu.segment, 'Standard') AS customer_segment,
  u.created_at::date AS signup_date,
  COUNT(o.id) AS lifetime_orders,
  COALESCE(SUM(CASE WHEN o.order_status NOT IN ('Cancelled', 'Returned') THEN o.total_amount ELSE 0 END), 0) AS lifetime_revenue
FROM public.users u
LEFT JOIN public.customers cu ON cu.user_id = u.id
LEFT JOIN public.orders o ON o.user_id = u.id
WHERE u.role = 'customer'
GROUP BY u.id, u.full_name, u.email, cu.segment, u.created_at;

-- 4. Fact Sales & Order Line Items View (Star Schema Center)
CREATE OR REPLACE VIEW public.vw_bi_fact_sales AS
SELECT
  oi.id AS order_item_id,
  o.id AS order_id,
  o.order_number,
  o.created_at::date AS order_date,
  o.created_at AS order_timestamp,
  o.user_id AS customer_user_id,
  oi.product_id,
  oi.variant_id,
  oi.size,
  oi.color,
  oi.quantity AS units_sold,
  oi.unit_price,
  oi.unit_cost,
  oi.line_total AS gross_item_revenue,
  (oi.quantity * oi.unit_cost) AS item_cogs,
  (oi.line_total - (oi.quantity * oi.unit_cost)) AS item_gross_profit,
  o.discount_amount,
  o.tax_amount,
  o.shipping_cost,
  o.total_amount AS order_total_amount,
  o.payment_method,
  o.payment_status,
  o.order_status,
  COALESCE(pay.refund_amount, 0) AS refund_amount
FROM public.order_items oi
JOIN public.orders o ON o.id = oi.order_id
LEFT JOIN public.payments pay ON pay.order_id = o.id;

-- 5. Inventory Health & Valuation Snapshot View
CREATE OR REPLACE VIEW public.vw_bi_inventory_health AS
SELECT
  pv.id AS variant_id,
  p.id AS product_id,
  p.sku,
  p.name AS product_name,
  c.name AS category_name,
  pv.size,
  pv.color,
  inv.stock_qty,
  inv.reserved_qty,
  inv.reorder_level,
  inv.warehouse_location,
  p.cost_price,
  p.final_price,
  (inv.stock_qty * p.cost_price) AS inventory_cost_valuation,
  (inv.stock_qty * p.final_price) AS inventory_retail_valuation,
  CASE
    WHEN inv.stock_qty = 0 THEN 'Out of Stock'
    WHEN inv.stock_qty <= inv.reorder_level THEN 'Low Stock'
    ELSE 'Healthy'
  END AS stock_health_status
FROM public.inventory inv
JOIN public.product_variants pv ON pv.id = inv.variant_id
JOIN public.products p ON p.id = pv.product_id
JOIN public.product_categories c ON c.id = p.category_id;
