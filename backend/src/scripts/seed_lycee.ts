/**
 * Seed complet de l'établissement « lycee classique ».
 * Peuple TOUS les acteurs (admin, enseignants, parents, élèves) avec des mots de passe
 * connus + toutes les données opérationnelles, afin de tester chaque fonctionnalité.
 * Idempotent : relançable sans créer de doublons.
 *
 *   npx ts-node src/scripts/seed_lycee.ts
 */
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';

const TENANT_ID = 'de26ae4e-fc05-4ab8-b259-78cf870363c3'; // lycee classique

// Mots de passe de test (connus, à usage de recette uniquement)
const PWD = { admin: 'Admin1234!', prof: 'Prof1234!', parent: 'Parent1234!', eleve: 'Eleve1234!' };

const D = (s: string) => new Date(s);
const time = (hhmm: string) => new Date(`1970-01-01T${hhmm}:00`);
const rnd = (min: number, max: number) => Math.round((Math.random() * (max - min) + min) * 100) / 100;

async function upsertUser(email: string, role: string, plain: string) {
    let u = await prisma.utilisateurs.findFirst({ where: { tenant_id: TENANT_ID, email } });
    const hash = await bcrypt.hash(plain, 10);
    if (!u) {
        u = await prisma.utilisateurs.create({ data: { tenant_id: TENANT_ID, email, role, mot_de_passe: hash, est_actif: true } });
    } else {
        // (re)définir le mot de passe connu pour la recette
        u = await prisma.utilisateurs.update({ where: { id: u.id }, data: { mot_de_passe: hash, est_actif: true, role } });
    }
    return u;
}

async function main() {
    // 1. École -----------------------------------------------------------------
    let ecole = await prisma.ecoles.findFirst({ where: { tenant_id: TENANT_ID } });
    if (!ecole) {
        ecole = await prisma.ecoles.create({
            data: { tenant_id: TENANT_ID, nom: 'Lycée Classique', code: 'LYCLA', ville: 'Yaoundé', region: 'Centre', systeme_notation: 'sur_20' },
        });
    }
    const ecole_id = ecole.id;
    console.log('• École:', ecole.nom, ecole_id);

    // 2. Année active ----------------------------------------------------------
    let annee = await prisma.annees_scolaires.findFirst({ where: { ecole_id, libelle: '2025-2026' } });
    if (!annee) {
        annee = await prisma.annees_scolaires.create({
            data: { ecole_id, libelle: '2025-2026', date_debut: D('2025-09-01'), date_fin: D('2026-07-15'), est_active: true },
        });
    }
    const annee_id = annee.id;
    // Garantir une SEULE année active (d'anciens tests pouvaient en laisser plusieurs).
    await prisma.annees_scolaires.updateMany({ where: { ecole_id, id: { not: annee_id } }, data: { est_active: false } });
    await prisma.annees_scolaires.update({ where: { id: annee_id }, data: { est_active: true } });
    await prisma.ecoles.update({ where: { id: ecole_id }, data: { annee_active_id: annee_id } });

    // 3. Séquences d'évaluation (système MINESEC : 5 séquences, type 'sequence') -
    //    Nettoyage d'anciennes périodes mal typées (trimestre) d'un seed précédent.
    const oldTrim = await prisma.periodes_evaluation.findMany({ where: { ecole_id, annee_id, type: 'trimestre' }, select: { id: true } });
    if (oldTrim.length) {
        const ids = oldTrim.map(p => p.id);
        await prisma.notes.deleteMany({ where: { periode_id: { in: ids } } });
        await prisma.bulletins.deleteMany({ where: { periode_id: { in: ids } } });
        await prisma.periodes_evaluation.deleteMany({ where: { id: { in: ids } } });
    }
    const periodeIds: string[] = [];
    for (let o = 1; o <= 5; o++) {
        let per = await prisma.periodes_evaluation.findFirst({ where: { ecole_id, annee_id, ordre: o, type: 'sequence' } });
        if (!per) per = await prisma.periodes_evaluation.create({
            data: { ecole_id, annee_id, nom: `Séquence ${o}`, type: 'sequence', ordre: o, date_debut: annee.date_debut, date_fin: annee.date_fin, notes_cloturees: false, bulletins_publies: false },
        });
        periodeIds.push(per.id);
    }

    // 4. Types d'évaluation (défauts de l'app : D1, D2, Composition) ------------
    await prisma.types_evaluation.deleteMany({ where: { ecole_id, code: 'DEV' } }); // ancien type erroné
    const typesData = [
        { nom: 'Devoir 1', code: 'D1', ponderation: 1 },
        { nom: 'Devoir 2', code: 'D2', ponderation: 1 },
        { nom: 'Composition', code: 'COMP', ponderation: 2 },
    ];
    const typeIds: string[] = [];
    for (const t of typesData) {
        let ty = await prisma.types_evaluation.findFirst({ where: { ecole_id, code: t.code } });
        if (!ty) ty = await prisma.types_evaluation.create({ data: { ecole_id, nom: t.nom, code: t.code, ponderation: t.ponderation } });
        else ty = await prisma.types_evaluation.update({ where: { id: ty.id }, data: { nom: t.nom, ponderation: t.ponderation } });
        typeIds.push(ty.id);
    }

    // 5. Groupes & matières ----------------------------------------------------
    const groupesData = [
        { nom: 'Sciences', matieres: [
            { nom: 'Mathématiques', code: 'MATH', coefficient: 5 },
            { nom: 'Physique-Chimie', code: 'PC', coefficient: 4 },
            { nom: 'SVT', code: 'SVT', coefficient: 3 },
        ]},
        { nom: 'Lettres & Langues', matieres: [
            { nom: 'Français', code: 'FR', coefficient: 4 },
            { nom: 'Anglais', code: 'ANG', coefficient: 3 },
            { nom: 'Philosophie', code: 'PHILO', coefficient: 3 },
            { nom: 'Histoire-Géographie', code: 'HG', coefficient: 2 },
        ]},
        { nom: 'Autres', matieres: [
            { nom: 'EPS', code: 'EPS', coefficient: 1 },
        ]},
    ];
    const matieres: { id: string; code: string }[] = [];
    for (let gi = 0; gi < groupesData.length; gi++) {
        const g = groupesData[gi];
        let groupe = await prisma.groupes_matieres.findFirst({ where: { ecole_id, nom: g.nom } });
        if (!groupe) groupe = await prisma.groupes_matieres.create({ data: { ecole_id, nom: g.nom, ordre_affichage: gi } });
        for (const m of g.matieres) {
            let mat = await prisma.matieres.findFirst({ where: { ecole_id, code: m.code } });
            if (!mat) mat = await prisma.matieres.create({ data: { ecole_id, groupe_matiere_id: groupe.id, nom: m.nom, code: m.code, coefficient: m.coefficient, est_optionnelle: false } });
            matieres.push({ id: mat.id, code: m.code });
        }
    }

    // 6. Salles ----------------------------------------------------------------
    const salleIds: string[] = [];
    for (const s of [{ nom: 'Salle 101', type: 'classe' }, { nom: 'Salle 102', type: 'classe' }, { nom: 'Labo PC', type: 'laboratoire' }, { nom: 'Salle Info', type: 'salle_info' }]) {
        let sa = await prisma.salles.findFirst({ where: { ecole_id, nom: s.nom } });
        if (!sa) sa = await prisma.salles.create({ data: { ecole_id, nom: s.nom, capacite: 45, type: s.type, est_disponible: true } });
        salleIds.push(sa.id);
    }

    // 7. Classes ---------------------------------------------------------------
    const classesData = [
        { nom: '2nde C', niveau: '2nde', frais: 90000 },
        { nom: '1ère D', niveau: '1ère', frais: 100000 },
        { nom: 'Tle C',  niveau: 'Terminale', frais: 120000 },
    ];
    const classes: { id: string; nom: string; frais: number }[] = [];
    for (const c of classesData) {
        let cl = await prisma.classes.findFirst({ where: { ecole_id, annee_id, nom: c.nom } });
        if (!cl) cl = await prisma.classes.create({ data: { ecole_id, annee_id, nom: c.nom, niveau: c.niveau, capacite_max: 50, frais_scolarite_xaf: c.frais } });
        classes.push({ id: cl.id, nom: c.nom, frais: c.frais });
    }

    // 8. Enseignants -----------------------------------------------------------
    const profsData = [
        { email: 'angelleg888@gmail.com',     nom: 'Angele',  prenom: 'Grace',   specialite: 'Mathématiques' },
        { email: 'prof.pc@lycla.demo',        nom: 'Etoa',    prenom: 'Robert',  specialite: 'Physique-Chimie' },
        { email: 'prof.svt@lycla.demo',       nom: 'Biya',    prenom: 'Yolande', specialite: 'SVT' },
        { email: 'prof.lettres@lycla.demo',   nom: 'Ngo',     prenom: 'Pauline', specialite: 'Français' },
        { email: 'prof.philo@lycla.demo',     nom: 'Kamga',   prenom: 'Daniel',  specialite: 'Philosophie' },
    ];
    const profs: { id: string; specialite: string }[] = [];
    for (let i = 0; i < profsData.length; i++) {
        const p = profsData[i];
        const u = await upsertUser(p.email, 'enseignant', PWD.prof);
        let prof = await prisma.profils_enseignants.findFirst({ where: { utilisateur_id: u.id } });
        if (!prof) prof = await prisma.profils_enseignants.create({
            data: { utilisateur_id: u.id, ecole_id, matricule: `LYCLAENS${(i + 1).toString().padStart(3, '0')}`, nom: p.nom, prenom: p.prenom, specialite: p.specialite, date_prise_service: D('2024-09-01') },
        });
        profs.push({ id: prof.id, specialite: p.specialite });
    }
    // Enseignant principal de chaque classe
    for (let i = 0; i < classes.length; i++) {
        await prisma.classes.update({ where: { id: classes[i].id }, data: { enseignant_principal_id: profs[i % profs.length].id } });
    }

    // 9. Admin de l'école (réinitialise le mot de passe pour la recette) -------
    await upsertUser('tsaguedjeume@gmail.com', 'admin_ecole', PWD.admin);

    // 10. Affectations matières → enseignants (toutes classes) -----------------
    const profForCode = (code: string): string => {
        const map: Record<string, string> = { MATH: 'Mathématiques', PC: 'Physique-Chimie', SVT: 'SVT', FR: 'Français', ANG: 'Français', PHILO: 'Philosophie', HG: 'Philosophie', EPS: 'Mathématiques' };
        const spec = map[code];
        return (profs.find(p => p.specialite === spec) ?? profs[0]).id;
    };
    for (const cl of classes) {
        for (const m of matieres) {
            const exist = await prisma.affectations_matieres.findFirst({ where: { classe_id: cl.id, matiere_id: m.id, annee_id } });
            if (!exist) await prisma.affectations_matieres.create({
                data: { classe_id: cl.id, matiere_id: m.id, enseignant_id: profForCode(m.code), annee_id, volume_horaire: 4, est_actif: true },
            });
        }
    }

    // 11. Élèves (compte eleve) + parents + inscriptions -----------------------
    const prenomsM = ['Paul', 'Eric', 'Yvan', 'Brice', 'Hervé', 'Landry'];
    const prenomsF = ['Aline', 'Sandra', 'Clarisse', 'Nadia', 'Estelle', 'Carine'];
    const noms = ['Tchoua', 'Fotso', 'Kana', 'Ngono', 'Bekolo', 'Atangana', 'Manga', 'Eyenga', 'Onana', 'Mvondo', 'Abega', 'Essomba'];
    const tranchesTotalByClass: Record<string, number> = {};

    let gIdx = 0;
    const inscriptionsAll: { id: string; eleve_id: string; classe_id: string; classeNom: string; frais: number }[] = [];
    for (let ci = 0; ci < classes.length; ci++) {
        const cl = classes[ci];
        for (let k = 0; k < 6; k++) {
            const isM = k % 2 === 0;
            const prenom = isM ? prenomsM[k % prenomsM.length] : prenomsF[k % prenomsF.length];
            const nom = noms[gIdx % noms.length];
            const matricule = `LYCLA26${(ci * 100 + k + 1).toString().padStart(4, '0')}`;
            const email = `eleve.${matricule.toLowerCase()}@lycla.demo`;

            // compte utilisateur élève
            const uEleve = await upsertUser(email, 'eleve', PWD.eleve);
            let el = await prisma.profils_eleves.findFirst({ where: { ecole_id, matricule } });
            if (!el) el = await prisma.profils_eleves.create({
                data: { utilisateur_id: uEleve.id, ecole_id, matricule, nom, prenom, date_naissance: D(`200${7 - ci}-0${(k % 9) + 1}-15`), lieu_naissance: 'Yaoundé', sexe: isM ? 'M' : 'F', statut: 'actif' },
            });

            // inscription
            let insc = await prisma.inscriptions.findFirst({ where: { eleve_id: el.id, classe_id: cl.id, annee_id } });
            if (!insc) insc = await prisma.inscriptions.create({
                data: { eleve_id: el.id, classe_id: cl.id, annee_id, date_inscription: D('2025-09-05'), statut: 'actif', montant_scolarite_xaf: cl.frais },
            });
            inscriptionsAll.push({ id: insc.id, eleve_id: el.id, classe_id: cl.id, classeNom: cl.nom, frais: cl.frais });

            // parent (1 parent pour 1 élève ici)
            const parentEmail = `parent.${matricule.toLowerCase()}@lycla.demo`;
            const uParent = await upsertUser(parentEmail, 'parent', PWD.parent);
            let parent = await prisma.profils_parents.findFirst({ where: { utilisateur_id: uParent.id } });
            if (!parent) parent = await prisma.profils_parents.create({
                data: { utilisateur_id: uParent.id, nom, prenom: `Parent ${prenom}`, telephone: `+2376${(80000000 + gIdx).toString()}`, telephone_mobile_money: `+2376${(80000000 + gIdx).toString()}`, operateur_mobile_money: 'MTN', profession: 'Commerçant' },
            });
            const lien = await prisma.eleve_parent.findFirst({ where: { eleve_id: el.id, parent_id: parent.id } });
            if (!lien) await prisma.eleve_parent.create({
                data: { eleve_id: el.id, parent_id: parent.id, lien_parente: isM ? 'pere' : 'mere', contact_principal: true, peut_payer: true, peut_voir_notes: true },
            });

            gIdx++;
        }
        tranchesTotalByClass[cl.id] = cl.frais;
    }
    console.log('• Élèves + parents:', inscriptionsAll.length);

    // 12. Tranches de paiement (par classe) -----------------------------------
    for (const cl of classes) {
        const tr = [
            { nom: '1ère tranche', montant: Math.round(cl.frais * 0.4), ordre: 1, echeance: '2025-10-01' },
            { nom: '2e tranche',   montant: Math.round(cl.frais * 0.3), ordre: 2, echeance: '2026-01-15' },
            { nom: '3e tranche',   montant: Math.round(cl.frais * 0.3), ordre: 3, echeance: '2026-04-15' },
        ];
        for (const t of tr) {
            const exist = await prisma.tranches_paiement.findFirst({ where: { ecole_id, annee_id, classe_id: cl.id, nom: t.nom } });
            if (!exist) await prisma.tranches_paiement.create({
                data: { ecole_id, annee_id, classe_id: cl.id, nom: t.nom, montant_xaf: t.montant, ordre: t.ordre, date_echeance: D(t.echeance), est_obligatoire: true },
            });
        }
    }

    // 13. Notes (1er trimestre, toutes matières, 2 types d'éval) ---------------
    const periode1 = periodeIds[0];
    let notesCount = 0;
    for (const insc of inscriptionsAll) {
        for (const m of matieres) {
            const enseignant_id = profForCode(m.code);
            for (const type_evaluation_id of typeIds) {
                const exist = await prisma.notes.findFirst({ where: { eleve_id: insc.eleve_id, matiere_id: m.id, type_evaluation_id, periode_id: periode1 } });
                if (!exist) {
                    await prisma.notes.create({
                        data: { eleve_id: insc.eleve_id, matiere_id: m.id, classe_id: insc.classe_id, periode_id: periode1, type_evaluation_id, enseignant_id, valeur: rnd(6, 18), note_max: 20, est_absent: false },
                    });
                    notesCount++;
                }
            }
        }
    }
    console.log('• Notes créées:', notesCount);

    // 14. Présences (2 séances de maths par classe) ----------------------------
    const math = matieres.find(m => m.code === 'MATH')!;
    const mathProf = profForCode('MATH');
    let presCount = 0;
    for (const cl of classes) {
        const inscs = inscriptionsAll.filter(i => i.classe_id === cl.id);
        for (const dseance of ['2025-10-06', '2025-10-13']) {
            const already = await prisma.presences.findFirst({ where: { classe_id: cl.id, matiere_id: math.id, date_seance: D(dseance) } });
            if (already) continue;
            for (let i = 0; i < inscs.length; i++) {
                const statut = i === 0 ? 'absent' : i === 1 ? 'retard' : 'present';
                await prisma.presences.create({
                    data: { eleve_id: inscs[i].eleve_id, classe_id: cl.id, matiere_id: math.id, enseignant_id: mathProf, date_seance: D(dseance), heure_debut: time('08:00'), heure_fin: time('10:00'), statut, justifiee: false },
                });
                presCount++;
            }
        }
    }
    console.log('• Présences créées:', presCount);

    // 15. Paiements (1ère tranche payée pour ~2/3 des élèves) ------------------
    const admin = await prisma.utilisateurs.findFirst({ where: { tenant_id: TENANT_ID, email: 'tsaguedjeume@gmail.com' } });
    let payCount = 0;
    for (let i = 0; i < inscriptionsAll.length; i++) {
        if (i % 3 === 2) continue; // 1 élève sur 3 n'a rien payé
        const insc = inscriptionsAll[i];
        const numero_recu = `RECU-LYCLA-${(i + 1).toString().padStart(4, '0')}`;
        const exist = await prisma.paiements.findFirst({ where: { numero_recu } });
        if (exist) continue;
        const montant = Math.round(insc.frais * 0.4);
        await prisma.paiements.create({
            data: {
                tenant_id: TENANT_ID, ecole_id, inscription_id: insc.id,
                montant_xaf: montant, montant_total_xaf: insc.frais, solde_restant_xaf: insc.frais - montant,
                methode_paiement: i % 2 === 0 ? 'especes' : 'mtn_mobile_money', statut: 'confirme',
                date_paiement: D('2025-10-02'), numero_recu, encaisse_par: admin?.id ?? null,
            },
        });
        payCount++;
    }
    console.log('• Paiements créés:', payCount);

    // 16. Emploi du temps (quelques créneaux pour la 1ère classe) --------------
    const cl0 = classes[0];
    const edtData = [
        { jour: 1, deb: '08:00', fin: '10:00', code: 'MATH', salle: 0 },
        { jour: 1, deb: '10:15', fin: '12:00', code: 'FR', salle: 0 },
        { jour: 2, deb: '08:00', fin: '10:00', code: 'PC', salle: 2 },
        { jour: 3, deb: '08:00', fin: '10:00', code: 'ANG', salle: 1 },
    ];
    let edtCount = 0;
    for (const e of edtData) {
        const mat = matieres.find(m => m.code === e.code)!;
        const exist = await prisma.emplois_du_temps.findFirst({ where: { classe_id: cl0.id, annee_id, jour_semaine: e.jour, heure_debut: time(e.deb) } });
        if (!exist) {
            await prisma.emplois_du_temps.create({
                data: { classe_id: cl0.id, matiere_id: mat.id, enseignant_id: profForCode(e.code), salle_id: salleIds[e.salle], annee_id, jour_semaine: e.jour, heure_debut: time(e.deb), heure_fin: time(e.fin), est_actif: true },
            });
            edtCount++;
        }
    }
    console.log('• Créneaux EDT créés:', edtCount);

    // 17. Calendrier scolaire --------------------------------------------------
    const calData = [
        { date_debut: '2025-12-16', date_fin: '2026-01-04', type: 'vacances', libelle: 'Vacances de Noël' },
        { date_debut: '2026-02-11', date_fin: null, type: 'ferie', libelle: 'Fête de la Jeunesse' },
        { date_debut: '2025-12-08', date_fin: '2025-12-13', type: 'examen', libelle: 'Composition 1er Trimestre' },
    ];
    for (const c of calData) {
        const exist = await prisma.calendrier_scolaire.findFirst({ where: { ecole_id, annee_id, libelle: c.libelle } });
        if (!exist) await prisma.calendrier_scolaire.create({
            data: { ecole_id, annee_id, date_debut: D(c.date_debut), date_fin: c.date_fin ? D(c.date_fin) : null, type: c.type, libelle: c.libelle, affecte_presences: c.type !== 'examen' },
        });
    }

    // 18. Messages (admin → 1er prof) -----------------------------------------
    const prof1User = await prisma.utilisateurs.findFirst({ where: { tenant_id: TENANT_ID, email: 'angelleg888@gmail.com' } });
    if (admin && prof1User) {
        const exist = await prisma.messages.findFirst({ where: { expediteur_id: admin.id, destinataire_id: prof1User.id, sujet: 'Réunion pédagogique' } });
        if (!exist) await prisma.messages.create({
            data: { tenant_id: TENANT_ID, expediteur_id: admin.id, destinataire_id: prof1User.id, sujet: 'Réunion pédagogique', corps: 'Bonjour, réunion ce vendredi à 15h en salle des profs.', est_lu: false },
        });
    }

    console.log('\n✅ Seed « lycee classique » terminé.');
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
