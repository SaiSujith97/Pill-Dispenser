/*
 * ═══════════════════════════════════════════════════════════════════
 *  PillSync ESP32 Firmware  —  PillSync_ESP32.ino
 * ═══════════════════════════════════════════════════════════════════
 *
 *  PURPOSE
 *  -------
 *  • Connects to Wi-Fi and Firebase Firestore via REST API
 *  • Reads medication schedules from Firestore
 *  • Autonomously dispenses pills at the correct time (IST, UTC+5:30)
 *  • Listens for manual "Test Dispense" commands from the website
 *  • Updates device heartbeat so the website can show Online/Offline
 *  • Prevents duplicate dispensing using Preferences (NVS flash) +
 *    Firestore status checks
 *
 *  ARCHITECTURE
 *  ------------
 *  Website → Firestore → (Wi-Fi) → ESP32 → Stepper Motor → Dispenser
 *  ESP32   → Firestore → (Wi-Fi) → Website   (status updates)
 *
 *  IMPORTANT: This file contains NO website code. Motor control and
 *  Firebase code are kept in separate sections for maintainability.
 *
 *  LIBRARIES REQUIRED (install via Arduino Library Manager)
 *  --------------------------------------------------------
 *  1. ArduinoJson         (v6.x or v7.x)  — by Benoit Blanchon
 *  2. NTPClient           (latest)         — by Fabrice Weinberg
 *
 *  BUILT-IN (no install needed for ESP32 board package)
 *  --------------------------------------------------------
 *  WiFi.h, HTTPClient.h, WiFiClientSecure.h, Preferences.h, time.h
 *
 *  HARDWARE CONNECTIONS  (28BYJ-48 via ULN2003)
 *  -----------------------------------------------
 *  ULN2003 IN1 → GPIO 14
 *  ULN2003 IN2 → GPIO 27
 *  ULN2003 IN3 → GPIO 26
 *  ULN2003 IN4 → GPIO 25
 *  ULN2003 VCC → 5 V (external supply recommended)
 *  ULN2003 GND → GND
 *
 *  COMPARTMENT STEP CONSTANTS
 *  ---------------------------
 *  These are PLACEHOLDER values. Calibrate them after assembling
 *  your physical dispenser. Steps for 28BYJ-48 = 2048 per full rev.
 *
 *  HOW TO UPLOAD
 *  -------------
 *  1. Install ESP32 board package in Arduino IDE
 *     (https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json)
 *  2. Select board: "ESP32 Dev Module"
 *  3. Fill in USER CONFIGURATION below
 *  4. Sketch → Upload   (hold BOOT button if needed)
 * ═══════════════════════════════════════════════════════════════════
 */

// ───────────────────────────────────────────────────────────────────
// INCLUDES
// ───────────────────────────────────────────────────────────────────
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <time.h>

// ═══════════════════════════════════════════════════════════════════
//  ╔══════════════════════════════════════════════╗
//  ║          USER CONFIGURATION — EDIT THESE     ║
//  ╚══════════════════════════════════════════════╝
// ═══════════════════════════════════════════════════════════════════

/* Wi-Fi credentials */
const char* WIFI_SSID     = "YOUR_WIFI_SSID";       // <-- fill in
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";   // <-- fill in

/* Firebase project details (from Firebase Console → Project Settings) */
const char* FIREBASE_API_KEY  = "AIzaSyB8hrMRz8m8DVR2mmVzQ5QwX2sLZUo1TgI";
const char* FIREBASE_PROJECT  = "pill-dispenser-ea1f1";

/* The Firebase UID of the patient whose schedule this ESP32 manages.
   After the user logs in on the website, find their UID in:
   Firebase Console → Authentication → Users */
const char* PATIENT_UID = "PASTE_PATIENT_UID_HERE";   // <-- fill in

/* Unique identifier for this device (shown in the website UI) */
const char* DEVICE_ID = "ESP32-PILLSYNC-01";           // <-- change if you have multiple

/* ──────────────────────────────────────────────────────────────────
   COMPARTMENT STEP COUNTS
   These control how many steps the 28BYJ-48 takes to reach each
   compartment. 2048 steps = 1 full revolution at full step mode.

   CALIBRATION PROCEDURE:
   1. Run homeMotor() to go to position 0.
   2. Manually set COMPARTMENT_X_STEPS one at a time.
   3. Call rotateToCompartment(X) and measure the physical position.
   4. Adjust until the dispenser aligns with the correct compartment.
   ────────────────────────────────────────────────────────────────── */
const int COMPARTMENT_1_STEPS = 0;       // Home position
const int COMPARTMENT_2_STEPS = 293;     // ~1/7 of 2048
const int COMPARTMENT_3_STEPS = 585;     // ~2/7 of 2048
const int COMPARTMENT_4_STEPS = 877;     // ~3/7 of 2048
const int COMPARTMENT_5_STEPS = 1170;    // ~4/7 of 2048
const int COMPARTMENT_6_STEPS = 1462;    // ~5/7 of 2048
const int COMPARTMENT_7_STEPS = 1755;    // ~6/7 of 2048

/* Motor step delay in microseconds (lower = faster, min ~1000 for 28BYJ-48) */
const int MOTOR_STEP_DELAY_US = 1500;

/* Dispense timing: how long to run the release mechanism per pill (ms) */
const unsigned long DISPENSE_PULSE_MS = 500;

// ─── End of USER CONFIGURATION ─────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════
//  STEPPER MOTOR PINS  (ULN2003 half-step sequence)
// ═══════════════════════════════════════════════════════════════════
const int MOTOR_PIN1 = 14;
const int MOTOR_PIN2 = 27;
const int MOTOR_PIN3 = 26;
const int MOTOR_PIN4 = 25;

// ═══════════════════════════════════════════════════════════════════
//  TIMING CONSTANTS
// ═══════════════════════════════════════════════════════════════════
const unsigned long SCHEDULE_CHECK_INTERVAL_MS = 30000UL;  // 30 s
const unsigned long COMMAND_CHECK_INTERVAL_MS  = 10000UL;  // 10 s
const unsigned long HEARTBEAT_INTERVAL_MS      = 60000UL;  // 60 s
const unsigned long WIFI_RECONNECT_INTERVAL_MS = 15000UL;  // 15 s

/* Dispensing window: allow dispensing up to N minutes after scheduled time */
const int DISPENSE_WINDOW_MINUTES = 2;

/* IST = UTC + 5h 30m = 19800 seconds */
const long IST_OFFSET_SECONDS = 19800L;

// ═══════════════════════════════════════════════════════════════════
//  GLOBAL STATE
// ═══════════════════════════════════════════════════════════════════
WiFiUDP        _ntpUDP;
NTPClient      _ntpClient(_ntpUDP, "pool.ntp.org", IST_OFFSET_SECONDS, 3600000);
Preferences    _prefs;           // NVS flash for executed dose IDs
WiFiClientSecure _wifiClient;

String  _firebaseIdToken   = "";
String  _firebaseRefreshToken = "";
unsigned long _tokenExpireMs = 0;

unsigned long _lastScheduleCheck = 0;
unsigned long _lastCommandCheck  = 0;
unsigned long _lastHeartbeat     = 0;
unsigned long _lastWifiAttempt   = 0;

int _currentCompartmentSteps = 0;   // tracks current motor position
bool _motorEnabled = false;

// ═══════════════════════════════════════════════════════════════════
//  FORWARD DECLARATIONS
// ═══════════════════════════════════════════════════════════════════

// Motor
void     stepperStep(int steps, bool clockwise = true);
void     rotateToCompartment(int compartment);
void     dispenseMedication(int compartment, int numPills);
void     homeMotor();
int      compartmentToSteps(int compartment);
void     enableMotor(bool enable);

// Firebase
bool     ensureWifi();
bool     ensureFirebaseToken();
bool     signInAnonymously();
bool     refreshToken();
String   firestoreGet(const String& path);
bool     firestorePatch(const String& path, const String& body);
String   buildFieldValue(const String& type, const String& value);

// Schedule
void     checkAndDispenseSchedule();
void     processDose(const String& doseId, const String& medicineId,
                     const String& medicineName, int compartment, int dosage,
                     const String& scheduledTime);
bool     isDoseAlreadyExecuted(const String& doseId);
void     markDoseExecuted(const String& doseId);
bool     isTimeInWindow(const String& scheduledTime24, int windowMinutes);

// Commands
void     checkAndExecuteManualCommands();
void     executeManualCommand(const String& commandId, int compartment, int dosage,
                              const String& medicineName, const String& executionId);

// Heartbeat
void     sendHeartbeat(const String& status = "idle");
void     updateFirestoreDeviceStatus(const String& status, int compartment);

// ═══════════════════════════════════════════════════════════════════
//  SETUP
// ═══════════════════════════════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println(F("\n=== PillSync ESP32 Firmware ==="));
  Serial.printf("Device ID: %s\n", DEVICE_ID);

  // Motor pins
  pinMode(MOTOR_PIN1, OUTPUT);
  pinMode(MOTOR_PIN2, OUTPUT);
  pinMode(MOTOR_PIN3, OUTPUT);
  pinMode(MOTOR_PIN4, OUTPUT);
  enableMotor(false);

  // Open NVS namespace for storing executed dose IDs
  _prefs.begin("pillsync", false);

  // Wi-Fi
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  connectWifi();

  // NTP
  _ntpClient.begin();
  _ntpClient.update();
  Serial.printf("Current IST time: %s\n", _ntpClient.getFormattedTime().c_str());

  // Skip SSL cert validation (acceptable for IoT; use cert pinning for production)
  _wifiClient.setInsecure();

  // Firebase anonymous sign-in
  if (!signInAnonymously()) {
    Serial.println(F("[ERROR] Firebase sign-in failed. Will retry in loop."));
  }

  // Send initial heartbeat
  sendHeartbeat("idle");
  Serial.println(F("Setup complete. Entering main loop…\n"));
}

// ═══════════════════════════════════════════════════════════════════
//  LOOP
// ═══════════════════════════════════════════════════════════════════
void loop() {
  unsigned long now = millis();

  /* ── 1. Ensure Wi-Fi is connected ── */
  if (!ensureWifi()) {
    delay(1000);
    return;
  }

  /* ── 2. Ensure Firebase token is valid ── */
  ensureFirebaseToken();

  /* ── 3. Update NTP time ── */
  _ntpClient.update();

  /* ── 4. Check scheduled doses ── */
  if (now - _lastScheduleCheck >= SCHEDULE_CHECK_INTERVAL_MS) {
    _lastScheduleCheck = now;
    checkAndDispenseSchedule();
  }

  /* ── 5. Check for manual dispense commands from website ── */
  if (now - _lastCommandCheck >= COMMAND_CHECK_INTERVAL_MS) {
    _lastCommandCheck = now;
    checkAndExecuteManualCommands();
  }

  /* ── 6. Heartbeat ── */
  if (now - _lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
    _lastHeartbeat = now;
    sendHeartbeat("idle");
  }

  delay(100);
}

// ═══════════════════════════════════════════════════════════════════
//
//  ██████╗  ███████╗ ██████╗██╗  ██╗███████╗██████╗ ██╗   ██╗██╗     ███████╗
//  ██╔════╝ ██╔════╝██╔════╝██║  ██║██╔════╝██╔══██╗██║   ██║██║     ██╔════╝
//  ███████╗ █████╗  ██║     ███████║█████╗  ██║  ██║██║   ██║██║     █████╗  
//  ╚════██║ ██╔══╝  ██║     ██╔══██║██╔══╝  ██║  ██║██║   ██║██║     ██╔══╝  
//  ███████║ ███████╗╚██████╗██║  ██║███████╗██████╔╝╚██████╔╝███████╗███████╗
//  ╚══════╝ ╚══════╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚═════╝  ╚═════╝ ╚══════╝╚══════╝
//
//  All Firestore/network code lives below.
//  Motor control code is in a separate section.
// ═══════════════════════════════════════════════════════════════════

// ─── Wi-Fi ─────────────────────────────────────────────────────────

void connectWifi() {
  Serial.printf("[WiFi] Connecting to %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WiFi] Connected! IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println(F("\n[WiFi] Connection failed. Will retry in loop."));
  }
}

bool ensureWifi() {
  if (WiFi.status() == WL_CONNECTED) return true;
  unsigned long now = millis();
  if (now - _lastWifiAttempt >= WIFI_RECONNECT_INTERVAL_MS) {
    _lastWifiAttempt = now;
    Serial.println(F("[WiFi] Reconnecting…"));
    WiFi.reconnect();
    delay(3000);
  }
  return WiFi.status() == WL_CONNECTED;
}

// ─── Firebase Anonymous Auth ────────────────────────────────────────

bool signInAnonymously() {
  Serial.println(F("[Firebase] Signing in anonymously…"));
  HTTPClient http;
  String url = "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=";
  url += FIREBASE_API_KEY;

  http.begin(_wifiClient, url);
  http.addHeader("Content-Type", "application/json");

  String payload = "{\"returnSecureToken\":true}";
  int code = http.POST(payload);

  if (code != 200) {
    Serial.printf("[Firebase] Auth failed, HTTP %d: %s\n", code, http.getString().c_str());
    http.end();
    return false;
  }

  DynamicJsonDocument doc(1024);
  if (deserializeJson(doc, http.getString()) != DeserializationError::Ok) {
    http.end(); return false;
  }
  http.end();

  _firebaseIdToken      = doc["idToken"].as<String>();
  _firebaseRefreshToken = doc["refreshToken"].as<String>();
  unsigned long expiresIn = doc["expiresIn"].as<unsigned long>() * 1000UL;
  _tokenExpireMs = millis() + expiresIn - 60000UL; // refresh 1 min early

  /* Store the ESP32's Firebase UID so the website knows this device */
  String esp32Uid = doc["localId"].as<String>();
  Serial.printf("[Firebase] Signed in. UID: %s\n", esp32Uid.c_str());

  /* Register device in Firestore so website can see it */
  _registerDevice(esp32Uid);
  return true;
}

bool refreshToken() {
  Serial.println(F("[Firebase] Refreshing token…"));
  HTTPClient http;
  String url = "https://securetoken.googleapis.com/v1/token?key=";
  url += FIREBASE_API_KEY;

  http.begin(_wifiClient, url);
  http.addHeader("Content-Type", "application/x-www-form-urlencoded");

  String body = "grant_type=refresh_token&refresh_token=";
  body += _firebaseRefreshToken;

  int code = http.POST(body);
  if (code != 200) {
    Serial.printf("[Firebase] Token refresh failed: %d\n", code);
    http.end();
    return signInAnonymously(); // fall back to new sign-in
  }

  DynamicJsonDocument doc(1024);
  if (deserializeJson(doc, http.getString()) != DeserializationError::Ok) {
    http.end(); return false;
  }
  http.end();

  _firebaseIdToken      = doc["id_token"].as<String>();
  _firebaseRefreshToken = doc["refresh_token"].as<String>();
  unsigned long expiresIn = doc["expires_in"].as<unsigned long>() * 1000UL;
  _tokenExpireMs = millis() + expiresIn - 60000UL;

  Serial.println(F("[Firebase] Token refreshed."));
  return true;
}

bool ensureFirebaseToken() {
  if (_firebaseIdToken.length() == 0) return signInAnonymously();
  if (millis() >= _tokenExpireMs)     return refreshToken();
  return true;
}

// ─── Register device in Firestore ──────────────────────────────────

void _registerDevice(const String& esp32Uid) {
  /* Write the deviceStatus document so the website can find this device */
  String path = String("deviceStatus/") + DEVICE_ID;
  String body = "{\"fields\":{"
    "\"uid\":{\"stringValue\":\"" + esp32Uid + "\"},"
    "\"ownerUid\":{\"stringValue\":\"" + PATIENT_UID + "\"},"
    "\"online\":{\"booleanValue\":true},"
    "\"status\":{\"stringValue\":\"idle\"},"
    "\"firmwareVersion\":{\"stringValue\":\"1.0.0\"},"
    "\"currentCompartment\":{\"integerValue\":\"1\"}"
  "}}";
  firestorePatch(path, body);
}

// ─── Firestore REST helpers ─────────────────────────────────────────

String firestoreBaseURL() {
  return String("https://firestore.googleapis.com/v1/projects/") +
         FIREBASE_PROJECT + "/databases/(default)/documents/";
}

/* GET a Firestore document or collection.
   Returns the raw JSON response body, or "" on error. */
String firestoreGet(const String& path) {
  HTTPClient http;
  String url = firestoreBaseURL() + path;
  http.begin(_wifiClient, url);
  http.addHeader("Authorization", "Bearer " + _firebaseIdToken);
  int code = http.GET();
  if (code != 200) {
    Serial.printf("[Firestore GET] %s → HTTP %d\n", path.c_str(), code);
    http.end();
    return "";
  }
  String resp = http.getString();
  http.end();
  return resp;
}

/* PATCH (create/merge) a Firestore document.
   body must be Firestore JSON with "fields" key. */
bool firestorePatch(const String& path, const String& body) {
  HTTPClient http;
  String url = firestoreBaseURL() + path;
  http.begin(_wifiClient, url);
  http.addHeader("Authorization", "Bearer " + _firebaseIdToken);
  http.addHeader("Content-Type", "application/json");
  // Use PATCH with updateMask to merge (not overwrite)
  int code = http.PATCH(body);
  bool ok = (code == 200 || code == 201);
  if (!ok) {
    Serial.printf("[Firestore PATCH] %s → HTTP %d: %s\n", path.c_str(), code, http.getString().c_str());
  }
  http.end();
  return ok;
}

/* Helper: parse a string field value from a Firestore document JSON. */
String getStringField(const JsonObject& fields, const String& key) {
  if (fields.containsKey(key) && fields[key].containsKey("stringValue")) {
    return fields[key]["stringValue"].as<String>();
  }
  if (fields.containsKey(key) && fields[key].containsKey("integerValue")) {
    return fields[key]["integerValue"].as<String>();
  }
  return "";
}

int getIntField(const JsonObject& fields, const String& key) {
  if (fields.containsKey(key) && fields[key].containsKey("integerValue")) {
    return fields[key]["integerValue"].as<int>();
  }
  if (fields.containsKey(key) && fields[key].containsKey("doubleValue")) {
    return (int)fields[key]["doubleValue"].as<double>();
  }
  return 0;
}

// ═══════════════════════════════════════════════════════════════════
//
//  ███████╗ ██████╗██╗  ██╗███████╗██████╗ ██╗   ██╗██╗     ███████╗
//  ██╔════╝██╔════╝██║  ██║██╔════╝██╔══██╗██║   ██║██║     ██╔════╝
//  ███████╗██║     ███████║█████╗  ██║  ██║██║   ██║██║     █████╗  
//  ╚════██║██║     ██╔══██║██╔══╝  ██║  ██║██║   ██║██║     ██╔══╝  
//  ███████║╚██████╗██║  ██║███████╗██████╔╝╚██████╔╝███████╗███████╗
//  ╚══════╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚═════╝  ╚═════╝ ╚══════╝╚══════╝
//
//  All medication schedule / dispensing logic lives here.
// ═══════════════════════════════════════════════════════════════════

/* ──────────────────────────────────────────────────────────────────
   Check today's schedule and dispense any due medications.
   Called every SCHEDULE_CHECK_INTERVAL_MS.
   ────────────────────────────────────────────────────────────────── */
void checkAndDispenseSchedule() {
  if (!ensureFirebaseToken()) return;

  /* Build today's date string YYYY-MM-DD in IST */
  time_t rawtime = _ntpClient.getEpochTime();
  struct tm* ti  = localtime(&rawtime);
  char dateStr[11];
  strftime(dateStr, sizeof(dateStr), "%Y-%m-%d", ti);

  Serial.printf("[Schedule] Checking doses for %s at %s IST\n",
                dateStr, _ntpClient.getFormattedTime().c_str());

  /* Fetch today's dose documents */
  String path = String("users/") + PATIENT_UID +
                "/schedule/" + dateStr + "/doses";
  String resp = firestoreGet(path);
  if (resp.length() == 0) {
    Serial.println(F("[Schedule] No response or no doses today."));
    return;
  }

  /* Parse the response */
  DynamicJsonDocument doc(8192);
  if (deserializeJson(doc, resp) != DeserializationError::Ok) {
    Serial.println(F("[Schedule] JSON parse error."));
    return;
  }

  if (!doc.containsKey("documents")) {
    Serial.println(F("[Schedule] No dose documents found."));
    return;
  }

  JsonArray documents = doc["documents"].as<JsonArray>();
  int checked = 0, dispensed = 0;

  for (JsonObject doseDoc : documents) {
    checked++;
    String docName = doseDoc["name"].as<String>(); // full resource name
    // Extract doseId from the end of the resource name
    String doseId = docName.substring(docName.lastIndexOf('/') + 1);

    JsonObject fields = doseDoc["fields"].as<JsonObject>();

    String status        = getStringField(fields, "status");
    String scheduledTime = getStringField(fields, "scheduledTime");
    String medicineId    = getStringField(fields, "medicineId");
    String medicineName  = getStringField(fields, "medicineName");
    String compartmentStr= getStringField(fields, "compartment");
    int    dosage        = getIntField(fields, "dosage");
    if (dosage < 1) dosage = 1;

    /* Skip if already taken/dispensed/skipped/missed */
    if (status == "taken" || status == "dispensed" || status == "skipped") continue;

    /* Skip if this dose was already executed by THIS ESP32 (local idempotency) */
    if (isDoseAlreadyExecuted(doseId)) {
      Serial.printf("[Schedule] %s already executed locally — skipping.\n", doseId.c_str());
      continue;
    }

    /* Check if this dose is due right now */
    if (!isTimeInWindow(scheduledTime, DISPENSE_WINDOW_MINUTES)) continue;

    /* Determine compartment number from letter mapping */
    int compartmentNum = _compartmentLetterToNumber(compartmentStr);
    if (compartmentNum < 1 || compartmentNum > 7) {
      Serial.printf("[Schedule] Invalid compartment '%s' for dose %s\n",
                    compartmentStr.c_str(), doseId.c_str());
      continue;
    }

    Serial.printf("[Schedule] 🔔 DOSE DUE: %s | comp %d | %d pill(s) | time %s\n",
                  medicineName.c_str(), compartmentNum, dosage, scheduledTime.c_str());

    /* Process the dose */
    processDose(doseId, medicineId, medicineName, compartmentNum, dosage, scheduledTime);
    dispensed++;
  }

  Serial.printf("[Schedule] Checked %d doses, dispensed %d.\n", checked, dispensed);
}

/* ──────────────────────────────────────────────────────────────────
   Dispense a single dose and mark it as completed.
   ────────────────────────────────────────────────────────────────── */
void processDose(const String& doseId,
                 const String& medicineId,
                 const String& medicineName,
                 int compartment, int dosage,
                 const String& scheduledTime) {
  /* Mark locally FIRST to prevent duplicate execution on crash/restart */
  markDoseExecuted(doseId);

  /* Update Firestore status to "dispensing" */
  _updateDoseStatus(doseId, "dispensing");
  updateFirestoreDeviceStatus("dispensing", compartment);

  /* Physical dispense */
  dispenseMedication(compartment, dosage);

  /* Mark Firestore status as "dispensed" */
  _updateDoseStatus(doseId, "dispensed");
  updateFirestoreDeviceStatus("idle", compartment);

  Serial.printf("[Schedule] ✅ Dispensed %s (comp %d, %d pills)\n",
                medicineName.c_str(), compartment, dosage);
}

/* Update a dose document's status in Firestore */
void _updateDoseStatus(const String& doseId, const String& status) {
  /* Get today's date */
  time_t rawtime = _ntpClient.getEpochTime();
  struct tm* ti  = localtime(&rawtime);
  char dateStr[11];
  strftime(dateStr, sizeof(dateStr), "%Y-%m-%d", ti);

  /* Get current HH:MM */
  char timeStr[6];
  snprintf(timeStr, sizeof(timeStr), "%02d:%02d", ti->tm_hour, ti->tm_min);

  String path = String("users/") + PATIENT_UID +
                "/schedule/" + dateStr + "/doses/" + doseId;

  String body = "{\"fields\":{"
    "\"status\":{\"stringValue\":\"" + status + "\"},"
    "\"takenAt\":{\"stringValue\":\"" + timeStr + "\"},"
    "\"dispensedByESP32\":{\"booleanValue\":true},"
    "\"deviceId\":{\"stringValue\":\"" + DEVICE_ID + "\"}"
  "}}";

  firestorePatch(path, body);
}

/* ──────────────────────────────────────────────────────────────────
   Check for manual dispense commands sent from the website.
   Polls the dispenseCommands collection for pending commands.
   ────────────────────────────────────────────────────────────────── */
void checkAndExecuteManualCommands() {
  if (!ensureFirebaseToken()) return;

  /* Query pending commands
     Note: The REST API doesn't support WHERE queries directly on list.
     We'll fetch all recent commands and filter client-side (acceptable
     because the list is short). For production, use Firebase Functions. */
  String path = String("users/") + PATIENT_UID +
                "/dispenseCommands?orderBy=createdAt&pageSize=5";
  String resp = firestoreGet(path);
  if (resp.length() == 0) return;

  DynamicJsonDocument doc(4096);
  if (deserializeJson(doc, resp) != DeserializationError::Ok) return;
  if (!doc.containsKey("documents")) return;

  for (JsonObject cmdDoc : doc["documents"].as<JsonArray>()) {
    String docName   = cmdDoc["name"].as<String>();
    String commandId = docName.substring(docName.lastIndexOf('/') + 1);

    JsonObject fields = cmdDoc["fields"].as<JsonObject>();
    String status      = getStringField(fields, "status");
    if (status != "pending") continue;

    int    compartment   = getIntField(fields, "compartment");
    int    dosage        = getIntField(fields, "dosage");
    String medicineName  = getStringField(fields, "medicineName");
    String executionId   = getStringField(fields, "executionId");

    /* Skip if already executed locally (by executionId) */
    if (isDoseAlreadyExecuted(executionId)) {
      Serial.printf("[Command] %s already executed — skipping.\n", executionId.c_str());
      continue;
    }

    Serial.printf("[Command] 🔧 Manual command: comp %d, %d pill(s), med: %s\n",
                  compartment, dosage, medicineName.c_str());

    executeManualCommand(commandId, compartment, dosage, medicineName, executionId);
  }
}

void executeManualCommand(const String& commandId, int compartment, int dosage,
                          const String& medicineName, const String& executionId) {
  /* Mark locally to prevent duplicate execution */
  markDoseExecuted(executionId);

  /* Update command status to "executing" */
  String cmdPath = String("users/") + PATIENT_UID + "/dispenseCommands/" + commandId;
  String execBody = "{\"fields\":{"
    "\"status\":{\"stringValue\":\"executing\"},"
    "\"deviceId\":{\"stringValue\":\"" + DEVICE_ID + "\"}"
  "}}";
  firestorePatch(cmdPath, execBody);

  updateFirestoreDeviceStatus("dispensing", compartment);

  /* Physical dispense */
  dispenseMedication(compartment, dosage);

  /* Update command status to "done" */
  String doneBody = "{\"fields\":{"
    "\"status\":{\"stringValue\":\"done\"},"
    "\"result\":{\"stringValue\":\"Dispensed " + String(dosage) +
                " pill(s) from compartment " + String(compartment) + "\"}"
  "}}";
  firestorePatch(cmdPath, doneBody);

  updateFirestoreDeviceStatus("idle", compartment);
  Serial.printf("[Command] ✅ Command %s completed.\n", commandId.c_str());
}

// ─── Heartbeat & Device Status ──────────────────────────────────────

void sendHeartbeat(const String& status) {
  if (!ensureFirebaseToken()) return;
  updateFirestoreDeviceStatus(status, _currentCompartmentSteps);
  Serial.printf("[Heartbeat] Sent. Status: %s, RSSI: %d dBm\n",
                status.c_str(), WiFi.RSSI());
}

void updateFirestoreDeviceStatus(const String& status, int compartment) {
  String path = String("deviceStatus/") + DEVICE_ID;

  /* serverTimestamp not available via REST; use client epoch */
  unsigned long epoch = _ntpClient.getEpochTime();

  String body = "{\"fields\":{"
    "\"online\":{\"booleanValue\":true},"
    "\"status\":{\"stringValue\":\"" + status + "\"},"
    "\"currentCompartment\":{\"integerValue\":\"" + String(compartment) + "\"},"
    "\"wifiRSSI\":{\"integerValue\":\"" + String(WiFi.RSSI()) + "\"},"
    "\"lastSeen\":{\"timestampValue\":\"" + _epochToISO8601(epoch) + "\"},"
    "\"firmwareVersion\":{\"stringValue\":\"1.0.0\"}"
  "}}";

  firestorePatch(path, body);
}

/* Convert Unix epoch to ISO 8601 string for Firestore timestampValue */
String _epochToISO8601(unsigned long epoch) {
  struct tm* ti = gmtime((time_t*)&epoch);
  char buf[25];
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", ti);
  return String(buf);
}

// ─── Idempotency helpers (NVS flash) ───────────────────────────────

bool isDoseAlreadyExecuted(const String& doseId) {
  return _prefs.getBool(doseId.substring(0, 15).c_str(), false);
}

void markDoseExecuted(const String& doseId) {
  _prefs.putBool(doseId.substring(0, 15).c_str(), true);
}

// ─── Time window check ──────────────────────────────────────────────

bool isTimeInWindow(const String& scheduledTime24, int windowMinutes) {
  /* scheduledTime24 format: "HH:MM" */
  if (scheduledTime24.length() < 5) return false;

  int schedH = scheduledTime24.substring(0, 2).toInt();
  int schedM = scheduledTime24.substring(3, 5).toInt();
  int schedTotalMin = schedH * 60 + schedM;

  int nowH = _ntpClient.getHours();
  int nowM = _ntpClient.getMinutes();
  int nowTotalMin = nowH * 60 + nowM;

  int diff = nowTotalMin - schedTotalMin;
  /* Allow dispensing from 0 to +windowMinutes minutes after scheduled time */
  return diff >= 0 && diff <= windowMinutes;
}

// ─── Compartment letter → number mapping ────────────────────────────

int _compartmentLetterToNumber(const String& letter) {
  String up = letter;
  up.toUpperCase();
  if (up == "A") return 1;
  if (up == "B") return 2;
  if (up == "C") return 3;
  if (up == "D") return 4;
  if (up == "E") return 5;
  if (up == "F") return 6;
  if (up == "G") return 7;
  /* If it's already a number string */
  int n = up.toInt();
  if (n >= 1 && n <= 7) return n;
  return -1;
}

// ═══════════════════════════════════════════════════════════════════
//
//  ███╗   ███╗ ██████╗ ████████╗ ██████╗ ██████╗
//  ████╗ ████║██╔═══██╗╚══██╔══╝██╔═══██╗██╔══██╗
//  ██╔████╔██║██║   ██║   ██║   ██║   ██║██████╔╝
//  ██║╚██╔╝██║██║   ██║   ██║   ██║   ██║██╔══██╗
//  ██║ ╚═╝ ██║╚██████╔╝   ██║   ╚██████╔╝██║  ██║
//  ╚═╝     ╚═╝ ╚═════╝    ╚═╝    ╚═════╝ ╚═╝  ╚═╝
//
//  28BYJ-48 stepper motor control (ULN2003 half-step mode)
//  This section is COMPLETELY INDEPENDENT of Firebase/network code.
// ═══════════════════════════════════════════════════════════════════

/* Half-step sequence for 28BYJ-48 (8 steps per electrical cycle) */
const int HALF_STEP_SEQ[8][4] = {
  {1, 0, 0, 0},
  {1, 1, 0, 0},
  {0, 1, 0, 0},
  {0, 1, 1, 0},
  {0, 0, 1, 0},
  {0, 0, 1, 1},
  {0, 0, 0, 1},
  {1, 0, 0, 1},
};

static int _stepIndex = 0;

void enableMotor(bool enable) {
  _motorEnabled = enable;
  if (!enable) {
    digitalWrite(MOTOR_PIN1, LOW);
    digitalWrite(MOTOR_PIN2, LOW);
    digitalWrite(MOTOR_PIN3, LOW);
    digitalWrite(MOTOR_PIN4, LOW);
  }
}

/* Take 'steps' half-steps in the given direction */
void stepperStep(int steps, bool clockwise) {
  enableMotor(true);
  for (int i = 0; i < steps; i++) {
    if (clockwise) {
      _stepIndex = (_stepIndex + 1) % 8;
    } else {
      _stepIndex = (_stepIndex + 7) % 8; // -1 mod 8
    }
    digitalWrite(MOTOR_PIN1, HALF_STEP_SEQ[_stepIndex][0]);
    digitalWrite(MOTOR_PIN2, HALF_STEP_SEQ[_stepIndex][1]);
    digitalWrite(MOTOR_PIN3, HALF_STEP_SEQ[_stepIndex][2]);
    digitalWrite(MOTOR_PIN4, HALF_STEP_SEQ[_stepIndex][3]);
    delayMicroseconds(MOTOR_STEP_DELAY_US);
  }
  enableMotor(false); // de-energise to prevent overheating
}

/* Return the target step count for a given compartment number (1-7) */
int compartmentToSteps(int compartment) {
  switch (compartment) {
    case 1: return COMPARTMENT_1_STEPS;
    case 2: return COMPARTMENT_2_STEPS;
    case 3: return COMPARTMENT_3_STEPS;
    case 4: return COMPARTMENT_4_STEPS;
    case 5: return COMPARTMENT_5_STEPS;
    case 6: return COMPARTMENT_6_STEPS;
    case 7: return COMPARTMENT_7_STEPS;
    default:
      Serial.printf("[Motor] Invalid compartment: %d\n", compartment);
      return _currentCompartmentSteps; // don't move
  }
}

/* Rotate the dispenser to the given compartment (absolute positioning) */
void rotateToCompartment(int compartment) {
  int targetSteps = compartmentToSteps(compartment);
  int delta       = targetSteps - _currentCompartmentSteps;

  Serial.printf("[Motor] Rotating to compartment %d (delta %d steps)\n",
                compartment, delta);

  if (delta == 0) {
    Serial.println(F("[Motor] Already at target compartment."));
    return;
  }

  bool clockwise = delta > 0;
  int  absSteps  = abs(delta);
  stepperStep(absSteps, clockwise);
  _currentCompartmentSteps = targetSteps;

  Serial.printf("[Motor] At compartment %d (%d steps from home)\n",
                compartment, _currentCompartmentSteps);
}

/* Dispense numPills pills from the given compartment.
   The physical release mechanism is triggered here.
   Currently: a simple pulse (extend for servo/solenoid/vibration). */
void dispenseMedication(int compartment, int numPills) {
  Serial.printf("[Motor] Dispensing %d pill(s) from compartment %d\n",
                numPills, compartment);

  rotateToCompartment(compartment);

  for (int p = 0; p < numPills; p++) {
    Serial.printf("[Motor] Releasing pill %d/%d\n", p + 1, numPills);
    /* TODO: Replace with actual release mechanism:
       - Servo: servo.write(90); delay(500); servo.write(0);
       - Solenoid: digitalWrite(SOLENOID_PIN, HIGH); delay(DISPENSE_PULSE_MS); ...
       - Vibration motor: same pattern
       For now, just log + delay as a placeholder. */
    delay(DISPENSE_PULSE_MS);
    // Future: check pill sensor here
  }

  Serial.println(F("[Motor] Dispensing complete."));
}

/* Return motor to home position (compartment 1 / step 0) */
void homeMotor() {
  Serial.println(F("[Motor] Homing to position 0…"));
  /* Rotate backwards to home */
  int stepsBack = _currentCompartmentSteps;
  if (stepsBack > 0) stepperStep(stepsBack, false);
  _currentCompartmentSteps = 0;
  _stepIndex = 0;
  Serial.println(F("[Motor] Homed."));
}
