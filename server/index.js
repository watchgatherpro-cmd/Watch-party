import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import authRoutes from './routes/auth.js';
import roomRoutes from './routes/rooms.js'; // سطر جديد

const app = express();
const httpServer = createServer(app);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      frameSrc: ["'self'", "https://www.youtube.com", "https://www.youtube-nocookie.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://www.youtube.com", "https://www.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://i.ytimg.com"],
      connectSrc: ["'self'", "wss:", "https://www.youtube.com"]
    }
  },
  crossOriginEmbedderPolicy: false
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
}));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: Date.now() });
});

app.use(express.static('public')); // تقديم ملفات الواجهة
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes); // سطر جديد

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'حدث خطأ غير متوقع' });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ الخادم يعمل الآن على المنفذ ${PORT}`);
  console.log(`🔗 اختبر الاتصال: http://localhost:${PORT}/api/health\n`);
});
