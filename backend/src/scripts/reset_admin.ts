import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';

async function main() {
    const hash = await bcrypt.hash('Admin1234!', 10);
    const updated = await prisma.utilisateurs.update({
        where:  { id: '6e1d0337-ecf9-47b1-b524-5f008b005ca1' },
        data:   { mot_de_passe: hash, est_actif: true },
        select: { id: true, email: true, role: true },
    });
    console.log('OK:', JSON.stringify(updated));
}

main().catch(console.error).finally(() => prisma.$disconnect());
