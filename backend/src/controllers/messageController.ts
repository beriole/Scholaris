import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const qStr = (v: unknown): string | undefined =>
    typeof v === 'string' ? v : Array.isArray(v) ? String(v[0]) : undefined;
const pStr = (v: string | string[]): string => Array.isArray(v) ? v[0] : v;

// GET /api/messages/inbox?page=1
export const getInbox = async (req: Request, res: Response) => {
    const userId    = req.user!.id;
    const tenant_id = req.user!.tenant_id;
    const page      = parseInt(qStr(req.query.page) ?? '1');
    const limit     = 20;

    try {
        const [messages, total, unreadCount] = await Promise.all([
            prisma.messages.findMany({
                where: { destinataire_id: userId, tenant_id, message_parent_id: null },
                include: {
                    expediteur: {
                        select: { id: true, email: true, role: true,
                                  profil_enseignant: { select: { nom: true, prenom: true } } },
                    },
                },
                orderBy: { created_at: 'desc' },
                skip:  (page - 1) * limit,
                take:  limit,
            }),
            prisma.messages.count({
                where: { destinataire_id: userId, tenant_id, message_parent_id: null },
            }),
            prisma.messages.count({
                where: { destinataire_id: userId, tenant_id, est_lu: false },
            }),
        ]);
        res.json({ messages, total, unreadCount, page, limit });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur.' });
    }
};

// GET /api/messages/sent?page=1
export const getSent = async (req: Request, res: Response) => {
    const userId    = req.user!.id;
    const tenant_id = req.user!.tenant_id;
    const page      = parseInt(qStr(req.query.page) ?? '1');
    const limit     = 20;

    try {
        const [messages, total] = await Promise.all([
            prisma.messages.findMany({
                where: { expediteur_id: userId, tenant_id, message_parent_id: null },
                include: {
                    destinataire: {
                        select: { id: true, email: true, role: true,
                                  profil_enseignant: { select: { nom: true, prenom: true } } },
                    },
                },
                orderBy: { created_at: 'desc' },
                skip:  (page - 1) * limit,
                take:  limit,
            }),
            prisma.messages.count({ where: { expediteur_id: userId, tenant_id, message_parent_id: null } }),
        ]);
        res.json({ messages, total, page, limit });
    } catch (error) {
        res.status(500).json({ error: 'Erreur.' });
    }
};

// GET /api/messages/:id  (message + réponses)
export const getMessage = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const id     = pStr(req.params.id);

    try {
        const msg = await prisma.messages.findUnique({
            where: { id },
            include: {
                expediteur:  { select: { id: true, email: true, role: true,
                                         profil_enseignant: { select: { nom: true, prenom: true } } } },
                destinataire:{ select: { id: true, email: true, role: true,
                                         profil_enseignant: { select: { nom: true, prenom: true } } } },
                reponses: {
                    include: {
                        expediteur:  { select: { id: true, email: true, role: true,
                                                 profil_enseignant: { select: { nom: true, prenom: true } } } },
                        destinataire:{ select: { id: true, email: true, role: true,
                                                 profil_enseignant: { select: { nom: true, prenom: true } } } },
                    },
                    orderBy: { created_at: 'asc' },
                },
            },
        });

        if (!msg) return res.status(404).json({ error: 'Message introuvable.' });
        if (msg.expediteur_id !== userId && msg.destinataire_id !== userId) {
            return res.status(403).json({ error: 'Accès refusé.' });
        }

        // Marquer comme lu si destinataire
        if (msg.destinataire_id === userId && !msg.est_lu) {
            await prisma.messages.update({ where: { id }, data: { est_lu: true, lu_at: new Date() } });
        }

        res.json(msg);
    } catch (error) {
        res.status(500).json({ error: 'Erreur.' });
    }
};

// POST /api/messages  Body: { destinataire_id, sujet, corps, message_parent_id? }
export const sendMessage = async (req: Request, res: Response) => {
    const userId    = req.user!.id;
    const tenant_id = req.user!.tenant_id;
    const { destinataire_id, sujet, corps, message_parent_id } = req.body;

    if (!destinataire_id || !corps) {
        return res.status(400).json({ error: 'destinataire_id et corps requis.' });
    }
    if (!message_parent_id && !sujet) {
        return res.status(400).json({ error: 'sujet requis pour un nouveau message.' });
    }

    try {
        const dest = await prisma.utilisateurs.findFirst({
            where: { id: destinataire_id, tenant_id },
        });
        if (!dest) return res.status(404).json({ error: 'Destinataire introuvable.' });

        const msg = await prisma.messages.create({
            data: {
                tenant_id,
                expediteur_id:    userId,
                destinataire_id,
                sujet:            sujet ?? '',
                corps,
                message_parent_id: message_parent_id ?? null,
                est_lu:           false,
            },
            include: {
                expediteur:   { select: { id: true, email: true, role: true,
                                          profil_enseignant: { select: { nom: true, prenom: true } } } },
                destinataire: { select: { id: true, email: true, role: true,
                                          profil_enseignant: { select: { nom: true, prenom: true } } } },
            },
        });

        // Notification in-app automatique
        await prisma.notifications.create({
            data: {
                tenant_id,
                destinataire_id,
                type:    'message',
                canal:   'in_app',
                titre:   `Nouveau message : ${sujet ?? '(réponse)'}`,
                contenu: corps.length > 100 ? corps.slice(0, 100) + '…' : corps,
                est_lue: false,
            },
        });

        res.status(201).json(msg);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de l\'envoi.' });
    }
};

// PUT /api/messages/:id/read
export const markAsRead = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const id     = pStr(req.params.id);
    try {
        await prisma.messages.updateMany({
            where: { id, destinataire_id: userId },
            data:  { est_lu: true, lu_at: new Date() },
        });
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: 'Erreur.' });
    }
};

// DELETE /api/messages/:id
export const deleteMessage = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const id     = pStr(req.params.id);
    try {
        const msg = await prisma.messages.findUnique({ where: { id } });
        if (!msg) return res.status(404).json({ error: 'Message introuvable.' });
        if (msg.expediteur_id !== userId && msg.destinataire_id !== userId) {
            return res.status(403).json({ error: 'Accès refusé.' });
        }
        await prisma.messages.delete({ where: { id } });
        res.json({ message: 'Supprimé.' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur.' });
    }
};

// GET /api/messages/contacts  — utilisateurs joignables (toujours du même établissement)
export const getContacts = async (req: Request, res: Response) => {
    const tenant_id = req.user!.tenant_id;
    const userId    = req.user!.id;

    try {
        // La messagerie est interne à l'établissement : sendMessage et getInbox étant
        // scopés par tenant_id, on ne propose que les contacts du même tenant — sinon
        // l'envoi échoue (404 « Destinataire introuvable ») et le message n'arrive jamais.
        const where: any = { id: { not: userId }, est_actif: true, tenant_id };

        const users = await prisma.utilisateurs.findMany({
            where,
            select: {
                id: true, email: true, role: true,
                profil_enseignant: { select: { nom: true, prenom: true } },
            },
            orderBy: { email: 'asc' },
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Erreur.' });
    }
};
