import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types';

// Access token — 15 minutes
export const signAccessToken = (payload: Omit<JwtPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: '15m',
  } as jwt.SignOptions);
};

// Refresh token — 7 days, stored in httpOnly cookie
export const signRefreshToken = (payload: Omit<JwtPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET as string, {
    expiresIn: '7d',
  } as jwt.SignOptions);
};

// Setup token for owner 2-step registration — 1 hour
export const signSetupToken = (userId: string): string => {
  return jwt.sign(
    { userId, step: 'owner_setup' },
    process.env.JWT_SECRET as string,
    { expiresIn: '1h' } as jwt.SignOptions
  );
};

export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET as string) as JwtPayload;
};

export const verifySetupToken = (token: string): { userId: string; step: string } => {
  return jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string; step: string };
};
