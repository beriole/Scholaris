import { Router } from 'express';
import { authenticateJWT, requireRole } from '../middlewares/authMiddleware';
import {
    createStudent,
    getStudents,
    getStudentById,
    updateStudent,
    archiveStudent,
    getStudentCount,
    getStudentsByClass,
} from '../controllers/studentController';

const router = Router();

router.use(authenticateJWT);
router.use(requireRole(['super_admin', 'admin_ecole', 'enseignant']));

router.get('/', getStudents);
router.get('/count', getStudentCount);
router.get('/class/:classe_id', getStudentsByClass);
router.get('/:id', getStudentById);
router.post('/', requireRole(['super_admin', 'admin_ecole']), createStudent);
router.put('/:id', requireRole(['super_admin', 'admin_ecole']), updateStudent);
router.patch('/:id/archive', requireRole(['super_admin', 'admin_ecole']), archiveStudent);

export default router;
