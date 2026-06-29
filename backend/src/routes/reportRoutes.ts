import { Router } from 'express';
import { authenticateJWT, requireRole } from '../middlewares/authMiddleware';
import { getAcademicReport, getAttendanceReport, getFinanceReport } from '../controllers/reportController';

const router = Router();
router.use(authenticateJWT);
router.use(requireRole(['super_admin', 'admin_ecole']));

router.get('/academic',   getAcademicReport);
router.get('/attendance', getAttendanceReport);
router.get('/finance',    getFinanceReport);

export default router;
