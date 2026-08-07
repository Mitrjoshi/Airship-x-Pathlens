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
import { ApiKeyMiddleware } from "../middleware/apiKey.middleware";

const router = Router();

router.use("/events", eventsRouter);

router.use(ApiKeyMiddleware);

router.use("/auth", usersRouter);
router.use("/workspaces", workspacesRouter);
router.use("/notifications", notificationsRouter);
router.use("/projects", projectsRouter);
router.use("/dashboard", dashboardRouter);
router.use("/analytics", analyticsRouter);
router.use("/visitors", visitorsRouter);
router.use("/session-replay", sessionReplayRouter);
router.use("/funnels", funnelsRouter);
router.use("/goals", goalsRouter);
router.use("/performance", performanceRouter);

export default router;
