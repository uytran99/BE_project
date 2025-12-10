# Test ECG Array với Postman

## 🎯 Endpoint Test

```
POST http://localhost:3000/api/heartrate/arduino/test
```

hoặc nếu server đang chạy trên Railway:

```
POST https://heart-rate-api-production.up.railway.app/api/heartrate/arduino/test
```

---

## 📋 Setup Postman

### **Step 1: Tạo Request mới**

1. Method: **POST**
2. URL: `http://localhost:3000/api/heartrate/arduino/test`
3. Headers:
   - `Content-Type: application/json`

### **Step 2: Body**

1. Chọn tab **Body**
2. Chọn **raw**
3. Chọn **JSON** từ dropdown

---

## 🧪 Test Cases

### **Test Case 1: ECG Array đơn giản (10 samples)**

```json
{
  "userId": "69370f5851faa2087fb26fb8",
  "bpm": 75,
  "ecg": [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 0.9, 0.8, 0.7, 0.6]
}
```

**Expected Response:**

```json
{
  "message": "Arduino data recorded (test/prod)",
  "data": {
    "_id": "...",
    "userId": "69370f5851faa2087fb26fb8",
    "heartRate": 75,
    "ecg": [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 0.9, 0.8, 0.7, 0.6],
    "ecgMetadata": {
      "dataPoints": 10,
      "unit": "mV",
      "quality": null
    },
    "status": "normal",
    "aiDiagnosis": { ... }
  }
}
```

---

### **Test Case 2: ECG Array với đầy đủ metadata**

```json
{
  "userId": "69370f5851faa2087fb26fb8",
  "bpm": 78,
  "ecg": [
    0.12, 0.15, 0.18, 0.22, 0.28, 0.35, 0.42, 0.48, 0.52, 0.55, 0.58, 0.62,
    0.68, 0.75, 0.82, 0.88, 0.92, 0.95, 0.98, 1.02, 1.08, 1.15, 1.22, 1.18,
    1.12, 1.05, 0.98, 0.92, 0.88, 0.85
  ],
  "ecgMetadata": {
    "samplingRate": 250,
    "duration": 0.12,
    "unit": "mV",
    "quality": "excellent"
  },
  "accel": {
    "ax": 1.0,
    "ay": 0.5,
    "az": 9.8
  },
  "fallen": false
}
```

**Expected Response:**

```json
{
  "message": "Arduino data recorded (test/prod)",
  "data": {
    "_id": "...",
    "heartRate": 78,
    "ecg": [0.12, 0.15, 0.18, ...],
    "ecgMetadata": {
      "samplingRate": 250,
      "duration": 0.12,
      "unit": "mV",
      "dataPoints": 30,
      "quality": "excellent"
    },
    "acc": [1.0, 0.5, 9.8],
    "status": "normal",
    "aiDiagnosis": {
      "diagnosis": "Nhịp tim bình thường",
      "severity": "low",
      ...
    }
  }
}
```

---

### **Test Case 3: ECG Array lớn (100 samples - realistic)**

```json
{
  "userId": "69370f5851faa2087fb26fb8",
  "bpm": 82,
  "ecg": [
    0.1, 0.12, 0.15, 0.18, 0.22, 0.27, 0.33, 0.4, 0.48, 0.57, 0.67, 0.78, 0.9,
    1.03, 1.17, 1.32, 1.48, 1.65, 1.83, 2.02, 2.22, 2.43, 2.65, 2.88, 3.12,
    3.37, 3.63, 3.9, 4.18, 4.47, 4.77, 5.08, 5.4, 5.73, 6.07, 6.42, 6.78, 7.15,
    7.53, 7.92, 8.32, 8.73, 9.15, 9.58, 10.02, 10.47, 10.93, 11.4, 11.88, 12.37,
    12.87, 12.87, 12.37, 11.88, 11.4, 10.93, 10.47, 10.02, 9.58, 9.15, 8.73,
    8.32, 7.92, 7.53, 7.15, 6.78, 6.42, 6.07, 5.73, 5.4, 5.08, 4.77, 4.47, 4.18,
    3.9, 3.63, 3.37, 3.12, 2.88, 2.65, 2.43, 2.22, 2.02, 1.83, 1.65, 1.48, 1.32,
    1.17, 1.03, 0.9, 0.78, 0.67, 0.57, 0.48, 0.4, 0.33, 0.27, 0.22, 0.18, 0.15
  ],
  "ecgMetadata": {
    "samplingRate": 250,
    "duration": 0.4,
    "unit": "mV",
    "quality": "good"
  }
}
```

---

### **Test Case 4: Realistic ECG Waveform (simulated heartbeat)**

Tín hiệu ECG mô phỏng với P-QRS-T complex:

```json
{
  "userId": "69370f5851faa2087fb26fb8",
  "bpm": 75,
  "ecg": [
    0.0, 0.01, 0.02, 0.03, 0.05, 0.08, 0.12, 0.15, 0.18, 0.2, 0.22, 0.23, 0.24,
    0.25, 0.26, 0.27, 0.28, 0.29, 0.3, 0.31, 0.32, 0.33, 0.34, 0.35, 0.36, 0.37,
    0.38, 0.39, 0.4, 0.41, 0.42, 0.43, 0.44, 0.45, 0.47, 0.5, 0.55, 0.62, 0.72,
    0.85, 1.02, 1.23, 1.48, 1.77, 2.1, 2.47, 2.88, 3.33, 3.82, 4.35, 4.92, 5.53,
    6.18, 6.87, 7.6, 8.37, 9.18, 10.03, 10.92, 11.85, 12.82, 13.83, 14.88,
    15.97, 17.1, 18.27, 19.48, 20.73, 22.02, 23.35, 24.72, 25.5, 24.72, 23.35,
    22.02, 20.73, 19.48, 18.27, 17.1, 15.97, 14.88, 13.83, 12.82, 11.85, 10.92,
    10.03, 9.18, 8.37, 7.6, 6.87, 6.18, 5.53, 4.92, 4.35, 3.82, 3.33, 2.88,
    2.47, 2.1, 1.77, 1.48, 1.23, 1.02, 0.85, 0.72, 0.62, 0.55, 0.5, 0.47, 0.45,
    0.43, 0.42, 0.41, 0.4, 0.39, 0.38, 0.37, 0.36, 0.35, 0.34, 0.33, 0.32, 0.31,
    0.3, 0.29, 0.28, 0.27, 0.26, 0.25, 0.24, 0.23, 0.22, 0.2, 0.18, 0.15, 0.12,
    0.08, 0.05, 0.03, 0.02, 0.01, 0.0, -0.01, -0.02, -0.01, 0.0, 0.01, 0.02,
    0.03, 0.04
  ],
  "ecgMetadata": {
    "samplingRate": 250,
    "duration": 0.6,
    "unit": "mV",
    "quality": "excellent"
  },
  "accel": {
    "ax": 0.98,
    "ay": 0.05,
    "az": 9.81
  },
  "gps": {
    "lat": 10.762622,
    "lon": 106.660172
  }
}
```

---

### **Test Case 5: ECG with different signal quality**

#### Poor Quality (noisy signal):

```json
{
  "userId": "69370f5851faa2087fb26fb8",
  "bpm": 80,
  "ecg": [
    0.5, 0.52, 0.48, 0.51, 0.49, 0.53, 0.47, 0.52, 0.48, 0.51, 0.49, 0.52, 0.48,
    0.51, 0.5, 0.49, 0.51, 0.5, 0.49, 0.51
  ],
  "ecgMetadata": {
    "samplingRate": 250,
    "unit": "mV",
    "quality": "poor"
  }
}
```

#### Excellent Quality (clean signal):

```json
{
  "userId": "69370f5851faa2087fb26fb8",
  "bpm": 72,
  "ecg": [
    0.1, 0.2, 0.35, 0.55, 0.8, 1.1, 1.45, 1.85, 2.3, 2.8, 3.35, 3.95, 4.6, 5.3,
    6.05, 6.85, 7.7, 8.6, 9.55, 10.55, 11.6, 12.7, 13.85, 15.05, 16.3, 17.6,
    18.95, 20.35, 21.8, 23.3, 24.85, 25.0, 24.85, 23.3, 21.8, 20.35, 18.95,
    17.6, 16.3, 15.05, 13.85, 12.7, 11.6, 10.55, 9.55, 8.6, 7.7, 6.85, 6.05, 5.3
  ],
  "ecgMetadata": {
    "samplingRate": 250,
    "duration": 0.2,
    "unit": "mV",
    "quality": "excellent"
  }
}
```

---

### **Test Case 6: Backward Compatible (single ECG value)**

```json
{
  "userId": "69370f5851faa2087fb26fb8",
  "bpm": 75,
  "ecg": 150,
  "accel": {
    "ax": 1.0,
    "ay": 0.5,
    "az": 9.8
  }
}
```

**Expected Response:**

```json
{
  "data": {
    "ecg": 150, // ← Single number (không có array)
    "ecgMetadata": null
  }
}
```

---

## 🛠️ Postman Collection Script

Để test nhanh nhiều cases, tạo Pre-request Script:

```javascript
// Generate realistic ECG waveform
function generateECG(samples, heartRate) {
  const ecg = [];
  const cycleLength = 60 / heartRate; // seconds per beat
  const samplesPerCycle = cycleLength * 250; // 250 Hz sampling

  for (let i = 0; i < samples; i++) {
    const phase = (i % samplesPerCycle) / samplesPerCycle;

    // Simplified ECG waveform
    let value = 0;

    // P wave (0.1-0.2)
    if (phase >= 0.1 && phase < 0.2) {
      value = 0.3 * Math.sin(((phase - 0.1) * Math.PI) / 0.1);
    }
    // QRS complex (0.3-0.4)
    else if (phase >= 0.3 && phase < 0.35) {
      value = -0.5 * Math.sin(((phase - 0.3) * Math.PI) / 0.05);
    } else if (phase >= 0.35 && phase < 0.4) {
      value = 25 * Math.sin(((phase - 0.35) * Math.PI) / 0.05);
    }
    // T wave (0.5-0.7)
    else if (phase >= 0.5 && phase < 0.7) {
      value = 0.5 * Math.sin(((phase - 0.5) * Math.PI) / 0.2);
    }

    ecg.push(parseFloat(value.toFixed(2)));
  }

  return ecg;
}

// Set variables
pm.environment.set("ecgArray", JSON.stringify(generateECG(100, 75)));
```

Sau đó trong Body dùng:

```json
{
  "userId": "69370f5851faa2087fb26fb8",
  "bpm": 75,
  "ecg": {{ecgArray}}
}
```

---

## ✅ Verification Checklist

Sau khi gửi request, kiểm tra response:

- [ ] Status code: **201 Created**
- [ ] Response có field `data`
- [ ] `data.ecg` là array (hoặc number nếu backward compatible)
- [ ] `data.ecgMetadata` có đầy đủ:
  - [ ] `samplingRate`
  - [ ] `duration`
  - [ ] `unit`
  - [ ] `dataPoints`
  - [ ] `quality` (nếu có)
- [ ] `data.aiDiagnosis` có đầy đủ thông tin
- [ ] `data.heartRate` match với `bpm` đã gửi

---

## 🎨 Visualize Response trong Postman

Thêm vào **Tests** tab:

```javascript
// Parse response
const response = pm.response.json();

// Visualize ECG data
if (response.data && Array.isArray(response.data.ecg)) {
  const ecg = response.data.ecg;
  const metadata = response.data.ecgMetadata;

  console.log(`📊 ECG Chart Data:`);
  console.log(`Samples: ${ecg.length}`);
  console.log(`Duration: ${metadata?.duration}s`);
  console.log(`Quality: ${metadata?.quality}`);
  console.log(`Min: ${Math.min(...ecg).toFixed(2)} mV`);
  console.log(`Max: ${Math.max(...ecg).toFixed(2)} mV`);
  console.log(
    `Avg: ${(ecg.reduce((a, b) => a + b, 0) / ecg.length).toFixed(2)} mV`
  );

  // Simple ASCII chart
  console.log("\n📈 ECG Waveform (ASCII):");
  const height = 10;
  const width = Math.min(ecg.length, 80);
  const step = Math.floor(ecg.length / width);

  const min = Math.min(...ecg);
  const max = Math.max(...ecg);
  const range = max - min;

  for (let row = height - 1; row >= 0; row--) {
    let line = "";
    for (let col = 0; col < width; col++) {
      const idx = col * step;
      const normalized = ((ecg[idx] - min) / range) * height;
      line += normalized >= row && normalized < row + 1 ? "█" : " ";
    }
    console.log(line);
  }
}

// Tests
pm.test("Status code is 201", () => {
  pm.response.to.have.status(201);
});

pm.test("Response has ECG array", () => {
  pm.expect(response.data.ecg).to.be.an("array");
});

pm.test("ECG metadata exists", () => {
  pm.expect(response.data.ecgMetadata).to.exist;
});
```

---

## 🚀 Quick Test Commands

### **Test 1: Simple ECG**

Copy-paste vào Postman Body:

```json
{
  "userId": "69370f5851faa2087fb26fb8",
  "bpm": 75,
  "ecg": [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 0.9, 0.8, 0.7, 0.6]
}
```

### **Test 2: With Metadata**

```json
{
  "userId": "69370f5851faa2087fb26fb8",
  "bpm": 78,
  "ecg": [
    0.12, 0.15, 0.18, 0.22, 0.28, 0.35, 0.42, 0.48, 0.52, 0.55, 0.58, 0.62,
    0.68, 0.75, 0.82, 0.88, 0.92, 0.95, 0.98, 1.02
  ],
  "ecgMetadata": {
    "samplingRate": 250,
    "duration": 0.08,
    "unit": "mV",
    "quality": "excellent"
  }
}
```

### **Test 3: Backward Compatible**

```json
{ "userId": "69370f5851faa2087fb26fb8", "bpm": 75, "ecg": 150 }
```

---

## 📊 Expected Performance

| ECG Samples | JSON Size  | Response Time |
| ----------- | ---------- | ------------- |
| 10 samples  | ~400 bytes | ~50ms         |
| 50 samples  | ~800 bytes | ~80ms         |
| 100 samples | ~1.5 KB    | ~120ms        |
| 250 samples | ~3 KB      | ~200ms        |
| 500 samples | ~5 KB      | ~350ms        |

---

## 🐛 Common Errors

### Error 1: "userId is required"

```json
{
  "message": "userId is required in body for test endpoint"
}
```

**Fix:** Thêm `"userId"` vào body

### Error 2: "Missing or invalid bpm/heartRate"

```json
{
  "message": "Missing or invalid bpm/heartRate"
}
```

**Fix:** Thêm `"bpm": 75` hoặc `"heartRate": 75`

### Error 3: Invalid JSON

```json
{
  "message": "Body must be valid JSON"
}
```

**Fix:** Kiểm tra JSON syntax (dấu phẩy, ngoặc)

---

## 🎯 Best Practices

1. **Use realistic ECG values:** 0.1 - 25 mV range
2. **Include metadata:** Giúp App hiểu cách render
3. **Test different qualities:** poor/fair/good/excellent
4. **Limit array size:** Không quá 1000 samples (quá lớn)
5. **Add acceleration data:** Test full sensor suite

---

🎉 **Ready to test! Copy một trong các JSON examples và gửi thôi!**
