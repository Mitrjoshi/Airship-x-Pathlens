DELETE FROM "notifications" AS duplicate
USING "notifications" AS keeper
WHERE duplicate."type" = 'workspace_invite'
  AND duplicate."accepted_at" IS NULL
  AND keeper."type" = 'workspace_invite'
  AND keeper."accepted_at" IS NULL
  AND duplicate."workspace_id" = keeper."workspace_id"
  AND duplicate."recipient_user_id" = keeper."recipient_user_id"
  AND duplicate."id" < keeper."id";
--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_pending_workspace_invite_idx" ON "notifications" USING btree ("workspace_id","recipient_user_id") WHERE "notifications"."type" = 'workspace_invite' AND "notifications"."accepted_at" IS NULL;
