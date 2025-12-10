# Hướng dẫn test API `/api/heartrate/arduino/test` trong Postman

## Endpoint

```
POST http://localhost:3000/api/heartrate/arduino/test
```

## Request Body (JSON)

### Fields bắt buộc:

- `userId` (string) - ID của user (có thể lấy từ database hoặc tạo user mới)
- `bpm` hoặc `heartRate` (number) - Nhịp tim (0-300)

### Fields tùy chọn:

- `accel` (object) - Gia tốc kế: `{ "ax": 1.2, "ay": 0.8, "az": 1.5 }`
- `acc` (array) - Gia tốc dạng array: `[1.2, 0.8, 1.5]`
- `fallen` (boolean) - Phát hiện ngã
- `mag_ema` (number) - Từ trường
- `gps` (object) - GPS: `{ "lat": 10.762622, "lon": 106.660172 }`
- `millis` (number) - Timestamp từ Arduino
- `ecg` (number) - ECG value
- `age` (number) - Tuổi (cho AI diagnosis)
- `sex` (number) - Giới tính: 1 = nam, 0 = nữ
- `trestbps` (number) - Huyết áp tâm thu
- `chol` (number) - Cholesterol
- `createdAt` (string) - ISO date string (nếu không có sẽ dùng thời gian hiện tại)

## Ví dụ Request Body

### 1. Request đơn giản nhất (chỉ bắt buộc):

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "bpm": 75
}
```

### 2. Request đầy đủ:

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "bpm": 85,
  "accel": {
    "ax": 1.2,
    "ay": 0.8,
    "az": 1.5
  },
  "fallen": false,
  "mag_ema": 0.98,
  "gps": {
    "lat": 10.762622,
    "lon": 106.660172
  },
  "millis": 123456,
  "ecg": 150,
  "age": 45,
  "sex": 1,
  "trestbps": 130,
  "chol": 220
}
```

### 3. Request với ECG Array (để vẽ điện tâm đồ):

```json
{
  "userId": "507f1f77bcf86cd799439011",
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
  }
}
```

### 4. Request với heartRate thay vì bpm:

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "heartRate": 95,
  "acc": [1.2, 0.8, 1.5],
  "fallen": false
}
```

## Cách test trong Postman

### Bước 1: Setup Request

1. Method: **POST**
2. URL: `http://localhost:3000/api/heartrate/arduino/test`
3. Headers:
   - `Content-Type: application/json`

### Bước 2: Body

1. Chọn tab **Body**
2. Chọn **raw**
3. Chọn **JSON** từ dropdown
4. Paste JSON body (ví dụ ở trên)

### Bước 3: Lấy userId

Nếu chưa có userId, có thể:

**Option 1: Tạo user mới**

```
POST http://localhost:3000/api/auth/register
Body:
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123"
}
```

Response sẽ có `userId` trong response.

**Option 2: Lấy userId từ database**

- Query MongoDB collection `users`
- Hoặc dùng admin API: `GET /admin/api/users`

**Option 3: Dùng userId test mặc định**

```
"userId": "507f1f77bcf86cd799439011"
```

### Bước 4: Send Request

Click **Send** và xem response.

## Response mẫu

### Success (201 Created):

```json
{
  "message": "Arduino data recorded (test/prod)",
  "data": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "userId": "507f1f77bcf86cd799439011",
    "heartRate": 85,
    "ecg": 150,
    "acc": [1.2, 0.8, 1.5],
    "status": "normal",
    "notes": "{\"fallen\":false,\"mag_ema\":0.98,\"gps\":{\"lat\":10.762622,\"lon\":106.660172},\"millis\":123456}",
    "aiDiagnosis": {
      "diagnosis": "Nhịp tim bình thường",
      "severity": "low",
      "analysis": "...",
      "recommendations": ["..."],
      "riskFactors": [],
      "needsAttention": false,
      "urgencyLevel": "routine",
      "aiModel": "python-advanced-ai",
      "diagnosedAt": "2024-01-15T10:30:00.000Z"
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "timestamp": "2024-01-15T10:30:00.000Z"
  },
  "aiDiagnosis": {
    "diagnosis": "Nhịp tim bình thường",
    "severity": "low",
    ...
  }
}
```

### Error (400 Bad Request):

```json
{
  "message": "userId is required in body for test endpoint"
}
```

hoặc

```json
{
  "message": "Missing or invalid bpm/heartRate"
}
```

## Test Cases

### Test Case 1: Nhịp tim bình thường

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "bpm": 75
}
```

### Test Case 2: Nhịp tim cao (cảnh báo)

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "bpm": 120
}
```

### Test Case 3: Nhịp tim rất cao (critical)

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "bpm": 150
}
```

### Test Case 4: Nhịp tim thấp

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "bpm": 50
}
```

### Test Case 5: Với đầy đủ sensor data

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "bpm": 85,
  "accel": {
    "ax": 1.2,
    "ay": 0.8,
    "az": 1.5
  },
  "fallen": false,
  "mag_ema": 0.98,
  "gps": {
    "lat": 10.762622,
    "lon": 106.660172
  },
  "millis": 123456,
  "ecg": 150
}
```

## Lưu ý

1. **userId bắt buộc**: Phải có userId hợp lệ trong database
2. **bpm/heartRate bắt buộc**: Phải là số từ 0-300
3. **AI Diagnosis tự động**: API sẽ tự động chạy AI diagnosis và lưu kết quả
4. **Status tự động**: Status sẽ được set dựa trên AI severity:
   - `low` → `normal`
   - `medium` → `warning`
   - `high` → `warning`
   - `critical` → `critical`
5. **Timestamp**: Nếu không có `createdAt`, sẽ dùng thời gian hiện tại

## Troubleshooting

### Lỗi "userId is required"

- Đảm bảo có field `userId` trong request body
- userId phải là string hợp lệ

### Lỗi "Missing or invalid bpm/heartRate"

- Đảm bảo có `bpm` hoặc `heartRate` trong body
- Giá trị phải là number, không phải string

### Lỗi 500 Server Error

- Kiểm tra MongoDB connection
- Kiểm tra server logs để xem chi tiết lỗi

## Postman Collection

Có thể import file `Heart_Rate_Monitor_API.postman_collection.json` để có sẵn các requests.
