import { Router } from 'express';
import { authenticateJWT, requireRole } from '../middlewares/authMiddleware';
import { uploadImage } from '../controllers/uploadController';

const router = Router();
router.use(authenticateJWT);

// Upload d'image (logo école, photo élève…) — réservé à l'administration.
router.post('/', requireRole(['super_admin', 'admin_ecole']), uploadImage);

export default router;
