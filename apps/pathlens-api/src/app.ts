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

const frontendOrigins = (process.env.FRONTEND_URL ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

const dashboardCors = cors({
  ...corsOptions,
  origin: frontendOrigins,
  credentials: true,
});

const trackerCors = cors({
  ...corsOptions,
  // Public tracker requests can originate from customer websites.
  origin: true,
  credentials: false,
});

const trackerPaths = new Set(["/api/replay/chunks", "/api/tracking/config"]);

const isTrackerRequest = (req: express.Request): boolean => {
  if (trackerPaths.has(req.path)) {
    return true;
  }

  if (req.path === "/api/events") {
    if (req.method === "POST") {
      return true;
    }

    if (req.method === "OPTIONS") {
      const requestedMethod = req.get("Access-Control-Request-Method");

      return requestedMethod?.toUpperCase() === "POST";
    }
  }

  return false;
};

app.use((req, res, next) => {
  const middleware = isTrackerRequest(req) ? trackerCors : dashboardCors;

  middleware(req, res, next);
});

// Stripe signs the exact request bytes.
// This route must precede JSON parsing.
app.use("/api/billing/webhook", express.raw({ type: "application/json" }));

app.use(express.json({ limit: "5mb" }));

app.set("trust proxy", true);

app.use((req, _, next) => {
  console.log(req.method, getSafeRequestPath(req.originalUrl ?? req.url));

  next();
});

app.use("/api", routes);

export default app;
