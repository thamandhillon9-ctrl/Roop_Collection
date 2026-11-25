# MAISON VERRI — Production Deployment & Architecture Guide

## 1. Local / Preview Architecture
- **Frontend**: React 19 + TypeScript + Tailwind CSS v4 + `@vis.gl/react-google-maps`
- **Backend**: Node.js + Express (`server.ts`) serving both `/api/*` and Vite/static frontend on port `3000`.
- **Database**: Persistent SQLite relational database (`data/maison_verri.db`) via Node 22 `node:sqlite`, mirroring the 18-table PostgreSQL schema (`supabase/schema.sql`).

## 2. Production Deployment (GitHub + Vercel + Supabase + Razorpay)
1. **Supabase Setup**:
   - Create a Supabase project and run `/supabase/schema.sql`, `/supabase/rls.sql`, and `/supabase/powerbi_views.sql` in the SQL Editor.
   - Create a public Storage bucket named `product-images`.
2. **Razorpay Configuration**:
   - Generate live/test keys in the Razorpay Dashboard (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`).
   - All payment verification runs server-side via HMAC-SHA256 signature validation (`POST /api/payments/razorpay/verify`).
3. **Environment Variables (`.env.example`)**:
   - Configure `SESSION_SECRET`, `ADMIN_PASSCODE`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `VITE_GOOGLE_MAPS_API_KEY`, and Supabase keys in Vercel / Secrets Manager.
4. **GitHub & Vercel**:
   - Push repository to GitHub (`git push origin main`).
   - Import repository into Vercel, set Build Command `npm run build`, Output Directory `dist`, and configure environment variables.
