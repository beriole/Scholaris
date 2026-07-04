import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { Decimal } from '@prisma/client/runtime/client';

const toNum = (v: Decimal | number | null | undefined): number => {
    if (v == null) return 0;
    return typeof v === 'number' ? v : parseFloat(v.toString());
};

const qStr = (v: unknown): string | undefined =>
    typeof v === 'string' ? v : Array.isArray(v) ? String(v[0]) : undefined;

const pStr = (v: string | string[]): string => Array.isArray(v) ? v[0] : v;

// Les notes « absent » / « non composé » sont exclues. Une matière sans aucune
// note valide renvoie null → elle (et son coefficient) est exclue de la moyenne.
const calcSubjectAvg = (
    notes: { valeur: Decimal; statut?: string | null; type_evaluation: { ponderation: Decimal } | null }[]
): number | null => {
    const valid = notes.filter(n => (n.statut ?? 'saisi') === 'saisi');
    if (valid.length === 0) return null;
    let totalW = 0, totalC = 0;
    for (const n of valid) {
        const c = toNum(n.type_evaluation?.ponderation) || 1;
        totalW += toNum(n.valeur) * c;
        totalC += c;
    }
    return totalC > 0 ? Math.round((totalW / totalC) * 100) / 100 : null;
};

const appreciation = (avg: number | null): string => {
    if (avg === null) return '';
    if (avg >= 18) return 'Excellent';
    if (avg >= 16) return 'Très bien';
    if (avg >= 14) return 'Bien';
    if (avg >= 12) return 'Assez bien';
    if (avg >= 10) return 'Passable';
    return 'Insuffisant';
};

// ── Génération des bulletins ──────────────────────────────────────────────────

// POST /api/bulletins/generate  Body: { periode_id, classe_id }
export const generateClassBulletins = async (req: Request, res: Response) => {
    const { periode_id, classe_id } = req.body;
    const genere_par = req.user!.id;

    if (!periode_id || !classe_id) {
        return res.status(400).json({ error: 'periode_id et classe_id requis.' });
    }

    try {
        const [periode, classe] = await Promise.all([
            prisma.periodes_evaluation.findUnique({
                where: { id: periode_id },
                select: { annee_id: true, nom: true, type: true, ordre: true, date_debut: true, date_fin: true },
            }),
            prisma.classes.findUnique({
                where: { id: classe_id },
                select: { ecole_id: true },
            }),
        ]);
        if (!periode) return res.status(404).json({ error: 'Séquence introuvable.' });
        if (!classe)  return res.status(404).json({ error: 'Classe introuvable.' });

        // Bulletin de trimestre/term : on agrège les séquences dont la date tombe
        // dans l'intervalle du trimestre (fonctionne quel que soit le nombre de
        // séquences par trimestre : 2 francophone, 3 anglophone…). Sinon, la période elle-même.
        let notePeriodeIds: string[] = [periode_id];
        if (periode.type === 'trimestre') {
            const seqs = await prisma.periodes_evaluation.findMany({
                where: {
                    ecole_id: classe.ecole_id,
                    annee_id: periode.annee_id,
                    type: 'sequence',
                    date_debut: { gte: periode.date_debut, lte: periode.date_fin },
                },
                select: { id: true },
            });
            if (seqs.length) notePeriodeIds = seqs.map(s => s.id);
        }

        const matieres = await prisma.matieres.findMany({
            where: { ecole_id: classe.ecole_id },
            select: { id: true, nom: true, coefficient: true },
        });

        // Coefficients spécifiques à cette classe (override par affectation)
        const affectations = await prisma.affectations_matieres.findMany({
            where: { classe_id, annee_id: periode.annee_id, est_actif: true },
            select: { matiere_id: true, coefficient: true },
        });
        const coeffOverride: Record<string, number> = {};
        for (const a of affectations) {
            if (a.coefficient != null) coeffOverride[a.matiere_id] = a.coefficient;
        }

        const inscriptions = await prisma.inscriptions.findMany({
            where: { classe_id, annee_id: periode.annee_id, statut: 'actif' },
            include: { eleve: { select: { id: true, nom: true, prenom: true, matricule: true } } },
        });

        if (inscriptions.length === 0) {
            return res.status(400).json({ error: 'Aucun élève inscrit dans cette classe.' });
        }

        const eleveIds = inscriptions.map(i => i.eleve_id);
        const notes = await prisma.notes.findMany({
            where: { eleve_id: { in: eleveIds }, classe_id, periode_id: { in: notePeriodeIds } },
            include: { type_evaluation: { select: { ponderation: true } } },
        });

        const notesByEleve: Record<string, typeof notes> = {};
        for (const n of notes) {
            if (!notesByEleve[n.eleve_id]) notesByEleve[n.eleve_id] = [];
            notesByEleve[n.eleve_id].push(n);
        }

        const studentData = inscriptions.map(insc => {
            const eleveNotes = notesByEleve[insc.eleve_id] ?? [];
            const byMatiere: Record<string, typeof eleveNotes> = {};
            for (const n of eleveNotes) {
                if (!byMatiere[n.matiere_id]) byMatiere[n.matiere_id] = [];
                byMatiere[n.matiere_id].push(n);
            }

            let totalW = 0, totalC = 0;
            const details: { matiere_id: string; nom: string; moyenne: number }[] = [];

            for (const mat of matieres) {
                const matNotes = byMatiere[mat.id];
                if (!matNotes) continue;
                const avg = calcSubjectAvg(matNotes.map(n => ({ valeur: n.valeur, statut: n.statut, type_evaluation: n.type_evaluation })));
                if (avg !== null) {
                    const coeff = coeffOverride[mat.id] ?? toNum(mat.coefficient);
                    totalW += avg * coeff;
                    totalC += coeff;
                    details.push({ matiere_id: mat.id, nom: mat.nom, moyenne: avg });
                }
            }

            return {
                eleve_id:         insc.eleve_id,
                eleve:            insc.eleve,
                moyenne_generale: totalC > 0 ? Math.round((totalW / totalC) * 100) / 100 : null,
                details,
            };
        });

        const ranked = [...studentData].filter(s => s.moyenne_generale !== null)
            .sort((a, b) => (b.moyenne_generale ?? 0) - (a.moyenne_generale ?? 0));

        const rankMap: Record<string, number> = {};
        let rang = 1;
        for (let i = 0; i < ranked.length; i++) {
            if (i > 0 && ranked[i].moyenne_generale !== ranked[i - 1].moyenne_generale) rang = i + 1;
            rankMap[ranked[i].eleve_id] = rang;
        }

        const totalEleves = inscriptions.length;

        await prisma.$transaction(async (tx: any) => {
            for (const s of studentData) {
                if (s.moyenne_generale === null) continue;

                const upserted = await tx.bulletins.upsert({
                    where: { eleve_id_periode_id: { eleve_id: s.eleve_id, periode_id } },
                    create: {
                        eleve_id:             s.eleve_id,
                        classe_id,
                        periode_id,
                        moyenne_generale:     s.moyenne_generale,
                        rang:                 rankMap[s.eleve_id] ?? null,
                        effectif_classe:      totalEleves,
                        appreciation_generale: appreciation(s.moyenne_generale),
                        version:              1,
                        statut_generation:    'genere',
                        genere_par,
                        generated_at:         new Date(),
                    },
                    update: {
                        moyenne_generale:     s.moyenne_generale,
                        rang:                 rankMap[s.eleve_id] ?? null,
                        effectif_classe:      totalEleves,
                        appreciation_generale: appreciation(s.moyenne_generale),
                        statut_generation:    'genere',
                        genere_par,
                        generated_at:         new Date(),
                        version: { increment: 1 },
                    },
                });

                await tx.details_bulletin.deleteMany({ where: { bulletin_id: upserted.id } });
                await tx.details_bulletin.createMany({
                    data: s.details.map(d => ({
                        bulletin_id:          upserted.id,
                        matiere_id:           d.matiere_id,
                        moyenne_matiere:      d.moyenne,
                        appreciation_matiere: appreciation(d.moyenne),
                    })),
                });
            }
        });

        res.json({
            message: `${studentData.filter(s => s.moyenne_generale !== null).length} bulletin(s) générés.`,
            stats: {
                total_eleves: totalEleves,
                max_general:  ranked[0]?.moyenne_generale ?? null,
                min_general:  ranked[ranked.length - 1]?.moyenne_generale ?? null,
                moy_general:  ranked.length > 0
                    ? Math.round((ranked.reduce((a, b) => a + (b.moyenne_generale ?? 0), 0) / ranked.length) * 100) / 100
                    : null,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la génération des bulletins.' });
    }
};

// ── Lecture des bulletins ─────────────────────────────────────────────────────

// GET /api/bulletins/class?classe_id=...&periode_id=...
export const getClassBulletins = async (req: Request, res: Response) => {
    const classe_id  = qStr(req.query.classe_id);
    const periode_id = qStr(req.query.periode_id);

    if (!classe_id || !periode_id) {
        return res.status(400).json({ error: 'classe_id et periode_id requis.' });
    }

    try {
        const bulletins = await prisma.bulletins.findMany({
            where: { classe_id, periode_id },
            include: {
                eleve:   { select: { nom: true, prenom: true, matricule: true, sexe: true, date_naissance: true, lieu_naissance: true, nationalite: true, photo_url: true } },
                classe:  { select: { nom: true, niveau: true } },
                details: { include: { matiere: { select: { nom: true, code: true, coefficient: true, groupe: { select: { nom: true, ordre_affichage: true } } } } }, orderBy: { matiere: { nom: 'asc' } } },
                periode: { select: { nom: true, ordre: true, type: true, annee: { select: { libelle: true } } } },
            },
            orderBy: { rang: 'asc' },
        });

        // Convertir les Decimal en nombres (sinon le front reçoit des chaînes → .toFixed() plante).
        const result = bulletins.map(b => ({
            ...b,
            moyenne_generale: toNum(b.moyenne_generale),
            details: b.details.map(d => ({
                ...d,
                moyenne_matiere: toNum(d.moyenne_matiere),
                matiere: { ...d.matiere, coefficient: toNum(d.matiere.coefficient) },
            })),
        }));
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la récupération des bulletins.' });
    }
};

// GET /api/bulletins/class-detailed?classe_id=...&periode_id=...
// Données enrichies pour le modèle GHAHS : par matière → moyennes par séquence
// (T1/T2/T3), Test Av, Total, rang par matière, enseignant ; + totaux, rang
// général, effectif, moyenne de classe. Calculé à la volée depuis les notes.
const TERM_LABELS: Record<number, string> = { 1: 'FIRST TERM', 2: 'SECOND TERM', 3: 'THIRD TERM' };
const remark = (avg: number | null): string => {
    if (avg === null) return '';
    if (avg >= 16) return 'FULLY ACQ';
    if (avg >= 12) return 'ACQUIRED';
    if (avg >= 10) return 'COURSE OF ACQ';
    return 'NOT ACQ';
};

export const getClassBulletinsDetailed = async (req: Request, res: Response) => {
    const classe_id  = qStr(req.query.classe_id);
    const periode_id = qStr(req.query.periode_id);
    if (!classe_id || !periode_id) return res.status(400).json({ error: 'classe_id et periode_id requis.' });

    try {
        const [periode, classe] = await Promise.all([
            prisma.periodes_evaluation.findUnique({
                where: { id: periode_id },
                select: { annee_id: true, nom: true, type: true, ordre: true, date_debut: true, date_fin: true },
            }),
            prisma.classes.findUnique({ where: { id: classe_id }, select: { ecole_id: true, nom: true, niveau: true } }),
        ]);
        if (!periode) return res.status(404).json({ error: 'Période introuvable.' });
        if (!classe)  return res.status(404).json({ error: 'Classe introuvable.' });

        // Séquences composant la période (colonnes T1/T2/T3), regroupées par date
        // → nombre de séquences/term variable (2 francophone, 3 anglophone…).
        let seqPeriodes: { id: string; nom: string; ordre: number }[] = [];
        if (periode.type === 'trimestre') {
            seqPeriodes = await prisma.periodes_evaluation.findMany({
                where: { ecole_id: classe.ecole_id, annee_id: periode.annee_id, type: 'sequence',
                    date_debut: { gte: periode.date_debut, lte: periode.date_fin } },
                select: { id: true, nom: true, ordre: true },
                orderBy: { ordre: 'asc' },
            });
        }
        if (seqPeriodes.length === 0) seqPeriodes = [{ id: periode_id, nom: periode.nom, ordre: periode.ordre }];
        const notePeriodeIds = seqPeriodes.map(s => s.id);

        const [matieres, affectations, inscriptions] = await Promise.all([
            prisma.matieres.findMany({
                where: { ecole_id: classe.ecole_id },
                select: { id: true, nom: true, code: true, coefficient: true, groupe: { select: { nom: true, ordre_affichage: true } } },
            }),
            prisma.affectations_matieres.findMany({
                where: { classe_id, annee_id: periode.annee_id, est_actif: true },
                select: { matiere_id: true, coefficient: true, enseignant: { select: { nom: true, prenom: true } } },
            }),
            prisma.inscriptions.findMany({
                where: { classe_id, annee_id: periode.annee_id, statut: 'actif' },
                include: { eleve: { select: { id: true, nom: true, prenom: true, matricule: true, sexe: true, date_naissance: true, lieu_naissance: true, nationalite: true, photo_url: true } } },
                orderBy: { eleve: { nom: 'asc' } },
            }),
        ]);

        const coeffOverride: Record<string, number> = {};
        const teacherByMat: Record<string, string> = {};
        for (const a of affectations) {
            if (a.coefficient != null) coeffOverride[a.matiere_id] = toNum(a.coefficient);
            if (a.enseignant) teacherByMat[a.matiere_id] = `${a.enseignant.nom} ${a.enseignant.prenom ?? ''}`.trim();
        }

        const eleveIds = inscriptions.map(i => i.eleve_id);
        const notes = await prisma.notes.findMany({
            where: { eleve_id: { in: eleveIds }, classe_id, periode_id: { in: notePeriodeIds } },
            include: { type_evaluation: { select: { ponderation: true } } },
        });
        // notes[eleve][matiere][periode] = liste
        const map: Record<string, Record<string, Record<string, typeof notes>>> = {};
        for (const n of notes) {
            ((map[n.eleve_id] ??= {})[n.matiere_id] ??= {})[n.periode_id] ??= [];
            map[n.eleve_id][n.matiere_id][n.periode_id].push(n);
        }

        // Coefficient effectif d'une matière
        const coefOf = (m: typeof matieres[0]) => coeffOverride[m.id] ?? toNum(m.coefficient);

        // 1er passage : Test Av par (élève, matière) pour pouvoir classer par matière
        type Subj = { matiere_id: string; nom: string; code: string; coef: number; teacher: string;
            t_scores: (number | null)[]; test_av: number | null; total: number | null; statut: string; rank: number | null; remark: string };
        const perStudent: { insc: typeof inscriptions[0]; subjects: Subj[]; totalW: number; totalC: number }[] = [];

        for (const insc of inscriptions) {
            const byMat = map[insc.eleve_id] ?? {};
            const subjects: Subj[] = [];
            let totalW = 0, totalC = 0;
            for (const m of matieres) {
                const byPer = byMat[m.id];
                if (!byPer) continue; // matière non concernée par l'élève
                const t_scores = seqPeriodes.map(sp => calcSubjectAvg((byPer[sp.id] ?? []).map(n => ({ valeur: n.valeur, statut: n.statut, type_evaluation: n.type_evaluation }))));
                const allNotes = Object.values(byPer).flat();
                const test_av = calcSubjectAvg(allNotes.map(n => ({ valeur: n.valeur, statut: n.statut, type_evaluation: n.type_evaluation })));
                const statuts = allNotes.map(n => n.statut ?? 'saisi');
                const statut = statuts.length > 0 && statuts.every(s => s !== 'saisi')
                    ? (statuts.includes('non_compose') ? 'non_compose' : 'absent') : 'saisi';
                const coef = coefOf(m);
                if (test_av !== null) { totalW += test_av * coef; totalC += coef; }
                subjects.push({
                    matiere_id: m.id, nom: m.nom, code: m.code, coef, teacher: teacherByMat[m.id] ?? '',
                    t_scores, test_av, total: test_av !== null ? Math.round(test_av * coef * 100) / 100 : null,
                    statut, rank: null, remark: remark(test_av),
                });
            }
            perStudent.push({ insc, subjects, totalW, totalC });
        }

        // Rang par matière (sur Test Av)
        for (const m of matieres) {
            const scored = perStudent
                .map(ps => ({ eleve_id: ps.insc.eleve_id, s: ps.subjects.find(x => x.matiere_id === m.id) }))
                .filter(x => x.s && x.s.test_av !== null)
                .sort((a, b) => (b.s!.test_av ?? 0) - (a.s!.test_av ?? 0));
            let r = 1;
            for (let i = 0; i < scored.length; i++) {
                if (i > 0 && scored[i].s!.test_av !== scored[i - 1].s!.test_av) r = i + 1;
                scored[i].s!.rank = r;
            }
        }

        // Moyenne générale + rang général
        const students = perStudent.map(ps => {
            const moyenne_generale = ps.totalC > 0 ? Math.round((ps.totalW / ps.totalC) * 100) / 100 : null;
            const no_papers_passed = ps.subjects.filter(s => s.test_av !== null && s.test_av >= 10).length;
            return {
                eleve: ps.insc.eleve,
                subjects: ps.subjects,
                moyenne_generale,
                total_coef: Math.round(ps.totalC * 100) / 100,
                total_points: Math.round(ps.totalW * 100) / 100,
                no_papers_passed,
                rang: null as number | null,
            };
        });
        const ranked = students.filter(s => s.moyenne_generale !== null)
            .sort((a, b) => (b.moyenne_generale ?? 0) - (a.moyenne_generale ?? 0));
        let rg = 1;
        for (let i = 0; i < ranked.length; i++) {
            if (i > 0 && ranked[i].moyenne_generale !== ranked[i - 1].moyenne_generale) rg = i + 1;
            ranked[i].rang = rg;
        }
        const moys = ranked.map(s => s.moyenne_generale as number);
        const class_av = moys.length ? Math.round((moys.reduce((a, b) => a + b, 0) / moys.length) * 100) / 100 : null;

        res.json({
            periode: { nom: periode.nom, ordre: periode.ordre, type: periode.type,
                term_label: periode.type === 'trimestre' ? (TERM_LABELS[periode.ordre] ?? periode.nom.toUpperCase()) : periode.nom.toUpperCase() },
            classe: { nom: classe.nom, niveau: classe.niveau },
            effectif: inscriptions.length,
            sequences: seqPeriodes.map((s, i) => ({ id: s.id, nom: s.nom, label: `T${i + 1}` })),
            class_av,
            students,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors du calcul du bulletin détaillé.' });
    }
};

// GET /api/bulletins/:eleve_id/:periode_id
export const getStudentBulletin = async (req: Request, res: Response) => {
    const eleve_id   = pStr(req.params.eleve_id);
    const periode_id = pStr(req.params.periode_id);

    try {
        const bulletin = await prisma.bulletins.findUnique({
            where: { eleve_id_periode_id: { eleve_id, periode_id } },
            include: {
                eleve:   { select: { nom: true, prenom: true, matricule: true, sexe: true, date_naissance: true, lieu_naissance: true, nationalite: true } },
                classe:  { select: { nom: true, niveau: true, serie: true } },
                details: { include: { matiere: { select: { nom: true, code: true, coefficient: true } } }, orderBy: { matiere: { nom: 'asc' } } },
                periode: { select: { nom: true, ordre: true, type: true } },
            },
        });

        if (!bulletin) {
            return res.status(404).json({ error: 'Bulletin non trouvé. Générez d\'abord les bulletins pour cette classe.' });
        }

        const allBulletins = await prisma.bulletins.findMany({
            where: { classe_id: bulletin.classe_id, periode_id },
            select: { moyenne_generale: true },
        });
        const moyennes = allBulletins.map(b => toNum(b.moyenne_generale));
        const stats_classe = {
            max: moyennes.length > 0 ? Math.max(...moyennes) : null,
            min: moyennes.length > 0 ? Math.min(...moyennes) : null,
            moy: moyennes.length > 0
                ? Math.round((moyennes.reduce((a, b) => a + b, 0) / moyennes.length) * 100) / 100
                : null,
        };

        res.json({ bulletin, stats_classe });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la récupération du bulletin.' });
    }
};

// GET /api/bulletins/student/:eleve_id
export const getAllStudentBulletins = async (req: Request, res: Response) => {
    const eleve_id = pStr(req.params.eleve_id);
    try {
        const bulletins = await prisma.bulletins.findMany({
            where: { eleve_id },
            include: {
                details: { include: { matiere: { select: { nom: true, code: true, coefficient: true } } }, orderBy: { matiere: { nom: 'asc' } } },
                periode: { select: { nom: true, ordre: true, type: true } },
            },
            orderBy: { periode: { ordre: 'asc' } },
        });
        res.json(bulletins);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération.' });
    }
};
