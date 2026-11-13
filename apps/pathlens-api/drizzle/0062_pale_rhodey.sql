ALTER TABLE "notifications" DROP CONSTRAINT "notifications_channel_id_chat_channels_id_fk";
--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_message_id_chat_messages_id_fk";
ALTER TABLE "notifications" DROP COLUMN "channel_id";--> statement-breakpoint
ALTER TABLE "notifications" DROP COLUMN "message_id";--> statement-breakpoint
ALTER TABLE "chat_channel_members" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "chat_channels" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "chat_message_reactions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "chat_messages" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "chat_pinned_messages" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "chat_channel_members" CASCADE;--> statement-breakpoint
DROP TABLE "chat_channels" CASCADE;--> statement-breakpoint
DROP TABLE "chat_message_reactions" CASCADE;--> statement-breakpoint
DROP TABLE "chat_messages" CASCADE;--> statement-breakpoint
DROP TABLE "chat_pinned_messages" CASCADE;
