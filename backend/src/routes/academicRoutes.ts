import { Router } from 'express';
import {
    createSchoolYear,
    getSchoolYears,
    createClass,
    getClasses,
    getSubjectGroups,
    createSubjectGroup,
    deleteSubjectGroup,
    createSubject,
    updateSubject,
    deleteSubject,
} from '../controllers/academicController';
import { authenticateJWT, requireRole } from '../middlewares/authMiddleware';

const router = Router();

// Toutes les routes académiques requièrent une session admin.
router.use(authenticateJWT);
router.use(requireRole(['super_admin', 'admin_ecole']));

// Années Scolaires
router.post('/years', createSchoolYear);
router.get('/years/:ecole_id', getSchoolYears);

// Classes
router.post('/classes', createClass);
router.get('/classes/:annee_id', getClasses);

// Matières
router.post('/subject-groups', createSubjectGroup);
router.get('/subject-groups/:ecole_id', getSubjectGroups);
router.delete('/subject-groups/:id', deleteSubjectGroup);
router.post('/subjects', createSubject);
router.put('/subjects/:id', updateSubject);
router.delete('/subjects/:id', deleteSubject);

export default router;
