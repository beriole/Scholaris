# Scholaris

SaaS de gestion scolaire pour les établissements secondaires (contexte camerounais / MINESEC).

## Stack

- **Frontend** : Vite + React 18 + TypeScript + TailwindCSS v4
- **Backend** : Express 5 + TypeScript + Prisma 7 + PostgreSQL
- **Auth** : JWT (rôles `super_admin`, `admin_ecole`, `enseignant`)

## Fonctionnalités

- Multi-établissement (multi-tenant)
- Années scolaires, classes, matières (groupes & coefficients)
- Élèves & enseignants (matricules auto-générés, photos)
- Affectations enseignant ↔ matière ↔ classe
- Notes par séquence et **bulletins** séquentiels & trimestriels (PDF style MINESEC, export individuel ou par classe)
- Présences / appel, emploi du temps
- Finances : tranches & enregistrement des paiements (espèces)
- Messagerie interne, notifications, calendrier, rapports
- **Portail enseignant** dédié (`/prof`)

## Démarrage

### Backend
```bash
cd backend
npm install
cp .env.example .env   # renseigner DATABASE_URL, JWT_SECRET, ...
npx prisma generate
npx prisma db push
npm run dev            # http://localhost:3000
```

### Frontend
```bash
cd frontend
npm install
npm run dev            # http://localhost:5173
```

### Données de démo
```bash
cd backend
npx ts-node src/scripts/seed_demo.ts
npx ts-node src/scripts/seed_full.ts
```

## Variables d'environnement

Voir `backend/.env.example`. Les fichiers `.env` ne sont **pas** versionnés.
