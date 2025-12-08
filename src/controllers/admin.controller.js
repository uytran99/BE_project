import User from "../models/user.model.js";
import Data from "../models/data.model.js";
import mongoose from "mongoose";
import { diagnoseHeartRate } from "../services/ai.service.js";

// List users (limited)
export const listUsers = async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
        const users = await User.find({}).limit(limit).lean();
        res.json({ success: true, count: users.length, users });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// List data records with optional filters
export const listData = async (req, res) => {
    try {
        const { userId, status, limit = 200, startDate, endDate } = req.query;
        const q = {};
        if (userId) q.userId = mongoose.isValidObjectId(userId) ? new mongoose.Types.ObjectId(userId) : userId;
        if (status) q.status = status;
        if (startDate || endDate) q.createdAt = {};
        if (startDate) q.createdAt.$gte = new Date(startDate);
        if (endDate) q.createdAt.$lte = new Date(endDate);

        const records = await Data.find(q).sort({ createdAt: -1 }).limit(parseInt(limit)).lean();
        res.json({ success: true, count: records.length, records });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// Delete user and optionally their data
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: "Invalid user id" });
        await User.findByIdAndDelete(id);
        await Data.deleteMany({ userId: new mongoose.Types.ObjectId(id) });
        res.json({ success: true, message: "User and related data deleted" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// Delete single data record
export const deleteData = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: "Invalid data id" });
        await Data.findByIdAndDelete(id);
        res.json({ success: true, message: "Record deleted" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// Export data as CSV (replaced to avoid external dependency)
export const exportDataCSV = async (req, res) => {
    try {
        const q = {}; // can reuse filters from query if needed
        const records = await Data.find(q).lean();

        const fields = ["_id", "userId", "heartRate", "status", "createdAt"];
        const header = fields.join(",") + "\n";

        const lines = records.map((r) => {
            const vals = fields.map((f) => {
                let v = r[f];
                if (v === undefined || v === null) return "";
                if (v instanceof Date) v = v.toISOString();
                // escape double quotes
                return `"${String(v).replace(/"/g, '""')}"`;
            });
            return vals.join(",");
        });

        const csv = header + lines.join("\n");

        res.header("Content-Type", "text/csv");
        res.attachment("data_export.csv");
        return res.send(csv);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// Re-diagnose single record using diagnoseHeartRate and save result
export const reDiagnoseRecord = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: "Invalid data id" });
        const record = await Data.findById(id);
        if (!record) return res.status(404).json({ error: "Record not found" });

        const aiResult = await diagnoseHeartRate({
            heartRate: record.heartRate,
            ecg: record.ecg,
            acc: record.acc,
            userId: record.userId,
        });

        if (aiResult && aiResult.success) {
            record.aiDiagnosis = {
                ...aiResult.diagnosis,
                aiModel: aiResult.aiModel,
                diagnosedAt: aiResult.timestamp,
            };
            await record.save();
            return res.json({ success: true, message: "Re-diagnosed and saved", aiDiagnosis: record.aiDiagnosis });
        } else {
            return res.status(500).json({ success: false, error: "AI re-diagnosis failed" });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

export default { listUsers, listData, deleteUser, deleteData, exportDataCSV, reDiagnoseRecord };
