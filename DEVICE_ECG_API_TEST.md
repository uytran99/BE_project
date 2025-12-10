# Test Guide: Device-Specific ECG APIs

## ✅ APIs mới đã được implement!

Bây giờ App có thể lấy ECG data theo từng device cụ thể.

---

## 🔧 New Endpoints

### **1. Get Latest ECG by Device**

```
GET /api/heartrate/device/:deviceId/latest
```

### **2. Get History by Device**

```
GET /api/heartrate/device/:deviceId/history
```

---

## 🧪 Testing với Postman

### **Test 1: Get Latest ECG from specific device**

#### **Setup:**

- Method: `GET`
- URL: `http://localhost:3000/api/heartrate/device/ESP32_001/latest?userId=69370f5851faa2087fb26fb8`

#### **Response:**

```json
{
  "success": true,
  "data": {
    "id": "675802abc...",
    "heartRate": 75,
    "ecg": [0.5, 0.6, 0.7, ...],
    "ecgMetadata": {
      "samplingRate": 250,
      "duration": 0.2,
      "unit": "mV",
      "dataPoints": 50,
      "quality": "excellent"
    },
    "deviceId": "ESP32_001",
    "status": "normal",
    "createdAt": "2025-12-10T12:00:00.000Z",
    "aiDiagnosis": { ... }
  }
}
```

---

### **Test 2: Get History from specific device**

#### **Setup:**

- Method: `GET`
- URL: `http://localhost:3000/api/heartrate/device/ESP32_001/history?userId=69370f5851faa2087fb26fb8&period=24h&limit=10`

#### **Query Parameters:**

- `userId` - User ID (required)
- `period` - Time period: `24h`, `7d`, `30d`, `all` (default: `24h`)
- `limit` - Max records (default: `50`)

#### **Response:**

```json
{
  "success": true,
  "deviceId": "ESP32_001",
  "period": "24h",
  "averageHR": 76,
  "minHR": 65,
  "maxHR": 95,
  "readingsCount": 10,
  "readings": [
    {
      "id": "...",
      "timestamp": "2025-12-10T12:00:00Z",
      "heartRate": 75,
      "ecg": [0.5, 0.6, ...],
      "ecgMetadata": { ... },
      "status": "normal",
      "aiDiagnosis": { ... }
    },
    ...
  ]
}
```

---

## 📱 App Implementation

### **React Native Example:**

```javascript
import React, { useState, useEffect } from "react";
import { View, Text, Picker, ScrollView } from "react-native";

const DeviceECGMonitor = ({ userId }) => {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [ecgData, setEcgData] = useState(null);
  const [loading, setLoading] = useState(false);

  const API_BASE = "https://heart-rate-api-production.up.railway.app";

  // Load user's devices
  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/devices`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const result = await response.json();

      if (result.success && result.data.length > 0) {
        setDevices(result.data);
        setSelectedDevice(result.data[0].deviceId);
      }
    } catch (error) {
      console.error("Failed to load devices:", error);
    }
  };

  // Load ECG when device changes
  useEffect(() => {
    if (selectedDevice) {
      loadDeviceECG(selectedDevice);
    }
  }, [selectedDevice]);

  const loadDeviceECG = async (deviceId) => {
    setLoading(true);
    try {
      // NEW API - Get latest from specific device
      const response = await fetch(
        `${API_BASE}/api/heartrate/device/${deviceId}/latest?userId=${userId}`
      );
      const result = await response.json();

      if (result.success) {
        setEcgData(result.data);
      }
    } catch (error) {
      console.error("Failed to load ECG:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadDeviceHistory = async (deviceId, period = "24h") => {
    try {
      const response = await fetch(
        `${API_BASE}/api/heartrate/device/${deviceId}/history?userId=${userId}&period=${period}&limit=50`
      );
      const result = await response.json();

      if (result.success) {
        console.log("History:", result.readings);
        console.log("Stats:", {
          avg: result.averageHR,
          min: result.minHR,
          max: result.maxHR,
        });
      }
    } catch (error) {
      console.error("Failed to load history:", error);
    }
  };

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      {/* Device Selector */}
      <Text style={{ fontSize: 16, fontWeight: "bold", marginBottom: 8 }}>
        Select Device:
      </Text>
      <Picker
        selectedValue={selectedDevice}
        onValueChange={(itemValue) => setSelectedDevice(itemValue)}
        style={{ marginBottom: 16 }}
      >
        {devices.map((device) => (
          <Picker.Item
            key={device._id}
            label={`${device.name} (${device.status})`}
            value={device.deviceId}
          />
        ))}
      </Picker>

      {/* Device Info */}
      {selectedDevice && (
        <View
          style={{
            backgroundColor: "#f5f5f5",
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          <Text>📱 Device ID: {selectedDevice}</Text>
          <Text>
            📊 Status:{" "}
            {devices.find((d) => d.deviceId === selectedDevice)?.status}
          </Text>
        </View>
      )}

      {/* ECG Data */}
      {loading && <Text>Loading...</Text>}

      {!loading && ecgData && (
        <View>
          <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 8 }}>
            Latest Reading:
          </Text>
          <Text>❤️ Heart Rate: {ecgData.heartRate} BPM</Text>
          <Text>
            📅 Recorded: {new Date(ecgData.createdAt).toLocaleString()}
          </Text>
          <Text>🎯 Status: {ecgData.status}</Text>

          {/* ECG Array Info */}
          {ecgData.ecg && Array.isArray(ecgData.ecg) && (
            <View style={{ marginTop: 12 }}>
              <Text style={{ fontWeight: "bold" }}>ECG Data Available:</Text>
              <Text>📊 Samples: {ecgData.ecg.length}</Text>
              {ecgData.ecgMetadata && (
                <>
                  <Text>
                    ⚡ Sampling Rate: {ecgData.ecgMetadata.samplingRate} Hz
                  </Text>
                  <Text>
                    ⏱ Duration: {ecgData.ecgMetadata.duration?.toFixed(2)}s
                  </Text>
                  <Text>✨ Quality: {ecgData.ecgMetadata.quality}</Text>
                </>
              )}

              {/* Render ECG Chart Component here */}
              <ECGChart data={ecgData.ecg} metadata={ecgData.ecgMetadata} />
            </View>
          )}

          {/* AI Diagnosis */}
          {ecgData.aiDiagnosis && (
            <View
              style={{
                marginTop: 12,
                padding: 12,
                backgroundColor: "#e8f5e9",
                borderRadius: 8,
              }}
            >
              <Text style={{ fontWeight: "bold" }}>🤖 AI Diagnosis:</Text>
              <Text>{ecgData.aiDiagnosis.diagnosis}</Text>
              <Text>Severity: {ecgData.aiDiagnosis.severity}</Text>
            </View>
          )}
        </View>
      )}

      {/* Load History Button */}
      <TouchableOpacity
        style={{
          backgroundColor: "#2196F3",
          padding: 12,
          borderRadius: 8,
          marginTop: 16,
          alignItems: "center",
        }}
        onPress={() => loadDeviceHistory(selectedDevice, "24h")}
      >
        <Text style={{ color: "white", fontWeight: "bold" }}>
          Load 24h History
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default DeviceECGMonitor;
```

---

## 🎯 Use Cases

### **Use Case 1: Multi-device monitoring**

```javascript
// User has multiple Arduino devices
// Monitor each device separately

const devices = ["ESP32_001", "ESP32_002", "ESP32_003"];

devices.forEach(async (deviceId) => {
  const response = await fetch(
    `/api/heartrate/device/${deviceId}/latest?userId=${userId}`
  );
  const { data } = await response.json();
  console.log(`${deviceId}: ${data.heartRate} BPM`);
});
```

### **Use Case 2: Device comparison**

```javascript
// Compare ECG data from different devices

const device1 = await getDeviceECG("ESP32_001");
const device2 = await getDeviceECG("ESP32_002");

console.log("Device 1 BPM:", device1.data.heartRate);
console.log("Device 2 BPM:", device2.data.heartRate);
```

### **Use Case 3: Device history chart**

```javascript
// Show historical trend for specific device

const history = await fetch(
  `/api/heartrate/device/ESP32_001/history?userId=${userId}&period=7d&limit=100`
);
const { readings } = await history.json();

// Plot chart with readings array
renderTrendChart(readings);
```

---

## 📊 API Comparison

| API                                 | Filter    | Use Case                      |
| ----------------------------------- | --------- | ----------------------------- |
| `GET /heartrate/latest`             | By user   | Get latest từ mọi devices     |
| `GET /heartrate/device/:id/latest`  | By device | Get latest từ 1 device cụ thể |
| `GET /heartrate/history`            | By user   | History từ mọi devices        |
| `GET /heartrate/device/:id/history` | By device | History từ 1 device cụ thể    |

---

## ✅ Testing Checklist

- [ ] Test GET `/api/heartrate/device/ESP32_001/latest`
- [ ] Test với `userId` query parameter
- [ ] Test với device không tồn tại (404 response)
- [ ] Test GET `/api/heartrate/device/ESP32_001/history`
- [ ] Test với `period=24h`, `7d`, `30d`
- [ ] Test với `limit` parameter
- [ ] Verify response có ECG array
- [ ] Verify response có ecgMetadata
- [ ] Test multiple devices
- [ ] Integrate vào App UI

---

## 🚨 Error Handling

### **Error 1: Device not found**

```json
{
  "success": false,
  "message": "No heart rate data found for this device"
}
```

### **Error 2: Missing userId**

```json
{
  "message": "Missing userId (provide ?userId=... for testing or authenticate)"
}
```

### **Error 3: Invalid deviceId**

```json
{
  "success": false,
  "error": "..."
}
```

---

## 🎉 Summary

✅ **2 APIs mới:**

- `GET /api/heartrate/device/:deviceId/latest` - Lấy ECG mới nhất của device
- `GET /api/heartrate/device/:deviceId/history` - Lấy lịch sử của device

✅ **Response format:**

- Bao gồm `ecg` array
- Bao gồm `ecgMetadata`
- Bao gồm `deviceId`
- Bao gồm `aiDiagnosis`

✅ **Ready to use:**

- Backend đã update
- Routes đã add
- Controllers đã implement
- Sẵn sàng cho App!

🚀 **Test ngay trong Postman hoặc integrate vào App!**
