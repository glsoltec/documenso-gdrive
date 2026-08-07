-- AlterTable
ALTER TABLE "Contact" ADD COLUMN "whatsappOptIn" BOOLEAN DEFAULT false,
                     ADD COLUMN "whatsappOptInAt" TIMESTAMP(3),
                     ADD COLUMN "whatsappOptInSource" VARCHAR(255);
