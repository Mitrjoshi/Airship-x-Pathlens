CREATE TABLE "billing_invoices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"stripe_payment_id" text NOT NULL,
	"invoice_number" text NOT NULL,
	"bucket" text NOT NULL,
	"storage_key" text NOT NULL,
	"document" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_invoices_stripe_payment_id_unique" UNIQUE("stripe_payment_id"),
	CONSTRAINT "billing_invoices_invoice_number_unique" UNIQUE("invoice_number"),
	CONSTRAINT "billing_invoices_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;