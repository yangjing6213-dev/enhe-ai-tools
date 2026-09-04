-- AlterTable
ALTER TABLE "users" ADD COLUMN     "accept_email_updates" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "newsletter_email" TEXT;
