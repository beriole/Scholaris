import { Router } from 'express';
import { authenticateJWT, requireRole } from '../middlewares/authMiddleware';
import {
    setupSequences, getSequences, getSequencesByYear,
    setupEvalTypes, getEvalTypes,
} from '../controllers/evaluationController';

const router = Router();
router.use(authenticateJWT);

const ADMIN = ['super_admin', 'admin_ecole'];
const ALL   = ['super_admin', 'admin_ecole', 'enseignant'];

// Lecture : accessible aux enseignants (nécessaire pour la saisie des notes).
router.get('/sequences', requireRole(ALL), getSequences);
router.get('/sequences/year/:annee_id', requireRole(ALL), getSequencesByYear);
router.get('/eval-types', requireRole(ALL), getEvalTypes);

// Configuration : réservée à l'administration.
router.post('/sequences/setup', requireRole(ADMIN), setupSequences);
router.post('/eval-types/setup', requireRole(ADMIN), setupEvalTypes);

export default router;
