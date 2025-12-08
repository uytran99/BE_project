import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import cors from "cors";
import "dotenv/config"; // Loads environment variables from .env if present
import dataRoutes from "./routes/data.routes.js";
import authRoutes from "./routes/auth.routes.js";
import heartRateRoutes from "./routes/heartrate.routes.js";
import healthRoutes from "./routes/health.routes.js";
import path from "path";
import adminRoutes from "./routes/admin.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import devicesRoutes from "./routes/devices.routes.js";
import heartRateApiRoutes from "./routes/heart-rate.routes.js";

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Prefer environment variable MONGODB_URI. Do NOT commit your real Atlas URI.
// Fallback to local only for development convenience.
const uri = process.env.MONGODB_URI?.trim() || "mongodb://localhost:27017/be_project";

if (!process.env.MONGODB_URI) {
    console.warn("⚠️ MONGODB_URI not set - using local MongoDB (ensure mongod is running). Set MONGODB_URI for Atlas.");
}

async function connectMongo(maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await mongoose.connect(uri, {
                // serverSelectionTimeoutMS: 10000,
            });
            console.log(`✅ MongoDB connected (${uri.startsWith("mongodb+srv") ? "Atlas" : uri.includes("localhost") ? "local" : "remote"})`);
            return;
        } catch (err) {
            console.error(`❌ MongoDB connection failed (attempt ${attempt}/${maxRetries}):`, err.message);
            if (attempt === maxRetries) {
                console.error("🚫 Giving up after max retries.");
                process.exit(1);
            }
            await new Promise((r) => setTimeout(r, 2000));
        }
    }
}

connectMongo();

// Basic health endpoints for deployment diagnostics
// readyState: 0=disconnected,1=connected,2=connecting,3=disconnecting

app.get("/", (req, res) => {
    res.send("✅ Server is running on Railway");
});
app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});

// Routes
app.use("/api/data", dataRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/heartrate", heartRateRoutes);
app.use("/api/health", healthRoutes);
// Admin Panel APIs
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/devices", devicesRoutes);
app.use("/api/heart-rate", heartRateApiRoutes);

// Serve public static assets (so admin UI can load CSS/JS if any)
app.use(express.static(path.join(process.cwd(), "public")));

// Mount admin router at /admin
app.use("/admin", adminRoutes);

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log("✅ Ready to receive Railway healthcheck");
});
