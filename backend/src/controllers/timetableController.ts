import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const getEcoleId = async (tenant_id: string): Promise<string | null> => {
    const ecole = await prisma.ecoles.findFirst({ where: { tenant_id }, select: { id: true } });
    return ecole?.id ?? null;
};

const qStr = (v: unknown): string | undefined =>
    typeof v === 'string' ? v : Array.isArray(v) ? String(v[0]) : undefined;

const pStr = (v: string | string[]): string => Array.isArray(v) ? v[0] : v;

// Convertit "HH:MM" en objet Date (date aujourd'hui, heure donnée)
const timeStr = (t: string): Date => {
    const [h, m] = t.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
};

// ── Créneaux ──────────────────────────────────────────────────────────────────

// GET /api/timetable?classe_id=...&annee_id=...
export const getTimetable = async (req: Request, res: Response) => {
    const classe_id = qStr(req.query.classe_id);
    const annee_id  = qStr(req.query.annee_id);

    if (!classe_id) return res.status(400).json({ error: 'classe_id requis.' });

    try {
        const where: any = { classe_id, est_actif: true };
        if (annee_id) where.annee_id = annee_id;

        const slots = await prisma.emplois_du_temps.findMany({
            where,
            include: {
                matiere:    { select: { id: true, nom: true, code: true, coefficient: true } },
                enseignant: { select: { id: true, nom: true, prenom: true } },
                salle:      { select: { id: true, nom: true, type: true } },
                classe:     { select: { id: true, nom: true, niveau: true } },
            },
            orderBy: [{ jour_semaine: 'asc' }, { heure_debut: 'asc' }],
        });
        res.json(slots);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la récupération de l\'emploi du temps.' });
    }
};

// GET /api/timetable/teacher?enseignant_id=...&annee_id=...
export const getTeacherTimetable = async (req: Request, res: Response) => {
    const enseignant_id = qStr(req.query.enseignant_id);
    const annee_id      = qStr(req.query.annee_id);

    if (!enseignant_id) return res.status(400).json({ error: 'enseignant_id requis.' });

    try {
        const where: any = { enseignant_id, est_actif: true };
        if (annee_id) where.annee_id = annee_id;

        const slots = await prisma.emplois_du_temps.findMany({
            where,
            include: {
                matiere: { select: { id: true, nom: true, code: true } },
                classe:  { select: { id: true, nom: true, niveau: true } },
                salle:   { select: { id: true, nom: true } },
            },
            orderBy: [{ jour_semaine: 'asc' }, { heure_debut: 'asc' }],
        });
        res.json(slots);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération.' });
    }
};

// POST /api/timetable
// Body: { classe_id, matiere_id, enseignant_id, annee_id, jour_semaine, heure_debut, heure_fin, salle_id? }
export const createSlot = async (req: Request, res: Response) => {
    const { classe_id, matiere_id, enseignant_id, annee_id, jour_semaine, heure_debut, heure_fin, salle_id } = req.body;

    if (!classe_id || !matiere_id || !enseignant_id || !annee_id || !jour_semaine || !heure_debut || !heure_fin) {
        return res.status(400).json({ error: 'classe_id, matiere_id, enseignant_id, annee_id, jour_semaine, heure_debut et heure_fin requis.' });
    }

    const jour = parseInt(jour_semaine);
    if (isNaN(jour) || jour < 1 || jour > 6) {
        return res.status(400).json({ error: 'jour_semaine doit être entre 1 (Lun) et 6 (Sam).' });
    }

    try {
        // Vérification des conflits enseignant
        const conflitEnseignant = await prisma.emplois_du_temps.findFirst({
            where: {
                enseignant_id,
                annee_id,
                jour_semaine: jour,
                est_actif: true,
                OR: [
                    { heure_debut: { lt: timeStr(heure_fin) },   heure_fin: { gt: timeStr(heure_debut) } },
                ],
            },
        });
        if (conflitEnseignant) {
            return res.status(409).json({ error: 'Conflit : l\'enseignant a déjà un cours à ce créneau.' });
        }

        // Vérification des conflits classe
        const conflitClasse = await prisma.emplois_du_temps.findFirst({
            where: {
                classe_id,
                annee_id,
                jour_semaine: jour,
                est_actif: true,
                OR: [
                    { heure_debut: { lt: timeStr(heure_fin) }, heure_fin: { gt: timeStr(heure_debut) } },
                ],
            },
        });
        if (conflitClasse) {
            return res.status(409).json({ error: 'Conflit : la classe a déjà un cours à ce créneau.' });
        }

        const slot = await prisma.emplois_du_temps.create({
            data: {
                classe_id,
                matiere_id,
                enseignant_id,
                annee_id,
                salle_id: salle_id || null,
                jour_semaine: jour,
                heure_debut:  timeStr(heure_debut),
                heure_fin:    timeStr(heure_fin),
                est_actif:    true,
            },
            include: {
                matiere:    { select: { id: true, nom: true, code: true } },
                enseignant: { select: { id: true, nom: true, prenom: true } },
                salle:      { select: { id: true, nom: true } },
            },
        });

        res.status(201).json(slot);
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la création du créneau.' });
    }
};

// PUT /api/timetable/:id
export const updateSlot = async (req: Request, res: Response) => {
    const id = pStr(req.params.id);
    const { matiere_id, enseignant_id, jour_semaine, heure_debut, heure_fin, salle_id, est_actif, motif_annulation } = req.body;

    try {
        const data: any = {};
        if (matiere_id)        data.matiere_id        = matiere_id;
        if (enseignant_id)     data.enseignant_id     = enseignant_id;
        if (salle_id !== undefined) data.salle_id     = salle_id || null;
        if (est_actif !== undefined) data.est_actif   = est_actif;
        if (motif_annulation)  data.motif_annulation  = motif_annulation;
        if (jour_semaine)      data.jour_semaine       = parseInt(jour_semaine);
        if (heure_debut)       data.heure_debut        = timeStr(heure_debut);
        if (heure_fin)         data.heure_fin          = timeStr(heure_fin);

        const updated = await prisma.emplois_du_temps.update({
            where: { id },
            data,
            include: {
                matiere:    { select: { id: true, nom: true, code: true } },
                enseignant: { select: { id: true, nom: true, prenom: true } },
                salle:      { select: { id: true, nom: true } },
            },
        });
        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour.' });
    }
};

// DELETE /api/timetable/:id
export const deleteSlot = async (req: Request, res: Response) => {
    const id = pStr(req.params.id);
    try {
        await prisma.emplois_du_temps.delete({ where: { id } });
        res.json({ message: 'Créneau supprimé.' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la suppression.' });
    }
};

// ── Salles ────────────────────────────────────────────────────────────────────

// GET /api/timetable/salles
export const getSalles = async (req: Request, res: Response) => {
    const tenant_id = req.user!.tenant_id;
    try {
        const ecole_id = await getEcoleId(tenant_id);
        if (!ecole_id) return res.status(404).json({ error: 'École introuvable.' });

        const salles = await prisma.salles.findMany({
            where: { ecole_id },
            orderBy: { nom: 'asc' },
        });
        res.json(salles);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération des salles.' });
    }
};

// POST /api/timetable/salles
export const createSalle = async (req: Request, res: Response) => {
    const tenant_id = req.user!.tenant_id;
    const { nom, capacite, type } = req.body;
    if (!nom || !capacite || !type) return res.status(400).json({ error: 'nom, capacite et type requis.' });

    try {
        const ecole_id = await getEcoleId(tenant_id);
        if (!ecole_id) return res.status(404).json({ error: 'École introuvable.' });

        const salle = await prisma.salles.create({
            data: { ecole_id, nom, capacite: parseInt(capacite), type, est_disponible: true },
        });
        res.status(201).json(salle);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la création de la salle.' });
    }
};
