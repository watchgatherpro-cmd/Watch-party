import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db, logAudit } from '../db.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  const { username, password, fingerprint } = req.body;
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
  const ua = req.headers['user-agent'];

  if (!username || !password) return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' });

  try {
    const existingUser = await db.execute({ sql: 'SELECT id FROM users WHERE username=?', args: [username] });
    if (existingUser.rows.length > 0) return res.status(400).json({ error: 'اسم المستخدم محجوز' });

    if (fingerprint) {
      const existingFingerprint = await db.execute({ sql: 'SELECT user_id FROM device_fingerprints WHERE fingerprint=?', args: [fingerprint] });
      if (existingFingerprint.rows.length > 0) {
        return res.status(403).json({ error: 'هذا الجهاز مسجل بالفعل بحساب آخر' });
      }
    }

    const hash = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();
    const now = Date.now();

    await db.execute({
      sql: `INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)`,
      args: [userId, username, hash, now]
    });

    if (fingerprint) {
      await db.execute({
        sql: `INSERT INTO device_fingerprints (fingerprint, user_id, user_agent, ip_address, first_seen_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [fingerprint, userId, ua, ip, now, now]
      });
    }

    await logAudit('register', userId, null, { username }, ip, ua);
    res.status(201).json({ ok: true, message: 'تم إنشاء الحساب بنجاح' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
  const ua = req.headers['user-agent'];

  try {
    const result = await db.execute({ sql: 'SELECT * FROM users WHERE username=?', args: [username] });
    const user = result.rows[0];
    const isValid = user ? await bcrypt.compare(password, user.password_hash) : false;

    await db.execute({
      sql: `INSERT INTO login_history (id, user_id, ip_address, user_agent, login_at, success) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [crypto.randomUUID(), user ? user.id : 'unknown', ip, ua, Date.now(), isValid ? 1 : 0]
    });

    if (!isValid) {
      if (user) {
        await db.execute({ sql: 'UPDATE users SET failed_login_count = failed_login_count + 1 WHERE id=?', args: [user.id] });
      }
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    }

    if (user.is_banned) return res.status(403).json({ error: 'هذا الحساب محظور' });

    await db.execute({ sql: 'UPDATE users SET failed_login_count = 0, last_login_at = ? WHERE id=?', args: [Date.now(), user.id] });

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    await logAudit('login', user.id, null, null, ip, ua);
    res.json({ ok: true, user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'غير مسجل' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ user: payload });
  } catch {
    res.status(401).json({ error: 'جلسة منتهية' });
  }
});

export default router;
