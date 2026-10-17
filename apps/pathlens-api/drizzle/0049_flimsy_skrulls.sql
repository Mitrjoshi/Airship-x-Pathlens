CREATE TABLE "avatars" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"storage_key" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "avatars_name_unique" UNIQUE("name"),
 CONSTRAINT "avatars_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
INSERT INTO "avatars" ("name", "storage_key")
VALUES
  ('panda', 'avatars/panda.png'),
  ('amur', 'avatars/amur.png'),
  ('elephant', 'avatars/elephant.png'),
  ('turtle', 'avatars/turtle.png'),
  ('gorilla', 'avatars/gorilla.png'),
  ('whale', 'avatars/whale.png'),
  ('orangutan', 'avatars/orangutan.png'),
  ('saola', 'avatars/saola.png'),
  ('pangolin', 'avatars/pangolin.png'),
  ('rhino', 'avatars/rhino.png')
ON CONFLICT ("storage_key") DO NOTHING;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_avatar_id_avatars_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."avatars"("id") ON DELETE set null ON UPDATE no action;
