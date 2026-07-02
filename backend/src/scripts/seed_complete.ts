/**
 * Seed COMPLET — point d'entrée unique qui provisionne une école
 * entièrement testable, de bout en bout.
 *
 *   1) Base (seed_demo)      → école, année active, périodes, types d'éval,
 *                              classes, matières/groupes, salles, enseignants,
 *                              élèves + inscriptions, affectations de base,
 *                              tranches de paiement.
 *   2) Enrichissement (seed_full) → affectations sur toutes les classes,
 *                              emploi du temps, notes, présences (avec absences),
 *                              paiements espèces, bulletins générés,
 *                              + compte admin_ecole de test.
 *
 * Idempotent : relançable sans créer de doublons.
 *
 *   npm run seed
 *   (ou : npx ts-node src/scripts/seed_complete.ts)
 */
import { main as seedDemo } from './seed_demo';
import { main as seedFull } from './seed_full';
import { prisma } from '../lib/prisma';

async function run() {
    console.log('▶  Base (seed_demo)\n' + '─'.repeat(48));
    await seedDemo();

    console.log('\n▶  Enrichissement (seed_full)\n' + '─'.repeat(48));
    await seedFull();

    console.log('\n✅ Seed complet terminé — l\'école démo est prête à être testée.');
    console.log('───────── COMPTES DE TEST ─────────');
    console.log('Super Admin  : berioletsague@gmail.com   / Admin1234!');
    console.log('Admin École  : admin.demo@sholaris.demo   / Admin1234!');
    console.log('Enseignant 1 : prof.math@sholaris.demo    / Prof1234!');
    console.log('Enseignant 2 : prof.fr@sholaris.demo      / Prof1234!');
}

run()
    .then(async () => { await prisma.$disconnect(); process.exit(0); })
    .catch(async (e) => { console.error('\n❌ Échec du seed complet.', e); await prisma.$disconnect(); process.exit(1); });
