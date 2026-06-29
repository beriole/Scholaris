import { Router } from 'express';
import { authenticateJWT, requireRole } from '../middlewares/authMiddleware';
import {
    getNotifications, markNotificationRead, markAllRead, broadcastNotification,
} from '../controllers/notificationController';

const router = Router();
router.use(authenticateJWT);

router.get('/',                    getNotifications);
router.put('/read-all',            markAllRead);
router.put('/:id/read',            markNotificationRead);
router.post('/broadcast',          requireRole(['super_admin', 'admin_ecole']), broadcastNotification);

export default router;
