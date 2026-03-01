import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';

let io: SocketIOServer;

export const initSocket = (httpServer: HttpServer): SocketIOServer => {
  const _allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
    .split(',').map((o) => o.trim());

  io = new SocketIOServer(httpServer, {
    cors: {
      origin:      _allowedOrigins,
      methods:     ['GET', 'POST'],
      credentials: true,
    },
    // Allow both websocket and long-polling for Render free tier
    transports: ['websocket', 'polling'],
  });

  // Auth middleware for socket connections
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('Authentication error: token required'));

    try {
      const payload = verifyAccessToken(token);
      (socket as Socket & { userId?: string; role?: string }).userId = payload.userId;
      (socket as Socket & { userId?: string; role?: string }).role   = payload.role;
      next();
    } catch {
      next(new Error('Authentication error: invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const s = socket as Socket & { userId?: string; role?: string };
    console.log(`Socket connected: ${s.userId} (${s.role})`);

    // Every user joins their personal room for direct notifications
    if (s.userId) socket.join(`user:${s.userId}`);

    // Owner can join their shop room to receive order events
    socket.on('join:shop', (shopId: string) => {
      socket.join(`shop:${shopId}`);
      console.log(`Owner ${s.userId} joined shop room: ${shopId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${s.userId}`);
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

/** Emit event to all sockets in a shop room (owner's room) */
export const emitOrderUpdate = (shopId: string, event: string, data: unknown): void => {
  if (io) io.to(`shop:${shopId}`).emit(event, data);
};

/** Emit event to a specific user's personal room */
export const emitToUser = (userId: string, event: string, data: unknown): void => {
  if (io) io.to(`user:${userId}`).emit(event, data);
};
