# Web UI Guide: Hiển thị DeviceId

## ✅ Updated APIs

Tất cả APIs giờ **return deviceId** trong response để Web có thể hiển thị device nào gửi dữ liệu.

---

## 📡 API Responses với DeviceId

### **1. GET /api/heartrate/latest**

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "675802...",
    "heartRate": 75,
    "deviceId": "ESP32_001",  // ← DeviceId
    "ecg": [...],
    "ecgMetadata": {...},
    "status": "normal",
    "createdAt": "2025-12-10T12:00:00Z"
  }
}
```

---

### **2. GET /api/heartrate/history**

**Response:**

```json
{
  "success": true,
  "period": "24h",
  "averageHR": 76,
  "readings": [
    {
      "id": "...",
      "timestamp": "2025-12-10T12:00:00Z",
      "heartRate": 75,
      "deviceId": "ESP32_001", // ← DeviceId
      "status": "normal"
    },
    {
      "id": "...",
      "timestamp": "2025-12-10T11:50:00Z",
      "heartRate": 78,
      "deviceId": "ESP32_002", // ← Another device
      "status": "normal"
    }
  ]
}
```

---

### **3. GET /api/heartrate/device/:deviceId/latest**

**Response:**

```json
{
  "success": true,
  "data": {
    "heartRate": 75,
    "deviceId": "ESP32_001",  // ← DeviceId (matches param)
    "ecg": [...],
    ...
  }
}
```

---

### **4. GET /api/heartrate/device/:deviceId/history**

**Response:**

```json
{
  "success": true,
  "deviceId": "ESP32_001",  // ← DeviceId (all readings from this device)
  "readings": [
    {
      "heartRate": 75,
      "deviceId": "ESP32_001",
      ...
    }
  ]
}
```

---

## 🎨 Web UI Examples

### **Example 1: Display Device in History Table**

```html
<table>
  <thead>
    <tr>
      <th>Time</th>
      <th>Device</th>
      <th>Heart Rate</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    <!-- Reading 1 -->
    <tr>
      <td>2025-12-10 12:00</td>
      <td>
        <span class="device-badge"> 📱 ESP32_001 </span>
      </td>
      <td>75 BPM</td>
      <td>
        <span class="status-normal">Normal</span>
      </td>
    </tr>

    <!-- Reading 2 from different device -->
    <tr>
      <td>2025-12-10 11:50</td>
      <td>
        <span class="device-badge"> 📱 ESP32_002 </span>
      </td>
      <td>78 BPM</td>
      <td>
        <span class="status-normal">Normal</span>
      </td>
    </tr>
  </tbody>
</table>
```

**CSS:**

```css
.device-badge {
  background: #e3f2fd;
  color: #1976d2;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}
```

---

### **Example 2: Group readings by device**

```javascript
// Fetch history
const response = await fetch("/api/heartrate/history?period=24h&limit=100");
const { readings } = await response.json();

// Group by deviceId
const byDevice = readings.reduce((acc, reading) => {
  const deviceId = reading.deviceId || "unknown";
  if (!acc[deviceId]) {
    acc[deviceId] = [];
  }
  acc[deviceId].push(reading);
  return acc;
}, {});

// Display
Object.entries(byDevice).forEach(([deviceId, deviceReadings]) => {
  console.log(`Device ${deviceId}: ${deviceReadings.length} readings`);

  const avgBPM =
    deviceReadings.reduce((sum, r) => sum + r.heartRate, 0) /
    deviceReadings.length;
  console.log(`Average BPM: ${avgBPM.toFixed(1)}`);
});
```

**Output:**

```
Device ESP32_001: 45 readings
Average BPM: 76.2

Device ESP32_002: 33 readings
Average BPM: 74.8
```

---

### **Example 3: Device filter dropdown**

```html
<div class="filter-section">
  <label>Filter by Device:</label>
  <select id="deviceFilter">
    <option value="all">All Devices</option>
    <option value="ESP32_001">ESP32_001</option>
    <option value="ESP32_002">ESP32_002</option>
    <option value="unknown">Unknown</option>
  </select>
</div>

<div id="readingsTable">
  <!-- Filtered readings will appear here -->
</div>
```

**JavaScript:**

```javascript
let allReadings = [];

// Load all readings
async function loadReadings() {
  const res = await fetch("/api/heartrate/history?limit=100");
  const data = await res.json();
  allReadings = data.readings;
  renderReadings(allReadings);
}

// Filter by device
document.getElementById("deviceFilter").addEventListener("change", (e) => {
  const deviceId = e.target.value;

  if (deviceId === "all") {
    renderReadings(allReadings);
  } else {
    const filtered = allReadings.filter((r) => r.deviceId === deviceId);
    renderReadings(filtered);
  }
});

// Render table
function renderReadings(readings) {
  const html = readings
    .map(
      (r) => `
    <tr>
      <td>${new Date(r.timestamp).toLocaleString()}</td>
      <td><span class="device-badge">${r.deviceId}</span></td>
      <td>${r.heartRate} BPM</td>
      <td>${r.status}</td>
    </tr>
  `
    )
    .join("");

  document.getElementById("readingsTable").innerHTML = html;
}
```

---

### **Example 4: Device status indicator**

```html
<div class="device-status">
  <h3>Connected Devices</h3>

  <div class="device-card online">
    <div class="device-icon">📱</div>
    <div class="device-info">
      <div class="device-name">ESP32_001</div>
      <div class="device-status-text">
        <span class="status-dot online"></span>
        Online
      </div>
      <div class="device-last-reading">Last: 75 BPM • 2 min ago</div>
    </div>
  </div>

  <div class="device-card offline">
    <div class="device-icon">📱</div>
    <div class="device-info">
      <div class="device-name">ESP32_002</div>
      <div class="device-status-text">
        <span class="status-dot offline"></span>
        Offline
      </div>
      <div class="device-last-reading">Last: 78 BPM • 2 hours ago</div>
    </div>
  </div>
</div>
```

**CSS:**

```css
.device-card {
  display: flex;
  align-items: center;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 12px;
  background: white;
  border: 1px solid #e0e0e0;
}

.device-card.online {
  border-left: 4px solid #4caf50;
}

.device-card.offline {
  border-left: 4px solid #9e9e9e;
}

.device-icon {
  font-size: 32px;
  margin-right: 16px;
}

.device-name {
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 4px;
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 4px;
}

.status-dot.online {
  background: #4caf50;
}

.status-dot.offline {
  background: #9e9e9e;
}

.device-last-reading {
  color: #666;
  font-size: 13px;
  margin-top: 4px;
}
```

---

### **Example 5: Device analytics chart**

```javascript
// Fetch data for multiple devices
async function loadDeviceAnalytics() {
  const res = await fetch("/api/heartrate/history?period=7d&limit=500");
  const { readings } = await res.json();

  // Group by device
  const deviceData = {};
  readings.forEach((r) => {
    const device = r.deviceId || "unknown";
    if (!deviceData[device]) {
      deviceData[device] = [];
    }
    deviceData[device].push({
      time: new Date(r.timestamp),
      bpm: r.heartRate,
    });
  });

  // Create chart for each device
  Object.entries(deviceData).forEach(([deviceId, data]) => {
    renderChart(deviceId, data);
  });
}

function renderChart(deviceId, data) {
  // Using Chart.js or similar
  const ctx = document.getElementById(`chart-${deviceId}`);
  new Chart(ctx, {
    type: "line",
    data: {
      labels: data.map((d) => d.time.toLocaleTimeString()),
      datasets: [
        {
          label: `${deviceId} - Heart Rate`,
          data: data.map((d) => d.bpm),
          borderColor: getDeviceColor(deviceId),
          tension: 0.1,
        },
      ],
    },
  });
}

function getDeviceColor(deviceId) {
  const colors = {
    ESP32_001: "#2196F3",
    ESP32_002: "#4CAF50",
    ESP32_003: "#FF9800",
    unknown: "#9E9E9E",
  };
  return colors[deviceId] || "#9E9E9E";
}
```

---

### **Example 6: Latest reading with device badge**

```html
<div class="latest-reading-card">
  <div class="card-header">
    <h3>Latest Heart Rate</h3>
    <span class="device-badge">📱 ESP32_001</span>
  </div>

  <div class="bpm-display">
    75
    <span class="bpm-unit">BPM</span>
  </div>

  <div class="reading-meta">
    <span>📅 2 minutes ago</span>
    <span>✅ Normal</span>
  </div>

  <div class="ecg-preview">
    <!-- ECG chart here if available -->
  </div>
</div>
```

**JavaScript:**

```javascript
async function loadLatestReading() {
  const res = await fetch("/api/heartrate/latest?userId=xxx");
  const { data } = await res.json();

  // Display device
  document.querySelector(".device-badge").textContent = `📱 ${data.deviceId}`;

  // Display BPM
  document.querySelector(".bpm-display").innerHTML = `
    ${data.heartRate}
    <span class="bpm-unit">BPM</span>
  `;

  // Display time
  const timeAgo = formatTimeAgo(data.createdAt);
  document.querySelector(
    ".reading-meta span:first-child"
  ).textContent = `📅 ${timeAgo}`;

  // Render ECG if available
  if (data.ecg && Array.isArray(data.ecg)) {
    renderECGChart(data.ecg, data.ecgMetadata);
  }
}
```

---

## 🎯 Summary

### **All APIs now return deviceId:**

| API                                 | DeviceId Location     |
| ----------------------------------- | --------------------- |
| `GET /heartrate/latest`             | `data.deviceId`       |
| `GET /heartrate/history`            | `readings[].deviceId` |
| `GET /heartrate/device/:id/latest`  | `data.deviceId`       |
| `GET /heartrate/device/:id/history` | `readings[].deviceId` |

### **Web UI can:**

- ✅ Display device name in tables
- ✅ Filter readings by device
- ✅ Group data by device
- ✅ Show device status (online/offline)
- ✅ Render separate charts per device
- ✅ Color-code by device

---

## 📋 Arduino/ESP32 Setup

Để Arduino gửi deviceId, thêm vào JSON:

```cpp
doc["userId"] = USER_ID;
doc["bpm"] = bpm;
doc["deviceId"] = "ESP32_001";  // ← Add this!
doc["ecg"] = ecgArray;
```

---

🎉 **Web giờ có thể hiển thị device cho mọi reading!**
