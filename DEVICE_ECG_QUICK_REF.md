# Quick Reference: Device ECG APIs

## ✅ ĐÃ IMPLEMENT XONG!

Backend giờ hỗ trợ lấy ECG data theo device cụ thể.

---

## 🚀 APIs Mới

### **1. Latest ECG từ device:**

```
GET /api/heartrate/device/{deviceId}/latest?userId={userId}
```

### **2. History từ device:**

```
GET /api/heartrate/device/{deviceId}/history?userId={userId}&period=24h&limit=50
```

---

## 🧪 Test Nhanh (Postman)

### **Test Latest:**

```
GET http://localhost:3000/api/heartrate/device/ESP32_001/latest?userId=69370f5851faa2087fb26fb8
```

### **Test History:**

```
GET http://localhost:3000/api/heartrate/device/ESP32_001/history?userId=69370f5851faa2087fb26fb8&period=24h&limit=10
```

---

## 📱 App Code (Copy-Paste)

```javascript
// Get latest ECG from specific device
const getDeviceECG = async (deviceId, userId) => {
  const response = await fetch(
    `${API_BASE}/api/heartrate/device/${deviceId}/latest?userId=${userId}`
  );
  const result = await response.json();

  if (result.success && result.data.ecg) {
    return result.data; // Has ecg array + metadata
  }
  return null;
};

// Get device history
const getDeviceHistory = async (deviceId, userId, period = "24h") => {
  const response = await fetch(
    `${API_BASE}/api/heartrate/device/${deviceId}/history?userId=${userId}&period=${period}&limit=50`
  );
  const result = await response.json();

  if (result.success) {
    return result.readings; // Array of readings with ECG
  }
  return [];
};

// Usage
const ecgData = await getDeviceECG("ESP32_001", userId);
console.log("ECG:", ecgData.ecg); // Array
console.log("BPM:", ecgData.heartRate);
console.log("Quality:", ecgData.ecgMetadata.quality);

const history = await getDeviceHistory("ESP32_001", userId, "7d");
console.log(`Got ${history.length} readings`);
```

---

## 📊 Response Format

```json
{
  "success": true,
  "data": {
    "heartRate": 75,
    "ecg": [0.5, 0.6, 0.7, ...],  // ← ECG ARRAY
    "ecgMetadata": {
      "samplingRate": 250,
      "duration": 0.2,
      "unit": "mV",
      "dataPoints": 50,
      "quality": "excellent"
    },
    "deviceId": "ESP32_001",  // ← Device identifier
    "status": "normal",
    "aiDiagnosis": { ... }
  }
}
```

---

## 🎯 Workflow

```
1. GET /api/devices
   → Lấy danh sách devices của user

2. User chọn device (ví dụ: "ESP32_001")

3. GET /api/heartrate/device/ESP32_001/latest
   → Lấy ECG data mới nhất từ device đó

4. Render ECG chart với data.ecg array

5. DONE! 🎉
```

---

## 📚 Files

- **Controller:** `src/controllers/heartrate.controller.js`
- **Routes:** `src/routes/heartrate.routes.js`
- **Test Guide:** `DEVICE_ECG_API_TEST.md` (chi tiết)
- **This file:** Quick reference

---

🎉 **Ready! Test ngay trong Postman hoặc App!**
