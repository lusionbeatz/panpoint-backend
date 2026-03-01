import 'dotenv/config';
import http from 'http';
import app from './src/app';
import { connectDB } from './src/config/database';
import { initSocket } from './src/config/socket';
import fs from 'fs';
import path from 'path';

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), process.env.UPLOAD_PATH || 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const PORT = Number(process.env.PORT) || 5000;

const start = async (): Promise<void> => {
  await connectDB();

  const httpServer = http.createServer(app);
  initSocket(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`🚀 PanPoint server running on http://localhost:${PORT}`);
    console.log(`🔌 Socket.io ready`);
    console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    httpServer.close(() => process.exit(0));
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down gracefully...');
    httpServer.close(() => process.exit(0));
  });
};

start().catch((err) => {
  console.error('Startup error:', err);
  process.exit(1);
});
