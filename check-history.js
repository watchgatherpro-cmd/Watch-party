import { db } from './server/db.js';
import 'dotenv/config';

async function checkHistory() {
  const result = await db.execute("SELECT ip_address, login_at, success FROM login_history ORDER BY login_at DESC LIMIT 5");
  console.table(result.rows);
  process.exit(0);
}
checkHistory();
