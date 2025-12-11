import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.util';

const prisma = new PrismaClient();

export const createMatch = async (req: AuthRequest, res: Response) => {
  try {
    const {
      bookingId,
      sportId,
      totalSlots,
      pricePerPlayer,
      skillLevelRequired,
      matchType,
      description,
    } = req.body;

    if (!req.user) {
      return errorResponse(res, 'Unauthorized', 401);
    }

    // Verify booking belongs to user
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { slot: true },
    });

    if (!booking) {
      return errorResponse(res, 'Booking not found', 404);
    }

    if (booking.bookerId !== req.user.userId) {
      return errorResponse(res, 'Forbidden', 403);
    }

    // Create match
    const match = await prisma.match.create({
      data: {
        bookingId,
        hostId: req.user.userId,
        sportId,
        turfId: booking.turfId,
        slotId: booking.slotId,
        matchDate: booking.slot.slotDate,
        startTime: booking.slot.startTime,
        endTime: booking.slot.endTime,
        totalSlots,
        pricePerPlayer,
        skillLevelRequired,
        matchType,
        description,
      },
      include: {
        host: {
          select: {
            id: true,
            fullName: true,
            profilePicture: true,
          },
        },
        sport: true,
        turf: true,
      },
    });

    // Add host as first participant
    await prisma.matchParticipant.create({
      data: {
        matchId: match.id,
        userId: req.user.userId,
        paymentStatus: 'completed',
      },
    });

    return successResponse(res, match, 'Match created successfully', 201);
  } catch (error: any) {
    console.error('Create match error:', error);
    return errorResponse(res, error.message || 'Failed to create match', 500);
  }
};

export const getMatches = async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 10,
      city,
      sportId,
      status = 'open',
      skillLevel,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      matchStatus: status,
    };

    if (sportId) {
      where.sportId = Number(sportId);
    }

    if (skillLevel) {
      where.skillLevelRequired = skillLevel;
    }

    if (city) {
      where.turf = {
        city: city,
      };
    }

    const [matches, total] = await Promise.all([
      prisma.match.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          host: {
            select: {
              id: true,
              fullName: true,
              profilePicture: true,
            },
          },
          sport: true,
          turf: {
            select: {
              id: true,
              name: true,
              address: true,
              city: true,
            },
          },
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  profilePicture: true,
                },
              },
            },
          },
        },
        orderBy: {
          matchDate: 'asc',
        },
      }),
      prisma.match.count({ where }),
    ]);

    return paginatedResponse(
      res,
      matches,
      Number(page),
      Number(limit),
      total
    );
  } catch (error: any) {
    console.error('Get matches error:', error);
    return errorResponse(res, error.message || 'Failed to get matches', 500);
  }
};

export const getMatchById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        host: {
          select: {
            id: true,
            fullName: true,
            profilePicture: true,
            phone: true,
          },
        },
        sport: true,
        turf: true,
        participants: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                profilePicture: true,
              },
            },
          },
        },
      },
    });

    if (!match) {
      return errorResponse(res, 'Match not found', 404);
    }

    return successResponse(res, match);
  } catch (error: any) {
    console.error('Get match error:', error);
    return errorResponse(res, error.message || 'Failed to get match', 500);
  }
};

export const joinMatch = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return errorResponse(res, 'Unauthorized', 401);
    }

    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        participants: true,
      },
    });

    if (!match) {
      return errorResponse(res, 'Match not found', 404);
    }

    if (match.matchStatus !== 'open') {
      return errorResponse(res, 'Match is not open for joining', 400);
    }

    if (match.filledSlots >= match.totalSlots) {
      return errorResponse(res, 'Match is full', 400);
    }

    // Check if already joined
    const alreadyJoined = match.participants.some(
      (p) => p.userId === req.user!.userId
    );

    if (alreadyJoined) {
      return errorResponse(res, 'Already joined this match', 400);
    }

    // Add participant
    await prisma.matchParticipant.create({
      data: {
        matchId: id,
        userId: req.user.userId,
        paymentStatus: 'pending',
      },
    });

    // Update filled slots
    const updatedMatch = await prisma.match.update({
      where: { id },
      data: {
        filledSlots: match.filledSlots + 1,
        matchStatus:
          match.filledSlots + 1 >= match.totalSlots ? 'full' : 'open',
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                profilePicture: true,
              },
            },
          },
        },
      },
    });

    // TODO: Process payment

    return successResponse(res, updatedMatch, 'Joined match successfully');
  } catch (error: any) {
    console.error('Join match error:', error);
    return errorResponse(res, error.message || 'Failed to join match', 500);
  }
};

export const leaveMatch = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return errorResponse(res, 'Unauthorized', 401);
    }

    const match = await prisma.match.findUnique({
      where: { id },
    });

    if (!match) {
      return errorResponse(res, 'Match not found', 404);
    }

    if (match.hostId === req.user.userId) {
      return errorResponse(res, 'Host cannot leave match. Cancel it instead.', 400);
    }

    // Remove participant
    await prisma.matchParticipant.deleteMany({
      where: {
        matchId: id,
        userId: req.user.userId,
      },
    });

    // Update filled slots
    await prisma.match.update({
      where: { id },
      data: {
        filledSlots: match.filledSlots - 1,
        matchStatus: 'open',
      },
    });

    // TODO: Process refund

    return successResponse(res, null, 'Left match successfully');
  } catch (error: any) {
    console.error('Leave match error:', error);
    return errorResponse(res, error.message || 'Failed to leave match', 500);
  }
};

export const cancelMatch = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return errorResponse(res, 'Unauthorized', 401);
    }

    const match = await prisma.match.findUnique({
      where: { id },
    });

    if (!match) {
      return errorResponse(res, 'Match not found', 404);
    }

    if (match.hostId !== req.user.userId && req.user.role !== 'admin') {
      return errorResponse(res, 'Forbidden', 403);
    }

    await prisma.match.update({
      where: { id },
      data: {
        matchStatus: 'cancelled',
      },
    });

    // TODO: Notify participants and process refunds

    return successResponse(res, null, 'Match cancelled successfully');
  } catch (error: any) {
    console.error('Cancel match error:', error);
    return errorResponse(res, error.message || 'Failed to cancel match', 500);
  }
};