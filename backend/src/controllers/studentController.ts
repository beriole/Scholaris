import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const getEcoleId = async (tenant_id: string): Promise<string | null> => {
    const ecole = await prisma.ecoles.findFirst({
        where: { tenant_id },
        select: { id: true },
    });
    return ecole?.id ?? null;
};

const pStr = (v: string | string[]): string => Array.isArray(v) ? v[0] : v;

const genMatriculeEleve = async (ecole_id: string): Promise<string> => {
    const ecole = await prisma.ecoles.findUnique({ where: { id: ecole_id }, select: { code: true } });
    const prefix = (ecole?.code ?? 'ELV').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
    const yy     = new Date().getFullYear().toString().slice(-2);
    const last   = await prisma.profils_eleves.findFirst({
        where:   { ecole_id, matricule: { startsWith: `${prefix}${yy}` } },
        orderBy: { matricule: 'desc' },
        select:  { matricule: true },
    });
    const seq = last?.matricule ? (parseInt(last.matricule.slice(-4), 10) || 0) + 1 : 1;
    return `${prefix}${yy}${seq.toString().padStart(4, '0')}`;
};

export const createStudent = async (req: Request, res: Response) => {
    const tenant_id = req.user!.tenant_id;
    const {
        nom, prenom, date_naissance, lieu_naissance,
        sexe, nationalite, classe_id, annee_id, photo_url,
    } = req.body;

    if (!nom || !prenom || !date_naissance || !lieu_naissance) {
        return res.status(400).json({ error: 'Nom, prénom, date et lieu de naissance sont requis.' });
    }

    try {
        const ecole_id = await getEcoleId(tenant_id);
        if (!ecole_id) return res.status(404).json({ error: 'École introuvable pour ce tenant.' });

        const matricule = await genMatriculeEleve(ecole_id);

        const result = await prisma.$transaction(async (tx: any) => {
            const eleve = await tx.profils_eleves.create({
                data: {
                    ecole_id,
                    matricule,
                    nom: nom.toUpperCase(),
                    prenom,
                    date_naissance: new Date(date_naissance),
                    lieu_naissance,
                    sexe: sexe || null,
                    nationalite: nationalite || 'Camerounaise',
                    photo_url: photo_url || null,
                    statut: 'actif',
                },
            });

            if (classe_id && annee_id) {
                await tx.inscriptions.create({
                    data: {
                        eleve_id: eleve.id,
                        classe_id,
                        annee_id,
                        date_inscription: new Date(),
                        statut: 'actif',
                    },
                });
            }

            return eleve;
        });

        res.status(201).json(result);
    } catch (error: any) {
        console.error(error);
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Ce matricule existe déjà dans cet établissement.' });
        }
        res.status(500).json({ error: 'Erreur lors de la création de l\'élève.' });
    }
};

export const getStudents = async (req: Request, res: Response) => {
    const tenant_id = req.user!.tenant_id;
    const { annee_id, classe_id, statut } = req.query;

    try {
        const ecole_id = await getEcoleId(tenant_id);
        if (!ecole_id) return res.status(404).json({ error: 'École introuvable.' });

        const students = await prisma.profils_eleves.findMany({
            where: {
                ecole_id,
                statut: (statut as string) || 'actif',
                ...(annee_id || classe_id
                    ? {
                          inscriptions: {
                              some: {
                                  statut: 'actif',
                                  ...(annee_id ? { annee_id: annee_id as string } : {}),
                                  ...(classe_id ? { classe_id: classe_id as string } : {}),
                              },
                          },
                      }
                    : {}),
            },
            include: {
                inscriptions: {
                    where: { statut: 'actif' },
                    include: {
                        classe: { select: { id: true, nom: true, niveau: true } },
                        annee: { select: { id: true, libelle: true, est_active: true } },
                    },
                    orderBy: { date_inscription: 'desc' },
                    take: 1,
                },
            },
            orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
        });

        res.json(students);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la récupération des élèves.' });
    }
};

export const getStudentById = async (req: Request, res: Response) => {
    const id = pStr(req.params.id);
    try {
        const student = await prisma.profils_eleves.findUnique({
            where: { id },
            include: {
                inscriptions: {
                    include: {
                        classe: true,
                        annee: true,
                        paiements: { orderBy: { date_paiement: 'desc' } },
                    },
                    orderBy: { date_inscription: 'desc' },
                },
                parents: {
                    include: { parent: true },
                },
            },
        });
        if (!student) return res.status(404).json({ error: 'Élève introuvable.' });
        res.json(student);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération.' });
    }
};

export const updateStudent = async (req: Request, res: Response) => {
    const id = pStr(req.params.id);
    const { nom, prenom, date_naissance, lieu_naissance, sexe, nationalite, statut, photo_url } = req.body;

    try {
        const updated = await prisma.profils_eleves.update({
            where: { id },
            data: {
                nom: nom ? nom.toUpperCase() : undefined,
                prenom,
                date_naissance: date_naissance ? new Date(date_naissance) : undefined,
                lieu_naissance,
                sexe,
                nationalite,
                statut,
                photo_url: photo_url !== undefined ? photo_url : undefined,
            },
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la mise à jour.' });
    }
};

export const archiveStudent = async (req: Request, res: Response) => {
    const id = pStr(req.params.id);
    try {
        await prisma.profils_eleves.update({ where: { id }, data: { statut: 'exclu' } });
        res.json({ message: 'Élève archivé.' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de l\'archivage.' });
    }
};

// GET /api/students/class/:classe_id — élèves inscrits dans une classe (pour feuilles de présence/notes)
export const getStudentsByClass = async (req: Request, res: Response) => {
    const classe_id = pStr(req.params.classe_id);
    try {
        const inscriptions = await prisma.inscriptions.findMany({
            where: { classe_id, statut: 'actif' },
            include: { eleve: { select: { id: true, nom: true, prenom: true, matricule: true, sexe: true } } },
            orderBy: { eleve: { nom: 'asc' } },
        });
        const result = inscriptions.map(i => ({ inscription_id: i.id, eleve_id: i.eleve_id, eleve: i.eleve }));
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération des élèves.' });
    }
};

export const getStudentCount = async (req: Request, res: Response) => {
    const tenant_id = req.user!.tenant_id;
    try {
        const ecole_id = await getEcoleId(tenant_id);
        if (!ecole_id) return res.json({ total: 0 });
        const total = await prisma.profils_eleves.count({
            where: { ecole_id, statut: 'actif' },
        });
        res.json({ total });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors du comptage.' });
    }
};
