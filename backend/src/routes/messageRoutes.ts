import { Router } from 'express';
import { authenticateJWT } from '../middlewares/authMiddleware';
import {
    getInbox, getSent, getMessage, sendMessage,
    markAsRead, deleteMessage, getContacts,
} from '../controllers/messageController';

const router = Router();
router.use(authenticateJWT);

router.get('/contacts', getContacts);
router.get('/inbox',    getInbox);
router.get('/sent',     getSent);
router.get('/:id',      getMessage);
router.post('/',        sendMessage);
router.put('/:id/read', markAsRead);
router.delete('/:id',   deleteMessage);

export default router;
