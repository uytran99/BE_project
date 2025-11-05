import express from "express";
import Data from "../models/data.model.js";

const router = express.Router();

// POST /api/data
router.post("/", async (req, res) => {
    try {
        const { ecg, acc } = req.body;
        const record = new Data({ ecg, acc });
        await record.save();
        res.json({ success: true, message: "Data saved!" });
    } catch (err) {
        console.error("Error:", err);
        res.status(500).json({ success: false, message: "Save failed" });
    }
});

// GET /api/data (lấy danh sách dữ liệu)
router.get("/", async (req, res) => {
    try {
        const data = await Data.find().sort({ createdAt: -1 }).limit(50);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch data" });
    }
});

export default router;
