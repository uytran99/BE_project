import Data from "../models/data.model.js";
import { diagnoseHeartRate, analyzeTrend } from "../services/ai.service.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken"; // added for decoding bearer token if req.userId missing

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

// Lấy lịch sử nhịp tim của user
export const getHeartRateHistory = async (req, res) => {
    try {
        // Ưu tiên lấy từ middleware auth, fallback sang query param để test nhanh
        const rawUserId = req.userId || req.query.userId;
        if (!rawUserId) return res.status(400).json({ error: "Missing userId" });

        // Nếu DB lưu dạng ObjectId, cần cast
        const userId = mongoose.isValidObjectId(rawUserId) ? new mongoose.Types.ObjectId(rawUserId) : rawUserId;

        const { limit = 10, startDate, endDate } = req.query;

        const query = { userId };
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const heartRateData = await Data.find(query).sort({ createdAt: -1 }).limit(parseInt(limit));

        res.json({ count: heartRateData.length, data: heartRateData });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// new helper: try req.userId, query.userId, then decode Bearer JWT (no verification)
const getUserIdFromReq = (req) => {
    // already set by auth middleware?
    if (req.userId) return req.userId;
    // allow quick test via query param
    if (req.query?.userId) return req.query.userId;
    // decode Bearer token payload to extract userId
    const auth = req.headers?.authorization || "";
    if (auth.startsWith("Bearer ")) {
        const token = auth.split(" ")[1];
        try {
            const decoded = jwt.decode(token);
            // token signed earlier with { userId: ... }
            if (decoded && (decoded.userId || decoded.id || decoded.sub)) {
                return decoded.userId || decoded.id || decoded.sub;
            }
        } catch (e) {
            // ignore decode errors; will fallback to missing userId handling
        }
    }
    return null;
};

// Lấy nhịp tim mới nhất
export const getLatestHeartRate = async (req, res) => {
    try {
        const rawUserId = getUserIdFromReq(req);
        if (!rawUserId) {
            return res.status(400).json({ message: "Missing userId (provide Authorization Bearer <token> or ?userId=...)" });
        }
        const userId = mongoose.isValidObjectId(rawUserId) ? new mongoose.Types.ObjectId(rawUserId) : rawUserId;

        const latestData = await Data.findOne({ userId }).sort({ createdAt: -1 });

        if (!latestData) {
            return res.status(404).json({ message: "No heart rate data found" });
        }

        res.json({ data: latestData });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Lấy thống kê nhịp tim
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
        const userId = req.userId;
        const { days = 7 } = req.query;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        const heartRateHistory = await Data.find({
            userId,
            createdAt: { $gte: startDate },
        }).sort({ createdAt: -1 });

        if (heartRateHistory.length === 0) {
            return res.status(404).json({ message: "No heart rate data found" });
        }

        console.log("🤖 Đang phân tích xu hướng bằng AI...");
        const trendAnalysis = await analyzeTrend(heartRateHistory);

        res.json({
            period: `Last ${days} days`,
            dataPoints: heartRateHistory.length,
            trendAnalysis: trendAnalysis.success ? trendAnalysis.trendAnalysis : null,
            rawData: heartRateHistory.slice(0, 10), // Trả về 10 records gần nhất
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
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
