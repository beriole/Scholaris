/**
 * Seed d'enrichissement — SYSTÈME ANGLOPHONE.
 * Remplit l'école démo avec des données réalistes pour tous les modules :
 *   - Affectations enseignants sur toutes les classes
 *   - Emploi du temps hebdomadaire
 *   - Notes sur les 3 séquences du First Term (colonnes T1/T2/T3)
 *   - Présences (avec absences)
 *   - Paiements espèces (soldes variés)
 *   - Bulletins de Term générés (agrégation des 3 séquences)
 *   - Compte admin_ecole de test
 *
 * Prérequis : seed_demo.ts déjà exécuté. Idempotent (best effort).
 *   npx ts-node src/scripts/seed_full.ts
 */
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';

const T = (hhmm: string): Date => {
    const [h, m] = hhmm.split(':').map(Number);
    const d = new Date(2025, 0, 1); d.setHours(h, m, 0, 0); return d;
};
const toNum = (v: any) => (v == null ? 0 : Number(v));
// pseudo-aléatoire déterministe (note 8–18)
const note = (seed: number) => Math.round((8 + (Math.sin(seed) + 1) * 5) * 4) / 4;
const appr = (a: number) => a >= 16 ? 'Very Good' : a >= 14 ? 'Good' : a >= 12 ? 'Fair' : a >= 10 ? 'Average' : 'Weak';

export async function main() {
    const ecole = await prisma.ecoles.findFirst();
    if (!ecole) throw new Error('École démo introuvable — lancez d\'abord seed_demo.ts');
    const ecole_id = ecole.id;
    const annee = await prisma.annees_scolaires.findFirst({ where: { ecole_id, est_active: true } });
    if (!annee) throw new Error('Année active introuvable');
    const annee_id = annee.id;

    const [classes, matieres, profs, periodes, evalTypes, tranches] = await Promise.all([
        prisma.classes.findMany({ where: { ecole_id, annee_id }, orderBy: { nom: 'asc' } }),
        prisma.matieres.findMany({ where: { ecole_id }, include: { groupe: true } }),
        prisma.profils_enseignants.findMany({ where: { ecole_id } }),
        prisma.periodes_evaluation.findMany({ where: { ecole_id, annee_id }, orderBy: { ordre: 'asc' } }),
        prisma.types_evaluation.findMany({ where: { ecole_id } }),
        prisma.tranches_paiement.findMany({ where: { ecole_id, annee_id }, orderBy: { ordre: 'asc' } }),
    ]);

    if (!classes.length || !matieres.length || !profs.length || !periodes.length || !evalTypes.length) {
        throw new Error('Données de base manquantes — lancez seed_demo.ts d\'abord.');
    }

    // Tous les Terms + leurs séquences (regroupées par date).
    const terms = periodes.filter(p => p.type === 'trimestre').sort((a, b) => a.ordre - b.ordre);
    if (!terms.length) throw new Error('Aucun trimestre trouvé.');
    const seqsOfTerm = (t: typeof terms[0]) => periodes
        .filter(p => p.type === 'sequence' && p.date_debut >= t.date_debut && p.date_debut <= t.date_fin)
        .sort((a, b) => a.ordre - b.ordre);
    console.log(`• Terms: ${terms.map(t => `${t.nom} (${seqsOfTerm(t).length} séq.)`).join(', ')}`);

    // Prof "science" / "arts" selon groupe de matières
    const profSci  = profs.find(p => /math/i.test(p.specialite ?? '')) ?? profs[0];
    const profArts = profs.find(p => /eng/i.test(p.specialite ?? '')) ?? profs[profs.length - 1];
    const profFor = (m: typeof matieres[0]) => /science/i.test(m.groupe?.nom ?? '') ? profSci.id : profArts.id;

    // ── 1. Affectations : toutes classes × toutes matières ────────────────────
    let affCount = 0;
    const affByClasseMat: Record<string, string> = {};
    for (const c of classes) {
        for (const m of matieres) {
            const ens = profFor(m);
            affByClasseMat[`${c.id}:${m.id}`] = ens;
            const exist = await prisma.affectations_matieres.findFirst({ where: { classe_id: c.id, matiere_id: m.id, annee_id } });
            if (!exist) {
                await prisma.affectations_matieres.create({
                    data: { classe_id: c.id, matiere_id: m.id, enseignant_id: ens, annee_id, coefficient: m.coefficient, volume_horaire: 4, est_actif: true },
                });
                affCount++;
            } else {
                affByClasseMat[`${c.id}:${m.id}`] = exist.enseignant_id;
            }
        }
    }
    console.log(`✓ Affectations: +${affCount}`);

    // ── 2. Emploi du temps ────────────────────────────────────────────────────
    const salle = await prisma.salles.findFirst({ where: { ecole_id } });
    const creneaux = [['07:30', '09:30'], ['09:45', '11:45'], ['12:00', '13:00'], ['14:00', '16:00']];
    let edtCount = 0;
    for (const c of classes) {
        let idx = 0;
        for (const m of matieres) {
            const jour = (idx % 5) + 1;
            const [hd, hf] = creneaux[idx % creneaux.length];
            idx++;
            const exist = await prisma.emplois_du_temps.findFirst({ where: { classe_id: c.id, annee_id, jour_semaine: jour, heure_debut: T(hd) } });
            if (!exist) {
                await prisma.emplois_du_temps.create({
                    data: { classe_id: c.id, matiere_id: m.id, enseignant_id: affByClasseMat[`${c.id}:${m.id}`], annee_id,
                        salle_id: salle?.id ?? null, jour_semaine: jour, heure_debut: T(hd), heure_fin: T(hf), est_actif: true },
                });
                edtCount++;
            }
        }
    }
    console.log(`✓ Emploi du temps: +${edtCount}`);

    // ── 3. Notes : UNE note par séquence, sur les 3 Terms (T1/T2/T3) ──────────
    const inscriptions = await prisma.inscriptions.findMany({
        where: { annee_id, statut: 'actif', classe: { ecole_id } },
        include: { eleve: true },
    });
    const seqType = evalTypes[0]; // type unique (Sequence Mark)
    let noteCount = 0; let s = 1;
    for (const term of terms) {
        const seqs = seqsOfTerm(term);
        for (const insc of inscriptions) {
            for (const m of matieres) {
                const ens = affByClasseMat[`${insc.classe_id}:${m.id}`];
                if (!ens) continue;
                for (let si = 0; si < seqs.length; si++) {
                    const seq = seqs[si];
                    s++;
                    const exist = await prisma.notes.findFirst({
                        where: { eleve_id: insc.eleve_id, matiere_id: m.id, type_evaluation_id: seqType.id, periode_id: seq.id },
                    });
                    if (!exist) {
                        await prisma.notes.create({
                            data: {
                                eleve_id: insc.eleve_id, classe_id: insc.classe_id, matiere_id: m.id,
                                type_evaluation_id: seqType.id, periode_id: seq.id, enseignant_id: ens,
                                valeur: note(s + term.ordre * 11 + si * 3), note_max: 20, est_absent: false, statut: 'saisi',
                            },
                        });
                        noteCount++;
                    }
                }
            }
        }
    }
    console.log(`✓ Notes: +${noteCount}`);

    // ── 4. Présences (séances avec absences) ──────────────────────────────────
    const dates = ['2025-09-15', '2025-09-17', '2025-09-22'];
    const matSci = matieres.find(m => /math/i.test(m.nom)) ?? matieres[0];
    let presCount = 0;
    for (const c of classes) {
        const inscC = inscriptions.filter(i => i.classe_id === c.id);
        const ens = affByClasseMat[`${c.id}:${matSci.id}`];
        for (let di = 0; di < dates.length; di++) {
            for (let ei = 0; ei < inscC.length; ei++) {
                const insc = inscC[ei];
                const statut = (ei === di) ? 'absent' : (ei === di + 1 ? 'retard' : 'present');
                const exist = await prisma.presences.findFirst({
                    where: { eleve_id: insc.eleve_id, classe_id: c.id, matiere_id: matSci.id, date_seance: new Date(dates[di]), heure_debut: T('07:30') },
                });
                if (!exist) {
                    await prisma.presences.create({
                        data: { eleve_id: insc.eleve_id, classe_id: c.id, matiere_id: matSci.id, enseignant_id: ens,
                            date_seance: new Date(dates[di]), heure_debut: T('07:30'), heure_fin: T('09:30'),
                            statut, justifiee: statut === 'absent' && ei % 2 === 0 },
                    });
                    presCount++;
                }
            }
        }
    }
    console.log(`✓ Présences: +${presCount}`);

    // ── 5. Paiements espèces ──────────────────────────────────────────────────
    const admin = await prisma.utilisateurs.findFirst({ where: { role: 'admin_ecole' } });
    const totalTranches = tranches.reduce((a, t) => a + Number(t.montant_xaf), 0) || 100000;
    let payCount = 0;
    for (let i = 0; i < inscriptions.length; i++) {
        const insc = inscriptions[i];
        const nbToPay = i % 3 === 0 ? tranches.length : i % 3 === 1 ? Math.max(1, tranches.length - 1) : 1;
        let cumul = 0;
        for (let ti = 0; ti < nbToPay && ti < tranches.length; ti++) {
            const tr = tranches[ti];
            cumul += Number(tr.montant_xaf);
            const numero = `SEED-${insc.id.slice(0, 8)}-${tr.ordre}`;
            const exist = await prisma.paiements.findFirst({ where: { numero_recu: numero } });
            if (!exist) {
                await prisma.paiements.create({
                    data: { ecole_id, inscription_id: insc.id,
                        montant_xaf: tr.montant_xaf, montant_total_xaf: totalTranches,
                        solde_restant_xaf: Math.max(0, totalTranches - cumul),
                        methode_paiement: 'especes', statut: 'confirme',
                        date_paiement: new Date(tr.date_echeance), numero_recu: numero, encaisse_par: admin?.id ?? null },
                });
                payCount++;
            }
        }
    }
    console.log(`✓ Paiements: +${payCount}`);

    // ── 6. Bulletins pour les 3 Terms (agrégation des séquences de chaque term) ─
    let bulCount = 0;
    for (const term of terms) {
        const seqIds = seqsOfTerm(term).map(s => s.id);
        for (const c of classes) {
            const inscC = inscriptions.filter(i => i.classe_id === c.id);
            const studentData: { eleve_id: string; moy: number; details: { matiere_id: string; moy: number }[] }[] = [];
            for (const insc of inscC) {
                const notes = await prisma.notes.findMany({
                    where: { eleve_id: insc.eleve_id, classe_id: c.id, periode_id: { in: seqIds } },
                    include: { type_evaluation: true },
                });
                const byMat: Record<string, { v: number; p: number }[]> = {};
                for (const n of notes) {
                    if ((n.statut ?? 'saisi') !== 'saisi') continue;
                    (byMat[n.matiere_id] ??= []).push({ v: toNum(n.valeur), p: toNum(n.type_evaluation?.ponderation) || 1 });
                }
                let totW = 0, totC = 0; const details: { matiere_id: string; moy: number }[] = [];
                for (const m of matieres) {
                    const ns = byMat[m.id]; if (!ns) continue;
                    const sw = ns.reduce((a, x) => a + x.v * x.p, 0), sc = ns.reduce((a, x) => a + x.p, 0);
                    const moyM = sc ? Math.round((sw / sc) * 100) / 100 : 0;
                    const coef = toNum(m.coefficient); totW += moyM * coef; totC += coef;
                    details.push({ matiere_id: m.id, moy: moyM });
                }
                studentData.push({ eleve_id: insc.eleve_id, moy: totC ? Math.round((totW / totC) * 100) / 100 : 0, details });
            }
            const ranked = [...studentData].sort((a, b) => b.moy - a.moy);
            for (const sd of studentData) {
                const rang = ranked.findIndex(r => r.eleve_id === sd.eleve_id) + 1;
                const bul = await prisma.bulletins.upsert({
                    where: { eleve_id_periode_id: { eleve_id: sd.eleve_id, periode_id: term.id } },
                    create: { eleve_id: sd.eleve_id, classe_id: c.id, periode_id: term.id,
                        moyenne_generale: sd.moy, rang, effectif_classe: inscC.length,
                        appreciation_generale: appr(sd.moy), version: 1, statut_generation: 'genere',
                        genere_par: admin?.id ?? null, generated_at: new Date() },
                    update: { moyenne_generale: sd.moy, rang, effectif_classe: inscC.length, appreciation_generale: appr(sd.moy) },
                });
                await prisma.details_bulletin.deleteMany({ where: { bulletin_id: bul.id } });
                await prisma.details_bulletin.createMany({
                    data: sd.details.map(dd => ({ bulletin_id: bul.id, matiere_id: dd.matiere_id, moyenne_matiere: dd.moy, appreciation_matiere: appr(dd.moy) })),
                });
                bulCount++;
            }
        }
    }
    console.log(`✓ Bulletins (3 Terms): ${bulCount}`);

    // ── 7. Compte admin_ecole de test ─────────────────────────────────────────
    const adminEmail = 'admin.demo@sholaris.demo';
    let adminEcole = await prisma.utilisateurs.findFirst({ where: { email: adminEmail } });
    if (!adminEcole) {
        adminEcole = await prisma.utilisateurs.create({
            data: { email: adminEmail, role: 'admin_ecole', mot_de_passe: await bcrypt.hash('Admin1234!', 10), est_actif: true },
        });
        console.log('✓ Compte admin_ecole créé');
    }

    console.log('\n✅ Seed complet (anglophone) terminé.');
    console.log('───────── TEST ACCOUNTS ─────────');
    console.log('Super Admin  : berioletsague@gmail.com   / Admin1234!');
    console.log('Admin École  : admin.demo@sholaris.demo   / Admin1234!');
    console.log('Teacher 1    : prof.math@sholaris.demo    / Prof1234!   (Ako Peter — Mathematics)');
    console.log('Teacher 2    : prof.eng@sholaris.demo     / Prof1234!   (Ngwa Grace — English)');
    console.log(`Classes: ${classes.length} · Students: ${inscriptions.length} · Subjects: ${matieres.length}`);
}

if (require.main === module) {
    main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
