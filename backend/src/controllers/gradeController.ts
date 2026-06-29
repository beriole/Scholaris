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

const calcSubjectAvg = (
    grades: { valeur: Decimal; type_evaluation: { ponderation: Decimal } | null }[]
): number | null => {
    if (grades.length === 0) return null;
    let totalW = 0, totalC = 0;
    for (const g of grades) {
        const c = toNum(g.type_evaluation?.ponderation) || 1;
        totalW += toNum(g.valeur) * c;
        totalC += c;
    }
    return totalC > 0 ? Math.round((totalW / totalC) * 100) / 100 : null;
};

// ── Feuille de notes ──────────────────────────────────────────────────────────

// GET /api/grades/sheet?periode_id=...&classe_id=...&matiere_id=...
export const getGradeSheet = async (req: Request, res: Response) => {
    const periode_id = qStr(req.query.periode_id);
    const classe_id  = qStr(req.query.classe_id);
    const matiere_id = qStr(req.query.matiere_id);

    if (!periode_id || !classe_id || !matiere_id) {
        return res.status(400).json({ error: 'periode_id, classe_id et matiere_id requis.' });
    }

    try {
        const [periode, matiere, inscriptions] = await Promise.all([
            prisma.periodes_evaluation.findUnique({
                where: { id: periode_id },
                select: { id: true, nom: true, annee_id: true },
            }),
            prisma.matieres.findUnique({
                where: { id: matiere_id },
                select: { id: true, nom: true, code: true, coefficient: true, ecole_id: true },
            }),
            prisma.inscriptions.findMany({
                where: { classe_id, statut: 'actif' },
                include: { eleve: { select: { id: true, nom: true, prenom: true, matricule: true, sexe: true } } },
                orderBy: { eleve: { nom: 'asc' } },
            }),
        ]);

        if (!periode) return res.status(404).json({ error: 'Séquence introuvable.' });
        if (!matiere) return res.status(404).json({ error: 'Matière introuvable.' });

        const evalTypes = await prisma.types_evaluation.findMany({
            where: { ecole_id: matiere.ecole_id },
            orderBy: { ponderation: 'asc' },
        });

        // Récupérer toutes les notes pour cette classe/période/matière
        const eleveIds = inscriptions.map(i => i.eleve_id);
        const notes = await prisma.notes.findMany({
            where: { eleve_id: { in: eleveIds }, classe_id, matiere_id, periode_id },
            include: { type_evaluation: { select: { id: true, nom: true, ponderation: true } } },
        });

        const notesByEleve: Record<string, typeof notes> = {};
        for (const n of notes) {
            if (!notesByEleve[n.eleve_id]) notesByEleve[n.eleve_id] = [];
            notesByEleve[n.eleve_id].push(n);
        }

        const rows = inscriptions.map(insc => {
            const eleveNotes = notesByEleve[insc.eleve_id] ?? [];
            const gradeByType: Record<string, { id: string; valeur: number } | null> = {};
            for (const et of evalTypes) {
                const note = eleveNotes.find(n => n.type_evaluation_id === et.id);
                gradeByType[et.id] = note ? { id: note.id, valeur: toNum(note.valeur) } : null;
            }
            return {
                inscription_id: insc.id,
                eleve_id: insc.eleve_id,
                eleve: insc.eleve,
                grades: gradeByType,
                moyenne: calcSubjectAvg(eleveNotes.map(n => ({ valeur: n.valeur, type_evaluation: n.type_evaluation }))),
            };
        });

        res.json({
            periode:     { id: periode.id, nom: periode.nom },
            matiere:     { id: matiere.id, nom: matiere.nom, code: matiere.code, coefficient: toNum(matiere.coefficient) },
            eval_types:  evalTypes.map(et => ({ id: et.id, nom: et.nom, code: et.code, ponderation: toNum(et.ponderation) })),
            rows,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la récupération de la feuille de notes.' });
    }
};

// ── Sauvegarde en masse ───────────────────────────────────────────────────────

// POST /api/grades/bulk
// Body: { grades: [{ eleve_id, classe_id, matiere_id, periode_id, type_evaluation_id, valeur }] }
// POST /api/grades/bulk
// Body: { grades: [{ inscription_id, matiere_id, periode_id, type_eval_id, valeur }] }
export const saveBulkGrades = async (req: Request, res: Response) => {
    const { grades } = req.body;
    const userId = req.user!.id;

    if (!Array.isArray(grades) || grades.length === 0) {
        return res.status(400).json({ error: 'Liste de notes vide.' });
    }

    for (const g of grades) {
        const val = parseFloat(g.valeur);
        if (isNaN(val) || val < 0 || val > 20) {
            return res.status(400).json({ error: `Note invalide : ${g.valeur}. Doit être entre 0 et 20.` });
        }
    }

    try {
        // 1. Résoudre eleve_id + classe_id depuis les inscriptions (le frontend envoie inscription_id).
        const inscriptionIds = [...new Set(grades.map((g: any) => g.inscription_id).filter(Boolean))];
        const inscriptions = await prisma.inscriptions.findMany({
            where: { id: { in: inscriptionIds } },
            select: { id: true, eleve_id: true, classe_id: true },
        });
        const inscMap = new Map(inscriptions.map(i => [i.id, i]));

        // 2. Résoudre l'enseignant : profil de l'utilisateur connecté, sinon enseignant
        //    affecté à la matière dans la classe (cas admin_ecole / super_admin sans profil prof).
        const monProfil = await prisma.profils_enseignants.findFirst({
            where: { utilisateur_id: userId },
            select: { id: true },
        });

        const affCache = new Map<string, string | null>();
        const resolveEnseignant = async (classe_id: string, matiere_id: string): Promise<string | null> => {
            if (monProfil) return monProfil.id;
            const key = `${classe_id}:${matiere_id}`;
            if (affCache.has(key)) return affCache.get(key)!;
            const aff = await prisma.affectations_matieres.findFirst({
                where: { classe_id, matiere_id, est_actif: true },
                select: { enseignant_id: true },
            });
            const id = aff?.enseignant_id ?? null;
            affCache.set(key, id);
            return id;
        };

        const ops = [];
        for (const g of grades) {
            const insc = inscMap.get(g.inscription_id);
            if (!insc) return res.status(400).json({ error: `Inscription introuvable : ${g.inscription_id}.` });
            const type_evaluation_id = g.type_eval_id ?? g.type_evaluation_id;
            const enseignant_id = await resolveEnseignant(insc.classe_id, g.matiere_id);
            if (!enseignant_id) {
                return res.status(400).json({ error: 'Aucun enseignant affecté à cette matière dans cette classe. Faites d\'abord l\'affectation.' });
            }
            ops.push(
                prisma.notes.upsert({
                    where: {
                        eleve_id_matiere_id_type_evaluation_id_periode_id: {
                            eleve_id:           insc.eleve_id,
                            matiere_id:         g.matiere_id,
                            type_evaluation_id,
                            periode_id:         g.periode_id,
                        },
                    },
                    update: { valeur: parseFloat(g.valeur) },
                    create: {
                        eleve_id:           insc.eleve_id,
                        matiere_id:         g.matiere_id,
                        classe_id:          insc.classe_id,
                        periode_id:         g.periode_id,
                        type_evaluation_id,
                        valeur:             parseFloat(g.valeur),
                        note_max:           20,
                        est_absent:         false,
                        enseignant_id,
                    },
                })
            );
        }

        const results = await prisma.$transaction(ops);
        res.json({ message: `${results.length} note(s) enregistrée(s).`, count: results.length });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la sauvegarde des notes.' });
    }
};

// ── Moyennes classe/séquence ──────────────────────────────────────────────────

// GET /api/grades/class-summary?periode_id=...&classe_id=...
export const getClassGradeSummary = async (req: Request, res: Response) => {
    const periode_id = qStr(req.query.periode_id);
    const classe_id  = qStr(req.query.classe_id);

    if (!periode_id || !classe_id) {
        return res.status(400).json({ error: 'periode_id et classe_id requis.' });
    }

    try {
        const inscriptions = await prisma.inscriptions.findMany({
            where: { classe_id, statut: 'actif' },
            include: { eleve: { select: { nom: true, prenom: true, matricule: true } } },
        });

        const eleveIds = inscriptions.map(i => i.eleve_id);
        const notes = await prisma.notes.findMany({
            where: { eleve_id: { in: eleveIds }, classe_id, periode_id },
            include: {
                matiere:          { select: { id: true, nom: true, coefficient: true } },
                type_evaluation:  { select: { ponderation: true } },
            },
        });

        const notesByEleve: Record<string, typeof notes> = {};
        for (const n of notes) {
            if (!notesByEleve[n.eleve_id]) notesByEleve[n.eleve_id] = [];
            notesByEleve[n.eleve_id].push(n);
        }

        const summary = inscriptions.map(insc => {
            const eleveNotes = notesByEleve[insc.eleve_id] ?? [];
            const byMatiere: Record<string, typeof eleveNotes> = {};
            for (const n of eleveNotes) {
                if (!byMatiere[n.matiere_id]) byMatiere[n.matiere_id] = [];
                byMatiere[n.matiere_id].push(n);
            }

            let totalW = 0, totalC = 0;
            const matieres = [];
            for (const [mid, matNotes] of Object.entries(byMatiere)) {
                const mat = matNotes[0].matiere;
                const avg = calcSubjectAvg(matNotes.map(n => ({ valeur: n.valeur, type_evaluation: n.type_evaluation })));
                if (avg !== null) {
                    const coeff = toNum(mat.coefficient);
                    totalW += avg * coeff;
                    totalC += coeff;
                    matieres.push({ matiere_id: mid, nom: mat.nom, moyenne: avg, coefficient: coeff });
                }
            }

            return {
                inscription_id:   insc.id,
                eleve:            insc.eleve,
                matieres,
                moyenne_generale: totalC > 0 ? Math.round((totalW / totalC) * 100) / 100 : null,
            };
        });

        // Rangs
        const sorted = [...summary].filter(s => s.moyenne_generale !== null)
            .sort((a, b) => (b.moyenne_generale ?? 0) - (a.moyenne_generale ?? 0));
        let rang = 1;
        for (let i = 0; i < sorted.length; i++) {
            if (i > 0 && sorted[i].moyenne_generale !== sorted[i - 1].moyenne_generale) rang = i + 1;
            const s = summary.find(x => x.inscription_id === sorted[i].inscription_id);
            if (s) (s as any).rang = rang;
        }

        res.json({ rows: summary, total: summary.length });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors du calcul des moyennes.' });
    }
};

// GET /api/grades/student/:eleve_id
export const getStudentGrades = async (req: Request, res: Response) => {
    const eleve_id = pStr(req.params.eleve_id);
    try {
        const notes = await prisma.notes.findMany({
            where: { eleve_id },
            include: {
                matiere:         { select: { nom: true, code: true, coefficient: true } },
                periode:         { select: { nom: true, ordre: true, type: true } },
                type_evaluation: { select: { nom: true, ponderation: true } },
            },
            orderBy: [{ periode: { ordre: 'asc' } }, { matiere: { nom: 'asc' } }],
        });
        res.json(notes);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération.' });
    }
};
