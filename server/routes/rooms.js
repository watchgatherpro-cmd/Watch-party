import express from 'express';
import crypto from 'crypto';
import { db, logAudit } from '../db.js';

const router = express.Router();

// دالة لتوليد كود دخول مكون من 6 أحرف/أرقام
function generateJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // بدون 0/O/1/I لتجنب الالتباس
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// 1. مسار إنشاء غرفة جديدة
router.post('/create', async (req, res) => {
  // ملاحظة: نفترض أنك أضفت ميدلوير للتحقق من المستخدم (سنفعله لاحقاً)
  // حالياً سنأخذ userId من الكوكي أو من الطلب لتسهيل الاختبار
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'يجب تسجيل الدخول أولاً' });

  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'اسم الغرفة مطلوب' });

  try {
    const roomId = crypto.randomUUID();
    const joinCode = generateJoinCode();
    const now = Date.now();

    // التأكد من عدم تكرار الكود (احتمال ضعيف جداً لكنه ممكن)
    const existing = await db.execute({ sql: 'SELECT id FROM rooms WHERE join_code=?', args: [joinCode] });
    if (existing.rows.length > 0) return res.status(500).json({ error: 'حدث تعارض في الكود، حاول مرة أخرى' });

    // ملاحظة: في المشروع النهائي، يجب استخراج userId من التوكن JWT.
    // لتسهيل الاختبار الآن، سنقرأه من التوكن يدوياً.
    const jwt = (await import('jsonwebtoken')).default;
    const user = jwt.verify(token, process.env.JWT_SECRET);

    // إنشاء الغرفة
    await db.execute({
      sql: `INSERT INTO rooms (id, name, join_code, owner_id, created_at) VALUES (?, ?, ?, ?, ?)`,
      args: [roomId, name, joinCode, user.userId, now]
    });

    // إضافة المالك كعضو في الغرفة بدور 'owner'
    await db.execute({
      sql: `INSERT INTO room_members (room_id, user_id, role, joined_at) VALUES (?, ?, 'owner', ?)`,
      args: [roomId, user.userId, now]
    });

    await logAudit('room_create', user.userId, roomId, { name, joinCode });
    res.status(201).json({ ok: true, roomId, joinCode, name });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في إنشاء الغرفة' });
  }
});

// 2. مسار الانضمام لغرفة بكود
router.post('/join', async (req, res) => {
  const { code } = req.body;
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'يجب تسجيل الدخول أولاً' });
  if (!code) return res.status(400).json({ error: 'كود الغرفة مطلوب' });

  try {
    const jwt = (await import('jsonwebtoken')).default;
    const user = jwt.verify(token, process.env.JWT_SECRET);

    // البحث عن الغرفة بالكود
    const roomResult = await db.execute({
      sql: 'SELECT * FROM rooms WHERE join_code=? AND is_active=1',
      args: [code.toUpperCase()]
    });
    const room = roomResult.rows[0];
    if (!room) return res.status(404).json({ error: 'كود الغرفة غير صحيح' });

    // التحقق هل المستخدم عضو بالفعل؟
    const memberCheck = await db.execute({
      sql: 'SELECT * FROM room_members WHERE room_id=? AND user_id=?',
      args: [room.id, user.userId]
    });

    if (memberCheck.rows.length === 0) {
      // إضافة المستخدم كعضو جديد
      await db.execute({
        sql: `INSERT INTO room_members (room_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)`,
        args: [room.id, user.userId, Date.now()]
      });
      await logAudit('room_join', user.userId, room.id, { joinCode: code });
    }

    res.json({ ok: true, room: { id: room.id, name: room.name } });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في الانضمام للغرفة' });
  }
});

// 3. مسار جلب تفاصيل غرفة (الأعضاء، إلخ)
router.get('/:id', async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'يجب تسجيل الدخول أولاً' });

  try {
    const jwt = (await import('jsonwebtoken')).default;
    jwt.verify(token, process.env.JWT_SECRET); // التحقق من صحة التوكن

    const roomId = req.params.id;
    
    const roomResult = await db.execute({ sql: 'SELECT * FROM rooms WHERE id=?', args: [roomId] });
    const room = roomResult.rows[0];
    if (!room) return res.status(404).json({ error: 'الغرفة غير موجودة' });

    // جلب الأعضاء
    const membersResult = await db.execute({
      sql: `SELECT rm.role, u.username, u.id FROM room_members rm 
            JOIN users u ON rm.user_id = u.id 
            WHERE rm.room_id=? AND rm.left_at IS NULL`,
      args: [roomId]
    });

    res.json({
      ok: true,
      room: { 
        id: room.id, 
        name: room.name, 
        owner_id: room.owner_id,
        join_code: room.join_code // نعيد الكود لكي تظهره الواجهة
      },
      members: membersResult.rows
    });

  } catch (err) {
    console.error(err);
    res.status(401).json({ error: 'جلسة غير صالحة' });
  }
});

export default router;
