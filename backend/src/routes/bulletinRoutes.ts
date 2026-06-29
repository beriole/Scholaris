import { Router } from 'express';
import { authenticateJWT, requireRole } from '../middlewares/authMiddleware';
import {
    generateClassBulletins, getClassBulletins, getStudentBulletin, getAllStudentBulletins,
} from '../controllers/bulletinController';

const router = Router();
router.use(authenticateJWT);
router.use(requireRole(['super_admin', 'admin_ecole', 'enseignant']));

router.post('/generate', requireRole(['super_admin', 'admin_ecole']), generateClassBulletins);
router.get('/class', getClassBulletins);
router.get('/student/:inscription_id', getAllStudentBulletins);
router.get('/:inscription_id/:periode_id', getStudentBulletin);

export default router;
