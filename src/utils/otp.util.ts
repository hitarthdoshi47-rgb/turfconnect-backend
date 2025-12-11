import crypto from 'crypto';

// In-memory OTP storage (use Redis in production)
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

export const generateOTP = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

export const storeOTP = (phone: string, otp: string, expiryMinutes: number = 10): void => {
  const expiresAt = Date.now() + expiryMinutes * 60 * 1000;
  otpStore.set(phone, { otp, expiresAt });
};

export const verifyOTP = (phone: string, otp: string): boolean => {
  const stored = otpStore.get(phone);
  
  if (!stored) return false;
  if (Date.now() > stored.expiresAt) {
    otpStore.delete(phone);
    return false;
  }
  
  if (stored.otp === otp) {
    otpStore.delete(phone);
    return true;
  }
  
  return false;
};

export const clearOTP = (phone: string): void => {
  otpStore.delete(phone);
};