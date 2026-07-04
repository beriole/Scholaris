import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const qStr = (v: unknown): string | undefined =>
    typeof v === 'string' ? v : Array.isArray(v) ? String(v[0]) : undefined;
const pStr = (v: string | string[]): string => Array.isArray(v) ? v[0] : v;

const getEcoleId = async (tenant_id: string) => {
    const e = await prisma.ecoles.findFirst({ select: { id: true } });
    return e?.id ?? null;
};

// GET /api/calendar?annee_id=...&mois=2025-03
export const getEvents = async (req: Request, res: Response) => {
    const tenant_id = req.user!.tenant_id;
    const annee_id  = qStr(req.query.annee_id);
    const mois      = qStr(req.query.mois); // YYYY-MM

    try {
        const ecole_id = await getEcoleId(tenant_id);
        if (!ecole_id) return res.status(404).json({ error: 'École introuvable.' });

        const where: any = { ecole_id };
        if (annee_id) where.annee_id = annee_id;
        if (mois) {
            const [y, m] = mois.split('-').map(Number);
            const debut  = new Date(y, m - 1, 1);
            const fin    = new Date(y, m, 1);
            where.date_debut = { gte: debut, lt: fin };
        }

        const events = await prisma.calendrier_scolaire.findMany({
            where,
            include: { annee: { select: { libelle: true } } },
            orderBy: { date_debut: 'asc' },
        });
        res.json(events);
    } catch (error) {
        res.status(500).json({ error: 'Erreur.' });
    }
};

// POST /api/calendar  Body: { annee_id, date_debut, date_fin?, type, libelle, affecte_presences }
export const createEvent = async (req: Request, res: Response) => {
    const tenant_id = req.user!.tenant_id;
    const { annee_id, date_debut, date_fin, type, libelle, affecte_presences } = req.body;

    if (!annee_id || !date_debut || !type || !libelle) {
        return res.status(400).json({ error: 'annee_id, date_debut, type et libelle requis.' });
    }

    try {
        const ecole_id = await getEcoleId(tenant_id);
        if (!ecole_id) return res.status(404).json({ error: 'École introuvable.' });

        const event = await prisma.calendrier_scolaire.create({
            data: {
                ecole_id,
                annee_id,
                date_debut:         new Date(date_debut),
                date_fin:           date_fin ? new Date(date_fin) : null,
                type,
                libelle,
                affecte_presences:  affecte_presences ?? false,
            },
            include: { annee: { select: { libelle: true } } },
        });
        res.status(201).json(event);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la création.' });
    }
};

// PUT /api/calendar/:id
export const updateEvent = async (req: Request, res: Response) => {
    const id = pStr(req.params.id);
    const { date_debut, date_fin, type, libelle, affecte_presences } = req.body;
    try {
        const data: any = {};
        if (date_debut         !== undefined) data.date_debut         = new Date(date_debut);
        if (date_fin           !== undefined) data.date_fin           = date_fin ? new Date(date_fin) : null;
        if (type               !== undefined) data.type               = type;
        if (libelle            !== undefined) data.libelle            = libelle;
        if (affecte_presences  !== undefined) data.affecte_presences  = affecte_presences;

        const updated = await prisma.calendrier_scolaire.update({
            where: { id },
            data,
            include: { annee: { select: { libelle: true } } },
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la mise à jour.' });
    }
};

// DELETE /api/calendar/:id
export const deleteEvent = async (req: Request, res: Response) => {
    const id = pStr(req.params.id);
    try {
        await prisma.calendrier_scolaire.delete({ where: { id } });
        res.json({ message: 'Événement supprimé.' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur.' });
    }
};
