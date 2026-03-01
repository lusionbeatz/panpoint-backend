import { Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { User } from '../models/User.model';
import { AppError } from '../utils/AppError';
import { catchAsync } from '../utils/catchAsync';
import { AuthRequest, UserRole } from '../types';

export const protect = catchAsync(async (req: AuthRequest, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Not authenticated. Please log in.', 401));
  }

  const token = authHeader.split(' ')[1];

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return next(new AppError('Invalid or expired access token.', 401));
  }

  const user = await User.findById(payload.userId).select('-passwordHash');
  if (!user) return next(new AppError('User no longer exists.', 401));
  if (!user.isActive) return next(new AppError('Your account has been deactivated.', 403));

  req.user = user;
  next();
});

export const restrictTo = (...roles: UserRole[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action.', 403));
    }
    next();
  };
};
