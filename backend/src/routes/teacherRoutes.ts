import { Router } from 'express';
import { authenticateJWT, requireRole } from '../middlewares/authMiddleware';
import {
    createTeacher,
    getTeachers,
    getTeacherById,
    updateTeacher,
    deactivateTeacher,
    getTeacherCount,
    getMyProfile,
} from '../controllers/teacherController';

const router = Router();

router.use(authenticateJWT);

// Profil de l'enseignant connecté (accessible aux enseignants) — AVANT le verrou admin.
router.get('/me', requireRole(['super_admin', 'admin_ecole', 'enseignant']), getMyProfile);

// Toutes les autres routes enseignants sont réservées à l'administration.
router.use(requireRole(['super_admin', 'admin_ecole']));

router.get('/', getTeachers);
router.get('/count', getTeacherCount);
router.get('/:id', getTeacherById);
router.post('/', createTeacher);
router.put('/:id', updateTeacher);
router.patch('/:id/deactivate', deactivateTeacher);

export default router;
