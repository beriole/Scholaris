import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const getEcoleId = async (tenant_id: string): Promise<string | null> => {
    const ecole = await prisma.ecoles.findFirst({ where: { tenant_id }, select: { id: true } });
    return ecole?.id ?? null;
};

const toNum = (v: any): number => {
    if (v == null) return 0;
    if (typeof v === 'number') return v;
    if (typeof v === 'bigint') return Number(v);
    return parseFloat(v.toString()) || 0;
};

// GET /api/dashboard/stats
export const getSchoolDashboardStats = async (req: Request, res: Response) => {
    const tenant_id = req.user!.tenant_id;

    try {
        const ecole_id = await getEcoleId(tenant_id);
        if (!ecole_id) return res.status(404).json({ error: 'École introuvable.' });

        const anneeActive = await prisma.annees_scolaires.findFirst({
            where: { ecole_id, est_active: true },
            select: { id: true, libelle: true, date_debut: true, date_fin: true },
        });

        // Comptages en parallèle
        const [
            totalEleves,
            totalEnseignants,
            totalClasses,
            totalMatieres,
        ] = await Promise.all([
            prisma.profils_eleves.count({ where: { ecole_id, statut: 'actif' } }),
            prisma.profils_enseignants.count({ where: { ecole_id } }),
            anneeActive
                ? prisma.classes.count({ where: { ecole_id, annee_id: anneeActive.id } })
                : Promise.resolve(0),
            prisma.matieres.count({ where: { ecole_id } }),
        ]);

        // Finances (mois courant)
        const now  = new Date();
        const mois_debut = new Date(now.getFullYear(), now.getMonth(), 1);
        const mois_fin   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        let financeStats = { total_recouvre: 0, total_en_attente: 0, paiements_ce_mois: 0 };
        try {
            const [confirmes, attentes, cemois] = await Promise.all([
                prisma.paiements.aggregate({
                    where: { ecole_id, statut: 'confirme' },
                    _sum: { montant_xaf: true },
                }),
                prisma.paiements.aggregate({
                    where: { ecole_id, statut: 'en_attente' },
                    _sum: { montant_xaf: true },
                }),
                prisma.paiements.count({
                    where: { ecole_id, statut: 'confirme', date_paiement: { gte: mois_debut, lte: mois_fin } },
                }),
            ]);
            financeStats = {
                total_recouvre:    toNum(confirmes._sum.montant_xaf),
                total_en_attente:  toNum(attentes._sum.montant_xaf),
                paiements_ce_mois: cemois,
            };
        } catch {}

        // Présences aujourd'hui
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        let presenceStats = { seances_aujourd_hui: 0, absences_aujourd_hui: 0 };
        try {
            const [seances, absences] = await Promise.all([
                prisma.presences.count({
                    where: { classe: { ecole_id }, date_seance: { gte: today, lt: tomorrow } },
                }),
                prisma.presences.count({
                    where: { classe: { ecole_id }, date_seance: { gte: today, lt: tomorrow }, statut: 'absent' },
                }),
            ]);
            presenceStats = { seances_aujourd_hui: seances, absences_aujourd_hui: absences };
        } catch {}

        // Setup checklist
        const [hasYear, hasClasses, hasMatieres, hasEvalTypes] = await Promise.all([
            prisma.annees_scolaires.count({ where: { ecole_id, est_active: true } }).then(n => n > 0),
            prisma.classes.count({ where: { ecole_id } }).then(n => n > 0),
            prisma.matieres.count({ where: { ecole_id } }).then(n => n > 0),
            prisma.types_evaluation.count({ where: { ecole_id } }).then(n => n > 0),
        ]);

        // Derniers paiements
        const derniersPaiements = await prisma.paiements.findMany({
            where: { ecole_id, statut: 'confirme' },
            include: {
                inscription: {
                    include: { eleve: { select: { nom: true, prenom: true } } },
                },
            },
            orderBy: { date_paiement: 'desc' },
            take: 5,
        });

        // Absences récentes non justifiées
        const absencesRecentes = await prisma.presences.findMany({
            where: {
                classe: { ecole_id },
                statut: { in: ['absent', 'retard'] },
                justifiee: false,
            },
            include: {
                eleve:   { select: { nom: true, prenom: true } },
                matiere: { select: { nom: true } },
                classe:  { select: { nom: true } },
            },
            orderBy: { date_seance: 'desc' },
            take: 5,
        });

        res.json({
            annee_active:      anneeActive,
            kpis: {
                total_eleves:      totalEleves,
                total_enseignants: totalEnseignants,
                total_classes:     totalClasses,
                total_matieres:    totalMatieres,
            },
            finance:    financeStats,
            presences:  presenceStats,
            setup: {
                has_year:        hasYear,
                has_classes:     hasClasses,
                has_matieres:    hasMatieres,
                has_eval_types:  hasEvalTypes,
                is_complete:     hasYear && hasClasses && hasMatieres && hasEvalTypes,
            },
            derniers_paiements: derniersPaiements.map(p => ({
                id:       p.id,
                montant:  toNum(p.montant_xaf),
                methode:  p.methode_paiement,
                date:     p.date_paiement,
                eleve:    p.inscription?.eleve ?? null,
            })),
            absences_recentes: absencesRecentes.map(a => ({
                id:          a.id,
                date:        a.date_seance,
                statut:      a.statut,
                eleve:       a.eleve,
                matiere:     a.matiere,
                classe:      a.classe,
            })),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors du chargement des statistiques.' });
    }
};
