import { Router } from 'express';
import { authenticateJWT, requireRole } from '../middlewares/authMiddleware';
import {
    getTimetable, getTeacherTimetable,
    createSlot, updateSlot, deleteSlot,
    getSalles, createSalle,
} from '../controllers/timetableController';

const router = Router();
router.use(authenticateJWT);

// Lecture — tout le monde peut voir
router.get('/',         requireRole(['super_admin', 'admin_ecole', 'enseignant']), getTimetable);
router.get('/teacher',  requireRole(['super_admin', 'admin_ecole', 'enseignant']), getTeacherTimetable);
router.get('/salles',   requireRole(['super_admin', 'admin_ecole', 'enseignant']), getSalles);

// Écriture — admin seulement
router.post('/',              requireRole(['super_admin', 'admin_ecole']), createSlot);
router.put('/:id',            requireRole(['super_admin', 'admin_ecole']), updateSlot);
router.delete('/:id',         requireRole(['super_admin', 'admin_ecole']), deleteSlot);
router.post('/salles',        requireRole(['super_admin', 'admin_ecole']), createSalle);

export default router;
