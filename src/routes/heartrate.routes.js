import express from "express";
import { recordHeartRate, getHeartRateHistory, getLatestHeartRate, getHeartRateStats, getHeartRateTrend, reDiagnose, getAlertsAndWarnings, analyzeBpm } from "../controllers/heartrate.controller.js";
import { receiveArduinoData, receiveArduinoDataTest } from "../controllers/arduino.controller.js";
import { generatePairingCode, pairDevice } from "../controllers/device.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

// Device pairing endpoints
router.post("/device/generate-code", authenticate, generatePairingCode);
router.post("/device/pair", pairDevice);

// Arduino endpoint - TEST MODE (userId cứng hoặc truyền vào)
router.post("/arduino/test", receiveArduinoDataTest);

// Arduino endpoint - PRODUCTION (dùng deviceToken)
router.post("/arduino", receiveArduinoData);

// Lưu dữ liệu nhịp tim (với AI diagnosis tự động)
router.post("/record", recordHeartRate);

// Analyze only (no save) - UI: Record & Analyze button
router.post("/analyze", analyzeBpm);

// Lấy lịch sử nhịp tim
router.get("/history", getHeartRateHistory);

// Lấy nhịp tim mới nhất
router.get("/latest", getLatestHeartRate);

// Lấy thống kê nhịp tim
router.get("/stats", getHeartRateStats);

// AI Analysis endpoints
// Phân tích xu hướng nhịp tim bằng AI
router.get("/trend", getHeartRateTrend);

// Chuẩn đoán lại một record cụ thể
router.post("/re-diagnose/:recordId", reDiagnose);

// Lấy danh sách cảnh báo và trường hợp cần chú ý
router.get("/alerts", getAlertsAndWarnings);

export default router;
