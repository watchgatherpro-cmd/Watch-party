import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.js';
import roomRoutes from './routes/rooms.js';
import adminRoutes from './routes/admin.js';
import { setupSockets } from './sockets/index.js';

const app = express();
const httpServer = createServer(app);

// إعدادات حماية مرنة تسمح ليوتيوب بالعمل
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
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
}));

app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: Date.now() });
});

app.use(express.static('public'));
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/admin', adminRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'حدث خطأ غير متوقع' });
});

const io = new Server(httpServer, { cors: { origin: false } });
setupSockets(io);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ الخادم يعمل الآن على المنفذ ${PORT}`);
});
