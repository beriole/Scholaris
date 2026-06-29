import { Router } from 'express';
import { authenticateJWT, requireRole } from '../middlewares/authMiddleware';
import {
    saveSessionAttendance,
    getClassAttendance,
    getAttendanceStats,
    getStudentAttendance,
    getSession,
    getJustifications,
    updateJustification,
} from '../controllers/attendanceController';

const router = Router();
router.use(authenticateJWT);

// Saisie — enseignants et admins
router.post('/session', requireRole(['super_admin', 'admin_ecole', 'enseignant']), saveSessionAttendance);

// Lecture
router.get('/class',   requireRole(['super_admin', 'admin_ecole', 'enseignant']), getClassAttendance);
router.get('/stats',   requireRole(['super_admin', 'admin_ecole', 'enseignant']), getAttendanceStats);
router.get('/session', requireRole(['super_admin', 'admin_ecole', 'enseignant']), getSession);
router.get('/student/:eleve_id', requireRole(['super_admin', 'admin_ecole', 'enseignant']), getStudentAttendance);

// Justifications
router.get('/justifications',    requireRole(['super_admin', 'admin_ecole']), getJustifications);
router.put('/justifications/:id', requireRole(['super_admin', 'admin_ecole']), updateJustification);

export default router;
