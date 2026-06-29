# Sholaris — Audit complet du Dashboard & Plan de test professionnel

> Date : 2026-06-17 · Périmètre : tous les modules et sous-modules du tableau de bord école
> Méthode : revue de code (frontend ↔ backend), tests d'intégration live (REST/curl) avec un compte super_admin réel.

---

## 1. Résumé exécutif

L'audit a révélé que **la majorité des « erreurs » provenaient d'une seule cause racine** : le compte
super_admin (`berioletsague@gmail.com`, tenant `a04c0c79…`) **n'avait aucune école rattachée**.
Or quasiment tous les contrôleurs résolvent l'école via `tenant_id` → renvoyaient `404 « École introuvable »`
en cascade (dashboard, élèves, enseignants, paramètres, évaluations, finances, présences, emploi du temps, rapports).

En complément, **5 vrais bugs de code** ont été identifiés et corrigés (messagerie, saisie des notes,
saisie des présences, authentification des routes académiques).

| # | Sévérité | Module | Statut |
|---|----------|--------|--------|
| 1 | 🔴 Bloquant | Données : aucune école pour le tenant super_admin | ✅ Corrigé (seed) |
| 2 | 🔴 Bloquant | Notes : payload front/back incompatible + FK `enseignant_id` invalide | ✅ Corrigé |
| 3 | 🟠 Majeur | Présences : profil enseignant requis (échec pour admin) | ✅ Corrigé |
| 4 | 🟠 Majeur | Messagerie : contacts hors-tenant injoignables | ✅ Corrigé |
| 5 | 🟡 Sécurité | Routes `/api/academic/*` sans authentification | ✅ Corrigé |
| 6 | 🟡 Sécurité | Routes `/api/tenants/*` sans authentification | ⚠️ À corriger |
| 7 | 🟢 UX | Boutons d'action des matières inopérants | ✅ Corrigé (session préc.) |

---

## 2. Détail des bugs corrigés

### Bug #1 — Cascade « École introuvable » (cause racine)
- **Symptôme** : 404 sur dashboard, élèves, enseignants, settings, eval-types, finance, attendance, timetable, reports.
- **Cause** : le tenant du super_admin n'a pas d'entrée `ecoles`. Les contrôleurs font
  `prisma.ecoles.findFirst({ where: { tenant_id } })` → `null` → 404.
- **Correctif** : script `backend/src/scripts/seed_demo.ts` (idempotent) qui provisionne pour ce tenant
  une école complète : année active, 3 trimestres, types d'évaluation, 2 groupes / 6 matières,
  3 salles, 3 classes (6ème M1, 6ème M2, 5ème), 2 enseignants, 12 élèves inscrits, affectations, 3 tranches.
- **Recommandation produit** : à l'inscription d'un établissement, créer systématiquement l'`ecole`
  + une année active par défaut (à intégrer dans `authController.register`).

### Bug #2 — Saisie des notes cassée (POST /api/grades/bulk)
- **Cause 1** : le frontend envoie `{ inscription_id, matiere_id, periode_id, type_eval_id, valeur }`
  mais le backend lisait `eleve_id`, `classe_id`, `type_evaluation_id` → champs `undefined`.
- **Cause 2** : `enseignant_id = req.user.id` (UUID *utilisateur*) alors que `notes.enseignant_id`
  est une FK vers `profils_enseignants.id` → violation de contrainte → 500 **pour tous, même les profs**.
- **Correctif** : le backend résout `eleve_id`/`classe_id` depuis l'inscription, et `enseignant_id`
  via le profil de l'utilisateur connecté, sinon via l'enseignant affecté à la matière.

### Bug #3 — Saisie des présences impossible pour un admin (POST /api/attendance/session)
- **Cause** : recherche du profil enseignant via `req.user.id` ; un admin_ecole/super_admin n'en a pas → 404.
- **Correctif** : repli sur l'enseignant affecté à la matière+classe (`affectations_matieres`).

### Bug #4 — Messagerie : destinataires injoignables
- **Cause** : pour un super_admin, `getContacts` listait les admins d'**autres** tenants (et excluait
  ses propres enseignants). Or `sendMessage`/`getInbox` sont scopés par `tenant_id` → 404 à l'envoi,
  et un message inter-tenant ne serait jamais reçu.
- **Correctif** : `getContacts` ne renvoie plus que les utilisateurs du même établissement.

### Bug #5 — Routes académiques non authentifiées
- **Cause** : `academicRoutes.ts` n'appliquait ni `authenticateJWT` ni `requireRole`.
- **Correctif** : ajout de `router.use(authenticateJWT)` + `requireRole(['super_admin','admin_ecole'])`.

### Bug #6 — Routes `/api/tenants/*` non authentifiées (ouvert)
- **Risque** : `GET /api/tenants/list` et `/stats` exposent tous les établissements sans token.
- **Reco** : ajouter `authenticateJWT` + `requireRole(['super_admin'])`.

---

## 3. État de chaque module (après correctifs)

Légende : ✅ vérifié OK · 🔧 corrigé puis vérifié · ⚠️ à surveiller

| Module | Sous-module | Endpoint(s) clés | Statut |
|--------|-------------|------------------|--------|
| Tableau de bord | KPIs | `GET /dashboard/stats` | ✅ |
| Années scolaires | CRUD | `GET/POST /academic/years` | ✅ |
| Classes | CRUD | `GET/POST /academic/classes` | ✅ |
| Matières | Groupes + matières + édition/suppr. | `…/subject-groups`, `…/subjects` | 🔧 |
| Élèves | Liste, création (matricule auto), édition, archive | `GET/POST/PUT/PATCH /students` | ✅ |
| Enseignants | Liste, création (matricule auto), édition, désactiv. | `GET/POST/PUT/PATCH /teachers` | ✅ |
| Affectations | Matière→enseignant, coefficient par classe | `GET/POST/PUT/DELETE /affectations` | ✅ |
| Notes | Feuille de notes, saisie en masse | `GET /grades/sheet`, `POST /grades/bulk` | 🔧 |
| Bulletins | Génération, consultation | `POST /bulletins/generate`, `GET /bulletins/class` | ✅ |
| Finances | Tranches, paiements, statut classe, stats | `/finance/*` | ✅ |
| Présences | Saisie séance, stats, justifications | `/attendance/*` | 🔧 |
| Emploi du temps | Créneaux, salles | `/timetable/*` | ✅ |
| Calendrier | Événements scolaires | `/calendar/*` | ✅ |
| Messagerie | Contacts, boîte, envoi, suppression | `/messages/*` | 🔧 |
| Rapports | Académique, présences, finances | `/reports/*` | ✅ |
| Paramètres | École, année active, profil, mot de passe | `/settings/*` | ✅ |

---

## 4. Plan de test professionnel

### 4.1 Pré-requis & jeu de données
1. Backend démarré : `cd backend && npm run dev` (port 3000).
2. Frontend démarré : `cd frontend && npm run dev`.
3. Jeu de données démo : `cd backend && npx ts-node src/scripts/seed_demo.ts` (idempotent).
4. Comptes :
   - Super admin / admin : `berioletsague@gmail.com` / `Admin1234!`
   - Enseignants démo : `prof.math@sholaris.demo`, `prof.fr@sholaris.demo` / `Prof1234!`

### 4.2 Stratégie
- **Tests de fumée (smoke)** : connexion + chargement de chaque page sans erreur console/réseau.
- **Tests fonctionnels (E2E)** : scénarios bout-en-bout par module (tableau ci-dessous).
- **Tests d'intégration API** : script `curl` couvrant chaque endpoint (déjà exécuté pendant l'audit).
- **Tests de non-régression** : rejouer la matrice après chaque déploiement.
- **Tests de sécurité/RBAC** : vérifier 401 sans token, 403 pour rôle non autorisé.

### 4.3 Matrice de cas de test E2E

| ID | Module | Scénario | Étapes | Résultat attendu |
|----|--------|----------|--------|------------------|
| TC-01 | Auth | Connexion valide | Login admin → | Redirection `/ecole-dashboard` |
| TC-02 | Auth | Connexion invalide | Mauvais mdp → | Message « Identifiants invalides » |
| TC-03 | Auth | Accès sans token | Appel API direct sans Bearer | `401` |
| TC-04 | Année | Créer année | Formulaire → enregistrer | Année listée, activable |
| TC-05 | Classe | Créer 6ème M1 & M2 | 2 créations même niveau | Les 2 classes coexistent |
| TC-06 | Matière | Créer groupe + matière | + coefficient | Apparaît dans le groupe |
| TC-07 | Matière | Éditer / supprimer matière | Crayon / poubelle | Mise à jour / retrait |
| TC-08 | Élève | Créer élève sans matricule | Remplir nom/prénom/naissance | Matricule auto `SHOLA26xxxx` |
| TC-09 | Élève | Éditer / archiver | | Statut mis à jour |
| TC-10 | Enseignant | Créer enseignant | Email + spécialité | Matricule auto `ENSxxx`, compte créé |
| TC-11 | Affectation | Affecter prof à matière+classe | + coefficient classe | Ligne créée, doublon refusé (409) |
| TC-12 | Notes | Saisir notes d'une classe | Feuille → valeurs → enregistrer | « N note(s) enregistrée(s) » |
| TC-13 | Notes | Valeur hors [0,20] | Saisir 25 | Erreur de validation |
| TC-14 | Bulletin | Générer bulletins | Classe + période | Moyennes calculées (coef pris en compte) |
| TC-15 | Finance | Créer tranche | Montant + échéance | Tranche listée |
| TC-16 | Finance | Enregistrer paiement espèces | Élève + montant | Reçu créé, taux recouvrement maj |
| TC-17 | Présence | Saisir séance | Classe+matière+créneau | « Séance enregistrée » |
| TC-18 | Présence | Justifier absence | Onglet justifications | Statut mis à jour |
| TC-19 | Emploi du temps | Créer créneau + salle | Jour/heure/salle | Créneau visible |
| TC-20 | Calendrier | Ajouter férié | Date + type | Événement affiché |
| TC-21 | Messagerie | Envoyer message | Choisir contact → envoyer | Reçu dans la boîte du destinataire |
| TC-22 | Rapports | Afficher 3 onglets | Académique/Présences/Finances | Données cohérentes |
| TC-23 | Paramètres | Changer année active | Sélection → enregistrer | Année active mise à jour |
| TC-24 | Paramètres | Changer mot de passe | Ancien+nouveau | Reconnexion OK |
| TC-25 | RBAC | Enseignant accède admin | (futur) | 403 |

### 4.4 Critères de sortie
- 100 % des cas bloquants/majeurs (TC-01→TC-22) au vert.
- Aucune erreur 4xx/5xx inattendue dans la console réseau.
- Aucune erreur JS non gérée dans la console navigateur.

---

## 5. Recommandations (dette technique)

1. **Provisionnement automatique** : créer `ecole` + année active dès `register` (évite la cause racine #1).
2. **Sécuriser `/api/tenants/*`** (bug #6).
3. **Centraliser la résolution d'école** : un helper unique `getEcoleId(req)` partagé par tous les contrôleurs
   (aujourd'hui dupliqué et incohérent : `findUnique` vs `findFirst` vs `resolveEcoleId`).
4. **Contrat d'API** : aligner systématiquement les noms de champs front/back (le bug #2 venait d'un écart
   silencieux). Envisager des types partagés (zod/DTO).
5. **Tests automatisés** : convertir la matrice §4.3 en tests Playwright (E2E) + Supertest (API).
6. **Nodemon sous Windows** : le rechargement à chaud rate parfois les changements ; préférer
   `tsx watch` ou `nodemon --legacy-watch`. Penser à `Stop-Process node` avant relance manuelle.
