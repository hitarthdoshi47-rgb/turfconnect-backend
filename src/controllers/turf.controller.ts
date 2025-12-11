import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.util';

const prisma = new PrismaClient();

export const createTurf = async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      description,
      address,
      city,
      latitude,
      longitude,
      contactPhone,
      contactEmail,
      amenities,
      images,
      sports, // Array of { sportId, maxPlayers }
    } = req.body;

    if (!req.user) {
      return errorResponse(res, 'Unauthorized', 401);
    }

    if (!name || !address || !city) {
      return errorResponse(res, 'Name, address, and city are required', 400);
    }

    const turf = await prisma.turf.create({
      data: {
        ownerId: req.user.userId,
        name,
        description,
        address,
        city,
        latitude,
        longitude,
        contactPhone,
        contactEmail,
        amenities: amenities || [],
        images: images || [],
        turfSports: sports
          ? {
              create: sports.map((s: any) => ({
                sportId: s.sportId,
                maxPlayers: s.maxPlayers,
              })),
            }
          : undefined,
      },
      include: {
        turfSports: {
          include: {
            sport: true,
          },
        },
      },
    });

    return successResponse(res, turf, 'Turf created successfully', 201);
  } catch (error: any) {
    console.error('Create turf error:', error);
    return errorResponse(res, error.message || 'Failed to create turf', 500);
  }
};

export const getTurfs = async (req: AuthRequest, res: Response) => {
  try {
    const {
      city,
      sportId,
      page = 1,
      limit = 10,
      search,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      isActive: true,
      isVerified: true,
    };

    if (city) {
      where.city = city;
    }

    if (sportId) {
      where.turfSports = {
        some: {
          sportId: Number(sportId),
        },
      };
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [turfs, total] = await Promise.all([
      prisma.turf.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          turfSports: {
            include: {
              sport: true,
            },
          },
        },
        orderBy: {
          rating: 'desc',
        },
      }),
      prisma.turf.count({ where }),
    ]);

    return paginatedResponse(
      res,
      turfs,
      Number(page),
      Number(limit),
      total,
      'Turfs retrieved successfully'
    );
  } catch (error: any) {
    console.error('Get turfs error:', error);
    return errorResponse(res, error.message || 'Failed to get turfs', 500);
  }
};

export const getTurfById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const turf = await prisma.turf.findUnique({
      where: { id },
      include: {
        turfSports: {
          include: {
            sport: true,
          },
        },
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                profilePicture: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
      },
    });

    if (!turf) {
      return errorResponse(res, 'Turf not found', 404);
    }

    return successResponse(res, turf);
  } catch (error: any) {
    console.error('Get turf error:', error);
    return errorResponse(res, error.message || 'Failed to get turf', 500);
  }
};

export const updateTurf = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!req.user) {
      return errorResponse(res, 'Unauthorized', 401);
    }

    // Check ownership
    const turf = await prisma.turf.findUnique({ where: { id } });
    if (!turf) {
      return errorResponse(res, 'Turf not found', 404);
    }

    if (turf.ownerId !== req.user.userId && req.user.role !== 'admin') {
      return errorResponse(res, 'Forbidden', 403);
    }

    const updatedTurf = await prisma.turf.update({
      where: { id },
      data: updateData,
      include: {
        turfSports: {
          include: {
            sport: true,
          },
        },
      },
    });

    return successResponse(res, updatedTurf, 'Turf updated successfully');
  } catch (error: any) {
    console.error('Update turf error:', error);
    return errorResponse(res, error.message || 'Failed to update turf', 500);
  }
};

export const deleteTurf = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return errorResponse(res, 'Unauthorized', 401);
    }

    const turf = await prisma.turf.findUnique({ where: { id } });
    if (!turf) {
      return errorResponse(res, 'Turf not found', 404);
    }

    if (turf.ownerId !== req.user.userId && req.user.role !== 'admin') {
      return errorResponse(res, 'Forbidden', 403);
    }

    await prisma.turf.delete({ where: { id } });

    return successResponse(res, null, 'Turf deleted successfully');
  } catch (error: any) {
    console.error('Delete turf error:', error);
    return errorResponse(res, error.message || 'Failed to delete turf', 500);
  }
};

export const getTurfSlots = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { date, sportId } = req.query;

    const where: any = {
      turfId: id,
      isAvailable: true,
      isBlocked: false,
    };

    if (date) {
      where.slotDate = new Date(date as string);
    }

    if (sportId) {
      where.sportId = Number(sportId);
    }

    const slots = await prisma.turfSlot.findMany({
      where,
      include: {
        sport: true,
      },
      orderBy: [
        { slotDate: 'asc' },
        { startTime: 'asc' },
      ],
    });

    return successResponse(res, slots);
  } catch (error: any) {
    console.error('Get turf slots error:', error);
    return errorResponse(res, error.message || 'Failed to get slots', 500);
  }
};

export const createTurfSlot = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { sportId, slotDate, startTime, endTime, basePrice } = req.body;

    if (!req.user) {
      return errorResponse(res, 'Unauthorized', 401);
    }

    // Check ownership
    const turf = await prisma.turf.findUnique({ where: { id } });
    if (!turf) {
      return errorResponse(res, 'Turf not found', 404);
    }

    if (turf.ownerId !== req.user.userId && req.user.role !== 'admin') {
      return errorResponse(res, 'Forbidden', 403);
    }

    const slot = await prisma.turfSlot.create({
      data: {
        turfId: id,
        sportId,
        slotDate: new Date(slotDate),
        startTime: new Date(`1970-01-01T${startTime}`),
        endTime: new Date(`1970-01-01T${endTime}`),
        basePrice,
      },
      include: {
        sport: true,
      },
    });

    return successResponse(res, slot, 'Slot created successfully', 201);
  } catch (error: any) {
    console.error('Create slot error:', error);
    return errorResponse(res, error.message || 'Failed to create slot', 500);
  }
};