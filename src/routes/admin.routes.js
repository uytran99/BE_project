import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import * as adminCtrl from "../controllers/admin.controller.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple admin auth middleware (compare header with ADMIN_TOKEN env)
const checkAdminToken = (req, res, next) => {
    const token = req.headers["x-admin-token"] || req.query.adminToken;
    const ADMIN_TOKEN = process.env.ADMIN_TOKEN || process.env.ADMIN_SECRET;
    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
        return res.status(401).json({ error: "Unauthorized (admin token missing or invalid)" });
    }
    next();
};

// Serve admin UI (static single page)
router.get("/", checkAdminToken, (req, res) => {
    return res.sendFile(path.join(process.cwd(), "public", "admin", "index.html"));
});

// API: list users / data, delete, export, re-diagnose
router.get("/api/users", checkAdminToken, adminCtrl.listUsers);
router.get("/api/data", checkAdminToken, adminCtrl.listData);
router.delete("/api/users/:id", checkAdminToken, adminCtrl.deleteUser);
router.delete("/api/data/:id", checkAdminToken, adminCtrl.deleteData);
router.get("/api/export/data", checkAdminToken, adminCtrl.exportDataCSV);
router.post("/api/re-diagnose/:id", checkAdminToken, adminCtrl.reDiagnoseRecord);

export default router;
