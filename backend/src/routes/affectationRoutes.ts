import { Router } from 'express';
import { authenticateJWT, requireRole } from '../middlewares/authMiddleware';
import {
    getAffectations, getTeacherAffectations, createAffectation,
    updateAffectation, deleteAffectation, bulkAffectation,
} from '../controllers/affectationController';

const router = Router();
router.use(authenticateJWT);

router.get('/',                      requireRole(['super_admin', 'admin_ecole', 'enseignant']), getAffectations);
router.get('/teacher/:enseignant_id',requireRole(['super_admin', 'admin_ecole', 'enseignant']), getTeacherAffectations);
router.post('/',                     requireRole(['super_admin', 'admin_ecole']), createAffectation);
router.post('/bulk',                 requireRole(['super_admin', 'admin_ecole']), bulkAffectation);
router.put('/:id',                   requireRole(['super_admin', 'admin_ecole']), updateAffectation);
router.delete('/:id',                requireRole(['super_admin', 'admin_ecole']), deleteAffectation);

export default router;
