import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });

// Mono-école : l'unique établissement. Remplace la résolution par tenant.
export const getEcoleId = async (): Promise<string | null> => {
    const ecole = await prisma.ecoles.findFirst({ select: { id: true } });
    return ecole?.id ?? null;
};
