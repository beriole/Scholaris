import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const qStr = (v: unknown): string | undefined =>
    typeof v === 'string' ? v : Array.isArray(v) ? String(v[0]) : undefined;

const pStr = (v: string | string[]): string => Array.isArray(v) ? v[0] : v;

// ── Saisie des présences ──────────────────────────────────────────────────────

// POST /api/attendance/session
// Crée ou remplace toutes les présences d'une séance (identifiée par classe+matière+date+heure_debut)
export const saveSessionAttendance = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { classe_id, matiere_id, date_seance, heure_debut, heure_fin, entries } = req.body;

    if (!classe_id || !matiere_id || !date_seance || !heure_debut || !heure_fin || !Array.isArray(entries)) {
        return res.status(400).json({ error: 'Champs manquants.' });
    }

    const dateSeance = new Date(date_seance);
    const heureDebut = new Date(`${date_seance}T${heure_debut}:00`);
    const heureFin   = new Date(`${date_seance}T${heure_fin}:00`);

    try {
        // Enseignant : profil de l'utilisateur connecté, sinon enseignant affecté à la
        // matière dans la classe (cas admin_ecole / super_admin qui saisit les présences).
        let enseignant = await prisma.profils_enseignants.findFirst({
            where: { utilisateur_id: userId },
            select: { id: true },
        });
        if (!enseignant) {
            const aff = await prisma.affectations_matieres.findFirst({
                where: { classe_id, matiere_id, est_actif: true },
                select: { enseignant_id: true },
            });
            if (aff) enseignant = { id: aff.enseignant_id };
        }
        if (!enseignant) return res.status(404).json({ error: 'Aucun enseignant affecté à cette matière dans cette classe. Faites d\'abord l\'affectation.' });

        await prisma.$transaction(async (tx: any) => {
            // Supprimer les présences existantes pour cette séance
            await tx.presences.deleteMany({
                where: {
                    classe_id,
                    matiere_id,
                    date_seance: dateSeance,
                    heure_debut: heureDebut,
                },
            });

            // Recréer
            if (entries.length > 0) {
                await tx.presences.createMany({
                    data: entries.map((e: any) => ({
                        eleve_id:      e.eleve_id,
                        classe_id,
                        matiere_id,
                        enseignant_id: enseignant.id,
                        date_seance:   dateSeance,
                        heure_debut:   heureDebut,
                        heure_fin:     heureFin,
                        statut:        e.statut,
                        justifiee:     false,
                    })),
                });
            }
        });

        res.json({ message: `Séance enregistrée (${entries.length} élève(s)).`, count: entries.length });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de l\'enregistrement de la séance.' });
    }
};

// ── Lecture ───────────────────────────────────────────────────────────────────

// GET /api/attendance/class?classe_id=...&date_debut=...&date_fin=...&matiere_id=...
export const getClassAttendance = async (req: Request, res: Response) => {
    const classe_id   = qStr(req.query.classe_id);
    const date_debut  = qStr(req.query.date_debut);
    const date_fin    = qStr(req.query.date_fin);
    const matiere_id  = qStr(req.query.matiere_id);

    if (!classe_id) return res.status(400).json({ error: 'classe_id requis.' });

    try {
        const where: any = { classe_id };
        if (matiere_id)  where.matiere_id = matiere_id;
        if (date_debut)  where.date_seance = { gte: new Date(date_debut) };
        if (date_debut && date_fin)
            where.date_seance = { gte: new Date(date_debut), lte: new Date(date_fin) };

        const presences = await prisma.presences.findMany({
            where,
            include: {
                eleve:   { select: { nom: true, prenom: true, matricule: true } },
                matiere: { select: { nom: true, code: true } },
            },
            orderBy: [{ date_seance: 'desc' }, { heure_debut: 'desc' }, { eleve: { nom: 'asc' } }],
        });

        res.json(presences);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la récupération.' });
    }
};

// GET /api/attendance/stats?classe_id=...&annee_id=...&matiere_id=...
export const getAttendanceStats = async (req: Request, res: Response) => {
    const classe_id  = qStr(req.query.classe_id);
    const annee_id   = qStr(req.query.annee_id);
    const matiere_id = qStr(req.query.matiere_id);

    if (!classe_id) return res.status(400).json({ error: 'classe_id requis.' });

    try {
        // Récupérer tous les élèves de la classe
        const inscriptions = await prisma.inscriptions.findMany({
            where: { classe_id, statut: 'actif', ...(annee_id ? { annee_id } : {}) },
            include: { eleve: { select: { nom: true, prenom: true, matricule: true, sexe: true } } },
        });

        const eleveIds = inscriptions.map(i => i.eleve_id);
        const where: any = { eleve_id: { in: eleveIds }, classe_id };
        if (matiere_id) where.matiere_id = matiere_id;

        const presences = await prisma.presences.findMany({
            where,
            select: { eleve_id: true, statut: true, justifiee: true, date_seance: true, heure_debut: true, heure_fin: true },
        });

        // Durée d'une séance en heures (heure_fin - heure_debut), arrondie à 0.25h.
        const dureeHeures = (debut: Date, fin: Date): number => {
            const ms = new Date(fin).getTime() - new Date(debut).getTime();
            const h  = ms / 3_600_000;
            return h > 0 ? Math.round(h * 4) / 4 : 0;
        };

        type Stat = { present: number; absent: number; retard: number; exclu: number; justifiee: number;
                      heures_absence: number; heures_absence_just: number };
        const empty = (): Stat => ({ present: 0, absent: 0, retard: 0, exclu: 0, justifiee: 0,
                                     heures_absence: 0, heures_absence_just: 0 });

        const statsByEleve: Record<string, Stat> = {};
        for (const id of eleveIds) statsByEleve[id] = empty();

        for (const p of presences) {
            const s = statsByEleve[p.eleve_id];
            if (!s) continue;
            s[p.statut as 'present' | 'absent' | 'retard' | 'exclu']++;
            if ((p.statut === 'absent' || p.statut === 'retard') && p.justifiee) s.justifiee++;
            // Heures d'absence : absences et exclusions (élève hors du cours).
            if (p.statut === 'absent' || p.statut === 'exclu') {
                const h = dureeHeures(p.heure_debut, p.heure_fin);
                s.heures_absence += h;
                if (p.justifiee) s.heures_absence_just += h;
            }
        }

        const round2 = (n: number) => Math.round(n * 100) / 100;
        const rows = inscriptions.map(insc => {
            const s = statsByEleve[insc.eleve_id] ?? empty();
            return {
                eleve_id:      insc.eleve_id,
                eleve:         insc.eleve,
                stats: {
                    ...s,
                    heures_absence:      round2(s.heures_absence),
                    heures_absence_just: round2(s.heures_absence_just),
                },
                total_seances: presences.filter(p => p.eleve_id === insc.eleve_id).length,
            };
        });

        const total_heures_absence = round2(
            rows.reduce((acc, r) => acc + r.stats.heures_absence, 0)
        );

        res.json({ rows, total_eleves: inscriptions.length, total_heures_absence });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors du calcul des statistiques.' });
    }
};

// GET /api/attendance/student/:eleve_id
export const getStudentAttendance = async (req: Request, res: Response) => {
    const eleve_id = pStr(req.params.eleve_id);
    try {
        const presences = await prisma.presences.findMany({
            where: { eleve_id },
            include: {
                matiere:       { select: { nom: true, code: true } },
                justifications: { select: { statut: true, motif: true } },
            },
            orderBy: [{ date_seance: 'desc' }, { heure_debut: 'desc' }],
        });
        res.json(presences);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération.' });
    }
};

// GET /api/attendance/session?classe_id=...&matiere_id=...&date_seance=...&heure_debut=...
export const getSession = async (req: Request, res: Response) => {
    const classe_id  = qStr(req.query.classe_id);
    const matiere_id = qStr(req.query.matiere_id);
    const date_seance = qStr(req.query.date_seance);
    const heure_debut = qStr(req.query.heure_debut);

    if (!classe_id || !matiere_id || !date_seance) {
        return res.status(400).json({ error: 'classe_id, matiere_id et date_seance requis.' });
    }

    try {
        const where: any = {
            classe_id,
            matiere_id,
            date_seance: new Date(date_seance),
        };
        if (heure_debut) where.heure_debut = new Date(`${date_seance}T${heure_debut}:00`);

        const presences = await prisma.presences.findMany({
            where,
            include: { eleve: { select: { nom: true, prenom: true, matricule: true } } },
        });
        res.json(presences);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération.' });
    }
};

// ── Justifications ────────────────────────────────────────────────────────────

// GET /api/attendance/justifications?classe_id=...&statut=...
export const getJustifications = async (req: Request, res: Response) => {
    const classe_id = qStr(req.query.classe_id);
    const statut    = qStr(req.query.statut);

    try {
        const where: any = {};
        if (statut) where.statut = statut;
        if (classe_id) where.presence = { classe_id };

        const justifications = await prisma.justifications_absences.findMany({
            where,
            include: {
                presence: {
                    include: {
                        eleve:   { select: { nom: true, prenom: true, matricule: true } },
                        matiere: { select: { nom: true } },
                    },
                },
            },
            orderBy: { created_at: 'desc' },
        });
        res.json(justifications);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération des justifications.' });
    }
};

// PUT /api/attendance/justifications/:id
export const updateJustification = async (req: Request, res: Response) => {
    const id      = pStr(req.params.id);
    const valide_par = req.user!.id;
    const { statut, commentaire_admin } = req.body;

    if (!['acceptee', 'refusee'].includes(statut)) {
        return res.status(400).json({ error: 'Statut doit être "acceptee" ou "refusee".' });
    }

    try {
        const updated = await prisma.$transaction(async (tx: any) => {
            const justif = await tx.justifications_absences.update({
                where: { id },
                data: {
                    statut,
                    valide_par,
                    commentaire_admin: commentaire_admin || null,
                    traite_at: new Date(),
                },
            });

            // Si acceptée, marquer la présence comme justifiée
            if (statut === 'acceptee') {
                await tx.presences.update({
                    where: { id: justif.presence_id },
                    data: { justifiee: true },
                });
            }

            return justif;
        });

        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour de la justification.' });
    }
};
