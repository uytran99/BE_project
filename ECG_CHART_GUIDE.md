# Hướng dẫn vẽ Điện Tâm Đồ (ECG Chart) cho App Mobile

## 📊 Tổng quan thay đổi

Backend đã được cập nhật để hỗ trợ **ECG data array** thay vì chỉ một giá trị số. Giờ đây App có thể nhận ECG data points để vẽ biểu đồ điện tâm đồ.

---

## 🔄 Những gì đã thay đổi ở Backend

### 1. **Database Schema** (Data Model)

**Trước:**

```javascript
ecg: Number; // Chỉ 1 số, ví dụ: 150
```

**Sau:**

```javascript
ecg: {
    type: mongoose.Schema.Types.Mixed,  // Hỗ trợ cả Number VÀ Array
    default: null,
},
ecgMetadata: {
    samplingRate: Number,    // Hz (ví dụ: 250 Hz)
    duration: Number,        // giây
    unit: String,            // "mV" hoặc "ADC"
    dataPoints: Number,      // tổng số điểm dữ liệu
    quality: String,         // "excellent" | "good" | "fair" | "poor"
}
```

### 2. **Arduino Controller**

Controller giờ đây tự động:

- ✅ Xử lý cả `ecg` dạng `Number` (legacy) và `Array` (mới)
- ✅ Parse `ecgMetadata` nếu có
- ✅ Tự động tính `dataPoints` nếu không được cung cấp
- ✅ Backward compatible với code cũ

---

## 📡 API Request Format

### **Endpoint:** `POST /api/heartrate/arduino/test`

### **Option 1: ECG Array với đầy đủ metadata (KHUYẾN NGHỊ)**

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "bpm": 75,
  "ecg": [
    0.12, 0.15, 0.18, 0.22, 0.28, 0.35, 0.42, 0.48, 0.52, 0.55, 0.58, 0.62,
    0.68, 0.75, 0.82, 0.88, 0.92, 0.95, 0.98, 1.02, 1.08, 1.15, 1.22, 1.18,
    1.12, 1.05, 0.98, 0.92, 0.88, 0.85, 0.82, 0.78, 0.75, 0.72, 0.68, 0.65,
    0.62, 0.58, 0.55, 0.52, 0.48, 0.45, 0.42, 0.38, 0.35, 0.32, 0.28, 0.25,
    0.22, 0.18
  ],
  "ecgMetadata": {
    "samplingRate": 250,
    "duration": 2.0,
    "unit": "mV",
    "quality": "excellent"
  },
  "accel": { "ax": 1.2, "ay": 0.8, "az": 1.5 },
  "fallen": false
}
```

### **Option 2: ECG Array không có metadata (tự động tính)**

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "bpm": 82,
  "ecg": [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 0.9, 0.8, 0.7, 0.6]
}
```

Backend sẽ tự động tạo metadata:

```json
{
  "dataPoints": 10,
  "unit": "mV",
  "quality": null
}
```

### **Option 3: ECG single value (backward compatible)**

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "bpm": 75,
  "ecg": 150 // Vẫn hoạt động như cũ
}
```

---

## 📤 API Response Format

### **Success Response (201 Created)**

```json
{
  "message": "Arduino data recorded (test/prod)",
  "data": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "userId": "507f1f77bcf86cd799439011",
    "heartRate": 75,
    "ecg": [0.12, 0.15, 0.18, ...],  // Array của ECG values
    "ecgMetadata": {
      "samplingRate": 250,
      "duration": 2.0,
      "unit": "mV",
      "dataPoints": 50,
      "quality": "excellent"
    },
    "acc": [1.2, 0.8, 1.5],
    "status": "normal",
    "aiDiagnosis": {
      "diagnosis": "Nhịp tim bình thường",
      "severity": "low",
      "recommendations": ["Duy trì lối sống lành mạnh"],
      ...
    },
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "aiDiagnosis": { ... }
}
```

---

## 📱 Cách App sử dụng dữ liệu để vẽ ECG Chart

### **1. Parse Response**

```javascript
const response = await fetch("/api/heartrate/arduino/test", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(requestData),
});

const result = await response.json();
const { ecg, ecgMetadata } = result.data;
```

### **2. Kiểm tra kiểu dữ liệu**

```javascript
// Check nếu ECG là array (có thể vẽ chart)
if (Array.isArray(ecg) && ecg.length > 0) {
  // Vẽ ECG chart
  renderECGChart(ecg, ecgMetadata);
} else if (typeof ecg === "number") {
  // Legacy: chỉ hiển thị số đơn
  console.log(`ECG value: ${ecg}`);
} else {
  console.log("No ECG data available");
}
```

### **3. Tạo data points cho chart**

```javascript
function renderECGChart(ecgData, metadata) {
  // Tính time values dựa trên sampling rate
  const samplingRate = metadata?.samplingRate || 250; // default 250 Hz
  const timeInterval = 1000 / samplingRate; // ms between samples

  // Tạo data points với timestamp
  const chartData = ecgData.map((value, index) => ({
    x: index * timeInterval, // time in milliseconds
    y: value, // ECG value in mV
  }));

  // Use charting library to render
  // Ví dụ với React Native Chart Kit, Victory Native, etc.
  return chartData;
}
```

### **4. Ví dụ với React Native + Victory Chart**

```jsx
import { VictoryLine, VictoryChart } from "victory-native";

function ECGChart({ ecgData, ecgMetadata }) {
  const chartData = ecgData.map((value, index) => ({
    x: index * (1000 / (ecgMetadata?.samplingRate || 250)),
    y: value,
  }));

  return (
    <VictoryChart>
      <VictoryLine
        data={chartData}
        style={{
          data: {
            stroke: "#00ff00", // Green ECG line
            strokeWidth: 2,
          },
        }}
        interpolation="natural" // Smooth curve
      />
    </VictoryChart>
  );
}
```

### **5. Ví dụ với React Native Chart Kit**

```jsx
import { LineChart } from "react-native-chart-kit";

function ECGChart({ ecgData, ecgMetadata }) {
  return (
    <LineChart
      data={{
        labels: [], // Hide labels for smooth ECG
        datasets: [
          {
            data: ecgData,
          },
        ],
      }}
      width={screenWidth}
      height={220}
      chartConfig={{
        backgroundColor: "#000",
        backgroundGradientFrom: "#000",
        backgroundGradientTo: "#000",
        decimalPlaces: 2,
        color: (opacity = 1) => `rgba(0, 255, 0, ${opacity})`,
        style: { borderRadius: 16 },
      }}
      bezier // Smooth curve
      withDots={false} // No dots for ECG
      withInnerLines={true}
      withOuterLines={true}
    />
  );
}
```

---

## 🎨 UI/UX Recommendations

### **Display ECG Metadata**

```jsx
<View style={styles.metadataContainer}>
  {ecgMetadata && (
    <>
      <Text>⚡ Sampling Rate: {ecgMetadata.samplingRate} Hz</Text>
      <Text>⏱ Duration: {ecgMetadata.duration}s</Text>
      <Text>📊 Data Points: {ecgMetadata.dataPoints}</Text>
      <Text>✨ Quality: {ecgMetadata.quality}</Text>
    </>
  )}
</View>
```

### **Quality Indicator**

```javascript
function getQualityColor(quality) {
  switch (quality) {
    case "excellent":
      return "#00ff00"; // Green
    case "good":
      return "#90EE90"; // Light green
    case "fair":
      return "#FFD700"; // Yellow
    case "poor":
      return "#FF6347"; // Red
    default:
      return "#808080"; // Gray
  }
}
```

---

## 🔧 Arduino/ESP32 Code Example

### **Gửi ECG data array từ Arduino**

```cpp
#include <ArduinoJson.h>
#include <HTTPClient.h>

void sendECGData() {
  // ECG buffer (50 data points)
  float ecgBuffer[50];

  // Collect ECG samples at 250 Hz
  for(int i = 0; i < 50; i++) {
    ecgBuffer[i] = analogRead(ECG_PIN) * (3.3 / 4095.0);  // Convert ADC to mV
    delay(4);  // 4ms = 250 Hz sampling rate
  }

  // Calculate BPM
  int bpm = calculateBPM(ecgBuffer, 50);

  // Create JSON
  StaticJsonDocument<2048> doc;
  doc["userId"] = "507f1f77bcf86cd799439011";
  doc["bpm"] = bpm;

  // Add ECG array
  JsonArray ecgArray = doc.createNestedArray("ecg");
  for(int i = 0; i < 50; i++) {
    ecgArray.add(ecgBuffer[i]);
  }

  // Add metadata
  JsonObject metadata = doc.createNestedObject("ecgMetadata");
  metadata["samplingRate"] = 250;
  metadata["duration"] = 0.2;  // 50 samples / 250 Hz = 0.2s
  metadata["unit"] = "mV";
  metadata["quality"] = "excellent";

  // Send HTTP POST
  HTTPClient http;
  http.begin("http://your-server.com/api/heartrate/arduino/test");
  http.addHeader("Content-Type", "application/json");

  String jsonString;
  serializeJson(doc, jsonString);

  int httpCode = http.POST(jsonString);
  http.end();
}
```

---

## 📊 Common ECG Sampling Rates

| Frequency | Use Case                  | Data Points (1s) |
| --------- | ------------------------- | ---------------- |
| 128 Hz    | Minimum for basic ECG     | 128              |
| 250 Hz    | Standard consumer devices | 250              |
| 500 Hz    | Clinical grade            | 500              |
| 1000 Hz   | Research grade            | 1000             |

**Khuyến nghị cho mobile app:** **250 Hz** (cân bằng giữa quality và data size)

---

## ⚡ Performance Tips

### **1. Limit ECG Data Size**

```javascript
// Chỉ lấy 2-5 giây ECG data mỗi lần
// Ví dụ: 250 Hz × 2s = 500 data points
```

### **2. Data Compression** (Optional)

```javascript
// Có thể compress ECG array trước khi gửi
// Ví dụ: gzip compression hoặc delta encoding
```

### **3. Chunking for Long Records**

```javascript
// Với ECG dài (> 10s), chia thành nhiều chunks
const CHUNK_SIZE = 500; // 2 seconds at 250 Hz
```

---

## 🧪 Testing với Postman

### **Test Case 1: ECG Array với metadata**

```json
POST http://localhost:3000/api/heartrate/arduino/test

{
  "userId": "507f1f77bcf86cd799439011",
  "bpm": 75,
  "ecg": [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 0.9, 0.8, 0.7, 0.6],
  "ecgMetadata": {
    "samplingRate": 250,
    "duration": 0.04,
    "unit": "mV",
    "quality": "excellent"
  }
}
```

### **Test Case 2: Large ECG Array (realistic)**

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "bpm": 82,
  "ecg": [
    /* 500 data points for 2 seconds at 250 Hz */
  ],
  "ecgMetadata": {
    "samplingRate": 250,
    "duration": 2.0,
    "unit": "mV",
    "quality": "good"
  }
}
```

---

## ✅ Checklist cho App Development

- [ ] Parse `ecg` array từ API response
- [ ] Parse `ecgMetadata` để lấy thông tin sampling rate
- [ ] Implement ECG chart component (Victory, Chart Kit, etc.)
- [ ] Handle case khi `ecg` là `null` hoặc empty array
- [ ] Display metadata (sampling rate, duration, quality)
- [ ] Add quality indicator (màu sắc theo chất lượng signal)
- [ ] Test với different ECG array sizes
- [ ] Optimize rendering performance cho large datasets
- [ ] Add loading state khi fetch ECG data
- [ ] Add error handling cho invalid ECG data

---

## 🚨 Error Handling

```javascript
// App side validation
function validateECGData(ecgData, metadata) {
  if (!Array.isArray(ecgData)) {
    throw new Error("ECG data must be an array");
  }

  if (ecgData.length === 0) {
    throw new Error("ECG data is empty");
  }

  if (metadata && metadata.dataPoints !== ecgData.length) {
    console.warn("Metadata dataPoints mismatch with actual array length");
  }

  // Check for invalid values
  const hasInvalidValues = ecgData.some(
    (v) => typeof v !== "number" || isNaN(v)
  );

  if (hasInvalidValues) {
    throw new Error("ECG data contains invalid values");
  }

  return true;
}
```

---

## 📚 Summary

### **Backend changes:**

✅ Model hỗ trợ `ecg` as Array  
✅ Thêm `ecgMetadata` schema  
✅ Controller tự động parse ECG array  
✅ Backward compatible với old code

### **App cần làm:**

1. Gửi `ecg` array thay vì single number
2. Gửi `ecgMetadata` (sampling rate, duration, quality)
3. Parse response và extract `ecg` + `ecgMetadata`
4. Implement chart component để render ECG waveform
5. Handle edge cases (null, empty, invalid data)

### **Optional enhancements:**

- Real-time ECG streaming (WebSocket)
- Signal processing (noise filtering)
- Heart rate detection from ECG
- Abnormality detection (QRS complex, etc.)

---

🎉 **Backend đã sẵn sàng! Giờ App có thể vẽ điện tâm đồ đẹp mắt!**
