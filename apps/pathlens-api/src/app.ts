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

app.use(express.json({ limit: "5mb" }));
app.set("trust proxy", true);

app.use((req, _, next) => {
  console.log(req.method, req.url);
  next();
});

app.use("/api", routes);

export default app;
