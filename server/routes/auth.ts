import crypto from 'node:crypto';
import { Router } from 'express';
import { db } from '../db.ts';
import {
  type AuthRequest,
  hashPassword,
  requireAuth,
  signToken,
  verifyPassword,
} from '../auth.ts';

export const authRouter = Router();

authRouter.post('/register', (req, res) => {
  try {
    const { email, password, full_name, phone } = req.body ?? {};
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }
    if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
      res.status(400).json({ error: 'Full name is required.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = db.prepare('SELECT id, password_hash FROM users WHERE email = ?').get(cleanEmail) as
      | { id: number; password_hash: string }
      | undefined;

    if (existing && existing.password_hash !== 'ARCHIVED_RECORD') {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const pwHash = hashPassword(password);
    let userId: number;
    if (existing) {
      db.prepare('UPDATE users SET password_hash = ?, full_name = ?, phone = ?, updated_at = datetime(\'now\') WHERE id = ?').run(
        pwHash,
        full_name.trim(),
        typeof phone === 'string' ? phone.trim() : '',
        existing.id
      );
      userId = existing.id;
    } else {
      const info = db
        .prepare('INSERT INTO users (email, password_hash, full_name, phone, role) VALUES (?, ?, ?, ?, ?)')
        .run(cleanEmail, pwHash, full_name.trim(), typeof phone === 'string' ? phone.trim() : '', 'customer');
      userId = Number(info.lastInsertRowid);
      db.prepare('INSERT INTO customers (user_id, segment) VALUES (?, ?)').run(userId, 'Standard');
    }

    const user = {
      id: userId,
      email: cleanEmail,
      full_name: full_name.trim(),
      phone: typeof phone === 'string' ? phone.trim() : '',
      role: 'customer' as const,
    };

    const token = signToken(user);
    res.status(201).json({ token, user });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Unable to create account.' });
  }
});

authRouter.post('/login', (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    const row = db
      .prepare('SELECT id, email, password_hash, full_name, phone, role FROM users WHERE email = ?')
      .get(cleanEmail) as
      | { id: number; email: string; password_hash: string; full_name: string; phone: string; role: 'customer' | 'admin' }
      | undefined;

    if (!row || !verifyPassword(password, row.password_hash)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const user = {
      id: row.id,
      email: row.email,
      full_name: row.full_name,
      phone: row.phone || '',
      role: row.role,
    };
    const token = signToken(user);
    res.json({ token, user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Sign-in failed.' });
  }
});

authRouter.get('/me', requireAuth, (req: AuthRequest, res) => {
  res.json({ user: req.user });
});

authRouter.put('/profile', requireAuth, (req: AuthRequest, res) => {
  try {
    const { full_name, phone } = req.body ?? {};
    if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
      res.status(400).json({ error: 'Full name cannot be empty.' });
      return;
    }
    db.prepare('UPDATE users SET full_name = ?, phone = ?, updated_at = datetime(\'now\') WHERE id = ?').run(
      full_name.trim(),
      typeof phone === 'string' ? phone.trim() : '',
      req.user!.id
    );
    const updated = db
      .prepare('SELECT id, email, full_name, phone, role FROM users WHERE id = ?')
      .get(req.user!.id);
    res.json({ user: updated });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

authRouter.get('/admin-status', (_req, res) => {
  const adminCount = db.prepare("SELECT COUNT(*) AS cnt FROM users WHERE role = 'admin'").get() as { cnt: number };
  const passcodeConfigured = Boolean(process.env.ADMIN_PASSCODE && process.env.ADMIN_PASSCODE.trim().length > 0);
  res.json({
    hasAdminAccount: adminCount.cnt > 0,
    passcodeConfigured,
  });
});

authRouter.post('/admin-bootstrap', (req, res) => {
  try {
    const configuredPasscode = process.env.ADMIN_PASSCODE?.trim();
    const { passcode, email, password, full_name } = req.body ?? {};

    // Mode 1: Server-configured ADMIN_PASSCODE overrides bootstrap
    if (configuredPasscode) {
      if (typeof passcode !== 'string' || !passcode) {
        res.status(401).json({ error: 'Admin passcode is required.' });
        return;
      }
      const a = Buffer.from(passcode);
      const b = Buffer.from(configuredPasscode);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        res.status(401).json({ error: 'Invalid admin passcode.' });
        return;
      }
      // Ensure an owner admin record exists for token subject
      let adminUser = db
        .prepare("SELECT id, email, full_name, phone, role FROM users WHERE role = 'admin' LIMIT 1")
        .get() as { id: number; email: string; full_name: string; phone: string; role: 'admin' } | undefined;

      if (!adminUser) {
        const info = db
          .prepare("INSERT INTO users (email, password_hash, full_name, phone, role) VALUES (?, ?, ?, '', 'admin')")
          .run('owner@maisonverri.com', hashPassword(crypto.randomBytes(16).toString('hex')), 'Maison Verri Owner');
        const uid = Number(info.lastInsertRowid);
        db.prepare('INSERT OR IGNORE INTO admins (user_id, department) VALUES (?, ?)').run(uid, 'Executive Owner');
        adminUser = { id: uid, email: 'owner@maisonverri.com', full_name: 'Maison Verri Owner', phone: '', role: 'admin' };
      }
      const token = signToken(adminUser);
      res.json({ token, user: adminUser });
      return;
    }

    // Mode 2: First-run admin claim when no admin exists yet
    const existingAdmin = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
    if (existingAdmin) {
      res.status(403).json({ error: 'Admin account already claimed. Please sign in with your admin email and password.' });
      return;
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ error: 'Valid admin email is required.' });
      return;
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      res.status(400).json({ error: 'Admin password must be at least 8 characters.' });
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    const displayName = typeof full_name === 'string' && full_name.trim() ? full_name.trim() : 'Atelier Director';

    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail) as { id: number } | undefined;
    let uid: number;
    if (existingUser) {
      db.prepare("UPDATE users SET password_hash = ?, full_name = ?, role = 'admin', updated_at = datetime('now') WHERE id = ?").run(
        hashPassword(password),
        displayName,
        existingUser.id
      );
      uid = existingUser.id;
    } else {
      const info = db
        .prepare("INSERT INTO users (email, password_hash, full_name, phone, role) VALUES (?, ?, ?, '', 'admin')")
        .run(cleanEmail, hashPassword(password), displayName);
      uid = Number(info.lastInsertRowid);
    }
    db.prepare('INSERT OR IGNORE INTO admins (user_id, department) VALUES (?, ?)').run(uid, 'Executive Director');

    const adminUser = { id: uid, email: cleanEmail, full_name: displayName, phone: '', role: 'admin' as const };
    const token = signToken(adminUser);
    res.status(201).json({ token, user: adminUser });
  } catch (error) {
    console.error('Admin bootstrap error:', error);
    res.status(500).json({ error: 'Failed to initialize admin session.' });
  }
});

// Addresses
authRouter.get('/addresses', requireAuth, (req: AuthRequest, res) => {
  const rows = db
    .prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC')
    .all(req.user!.id);
  res.json(rows);
});

authRouter.post('/addresses', requireAuth, (req: AuthRequest, res) => {
  try {
    const { full_name, phone, street, city, state, postal_code, country, is_default } = req.body ?? {};
    if (!full_name || !phone || !street || !city || !state || !postal_code) {
      res.status(400).json({ error: 'All address fields are required.' });
      return;
    }
    if (is_default) {
      db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.user!.id);
    }
    const info = db
      .prepare(
        'INSERT INTO addresses (user_id, full_name, phone, street, city, state, postal_code, country, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .run(
        req.user!.id,
        String(full_name).trim(),
        String(phone).trim(),
        String(street).trim(),
        String(city).trim(),
        String(state).trim(),
        String(postal_code).trim(),
        country ? String(country).trim() : 'India',
        is_default ? 1 : 0
      );
    const created = db.prepare('SELECT * FROM addresses WHERE id = ?').get(Number(info.lastInsertRowid));
    res.status(201).json(created);
  } catch (error) {
    console.error('Create address error:', error);
    res.status(500).json({ error: 'Failed to save address.' });
  }
});

authRouter.delete('/addresses/:id', requireAuth, (req: AuthRequest, res) => {
  db.prepare('DELETE FROM addresses WHERE id = ? AND user_id = ?').run(Number(req.params.id), req.user!.id);
  res.json({ deleted: true });
});

// Wishlist
authRouter.get('/wishlist', requireAuth, (req: AuthRequest, res) => {
  const rows = db
    .prepare('SELECT product_id FROM wishlists WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.user!.id) as Array<{ product_id: number }>;
  res.json(rows.map((r) => r.product_id));
});

authRouter.post('/wishlist/toggle', requireAuth, (req: AuthRequest, res) => {
  const productId = Number(req.body?.product_id);
  if (!Number.isFinite(productId)) {
    res.status(400).json({ error: 'Invalid product ID.' });
    return;
  }
  const existing = db
    .prepare('SELECT 1 FROM wishlists WHERE user_id = ? AND product_id = ?')
    .get(req.user!.id, productId);
  if (existing) {
    db.prepare('DELETE FROM wishlists WHERE user_id = ? AND product_id = ?').run(req.user!.id, productId);
    res.json({ wishlisted: false });
  } else {
    db.prepare('INSERT INTO wishlists (user_id, product_id) VALUES (?, ?)').run(req.user!.id, productId);
    res.json({ wishlisted: true });
  }
});
