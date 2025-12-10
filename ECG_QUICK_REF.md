# ECG Chart Integration - Quick Reference

## 📝 TÓM TẮT NHANH

### ✅ Đã thay đổi ở Backend:

1. **Database Model** - Hỗ trợ ECG array + metadata
2. **Arduino Controller** - Parse ECG array tự động
3. **API Response** - Trả về đầy đủ ECG data + metadata

### 📡 Request Format MỚI:

```json
{
  "userId": "xxx",
  "bpm": 75,
  "ecg": [0.5, 0.6, 0.7, ...],  // ← ARRAY thay vì số
  "ecgMetadata": {               // ← MỚI
    "samplingRate": 250,
    "duration": 2.0,
    "unit": "mV",
    "quality": "excellent"
  }
}
```

### 📤 Response Format MỚI:

```json
{
  "data": {
    "ecg": [0.5, 0.6, 0.7, ...],  // Array để vẽ chart
    "ecgMetadata": {
      "samplingRate": 250,
      "dataPoints": 500,
      "quality": "excellent"
    }
  }
}
```

---

## 🎯 App cần làm gì?

### 1. Gửi ECG Array

```javascript
// Arduino/ESP32 collect samples
const ecgSamples = [];
for (let i = 0; i < 500; i++) {
  ecgSamples.push(readECGSensor());
  delay(4ms); // 250 Hz sampling
}

// Send to Backend
POST /api/heartrate/arduino/test
{
  ecg: ecgSamples,
  ecgMetadata: { samplingRate: 250, duration: 2.0 }
}
```

### 2. Parse Response

```javascript
const { ecg, ecgMetadata } = response.data;
if (Array.isArray(ecg)) {
  renderECGChart(ecg, ecgMetadata);
}
```

### 3. Vẽ Chart (React Native)

```jsx
import { VictoryLine } from "victory-native";

<VictoryLine
  data={ecg.map((y, x) => ({ x, y }))}
  style={{ data: { stroke: "#00ff00" } }}
/>;
```

---

## 🔥 Key Points:

✅ **Backward Compatible**: API vẫn accept `ecg: Number` (code cũ vẫn chạy)  
✅ **Flexible**: Có thể gửi array bất kỳ độ dài  
✅ **Auto Metadata**: Nếu không gửi metadata, BE tự tính  
✅ **Quality Tracking**: Có thể mark signal quality (excellent/good/fair/poor)

---

## 📚 Full Documentation:

→ Xem file `ECG_CHART_GUIDE.md` để biết chi tiết đầy đủ!

---

## 🧪 Test ngay trong Postman:

```json
POST http://localhost:3000/api/heartrate/arduino/test

{
  "userId": "507f1f77bcf86cd799439011",
  "bpm": 75,
  "ecg": [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 0.9, 0.8, 0.7, 0.6],
  "ecgMetadata": {
    "samplingRate": 250,
    "unit": "mV",
    "quality": "excellent"
  }
}
```

✨ **Response sẽ có đủ data để vẽ ECG chart ngay!**
