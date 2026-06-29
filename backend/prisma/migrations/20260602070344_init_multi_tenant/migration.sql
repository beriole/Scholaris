-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "nom" VARCHAR NOT NULL,
    "sous_domaine" VARCHAR NOT NULL,
    "plan_abonnement" VARCHAR NOT NULL,
    "statut" VARCHAR NOT NULL,
    "pays" VARCHAR(2) NOT NULL,
    "fuseau_horaire" VARCHAR NOT NULL,
    "devise" VARCHAR(3) NOT NULL DEFAULT 'XAF',
    "langue_defaut" VARCHAR(5) NOT NULL DEFAULT 'fr',
    "date_expiration" DATE,
    "config_personnalisation" JSONB,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecoles" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "nom" VARCHAR NOT NULL,
    "code" VARCHAR NOT NULL,
    "adresse" TEXT,
    "ville" VARCHAR,
    "region" VARCHAR,
    "telephone" VARCHAR,
    "logo_url" VARCHAR,
    "annee_active_id" UUID,
    "systeme_notation" VARCHAR NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ecoles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "annees_scolaires" (
    "id" UUID NOT NULL,
    "ecole_id" UUID NOT NULL,
    "libelle" VARCHAR NOT NULL,
    "date_debut" DATE NOT NULL,
    "date_fin" DATE NOT NULL,
    "est_active" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "annees_scolaires_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_sous_domaine_key" ON "tenants"("sous_domaine");

-- CreateIndex
CREATE UNIQUE INDEX "ecoles_code_key" ON "ecoles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ecoles_annee_active_id_key" ON "ecoles"("annee_active_id");

-- AddForeignKey
ALTER TABLE "ecoles" ADD CONSTRAINT "ecoles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecoles" ADD CONSTRAINT "ecoles_annee_active_id_fkey" FOREIGN KEY ("annee_active_id") REFERENCES "annees_scolaires"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annees_scolaires" ADD CONSTRAINT "annees_scolaires_ecole_id_fkey" FOREIGN KEY ("ecole_id") REFERENCES "ecoles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
