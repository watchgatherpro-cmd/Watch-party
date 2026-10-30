import bcrypt from 'bcryptjs';
import { db } from './server/db.js';
import 'dotenv/config';

async function resetPassword() {
  const username = 'ezzi';
  const newPassword = 'ezzi123456'; // كلمة المرور الجديدة (يمكنك تغييرها)

  console.log(`⏳ جاري تغيير كلمة المرور للحساب: ${username}...`);
  
  try {
    const hash = await bcrypt.hash(newPassword, 10);
    
    const result = await db.execute({
      sql: "UPDATE users SET password_hash=? WHERE username=?",
      args: [hash, username]
    });

    if (result.rowsAffected > 0) {
      console.log(`✅ تم بنجاح! كلمة المرور الجديدة هي: ${newPassword}`);
    } else {
      console.log('⚠️ لم يتم العثور على هذا المستخدم.');
    }
  } catch (err) {
    console.error('❌ خطأ:', err.message);
  }
  process.exit(0);
}

resetPassword();
