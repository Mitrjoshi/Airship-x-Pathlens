import express from "express";
import cors from "cors";
import routes from "./routes";

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-API-Key",
      "X-Project-Key",
      "X-Image-Width",
      "X-Image-Height",
    ],
  })
);

// Stripe signs the exact request bytes, so this route must precede JSON parsing.
app.use("/api/billing/webhook", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "5mb" }));
app.set("trust proxy", true);

app.use((req, _, next) => {
  console.log(req.method, req.url);
  next();
});

app.use("/api", routes);

export default app;
