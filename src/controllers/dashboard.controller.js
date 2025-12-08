import Device from "../models/device.model.js";
import Data from "../models/data.model.js";

/**
 * GET /api/dashboard/stats
 * Lấy thống kê tổng quan cho dashboard
 */
export const getDashboardStats = async (req, res) => {
    try {
        // Calculate today's date range
        // Use local timezone for "today" calculation
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        // Total devices
        const totalDevices = await Device.countDocuments();

        // Active devices: status='online' hoặc lastConnected trong 5 phút
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const activeDevices = await Device.countDocuments({
            $or: [{ status: "online" }, { lastConnected: { $gte: fiveMinutesAgo } }],
        });

        // Today readings count - use createdAt (always exists and reliable)
        const todayReadingsQuery = {
            createdAt: { $gte: todayStart, $lte: todayEnd },
        };
        
        const todayReadings = await Data.countDocuments(todayReadingsQuery);

        // Average heart rate today
        const todayData = await Data.find(todayReadingsQuery).select("heartRate");

        const averageHeartRate = todayData.length > 0 
            ? todayData.reduce((sum, item) => sum + (item.heartRate || 0), 0) / todayData.length 
            : 0;

        // Abnormal alerts today (status = 'warning' or 'critical')
        const abnormalAlertsQuery = {
            ...todayReadingsQuery,
            status: { $in: ["warning", "critical"] },
        };
        const abnormalAlerts = await Data.countDocuments(abnormalAlertsQuery);

        res.json({
            success: true,
            data: {
                totalDevices,
                activeDevices,
                todayReadings,
                averageHeartRate: Math.round(averageHeartRate * 10) / 10,
                abnormalAlerts,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching dashboard stats",
            error: error.message,
        });
    }
};

export default { getDashboardStats };
