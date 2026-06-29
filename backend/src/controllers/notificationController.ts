import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const qStr = (v: unknown): string | undefined =>
    typeof v === 'string' ? v : Array.isArray(v) ? String(v[0]) : undefined;
const pStr = (v: string | string[]): string => Array.isArray(v) ? v[0] : v;

// GET /api/notifications?unread_only=false&limit=20
export const getNotifications = async (req: Request, res: Response) => {
    const userId     = req.user!.id;
    const unreadOnly = qStr(req.query.unread_only) === 'true';
    const limit      = parseInt(qStr(req.query.limit) ?? '30');

    try {
        const where: any = { destinataire_id: userId };
        if (unreadOnly) where.est_lue = false;

        const [notifications, unreadCount] = await Promise.all([
            prisma.notifications.findMany({
                where,
                orderBy: { created_at: 'desc' },
                take: limit,
            }),
            prisma.notifications.count({ where: { destinataire_id: userId, est_lue: false } }),
        ]);

        res.json({ notifications, unreadCount });
    } catch (error) {
        res.status(500).json({ error: 'Erreur.' });
    }
};

// PUT /api/notifications/:id/read
export const markNotificationRead = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const id     = pStr(req.params.id);
    try {
        await prisma.notifications.updateMany({
            where: { id, destinataire_id: userId },
            data:  { est_lue: true, lue_at: new Date() },
        });
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: 'Erreur.' });
    }
};

// PUT /api/notifications/read-all
export const markAllRead = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    try {
        await prisma.notifications.updateMany({
            where: { destinataire_id: userId, est_lue: false },
            data:  { est_lue: true, lue_at: new Date() },
        });
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: 'Erreur.' });
    }
};

// POST /api/notifications/broadcast  (admin only — envoyer à tous les utilisateurs du tenant)
// Body: { titre, contenu, type, roles? }
export const broadcastNotification = async (req: Request, res: Response) => {
    const tenant_id = req.user!.tenant_id;
    const { titre, contenu, type, roles } = req.body;

    if (!titre || !contenu) return res.status(400).json({ error: 'titre et contenu requis.' });

    try {
        const where: any = { tenant_id, est_actif: true };
        if (roles && Array.isArray(roles) && roles.length > 0) where.role = { in: roles };

        const users = await prisma.utilisateurs.findMany({ where, select: { id: true } });

        await prisma.notifications.createMany({
            data: users.map(u => ({
                tenant_id,
                destinataire_id: u.id,
                type:    type ?? 'annonce',
                canal:   'in_app',
                titre,
                contenu,
                est_lue: false,
            })),
        });

        res.json({ message: `Notification envoyée à ${users.length} utilisateur(s).` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur.' });
    }
};
