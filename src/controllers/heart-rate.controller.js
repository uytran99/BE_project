import Data from "../models/data.model.js";
import Device from "../models/device.model.js";
import mongoose from "mongoose";

/**
 * GET /api/heart-rate
 * Lấy danh sách dữ liệu nhịp tim với pagination và filters
 */
export const getHeartRateData = async (req, res) => {
    try {
        const { deviceId, startDate, endDate, minHeartRate, maxHeartRate, status, page = 1, limit = 10 } = req.query;

        // Build filter query
        const filter = {};
        const andConditions = [];

        // Filter by deviceId
        if (deviceId) {
            // First, find devices with this deviceId to get their userIds
            const devices = await Device.find({ deviceId }).select("_id userId");
            if (devices.length > 0) {
                // If we have devices, filter by userId OR deviceId in Data
                const userIds = devices.map((d) => d.userId);
                andConditions.push({
                    $or: [{ userId: { $in: userIds } }, { deviceId: deviceId }],
                });
            } else {
                // If no devices found, try filtering by deviceId in Data directly
                filter.deviceId = deviceId;
            }
        }

        // Date range filter (use timestamp or createdAt)
        if (startDate || endDate) {
            const dateFilter = {};
            if (startDate) {
                dateFilter.$gte = new Date(startDate);
            }
            if (endDate) {
                dateFilter.$lte = new Date(endDate);
            }
            andConditions.push({
                $or: [{ timestamp: dateFilter }, { createdAt: dateFilter }],
            });
        }

        // Combine all conditions into final filter
        if (andConditions.length > 0) {
            if (andConditions.length === 1 && Object.keys(filter).length === 0) {
                // Only one condition and no direct filter, use it directly
                Object.assign(filter, andConditions[0]);
            } else {
                // Multiple conditions or mix of direct and $or conditions
                if (Object.keys(filter).length > 0) {
                    andConditions.push(filter);
                }
                // Replace filter with $and structure
                Object.keys(filter).forEach((key) => delete filter[key]);
                filter.$and = andConditions;
            }
        }

        // Heart rate range filter
        if (minHeartRate || maxHeartRate) {
            const heartRateFilter = {};
            if (minHeartRate) {
                heartRateFilter.$gte = Number(minHeartRate);
            }
            if (maxHeartRate) {
                heartRateFilter.$lte = Number(maxHeartRate);
            }
            if (filter.$and) {
                filter.$and.push({ heartRate: heartRateFilter });
            } else {
                filter.heartRate = heartRateFilter;
            }
        }

        // Status filter: map 'normal'/'abnormal' to actual status values
        if (status) {
            let statusFilter;
            if (status === "normal") {
                statusFilter = "normal";
            } else if (status === "abnormal") {
                statusFilter = { $in: ["warning", "critical"] };
            } else {
                statusFilter = status;
            }
            if (filter.$and) {
                filter.$and.push({ status: statusFilter });
            } else {
                filter.status = statusFilter;
            }
        }

        // Pagination
        const skip = (Number(page) - 1) * Number(limit);
        const limitNum = Number(limit);

        // Get data and total count
        const [data, total] = await Promise.all([Data.find(filter).sort({ timestamp: -1, createdAt: -1 }).skip(skip).limit(limitNum).lean(), Data.countDocuments(filter)]);

        // Format response data
        const formattedData = data.map((item) => ({
            _id: item._id,
            deviceId: item.deviceId || null,
            heartRate: item.heartRate,
            timestamp: item.timestamp || item.createdAt,
            status: item.status === "warning" || item.status === "critical" ? "abnormal" : "normal",
            metadata: {
                ecg: item.ecg || null,
                acc: item.acc || null,
                notes: item.notes || null,
            },
        }));

        res.json({
            success: true,
            data: {
                data: formattedData,
                total,
                page: Number(page),
                limit: limitNum,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching heart rate data",
            error: error.message,
        });
    }
};

/**
 * GET /api/heart-rate/:id
 * Lấy chi tiết một record nhịp tim
 */
export const getHeartRateById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid heart rate data ID",
            });
        }

        const data = await Data.findById(id).lean();

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Heart rate data not found",
            });
        }

        // Format response
        const formattedData = {
            _id: data._id,
            deviceId: data.deviceId || null,
            heartRate: data.heartRate,
            timestamp: data.timestamp || data.createdAt,
            status: data.status === "warning" || data.status === "critical" ? "abnormal" : "normal",
            metadata: {
                ecg: data.ecg || null,
                acc: data.acc || null,
                notes: data.notes || null,
                aiDiagnosis: data.aiDiagnosis || null,
            },
        };

        res.json({
            success: true,
            data: formattedData,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching heart rate data",
            error: error.message,
        });
    }
};

/**
 * DELETE /api/heart-rate/:id
 * Xóa một record nhịp tim
 */
export const deleteHeartRate = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid heart rate data ID",
            });
        }

        const result = await Data.findByIdAndDelete(id);

        if (!result) {
            return res.status(404).json({
                success: false,
                message: "Heart rate data not found",
            });
        }

        res.json({
            success: true,
            message: "Heart rate data deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error deleting heart rate data",
            error: error.message,
        });
    }
};

export default { getHeartRateData, getHeartRateById, deleteHeartRate };
