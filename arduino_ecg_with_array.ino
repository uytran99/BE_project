#include <Wire.h>
#include <TinyGPSPlus.h>
#include "I2Cdev.h"
#include "MPU6050.h"
#include <math.h>

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ================== API CONFIG ==================
const char* SERVER_URL =
  "https://heart-rate-api-production.up.railway.app/api/heartrate/arduino/test";

const char* USER_ID = "69370f5851faa2087fb26fb8";

// ================== WiFi CONFIG ==================
const char* WIFI_SSID = "iphone";
const char* WIFI_PASS = "12345678";
const unsigned long WIFI_CONNECT_TIMEOUT_MS = 20000UL;

// ================== PINS & HARDWARE ==================
const int pinECG = 32;    // ECG analog input
const int ledPin = 2;     // LED debug nhịp
HardwareSerial GPSserial(2);
const int gpsRX = 16;     // GPS TX -> ESP32 RX2
const int gpsTX = 17;     // GPS RX -> ESP32 TX2

TinyGPSPlus gps;
MPU6050 mpu;

// ================== ECG SETTINGS ==================
#define PLOT_DEBUG 0
const bool invertECG = false;

const int ECG_SAMPLE_RATE = 250;
const unsigned long ecgIntervalMicros = 1000000UL / ECG_SAMPLE_RATE;

// ========== ECG BUFFER FOR CHART (NEW) ==========
#define ECG_BUFFER_SIZE 500  // 2 seconds at 250 Hz
float ecgBuffer[ECG_BUFFER_SIZE];
int ecgBufferIndex = 0;
bool ecgBufferFull = false;
unsigned long lastECGBufferReset = 0;

// ECG filter / adaptive threshold
int   ecgQ[3]      = {0};
int   qi           = 0;
float baseSlow     = 2000.0f;
float ecgMean      = 0.0f;
float ecgAbsDev    = 50.0f;
float alphaSlow    = 0.002f;
float ecgAlpha     = 0.01f;
float ecgAbsAlpha  = 0.05f;
float kThresh      = 2.4f;
const int THRESH_FLOOR  = 30;
const int PROMINENCE    = 30;

// Peak detection
bool   seekPeak     = false;
int    peakVal      = 0;
unsigned long peakTime    = 0;
unsigned long seekStart   = 0;
unsigned long lastRPeak   = 0;
float  bpm         = 0.0f;

// RR-interval buffer
#define RR_BUF 8
unsigned long rrBuf[RR_BUF] = {0};
int rrIdx = 0;
unsigned long minRR = 300;
unsigned long maxRR = 2000;

// 1-MINUTE BPM BUFFER
#define BPM_MINUTE_BUF 300
float bpmMinuteBuf[BPM_MINUTE_BUF];
int   bpmBufIndex   = 0;
unsigned long lastMinuteSend = 0;

// DEBUG ECG 5s
unsigned long lastECGDebug = 0;
int debugRaw = 0;
int debugX   = 0;

// ACCEL / FALL
float lastAx = 0.0f, lastAy = 0.0f, lastAz = 0.0f;
float magEma = 1.0f;
const float magAlpha = 0.2f;

// Signal quality assessment
String assessSignalQuality(float* buffer, int size) {
  if (size < 50) return "poor";
  
  // Calculate standard deviation
  float sum = 0.0f;
  for (int i = 0; i < size; i++) {
    sum += buffer[i];
  }
  float mean = sum / size;
  
  float variance = 0.0f;
  for (int i = 0; i < size; i++) {
    float diff = buffer[i] - mean;
    variance += diff * diff;
  }
  variance /= size;
  float stdDev = sqrt(variance);
  
  // Simple quality heuristic based on signal variability
  if (stdDev < 10.0f) return "poor";      // Too flat - poor contact
  if (stdDev < 30.0f) return "fair";      // Low variability
  if (stdDev < 80.0f) return "good";      // Normal ECG
  return "excellent";                      // Strong signal
}

// ================== HELPER FUNCTIONS ==================
void logECG5s(float bpmVal, int rawAdc, int x, int dynThresh) {
  Serial.println("------ ECG 5s DEBUG ------");
  Serial.printf("Raw ADC: %d\n", rawAdc);
  Serial.printf("Filtered x: %d\n", x);
  Serial.printf("DynThresh: %d\n", dynThresh);
  Serial.printf("Instant BPM: %.1f\n", bpmVal);
  Serial.printf("ECG Buffer: %d/%d samples\n", ecgBufferIndex, ECG_BUFFER_SIZE);
  Serial.println("---------------------------\n");
}

int smoothReadECG() {
  ecgQ[qi % 3] = analogRead(pinECG);
  qi++;
  long s = ecgQ[0] + ecgQ[1] + ecgQ[2];
  return (int)(s / 3);
}

float bpmFromRRMedian() {
  unsigned long tmp[RR_BUF];
  int n = 0;

  for (int i = 0; i < RR_BUF; i++) {
    if (rrBuf[i] >= minRR && rrBuf[i] <= maxRR) {
      tmp[n++] = rrBuf[i];
    }
  }
  if (n == 0) return 0.0f;

  for (int i = 0; i < n - 1; i++) {
    for (int j = i + 1; j < n; j++) {
      if (tmp[j] < tmp[i]) {
        unsigned long t = tmp[i];
        tmp[i] = tmp[j];
        tmp[j] = t;
      }
    }
  }

  float rrMed = (n % 2 == 1)
                  ? (float)tmp[n / 2]
                  : 0.5f * (tmp[n / 2 - 1] + tmp[n / 2]);
  return rrMed > 0 ? 60000.0f / rrMed : 0.0f;
}

unsigned long dynamicRefractory(float bpmEst) {
  float rrEst = (bpmEst > 0 ? (60000.0f / bpmEst) : 800.0f);
  float refMs = 220.0f + 0.3f * rrEst;
  if (refMs < 180.0f) refMs = 180.0f;
  if (refMs > 380.0f) refMs = 380.0f;
  return (unsigned long)refMs;
}

// ================== WiFi ==================
void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.printf("WiFi: connecting to '%s'...\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - start) < WIFI_CONNECT_TIMEOUT_MS) {
    Serial.print(".");
    delay(300);
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("WiFi connected, IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("WiFi connect FAILED");
  }
}

// ================== HTTP SEND WITH ECG ARRAY ==================
void sendToServer(float bpmFinal,
                  float ax, float ay, float az,
                  float magFilt) {

  Serial.println("========== GỬI DỮ LIỆU 1 PHÚT ==========");
  Serial.printf("BPM gửi: %.1f\n", bpmFinal);

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] Không có WiFi → bỏ gửi");
    return;
  }

  // ============ TÍNH DUNG LƯỢNG JSON ============
  // Base: ~200 bytes
  // ECG array: 500 samples × 6 bytes/float = ~3000 bytes
  // Total: ~3500 bytes → cần DynamicJsonDocument
  
  const int ECG_SAMPLES_TO_SEND = min(ecgBufferIndex, ECG_BUFFER_SIZE);
  const bool sendECGArray = (ECG_SAMPLES_TO_SEND >= 100); // Chỉ gửi nếu có ít nhất 100 samples
  
  int jsonCapacity = 512;  // Base capacity
  if (sendECGArray) {
    jsonCapacity = 4096;   // Larger capacity for ECG array
  }
  
  DynamicJsonDocument doc(jsonCapacity);

  doc["userId"] = USER_ID;
  doc["bpm"]    = bpmFinal;
  doc["fallen"] = false;
  doc["mag_ema"] = magFilt;

  JsonObject accel = doc.createNestedObject("accel");
  accel["ax"] = ax;
  accel["ay"] = ay;
  accel["az"] = az;

  // ============ THÊM ECG ARRAY (NEW) ============
  if (sendECGArray) {
    Serial.printf("Đang thêm %d ECG samples vào JSON...\n", ECG_SAMPLES_TO_SEND);
    
    JsonArray ecgArray = doc.createNestedArray("ecg");
    
    // Downsample nếu quá nhiều (để giảm dung lượng)
    int step = 1;
    if (ECG_SAMPLES_TO_SEND > 300) {
      step = 2;  // Lấy mỗi sample thứ 2 → 250 samples
    }
    
    int actualSamples = 0;
    for (int i = 0; i < ECG_SAMPLES_TO_SEND; i += step) {
      ecgArray.add(ecgBuffer[i]);
      actualSamples++;
    }
    
    // Thêm ECG metadata
    JsonObject metadata = doc.createNestedObject("ecgMetadata");
    metadata["samplingRate"] = (step == 1) ? ECG_SAMPLE_RATE : (ECG_SAMPLE_RATE / step);
    metadata["duration"] = (float)actualSamples / metadata["samplingRate"].as<int>();
    metadata["unit"] = "mV";
    metadata["quality"] = assessSignalQuality(ecgBuffer, ECG_SAMPLES_TO_SEND);
    
    Serial.printf("✅ ECG array: %d samples, %.2fs, quality: %s\n", 
                  actualSamples, 
                  metadata["duration"].as<float>(),
                  metadata["quality"].as<const char*>());
  } else {
    Serial.printf("⚠️ Chưa đủ ECG samples (%d/%d) → không gửi array\n", 
                  ECG_SAMPLES_TO_SEND, 100);
  }

  // GPS (optional)
  if (gps.location.isValid()) {
    JsonObject g = doc.createNestedObject("gps");
    g["lat"] = gps.location.lat();
    g["lon"] = gps.location.lng();
  }

  doc["millis"] = millis();

  // Serialize JSON
  String payload;
  serializeJson(doc, payload);
  
  Serial.printf("JSON size: %d bytes\n", payload.length());

  // HTTP POST
  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(15000);  // 15s timeout for large payloads

  int httpCode = http.POST(payload);

  if (httpCode > 0) {
    Serial.printf("[HTTP] ✅ Gửi thành công (code=%d)\n", httpCode);
    String resp = http.getString();
    Serial.printf("Response: %s\n", resp.c_str());
  } else {
    Serial.printf("[HTTP] ❌ Lỗi: %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
  
  // Reset ECG buffer sau khi gửi
  ecgBufferIndex = 0;
  ecgBufferFull = false;
  lastECGBufferReset = millis();
}

// ================== SETUP ==================
void setup() {
  Serial.begin(115200);
  pinMode(ledPin, OUTPUT);
  digitalWrite(ledPin, LOW);

  // GPS
  GPSserial.begin(9600, SERIAL_8N1, gpsRX, gpsTX);

  // I2C & MPU6050
  Wire.begin(21, 22);
  delay(100);
  mpu.initialize();

  // ADC cho ECG
  analogReadResolution(12);
#ifdef analogSetPinAttenuation
  analogSetPinAttenuation(pinECG, ADC_11db);
#endif

  // WiFi
  connectWiFi();

  // Initialize ECG buffer
  for (int i = 0; i < ECG_BUFFER_SIZE; i++) {
    ecgBuffer[i] = 0.0f;
  }

  Serial.println("=== ESP32 ECG SYSTEM WITH ARRAY READY ===");
  Serial.printf("ECG Buffer Size: %d samples (%.1f seconds at %d Hz)\n", 
                ECG_BUFFER_SIZE, 
                (float)ECG_BUFFER_SIZE / ECG_SAMPLE_RATE,
                ECG_SAMPLE_RATE);
}

// ================== LOOP ==================
void loop() {
  // 1) GPS feed
  while (GPSserial.available()) {
    gps.encode(GPSserial.read());
  }

  // 2) ECG sampling & R-peak detection
  static unsigned long lastMicros = micros();
  if (micros() - lastMicros >= ecgIntervalMicros) {
    lastMicros = micros();

    int rawAdc = smoothReadECG();
    baseSlow = (1.0f - alphaSlow) * baseSlow + alphaSlow * rawAdc;
    int x = rawAdc - (int)baseSlow;
    if (invertECG) x = -x;

    debugRaw = rawAdc;
    debugX   = x;

    // ============ LƯU VÀO ECG BUFFER (NEW) ============
    if (ecgBufferIndex < ECG_BUFFER_SIZE) {
      // Convert ADC value to mV (approximate for ESP32)
      // ADC range: 0-4095 → 0-3.3V
      // ECG typical range after processing: normalize to reasonable mV scale
      float ecgValue = x * (3.3f / 4095.0f) * 100.0f;  // Scale to ~mV range
      
      ecgBuffer[ecgBufferIndex++] = ecgValue;
      
      if (ecgBufferIndex >= ECG_BUFFER_SIZE) {
        ecgBufferFull = true;
      }
    }

    ecgMean   = (1.0f - ecgAlpha)    * ecgMean   + ecgAlpha    * x;
    ecgAbsDev = (1.0f - ecgAbsAlpha) * ecgAbsDev + ecgAbsAlpha * fabsf(x - ecgMean);

    int dynThresh = (int)(ecgMean + kThresh * ecgAbsDev);
    if (dynThresh < (int)ecgMean + THRESH_FLOOR) {
      dynThresh = (int)ecgMean + THRESH_FLOOR;
    }

    static int prevX = 0;
    int deriv = x - prevX;
    prevX = x;

    unsigned long now = millis();
    unsigned long dynRef = dynamicRefractory(bpm);

    // Bắt đầu tìm R-peak
    if (!seekPeak && x > dynThresh && deriv > 0 && (now - lastRPeak) > dynRef) {
      seekPeak  = true;
      seekStart = now;
      peakVal   = x;
      peakTime  = now;
    }

    if (seekPeak) {
      if (x > peakVal) {
        peakVal  = x;
        peakTime = now;
      }

      if ((now - seekStart) >= 80 || deriv < 0) {
        seekPeak = false;

        if ((peakVal - (int)ecgMean) >= PROMINENCE) {
          if (lastRPeak != 0) {
            unsigned long rr = peakTime - lastRPeak;
            if (rr >= minRR && rr <= maxRR) {
              rrBuf[rrIdx++ % RR_BUF] = rr;
              float bpmMed = bpmFromRRMedian();
              if (bpmMed > 0) {
                bpm = bpmMed;
                if (bpm > 30 && bpm < 200 && bpmBufIndex < BPM_MINUTE_BUF) {
                  bpmMinuteBuf[bpmBufIndex++] = bpm;
                }
              }
            }
          }
          lastRPeak = peakTime;
          digitalWrite(ledPin, HIGH);
        } else {
          digitalWrite(ledPin, LOW);
        }
      }
    }
  }

  // 3) MPU6050 accel + magEma
  int16_t axRaw, ayRaw, azRaw;
  mpu.getAcceleration(&axRaw, &ayRaw, &azRaw);
  lastAx = axRaw / 16384.0f;
  lastAy = ayRaw / 16384.0f;
  lastAz = azRaw / 16384.0f;
  float mag = sqrtf(lastAx * lastAx + lastAy * lastAy + lastAz * lastAz);
  magEma = (1.0f - magAlpha) * magEma + magAlpha * mag;

  // 4) Debug ECG mỗi 5s
  if (millis() - lastECGDebug >= 5000UL) {
    lastECGDebug = millis();
    int dynT = (int)(ecgMean + kThresh * ecgAbsDev);
    logECG5s(bpm, debugRaw, debugX, dynT);
  }

  // 5) Mỗi 60s gửi BPM + ECG array
  if (millis() - lastMinuteSend >= 60000UL) {
    lastMinuteSend = millis();

    float bpmFinal = 0.0f;
   
    int n = bpmBufIndex;
    if (n > BPM_MINUTE_BUF) n = BPM_MINUTE_BUF;

    float tmp[BPM_MINUTE_BUF];
    for (int i = 0; i < n; i++) tmp[i] = bpmMinuteBuf[i];

    // sort
    for (int i = 0; i < n - 1; i++) {
      for (int j = i + 1; j < n; j++) {
        if (tmp[j] < tmp[i]) {
          float t = tmp[i]; tmp[i] = tmp[j]; tmp[j] = t;
        }
      }
    }

    bpmFinal = (n % 2 == 1)
                 ? tmp[n / 2]
                 : 0.5f * (tmp[n / 2 - 1] + tmp[n / 2]);
    Serial.printf("BPM median 1 phút: %.1f\n", bpmFinal);
    
    // reset buffer cho phút tiếp theo
    bpmBufIndex = 0;

    // Gửi lên server (bao gồm ECG array)
    sendToServer(bpmFinal, lastAx, lastAy, lastAz, magEma);
  }

  // 6) Reconnect WiFi nếu rớt
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  delay(1);
}
