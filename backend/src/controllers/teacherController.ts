import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';

const pStr = (v: string | string[]): string => Array.isArray(v) ? v[0] : v;

const getEcoleId = async (tenant_id: string): Promise<string | null> => {
    const ecole = await prisma.ecoles.findFirst({
        where: {},
        select: { id: true },
    });
    return ecole?.id ?? null;
};

// GET /api/teachers/me — profil + affectations + année active de l'enseignant connecté.
// Permet au portail enseignant de résoudre son profils_enseignants.id depuis le JWT.
export const getMyProfile = async (req: Request, res: Response) => {
    const userId    = req.user!.id;
    const tenant_id = req.user!.tenant_id;

    try {
        const profil = await prisma.profils_enseignants.findFirst({
            where: { utilisateur_id: userId },
            select: {
                id: true, matricule: true, nom: true, prenom: true,
                specialite: true, telephone: true, photo_url: true, ecole_id: true,
            },
        });
        if (!profil) return res.status(404).json({ error: 'Aucun profil enseignant associé à ce compte.' });

        const ecole = await prisma.ecoles.findFirst({
            where: {},
            select: {
                id: true, nom: true, annee_active_id: true,
                annee_active: { select: { id: true, libelle: true } },
            },
        });

        const affectations = await prisma.affectations_matieres.findMany({
            where: {
                enseignant_id: profil.id,
                est_actif: true,
                ...(ecole?.annee_active_id ? { annee_id: ecole.annee_active_id } : {}),
            },
            include: {
                matiere: { select: { id: true, nom: true, code: true, coefficient: true } },
                classe:  { select: { id: true, nom: true, niveau: true, annee_id: true } },
            },
            orderBy: [{ classe: { nom: 'asc' } }, { matiere: { nom: 'asc' } }],
        });

        res.json({
            profil,
            ecole:        ecole ? { id: ecole.id, nom: ecole.nom } : null,
            annee_active: ecole?.annee_active ?? null,
            affectations,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la récupération du profil enseignant.' });
    }
};

const genMatriculeEnseignant = async (ecole_id: string): Promise<string> => {
    const ecole = await prisma.ecoles.findUnique({ where: { id: ecole_id }, select: { code: true } });
    const prefix = `ENS${(ecole?.code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 2)}`;
    const yy     = new Date().getFullYear().toString().slice(-2);
    const last   = await prisma.profils_enseignants.findFirst({
        where:   { ecole_id, matricule: { startsWith: `${prefix}${yy}` } },
        orderBy: { matricule: 'desc' },
        select:  { matricule: true },
    });
    const seq = last?.matricule ? (parseInt(last.matricule.slice(-3), 10) || 0) + 1 : 1;
    return `${prefix}${yy}${seq.toString().padStart(3, '0')}`;
};

export const createTeacher = async (req: Request, res: Response) => {
    const tenant_id = req.user!.tenant_id;
    const { nom, prenom, specialite, telephone, email } = req.body;

    if (!nom || !prenom || !email) {
        return res.status(400).json({ error: 'Nom, prénom et email sont requis.' });
    }

    try {
        const ecole_id = await getEcoleId(tenant_id);
        if (!ecole_id) return res.status(404).json({ error: 'École introuvable pour ce tenant.' });

        const existingUser = await prisma.utilisateurs.findFirst({
            where: { email },
        });
        if (existingUser) {
            return res.status(409).json({ error: 'Un compte avec cet email existe déjà.' });
        }

        const tempPassword = `Scholaris${new Date().getFullYear()}!`;
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        const matricule = await genMatriculeEnseignant(ecole_id);

        const result = await prisma.$transaction(async (tx: any) => {
            const utilisateur = await tx.utilisateurs.create({
                data: {
                    email,
                    mot_de_passe: hashedPassword,
                    role: 'enseignant',
                },
            });

            const teacher = await tx.profils_enseignants.create({
                data: {
                    utilisateur_id: utilisateur.id,
                    ecole_id,
                    matricule,
                    nom: nom.toUpperCase(),
                    prenom,
                    specialite: specialite || null,
                    telephone: telephone || null,
                },
            });

            return { teacher, tempPassword };
        });

        res.status(201).json({
            ...result.teacher,
            temp_password: result.tempPassword,
            message: `Compte créé. Mot de passe temporaire : ${result.tempPassword}`,
        });
    } catch (error: any) {
        console.error(error);
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Ce matricule ou cet email est déjà utilisé.' });
        }
        res.status(500).json({ error: 'Erreur lors de la création de l\'enseignant.' });
    }
};

export const getTeachers = async (req: Request, res: Response) => {
    const tenant_id = req.user!.tenant_id;

    try {
        const ecole_id = await getEcoleId(tenant_id);
        if (!ecole_id) return res.status(404).json({ error: 'École introuvable.' });

        const teachers = await prisma.profils_enseignants.findMany({
            where: { ecole_id },
            include: {
                utilisateur: { select: { email: true, est_actif: true, derniere_connexion: true } },
                affectations: {
                    where: { est_actif: true },
                    include: {
                        matiere: { select: { nom: true, code: true } },
                        classe: { select: { nom: true } },
                    },
                },
                classes_titulaires: { select: { id: true, nom: true } },
            },
            orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
        });

        res.json(teachers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la récupération des enseignants.' });
    }
};

export const getTeacherById = async (req: Request, res: Response) => {
    const id = pStr(req.params.id);
    try {
        const teacher = await prisma.profils_enseignants.findUnique({
            where: { id },
            include: {
                utilisateur: { select: { email: true, est_actif: true } },
                affectations: {
                    include: {
                        matiere: true,
                        classe: true,
                        annee: { select: { libelle: true, est_active: true } },
                    },
                },
            },
        });
        if (!teacher) return res.status(404).json({ error: 'Enseignant introuvable.' });
        res.json(teacher);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération.' });
    }
};

export const updateTeacher = async (req: Request, res: Response) => {
    const id = pStr(req.params.id);
    const { nom, prenom, specialite, telephone } = req.body;

    try {
        const updated = await prisma.profils_enseignants.update({
            where: { id },
            data: {
                nom: nom ? nom.toUpperCase() : undefined,
                prenom,
                specialite,
                telephone,
            },
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la mise à jour.' });
    }
};

export const deactivateTeacher = async (req: Request, res: Response) => {
    const id = pStr(req.params.id);
    try {
        const teacher = await prisma.profils_enseignants.findUnique({
            where: { id },
            select: { utilisateur_id: true },
        });
        if (teacher?.utilisateur_id) {
            await prisma.utilisateurs.update({
                where: { id: teacher.utilisateur_id },
                data: { est_actif: false },
            });
        }
        res.json({ message: 'Enseignant désactivé.' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la désactivation.' });
    }
};

export const getTeacherCount = async (req: Request, res: Response) => {
    const tenant_id = req.user!.tenant_id;
    try {
        const ecole_id = await getEcoleId(tenant_id);
        if (!ecole_id) return res.json({ total: 0 });
        const total = await prisma.profils_enseignants.count({ where: { ecole_id } });
        res.json({ total });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors du comptage.' });
    }
};
