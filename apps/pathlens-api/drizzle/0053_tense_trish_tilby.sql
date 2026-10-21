DROP INDEX "heatmap_page_snapshots_project_source_url_idx";--> statement-breakpoint
ALTER TABLE "heatmap_page_snapshots" ADD COLUMN "device" text DEFAULT 'desktop' NOT NULL;--> statement-breakpoint
ALTER TABLE "heatmap_page_snapshots" ADD COLUMN "page_width" integer;--> statement-breakpoint
ALTER TABLE "heatmap_page_snapshots" ADD COLUMN "page_height" integer;--> statement-breakpoint
ALTER TABLE "heatmap_page_snapshots" ADD COLUMN "device_scale_factor" double precision DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "heatmap_page_snapshots_project_page_device_idx" ON "heatmap_page_snapshots" USING btree ("project_id","domain","page_path","device");