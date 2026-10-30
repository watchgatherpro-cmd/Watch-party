import { db } from './server/db.js';
import 'dotenv/config';

async function makeAdmin() {
  console.log('⏳ جاري ترقية حساب ezzi إلى admin...');
  try {
    const result = await db.execute({
      sql: "UPDATE users SET role='admin' WHERE username='ezzi'",
      args: []
    });
    if (result.rowsAffected > 0) {
      console.log('✅ تمت الترقية بنجاح! أنت الآن Admin.');
    } else {
      console.log('⚠️ لم يتم العثور على مستخدم باسم ezzi.');
    }
  } catch (err) {
    console.error('❌ خطأ:', err.message);
  }
  process.exit(0);
}

makeAdmin();
