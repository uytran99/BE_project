import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import cors from "cors";
import dataRoutes from "./routes/data.routes.js";
import authRoutes from "./routes/auth.routes.js";

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 🔐 Dùng encodeURIComponent cho password
const username = "uytran_db_user";
const password = encodeURIComponent("Uytran123!");
// const uri = `mongodb+srv://${username}:${password}@cluster0.zttgim9.mongodb.net/?retryWrites=true&w=majority`;
const uri = "mongodb://localhost:27017/be_project"; // Sử dụng MongoDB local

// Kết nối MongoDB
await mongoose.connect(uri);
console.log("✅ MongoDB connected");

// Routes
app.use("/api/data", dataRoutes);
app.use("/api/auth", authRoutes);

// Start server
const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
