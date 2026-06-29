-- CreateTable
CREATE TABLE "utilisateurs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "email" VARCHAR NOT NULL,
    "role" VARCHAR NOT NULL,
    "est_actif" BOOLEAN NOT NULL DEFAULT true,
    "langue_preference" VARCHAR(5) NOT NULL DEFAULT 'fr',
    "derniere_connexion" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "utilisateurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profils_enseignants" (
    "id" UUID NOT NULL,
    "utilisateur_id" UUID NOT NULL,
    "ecole_id" UUID NOT NULL,
    "matricule" VARCHAR NOT NULL,
    "nom" VARCHAR NOT NULL,
    "prenom" VARCHAR NOT NULL,
    "specialite" VARCHAR,
    "telephone" VARCHAR,
    "date_prise_service" DATE,
    "photo_url" VARCHAR,

    CONSTRAINT "profils_enseignants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profils_eleves" (
    "id" UUID NOT NULL,
    "utilisateur_id" UUID,
    "ecole_id" UUID NOT NULL,
    "matricule" VARCHAR NOT NULL,
    "nom" VARCHAR NOT NULL,
    "prenom" VARCHAR NOT NULL,
    "date_naissance" DATE NOT NULL,
    "lieu_naissance" VARCHAR NOT NULL,
    "sexe" VARCHAR,
    "nationalite" VARCHAR,
    "photo_url" VARCHAR,
    "statut" VARCHAR NOT NULL DEFAULT 'actif',

    CONSTRAINT "profils_eleves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profils_parents" (
    "id" UUID NOT NULL,
    "utilisateur_id" UUID NOT NULL,
    "nom" VARCHAR NOT NULL,
    "prenom" VARCHAR NOT NULL,
    "telephone" VARCHAR NOT NULL,
    "telephone_mobile_money" VARCHAR,
    "operateur_mobile_money" VARCHAR,
    "profession" VARCHAR,
    "adresse" TEXT,

    CONSTRAINT "profils_parents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eleve_parent" (
    "eleve_id" UUID NOT NULL,
    "parent_id" UUID NOT NULL,
    "lien_parente" VARCHAR NOT NULL,
    "contact_principal" BOOLEAN NOT NULL DEFAULT false,
    "peut_payer" BOOLEAN NOT NULL DEFAULT true,
    "peut_voir_notes" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "eleve_parent_pkey" PRIMARY KEY ("eleve_id","parent_id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" UUID NOT NULL,
    "ecole_id" UUID NOT NULL,
    "annee_id" UUID NOT NULL,
    "nom" VARCHAR NOT NULL,
    "niveau" VARCHAR NOT NULL,
    "serie" VARCHAR,
    "capacite_max" INTEGER,
    "enseignant_principal_id" UUID,
    "frais_scolarite_xaf" DECIMAL(12,0),

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groupes_matieres" (
    "id" UUID NOT NULL,
    "ecole_id" UUID NOT NULL,
    "nom" VARCHAR NOT NULL,
    "description" TEXT,
    "ordre_affichage" INTEGER,

    CONSTRAINT "groupes_matieres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matieres" (
    "id" UUID NOT NULL,
    "ecole_id" UUID NOT NULL,
    "groupe_matiere_id" UUID,
    "nom" VARCHAR NOT NULL,
    "code" VARCHAR NOT NULL,
    "description" TEXT,
    "coefficient" INTEGER NOT NULL,
    "niveau" VARCHAR,
    "est_optionnelle" BOOLEAN NOT NULL,

    CONSTRAINT "matieres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "types_evaluation" (
    "id" UUID NOT NULL,
    "ecole_id" UUID NOT NULL,
    "nom" VARCHAR NOT NULL,
    "code" VARCHAR NOT NULL,
    "ponderation" DECIMAL(4,2) NOT NULL,
    "description" TEXT,

    CONSTRAINT "types_evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscriptions" (
    "id" UUID NOT NULL,
    "eleve_id" UUID NOT NULL,
    "classe_id" UUID NOT NULL,
    "annee_id" UUID NOT NULL,
    "date_inscription" DATE NOT NULL,
    "statut" VARCHAR NOT NULL,
    "montant_scolarite_xaf" DECIMAL(12,0),
    "numero_recu" VARCHAR,

    CONSTRAINT "inscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affectations_matieres" (
    "id" UUID NOT NULL,
    "classe_id" UUID NOT NULL,
    "matiere_id" UUID NOT NULL,
    "enseignant_id" UUID NOT NULL,
    "annee_id" UUID NOT NULL,
    "volume_horaire" INTEGER,
    "est_actif" BOOLEAN NOT NULL,

    CONSTRAINT "affectations_matieres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salles" (
    "id" UUID NOT NULL,
    "ecole_id" UUID NOT NULL,
    "nom" VARCHAR NOT NULL,
    "capacite" INTEGER NOT NULL,
    "type" VARCHAR NOT NULL,
    "est_disponible" BOOLEAN NOT NULL,

    CONSTRAINT "salles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendrier_scolaire" (
    "id" UUID NOT NULL,
    "ecole_id" UUID NOT NULL,
    "annee_id" UUID NOT NULL,
    "date_debut" DATE NOT NULL,
    "date_fin" DATE,
    "type" VARCHAR NOT NULL,
    "libelle" VARCHAR NOT NULL,
    "affecte_presences" BOOLEAN NOT NULL,

    CONSTRAINT "calendrier_scolaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emplois_du_temps" (
    "id" UUID NOT NULL,
    "classe_id" UUID NOT NULL,
    "matiere_id" UUID NOT NULL,
    "enseignant_id" UUID NOT NULL,
    "salle_id" UUID,
    "annee_id" UUID NOT NULL,
    "jour_semaine" INTEGER NOT NULL,
    "heure_debut" TIME NOT NULL,
    "heure_fin" TIME NOT NULL,
    "est_actif" BOOLEAN NOT NULL,
    "motif_annulation" TEXT,

    CONSTRAINT "emplois_du_temps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "periodes_evaluation" (
    "id" UUID NOT NULL,
    "ecole_id" UUID NOT NULL,
    "annee_id" UUID NOT NULL,
    "nom" VARCHAR NOT NULL,
    "type" VARCHAR NOT NULL,
    "ordre" INTEGER NOT NULL,
    "date_debut" DATE NOT NULL,
    "date_fin" DATE NOT NULL,
    "notes_cloturees" BOOLEAN NOT NULL,
    "bulletins_publies" BOOLEAN NOT NULL,

    CONSTRAINT "periodes_evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notes" (
    "id" UUID NOT NULL,
    "eleve_id" UUID NOT NULL,
    "matiere_id" UUID NOT NULL,
    "classe_id" UUID NOT NULL,
    "periode_id" UUID NOT NULL,
    "type_evaluation_id" UUID NOT NULL,
    "enseignant_id" UUID NOT NULL,
    "valeur" DECIMAL(5,2) NOT NULL,
    "note_max" DECIMAL(5,2) NOT NULL,
    "appreciation" TEXT,
    "est_absent" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulletins" (
    "id" UUID NOT NULL,
    "eleve_id" UUID NOT NULL,
    "classe_id" UUID NOT NULL,
    "periode_id" UUID NOT NULL,
    "moyenne_generale" DECIMAL(5,2),
    "rang" INTEGER,
    "effectif_classe" INTEGER,
    "appreciation_generale" TEXT,
    "decision_conseil" VARCHAR,
    "version" INTEGER NOT NULL,
    "statut_generation" VARCHAR NOT NULL,
    "url_pdf" VARCHAR,
    "genere_par" UUID,
    "generated_at" TIMESTAMP(6),

    CONSTRAINT "bulletins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "details_bulletin" (
    "id" UUID NOT NULL,
    "bulletin_id" UUID NOT NULL,
    "matiere_id" UUID NOT NULL,
    "groupe_matiere_id" UUID,
    "moyenne_matiere" DECIMAL(5,2),
    "rang_matiere" INTEGER,
    "appreciation_matiere" TEXT,

    CONSTRAINT "details_bulletin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paiements" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "ecole_id" UUID NOT NULL,
    "inscription_id" UUID NOT NULL,
    "parent_id" UUID,
    "montant_xaf" DECIMAL(12,0) NOT NULL,
    "montant_total_xaf" DECIMAL(12,0) NOT NULL,
    "solde_restant_xaf" DECIMAL(12,0) NOT NULL,
    "methode_paiement" VARCHAR NOT NULL,
    "reference_transaction" VARCHAR,
    "statut" VARCHAR NOT NULL,
    "date_paiement" DATE NOT NULL,
    "numero_recu" VARCHAR NOT NULL,
    "url_recu_pdf" VARCHAR,
    "encaisse_par" UUID,
    "notes_interne" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paiements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tranches_paiement" (
    "id" UUID NOT NULL,
    "ecole_id" UUID NOT NULL,
    "annee_id" UUID NOT NULL,
    "classe_id" UUID,
    "nom" VARCHAR NOT NULL,
    "montant_xaf" DECIMAL(12,0) NOT NULL,
    "date_echeance" DATE NOT NULL,
    "ordre" INTEGER NOT NULL,
    "est_obligatoire" BOOLEAN NOT NULL,

    CONSTRAINT "tranches_paiement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presences" (
    "id" UUID NOT NULL,
    "eleve_id" UUID NOT NULL,
    "classe_id" UUID NOT NULL,
    "matiere_id" UUID NOT NULL,
    "enseignant_id" UUID NOT NULL,
    "emploi_temps_id" UUID,
    "date_seance" DATE NOT NULL,
    "heure_debut" TIME NOT NULL,
    "heure_fin" TIME NOT NULL,
    "statut" VARCHAR NOT NULL,
    "justifiee" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "presences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "justifications_absences" (
    "id" UUID NOT NULL,
    "presence_id" UUID NOT NULL,
    "parent_id" UUID NOT NULL,
    "motif" TEXT NOT NULL,
    "document_url" VARCHAR,
    "statut" VARCHAR NOT NULL,
    "valide_par" UUID,
    "commentaire_admin" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "traite_at" TIMESTAMP(6),

    CONSTRAINT "justifications_absences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "expediteur_id" UUID NOT NULL,
    "destinataire_id" UUID NOT NULL,
    "sujet" VARCHAR NOT NULL,
    "corps" TEXT NOT NULL,
    "piece_jointe_url" VARCHAR,
    "est_lu" BOOLEAN NOT NULL DEFAULT false,
    "lu_at" TIMESTAMP(6),
    "message_parent_id" UUID,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "destinataire_id" UUID NOT NULL,
    "type" VARCHAR NOT NULL,
    "canal" VARCHAR NOT NULL,
    "titre" VARCHAR NOT NULL,
    "contenu" TEXT NOT NULL,
    "est_lue" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lue_at" TIMESTAMP(6),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs_activites" (
    "id" UUID NOT NULL,
    "utilisateur_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "action" VARCHAR NOT NULL,
    "entite" VARCHAR NOT NULL,
    "entite_id" UUID,
    "details" JSONB,
    "ip_adresse" VARCHAR,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_activites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_tenant_id_email_key" ON "utilisateurs"("tenant_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "profils_enseignants_utilisateur_id_key" ON "profils_enseignants"("utilisateur_id");

-- CreateIndex
CREATE UNIQUE INDEX "profils_eleves_utilisateur_id_key" ON "profils_eleves"("utilisateur_id");

-- CreateIndex
CREATE UNIQUE INDEX "profils_parents_utilisateur_id_key" ON "profils_parents"("utilisateur_id");

-- CreateIndex
CREATE UNIQUE INDEX "inscriptions_eleve_id_classe_id_annee_id_key" ON "inscriptions"("eleve_id", "classe_id", "annee_id");

-- CreateIndex
CREATE UNIQUE INDEX "notes_eleve_id_matiere_id_type_evaluation_id_periode_id_key" ON "notes"("eleve_id", "matiere_id", "type_evaluation_id", "periode_id");

-- CreateIndex
CREATE UNIQUE INDEX "bulletins_eleve_id_periode_id_key" ON "bulletins"("eleve_id", "periode_id");

-- CreateIndex
CREATE UNIQUE INDEX "paiements_numero_recu_key" ON "paiements"("numero_recu");

-- AddForeignKey
ALTER TABLE "utilisateurs" ADD CONSTRAINT "utilisateurs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profils_enseignants" ADD CONSTRAINT "profils_enseignants_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profils_enseignants" ADD CONSTRAINT "profils_enseignants_ecole_id_fkey" FOREIGN KEY ("ecole_id") REFERENCES "ecoles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profils_eleves" ADD CONSTRAINT "profils_eleves_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profils_eleves" ADD CONSTRAINT "profils_eleves_ecole_id_fkey" FOREIGN KEY ("ecole_id") REFERENCES "ecoles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profils_parents" ADD CONSTRAINT "profils_parents_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eleve_parent" ADD CONSTRAINT "eleve_parent_eleve_id_fkey" FOREIGN KEY ("eleve_id") REFERENCES "profils_eleves"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eleve_parent" ADD CONSTRAINT "eleve_parent_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "profils_parents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_ecole_id_fkey" FOREIGN KEY ("ecole_id") REFERENCES "ecoles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_annee_id_fkey" FOREIGN KEY ("annee_id") REFERENCES "annees_scolaires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_enseignant_principal_id_fkey" FOREIGN KEY ("enseignant_principal_id") REFERENCES "profils_enseignants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groupes_matieres" ADD CONSTRAINT "groupes_matieres_ecole_id_fkey" FOREIGN KEY ("ecole_id") REFERENCES "ecoles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matieres" ADD CONSTRAINT "matieres_ecole_id_fkey" FOREIGN KEY ("ecole_id") REFERENCES "ecoles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matieres" ADD CONSTRAINT "matieres_groupe_matiere_id_fkey" FOREIGN KEY ("groupe_matiere_id") REFERENCES "groupes_matieres"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "types_evaluation" ADD CONSTRAINT "types_evaluation_ecole_id_fkey" FOREIGN KEY ("ecole_id") REFERENCES "ecoles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscriptions" ADD CONSTRAINT "inscriptions_eleve_id_fkey" FOREIGN KEY ("eleve_id") REFERENCES "profils_eleves"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscriptions" ADD CONSTRAINT "inscriptions_classe_id_fkey" FOREIGN KEY ("classe_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscriptions" ADD CONSTRAINT "inscriptions_annee_id_fkey" FOREIGN KEY ("annee_id") REFERENCES "annees_scolaires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affectations_matieres" ADD CONSTRAINT "affectations_matieres_classe_id_fkey" FOREIGN KEY ("classe_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affectations_matieres" ADD CONSTRAINT "affectations_matieres_matiere_id_fkey" FOREIGN KEY ("matiere_id") REFERENCES "matieres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affectations_matieres" ADD CONSTRAINT "affectations_matieres_enseignant_id_fkey" FOREIGN KEY ("enseignant_id") REFERENCES "profils_enseignants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affectations_matieres" ADD CONSTRAINT "affectations_matieres_annee_id_fkey" FOREIGN KEY ("annee_id") REFERENCES "annees_scolaires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salles" ADD CONSTRAINT "salles_ecole_id_fkey" FOREIGN KEY ("ecole_id") REFERENCES "ecoles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendrier_scolaire" ADD CONSTRAINT "calendrier_scolaire_ecole_id_fkey" FOREIGN KEY ("ecole_id") REFERENCES "ecoles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendrier_scolaire" ADD CONSTRAINT "calendrier_scolaire_annee_id_fkey" FOREIGN KEY ("annee_id") REFERENCES "annees_scolaires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emplois_du_temps" ADD CONSTRAINT "emplois_du_temps_classe_id_fkey" FOREIGN KEY ("classe_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emplois_du_temps" ADD CONSTRAINT "emplois_du_temps_matiere_id_fkey" FOREIGN KEY ("matiere_id") REFERENCES "matieres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emplois_du_temps" ADD CONSTRAINT "emplois_du_temps_enseignant_id_fkey" FOREIGN KEY ("enseignant_id") REFERENCES "profils_enseignants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emplois_du_temps" ADD CONSTRAINT "emplois_du_temps_salle_id_fkey" FOREIGN KEY ("salle_id") REFERENCES "salles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emplois_du_temps" ADD CONSTRAINT "emplois_du_temps_annee_id_fkey" FOREIGN KEY ("annee_id") REFERENCES "annees_scolaires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "periodes_evaluation" ADD CONSTRAINT "periodes_evaluation_ecole_id_fkey" FOREIGN KEY ("ecole_id") REFERENCES "ecoles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "periodes_evaluation" ADD CONSTRAINT "periodes_evaluation_annee_id_fkey" FOREIGN KEY ("annee_id") REFERENCES "annees_scolaires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_eleve_id_fkey" FOREIGN KEY ("eleve_id") REFERENCES "profils_eleves"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_matiere_id_fkey" FOREIGN KEY ("matiere_id") REFERENCES "matieres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_classe_id_fkey" FOREIGN KEY ("classe_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_periode_id_fkey" FOREIGN KEY ("periode_id") REFERENCES "periodes_evaluation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_type_evaluation_id_fkey" FOREIGN KEY ("type_evaluation_id") REFERENCES "types_evaluation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_enseignant_id_fkey" FOREIGN KEY ("enseignant_id") REFERENCES "profils_enseignants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulletins" ADD CONSTRAINT "bulletins_eleve_id_fkey" FOREIGN KEY ("eleve_id") REFERENCES "profils_eleves"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulletins" ADD CONSTRAINT "bulletins_classe_id_fkey" FOREIGN KEY ("classe_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulletins" ADD CONSTRAINT "bulletins_periode_id_fkey" FOREIGN KEY ("periode_id") REFERENCES "periodes_evaluation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulletins" ADD CONSTRAINT "bulletins_genere_par_fkey" FOREIGN KEY ("genere_par") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "details_bulletin" ADD CONSTRAINT "details_bulletin_bulletin_id_fkey" FOREIGN KEY ("bulletin_id") REFERENCES "bulletins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "details_bulletin" ADD CONSTRAINT "details_bulletin_matiere_id_fkey" FOREIGN KEY ("matiere_id") REFERENCES "matieres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "details_bulletin" ADD CONSTRAINT "details_bulletin_groupe_matiere_id_fkey" FOREIGN KEY ("groupe_matiere_id") REFERENCES "groupes_matieres"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_ecole_id_fkey" FOREIGN KEY ("ecole_id") REFERENCES "ecoles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_inscription_id_fkey" FOREIGN KEY ("inscription_id") REFERENCES "inscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "profils_parents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_encaisse_par_fkey" FOREIGN KEY ("encaisse_par") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tranches_paiement" ADD CONSTRAINT "tranches_paiement_ecole_id_fkey" FOREIGN KEY ("ecole_id") REFERENCES "ecoles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tranches_paiement" ADD CONSTRAINT "tranches_paiement_annee_id_fkey" FOREIGN KEY ("annee_id") REFERENCES "annees_scolaires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tranches_paiement" ADD CONSTRAINT "tranches_paiement_classe_id_fkey" FOREIGN KEY ("classe_id") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presences" ADD CONSTRAINT "presences_eleve_id_fkey" FOREIGN KEY ("eleve_id") REFERENCES "profils_eleves"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presences" ADD CONSTRAINT "presences_classe_id_fkey" FOREIGN KEY ("classe_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presences" ADD CONSTRAINT "presences_matiere_id_fkey" FOREIGN KEY ("matiere_id") REFERENCES "matieres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presences" ADD CONSTRAINT "presences_enseignant_id_fkey" FOREIGN KEY ("enseignant_id") REFERENCES "profils_enseignants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presences" ADD CONSTRAINT "presences_emploi_temps_id_fkey" FOREIGN KEY ("emploi_temps_id") REFERENCES "emplois_du_temps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "justifications_absences" ADD CONSTRAINT "justifications_absences_presence_id_fkey" FOREIGN KEY ("presence_id") REFERENCES "presences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "justifications_absences" ADD CONSTRAINT "justifications_absences_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "profils_parents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "justifications_absences" ADD CONSTRAINT "justifications_absences_valide_par_fkey" FOREIGN KEY ("valide_par") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_expediteur_id_fkey" FOREIGN KEY ("expediteur_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_destinataire_id_fkey" FOREIGN KEY ("destinataire_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_message_parent_id_fkey" FOREIGN KEY ("message_parent_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_destinataire_id_fkey" FOREIGN KEY ("destinataire_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs_activites" ADD CONSTRAINT "logs_activites_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs_activites" ADD CONSTRAINT "logs_activites_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
