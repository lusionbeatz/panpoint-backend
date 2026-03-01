import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

interface MongoError extends Error {
  code?: number;
  keyValue?: Record<string, unknown>;
  errors?: Record<string, { message: string }>;
  path?: string;
  value?: unknown;
}

const handleCastError = (err: MongoError): AppError =>
  new AppError(`Invalid ${err.path}: ${err.value}`, 400);

const handleDuplicateKeyError = (err: MongoError): AppError => {
  const key = Object.keys(err.keyValue || {})[0];
  return new AppError(`Duplicate value for field: ${key}. Please use another value.`, 409);
};

const handleValidationError = (err: MongoError): AppError => {
  const messages = Object.values(err.errors || {}).map((e) => e.message);
  return new AppError(`Validation error: ${messages.join('. ')}`, 400);
};

const handleJWTError = (): AppError =>
  new AppError('Invalid token. Please log in again.', 401);

const handleJWTExpiredError = (): AppError =>
  new AppError('Token expired. Please log in again.', 401);

export const globalErrorHandler = (
  err: MongoError & AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let error = { ...err, message: err.message, name: err.name };

  if (err.name === 'CastError')         error = { ...handleCastError(err),         name: 'CastError' };
  if (err.code === 11000)               error = { ...handleDuplicateKeyError(err),  name: 'DuplicateKey' };
  if (err.name === 'ValidationError')   error = { ...handleValidationError(err),    name: 'ValidationError' };
  if (err.name === 'JsonWebTokenError') error = { ...handleJWTError(),              name: 'JWT' };
  if (err.name === 'TokenExpiredError') error = { ...handleJWTExpiredError(),       name: 'JWTExpired' };

  const statusCode = (error as AppError).statusCode || 500;
  const message    = (error as AppError).isOperational ? error.message : 'Something went wrong.';

  if (statusCode === 500) console.error('ERROR 💥', err);

  res.status(statusCode).json({
    status: (error as AppError).status || 'error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
