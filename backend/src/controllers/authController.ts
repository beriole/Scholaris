import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import * as jwtLib from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { sendOTP } from '../services/emailService';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Helper pour générer un code OTP 6 chiffres
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Crée l'établissement (mono-école) + compte admin, si l'école n'existe pas encore.
export const register = async (req: Request, res: Response) => {
    try {
        const { nom_tenant, email, mot_de_passe } = req.body;
        if (!nom_tenant || !email || !mot_de_passe) {
            return res.status(400).json({ error: 'Nom de l\'établissement, email et mot de passe requis.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(mot_de_passe, salt);

        const result = await prisma.$transaction(async (tx: any) => {
            const code = (nom_tenant as string).toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10) || 'SCH';
            const newEcole = await tx.ecoles.create({
                data: { nom: nom_tenant, code, systeme_notation: 'sur_20' },
            });

            const now = new Date();
            const startYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
            const newYear = await tx.annees_scolaires.create({
                data: {
                    ecole_id:   newEcole.id,
                    libelle:    `${startYear}-${startYear + 1}`,
                    date_debut: new Date(`${startYear}-09-01`),
                    date_fin:   new Date(`${startYear + 1}-07-15`),
                    est_active: true,
                },
            });
            await tx.ecoles.update({ where: { id: newEcole.id }, data: { annee_active_id: newYear.id } });

            const newAdmin = await tx.utilisateurs.create({
                data: { email, mot_de_passe: hashedPassword, role: 'admin_ecole' },
            });

            return { newEcole, newAdmin, newYear };
        });

        res.status(201).json({
            message: 'Établissement créé avec succès.',
            ecole: { ...result.newEcole, annee_active_id: result.newYear.id },
            annee_active: result.newYear,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la création de l\'établissement.' });
    }
};

// Configuration initiale — crée le premier administrateur (une seule fois).
export const setupSuperAdmin = async (req: Request, res: Response) => {
    try {
        const existingAdmin = await prisma.utilisateurs.findFirst({
            where: { role: { in: ['super_admin', 'admin_ecole'] } },
        });
        if (existingAdmin) {
            return res.status(403).json({ error: 'La configuration initiale a déjà été effectuée.' });
        }

        const { nom_tenant, email, mot_de_passe } = req.body;
        if (!email || !mot_de_passe) {
            return res.status(400).json({ error: 'Email et mot de passe requis.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(mot_de_passe, salt);

        let ecole = await prisma.ecoles.findFirst({ select: { id: true } });
        if (!ecole) {
            const code = ((nom_tenant as string) || 'School').toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10) || 'SCH';
            ecole = await prisma.ecoles.create({ data: { nom: nom_tenant || 'School', code, systeme_notation: 'sur_20' }, select: { id: true } });
        }
        await prisma.utilisateurs.create({
            data: { email, mot_de_passe: hashedPassword, role: 'admin_ecole' },
        });

        res.status(201).json({ message: 'Administrateur créé avec succès.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la configuration initiale.' });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, mot_de_passe } = req.body;

        if (!email || !mot_de_passe) {
            return res.status(400).json({ error: 'Email et mot de passe sont requis' });
        }

        const utilisateur = await prisma.utilisateurs.findFirst({
            where: { email },
        });

        if (!utilisateur || !utilisateur.est_actif) {
            return res.status(401).json({ error: 'Identifiants invalides ou compte inactif' });
        }

        if (!utilisateur.mot_de_passe) {
            return res.status(401).json({ error: 'Mot de passe non défini pour ce compte' });
        }

        const isMatch = await bcrypt.compare(mot_de_passe, utilisateur.mot_de_passe);
        if (!isMatch) {
            return res.status(401).json({ error: 'Identifiants invalides' });
        }

        // Mettre à jour la dernière connexion
        await prisma.utilisateurs.update({
            where: { id: utilisateur.id },
            data: { derniere_connexion: new Date() },
        });

        // Mono-école : l'unique établissement. On expose son id (champ tenant_id
        // conservé côté client pour compat) + son nom pour l'affichage.
        const ecole = await prisma.ecoles.findFirst({ select: { id: true, nom: true } });

        const payload = {
            id: utilisateur.id,
            role: utilisateur.role,
            email: utilisateur.email,
        };

        const token = jwtLib.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });

        res.status(200).json({
            message: 'Connexion réussie',
            token,
            user: {
                id: utilisateur.id,
                email: utilisateur.email,
                role: utilisateur.role,
                tenant_id: ecole?.id ?? null,
                tenant_name: ecole?.nom ?? 'School',
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la connexion' });
    }
};

export const requestPasswordReset = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email requis' });

        const utilisateur = await prisma.utilisateurs.findFirst({ where: { email } });
        if (!utilisateur) {
            return res.status(404).json({ error: 'Utilisateur introuvable' });
        }

        const otpCode = generateOTP();
        // Expiration dans 15 minutes
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        await prisma.utilisateurs.update({
            where: { id: utilisateur.id },
            data: {
                otp_code: otpCode,
                otp_expires_at: expiresAt,
            },
        });

        // Envoyer l'OTP par email
        const emailSent = await sendOTP(utilisateur.email, otpCode, utilisateur.email.split('@')[0]);
        if (!emailSent) {
            return res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'email' });
        }

        res.status(200).json({ message: 'Code OTP envoyé avec succès' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la demande de réinitialisation' });
    }
};

export const resetPasswordWithOTP = async (req: Request, res: Response) => {
    try {
        const { email, otp_code, new_password } = req.body;

        if (!email || !otp_code || !new_password) {
            return res.status(400).json({ error: 'Tous les champs sont requis' });
        }

        const utilisateur = await prisma.utilisateurs.findFirst({
            where: {
                email,
                otp_code,
                otp_expires_at: { gte: new Date() } // Vérifie que l'OTP n'est pas expiré
            }
        });

        if (!utilisateur) {
            return res.status(400).json({ error: 'Code OTP invalide ou expiré' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(new_password, salt);

        await prisma.utilisateurs.update({
            where: { id: utilisateur.id },
            data: {
                mot_de_passe: hashedPassword,
                otp_code: null,
                otp_expires_at: null,
            },
        });

        res.status(200).json({ message: 'Mot de passe réinitialisé avec succès' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la réinitialisation du mot de passe' });
    }
};
