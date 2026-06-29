import { Router } from 'express';
import { login, register, setupSuperAdmin, requestPasswordReset, resetPasswordWithOTP } from '../controllers/authController';

const router = Router();

// Création d'un établissement + admin_ecole (appelé par le Super Admin connecté)
router.post('/register', register);

// Configuration initiale de la plateforme — crée le Super Admin (une seule fois)
router.post('/setup', setupSuperAdmin);

// Route de connexion
router.post('/login', login);

// Route pour demander un OTP
router.post('/password/request-reset', requestPasswordReset);

// Route pour soumettre l'OTP et le nouveau mot de passe
router.post('/password/reset', resetPasswordWithOTP);

export default router;
