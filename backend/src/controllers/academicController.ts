import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';

const pStr = (v: string | string[]): string => Array.isArray(v) ? v[0] : v;

// Résout le vrai ecole_id qu'on lui passe tenant_id ou ecole_id directement
const resolveEcoleId = async (id: string): Promise<string> => {
    const byId = await prisma.ecoles.findUnique({ where: { id }, select: { id: true } });
    if (byId) return byId.id;
    const byTenant = await prisma.ecoles.findFirst({ where: { tenant_id: id }, select: { id: true } });
    return byTenant?.id ?? id;
};

/**
 * Gestion des Années Scolaires
 */
export const createSchoolYear = async (req: Request, res: Response) => {
    const { ecole_id, libelle, date_debut, date_fin, est_active } = req.body;

    try {
        const resolvedId = await resolveEcoleId(ecole_id);

        if (est_active) {
            await prisma.annees_scolaires.updateMany({
                where: { ecole_id: resolvedId },
                data: { est_active: false }
            });
        }

        const schoolYear = await prisma.annees_scolaires.create({
            data: {
                ecole_id: resolvedId,
                libelle,
                date_debut: new Date(date_debut),
                date_fin: new Date(date_fin),
                est_active: est_active || false
            }
        });

        // Si active, on met à jour le pointeur global de l'école
        if (est_active) {
            await prisma.ecoles.update({
                where: { id: resolvedId },
                data: { annee_active_id: schoolYear.id }
            });
        }

        res.status(201).json(schoolYear);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la création de l\'année scolaire.' });
    }
};

export const getSchoolYears = async (req: Request, res: Response) => {
    const ecole_id = pStr(req.params.ecole_id);
    try {
        const resolvedId = await resolveEcoleId(ecole_id);
        const years = await prisma.annees_scolaires.findMany({
            where: { ecole_id: resolvedId },
            orderBy: { date_debut: 'desc' }
        });
        res.json(years);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération des années scolaires.' });
    }
};

/**
 * Gestion des Classes
 */
export const createClass = async (req: Request, res: Response) => {
    const { ecole_id, annee_id, nom, niveau, serie, capacite_max, frais_scolarite_xaf } = req.body;

    try {
        const resolvedId = await resolveEcoleId(ecole_id);
        const newClass = await prisma.classes.create({
            data: {
                ecole_id: resolvedId,
                annee_id,
                nom,
                niveau,
                serie,
                capacite_max,
                frais_scolarite_xaf: frais_scolarite_xaf ? Number(frais_scolarite_xaf) : null
            }
        });
        res.status(201).json(newClass);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la création de la classe.' });
    }
};

export const getClasses = async (req: Request, res: Response) => {
    const { annee_id } = req.params;
    try {
        const classes = await prisma.classes.findMany({
            where: { annee_id: annee_id as string },
            include: {
                enseignant_principal: {
                    select: { nom: true, prenom: true }
                }
            }
        });
        res.json(classes);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération des classes.' });
    }
};

/**
 * Gestion des Matières
 */
export const createSubjectGroup = async (req: Request, res: Response) => {
    const { ecole_id, nom, ordre_affichage } = req.body;
    try {
        const resolvedId = await resolveEcoleId(ecole_id);
        const group = await prisma.groupes_matieres.create({
            data: { ecole_id: resolvedId, nom, ordre_affichage: ordre_affichage || 0 }
        });
        res.status(201).json(group);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la création du groupe de matières.' });
    }
};

export const createSubject = async (req: Request, res: Response) => {
    const { ecole_id, groupe_id, code, nom, coefficient } = req.body;
    try {
        const resolvedId = await resolveEcoleId(ecole_id);
        const subject = await prisma.matieres.create({
            data: {
                ecole_id: resolvedId,
                groupe_matiere_id: groupe_id,
                code,
                nom,
                coefficient: coefficient ? Number(coefficient) : 1,
                est_optionnelle: false
            }
        });
        res.status(201).json(subject);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la création de la matière.' });
    }
};

export const updateSubject = async (req: Request, res: Response) => {
    const id = pStr(req.params.id);
    const { code, nom, coefficient } = req.body;
    try {
        const subject = await prisma.matieres.update({
            where: { id },
            data: {
                ...(code        !== undefined && { code }),
                ...(nom         !== undefined && { nom }),
                ...(coefficient !== undefined && { coefficient: Number(coefficient) }),
            },
        });
        res.json(subject);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la mise à jour.' });
    }
};

export const deleteSubject = async (req: Request, res: Response) => {
    const id = pStr(req.params.id);
    try {
        await prisma.matieres.delete({ where: { id } });
        res.json({ message: 'Matière supprimée.' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la suppression. Vérifiez qu\'aucune note ou affectation ne référence cette matière.' });
    }
};

export const deleteSubjectGroup = async (req: Request, res: Response) => {
    const id = pStr(req.params.id);
    try {
        await prisma.groupes_matieres.delete({ where: { id } });
        res.json({ message: 'Groupe supprimé.' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la suppression du groupe.' });
    }
};

export const getSubjectGroups = async (req: Request, res: Response) => {
    const ecole_id = pStr(req.params.ecole_id);
    try {
        const resolvedId = await resolveEcoleId(ecole_id);
        const groups = await prisma.groupes_matieres.findMany({
            where: { ecole_id: resolvedId },
            include: { matieres: true },
            orderBy: { ordre_affichage: 'asc' }
        });
        res.json(groups);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération des groupes de matières.' });
    }
};

export const seedTestAccounts = async (req: Request, res: Response) => {
    const emails = [
        'berioletsague@gmail.com',
        'angelleg888@gmail.com',
        'tsaguedjeume@gmail.com'
    ];
    const password = await bcrypt.hash('Scholaris2026!', 10);
    const results = [];

    for (const email of emails) {
        const schoolName = `Ecole ${email.split('@')[0]}`;
        const subdomain = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');

        try {
            const tenant = await prisma.tenants.create({
                data: {
                    nom: schoolName,
                    sous_domaine: `${subdomain}.scholaris.com`,
                    plan_abonnement: 'PRO',
                    statut: 'actif',
                    pays: 'CM',
                    fuseau_horaire: 'Africa/Douala'
                } as any
            });

            await prisma.ecoles.create({
                data: {
                    tenant_id: tenant.id,
                    nom: schoolName,
                    code: subdomain.toUpperCase(),
                    systeme_notation: 'sur_20'
                } as any
            });

            await prisma.utilisateurs.create({
                data: {
                    tenant_id: tenant.id,
                    email: email,
                    mot_de_passe: password,
                    role: 'admin_ecole',
                    est_actif: true
                } as any
            });
            results.push(`✅ ${email} créé`);
        } catch (e: any) {
            results.push(`⚠️ ${email}: ${e.message}`);
        }
    }
    res.json({ results });
};
