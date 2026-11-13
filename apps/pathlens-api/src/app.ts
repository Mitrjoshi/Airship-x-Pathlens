import express from "express";
import cors from "cors";
import routes from "./routes";
import { getSafeRequestPath } from "./lib/request-logging";

const app = express();

const corsOptions = {
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-API-Key",
    "X-Project-Key",
    "X-Image-Width",
    "X-Image-Height",
  ],
};

const dashboardCors = cors({
  ...corsOptions,
  origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
  credentials: true,
});

const trackerCors = cors({
  ...corsOptions,
  // Tracker requests can originate from any configured customer domain.
  origin: true,
  credentials: false,
});

const trackerPaths = new Set([
  "/api/events",
  "/api/replay/chunks",
  "/api/tracking/config",
]);

app.use((req, res, next) => {
  const middleware = trackerPaths.has(req.path) ? trackerCors : dashboardCors;
  middleware(req, res, next);
});

// Stripe signs the exact request bytes, so this route must precede JSON parsing.
app.use("/api/billing/webhook", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "5mb" }));
app.set("trust proxy", true);

app.use((req, _, next) => {
  console.log(req.method, getSafeRequestPath(req.originalUrl ?? req.url));
  next();
});

app.use("/api", routes);

export default app;
