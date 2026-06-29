/**
 * Seed démo : provisionne une école complète pour le tenant du super_admin
 * (berioletsague@gmail.com) afin de rendre TOUS les modules du dashboard testables.
 * Idempotent : relançable sans créer de doublons.
 *
 *   npx ts-node src/scripts/seed_demo.ts
 */
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';

const TENANT_ID = 'a04c0c79-f850-4ba2-b324-6fe3fb030b61'; // tenant de berioletsague@gmail.com

async function main() {
    // 1. École ----------------------------------------------------------------
    let ecole = await prisma.ecoles.findFirst({ where: { tenant_id: TENANT_ID } });
    if (!ecole) {
        ecole = await prisma.ecoles.create({
            data: {
                tenant_id: TENANT_ID,
                nom: 'Collège Sholaris Démo',
                code: 'SHOLA',
                ville: 'Douala',
                region: 'Littoral',
                telephone: '+237 690 00 00 00',
                systeme_notation: 'sur_20',
            },
        });
        console.log('✓ École créée:', ecole.nom);
    } else {
        console.log('• École existante:', ecole.nom);
    }
    const ecole_id = ecole.id;

    // 2. Année scolaire active ------------------------------------------------
    let annee = await prisma.annees_scolaires.findFirst({ where: { ecole_id, libelle: '2025-2026' } });
    if (!annee) {
        annee = await prisma.annees_scolaires.create({
            data: {
                ecole_id,
                libelle: '2025-2026',
                date_debut: new Date('2025-09-01'),
                date_fin: new Date('2026-07-15'),
                est_active: true,
            },
        });
        console.log('✓ Année créée:', annee.libelle);
    } else {
        console.log('• Année existante:', annee.libelle);
    }
    const annee_id = annee.id;
    // marquer comme active sur l'école
    await prisma.ecoles.update({ where: { id: ecole_id }, data: { annee_active_id: annee_id } });

    // 3. Périodes d'évaluation (3 trimestres) ---------------------------------
    const periodesData = [
        { nom: '1er Trimestre', ordre: 1, date_debut: '2025-09-01', date_fin: '2025-12-15' },
        { nom: '2e Trimestre',  ordre: 2, date_debut: '2026-01-05', date_fin: '2026-03-30' },
        { nom: '3e Trimestre',  ordre: 3, date_debut: '2026-04-01', date_fin: '2026-07-15' },
    ];
    for (const p of periodesData) {
        const exist = await prisma.periodes_evaluation.findFirst({ where: { ecole_id, annee_id, nom: p.nom } });
        if (!exist) {
            await prisma.periodes_evaluation.create({
                data: {
                    ecole_id, annee_id, nom: p.nom, type: 'trimestre', ordre: p.ordre,
                    date_debut: new Date(p.date_debut), date_fin: new Date(p.date_fin),
                    notes_cloturees: false, bulletins_publies: false,
                },
            });
        }
    }
    console.log('✓ Périodes:', periodesData.length);

    // 4. Types d'évaluation ----------------------------------------------------
    const typesData = [
        { nom: 'Devoir', code: 'DEV', ponderation: 0.4 },
        { nom: 'Composition', code: 'COMP', ponderation: 0.6 },
    ];
    for (const t of typesData) {
        const exist = await prisma.types_evaluation.findFirst({ where: { ecole_id, code: t.code } });
        if (!exist) {
            await prisma.types_evaluation.create({
                data: { ecole_id, nom: t.nom, code: t.code, ponderation: t.ponderation },
            });
        }
    }
    console.log('✓ Types évaluation:', typesData.length);

    // 5. Groupes & matières ----------------------------------------------------
    const groupesData = [
        { nom: 'Sciences', matieres: [
            { nom: 'Mathématiques', code: 'MATH', coefficient: 4 },
            { nom: 'Physique-Chimie', code: 'PC', coefficient: 3 },
            { nom: 'SVT', code: 'SVT', coefficient: 2 },
        ]},
        { nom: 'Lettres', matieres: [
            { nom: 'Français', code: 'FR', coefficient: 4 },
            { nom: 'Anglais', code: 'ANG', coefficient: 2 },
            { nom: 'Histoire-Géo', code: 'HG', coefficient: 2 },
        ]},
    ];
    const matiereIds: string[] = [];
    for (let gi = 0; gi < groupesData.length; gi++) {
        const g = groupesData[gi];
        let groupe = await prisma.groupes_matieres.findFirst({ where: { ecole_id, nom: g.nom } });
        if (!groupe) {
            groupe = await prisma.groupes_matieres.create({
                data: { ecole_id, nom: g.nom, ordre_affichage: gi },
            });
        }
        for (const m of g.matieres) {
            let mat = await prisma.matieres.findFirst({ where: { ecole_id, code: m.code } });
            if (!mat) {
                mat = await prisma.matieres.create({
                    data: { ecole_id, groupe_matiere_id: groupe.id, nom: m.nom, code: m.code, coefficient: m.coefficient, est_optionnelle: false },
                });
            }
            matiereIds.push(mat.id);
        }
    }
    console.log('✓ Matières:', matiereIds.length);

    // 6. Salles ----------------------------------------------------------------
    for (const s of [{ nom: 'Salle A1', type: 'classe' }, { nom: 'Salle A2', type: 'classe' }, { nom: 'Labo Sciences', type: 'laboratoire' }]) {
        const exist = await prisma.salles.findFirst({ where: { ecole_id, nom: s.nom } });
        if (!exist) await prisma.salles.create({ data: { ecole_id, nom: s.nom, capacite: 40, type: s.type, est_disponible: true } });
    }
    console.log('✓ Salles');

    // 7. Classes (6ème M1, 6ème M2, 5ème) -------------------------------------
    const classesData = [
        { nom: '6ème M1', niveau: '6ème', frais: 75000 },
        { nom: '6ème M2', niveau: '6ème', frais: 75000 },
        { nom: '5ème',    niveau: '5ème', frais: 80000 },
    ];
    const classeIds: string[] = [];
    for (const c of classesData) {
        let cl = await prisma.classes.findFirst({ where: { ecole_id, annee_id, nom: c.nom } });
        if (!cl) {
            cl = await prisma.classes.create({
                data: { ecole_id, annee_id, nom: c.nom, niveau: c.niveau, capacite_max: 50, frais_scolarite_xaf: c.frais },
            });
        }
        classeIds.push(cl.id);
    }
    console.log('✓ Classes:', classeIds.length);

    // 8. Enseignants (utilisateur + profil) -----------------------------------
    const hash = await bcrypt.hash('Prof1234!', 10);
    const profsData = [
        { email: 'prof.math@sholaris.demo', nom: 'Nkomo', prenom: 'Jean', specialite: 'Mathématiques' },
        { email: 'prof.fr@sholaris.demo',   nom: 'Mballa', prenom: 'Marie', specialite: 'Français' },
    ];
    const profIds: string[] = [];
    for (let i = 0; i < profsData.length; i++) {
        const p = profsData[i];
        let u = await prisma.utilisateurs.findFirst({ where: { tenant_id: TENANT_ID, email: p.email } });
        if (!u) u = await prisma.utilisateurs.create({ data: { tenant_id: TENANT_ID, email: p.email, role: 'enseignant', mot_de_passe: hash } });
        let prof = await prisma.profils_enseignants.findFirst({ where: { utilisateur_id: u.id } });
        if (!prof) {
            prof = await prisma.profils_enseignants.create({
                data: { utilisateur_id: u.id, ecole_id, matricule: `ENS${i + 1}`, nom: p.nom, prenom: p.prenom, specialite: p.specialite },
            });
        }
        profIds.push(prof.id);
    }
    console.log('✓ Enseignants:', profIds.length);

    // 9. Élèves + inscriptions (5 par classe sur la 1ère classe) --------------
    const prenoms = ['Paul', 'Aline', 'Eric', 'Sandra', 'Yvan', 'Clarisse', 'Brice', 'Nadia'];
    const noms = ['Tchoua', 'Fotso', 'Kana', 'Ngono', 'Bekolo', 'Atangana', 'Manga', 'Eyenga'];
    let count = 0;
    for (let ci = 0; ci < classeIds.length; ci++) {
        const classe_id = classeIds[ci];
        for (let k = 0; k < 4; k++) {
            const matricule = `SHOLA26${(ci * 10 + k + 1).toString().padStart(4, '0')}`;
            let el = await prisma.profils_eleves.findFirst({ where: { ecole_id, matricule } });
            if (!el) {
                el = await prisma.profils_eleves.create({
                    data: {
                        ecole_id, matricule,
                        nom: noms[(ci * 4 + k) % noms.length],
                        prenom: prenoms[(ci * 4 + k) % prenoms.length],
                        date_naissance: new Date(2013, k, 10 + k),
                        lieu_naissance: 'Douala',
                        sexe: k % 2 === 0 ? 'M' : 'F',
                        statut: 'actif',
                    },
                });
            }
            const insc = await prisma.inscriptions.findFirst({ where: { eleve_id: el.id, classe_id, annee_id } });
            if (!insc) {
                await prisma.inscriptions.create({
                    data: { eleve_id: el.id, classe_id, annee_id, date_inscription: new Date('2025-09-05'), statut: 'actif', montant_scolarite_xaf: 75000 },
                });
            }
            count++;
        }
    }
    console.log('✓ Élèves inscrits:', count);

    // 10. Affectations matières → enseignants (classe 1) -----------------------
    for (let i = 0; i < Math.min(matiereIds.length, 4); i++) {
        const matiere_id = matiereIds[i];
        const enseignant_id = profIds[i % profIds.length];
        const exist = await prisma.affectations_matieres.findFirst({ where: { classe_id: classeIds[0], matiere_id, annee_id } });
        if (!exist) {
            await prisma.affectations_matieres.create({
                data: { classe_id: classeIds[0], matiere_id, enseignant_id, annee_id, volume_horaire: 4, est_actif: true },
            });
        }
    }
    console.log('✓ Affectations');

    // 11. Tranches de paiement -------------------------------------------------
    const tranchesData = [
        { nom: '1ère tranche', montant: 30000, ordre: 1, echeance: '2025-10-01' },
        { nom: '2e tranche',   montant: 25000, ordre: 2, echeance: '2026-01-15' },
        { nom: '3e tranche',   montant: 20000, ordre: 3, echeance: '2026-04-15' },
    ];
    for (const t of tranchesData) {
        const exist = await prisma.tranches_paiement.findFirst({ where: { ecole_id, annee_id, nom: t.nom } });
        if (!exist) {
            await prisma.tranches_paiement.create({
                data: { ecole_id, annee_id, nom: t.nom, montant_xaf: t.montant, ordre: t.ordre, date_echeance: new Date(t.echeance), est_obligatoire: true },
            });
        }
    }
    console.log('✓ Tranches paiement');

    console.log('\n✅ Seed démo terminé pour l\'école', ecole.nom);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
