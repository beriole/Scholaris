import { Request, Response, NextFunction } from 'express';
import * as jwtLib from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Extension Customization to support `req.user`
declare module 'express-serve-static-core' {
    interface Request {
        user?: {
            id: string;
            tenant_id: string;
            role: string;
            email: string;
        };
    }
}

export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.split(' ')[1]; // Format: Bearer TOKEN

        jwtLib.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.status(403).json({ error: 'Token expiré ou invalide' });
            }

            req.user = decoded as any;
            next();
        });
    } else {
        res.status(401).json({ error: 'Token manquant' });
    }
};

/**
 * Middleware RBAC (Role-Based Access Control)
 * @param allowedRoles Liste des rôles autorisés ('super_admin', 'admin_ecole', 'enseignant', 'parent', 'eleve')
 */
export const requireRole = (allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Non authentifié' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Accès refusé pour ce rôle' });
        }

        next();
    };
};
