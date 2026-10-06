ALTER TABLE "projects" DROP CONSTRAINT "projects_api_key_unique";--> statement-breakpoint
DROP INDEX "projects_api_key_idx";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "api_key";