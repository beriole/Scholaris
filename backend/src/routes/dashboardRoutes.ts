import { Router } from 'express';
import { authenticateJWT, requireRole } from '../middlewares/authMiddleware';
import { getSchoolDashboardStats } from '../controllers/dashboardController';

const router = Router();
router.use(authenticateJWT);
router.use(requireRole(['super_admin', 'admin_ecole']));

router.get('/stats', getSchoolDashboardStats);

export default router;
