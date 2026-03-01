import { Router } from 'express';
import {
  registerCustomer,
  ownerRegisterStep1,
  ownerRegisterStep2,
  login,
  refreshAccessToken,
  logout,
  getMe,
  updateMe,
  changePassword,
} from '../controllers/auth.controller';
import { protect } from '../middleware/auth.middleware';
import { authLimiter } from '../middleware/rateLimit.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

router.post('/register/customer',    authLimiter, registerCustomer);
router.post('/register/owner/step1', authLimiter, ownerRegisterStep1);
router.post(
  '/register/owner/step2',
  authLimiter,
  upload.fields([
    { name: 'bannerImage', maxCount: 1 },
    { name: 'ownerImage',  maxCount: 1 },
  ]),
  ownerRegisterStep2
);
router.post('/login',   authLimiter, login);
router.post('/refresh', refreshAccessToken);
router.post('/logout',  logout);

router.use(protect);
router.get('/me',              getMe);
router.patch('/me',            updateMe);
router.patch('/change-password', changePassword);

export default router;
