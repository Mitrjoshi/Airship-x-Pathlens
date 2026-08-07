ALTER TABLE "events" ADD COLUMN "referrer_domain" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "country_code" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "session_duration_ms" bigint;--> statement-breakpoint
CREATE INDEX "events_country_code_idx" ON "events" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "events_referrer_domain_idx" ON "events" USING btree ("referrer_domain");