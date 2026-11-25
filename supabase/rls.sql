-- ============================================================================
-- MAISON VERRI — Supabase Row Level Security (RLS) Policies
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

-- Helper function: verify whether current authenticated JWT belongs to an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_uid = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Public Catalog Reads
CREATE POLICY "Public read categories" ON public.product_categories FOR SELECT USING (true);
CREATE POLICY "Public read active products" ON public.products FOR SELECT USING (status = 'active' OR public.is_admin());
CREATE POLICY "Public read variants" ON public.product_variants FOR SELECT USING (true);
CREATE POLICY "Public read images" ON public.product_images FOR SELECT USING (true);
CREATE POLICY "Public read inventory" ON public.inventory FOR SELECT USING (true);
CREATE POLICY "Public read approved reviews" ON public.reviews FOR SELECT USING (is_approved = true OR public.is_admin());
CREATE POLICY "Public read website settings" ON public.website_settings FOR SELECT USING (true);
CREATE POLICY "Public read active coupons" ON public.coupons FOR SELECT USING (is_active = true OR public.is_admin());

-- Customer Self-Access
CREATE POLICY "Users read own profile" ON public.users FOR SELECT USING (auth_uid = auth.uid() OR public.is_admin());
CREATE POLICY "Users update own profile" ON public.users FOR UPDATE USING (auth_uid = auth.uid() OR public.is_admin());

CREATE POLICY "Customers manage own addresses" ON public.addresses
  FOR ALL USING (user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid()) OR public.is_admin());

CREATE POLICY "Customers manage own wishlists" ON public.wishlists
  FOR ALL USING (user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid()));

CREATE POLICY "Customers view own orders" ON public.orders
  FOR SELECT USING (user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid()) OR public.is_admin());

CREATE POLICY "Customers view own order items" ON public.order_items
  FOR SELECT USING (order_id IN (SELECT id FROM public.orders WHERE user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())) OR public.is_admin());

CREATE POLICY "Customers view own payments" ON public.payments
  FOR SELECT USING (order_id IN (SELECT id FROM public.orders WHERE user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())) OR public.is_admin());

CREATE POLICY "Customers view own shipments" ON public.shipments
  FOR SELECT USING (order_id IN (SELECT id FROM public.orders WHERE user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())) OR public.is_admin());

CREATE POLICY "Customers manage own returns" ON public.returns
  FOR ALL USING (user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid()) OR public.is_admin());

-- Public Enquiries & Authenticated Reviews
CREATE POLICY "Anyone can submit contact enquiry" ON public.contact_enquiries FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can write reviews" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Admin Full Access Overrides
CREATE POLICY "Admins manage categories" ON public.product_categories FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage products" ON public.products FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage variants" ON public.product_variants FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage images" ON public.product_images FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage inventory" ON public.inventory FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage coupons" ON public.coupons FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage orders" ON public.orders FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage payments" ON public.payments FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage shipments" ON public.shipments FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage reviews" ON public.reviews FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage enquiries" ON public.contact_enquiries FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage settings" ON public.website_settings FOR ALL USING (public.is_admin());
