import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { User } from '../models/User.model';
import { Shop } from '../models/Shop.model';
import { BankDetails } from '../models/BankDetails.model';
import { Subscription } from '../models/Subscription.model';
import {
  signAccessToken,
  signRefreshToken,
  signSetupToken,
  verifyRefreshToken,
  verifySetupToken,
} from '../utils/jwt';
import { AppError } from '../utils/AppError';
import { catchAsync } from '../utils/catchAsync';
import { AuthRequest } from '../types';
import { bankVerificationService } from '../services/bankVerification.service';
import { uploadImage } from '../utils/cloudinary';

const SALT_ROUNDS = 12;

function setRefreshCookie(res: Response, token: string): void {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

// ─── Customer Register ────────────────────────────────────────────────────────
// POST /api/auth/register/customer
export const registerCustomer = catchAsync(async (req: Request, res: Response) => {
  const { name, phone, password } = req.body as {
    name: string; phone: string; password: string;
  };

  if (!name || !phone || !password)
    throw new AppError('name, phone, and password are required.', 400);
  if (password.length < 6)
    throw new AppError('Password must be at least 6 characters.', 400);
  if (await User.findOne({ phone }))
    throw new AppError('Phone number is already registered.', 409);

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ name, phone, passwordHash, role: 'customer' });

  const accessToken  = signAccessToken({ userId: user._id.toString(), role: user.role });
  const refreshToken = signRefreshToken({ userId: user._id.toString(), role: user.role });
  setRefreshCookie(res, refreshToken);

  res.status(201).json({
    status: 'success',
    accessToken,
    user: { _id: user._id, name: user.name, phone: user.phone, role: user.role },
  });
});

// ─── Owner Register Step 1 ───────────────────────────────────────────────────
// POST /api/auth/register/owner/step1
// Returns setupToken — valid for 1 hour, used in step2
export const ownerRegisterStep1 = catchAsync(async (req: Request, res: Response) => {
  const { name, phone, password } = req.body as {
    name: string; phone: string; password: string;
  };

  if (!name || !phone || !password)
    throw new AppError('name, phone, and password are required.', 400);
  if (password.length < 6)
    throw new AppError('Password must be at least 6 characters.', 400);
  if (await User.findOne({ phone }))
    throw new AppError('Phone number is already registered.', 409);

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ name, phone, passwordHash, role: 'owner' });

  const setupToken = signSetupToken(user._id.toString());

  res.status(201).json({
    status:  'success',
    setupToken,
    message: 'Account created. Complete shop setup using the setupToken.',
  });
});

// ─── Owner Register Step 2 ───────────────────────────────────────────────────
// POST /api/auth/register/owner/step2
// Authorization: Bearer <setupToken>
// Body: multipart/form-data (bannerImage + ownerImage files + shop/bank fields)
export const ownerRegisterStep2 = catchAsync(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer '))
    throw new AppError('Setup token required in Authorization header.', 401);

  let setupPayload: { userId: string; step: string };
  try {
    setupPayload = verifySetupToken(authHeader.split(' ')[1]);
  } catch {
    throw new AppError('Invalid or expired setup token.', 401);
  }
  if (setupPayload.step !== 'owner_setup')
    throw new AppError('Invalid setup token type.', 401);

  const {
    shopName, address, lat, lng,
    openingTime, closingTime,
    lateNightAvailable, lateNightClosingTime,
    phone,
    accountHolderName, accountNumber, ifscCode, upiId,
  } = req.body;

  if (!shopName || !address || !lat || !lng || !openingTime || !closingTime)
    throw new AppError('shopName, address, lat, lng, openingTime, closingTime are required.', 400);
  if (!accountHolderName || !accountNumber || !ifscCode)
    throw new AppError('accountHolderName, accountNumber, and ifscCode are required.', 400);

  const files       = req.files as Record<string, Express.Multer.File[]> | undefined;
  const bannerImage = files?.bannerImage?.[0]
    ? await uploadImage(files.bannerImage[0].buffer, 'panpoint/shops')
    : '';
  const ownerImage  = files?.ownerImage?.[0]
    ? await uploadImage(files.ownerImage[0].buffer, 'panpoint/shops')
    : '';

  const shop = await Shop.create({
    owner:              setupPayload.userId,
    shopName,
    bannerImage,
    ownerImage,
    address,
    geoLocation:        { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
    phone:              phone || '',
    openingTime,
    closingTime,
    lateNightAvailable: lateNightAvailable === 'true' || lateNightAvailable === true,
    lateNightClosingTime: lateNightClosingTime || undefined,
    isOpen:             false,
    planType:           'basic',
    isApproved:         false,
    isBlocked:          false,
  });

  await BankDetails.create({
    shop:              shop._id,
    accountHolderName,
    accountNumber,
    ifscCode,
    upiId:             upiId || undefined,
    verificationStatus: 'pending',
  });

  const now        = new Date();
  const expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  await Subscription.create({
    shop:      shop._id,
    planType:  'basic',
    startDate: now,
    expiryDate,
    isActive:  true,
  });

  // Fire-and-forget: resolves in ~5s with socket notification to owner
  bankVerificationService(shop._id.toString(), setupPayload.userId).catch(console.error);

  const user = await User.findById(setupPayload.userId).select('-passwordHash');
  const accessToken  = signAccessToken({ userId: setupPayload.userId, role: 'owner' });
  const refreshToken = signRefreshToken({ userId: setupPayload.userId, role: 'owner' });
  setRefreshCookie(res, refreshToken);

  res.status(201).json({
    status: 'success',
    accessToken,
    user: { _id: user!._id, name: user!.name, phone: user!.phone, role: user!.role },
    shop: {
      _id:              shop._id,
      shopName:         shop.shopName,
      isApproved:       false,
      bankVerification: 'pending',
      message:          'Shop created. Awaiting bank verification and admin approval.',
    },
  });
});

// ─── Login ───────────────────────────────────────────────────────────────────
// POST /api/auth/login
// Optionally pass `role` to enforce role-based login
export const login = catchAsync(async (req: Request, res: Response) => {
  const { phone, password, role } = req.body as {
    phone: string; password: string; role?: string;
  };

  if (!phone || !password)
    throw new AppError('Phone and password are required.', 400);

  const query: Record<string, unknown> = { phone };
  if (role) query.role = role;

  const user = await User.findOne(query);
  if (!user || !(await bcrypt.compare(password, user.passwordHash)))
    throw new AppError('Invalid phone or password.', 401);
  if (!user.isActive)
    throw new AppError('Account deactivated. Contact support.', 403);

  const accessToken  = signAccessToken({ userId: user._id.toString(), role: user.role });
  const refreshToken = signRefreshToken({ userId: user._id.toString(), role: user.role });
  setRefreshCookie(res, refreshToken);

  let shopId: string | null = null;
  if (user.role === 'owner') {
    const shop = await Shop.findOne({ owner: user._id }).select('_id isApproved planType');
    shopId = shop ? shop._id.toString() : null;
  }

  res.json({
    status: 'success',
    accessToken,
    user: { _id: user._id, name: user.name, phone: user.phone, role: user.role, shopId },
  });
});

// ─── Refresh Token ───────────────────────────────────────────────────────────
// POST /api/auth/refresh
export const refreshAccessToken = catchAsync(async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken as string | undefined;
  if (!token) throw new AppError('No refresh token found.', 401);

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new AppError('Invalid or expired refresh token. Please log in again.', 401);
  }

  const user = await User.findById(payload.userId);
  if (!user || !user.isActive)
    throw new AppError('User not found or deactivated.', 401);

  const accessToken = signAccessToken({ userId: payload.userId, role: payload.role });
  res.json({ status: 'success', accessToken });
});

// ─── Logout ──────────────────────────────────────────────────────────────────
// POST /api/auth/logout
export const logout = (_req: Request, res: Response): void => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  res.json({ status: 'success', message: 'Logged out successfully.' });
};

// ─── Get Current User ────────────────────────────────────────────────────────
// GET /api/auth/me
export const getMe = catchAsync(async (req: AuthRequest, res: Response) => {
  res.json({ status: 'success', user: req.user });
});

// ─── Update Profile ──────────────────────────────────────────────────────────
// PATCH /api/auth/me
export const updateMe = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.body.password || req.body.passwordHash)
    return next(new AppError('Use /change-password to update your password.', 400));

  const allowed = ['name', 'avatar'];
  const updates: Record<string, unknown> = {};
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  });

  const user = await User.findByIdAndUpdate(req.user!._id, updates, {
    new: true, runValidators: true,
  }).select('-passwordHash');

  res.json({ status: 'success', user });
});

// ─── Change Password ─────────────────────────────────────────────────────────
// PATCH /api/auth/change-password
export const changePassword = catchAsync(async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body as {
    currentPassword: string; newPassword: string;
  };

  if (!currentPassword || !newPassword)
    throw new AppError('Both currentPassword and newPassword are required.', 400);
  if (newPassword.length < 6)
    throw new AppError('New password must be at least 6 characters.', 400);

  const user = await User.findById(req.user!._id);
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash)))
    throw new AppError('Current password is incorrect.', 401);

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await user.save();

  res.json({ status: 'success', message: 'Password updated successfully.' });
});
