import { Router } from 'express';
import {
  createTurf,
  getTurfs,
  getTurfById,
  updateTurf,
  deleteTurf,
  getTurfSlots,
  createTurfSlot,
} from '../controllers/turf.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getTurfs);
router.get('/:id', getTurfById);
router.post('/', authenticate, authorize('turf_owner', 'admin'), createTurf);
router.put('/:id', authenticate, authorize('turf_owner', 'admin'), updateTurf);
router.delete('/:id', authenticate, authorize('turf_owner', 'admin'), deleteTurf);

router.get('/:id/slots', getTurfSlots);
router.post('/:id/slots', authenticate, authorize('turf_owner', 'admin'), createTurfSlot);

export default router;