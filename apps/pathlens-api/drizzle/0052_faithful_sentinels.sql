DROP INDEX "feedback_user_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "feedback_user_unique_idx" ON "feedback" USING btree ("user_id");