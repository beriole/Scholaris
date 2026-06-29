import { Router } from 'express';
import { authenticateJWT, requireRole } from '../middlewares/authMiddleware';
import {
    getGradeSheet, saveBulkGrades, getClassGradeSummary, getStudentGrades,
} from '../controllers/gradeController';

const router = Router();
router.use(authenticateJWT);

router.get('/sheet', requireRole(['super_admin', 'admin_ecole', 'enseignant']), getGradeSheet);
router.get('/class-summary', requireRole(['super_admin', 'admin_ecole', 'enseignant']), getClassGradeSummary);
router.get('/student/:inscription_id', requireRole(['super_admin', 'admin_ecole', 'enseignant']), getStudentGrades);
router.post('/bulk', requireRole(['super_admin', 'admin_ecole', 'enseignant']), saveBulkGrades);

export default router;
