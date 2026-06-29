import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const qStr = (v: unknown): string | undefined =>
    typeof v === 'string' ? v : Array.isArray(v) ? String(v[0]) : undefined;
const pStr = (v: string | string[]): string => Array.isArray(v) ? v[0] : v;

// GET /api/affectations?classe_id=...&annee_id=...
export const getAffectations = async (req: Request, res: Response) => {
    const classe_id = qStr(req.query.classe_id);
    const annee_id  = qStr(req.query.annee_id);

    if (!classe_id || !annee_id) {
        return res.status(400).json({ error: 'classe_id et annee_id requis.' });
    }

    try {
        const affectations = await prisma.affectations_matieres.findMany({
            where: { classe_id, annee_id, est_actif: true },
            include: {
                matiere:    { select: { id: true, nom: true, code: true, coefficient: true } },
                enseignant: { select: { id: true, nom: true, prenom: true, matricule: true, specialite: true } },
            },
            orderBy: { matiere: { nom: 'asc' } },
        });
        res.json(affectations);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération des affectations.' });
    }
};

// GET /api/affectations/teacher/:enseignant_id?annee_id=...
export const getTeacherAffectations = async (req: Request, res: Response) => {
    const enseignant_id = pStr(req.params.enseignant_id);
    const annee_id      = qStr(req.query.annee_id);

    try {
        const where: any = { enseignant_id, est_actif: true };
        if (annee_id) where.annee_id = annee_id;

        const affectations = await prisma.affectations_matieres.findMany({
            where,
            include: {
                matiere: { select: { id: true, nom: true, code: true, coefficient: true } },
                classe:  { select: { id: true, nom: true, niveau: true } },
            },
            orderBy: [{ classe: { nom: 'asc' } }, { matiere: { nom: 'asc' } }],
        });
        res.json(affectations);
    } catch (error) {
        res.status(500).json({ error: 'Erreur.' });
    }
};

// POST /api/affectations  Body: { classe_id, matiere_id, enseignant_id, annee_id, volume_horaire?, coefficient? }
export const createAffectation = async (req: Request, res: Response) => {
    const { classe_id, matiere_id, enseignant_id, annee_id, volume_horaire, coefficient } = req.body;

    if (!classe_id || !matiere_id || !enseignant_id || !annee_id) {
        return res.status(400).json({ error: 'classe_id, matiere_id, enseignant_id et annee_id requis.' });
    }

    try {
        // Vérifier doublon actif
        const existing = await prisma.affectations_matieres.findFirst({
            where: { classe_id, matiere_id, annee_id, est_actif: true },
        });
        if (existing) {
            return res.status(409).json({ error: 'Cette matière est déjà affectée à un enseignant dans cette classe pour cette année.' });
        }

        const aff = await prisma.affectations_matieres.create({
            data: {
                classe_id, matiere_id, enseignant_id, annee_id,
                volume_horaire: volume_horaire ? parseInt(volume_horaire) : null,
                coefficient:    coefficient    ? parseInt(coefficient)    : null,
                est_actif: true,
            },
            include: {
                matiere:    { select: { id: true, nom: true, code: true, coefficient: true } },
                enseignant: { select: { id: true, nom: true, prenom: true } },
                classe:     { select: { id: true, nom: true, niveau: true } },
            },
        });
        res.status(201).json(aff);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la création.' });
    }
};

// PUT /api/affectations/:id
export const updateAffectation = async (req: Request, res: Response) => {
    const id = pStr(req.params.id);
    const { enseignant_id, volume_horaire, coefficient, est_actif } = req.body;
    try {
        const data: any = {};
        if (enseignant_id  !== undefined) data.enseignant_id  = enseignant_id;
        if (volume_horaire !== undefined) data.volume_horaire = parseInt(volume_horaire);
        if (coefficient    !== undefined) data.coefficient    = coefficient ? parseInt(coefficient) : null;
        if (est_actif      !== undefined) data.est_actif      = est_actif;

        const updated = await prisma.affectations_matieres.update({
            where: { id },
            data,
            include: {
                matiere:    { select: { id: true, nom: true, code: true } },
                enseignant: { select: { id: true, nom: true, prenom: true } },
            },
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la mise à jour.' });
    }
};

// DELETE /api/affectations/:id  (désactive)
export const deleteAffectation = async (req: Request, res: Response) => {
    const id = pStr(req.params.id);
    try {
        await prisma.affectations_matieres.update({ where: { id }, data: { est_actif: false } });
        res.json({ message: 'Affectation supprimée.' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur.' });
    }
};

// POST /api/affectations/bulk  — affecter toutes les matières d'une classe à un enseignant
// Body: { classe_id, annee_id, assignments: [{ matiere_id, enseignant_id, volume_horaire? }] }
export const bulkAffectation = async (req: Request, res: Response) => {
    const { classe_id, annee_id, assignments } = req.body;
    if (!classe_id || !annee_id || !Array.isArray(assignments)) {
        return res.status(400).json({ error: 'classe_id, annee_id et assignments requis.' });
    }

    try {
        // Désactiver les anciennes affectations de la classe/année
        await prisma.affectations_matieres.updateMany({
            where: { classe_id, annee_id },
            data:  { est_actif: false },
        });

        // Créer les nouvelles
        const created = await prisma.$transaction(
            assignments.map((a: any) =>
                prisma.affectations_matieres.create({
                    data: {
                        classe_id,
                        annee_id,
                        matiere_id:    a.matiere_id,
                        enseignant_id: a.enseignant_id,
                        volume_horaire: a.volume_horaire ? parseInt(a.volume_horaire) : null,
                        est_actif: true,
                    },
                })
            )
        );
        res.status(201).json({ message: `${created.length} affectation(s) créée(s).`, count: created.length });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de l\'affectation en masse.' });
    }
};
