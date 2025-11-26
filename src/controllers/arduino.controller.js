import Data from "../models/data.model.js";
import Device from "../models/device.model.js";
import mongoose from "mongoose";
import { diagnoseHeartRate } from "../services/ai.service.js";

/**
 * Helper: map AI severity -> record status (data.status enum: normal|warning|critical)
 */
const mapSeverityToStatus = (sev) => {
    if (!sev) return "normal";
    if (sev === "low") return "normal";
    if (sev === "medium") return "warning";
    if (sev === "high") return "warning";
    if (sev === "critical") return "critical";
    return "normal";
};

/**
 * Production Arduino endpoint
 * - Expects deviceToken in Authorization: Bearer <token> or x-device-token header
 * - Finds device, ensures paired, resolves userId, saves Data
 */
export const receiveArduinoData = async (req, res) => {
    try {
        const auth = req.headers.authorization || "";
        const bearer = auth.startsWith("Bearer ") ? auth.split(" ")[1] : null;
        const deviceToken = bearer || req.headers["x-device-token"] || req.body.deviceToken;

        if (!deviceToken) {
            return res.status(400).json({ message: "Missing device token" });
        }

        // Device.token stored as _id when pairing; try to find by _id or deviceId
        let device = null;
        if (mongoose.isValidObjectId(deviceToken)) {
            device = await Device.findById(deviceToken);
        }
        if (!device) {
            device = await Device.findOne({ deviceId: deviceToken });
        }
        if (!device || !device.isPaired) {
            return res.status(403).json({ message: "Invalid or unpaired device token" });
        }

        const userId = device.userId;
        // Reuse test save logic by delegating to same saver
        return await _saveArduinoDataForUser(userId, req.body, res);
    } catch (err) {
        console.error("receiveArduinoData error:", err);
        return res.status(500).json({ message: "Server error", error: err.message });
    }
};

/**
 * Test Arduino endpoint
 * - Accepts body.userId (string) to identify user for quick testing
 * - Body example:
 *   { "userId": "690b7d809c0b474d3e75ad6c", "bpm":75, "fallen":false, "mag_ema":0.98, "accel":{ax,ay,az}, "gps":{lat,lon}, "millis":123456 }
 */
//
export const receiveArduinoDataTest = async (req, res) => {
    try {
        const userId = req.body.userId || req.query.userId;
        if (!userId) {
            return res.status(400).json({ message: "userId is required in body for test endpoint" });
        }
        return await _saveArduinoDataForUser(userId, req.body, res);
    } catch (err) {
        console.error("receiveArduinoDataTest error:", err);
        return res.status(500).json({ message: "Server error", error: err.message });
    }
};

/**
 * Internal helper: creates Data doc for a given userId and payload, runs AI diagnosis, saves and returns response.
 */
const _saveArduinoDataForUser = async (userIdRaw, payload, res) => {
    try {
        const userId = mongoose.isValidObjectId(userIdRaw) ? new mongoose.Types.ObjectId(userIdRaw) : userIdRaw;

        const bpm = typeof payload.bpm === "number" ? payload.bpm : payload.heartRate ?? null;
        if (bpm === null || typeof bpm !== "number" || Number.isNaN(bpm)) {
            return res.status(400).json({ message: "Missing or invalid bpm/heartRate" });
        }

        // Map accel
        let accArray = null;
        if (payload.accel && typeof payload.accel === "object") {
            const { ax = 0, ay = 0, az = 0 } = payload.accel;
            accArray = [Number(ax), Number(ay), Number(az)];
        } else if (Array.isArray(payload.acc)) {
            accArray = payload.acc.map(Number);
        }

        // Compose notes with extras for traceability
        const extras = {
            fallen: payload.fallen ?? null,
            mag_ema: payload.mag_ema ?? null,
            gps: payload.gps ?? null,
            millis: payload.millis ?? null,
            raw: payload.raw ?? null,
        };

        // Prepare Data document (only BPM + metadata)
        const dataDoc = new Data({
            userId,
            heartRate: Number(bpm),
            ecg: payload.ecg ?? null,
            acc: accArray,
            notes: JSON.stringify(extras),
            createdAt: payload.createdAt ? new Date(payload.createdAt) : new Date(),
        });

        // Run AI diagnosis (best-effort)
        try {
            const aiResult = await diagnoseHeartRate({ heartRate: Number(bpm), age: payload.age, sex: payload.sex, trestbps: payload.trestbps, chol: payload.chol });
            if (aiResult && aiResult.diagnosis) {
                const diag = aiResult.diagnosis;
                dataDoc.aiDiagnosis = {
                    diagnosis: diag.diagnosis || String(diag),
                    severity: diag.severity || (diag?.severity === 0 ? "low" : diag?.severity),
                    analysis: diag.analysis || "",
                    recommendations: diag.recommendations || [],
                    riskFactors: diag.riskFactors || [],
                    needsAttention: !!diag.needsAttention,
                    urgencyLevel: diag.urgencyLevel || "routine",
                    aiModel: aiResult.aiModel || "unknown",
                    diagnosedAt: new Date(),
                };
                // set overall status from severity
                dataDoc.status = mapSeverityToStatus(dataDoc.aiDiagnosis.severity);
            }
        } catch (aiErr) {
            console.warn("AI diagnosis failed, saving without aiDiagnosis:", aiErr?.message || aiErr);
        }

        await dataDoc.save();

        return res.status(201).json({
            message: "Arduino data recorded (test/prod)",
            data: dataDoc,
            aiDiagnosis: dataDoc.aiDiagnosis || null,
        });
    } catch (err) {
        console.error("_saveArduinoDataForUser error:", err);
        return res.status(500).json({ message: "Failed to save data", error: err.message });
    }
};

export default { receiveArduinoData, receiveArduinoDataTest };
