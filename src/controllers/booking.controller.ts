import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.util';

const prisma = new PrismaClient();

export const createBooking = async (req: AuthRequest, res: Response) => {
  try {
    const {
      slotId,
      bookingType, // 'full_turf' or 'match_host'
      paymentMethod,
    } = req.body;

    if (!req.user) {
      return errorResponse(res, 'Unauthorized', 401);
    }

    // Get slot details
    const slot = await prisma.turfSlot.findUnique({
      where: { id: slotId },
      include: { turf: true },
    });

    if (!slot) {
      return errorResponse(res, 'Slot not found', 404);
    }

    if (!slot.isAvailable || slot.isBlocked) {
      return errorResponse(res, 'Slot not available', 400);
    }

    const totalPrice = slot.dynamicPrice || slot.basePrice;

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        slotId,
        turfId: slot.turfId,
        bookerId: req.user.userId,
        bookingType,
        totalPrice,
        paymentMethod: paymentMethod || 'wallet',
        paymentStatus: 'pending',
      },
      include: {
        slot: {
          include: {
            sport: true,
          },
        },
        turf: true,
      },
    });

    // Mark slot as unavailable
    await prisma.turfSlot.update({
      where: { id: slotId },
      data: { isAvailable: false },
    });

    // TODO: Process payment

    return successResponse(res, booking, 'Booking created successfully', 201);
  } catch (error: any) {
    console.error('Create booking error:', error);
    return errorResponse(res, error.message || 'Failed to create booking', 500);
  }
};

export const getBookings = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    if (!req.user) {
      return errorResponse(res, 'Unauthorized', 401);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      bookerId: req.user.userId,
    };

    if (status) {
      where.bookingStatus = status;
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          slot: {
            include: {
              sport: true,
            },
          },
          turf: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.booking.count({ where }),
    ]);

    return paginatedResponse(
      res,
      bookings,
      Number(page),
      Number(limit),
      total
    );
  } catch (error: any) {
    console.error('Get bookings error:', error);
    return errorResponse(res, error.message || 'Failed to get bookings', 500);
  }
};

export const getBookingById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return errorResponse(res, 'Unauthorized', 401);
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        slot: {
          include: {
            sport: true,
          },
        },
        turf: true,
        booker: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    if (!booking) {
      return errorResponse(res, 'Booking not found', 404);
    }

    if (booking.bookerId !== req.user.userId && req.user.role !== 'admin') {
      return errorResponse(res, 'Forbidden', 403);
    }

    return successResponse(res, booking);
  } catch (error: any) {
    console.error('Get booking error:', error);
    return errorResponse(res, error.message || 'Failed to get booking', 500);
  }
};

export const cancelBooking = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!req.user) {
      return errorResponse(res, 'Unauthorized', 401);
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      return errorResponse(res, 'Booking not found', 404);
    }

    if (booking.bookerId !== req.user.userId && req.user.role !== 'admin') {
      return errorResponse(res, 'Forbidden', 403);
    }

    if (booking.bookingStatus === 'cancelled') {
      return errorResponse(res, 'Booking already cancelled', 400);
    }

    // Update booking
    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        bookingStatus: 'cancelled',
        cancellationReason: reason,
        cancelledAt: new Date(),
      },
    });

    // Make slot available again
    await prisma.turfSlot.update({
      where: { id: booking.slotId },
      data: { isAvailable: true },
    });

    // TODO: Process refund

    return successResponse(res, updatedBooking, 'Booking cancelled successfully');
  } catch (error: any) {
    console.error('Cancel booking error:', error);
    return errorResponse(res, error.message || 'Failed to cancel booking', 500);
  }
};