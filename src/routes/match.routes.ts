import { Router } from 'express';
import {
  createMatch,
  getMatches,
  getMatchById,
  joinMatch,
  leaveMatch,
  cancelMatch,
} from '../controllers/match.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/', authenticate, createMatch);
router.get('/', getMatches);
router.get('/:id', getMatchById);
router.post('/:id/join', authenticate, joinMatch);
router.delete('/:id/leave', authenticate, leaveMatch);
router.put('/:id/cancel', authenticate, cancelMatch);

export default router;