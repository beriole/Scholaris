import { Router } from 'express';
import { authenticateJWT, requireRole } from '../middlewares/authMiddleware';
import {
    getSchoolSettings, updateSchoolSettings, setActiveYear,
    getProfile, updateProfile, changePassword,
} from '../controllers/settingsController';

const router = Router();
router.use(authenticateJWT);

// Paramètres école — admin seulement
router.get('/school',       requireRole(['super_admin', 'admin_ecole']), getSchoolSettings);
router.put('/school',       requireRole(['super_admin', 'admin_ecole']), updateSchoolSettings);
router.put('/active-year',  requireRole(['super_admin', 'admin_ecole']), setActiveYear);

// Profil — tout utilisateur connecté
router.get('/profile',      getProfile);
router.put('/profile',      updateProfile);
router.put('/password',     changePassword);

export default router;
