import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';

// GET /api/settings/school
export const getSchoolSettings = async (req: Request, res: Response) => {
    const tenant_id = req.user!.tenant_id;
    try {
        const ecole = await prisma.ecoles.findFirst({
            where: { tenant_id },
            select: {
                id: true, nom: true, code: true, adresse: true, ville: true,
                region: true, telephone: true, logo_url: true, systeme_notation: true,
                annee_active_id: true,
                annee_active: { select: { id: true, libelle: true } },
            },
        });
        if (!ecole) return res.status(404).json({ error: 'École introuvable.' });

        const tenant = await prisma.tenants.findUnique({
            where: { id: tenant_id },
            select: { nom: true, sous_domaine: true, plan_abonnement: true, devise: true, langue_defaut: true, date_expiration: true },
        });

        res.json({ ecole, tenant });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la récupération des paramètres.' });
    }
};

// PUT /api/settings/school
export const updateSchoolSettings = async (req: Request, res: Response) => {
    const tenant_id = req.user!.tenant_id;
    const { nom, adresse, ville, region, telephone, logo_url, systeme_notation } = req.body;

    try {
        const ecole = await prisma.ecoles.findFirst({ where: { tenant_id }, select: { id: true } });
        if (!ecole) return res.status(404).json({ error: 'École introuvable.' });

        const data: Record<string, string> = {};
        if (nom !== undefined)              data.nom              = nom;
        if (adresse !== undefined)          data.adresse          = adresse;
        if (ville !== undefined)            data.ville            = ville;
        if (region !== undefined)           data.region           = region;
        if (telephone !== undefined)        data.telephone        = telephone;
        if (logo_url !== undefined)         data.logo_url         = logo_url;
        if (systeme_notation !== undefined) data.systeme_notation = systeme_notation;

        const updated = await prisma.ecoles.update({ where: { id: ecole.id }, data });
        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour.' });
    }
};

// PUT /api/settings/active-year  Body: { annee_id }
export const setActiveYear = async (req: Request, res: Response) => {
    const tenant_id = req.user!.tenant_id;
    const { annee_id } = req.body;
    if (!annee_id) return res.status(400).json({ error: 'annee_id requis.' });

    try {
        const ecole = await prisma.ecoles.findFirst({ where: { tenant_id }, select: { id: true } });
        if (!ecole) return res.status(404).json({ error: 'École introuvable.' });

        const annee = await prisma.annees_scolaires.findFirst({
            where: { id: annee_id, ecole_id: ecole.id },
            select: { id: true, libelle: true },
        });
        if (!annee) return res.status(404).json({ error: 'Année introuvable.' });

        await prisma.$transaction([
            prisma.annees_scolaires.updateMany({ where: { ecole_id: ecole.id }, data: { est_active: false } }),
            prisma.annees_scolaires.update({ where: { id: annee_id }, data: { est_active: true } }),
            prisma.ecoles.update({ where: { id: ecole.id }, data: { annee_active_id: annee_id } }),
        ]);

        res.json({ message: `Année active mise à jour : ${annee.libelle}` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors du changement d\'année.' });
    }
};

// GET /api/settings/profile
export const getProfile = async (req: Request, res: Response) => {
    try {
        const user = await prisma.utilisateurs.findUnique({
            where: { id: req.user!.id },
            select: {
                id: true, email: true, role: true, langue_preference: true, created_at: true,
                profil_enseignant: { select: { nom: true, prenom: true, telephone: true } },
            },
        });
        if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

        res.json({
            id:                user.id,
            email:             user.email,
            role:              user.role,
            langue_preference: user.langue_preference,
            created_at:        user.created_at,
            nom:               user.profil_enseignant?.nom       ?? null,
            prenom:            user.profil_enseignant?.prenom    ?? null,
            telephone:         user.profil_enseignant?.telephone ?? null,
        });
    } catch (error) {
        res.status(500).json({ error: 'Erreur.' });
    }
};

// PUT /api/settings/profile
export const updateProfile = async (req: Request, res: Response) => {
    const { langue_preference } = req.body;
    try {
        const updated = await prisma.utilisateurs.update({
            where: { id: req.user!.id },
            data:  langue_preference !== undefined ? { langue_preference } : {},
            select: { id: true, email: true, role: true, langue_preference: true },
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la mise à jour du profil.' });
    }
};

// PUT /api/settings/password
export const changePassword = async (req: Request, res: Response) => {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
        return res.status(400).json({ error: 'Mot de passe actuel et nouveau requis.' });
    }
    if (new_password.length < 8) {
        return res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' });
    }
    try {
        const user = await prisma.utilisateurs.findUnique({
            where:  { id: req.user!.id },
            select: { id: true, mot_de_passe: true },
        });
        if (!user || !user.mot_de_passe) return res.status(404).json({ error: 'Utilisateur introuvable.' });

        const valid = await bcrypt.compare(current_password, user.mot_de_passe);
        if (!valid) return res.status(401).json({ error: 'Mot de passe actuel incorrect.' });

        const hashed = await bcrypt.hash(new_password, 10);
        await prisma.utilisateurs.update({ where: { id: user.id }, data: { mot_de_passe: hashed } });
        res.json({ message: 'Mot de passe mis à jour.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors du changement de mot de passe.' });
    }
};
