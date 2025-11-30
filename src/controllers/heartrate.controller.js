import Data from "../models/data.model.js";
import { diagnoseHeartRate, analyzeTrend } from "../services/ai.service.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken"; // added import for JWT decoding

// Helper: resolve userId from middleware, header, query or Bearer JWT (robust & tolerant)
const resolveUserId = (req) => {
    // prefer authentication middleware
    if (req.userId) return req.userId;

    // header override (convenience for devices/tests)
    const headerUser = req.headers?.["x-user-id"] || req.headers?.["x_user_id"];
    if (headerUser) return String(headerUser).trim();

    // query param: decode and sanitize (strip accidental appended params)
    if (req.query?.userId) {
        try {
            let q = decodeURIComponent(String(req.query.userId));
            // remove anything after ? or & or space (handle malformed input)
            q = q.split(/[?&\s]/)[0];
            if (q) return q;
        } catch (e) {
            // fallback to raw
            let q = String(req.query.userId).split(/[?&\s]/)[0];
            if (q) return q;
        }
    }

    // Authorization Bearer token: try decode without verification to extract userId/sub/id
    const auth = req.headers?.authorization || "";
    if (auth.startsWith("Bearer ")) {
        const token = auth.split(" ")[1];
        try {
            const decoded = jwt.decode(token);
            if (decoded) {
                if (decoded.userId) return decoded.userId;
                if (decoded.id) return decoded.id;
                if (decoded.sub) return decoded.sub;
            }
        } catch (e) {
            // ignore decode errors
        }
    }

    return null;
};

// Lưu dữ liệu nhịp tim khi user đăng nhập (với AI diagnosis)
export const recordHeartRate = async (req, res) => {
    try {
        const { heartRate, ecg, acc, notes, userId: bodyUserId } = req.body;
        const userId = req.userId || bodyUserId || "507f1f77bcf86cd799439011"; // Default test userId if not authenticated

        // Validate heart rate
        if (!heartRate || heartRate < 0 || heartRate > 300) {
            return res.status(400).json({ error: "Invalid heart rate value" });
        }

        // Xác định trạng thái dựa trên nhịp tim
        let status = "normal";
        if (heartRate < 60 || heartRate > 100) {
            status = "warning";
        }
        if (heartRate < 40 || heartRate > 140) {
            status = "critical";
        }

        // Gọi AI để chuẩn đoán
        console.log("🤖 Đang phân tích dữ liệu bằng AI...");
        const aiResult = await diagnoseHeartRate({
            heartRate,
            ecg,
            acc,
            userId,
        });

        const heartRateData = new Data({
            userId,
            heartRate,
            ecg,
            acc,
            status,
            notes,
            aiDiagnosis: aiResult.success
                ? {
                      ...aiResult.diagnosis,
                      aiModel: aiResult.aiModel,
                      diagnosedAt: aiResult.timestamp,
                  }
                : undefined,
        });

        await heartRateData.save();

        res.status(201).json({
            message: "Heart rate recorded successfully",
            data: heartRateData,
            aiDiagnosis: aiResult.success ? aiResult.diagnosis : null,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Lấy lịch sử nhịp tim của user (UI-friendly: readings + average/count)
export const getHeartRateHistory = async (req, res) => {
    try {
        const rawUserId = resolveUserId(req);
        if (!rawUserId) return res.status(400).json({ error: "Missing userId (provide ?userId=... for testing or authenticate)" });

        const userId = mongoose.isValidObjectId(rawUserId) ? new mongoose.Types.ObjectId(rawUserId) : rawUserId;

        // Accept period param: '24h' | '7d' | '30d' | 'all' or numeric days
        const { period = "24h", limit = 50 } = req.query;
        let startDate = null;

        if (period === "24h") {
            startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        } else if (period === "7d") {
            startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        } else if (period === "30d") {
            startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        } else if (period === "all") {
            startDate = null;
        } else if (!isNaN(Number(period))) {
            startDate = new Date(Date.now() - Math.max(1, Number(period)) * 24 * 60 * 60 * 1000);
        }

        const query = { userId };
        if (startDate) query.createdAt = { $gte: startDate };

        // Fetch records (most recent first)
        const records = await Data.find(query)
            .sort({ createdAt: -1 })
            .limit(Math.max(1, parseInt(limit)));

        // Build UI-friendly readings array (time ISO + bpm)
        const readings = records.map((r) => ({
            id: r._id,
            timestamp: r.createdAt,
            heartRate: typeof r.heartRate === "number" ? r.heartRate : null,
            status: r.status || null,
        }));

        // Compute simple stats (average, min, max) for heartRate only
        const hrValues = readings.map((r) => r.heartRate).filter((h) => typeof h === "number");
        const count = hrValues.length;
        const avg = count ? Math.round(hrValues.reduce((s, v) => s + v, 0) / count) : null;
        const min = count ? Math.min(...hrValues) : null;
        const max = count ? Math.max(...hrValues) : null;

        // Response shaped for Vital Signs History UI + Patient Details recent list
        return res.json({
            success: true,
            period,
            averageHR: avg, // integer bpm, client can format "76 bpm"
            minHR: min,
            maxHR: max,
            readingsCount: count,
            readings, // array of { id, timestamp, heartRate, status } sorted newest->oldest
            preview: readings.slice(0, 10), // top 10 for quick table
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// Lấy nhịp tim mới nhất (simplified for UI)
export const getLatestHeartRate = async (req, res) => {
    try {
        const rawUserId = resolveUserId(req);
        if (!rawUserId) return res.status(400).json({ message: "Missing userId (provide ?userId=... for testing or authenticate)" });

        const userId = mongoose.isValidObjectId(rawUserId) ? new mongoose.Types.ObjectId(rawUserId) : rawUserId;

        const latestData = await Data.findOne({ userId }).sort({ createdAt: -1 });

        if (!latestData) {
            return res.status(404).json({ message: "No heart rate data found" });
        }

        // Only return fields the UI needs (BPM + basic metadata)
        return res.json({
            success: true,
            data: {
                id: latestData._id,
                heartRate: latestData.heartRate,
                status: latestData.status || null,
                createdAt: latestData.createdAt,
                aiDiagnosis: latestData.aiDiagnosis || null, // optional for UI badge/notes
            },
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// Lấy thống kê nhịp tim (kept but simplified)
export const getHeartRateStats = async (req, res) => {
    try {
        const userId = req.userId;
        const { days = 7 } = req.query;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        const stats = await Data.aggregate([
            {
                $match: {
                    userId: userId,
                    createdAt: { $gte: startDate },
                },
            },
            {
                $group: {
                    _id: null,
                    avgHeartRate: { $avg: "$heartRate" },
                    minHeartRate: { $min: "$heartRate" },
                    maxHeartRate: { $max: "$heartRate" },
                    totalRecords: { $sum: 1 },
                },
            },
        ]);

        if (stats.length === 0) {
            return res.json({
                message: "No data available for the specified period",
                stats: null,
            });
        }

        res.json({
            period: `Last ${days} days`,
            stats: stats[0],
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Phân tích xu hướng nhịp tim bằng AI
export const getHeartRateTrend = async (req, res) => {
    try {
        const rawUserId = resolveUserId(req);
        if (!rawUserId) {
            return res.status(400).json({ error: "Missing userId (provide ?userId=... for testing or authenticate)" });
        }

        // Don't convert to ObjectId if it's not valid - let MongoDB handle string userId
        let userId;
        if (mongoose.isValidObjectId(rawUserId)) {
            userId = new mongoose.Types.ObjectId(rawUserId);
        } else {
            // Use as string for non-ObjectId userIds (test accounts, etc)
            userId = String(rawUserId).trim();
        }

        // Accept only valid periods: 7, 14, or 30 days
        let { days } = req.query;
        days = parseInt(days) || 7;

        // Validate period
        if (![7, 14, 30].includes(days)) {
            days = 7; // default to 7 days if invalid
        }

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const heartRateHistory = await Data.find({
            userId,
            createdAt: { $gte: startDate },
        }).sort({ createdAt: 1 }); // ascending order for trend analysis

        if (heartRateHistory.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No heart rate data found for this period",
                period: days,
                trendData: {
                    trend: "No data available",
                    insights: "Start recording heart rate data to see trend analysis",
                    recommendations: ["Begin monitoring your heart rate regularly"],
                    statistics: {
                        average: "0 BPM",
                        variability: "±0 BPM",
                        min: 0,
                        max: 0,
                        totalReadings: 0,
                    },
                },
            });
        }

        console.log(`🤖 Đang phân tích xu hướng ${days} ngày bằng AI...`);
        const trendAnalysis = await analyzeTrend(heartRateHistory);

        // Calculate statistics for UI
        const hrValues = heartRateHistory.map((d) => d.heartRate).filter((hr) => typeof hr === "number");
        const average = hrValues.length > 0 ? Math.round(hrValues.reduce((sum, val) => sum + val, 0) / hrValues.length) : 0;

        // Calculate variability (standard deviation)
        let variability = 0;
        if (hrValues.length > 1) {
            const variance = hrValues.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / hrValues.length;
            variability = Math.round(Math.sqrt(variance) * 10) / 10; // round to 1 decimal
        }

        // Format response for UI
        const responseData = {
            success: true,
            period: days, // return as number for UI to match selected period
            periodLabel: `Last ${days} days`,
            dataPoints: heartRateHistory.length,
            trendData: {
                trend: trendAnalysis.success ? trendAnalysis.trendAnalysis?.summary || trendAnalysis.trendAnalysis?.trend || "Data analyzed successfully" : "Unable to analyze trend at this time",
                insights: trendAnalysis.success ? trendAnalysis.trendAnalysis?.insights || trendAnalysis.trendAnalysis?.analysis || "Analysis in progress" : "Insufficient data for detailed insights",
                recommendations: trendAnalysis.success && Array.isArray(trendAnalysis.trendAnalysis?.recommendations) ? trendAnalysis.trendAnalysis.recommendations : trendAnalysis.success && trendAnalysis.trendAnalysis?.recommendations ? [trendAnalysis.trendAnalysis.recommendations] : ["Keep monitoring your heart rate regularly", "Maintain a healthy lifestyle", "Consult your doctor for personalized advice"],
                statistics: {
                    average: `${average} BPM`,
                    variability: `±${variability} BPM`,
                    min: Math.min(...hrValues),
                    max: Math.max(...hrValues),
                    totalReadings: hrValues.length,
                },
            },
            rawAnalysis: trendAnalysis.success ? trendAnalysis.trendAnalysis : null,
        };

        res.json(responseData);
    } catch (error) {
        console.error("Trend analysis error:", error);
        res.status(500).json({
            success: false,
            error: error.message,
            period: parseInt(req.query.days) || 7,
            trendData: null,
        });
    }
};

// Re-diagnose một record cũ bằng AI
export const reDiagnose = async (req, res) => {
    try {
        const { recordId } = req.params;
        const userId = req.userId;

        const record = await Data.findOne({ _id: recordId, userId });

        if (!record) {
            return res.status(404).json({ message: "Record not found" });
        }

        console.log("🤖 Đang chuẩn đoán lại bằng AI...");
        const aiResult = await diagnoseHeartRate({
            heartRate: record.heartRate,
            ecg: record.ecg,
            acc: record.acc,
            userId: record.userId,
        });

        if (aiResult.success) {
            record.aiDiagnosis = {
                ...aiResult.diagnosis,
                aiModel: aiResult.aiModel,
                diagnosedAt: aiResult.timestamp,
            };
            await record.save();
        }

        res.json({
            message: "Re-diagnosis completed",
            data: record,
            newDiagnosis: aiResult.success ? aiResult.diagnosis : null,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Lấy tất cả các trường hợp cần chú ý
export const getAlertsAndWarnings = async (req, res) => {
    try {
        const userId = req.userId;

        const alerts = await Data.find({
            userId,
            "aiDiagnosis.needsAttention": true,
        })
            .sort({ createdAt: -1 })
            .limit(20);

        const criticalAlerts = alerts.filter((a) => a.aiDiagnosis?.severity === "critical");
        const urgentAlerts = alerts.filter((a) => a.aiDiagnosis?.urgencyLevel === "urgent" || a.aiDiagnosis?.urgencyLevel === "emergency");

        res.json({
            totalAlerts: alerts.length,
            criticalCount: criticalAlerts.length,
            urgentCount: urgentAlerts.length,
            alerts: alerts.map((a) => ({
                id: a._id,
                heartRate: a.heartRate,
                diagnosis: a.aiDiagnosis?.diagnosis,
                severity: a.aiDiagnosis?.severity,
                urgencyLevel: a.aiDiagnosis?.urgencyLevel,
                recommendations: a.aiDiagnosis?.recommendations,
                createdAt: a.createdAt,
            })),
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Add: analyze BPM without saving (for "Record & Analyze" UI)
export const analyzeBpm = async (req, res) => {
    // Accept { bpm } or { heartRate } in body
    try {
        const { bpm, heartRate } = req.body || {};
        let hr = null;
        if (typeof bpm === "number") hr = bpm;
        else if (typeof heartRate === "number") hr = heartRate;
        else if (typeof bpm === "string" && bpm.trim()) hr = parseFloat(bpm);
        else if (typeof heartRate === "string" && heartRate.trim()) hr = parseFloat(heartRate);

        if (!Number.isFinite(hr) || hr <= 0 || hr > 300) {
            return res.status(400).json({ error: "Invalid heart rate value" });
        }

        // Call AI diagnosis (no persistence)
        const aiResult = await diagnoseHeartRate({ heartRate: Number(hr) });

        // Normalize response for UI
        const payload = {
            success: !!aiResult?.success,
            aiModel: aiResult?.aiModel || null,
            diagnosis: aiResult?.diagnosis || null,
            timestamp: aiResult?.timestamp || new Date(),
        };

        // If diagnosis includes severity/confidence/recommendations include them
        if (aiResult?.diagnosis) {
            payload.severity = aiResult.diagnosis.severity ?? null;
            if (aiResult.diagnosis.recommendations) payload.recommendations = aiResult.diagnosis.recommendations;
            if (aiResult.diagnosis.analysis) payload.analysis = aiResult.diagnosis.analysis;
        }

        // If TF/Python returned a confidence top-level, include it
        if (aiResult?.confidence) payload.confidence = aiResult.confidence;
        // some implementations put confidence inside diagnosis
        if (!payload.confidence && aiResult?.diagnosis?.confidence) payload.confidence = aiResult.diagnosis.confidence;

        return res.json(payload);
    } catch (err) {
        console.error("analyzeBpm error:", err);
        return res.status(500).json({ error: "AI analysis failed" });
    }
};
