# So Sánh Code Arduino: Cũ vs Mới (với ECG Array)

## 📊 Tổng quan thay đổi

| Feature                  | Code CŨ           | Code MỚI ✨                               |
| ------------------------ | ----------------- | ----------------------------------------- |
| **ECG Buffer**           | ❌ Không có       | ✅ 500 samples (2s @ 250Hz)               |
| **ECG Array gửi server** | ❌ Không          | ✅ Có (với metadata)                      |
| **Signal Quality**       | ❌ Không đánh giá | ✅ Auto assess (excellent/good/fair/poor) |
| **JSON Size**            | ~300 bytes        | ~3500 bytes (với ECG)                     |
| **Downsampling**         | N/A               | ✅ Auto (nếu >300 samples)                |
| **Vẽ Chart được?**       | ❌ KHÔNG          | ✅ CÓ                                     |

---

## 🔄 Chi tiết các thay đổi

### **1. ECG Buffer (QUAN TRỌNG NHẤT)**

#### Code CŨ:

```cpp
// KHÔNG CÓ BUFFER - chỉ xử lý real-time
int x = rawAdc - (int)baseSlow;
// → x bị bỏ đi sau khi xử lý
```

#### Code MỚI:

```cpp
// Tạo buffer 500 samples = 2 giây
#define ECG_BUFFER_SIZE 500
float ecgBuffer[ECG_BUFFER_SIZE];
int ecgBufferIndex = 0;

// Lưu mỗi sample vào buffer
if (ecgBufferIndex < ECG_BUFFER_SIZE) {
  float ecgValue = x * (3.3f / 4095.0f) * 100.0f;  // Convert to mV
  ecgBuffer[ecgBufferIndex++] = ecgValue;
}
```

**Giải thích:**

- Mỗi lần sample (4ms = 250 Hz), giá trị ECG được lưu vào buffer
- Buffer đủ 500 samples = 2 giây tín hiệu ECG
- Convert từ ADC (0-4095) sang mV scale

---

### **2. Signal Quality Assessment**

#### Code MỚI thêm:

```cpp
String assessSignalQuality(float* buffer, int size) {
  // Tính standard deviation
  float stdDev = calculateStdDev(buffer, size);

  // Đánh giá quality dựa trên signal variability
  if (stdDev < 10.0f) return "poor";      // Quá phẳng - kém tiếp xúc
  if (stdDev < 30.0f) return "fair";      // Biến thiên thấp
  if (stdDev < 80.0f) return "good";      // ECG bình thường
  return "excellent";                      // Signal mạnh
}
```

**Lợi ích:**

- App có thể show indicator chất lượng signal
- User biết khi nào cần điều chỉnh sensor

---

### **3. Hàm sendToServer() - Thay đổi lớn**

#### Code CŨ:

```cpp
void sendToServer(float bpmFinal, ...) {
  StaticJsonDocument<512> doc;  // Small JSON

  doc["userId"] = USER_ID;
  doc["bpm"] = bpmFinal;
  // ... không có ECG array

  http.POST(payload);
}
```

#### Code MỚI:

```cpp
void sendToServer(float bpmFinal, ...) {
  // Capacity lớn hơn cho ECG array
  DynamicJsonDocument doc(4096);

  doc["userId"] = USER_ID;
  doc["bpm"] = bpmFinal;

  // ✨ THÊM ECG ARRAY
  if (ecgBufferIndex >= 100) {  // Chỉ gửi nếu đủ samples
    JsonArray ecgArray = doc.createNestedArray("ecg");

    // Downsample nếu cần (giảm dung lượng)
    int step = (ecgBufferIndex > 300) ? 2 : 1;

    for (int i = 0; i < ecgBufferIndex; i += step) {
      ecgArray.add(ecgBuffer[i]);
    }

    // ✨ THÊM METADATA
    JsonObject metadata = doc.createNestedObject("ecgMetadata");
    metadata["samplingRate"] = ECG_SAMPLE_RATE / step;
    metadata["duration"] = (float)actualSamples / samplingRate;
    metadata["unit"] = "mV";
    metadata["quality"] = assessSignalQuality(ecgBuffer, ecgBufferIndex);
  }

  http.POST(payload);

  // Reset buffer sau khi gửi
  ecgBufferIndex = 0;
}
```

**Những gì mới:**

1. ✅ Tạo ECG array trong JSON
2. ✅ Downsample tự động nếu quá nhiều samples
3. ✅ Thêm metadata (sampling rate, duration, quality)
4. ✅ Reset buffer sau khi gửi

---

### **4. JSON Payload So Sánh**

#### Code CŨ (output):

```json
{
  "userId": "xxx",
  "bpm": 75,
  "fallen": false,
  "mag_ema": 0.98,
  "accel": { "ax": 1.0, "ay": 0.5, "az": 9.8 },
  "gps": { "lat": 10.76, "lon": 106.66 },
  "millis": 123456
}
```

**Size:** ~200-300 bytes  
**Vẽ chart được?** ❌ KHÔNG

#### Code MỚI (output):

```json
{
  "userId": "xxx",
  "bpm": 75,
  "ecg": [0.12, 0.15, 0.18, ..., 0.85],  // ← 250-500 values
  "ecgMetadata": {
    "samplingRate": 250,
    "duration": 2.0,
    "unit": "mV",
    "quality": "excellent"
  },
  "fallen": false,
  "mag_ema": 0.98,
  "accel": { "ax": 1.0, "ay": 0.5, "az": 9.8 },
  "gps": { "lat": 10.76, "lon": 106.66 },
  "millis": 123456
}
```

**Size:** ~3000-4000 bytes  
**Vẽ chart được?** ✅ CÓ!

---

## ⚙️ Cấu hình Buffer Size

### **Các tùy chọn:**

```cpp
// Option 1: 2 giây (KHUYẾN NGHỊ - đủ để thấy vài nhịp tim)
#define ECG_BUFFER_SIZE 500  // 2s @ 250Hz

// Option 2: 3 giây (nhiều detail hơn)
#define ECG_BUFFER_SIZE 750  // 3s @ 250Hz

// Option 3: 5 giây (rất chi tiết nhưng JSON lớn)
#define ECG_BUFFER_SIZE 1250  // 5s @ 250Hz

// Option 4: 1 giây (nhẹ nhất)
#define ECG_BUFFER_SIZE 250  // 1s @ 250Hz
```

**Lưu ý:**

- Buffer lớn hơn = JSON size lớn hơn = HTTP request chậm hơn
- **Khuyến nghị: 500 samples (2 giây)** - cân bằng tốt

---

## 🚀 Downsampling Tự Động

Code mới có **downsampling thông minh**:

```cpp
int step = 1;
if (ECG_SAMPLES_TO_SEND > 300) {
  step = 2;  // Lấy mỗi sample thứ 2
}

// Ví dụ: 500 samples → downsample → 250 samples
// Giảm JSON size từ ~4000 bytes → ~2500 bytes
// Vẫn đủ chi tiết để vẽ chart đẹp
```

**Khi nào downsampling xảy ra:**

- Buffer > 300 samples → lấy mỗi sample thứ 2
- Sampling rate giảm từ 250Hz → 125Hz (vẫn OK cho ECG)

---

## 📊 Memory Usage

| Item           | Code CŨ   | Code MỚI                |
| -------------- | --------- | ----------------------- |
| **ECG Buffer** | 0 bytes   | 2000 bytes (500 floats) |
| **JSON Doc**   | 512 bytes | 4096 bytes              |
| **Stack**      | ~1 KB     | ~3 KB                   |
| **Total RAM**  | ~2 KB     | ~9 KB                   |

**ESP32 có 520 KB RAM** → 9 KB chỉ chiếm 1.7% → **AN TOÀN** ✅

---

## 🔋 Performance Impact

### **CPU Usage:**

- Sampling: không đổi (vẫn 250 Hz)
- Buffer write: +1% CPU (rất nhỏ)
- JSON serialize: +5-10% CPU (chỉ khi gửi - 60s một lần)
- **Tổng: không ảnh hưởng đáng kể**

### **WiFi/Network:**

- Upload size: tăng từ ~300 bytes → ~3500 bytes
- Thời gian upload: tăng từ ~200ms → ~800ms
- **Vẫn chấp nhận được với WiFi bình thường**

---

## 🎯 Khi nào ECG array được gửi?

```cpp
const bool sendECGArray = (ECG_SAMPLES_TO_SEND >= 100);

if (sendECGArray) {
  // Gửi ECG array
} else {
  Serial.printf("⚠️ Chưa đủ samples (%d/100) → không gửi array\n");
  // Vẫn gửi BPM bình thường
}
```

**Logic:**

- Chỉ gửi ECG array nếu có **ít nhất 100 samples**
- Nếu chưa đủ → vẫn gửi BPM (backward compatible)
- Buffer reset sau mỗi lần gửi

---

## ✅ Checklist Upgrade

Để upgrade từ code cũ sang mới:

- [ ] Thay thế toàn bộ code bằng `arduino_ecg_with_array.ino`
- [ ] Upload lên ESP32
- [ ] Kiểm tra Serial Monitor - phải thấy:
  ```
  ECG Buffer Size: 500 samples (2.0 seconds at 250 Hz)
  ```
- [ ] Đợi 60 giây để gửi data
- [ ] Xem Serial - phải thấy:
  ```
  ✅ ECG array: 250 samples, 2.00s, quality: excellent
  JSON size: 3245 bytes
  [HTTP] ✅ Gửi thành công (code=201)
  ```
- [ ] Kiểm tra response từ server - phải có `ecg` array
- [ ] Test vẽ chart trên App

---

## 🧪 Debug Tips

### **1. Kiểm tra buffer đang fill:**

```cpp
// Trong hàm logECG5s(), có dòng:
Serial.printf("ECG Buffer: %d/%d samples\n", ecgBufferIndex, ECG_BUFFER_SIZE);

// Output mẫu mỗi 5 giây:
// ECG Buffer: 125/500 samples
// ECG Buffer: 250/500 samples
// ECG Buffer: 375/500 samples
// ECG Buffer: 500/500 samples  ← Full!
```

### **2. Kiểm tra JSON size:**

```cpp
Serial.printf("JSON size: %d bytes\n", payload.length());

// Nếu quá lớn (>5000 bytes) → tăng downsampling step
```

### **3. Kiểm tra signal quality:**

```cpp
// Quality được tính tự động và gửi trong metadata
// Output:
// quality: "excellent" → Signal rất tốt
// quality: "poor" → Kiểm tra kết nối sensor
```

---

## 🎨 App Rendering Example

Với ECG array từ Arduino mới, App có thể vẽ:

```jsx
// Response từ server:
const ecgData = [0.12, 0.15, 0.18, ...];  // 250-500 values
const metadata = {
  samplingRate: 250,
  duration: 2.0,
  quality: "excellent"
};

// Render chart
<VictoryLine
  data={ecgData.map((y, i) => ({
    x: i * (1000 / metadata.samplingRate),
    y: y
  }))}
  style={{ data: { stroke: "#00ff00" } }}
/>

// Quality indicator
<Badge color={getQualityColor(metadata.quality)}>
  {metadata.quality}
</Badge>
```

---

## 📚 Summary

### **Code CŨ:**

❌ Không có ECG buffer  
❌ Không gửi ECG array  
❌ App KHÔNG thể vẽ chart  
✅ Nhẹ, đơn giản  
✅ Chỉ cần BPM

### **Code MỚI:**

✅ Có ECG buffer 500 samples  
✅ Gửi ECG array + metadata  
✅ App VẼ ĐƯỢC chart  
✅ Auto assess signal quality  
✅ Smart downsampling  
✅ Backward compatible (nếu chưa đủ samples)

---

## 🚀 Next Steps

1. **Upload code mới lên ESP32**
2. **Test và kiểm tra Serial output**
3. **Verify JSON payload có ECG array**
4. **Implement chart rendering trong App**
5. **Enjoy beautiful ECG waveform!** 🎉

---

## 💡 Tips

**Muốn giảm dung lượng hơn nữa?**

```cpp
// Giảm buffer size
#define ECG_BUFFER_SIZE 250  // 1s → ~1500 bytes JSON

// Tăng downsampling
int step = 3;  // Lấy mỗi sample thứ 3
```

**Muốn gửi nhiều ECG hơn?**

```cpp
// Tăng buffer
#define ECG_BUFFER_SIZE 1250  // 5s → ~6000 bytes JSON

// Tăng JSON capacity
DynamicJsonDocument doc(8192);

// Tăng HTTP timeout
http.setTimeout(20000);  // 20s
```

---

🎉 **Giờ Arduino đã sẵn sàng gửi ECG array để App vẽ điện tâm đồ!**
