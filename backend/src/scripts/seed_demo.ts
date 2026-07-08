/**
 * Seed démo — SYSTÈME ANGLOPHONE (Cameroun / GCE, sous-système anglais).
 * Provisionne un établissement anglophone complet pour le tenant du super_admin
 * afin de rendre tous les modules testables et d'alimenter le bulletin GHAHS.
 *
 * Modèle anglophone :
 *   - 3 Terms (First / Second / Third Term) ; chaque Term contient 3 séquences
 *     (Sequence tests → colonnes T1/T2/T3 du bulletin). Regroupement par dates.
 *   - Matières en anglais, groupées (Science / Arts & Languages / General).
 *   - Classes : Form 1, Form 4, Lower Sixth (séries Science & Arts).
 *   - Notation /20, appréciations par compétence (bulletin GHAHS).
 *
 * Idempotent : purge les données académiques de l'école démo puis recrée.
 *   npx ts-node src/scripts/seed_demo.ts
 */
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';

const d = (s: string) => new Date(s);

export async function main() {
    // 1. École (créée si absente, puis mise à jour → en-tête anglophone) --------
    let ecole = await prisma.ecoles.findFirst();
    const ecoleData = {
        nom: 'Green Hills Academy High School',
        code: 'GHAHS',
        ville: 'Yaoundé',
        region: 'Centre',
        adresse: 'P.O Box 31743, Yaoundé',
        telephone: '(+237) 650 509 421',
        email: 'greenhills37@yahoo.com',
        boite_postale: '31743 Yaoundé',
        devise: 'Solid Foundation - Discipline - Success',
        numero_contribuable: 'M090700023324Y',
        registre_commerce: 'RC552/TR/46',
        systeme_notation: 'sur_20',
    };
    if (!ecole) {
        ecole = await prisma.ecoles.create({ data: { ...ecoleData } });
        console.log('✓ École créée:', ecole.nom);
    } else {
        ecole = await prisma.ecoles.update({ where: { id: ecole.id }, data: ecoleData });
        console.log('• École mise à jour (anglophone):', ecole.nom);
    }
    const ecole_id = ecole.id;

    // Mono-école : plus de super_admin, les comptes existants deviennent admin_ecole.
    await prisma.utilisateurs.updateMany({ where: { role: 'super_admin' }, data: { role: 'admin_ecole' } });

    // Compte administrateur principal (Green Hills).
    const primaryEmail = 'berioletsague@gmail.com';
    const primary = await prisma.utilisateurs.findFirst({ where: { email: primaryEmail } });
    if (!primary) {
        await prisma.utilisateurs.create({
            data: { email: primaryEmail, mot_de_passe: await bcrypt.hash('Admin1234!', 10), role: 'admin_ecole', est_actif: true },
        });
        console.log('✓ Admin principal créé:', primaryEmail);
    }

    // 2. Année scolaire active -------------------------------------------------
    let annee = await prisma.annees_scolaires.findFirst({ where: { ecole_id, libelle: '2025-2026' } });
    if (!annee) {
        annee = await prisma.annees_scolaires.create({
            data: { ecole_id, libelle: '2025-2026', date_debut: d('2025-09-08'), date_fin: d('2026-06-19'), est_active: true },
        });
        console.log('✓ Année créée:', annee.libelle);
    }
    const annee_id = annee.id;
    await prisma.ecoles.update({ where: { id: ecole_id }, data: { annee_active_id: annee_id } });

    // ── PURGE des données académiques de l'école démo (repart propre) ──────────
    const oldClasses = await prisma.classes.findMany({ where: { ecole_id }, select: { id: true } });
    const classeIdsOld = oldClasses.map(c => c.id);
    const oldBulletins = await prisma.bulletins.findMany({ where: { classe_id: { in: classeIdsOld } }, select: { id: true } });
    const bulletinIdsOld = oldBulletins.map(b => b.id);
    await prisma.details_bulletin.deleteMany({ where: { bulletin_id: { in: bulletinIdsOld } } });
    await prisma.bulletins.deleteMany({ where: { id: { in: bulletinIdsOld } } });
    await prisma.notes.deleteMany({ where: { classe_id: { in: classeIdsOld } } });
    await prisma.presences.deleteMany({ where: { classe_id: { in: classeIdsOld } } });
    await prisma.emplois_du_temps.deleteMany({ where: { classe_id: { in: classeIdsOld } } });
    await prisma.paiements.deleteMany({ where: { ecole_id } });
    await prisma.inscriptions.deleteMany({ where: { classe_id: { in: classeIdsOld } } });
    const oldEleves = await prisma.profils_eleves.findMany({ where: { ecole_id }, select: { id: true } });
    const eleveIdsOld = oldEleves.map(e => e.id);
    await prisma.eleve_parent.deleteMany({ where: { eleve_id: { in: eleveIdsOld } } });
    await prisma.profils_eleves.deleteMany({ where: { ecole_id } });
    await prisma.affectations_matieres.deleteMany({ where: { classe_id: { in: classeIdsOld } } });
    await prisma.tranches_paiement.deleteMany({ where: { ecole_id } });
    await prisma.periodes_evaluation.deleteMany({ where: { ecole_id } });
    await prisma.classes.deleteMany({ where: { ecole_id } });
    await prisma.matieres.deleteMany({ where: { ecole_id } });
    await prisma.groupes_matieres.deleteMany({ where: { ecole_id } });
    await prisma.salles.deleteMany({ where: { ecole_id } });
    console.log('✓ Purge données académiques démo');

    // 3. Périodes — 3 Terms + 3 séquences/term (T1/T2/T3) ----------------------
    const terms = [
        { nom: 'First Term',  ordre: 1, debut: '2025-09-08', fin: '2025-12-12',
          seqs: [['Sequence 1', '2025-09-08', '2025-10-10'], ['Sequence 2', '2025-10-13', '2025-11-14'], ['Sequence 3', '2025-11-17', '2025-12-12']] },
        { nom: 'Second Term', ordre: 2, debut: '2026-01-05', fin: '2026-03-27',
          seqs: [['Sequence 4', '2026-01-05', '2026-01-30'], ['Sequence 5', '2026-02-02', '2026-02-27'], ['Sequence 6', '2026-03-02', '2026-03-27']] },
        // Third Term : 2 séquences seulement (comme le bulletin officiel : T1, T2)
        { nom: 'Third Term',  ordre: 3, debut: '2026-04-06', fin: '2026-06-19',
          seqs: [['Sequence 7', '2026-04-06', '2026-05-08'], ['Sequence 8', '2026-05-11', '2026-06-19']] },
    ];
    let seqOrdre = 1;
    for (const term of terms) {
        await prisma.periodes_evaluation.create({
            data: { ecole_id, annee_id, nom: term.nom, type: 'trimestre', ordre: term.ordre,
                date_debut: d(term.debut), date_fin: d(term.fin), notes_cloturees: false, bulletins_publies: false },
        });
        for (const [nom, sd, sf] of term.seqs) {
            await prisma.periodes_evaluation.create({
                data: { ecole_id, annee_id, nom, type: 'sequence', ordre: seqOrdre++,
                    date_debut: d(sd), date_fin: d(sf), notes_cloturees: false, bulletins_publies: false },
            });
        }
    }
    console.log(`✓ Périodes: 3 Terms + ${seqOrdre - 1} séquences`);

    // 4. Type d'évaluation — UNE seule note par séquence (secondaire anglophone,
    //    pas deux comme à l'université). T1/T2/T3 = la note de chaque séquence.
    const typesData = [
        { nom: 'Sequence Mark', code: 'SEQ', ponderation: 1 },
    ];
    for (const t of typesData) {
        await prisma.types_evaluation.create({ data: { ecole_id, nom: t.nom, code: t.code, ponderation: t.ponderation } });
    }
    console.log('✓ Types évaluation:', typesData.length);

    // 5. Groupes & matières (anglais) ------------------------------------------
    const groupesData = [
        { nom: 'Science Subjects', matieres: [
            { nom: 'Pure Mathematics', code: 'MATH', coefficient: 5 },
            { nom: 'Physics', code: 'PHY', coefficient: 4 },
            { nom: 'Chemistry', code: 'CHEM', coefficient: 4 },
            { nom: 'Biology', code: 'BIO', coefficient: 4 },
        ]},
        { nom: 'Arts Subjects', matieres: [
            { nom: 'Literature in English', code: 'LIT', coefficient: 4 },
            { nom: 'History', code: 'HIST', coefficient: 4 },
            { nom: 'Geography', code: 'GEOG', coefficient: 5 },
            { nom: 'Economics', code: 'ECON', coefficient: 5 },
            { nom: 'Philosophy', code: 'PHIL', coefficient: 3 },
        ]},
        { nom: 'General Subjects', matieres: [
            { nom: 'English Language', code: 'ENG', coefficient: 4 },
            { nom: 'French', code: 'FRE', coefficient: 2 },
            { nom: 'Citizenship Education', code: 'CIT', coefficient: 2 },
            { nom: 'ICT / Computer Science', code: 'ICT', coefficient: 3 },
            { nom: 'Physical Education', code: 'PHY-ED', coefficient: 2 },
        ]},
    ];
    const matiereIds: string[] = [];
    for (let gi = 0; gi < groupesData.length; gi++) {
        const g = groupesData[gi];
        const groupe = await prisma.groupes_matieres.create({ data: { ecole_id, nom: g.nom, ordre_affichage: gi } });
        for (const m of g.matieres) {
            const mat = await prisma.matieres.create({
                data: { ecole_id, groupe_matiere_id: groupe.id, nom: m.nom, code: m.code, coefficient: m.coefficient, est_optionnelle: false },
            });
            matiereIds.push(mat.id);
        }
    }
    console.log('✓ Matières:', matiereIds.length);

    // 6. Salles ----------------------------------------------------------------
    for (const s of [{ nom: 'Room 1', type: 'classe' }, { nom: 'Room 2', type: 'classe' }, { nom: 'Science Laboratory', type: 'laboratoire' }]) {
        await prisma.salles.create({ data: { ecole_id, nom: s.nom, capacite: 45, type: s.type, est_disponible: true } });
    }
    console.log('✓ Salles');

    // 7. Classes (Forms + Lower Sixth séries) ----------------------------------
    const classesData = [
        { nom: 'Form 1',              niveau: 'Form 1',       serie: null,      frais: 120000 },
        { nom: 'Form 5',              niveau: 'Form 5',       serie: null,      frais: 145000 },
        { nom: 'Lower Sixth Science', niveau: 'Lower Sixth',  serie: 'Science', frais: 180000 },
        { nom: 'Lower Sixth Arts',    niveau: 'Lower Sixth',  serie: 'Arts',    frais: 180000 },
    ];
    const classeIds: string[] = [];
    for (const c of classesData) {
        const cl = await prisma.classes.create({
            data: { ecole_id, annee_id, nom: c.nom, niveau: c.niveau, serie: c.serie, capacite_max: 60, frais_scolarite_xaf: c.frais },
        });
        classeIds.push(cl.id);
    }
    console.log('✓ Classes:', classeIds.length);

    // 8. Enseignants (compte + profil) -----------------------------------------
    const hash = await bcrypt.hash('Prof1234!', 10);
    const profsData = [
        { email: 'prof.math@sholaris.demo', nom: 'Ekukole', prenom: 'Epie R.', specialite: 'Mathematics' },
        { email: 'prof.eng@sholaris.demo',  nom: 'Kimbeng', prenom: 'A.', specialite: 'English Language' },
    ];
    const profIds: string[] = [];
    for (let i = 0; i < profsData.length; i++) {
        const p = profsData[i];
        let u = await prisma.utilisateurs.findFirst({ where: { email: p.email } });
        if (!u) u = await prisma.utilisateurs.create({ data: { email: p.email, role: 'enseignant', mot_de_passe: hash } });
        let prof = await prisma.profils_enseignants.findFirst({ where: { utilisateur_id: u.id } });
        if (!prof) {
            prof = await prisma.profils_enseignants.create({
                data: { utilisateur_id: u.id, ecole_id, matricule: `TCH${i + 1}`, nom: p.nom, prenom: p.prenom, specialite: p.specialite },
            });
        } else {
            prof = await prisma.profils_enseignants.update({ where: { id: prof.id }, data: { ecole_id, nom: p.nom, prenom: p.prenom, specialite: p.specialite } });
        }
        profIds.push(prof.id);
    }
    console.log('✓ Enseignants:', profIds.length);

    // 9. Élèves + inscriptions ------------------------------------------------
    // Form 1 (ci=0) reçoit un effectif élevé (32) pour tester la pagination
    // des listes / bordereaux / cartes ; les autres classes gardent 5 élèves.
    const prenoms = ['Emmanuel', 'Mary', 'Kevin', 'Sandra', 'Blessing', 'Derick', 'Nadege', 'Precious', 'Clinton', 'Vanessa', 'Brian', 'Sylvie', 'Frankline', 'Miranda', 'Godlove', 'Bih', 'Ashley', 'Divine', 'Gladys', 'Ernest', 'Lucrece', 'Wilfred', 'Carine', 'Terence', 'Berthe', 'Rodrigue', 'Estelle', 'Yannick', 'Laura', 'Cedric', 'Manka', 'Ndzana'];
    const noms = ['Achu', 'Ako', 'Ambe', 'Ashu', 'Atabong', 'Bime', 'Bisong', 'Chia', 'Ebong', 'Enow', 'Eyong', 'Fon', 'Foncha', 'Fru', 'Kum', 'Manga', 'Mbah', 'Mbeng', 'Ncham', 'Ndip', 'Neba', 'Ngwa', 'Njie', 'Nkeng', 'Nsom', 'Ntui', 'Tabi', 'Tanyi', 'Tchoua', 'Wanki', 'Wirba', 'Yong'];
    let seq = 0, count = 0;
    for (let ci = 0; ci < classeIds.length; ci++) {
        const classe_id = classeIds[ci];
        const nStudents = ci === 0 ? 40 : 5;
        for (let k = 0; k < nStudents; k++) {
            seq++;
            const matricule = `GHA26${seq.toString().padStart(4, '0')}`;
            const idx = ci === 0 ? k : (ci * 5 + k);
            const el = await prisma.profils_eleves.create({
                data: {
                    ecole_id, matricule,
                    nom: noms[idx % noms.length],
                    prenom: prenoms[idx % prenoms.length],
                    date_naissance: new Date(2010 - ci, k % 12, (k % 27) + 1),
                    lieu_naissance: 'Bamenda',
                    nationalite: 'Cameroonian',
                    sexe: k % 2 === 0 ? 'M' : 'F',
                    numero_admission: `ADM/${25 - ci}/${seq.toString().padStart(3, '0')}`,
                    redoublant: k === 0, // 1er élève de chaque classe = redoublant (démo)
                    statut: 'actif',
                },
            });
            await prisma.inscriptions.create({
                data: { eleve_id: el.id, classe_id, annee_id, date_inscription: d('2025-09-08'), statut: 'actif', montant_scolarite_xaf: classesData[ci].frais },
            });
            count++;
        }
    }
    console.log('✓ Élèves inscrits:', count);

    // 10. Affectations matières → enseignants (Form 1) -------------------------
    for (let i = 0; i < Math.min(matiereIds.length, 6); i++) {
        await prisma.affectations_matieres.create({
            data: { classe_id: classeIds[0], matiere_id: matiereIds[i], enseignant_id: profIds[i % profIds.length], annee_id, volume_horaire: 4, est_actif: true },
        });
    }
    console.log('✓ Affectations');

    // 11. Tranches de paiement (fees per term) ---------------------------------
    const tranchesData = [
        { nom: 'First Term Fees',  montant: 40000, ordre: 1, echeance: '2025-09-30' },
        { nom: 'Second Term Fees', montant: 35000, ordre: 2, echeance: '2026-01-15' },
        { nom: 'Third Term Fees',  montant: 25000, ordre: 3, echeance: '2026-04-15' },
    ];
    for (const t of tranchesData) {
        await prisma.tranches_paiement.create({
            data: { ecole_id, annee_id, nom: t.nom, montant_xaf: t.montant, ordre: t.ordre, date_echeance: d(t.echeance), est_obligatoire: true },
        });
    }
    console.log('✓ Tranches paiement');

    console.log('\n✅ Seed démo (anglophone) terminé —', ecole.nom);
}

if (require.main === module) {
    main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
