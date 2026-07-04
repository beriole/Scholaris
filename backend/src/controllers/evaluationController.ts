import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const getEcoleId = async (tenant_id: string): Promise<string | null> => {
    const ecole = await prisma.ecoles.findFirst({ select: { id: true } });
    return ecole?.id ?? null;
};

const qStr = (v: unknown): string | undefined =>
    typeof v === 'string' ? v : Array.isArray(v) ? String(v[0]) : undefined;

const pStr = (v: string | string[]): string => Array.isArray(v) ? v[0] : v;

// Système camerounais MINESEC : 5 séquences → 3 trimestres
const SEQUENCES = [
    { ordre: 1, nom: 'Séquence 1' },
    { ordre: 2, nom: 'Séquence 2' },
    { ordre: 3, nom: 'Séquence 3' },
    { ordre: 4, nom: 'Séquence 4' },
    { ordre: 5, nom: 'Séquence 5' },
];

// POST /api/evaluations/sequences/setup
// Crée les 5 séquences pour une année scolaire (scope école, pas classe)
export const setupSequences = async (req: Request, res: Response) => {
    const tenant_id = req.user!.tenant_id;
    const { annee_id } = req.body;
    if (!annee_id) return res.status(400).json({ error: 'annee_id requis.' });

    try {
        const ecole_id = await getEcoleId(tenant_id);
        if (!ecole_id) return res.status(404).json({ error: 'École introuvable.' });

        const annee = await prisma.annees_scolaires.findUnique({
            where: { id: annee_id },
            select: { date_debut: true, date_fin: true },
        });

        let created = 0, skipped = 0;

        await prisma.$transaction(async (tx: any) => {
            for (const seq of SEQUENCES) {
                const existing = await tx.periodes_evaluation.findFirst({
                    where: { ecole_id, annee_id, ordre: seq.ordre, type: 'sequence' },
                });
                if (existing) { skipped++; continue; }

                await tx.periodes_evaluation.create({
                    data: {
                        ecole_id,
                        annee_id,
                        nom: seq.nom,
                        ordre: seq.ordre,
                        type: 'sequence',
                        date_debut: annee?.date_debut ?? new Date(),
                        date_fin: annee?.date_fin ?? new Date(),
                        notes_cloturees: false,
                        bulletins_publies: false,
                    },
                });
                created++;
            }
        });

        res.json({ message: `${created} séquence(s) créée(s), ${skipped} existante(s).`, created, skipped });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la création des séquences.' });
    }
};

// GET /api/evaluations/sequences?annee_id=...
export const getSequences = async (req: Request, res: Response) => {
    const tenant_id = req.user!.tenant_id;
    const annee_id  = qStr(req.query.annee_id);
    if (!annee_id) return res.status(400).json({ error: 'annee_id requis.' });

    try {
        const ecole_id = await getEcoleId(tenant_id);
        if (!ecole_id) return res.status(404).json({ error: 'École introuvable.' });

        const sequences = await prisma.periodes_evaluation.findMany({
            where: { ecole_id, annee_id, type: 'sequence' },
            orderBy: { ordre: 'asc' },
        });
        res.json(sequences);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération.' });
    }
};

// GET /api/evaluations/sequences/year/:annee_id — séquences + classes pour le hub notes
export const getSequencesByYear = async (req: Request, res: Response) => {
    const tenant_id = req.user!.tenant_id;
    const annee_id  = pStr(req.params.annee_id);

    try {
        const ecole_id = await getEcoleId(tenant_id);
        if (!ecole_id) return res.status(404).json({ error: 'École introuvable.' });

        const [sequences, trimestres, classes] = await Promise.all([
            prisma.periodes_evaluation.findMany({
                where: { ecole_id, annee_id, type: 'sequence' },
                orderBy: { ordre: 'asc' },
            }),
            prisma.periodes_evaluation.findMany({
                where: { ecole_id, annee_id, type: 'trimestre' },
                orderBy: { ordre: 'asc' },
            }),
            prisma.classes.findMany({
                where: { ecole_id, annee_id },
                select: { id: true, nom: true, niveau: true },
                orderBy: { nom: 'asc' },
            }),
        ]);

        res.json({ sequences, trimestres, classes });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération.' });
    }
};

// ── Types d'évaluation ────────────────────────────────────────────────────────

const DEFAULT_EVAL_TYPES = [
    { nom: 'Devoir 1',    code: 'D1',   ponderation: 1 },
    { nom: 'Devoir 2',    code: 'D2',   ponderation: 1 },
    { nom: 'Composition', code: 'COMP', ponderation: 2 },
];

// POST /api/evaluations/eval-types/setup
export const setupEvalTypes = async (req: Request, res: Response) => {
    const tenant_id = req.user!.tenant_id;
    try {
        const ecole_id = await getEcoleId(tenant_id);
        if (!ecole_id) return res.status(404).json({ error: 'École introuvable.' });

        const existing = await prisma.types_evaluation.findMany({
            where: { ecole_id },
            select: { id: true },
        });
        if (existing.length > 0) {
            return res.json({ message: 'Types d\'évaluation déjà configurés.', skipped: true });
        }

        const created = await prisma.$transaction(
            DEFAULT_EVAL_TYPES.map(t =>
                prisma.types_evaluation.create({
                    data: { ecole_id, nom: t.nom, code: t.code, ponderation: t.ponderation },
                })
            )
        );

        res.status(201).json({ message: `${created.length} types créés.`, types: created });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la création des types.' });
    }
};

// GET /api/evaluations/eval-types
export const getEvalTypes = async (req: Request, res: Response) => {
    const tenant_id = req.user!.tenant_id;
    try {
        const ecole_id = await getEcoleId(tenant_id);
        if (!ecole_id) return res.status(404).json({ error: 'École introuvable.' });

        const types = await prisma.types_evaluation.findMany({
            where: { ecole_id },
            orderBy: { ponderation: 'asc' },
        });
        res.json(types);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération.' });
    }
};
