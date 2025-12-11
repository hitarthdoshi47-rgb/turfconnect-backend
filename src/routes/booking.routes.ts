import { Router } from 'express';
import {
  createBooking,
  getBookings,
  getBookingById,
  cancelBooking,
} from '../controllers/booking.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/', authenticate, createBooking);
router.get('/', authenticate, getBookings);
router.get('/:id', authenticate, getBookingById);
router.put('/:id/cancel', authenticate, cancelBooking);

export default router;