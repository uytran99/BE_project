import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import cors from "cors";
import 'dotenv/config'; // Loads environment variables from .env if present
import dataRoutes from "./routes/data.routes.js";
import authRoutes from "./routes/auth.routes.js";
import heartRateRoutes from "./routes/heartrate.routes.js";

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
			console.log(`✅ MongoDB connected (${uri.startsWith('mongodb+srv') ? 'Atlas' : uri.includes('localhost') ? 'local' : 'remote'})`);
			return;
		} catch (err) {
			console.error(`❌ MongoDB connection failed (attempt ${attempt}/${maxRetries}):`, err.message);
			if (attempt === maxRetries) {
				console.error("🚫 Giving up after max retries.");
				process.exit(1);
			}
			await new Promise(r => setTimeout(r, 2000));
		}
	}
}

connectMongo();

// Routes
app.use("/api/data", dataRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/heartrate", heartRateRoutes);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
