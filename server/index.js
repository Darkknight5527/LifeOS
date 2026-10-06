import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import apiRoutes from "./routes/index.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import { securityHeaders } from "./utils/security.js";

const app = express();
app.disable("x-powered-by");
// Render sits in front of the app, so trust its forwarded client IP (used by the login limiter).
app.set("trust proxy", 1);
app.use(securityHeaders);

const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim());

app.use(
  cors({
    origin: allowedOrigins,
    exposedHeaders: ["X-Uploaded-At"],
  })
);
// Login requests are tiny; everything else may carry imports or backups.
app.use("/api/auth", express.json({ limit: "10kb" }));
app.use(express.json({ limit: "10mb" }));

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api", apiRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`LifeOS server listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
