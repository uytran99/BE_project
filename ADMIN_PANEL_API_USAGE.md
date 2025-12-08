# Hướng dẫn gọi API từ Web Admin Panel

## Base URL

```
http://localhost:3000/api
```

Hoặc nếu deploy:

```
https://your-domain.com/api
```

## 1. Dashboard API

### GET `/api/dashboard/stats`

Lấy thống kê tổng quan cho dashboard.

**JavaScript/TypeScript Example:**

```javascript
// Sử dụng fetch API
async function getDashboardStats() {
    try {
        const response = await fetch("http://localhost:3000/api/dashboard/stats");
        const result = await response.json();

        if (result.success) {
            console.log("Dashboard Stats:", result.data);
            // result.data chứa:
            // {
            //   totalDevices: 10,
            //   activeDevices: 7,
            //   todayReadings: 1250,
            //   averageHeartRate: 72.5,
            //   abnormalAlerts: 15
            // }
            return result.data;
        } else {
            console.error("Error:", result.message);
        }
    } catch (error) {
        console.error("Fetch error:", error);
    }
}

// Sử dụng axios (nếu có)
import axios from "axios";

async function getDashboardStatsAxios() {
    try {
        const response = await axios.get("http://localhost:3000/api/dashboard/stats");
        if (response.data.success) {
            return response.data.data;
        }
    } catch (error) {
        console.error("Error:", error.response?.data || error.message);
    }
}
```

**React Example:**

```jsx
import { useState, useEffect } from "react";

function Dashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            try {
                const response = await fetch("http://localhost:3000/api/dashboard/stats");
                const result = await response.json();

                if (result.success) {
                    setStats(result.data);
                }
            } catch (error) {
                console.error("Error fetching stats:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchStats();
    }, []);

    if (loading) return <div>Loading...</div>;
    if (!stats) return <div>No data</div>;

    return (
        <div>
            <h2>Dashboard</h2>
            <p>Total Devices: {stats.totalDevices}</p>
            <p>Active Devices: {stats.activeDevices}</p>
            <p>Today Readings: {stats.todayReadings}</p>
            <p>Average Heart Rate: {stats.averageHeartRate} BPM</p>
            <p>Abnormal Alerts: {stats.abnormalAlerts}</p>
        </div>
    );
}
```

---

## 2. Devices API

### GET `/api/devices` - Lấy danh sách tất cả thiết bị

```javascript
async function getAllDevices() {
    try {
        const response = await fetch("http://localhost:3000/api/devices");
        const result = await response.json();

        if (result.success) {
            console.log("Devices:", result.data);
            // result.data là array các device objects
            return result.data;
        }
    } catch (error) {
        console.error("Error:", error);
    }
}
```

### GET `/api/devices/:id` - Lấy chi tiết một thiết bị

```javascript
async function getDeviceById(deviceId) {
    try {
        const response = await fetch(`http://localhost:3000/api/devices/${deviceId}`);
        const result = await response.json();

        if (result.success) {
            return result.data;
        }
    } catch (error) {
        console.error("Error:", error);
    }
}
```

### POST `/api/devices` - Tạo thiết bị mới

```javascript
async function createDevice(deviceData) {
    try {
        const response = await fetch("http://localhost:3000/api/devices", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                deviceId: "DEV002",
                name: "IoT Device 2",
                status: "offline",
            }),
        });

        const result = await response.json();

        if (result.success) {
            console.log("Device created:", result.data);
            return result.data;
        } else {
            console.error("Error:", result.message);
        }
    } catch (error) {
        console.error("Error:", error);
    }
}
```

### PUT `/api/devices/:id` - Cập nhật thiết bị

```javascript
async function updateDevice(deviceId, updateData) {
    try {
        const response = await fetch(`http://localhost:3000/api/devices/${deviceId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name: "Updated Device Name",
                status: "online",
            }),
        });

        const result = await response.json();

        if (result.success) {
            console.log("Device updated:", result.data);
            return result.data;
        }
    } catch (error) {
        console.error("Error:", error);
    }
}
```

### DELETE `/api/devices/:id` - Xóa thiết bị

```javascript
async function deleteDevice(deviceId) {
    try {
        const response = await fetch(`http://localhost:3000/api/devices/${deviceId}`, {
            method: "DELETE",
        });

        const result = await response.json();

        if (result.success) {
            console.log("Device deleted");
            return true;
        }
    } catch (error) {
        console.error("Error:", error);
    }
}
```

---

## 3. Heart Rate Data API

### GET `/api/heart-rate` - Lấy danh sách với filters và pagination

```javascript
async function getHeartRateData(filters = {}) {
    try {
        // Build query string từ filters
        const params = new URLSearchParams();

        if (filters.deviceId) params.append("deviceId", filters.deviceId);
        if (filters.startDate) params.append("startDate", filters.startDate);
        if (filters.endDate) params.append("endDate", filters.endDate);
        if (filters.minHeartRate) params.append("minHeartRate", filters.minHeartRate);
        if (filters.maxHeartRate) params.append("maxHeartRate", filters.maxHeartRate);
        if (filters.status) params.append("status", filters.status); // 'normal' hoặc 'abnormal'
        if (filters.page) params.append("page", filters.page);
        if (filters.limit) params.append("limit", filters.limit);

        const url = `http://localhost:3000/api/heart-rate?${params.toString()}`;
        const response = await fetch(url);
        const result = await response.json();

        if (result.success) {
            console.log("Heart Rate Data:", result.data);
            // result.data chứa:
            // {
            //   data: [...], // array of records
            //   total: 1250,
            //   page: 1,
            //   limit: 10
            // }
            return result.data;
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

// Ví dụ sử dụng:
getHeartRateData({
    deviceId: "DEV001",
    startDate: "2024-01-15T00:00:00.000Z",
    endDate: "2024-01-15T23:59:59.999Z",
    status: "abnormal",
    page: 1,
    limit: 10,
});
```

### GET `/api/heart-rate/:id` - Lấy chi tiết một record

```javascript
async function getHeartRateById(recordId) {
    try {
        const response = await fetch(`http://localhost:3000/api/heart-rate/${recordId}`);
        const result = await response.json();

        if (result.success) {
            return result.data;
        }
    } catch (error) {
        console.error("Error:", error);
    }
}
```

### DELETE `/api/heart-rate/:id` - Xóa một record

```javascript
async function deleteHeartRate(recordId) {
    try {
        const response = await fetch(`http://localhost:3000/api/heart-rate/${recordId}`, {
            method: "DELETE",
        });

        const result = await response.json();

        if (result.success) {
            console.log("Record deleted");
            return true;
        }
    } catch (error) {
        console.error("Error:", error);
    }
}
```

---

## React Component Example (Complete)

```jsx
import { useState, useEffect } from "react";

const API_BASE_URL = "http://localhost:3000/api";

function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [devices, setDevices] = useState([]);
    const [heartRateData, setHeartRateData] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch dashboard stats
    useEffect(() => {
        async function fetchStats() {
            try {
                const response = await fetch(`${API_BASE_URL}/dashboard/stats`);
                const result = await response.json();
                if (result.success) {
                    setStats(result.data);
                }
            } catch (error) {
                console.error("Error fetching stats:", error);
            }
        }
        fetchStats();
    }, []);

    // Fetch devices
    useEffect(() => {
        async function fetchDevices() {
            try {
                const response = await fetch(`${API_BASE_URL}/devices`);
                const result = await response.json();
                if (result.success) {
                    setDevices(result.data);
                }
            } catch (error) {
                console.error("Error fetching devices:", error);
            }
        }
        fetchDevices();
    }, []);

    // Fetch heart rate data with filters
    const fetchHeartRateData = async (filters = {}) => {
        try {
            const params = new URLSearchParams();
            Object.keys(filters).forEach((key) => {
                if (filters[key]) params.append(key, filters[key]);
            });

            const response = await fetch(`${API_BASE_URL}/heart-rate?${params.toString()}`);
            const result = await response.json();

            if (result.success) {
                setHeartRateData(result.data);
            }
        } catch (error) {
            console.error("Error fetching heart rate data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHeartRateData({ page: 1, limit: 10 });
    }, []);

    if (loading) return <div>Loading...</div>;

    return (
        <div>
            <h1>Admin Dashboard</h1>

            {/* Stats Section */}
            {stats && (
                <div>
                    <h2>Statistics</h2>
                    <p>Total Devices: {stats.totalDevices}</p>
                    <p>Active Devices: {stats.activeDevices}</p>
                    <p>Today Readings: {stats.todayReadings}</p>
                    <p>Average Heart Rate: {stats.averageHeartRate} BPM</p>
                    <p>Abnormal Alerts: {stats.abnormalAlerts}</p>
                </div>
            )}

            {/* Devices Section */}
            <div>
                <h2>Devices</h2>
                <ul>
                    {devices.map((device) => (
                        <li key={device._id}>
                            {device.name} - {device.status}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Heart Rate Data Section */}
            <div>
                <h2>Heart Rate Data</h2>
                {heartRateData.data && (
                    <>
                        <p>Total: {heartRateData.total} records</p>
                        <table>
                            <thead>
                                <tr>
                                    <th>Device ID</th>
                                    <th>Heart Rate</th>
                                    <th>Status</th>
                                    <th>Timestamp</th>
                                </tr>
                            </thead>
                            <tbody>
                                {heartRateData.data.map((record) => (
                                    <tr key={record._id}>
                                        <td>{record.deviceId || "N/A"}</td>
                                        <td>{record.heartRate} BPM</td>
                                        <td>{record.status}</td>
                                        <td>{new Date(record.timestamp).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                )}
            </div>
        </div>
    );
}

export default AdminDashboard;
```

---

## Error Handling

Tất cả API đều trả về format nhất quán:

**Success:**

```json
{
  "success": true,
  "data": {...},
  "message": "Optional message"
}
```

**Error:**

```json
{
    "success": false,
    "message": "Error message",
    "error": "Error details (optional)"
}
```

**JavaScript Error Handling:**

```javascript
async function safeApiCall(url, options = {}) {
    try {
        const response = await fetch(url, options);
        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || "API call failed");
        }

        return result.data;
    } catch (error) {
        console.error("API Error:", error);
        // Handle error (show toast, log, etc.)
        throw error;
    }
}

// Sử dụng:
try {
    const stats = await safeApiCall("http://localhost:3000/api/dashboard/stats");
    console.log("Stats:", stats);
} catch (error) {
    // Error đã được handle trong safeApiCall
}
```

---

## CORS

Backend đã enable CORS, nên bạn có thể gọi từ bất kỳ domain nào. Nếu cần restrict, có thể cấu hình trong `src/server.js`:

```javascript
app.use(
    cors({
        origin: "http://localhost:3001", // Chỉ cho phép từ domain này
        credentials: true,
    })
);
```

---

## Notes

1. **Base URL**: Thay `http://localhost:3000` bằng URL thực tế của server khi deploy
2. **Date Format**: Sử dụng ISO 8601 format cho dates: `YYYY-MM-DDTHH:mm:ss.sssZ`
3. **Pagination**: Mặc định `page=1`, `limit=10` nếu không có query params
4. **Status Mapping**:
    - Heart rate status trong response: `'normal'` hoặc `'abnormal'`
    - Device status: `'online'` hoặc `'offline'`
