import { Router } from "express";
import eventsRouter from "./events.route";
import usersRouter from "./users.route";
import projectsRouter from "./projects.route";
import dashboardRouter from "./dashboard.route";
import analyticsRouter from "./analytics.route";
import visitorsRouter from "./visitors.route";
import sessionReplayRouter from "./session-replay.route";
import funnelsRouter from "./funnels.route";
import goalsRouter from "./goals.route";
import performanceRouter from "./performance.route";
import workspacesRouter from "./workspaces.route";
import notificationsRouter from "./notifications.route";
import feedbackRouter from "./feedback.route";
import heatmapsRouter from "./heatmaps.route";
import replayRouter from "./replay.route";
import { ApiKeyMiddleware } from "../middleware/apiKey.middleware";

const router = Router();

router.use("/events", eventsRouter);
router.use("/replay", replayRouter);

router.use(ApiKeyMiddleware);

router.use("/auth", usersRouter);
router.use("/workspaces", workspacesRouter);
router.use("/notifications", notificationsRouter);
router.use("/feedback", feedbackRouter);
router.use("/projects", projectsRouter);
router.use("/dashboard", dashboardRouter);
router.use("/analytics", analyticsRouter);
router.use("/visitors", visitorsRouter);
router.use("/session-replay", sessionReplayRouter);
router.use("/heatmaps", heatmapsRouter);
router.use("/funnels", funnelsRouter);
router.use("/goals", goalsRouter);
router.use("/performance", performanceRouter);

export default router;
