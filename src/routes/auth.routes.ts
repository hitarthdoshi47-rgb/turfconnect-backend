import { Router } from 'express';
import {
  register,
  login,
  sendOTP,
  verifyOTPHandler,
  refreshTokenHandler,
  logout,
} from '../controllers/auth.controller';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTPHandler);
router.post('/refresh-token', refreshTokenHandler);
router.post('/logout', logout);

export default router;