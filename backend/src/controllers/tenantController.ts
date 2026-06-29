import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const getGlobalStats = async (req: Request, res: Response) => {
    try {
        // 1. Total Tenants
        const totalTenants = await prisma.tenants.count();

        // 2. Total Utilisateurs
        const totalUsers = await prisma.utilisateurs.count();

        // 3. Revenus Totaux (Paiements confirmés)
        const totalPayments = await prisma.paiements.aggregate({
            where: { statut: 'confirme' },
            _sum: { montant_xaf: true }
        });

        // 4. Derniers Tenants inscrits
        const recentTenants = await prisma.tenants.findMany({
            take: 5,
            orderBy: { created_at: 'desc' },
            select: {
                id: true,
                nom: true,
                sous_domaine: true,
                statut: true,
                created_at: true,
                _count: {
                    select: { utilisateurs: true }
                }
            }
        });

        res.status(200).json({
            totalTenants,
            totalUsers,
            totalRevenue: totalPayments._sum.montant_xaf || 0,
            recentTenants: recentTenants.map((t: any) => ({
                ...t,
                userCount: t._count.utilisateurs
            }))
        });
    } catch (error) {
        console.error('Error fetching global stats:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des statistiques globales.' });
    }
};

export const listTenants = async (req: Request, res: Response) => {
    try {
        const tenants = await prisma.tenants.findMany({
            orderBy: { created_at: 'desc' }
        });
        res.status(200).json(tenants);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération de la liste des établissements.' });
    }
};
