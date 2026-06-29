import { Router } from 'express';
import { authenticateJWT, requireRole } from '../middlewares/authMiddleware';
import {
    createTranche, getTranches, deleteTranche,
    recordPayment, deletePayment, checkFapshiStatus,
    getClassPaymentStatus, getFinanceStats, getStudentPayments,
} from '../controllers/financeController';

const router = Router();
router.use(authenticateJWT);
router.use(requireRole(['super_admin', 'admin_ecole']));

// Tranches
router.get('/tranches', getTranches);
router.post('/tranches', createTranche);
router.delete('/tranches/:id', deleteTranche);

// Paiements
router.post('/payments', recordPayment);
router.delete('/payments/:id', deletePayment);
router.get('/payments/fapshi-status/:transId', checkFapshiStatus);
router.get('/payments/student/:inscription_id', getStudentPayments);

// Tableaux de bord
router.get('/stats', getFinanceStats);
router.get('/class-status', getClassPaymentStatus);

export default router;
