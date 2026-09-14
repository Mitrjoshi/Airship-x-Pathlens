ALTER TABLE "users" ADD COLUMN "lifetime_access" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripe_payment_id" text;--> statement-breakpoint
UPDATE "users" AS u
SET
  "lifetime_access" = true,
  "stripe_customer_id" = w."stripe_customer_id",
  "stripe_payment_id" = w."stripe_payment_id"
FROM "workspaces" AS w
WHERE w."user_id" = u."id"
  AND w."is_default" = true
  AND (w."unlimited_usage" = true OR w."stripe_payment_id" IS NOT NULL);--> statement-breakpoint
UPDATE "workspaces"
SET "unlimited_usage" = false
WHERE "unlimited_usage" = true;--> statement-breakpoint
ALTER TABLE "workspaces" DROP COLUMN "stripe_customer_id";--> statement-breakpoint
ALTER TABLE "workspaces" DROP COLUMN "stripe_payment_id";
