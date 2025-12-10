# Test Guide: Auto-Create Device từ Arduino

## ✅ Update: Auto-create Device

Giờ khi Arduino gửi data, device sẽ **tự động được tạo** trong `/api/devices`!

---

## 🔄 **Flow mới:**

```
1. Arduino gửi data → POST /api/heartrate/arduino/test
   {
     "userId": "xxx",
     "bpm": 75,
     "deviceId": "ESP32_001"  ← Device identifier
   }

2. Backend tự động:
   ✅ Check xem device đã tồn tại chưa
   ✅ Nếu chưa → Tạo device mới trong Device collection
   ✅ Nếu có rồi → Update lastConnected time
   ✅ Lưu heart rate data vào Data collection

3. GET /api/devices
   → Device "ESP32_001" xuất hiện! ✨
```

---

## 🧪 **Test Case 1: Send data từ device mới**

### **Step 1: Gửi data lần đầu**

```bash
curl -X POST http://localhost:3000/api/heartrate/arduino/test \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "69370f5851faa2087fb26fb8",
    "bpm": 75,
    "deviceId": "ESP32_001",
    "deviceName": "Arduino ECG Monitor",
    "ecg": [0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
    "ecgMetadata": {
      "samplingRate": 250,
      "unit": "mV",
      "quality": "excellent"
    }
  }'
```

**Backend Console:**

```
✅ Auto-created device: ESP32_001
🤖 Đang phân tích dữ liệu bằng AI...
```

**Response:**

```json
{
  "message": "Arduino data recorded (test/prod)",
  "data": {
    "deviceId": "ESP32_001",
    "heartRate": 75,
    "ecg": [0.5, 0.6, ...],
    ...
  }
}
```

### **Step 2: Check device đã được tạo**

```bash
curl http://localhost:3000/api/devices
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "userId": "69370f5851faa2087fb26fb8",
      "deviceId": "ESP32_001",
      "name": "Arduino ECG Monitor",
      "status": "online",
      "isPaired": true,
      "lastConnected": "2025-12-10T12:50:00.000Z",
      "createdAt": "2025-12-10T12:50:00.000Z"
    }
  ]
}
```

✅ **Device đã xuất hiện!**

---

## 🧪 **Test Case 2: Send data từ device đã tồn tại**

### **Step 1: Gửi data lần 2**

```bash
curl -X POST http://localhost:3000/api/heartrate/arduino/test \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "69370f5851faa2087fb26fb8",
    "bpm": 78,
    "deviceId": "ESP32_001"
  }'
```

**Backend Console:**

```
(Không có log "Auto-created" vì device đã tồn tại)
```

**Response:**

```json
{
  "message": "Arduino data recorded (test/prod)",
  "data": {
    "deviceId": "ESP32_001",
    "heartRate": 78,
    ...
  }
}
```

### **Step 2: Check device updated**

```bash
curl http://localhost:3000/api/devices
```

**Response:**

```json
{
  "data": [
    {
      "deviceId": "ESP32_001",
      "status": "online",
      "lastConnected": "2025-12-10T12:52:00.000Z"  ← Updated!
    }
  ]
}
```

✅ **lastConnected đã update!**

---

## 🧪 **Test Case 3: Multiple devices**

### **Send data từ 3 devices khác nhau:**

```bash
# Device 1
curl -X POST http://localhost:3000/api/heartrate/arduino/test \
  -d '{"userId":"69370f5851faa2087fb26fb8","bpm":75,"deviceId":"ESP32_001","deviceName":"Monitor 1"}'

# Device 2
curl -X POST http://localhost:3000/api/heartrate/arduino/test \
  -d '{"userId":"69370f5851faa2087fb26fb8","bpm":78,"deviceId":"ESP32_002","deviceName":"Monitor 2"}'

# Device 3
curl -X POST http://localhost:3000/api/heartrate/arduino/test \
  -d '{"userId":"69370f5851faa2087fb26fb8","bpm":80,"deviceId":"ESP32_003","deviceName":"Monitor 3"}'
```

### **Check devices:**

```bash
curl http://localhost:3000/api/devices
```

**Response:**

```json
{
  "success": true,
  "data": [
    { "deviceId": "ESP32_001", "name": "Monitor 1", "status": "online" },
    { "deviceId": "ESP32_002", "name": "Monitor 2", "status": "online" },
    { "deviceId": "ESP32_003", "name": "Monitor 3", "status": "online" }
  ]
}
```

✅ **Cả 3 devices đều tự động được tạo!**

---

## 📋 **Device Fields được tạo tự động:**

| Field           | Value             | Source                                  |
| --------------- | ----------------- | --------------------------------------- |
| `userId`        | User ID           | From request body                       |
| `deviceId`      | Device identifier | From `payload.deviceId`                 |
| `name`          | Device name       | From `payload.deviceName` or `deviceId` |
| `deviceName`    | Same as name      | Same                                    |
| `status`        | `"online"`        | Auto-set                                |
| `isPaired`      | `true`            | Auto-set                                |
| `lastConnected` | Current time      | Auto-generated                          |
| `createdAt`     | Current time      | Auto-generated                          |

---

## 🎯 **Workflow Integration:**

### **Arduino Code:**

```cpp
// Thêm deviceId vào JSON payload
doc["userId"] = USER_ID;
doc["bpm"] = bpm;
doc["deviceId"] = "ESP32_001";           // ← Device ID
doc["deviceName"] = "Arduino Monitor";   // ← Optional: Device name
doc["ecg"] = ecgArray;

http.POST(payload);
```

### **Web App:**

```javascript
// 1. Arduino gửi data tự động
// (không cần manual device registration)

// 2. Web app lấy devices
const devices = await fetch("/api/devices");
// → Device đã có sẵn!

// 3. Web hiển thị devices
devices.data.forEach((device) => {
  console.log(`${device.name} (${device.status})`);
});
```

---

## ⚡ **Features:**

✅ **Auto-create device** khi Arduino gửi data lần đầu  
✅ **Auto-update lastConnected** mỗi lần gửi data  
✅ **Auto-set status = "online"** khi nhận data  
✅ **Support deviceName** (optional, fallback to deviceId)  
✅ **Không duplicate** - check existing device trước khi create

---

## 🔍 **Device Status Logic:**

```
Device nhận data → status = "online"
                → lastConnected = now

Device không gửi data > 5 phút
                → GET /api/devices tự động set status = "offline"
                (logic trong devices.controller.js)
```

---

## 🐛 **Error Handling:**

### **Nếu device creation fails:**

```javascript
// Backend vẫn lưu heart rate data
// Chỉ warn trong console:
console.warn("⚠️ Failed to create/update device:", error);

// Response vẫn success:
{
  "message": "Arduino data recorded (test/prod)",
  "data": { ... }
}
```

→ Data không bị mất nếu device creation fails

---

## 📊 **Database Collections:**

### **Before (chỉ có Data):**

```
Data collection:
  - heartRate: 75
  - deviceId: "ESP32_001"
  - userId: "xxx"

Device collection:
  (empty)  ← No device record!
```

### **After (tự động tạo Device):**

```
Data collection:
  - heartRate: 75
  - deviceId: "ESP32_001"
  - userId: "xxx"

Device collection:
  - deviceId: "ESP32_001"  ← Auto-created!
  - name: "Arduino Monitor"
  - status: "online"
  - lastConnected: "2025-12-10T12:50:00Z"
```

---

## ✅ **Verification Checklist:**

Test từng bước:

- [ ] Send data với deviceId mới
- [ ] Check console log "✅ Auto-created device"
- [ ] GET /api/devices → device xuất hiện
- [ ] Verify device có đúng name
- [ ] Verify status = "online"
- [ ] Send data lần 2 từ cùng device
- [ ] Verify lastConnected updated
- [ ] Send data từ device khác
- [ ] GET /api/devices → 2 devices
- [ ] Send data không có deviceId → deviceId = "unknown"

---

🎉 **Summary:**

**Before:** Arduino gửi data → phải manual tạo device trong `/api/devices`  
**After:** Arduino gửi data → device **tự động xuất hiện** trong `/api/devices` ✨

**Zero configuration needed!** Just send data with deviceId! 🚀
