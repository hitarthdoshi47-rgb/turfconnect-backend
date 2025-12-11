import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.util';
import { generateOTP, storeOTP, verifyOTP } from '../utils/otp.util';
import { successResponse, errorResponse } from '../utils/response.util';

const prisma = new PrismaClient();

export const register = async (req: Request, res: Response) => {
  try {
    const { phone, email, password, fullName, city } = req.body;

    // Validate required fields
    if (!phone || !fullName) {
      return errorResponse(res, 'Phone and full name are required', 400);
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { phone } });
    if (existingUser) {
      return errorResponse(res, 'User with this phone already exists', 400);
    }

    // Hash password if provided
    let passwordHash;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        phone,
        email,
        passwordHash,
        fullName,
        city,
      },
      select: {
        id: true,
        phone: true,
        email: true,
        fullName: true,
        city: true,
        role: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email || undefined,
      phone: user.phone,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email || undefined,
      phone: user.phone,
      role: user.role,
    });

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return successResponse(
      res,
      {
        user,
        accessToken,
        refreshToken,
      },
      'User registered successfully',
      201
    );
  } catch (error: any) {
    console.error('Register error:', error);
    return errorResponse(res, error.message || 'Registration failed', 500);
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return errorResponse(res, 'Phone and password are required', 400);
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user || !user.passwordHash) {
      return errorResponse(res, 'Invalid credentials', 401);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return errorResponse(res, 'Invalid credentials', 401);
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email || undefined,
      phone: user.phone,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email || undefined,
      phone: user.phone,
      role: user.role,
    });

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return successResponse(res, {
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      accessToken,
      refreshToken,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return errorResponse(res, error.message || 'Login failed', 500);
  }
};

export const sendOTP = async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return errorResponse(res, 'Phone number is required', 400);
    }

    // Generate OTP
    const otp = generateOTP();
    storeOTP(phone, otp);

    // TODO: Send OTP via Twilio/MSG91
    console.log(`OTP for ${phone}: ${otp}`);

    return successResponse(res, { phone }, 'OTP sent successfully');
  } catch (error: any) {
    console.error('Send OTP error:', error);
    return errorResponse(res, error.message || 'Failed to send OTP', 500);
  }
};

export const verifyOTPHandler = async (req: Request, res: Response) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return errorResponse(res, 'Phone and OTP are required', 400);
    }

    const isValid = verifyOTP(phone, otp);
    if (!isValid) {
      return errorResponse(res, 'Invalid or expired OTP', 400);
    }

    // Check if user exists
    let user = await prisma.user.findUnique({ where: { phone } });

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          phone,
          fullName: 'User', // Temporary name
          isVerified: true,
        },
      });
    } else {
      // Update verification status
      user = await prisma.user.update({
        where: { phone },
        data: { isVerified: true },
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email || undefined,
      phone: user.phone,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email || undefined,
      phone: user.phone,
      role: user.role,
    });

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return successResponse(res, {
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      accessToken,
      refreshToken,
    });
  } catch (error: any) {
    console.error('Verify OTP error:', error);
    return errorResponse(res, error.message || 'OTP verification failed', 500);
  }
};

export const refreshTokenHandler = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return errorResponse(res, 'Refresh token is required', 400);
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Check if token exists in database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!storedToken) {
      return errorResponse(res, 'Invalid refresh token', 401);
    }

    // Generate new access token
    const accessToken = generateAccessToken({
      userId: decoded.userId,
      email: decoded.email,
      phone: decoded.phone,
      role: decoded.role,
    });

    return successResponse(res, { accessToken });
  } catch (error: any) {
    console.error('Refresh token error:', error);
    return errorResponse(res, 'Invalid or expired refresh token', 401);
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    }

    return successResponse(res, null, 'Logged out successfully');
  } catch (error: any) {
    console.error('Logout error:', error);
    return errorResponse(res, error.message || 'Logout failed', 500);
  }
};