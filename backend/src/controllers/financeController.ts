import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { Decimal } from '@prisma/client/runtime/client';

const toNum = (v: Decimal | number | null | undefined): number => {
    if (v == null) return 0;
    return typeof v === 'number' ? v : parseFloat(v.toString());
};

const getEcoleId = async (tenant_id: string): Promise<string | null> => {
    const e = await prisma.ecoles.findFirst({ where: { tenant_id }, select: { id: true } });
    return e?.id ?? null;
};

const genNumeroRecu = () => {
    const ts   = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `REC-${ts}-${rand}`;
};

const qStr = (v: unknown): string | undefined =>
    typeof v === 'string' ? v : Array.isArray(v) ? String(v[0]) : undefined;

const pStr = (v: string | string[]): string =>
    Array.isArray(v) ? v[0] : v;

// ── Tranches de paiement ──────────────────────────────────────────────────────

export const createTranche = async (req: Request, res: Response) => {
    const tenant_id = req.user!.tenant_id;
    const { annee_id, classe_id, nom, montant_xaf, date_echeance, ordre, est_obligatoire } = req.body;

    if (!annee_id || !nom || !montant_xaf || !date_echeance) {
        return res.status(400).json({ error: 'annee_id, nom, montant et date_echeance requis.' });
    }

    try {
        const ecole_id = await getEcoleId(tenant_id);
        if (!ecole_id) return res.status(404).json({ error: 'École introuvable.' });

        const tranche = await prisma.tranches_paiement.create({
            data: {
                ecole_id,
                annee_id,
                classe_id: classe_id || null,
                nom,
                montant_xaf: parseFloat(montant_xaf),
                date_echeance: new Date(date_echeance),
                ordre: parseInt(ordre ?? '1'),
                est_obligatoire: est_obligatoire ?? true,
            },
        });
        res.status(201).json(tranche);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la création de la tranche.' });
    }
};

export const getTranches = async (req: Request, res: Response) => {
    const tenant_id = req.user!.tenant_id;
    const annee_id  = qStr(req.query.annee_id);
    const classe_id = qStr(req.query.classe_id);

    try {
        const ecole_id = await getEcoleId(tenant_id);
        if (!ecole_id) return res.status(404).json({ error: 'École introuvable.' });

        const where: any = { ecole_id };
        if (annee_id)  where.annee_id = annee_id;
        if (classe_id) where.OR = [{ classe_id }, { classe_id: null }];

        const tranches = await prisma.tranches_paiement.findMany({
            where,
            orderBy: [{ annee_id: 'asc' }, { ordre: 'asc' }],
        });
        res.json(tranches);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération.' });
    }
};

export const deleteTranche = async (req: Request, res: Response) => {
    const id = pStr(req.params.id);
    try {
        await prisma.tranches_paiement.delete({ where: { id } });
        res.json({ message: 'Tranche supprimée.' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la suppression.' });
    }
};

// ── Paiements ─────────────────────────────────────────────────────────────────

// POST /api/finance/payments
// Enregistrement d'un paiement encaissé par l'administration (espèces, virement, chèque,
// mobile money reçu manuellement). Toujours statut='confirme'. Renvoie les données du reçu.
export const recordPayment = async (req: Request, res: Response) => {
    const userId    = req.user!.id;
    const tenant_id = req.user!.tenant_id;

    const {
        inscription_id,
        montant_xaf,
        methode_paiement,
        reference,
        date_paiement,
        notes_interne,
    } = req.body;

    if (!inscription_id || !montant_xaf || !methode_paiement) {
        return res.status(400).json({ error: 'inscription_id, montant_xaf et methode_paiement requis.' });
    }

    const montant = parseFloat(montant_xaf);
    if (isNaN(montant) || montant <= 0) {
        return res.status(400).json({ error: 'Le montant doit être supérieur à 0 XAF.' });
    }

    try {
        const ecole = await prisma.ecoles.findFirst({
            where: { tenant_id },
            select: { id: true, nom: true },
        });
        if (!ecole) return res.status(404).json({ error: 'École introuvable.' });
        const ecole_id = ecole.id;

        // Récupérer l'inscription + élève + classe + total déjà payé pour calculer les soldes
        const inscription = await prisma.inscriptions.findUnique({
            where: { id: inscription_id },
            include: {
                paiements: { select: { montant_xaf: true, statut: true } },
                classe: { select: { nom: true, ecole_id: true, annee_id: true, frais_scolarite_xaf: true } },
                eleve:  { select: { nom: true, prenom: true, matricule: true } },
            },
        });
        if (!inscription) return res.status(404).json({ error: 'Inscription introuvable.' });

        // Calcul total dû (tranches > frais_classe > montant_inscription)
        const tranches = await prisma.tranches_paiement.findMany({
            where: {
                ecole_id,
                annee_id: inscription.annee_id,
                OR: [{ classe_id: inscription.classe_id }, { classe_id: null }],
            },
        });
        const totalParTranches = tranches.reduce((s, t) => s + toNum(t.montant_xaf), 0);
        const montantTotal = totalParTranches > 0
            ? totalParTranches
            : toNum(inscription.classe?.frais_scolarite_xaf) || toNum(inscription.montant_scolarite_xaf);

        const dejaPaye = inscription.paiements
            .filter(p => p.statut === 'confirme')
            .reduce((s, p) => s + toNum(p.montant_xaf), 0);
        const soldeApres = Math.max(0, montantTotal - dejaPaye - montant);

        const encaisseur = await prisma.utilisateurs.findUnique({
            where: { id: userId }, select: { email: true },
        });

        const paiement = await prisma.paiements.create({
            data: {
                tenant_id,
                ecole_id,
                inscription_id,
                montant_xaf: montant,
                montant_total_xaf: montantTotal,
                solde_restant_xaf: soldeApres,
                methode_paiement,
                reference_transaction: reference ?? null,
                statut: 'confirme',
                date_paiement: date_paiement ? new Date(date_paiement) : new Date(),
                numero_recu: genNumeroRecu(),
                encaisse_par: userId,
                notes_interne: notes_interne ?? null,
            },
        });

        // Réponse enrichie : tout ce qu'il faut pour générer le reçu PDF.
        res.status(201).json({
            paiement: {
                ...paiement,
                montant_xaf:       toNum(paiement.montant_xaf),
                montant_total_xaf: toNum(paiement.montant_total_xaf),
                solde_restant_xaf: toNum(paiement.solde_restant_xaf),
            },
            recu: {
                numero_recu:    paiement.numero_recu,
                date_paiement:  paiement.date_paiement,
                montant_xaf:    montant,
                montant_total:  montantTotal,
                deja_paye:      dejaPaye + montant,
                solde_restant:  soldeApres,
                methode:        methode_paiement,
                reference:      reference ?? null,
                ecole:          ecole.nom,
                eleve:          inscription.eleve,
                classe:         inscription.classe?.nom ?? '',
                encaisse_par:   encaisseur?.email ?? '',
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de l\'enregistrement du paiement.' });
    }
};

export const deletePayment = async (req: Request, res: Response) => {
    const id = pStr(req.params.id);
    try {
        await prisma.paiements.delete({ where: { id } });
        res.json({ message: 'Paiement annulé.' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la suppression.' });
    }
};

// ── Statut paiement par classe ────────────────────────────────────────────────

export const getClassPaymentStatus = async (req: Request, res: Response) => {
    const tenant_id = req.user!.tenant_id;
    const classe_id = qStr(req.query.classe_id);
    const annee_id  = qStr(req.query.annee_id);

    if (!classe_id || !annee_id) {
        return res.status(400).json({ error: 'classe_id et annee_id requis.' });
    }

    try {
        const ecole_id = await getEcoleId(tenant_id);
        if (!ecole_id) return res.status(404).json({ error: 'École introuvable.' });

        const tranches = await prisma.tranches_paiement.findMany({
            where: {
                ecole_id,
                annee_id,
                OR: [{ classe_id }, { classe_id: null }],
            },
            orderBy: { ordre: 'asc' },
        });
        const totalParTranches = tranches.reduce((s, t) => s + toNum(t.montant_xaf), 0);

        const inscriptions = await prisma.inscriptions.findMany({
            where: {
                classe_id,
                annee_id,
                statut: 'actif',
            },
            include: {
                eleve: { select: { nom: true, prenom: true, matricule: true } },
                classe: { select: { frais_scolarite_xaf: true } },
                paiements: {
                    where: { statut: { in: ['confirme', 'en_attente'] } },
                    orderBy: { date_paiement: 'desc' },
                    select: {
                        id: true,
                        montant_xaf: true,
                        methode_paiement: true,
                        reference_transaction: true,
                        date_paiement: true,
                        statut: true,
                        numero_recu: true,
                    },
                },
            },
            orderBy: { eleve: { nom: 'asc' } },
        });

        const rows = inscriptions.map(insc => {
            const totalDu = totalParTranches > 0
                ? totalParTranches
                : toNum(insc.classe?.frais_scolarite_xaf) || toNum(insc.montant_scolarite_xaf);

            const totalPaye = insc.paiements
                .filter(p => p.statut === 'confirme')
                .reduce((s, p) => s + toNum(p.montant_xaf), 0);
            const solde = Math.max(0, totalDu - totalPaye);
            const dernierPaiement = insc.paiements[0] ?? null;

            return {
                inscription_id: insc.id,
                eleve: insc.eleve,
                total_du: totalDu,
                total_paye: Math.round(totalPaye),
                solde: Math.round(solde),
                statut_paiement: solde <= 0 ? 'solde' : totalPaye > 0 ? 'partiel' : 'impaye',
                dernier_paiement: dernierPaiement ? {
                    montant: toNum(dernierPaiement.montant_xaf),
                    mode: dernierPaiement.methode_paiement,
                    date: dernierPaiement.date_paiement,
                    statut: dernierPaiement.statut,
                    reference: dernierPaiement.reference_transaction,
                } : null,
                paiements: insc.paiements.map(p => ({
                    ...p,
                    montant_xaf: toNum(p.montant_xaf),
                })),
                tranches: tranches.map(t => ({ ...t, montant_xaf: toNum(t.montant_xaf) })),
            };
        });

        res.json({ rows, tranches: tranches.map(t => ({ ...t, montant_xaf: toNum(t.montant_xaf) })) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors du calcul des soldes.' });
    }
};

// ── Tableau de bord finances ──────────────────────────────────────────────────

export const getFinanceStats = async (req: Request, res: Response) => {
    const tenant_id = req.user!.tenant_id;
    const annee_id  = qStr(req.query.annee_id);

    try {
        const ecole_id = await getEcoleId(tenant_id);
        if (!ecole_id) return res.status(404).json({ error: 'École introuvable.' });

        const inscWhere: any = { classe: { ecole_id } };
        if (annee_id) inscWhere.annee_id = annee_id;

        const [paiementsAgg, inscriptions, tranches] = await Promise.all([
            prisma.paiements.aggregate({
                where: { inscription: inscWhere, statut: 'confirme' },
                _sum: { montant_xaf: true },
                _count: { id: true },
            }),
            prisma.inscriptions.findMany({
                where: { ...inscWhere, statut: 'actif' },
                include: {
                    paiements: { where: { statut: 'confirme' }, select: { montant_xaf: true } },
                    classe: { select: { frais_scolarite_xaf: true } },
                },
            }),
            prisma.tranches_paiement.findMany({
                where: {
                    ecole_id,
                    ...(annee_id ? { annee_id } : {}),
                },
            }),
        ]);

        const totalParTranches = tranches.reduce((s, t) => s + toNum(t.montant_xaf), 0);

        let totalAttendu = 0, nbSolde = 0, nbPartiel = 0, nbImpaye = 0;

        for (const insc of inscriptions) {
            const du = totalParTranches > 0
                ? totalParTranches
                : toNum(insc.classe?.frais_scolarite_xaf) || toNum(insc.montant_scolarite_xaf);
            const paye = insc.paiements.reduce((s, p) => s + toNum(p.montant_xaf), 0);
            const solde = du - paye;
            totalAttendu += du;
            if (solde <= 0) nbSolde++;
            else if (paye > 0) nbPartiel++;
            else nbImpaye++;
        }

        const totalCollecte = toNum(paiementsAgg._sum.montant_xaf);
        const tauxRecouvrement = totalAttendu > 0
            ? Math.round((totalCollecte / totalAttendu) * 1000) / 10
            : 0;

        res.json({
            total_collecte:      Math.round(totalCollecte),
            total_attendu:       Math.round(totalAttendu),
            taux_recouvrement:   tauxRecouvrement,
            nb_paiements:        paiementsAgg._count.id,
            nb_eleves_total:     inscriptions.length,
            nb_eleves_solde:     nbSolde,
            nb_eleves_partiel:   nbPartiel,
            nb_eleves_impaye:    nbImpaye,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors du calcul des statistiques.' });
    }
};

// GET /api/finance/payments/student/:inscription_id
export const getStudentPayments = async (req: Request, res: Response) => {
    const inscription_id = pStr(req.params.inscription_id);
    try {
        const paiements = await prisma.paiements.findMany({
            where: { inscription_id },
            orderBy: { date_paiement: 'desc' },
        });
        res.json(paiements.map(p => ({ ...p, montant_xaf: toNum(p.montant_xaf) })));
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération.' });
    }
};
