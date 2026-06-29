-- AlterTable
ALTER TABLE "utilisateurs" ADD COLUMN     "mot_de_passe" VARCHAR,
ADD COLUMN     "otp_code" VARCHAR,
ADD COLUMN     "otp_expires_at" TIMESTAMP(6);
