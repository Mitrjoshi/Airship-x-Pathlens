ALTER TABLE "avatars" ADD COLUMN "category" text DEFAULT 'animals' NOT NULL;--> statement-breakpoint
ALTER TABLE "avatars" ALTER COLUMN "category" DROP DEFAULT;
