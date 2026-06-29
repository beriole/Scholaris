import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });

const GLOBAL_MODELS = ['tenants'];

export const getTenantPrisma = (tenantId: string) => {
    if (!tenantId) throw new Error('tenantId requis pour accéder aux données sécurisées.');

    return (prisma as any).$extends({
        query: {
            $allModels: {
                async $allOperations({ model, operation, args, query }: any) {
                    if (GLOBAL_MODELS.includes(model)) return query(args);

                    args = args || {};

                    if (['findUnique', 'findFirst', 'findMany', 'update', 'updateMany', 'delete', 'deleteMany', 'count', 'aggregate'].includes(operation)) {
                        args.where = { ...args.where, tenant_id: tenantId };
                    }
                    if (operation === 'create') {
                        args.data = { ...args.data, tenant_id: tenantId };
                    }
                    if (operation === 'createMany' && Array.isArray(args.data)) {
                        args.data = args.data.map((d: any) => ({ ...d, tenant_id: tenantId }));
                    }

                    return query(args);
                },
            },
        },
    });
};
