import { createClient } from '@libsql/client/web';
import 'dotenv/config';
import crypto from 'crypto';

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

export async function logAudit(eventType, userId, targetId = null, metadata = null, ip = null, ua = null) {
  try {
    await db.execute({
      sql: `INSERT INTO audit_log (id, event_type, user_id, target_id, metadata, ip_address, user_agent, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [crypto.randomUUID(), eventType, userId, targetId, metadata ? JSON.stringify(metadata) : null, ip, ua, Date.now()]
    });
  } catch (err) {
    console.error('Audit Log Error:', err);
  }
}
