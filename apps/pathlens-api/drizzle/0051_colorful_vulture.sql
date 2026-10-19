ALTER TABLE "feedback" DROP CONSTRAINT "feedback_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "feedback" DROP CONSTRAINT "feedback_project_id_projects_id_fk";
--> statement-breakpoint
DROP INDEX "feedback_workspace_idx";--> statement-breakpoint
DROP INDEX "feedback_project_idx";--> statement-breakpoint
ALTER TABLE "feedback" DROP COLUMN "workspace_id";--> statement-breakpoint
ALTER TABLE "feedback" DROP COLUMN "project_id";--> statement-breakpoint
ALTER TABLE "feedback" DROP COLUMN "category";