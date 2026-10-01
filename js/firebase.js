/* ═══════════════════════════════════════════════════════════════
   PillSync — Firebase Bootstrap  (type="module")
   ───────────────────────────────────────────────────────────────
   This file is a module so it can use Firebase ES-module imports.
   We bridge to classic scripts by attaching FirebaseAuth and
   FirebaseDB to window — every page script reads from those.
   ═══════════════════════════════════════════════════════════════ */

import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
  Timestamp,
  limit,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

/* ─── Config (do not modify) ─── */
const firebaseConfig = {
  apiKey:            "AIzaSyB8hrMRz8m8DVR2mmVzQ5QwX2sLZUo1TgI",
  authDomain:        "pill-dispenser-ea1f1.firebaseapp.com",
  projectId:         "pill-dispenser-ea1f1",
  storageBucket:     "pill-dispenser-ea1f1.firebasestorage.app",
  messagingSenderId: "1008755355397",
  appId:             "1:1008755355397:web:9779f6a0eb291e763b916c",
  measurementId:     "G-ESCRSHPRPZ",
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

/* ══════════════════════════════════════════════════════════════
   FIREAUTH  —  window.FirebaseAuth
   Methods called by classic scripts (no import needed)
   ══════════════════════════════════════════════════════════════ */

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

window.FirebaseAuth = {

  /* Sign in — clean popup flow */
  signInWithGoogle() {
    const freshProvider = new GoogleAuthProvider();
    freshProvider.setCustomParameters({ prompt: 'select_account' });
    return signInWithPopup(auth, freshProvider);
  },

  signOut() {
    return signOut(auth);
  },

  currentUser() {
    return auth.currentUser;
  },
};

/* ══════════════════════════════════════════════════════════════
   FIREDB  —  window.FirebaseDB
   All Firestore operations used by page scripts
   ══════════════════════════════════════════════════════════════ */

window.FirebaseDB = {

  /* ── User Profile ────────────────────────────────────────── */

  /**
   * On first login: creates the users/{uid} doc.
   * On subsequent logins: fetches and returns existing doc.
   * @returns {Promise<Object>} profile data
   */
  async ensureUserProfile(firebaseUser, preferredRole = 'patient') {
    const ref = doc(db, 'users', firebaseUser.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      /* Pick up role choice from the auth page role selector */
      const storedRole = sessionStorage.getItem('ps_preferred_role') || preferredRole;
      sessionStorage.removeItem('ps_preferred_role');
      const profile = {
        uid:            firebaseUser.uid,
        name:           firebaseUser.displayName || 'Friend',
        email:          firebaseUser.email || '',
        photoURL:       firebaseUser.photoURL || null,
        role:           storedRole,
        caregiverEmail: '',
        createdAt:      serverTimestamp(),
        updatedAt:      serverTimestamp(),
      };
      await setDoc(ref, profile);
      return profile;
    }
    return snap.data();
  },

  /**
   * Partial-update the user profile doc.
   */
  async updateUserProfile(uid, data) {
    const ref = doc(db, 'users', uid);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
  },

  /* ── Medicines ───────────────────────────────────────────── */

  /**
   * Subscribe to live list of active medicines.
   * @param {string} uid
   * @param {Function} callback  called with array of medicine objects
   * @returns unsubscribe function
   */
  getMedicines(uid, callback) {
    const col = collection(db, 'users', uid, 'medicines');
    const q   = query(col, where('active', '==', true));
    return onSnapshot(q, (snap) => {
      const meds = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      meds.sort((a, b) => {
        const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
        const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
        return tA - tB;
      });
      callback(null, meds);
    }, (err) => {
      console.error('getMedicines snapshot error:', err);
      callback(err, []);
    });
  },

  /**
   * Add a new medicine document.
   */
  async addMedicine(uid, data) {
    const col = collection(db, 'users', uid, 'medicines');
    const ref = await addDoc(col, {
      ...data,
      active:    true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  },

  /**
   * Update an existing medicine document.
   */
  async updateMedicine(uid, medId, data) {
    const ref = doc(db, 'users', uid, 'medicines', medId);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
  },

  /**
   * Soft-delete: set active=false so history stays intact.
   */
  async softDeleteMedicine(uid, medId) {
    const ref = doc(db, 'users', uid, 'medicines', medId);
    await updateDoc(ref, { active: false, updatedAt: serverTimestamp() });
  },

  /* ── Today's Schedule ───────────────────────────────────── */

  /**
   * Generate today's dose documents for each active medicine (idempotent).
   * Only writes docs that don't already exist.
   * @param {string} uid
   * @param {string} dateStr  YYYY-MM-DD
   * @param {Array}  medicines  from Firestore snapshot
   */
  async generateTodaySchedule(uid, dateStr, medicines) {
    const todayDate = new Date(dateStr + 'T00:00:00');
    const dayOfWeek = todayDate.getDay(); // 0=Sun … 6=Sat

    for (const med of medicines) {
      /* Check if this medicine is scheduled today */
      const daysOfWeek = med.daysOfWeek || [0,1,2,3,4,5,6];
      if (!daysOfWeek.includes(dayOfWeek)) continue;

      const times = med.times || ['08:00'];
      for (const time of times) {
        /* Deterministic doc ID: medId_time so re-runs are idempotent */
        const doseId = `${med.id}_${time.replace(':', '')}`;
        const ref = doc(db, 'users', uid, 'schedule', dateStr, 'doses', doseId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(ref, {
            medicineId:    med.id,
            medicineName:  med.name,
            dosage:        med.dosage,
            compartment:   med.compartment || '',
            color:         med.color || '#5B8A72',
            instructions:  med.instructions || '',
            scheduledTime: time,
            status:        'upcoming',
            takenAt:       null,
            date:          dateStr,
            createdAt:     serverTimestamp(),
          });
        }
      }
    }
  },

  /**
   * Subscribe to today's schedule (all dose docs under the date).
   * @returns unsubscribe function
   */
  getTodaySchedule(uid, dateStr, callback) {
    const col = collection(db, 'users', uid, 'schedule', dateStr, 'doses');
    return onSnapshot(col, (snap) => {
      const doses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(null, doses);
    }, (err) => callback(err, []));
  },

  /**
   * Mark a dose as taken right now.
   */
  async markDoseTaken(uid, dateStr, doseId) {
    const now = new Date();
    const takenAt = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const ref = doc(db, 'users', uid, 'schedule', dateStr, 'doses', doseId);
    await updateDoc(ref, { status: 'taken', takenAt });
  },

  /**
   * Mark a dose as skipped.
   */
  async skipDose(uid, dateStr, doseId) {
    const ref = doc(db, 'users', uid, 'schedule', dateStr, 'doses', doseId);
    await updateDoc(ref, { status: 'skipped', takenAt: null });
  },

  /**
   * Client-side: flag overdue upcoming doses as missed.
   * A dose is "missed" if it is >30 min past scheduled time and still "upcoming".
   */
  async flagMissedDoses(uid, dateStr, doses) {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();

    for (const dose of doses) {
      if (dose.status !== 'upcoming') continue;
      const [h, m] = dose.scheduledTime.split(':').map(Number);
      const schedMin = h * 60 + m;
      if (nowMin - schedMin > 30) {
        try {
          const ref = doc(db, 'users', uid, 'schedule', dateStr, 'doses', dose.id);
          await updateDoc(ref, { status: 'missed' });
        } catch (_) { /* ignore individual failures */ }
      }
    }
  },

  /* ── Dose History ────────────────────────────────────────── */

  /**
   * Get dose history for a range of past dates (last N days).
   * Uses getDocs for each date (no cross-collection query needed).
   * @param {string} uid
   * @param {string[]} dateStrings  array of YYYY-MM-DD strings
   * @param {Function} callback  called with array of {date, doses[]}
   * @returns unsubscribe function (for the most recent date's live listener)
   */
  getHistoryDates(uid, dateStrings, callback) {
    /* We use onSnapshot only for the most recent date (today),
       and getDocs for past dates, then combine. */
    const fetchAll = async () => {
      const result = [];
      for (const dateStr of dateStrings) {
        try {
          const col  = collection(db, 'users', uid, 'schedule', dateStr, 'doses');
          const snap = await getDocs(col);
          const doses = snap.docs.map(d => ({ id: d.id, ...d.data(), date: dateStr }));
          if (doses.length > 0) result.push(...doses);
        } catch (_) { /* date may not exist yet — skip */ }
      }
      callback(null, result);
    };
    fetchAll();
    /* Return a no-op unsubscribe for the static history */
    return () => {};
  },

  /* ═══════════════════════════════════════════════════════════
     ESP32 DEVICE STATUS
     Collection: deviceStatus/{deviceId}
     ═══════════════════════════════════════════════════════════ */

  /**
   * Real-time listener for the ESP32 device status document.
   * ESP32 writes to this doc; website reads it.
   * @param {string} deviceId   e.g. "ESP32-A4F2"
   * @param {Function} callback (err, deviceData | null)
   * @returns unsubscribe function
   */
  getDeviceStatus(deviceId, callback) {
    if (!deviceId) { callback(null, null); return () => {}; }
    const ref = doc(db, 'deviceStatus', deviceId);
    return onSnapshot(ref, (snap) => {
      callback(null, snap.exists() ? { id: snap.id, ...snap.data() } : null);
    }, (err) => {
      console.error('getDeviceStatus error:', err);
      callback(err, null);
    });
  },

  /**
   * Write/update the device status document (called by ESP32 via REST,
   * and also by the website to initialise the document).
   */
  async upsertDeviceStatus(deviceId, data) {
    const ref = doc(db, 'deviceStatus', deviceId);
    await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
  },

  /* ═══════════════════════════════════════════════════════════
     DISPENSE COMMANDS  (website → ESP32)
     Collection: users/{uid}/dispenseCommands/{commandId}
     ═══════════════════════════════════════════════════════════ */

  /**
   * Send a manual dispense command from the website.
   * The ESP32 polls/listens for pending commands and executes them.
   *
   * @param {string} uid
   * @param {Object} payload
   *   compartment {number}  1-7
   *   dosage      {number}  number of pills
   *   medicineId  {string}  (optional)
   *   medicineName{string}  (optional)
   * @returns {string} commandId
   */
  async sendDispenseCommand(uid, payload) {
    const col = collection(db, 'users', uid, 'dispenseCommands');
    const executionId = `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const ref = await addDoc(col, {
      type:         'manual',
      compartment:  payload.compartment,
      dosage:       payload.dosage || 1,
      medicineId:   payload.medicineId   || '',
      medicineName: payload.medicineName || '',
      executionId,
      status:       'pending',
      createdAt:    serverTimestamp(),
      executedAt:   null,
      result:       null,
    });
    return ref.id;
  },

  /**
   * Real-time listener for the last N dispense commands.
   * Website uses this to show command history + live status.
   * @param {string} uid
   * @param {Function} callback (err, commands[])
   * @returns unsubscribe function
   */
  listenDispenseCommands(uid, callback, limitCount = 10) {
    const col = collection(db, 'users', uid, 'dispenseCommands');
    const q   = query(col, orderBy('createdAt', 'desc'), limit(limitCount));
    return onSnapshot(q, (snap) => {
      const commands = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(null, commands);
    }, (err) => {
      console.error('listenDispenseCommands error:', err);
      callback(err, []);
    });
  },

  /**
   * Update a dispense command's status.
   * Called by the website if needed, or by ESP32 via REST.
   */
  async updateDispenseCommandStatus(uid, commandId, status, result = null) {
    const ref = doc(db, 'users', uid, 'dispenseCommands', commandId);
    const data = { status };
    if (result !== null) data.result = result;
    if (status === 'executing' || status === 'done' || status === 'failed') {
      data.executedAt = serverTimestamp();
    }
    await updateDoc(ref, data);
  },

  /**
   * Mark a dose as dispensed by the ESP32.
   * Updates the existing dose document in the daily schedule.
   * @param {string} uid
   * @param {string} dateStr  YYYY-MM-DD
   * @param {string} doseId
   * @param {string} executionId
   */
  async markDoseDispensed(uid, dateStr, doseId, executionId) {
    const now = new Date();
    const takenAt = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const ref = doc(db, 'users', uid, 'schedule', dateStr, 'doses', doseId);
    await updateDoc(ref, {
      status:           'dispensed',
      takenAt,
      dispensedByESP32: true,
      executionId,
    });
  },

  /**
   * Get all pending dispense commands for the ESP32 to process.
   * (The ESP32 uses the REST API directly, but this helper is available
   *  for testing/debugging from the browser console.)
   */
  async getPendingDispenseCommands(uid) {
    const col = collection(db, 'users', uid, 'dispenseCommands');
    const q   = query(col, where('status', '==', 'pending'), orderBy('createdAt', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
};

/* ══════════════════════════════════════════════════════════════
   AUTH STATE LISTENER
   Single source of truth — notifies AppState which then routes.
   ══════════════════════════════════════════════════════════════ */

/* Handle redirect result first (mobile flow) */
getRedirectResult(auth).catch(() => { /* ignore — popup flow succeeded */ });

onAuthStateChanged(auth, (user) => {
  /* AppState is a classic global — available by the time this fires
     because firebase.js is deferred (module) and all other scripts
     load synchronously before DOMContentLoaded. */
  if (typeof AppState !== 'undefined' && AppState.onFirebaseAuthChange) {
    AppState.onFirebaseAuthChange(user);
  }
});

/* Signal to app.js that Firebase is ready */
window.dispatchEvent(new CustomEvent('FirebaseReady'));