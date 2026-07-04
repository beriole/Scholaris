import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { Decimal } from '@prisma/client/runtime/client';

const toNum = (v: Decimal | number | null | undefined): number => {
    if (v == null) return 0;
    return typeof v === 'number' ? v : parseFloat(v.toString());
};

const qStr = (v: unknown): string | undefined =>
    typeof v === 'string' ? v : Array.isArray(v) ? String(v[0]) : undefined;

const getEcoleId = async (tenant_id: string) => {
    const e = await prisma.ecoles.findFirst({ select: { id: true } });
    return e?.id ?? null;
};

// GET /api/reports/academic?annee_id=...&periode_id=...
// Résultats académiques par classe
export const getAcademicReport = async (req: Request, res: Response) => {
    const tenant_id = req.user!.tenant_id;
    const annee_id  = qStr(req.query.annee_id);
    const periode_id = qStr(req.query.periode_id);

    if (!annee_id) return res.status(400).json({ error: 'annee_id requis.' });

    try {
        const ecole_id = await getEcoleId(tenant_id);
        if (!ecole_id) return res.status(404).json({ error: 'École introuvable.' });

        const classes = await prisma.classes.findMany({
            where:   { ecole_id, annee_id },
            select:  { id: true, nom: true, niveau: true },
            orderBy: { nom: 'asc' },
        });

        const report = await Promise.all(classes.map(async (classe) => {
            const where: any = { classe_id: classe.id };
            if (periode_id) where.periode_id = periode_id;

            const bulletins = await prisma.bulletins.findMany({
                where,
                select: { moyenne_generale: true, rang: true, effectif_classe: true },
            });

            if (bulletins.length === 0) return { ...classe, stats: null };

            const moyennes = bulletins.map(b => toNum(b.moyenne_generale));
            const admis    = moyennes.filter(m => m >= 10).length;

            return {
                ...classe,
                stats: {
                    effectif:       bulletins.length,
                    moy_classe:     Math.round((moyennes.reduce((a, b) => a + b, 0) / moyennes.length) * 100) / 100,
                    max:            Math.max(...moyennes),
                    min:            Math.min(...moyennes),
                    admis,
                    taux_reussite:  Math.round((admis / bulletins.length) * 100),
                },
            };
        }));

        res.json(report);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur rapport académique.' });
    }
};

// GET /api/reports/attendance?annee_id=...&classe_id?=...
// Résumé des présences
export const getAttendanceReport = async (req: Request, res: Response) => {
    const tenant_id = req.user!.tenant_id;
    const annee_id  = qStr(req.query.annee_id);
    const classe_id = qStr(req.query.classe_id);

    if (!annee_id) return res.status(400).json({ error: 'annee_id requis.' });

    try {
        const ecole_id = await getEcoleId(tenant_id);
        if (!ecole_id) return res.status(404).json({ error: 'École introuvable.' });

        const classes = await prisma.classes.findMany({
            where: { ecole_id, annee_id, ...(classe_id ? { id: classe_id } : {}) },
            select: { id: true, nom: true, niveau: true },
        });

        const report = await Promise.all(classes.map(async (classe) => {
            const [total, absents, retards, exclu] = await Promise.all([
                prisma.presences.count({ where: { classe_id: classe.id } }),
                prisma.presences.count({ where: { classe_id: classe.id, statut: 'absent' } }),
                prisma.presences.count({ where: { classe_id: classe.id, statut: 'retard' } }),
                prisma.presences.count({ where: { classe_id: classe.id, statut: 'exclu' } }),
            ]);

            // Top 5 absents
            const topAbsents = await prisma.presences.groupBy({
                by:      ['eleve_id'],
                where:   { classe_id: classe.id, statut: 'absent', justifiee: false },
                _count:  { id: true },
                orderBy: { _count: { id: 'desc' } },
                take:    5,
            });

            const eleveDetails = await Promise.all(topAbsents.map(async (a) => {
                const eleve = await prisma.profils_eleves.findUnique({
                    where: { id: a.eleve_id },
                    select: { nom: true, prenom: true, matricule: true },
                });
                return { eleve, absences: a._count.id };
            }));

            return {
                ...classe,
                stats: {
                    total_seances: total,
                    absents, retards, exclu,
                    taux_presence: total > 0 ? Math.round(((total - absents) / total) * 100) : 100,
                },
                top_absents: eleveDetails.filter(e => e.eleve),
            };
        }));

        res.json(report);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur rapport présences.' });
    }
};

// GET /api/reports/finance?annee_id=...
export const getFinanceReport = async (req: Request, res: Response) => {
    const tenant_id = req.user!.tenant_id;
    const annee_id  = qStr(req.query.annee_id);

    try {
        const ecole_id = await getEcoleId(tenant_id);
        if (!ecole_id) return res.status(404).json({ error: 'École introuvable.' });

        const pWhere: any = { ecole_id };
        const classes = await prisma.classes.findMany({
            where: { ecole_id, ...(annee_id ? { annee_id } : {}) },
            select: { id: true, nom: true, niveau: true },
        });

        const [confirme, attente] = await Promise.all([
            prisma.paiements.aggregate({
                where: { ...pWhere, statut: 'confirme' },
                _sum:   { montant_xaf: true },
                _count: { _all: true },
            }),
            prisma.paiements.aggregate({
                where: { ...pWhere, statut: 'en_attente' },
                _sum:   { montant_xaf: true },
                _count: { _all: true },
            }),
        ]);

        // Recouvrement par classe
        const parClasse = await Promise.all(classes.map(async (classe) => {
            const inscriptions = await prisma.inscriptions.findMany({
                where: { classe_id: classe.id, ...(annee_id ? { annee_id } : {}) },
                select: { id: true },
            });
            const inscriptionIds = inscriptions.map(i => i.id);

            const [paid, tranches] = await Promise.all([
                prisma.paiements.aggregate({
                    where: { inscription_id: { in: inscriptionIds }, statut: 'confirme' },
                    _sum: { montant_xaf: true },
                }),
                prisma.tranches_paiement.aggregate({
                    where: { classe_id: classe.id, ...(annee_id ? { annee_id } : {}) },
                    _sum: { montant_xaf: true },
                }),
            ]);

            const totalDu   = toNum(tranches._sum?.montant_xaf) * inscriptions.length;
            const totalPaye = toNum(paid._sum?.montant_xaf);

            return {
                ...classe,
                effectif:  inscriptions.length,
                total_du:  totalDu,
                total_paye: totalPaye,
                taux_recouvrement: totalDu > 0 ? Math.round((totalPaye / totalDu) * 100) : 0,
            };
        }));

        res.json({
            global: {
                confirme_montant: toNum(confirme._sum?.montant_xaf),
                confirme_count:   confirme._count._all,
                attente_montant:  toNum(attente._sum?.montant_xaf),
                attente_count:    attente._count._all,
            },
            par_classe: parClasse,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur rapport finances.' });
    }
};
