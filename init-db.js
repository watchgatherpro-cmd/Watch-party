import { db } from './server/db.js';
import fs from 'fs';
import 'dotenv/config';

async function init() {
  console.log('⏳ جاري قراءة ملف الجداول...');
  const schema = fs.readFileSync('./schema.sql', 'utf8');
  
  // تقسيم الملف إلى أوامر منفصلة عند كل فاصلة منقوطة
  const statements = schema.split(';').map(s => s.trim()).filter(s => s.length > 0);

  console.log(`⏳ جاري تنفيذ ${statements.length} أمر...`);

  for (let i = 0; i < statements.length; i++) {
    try {
      await db.execute(statements[i]);
      console.log(`✅ تم تنفيذ الأمر ${i + 1}/${statements.length}`);
    } catch (err) {
      console.error(`❌ خطأ في الأمر ${i + 1}:`, err.message);
      console.error('النص:', statements[i].substring(0, 50) + '...');
    }
  }
  console.log('🎉 انتهت العملية!');
  process.exit(0);
}

init();
