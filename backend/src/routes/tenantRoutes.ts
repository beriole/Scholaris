import { Router } from 'express';
import { getGlobalStats, listTenants } from '../controllers/tenantController';
import { authenticateJWT, requireRole } from '../middlewares/authMiddleware';

const router = Router();

// Statistiques et liste de tous les tenants : réservé au super_admin de la plateforme.
router.use(authenticateJWT);
router.use(requireRole(['super_admin']));

router.get('/stats', getGlobalStats);
router.get('/list', listTenants);

export default router;
