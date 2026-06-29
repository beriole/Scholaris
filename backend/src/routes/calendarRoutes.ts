import { Router } from 'express';
import { authenticateJWT, requireRole } from '../middlewares/authMiddleware';
import { getEvents, createEvent, updateEvent, deleteEvent } from '../controllers/calendarController';

const router = Router();
router.use(authenticateJWT);

router.get('/',     getEvents);
router.post('/',    requireRole(['super_admin', 'admin_ecole']), createEvent);
router.put('/:id',  requireRole(['super_admin', 'admin_ecole']), updateEvent);
router.delete('/:id', requireRole(['super_admin', 'admin_ecole']), deleteEvent);

export default router;
