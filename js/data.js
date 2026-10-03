/* ═══════════════════════════════════════════════
   PillSync — Mock Data
   Current simulated time: 14:05 (2:05 PM)
   ═══════════════════════════════════════════════ */

const APP_DATA = (() => {

  /* ─── Medicines ─── */
  const medicines = [
    {
      id: 'med-1',
      name: 'Metformin',
      genericName: 'Metformin Hydrochloride',
      dosage: '500 mg',
      compartment: 'A',
      color: '#5B8A72',
      purpose: 'Diabetes management',
      prescribedBy: 'Dr. Sarah Chen',
      instructions: 'Take with meals to reduce stomach upset',
      frequency: 'twice-daily',
      times: ['08:00', '18:00'],
      daysOfWeek: [0,1,2,3,4,5,6],
      startDate: '2024-01-15',
      active: true,
      refillDate: '2026-09-01',
      pillCount: 24,
    },
    {
      id: 'med-2',
      name: 'Lisinopril',
      genericName: 'Lisinopril',
      dosage: '10 mg',
      compartment: 'B',
      color: '#5B85C4',
      purpose: 'Blood pressure control',
      prescribedBy: 'Dr. James Park',
      instructions: 'Take in the morning, avoid potassium supplements',
      frequency: 'once-daily',
      times: ['08:00'],
      daysOfWeek: [0,1,2,3,4,5,6],
      startDate: '2023-06-10',
      active: true,
      refillDate: '2026-08-28',
      pillCount: 11,
    },
    {
      id: 'med-3',
      name: 'Vitamin D',
      genericName: 'Cholecalciferol',
      dosage: '1000 IU',
      compartment: 'C',
      color: '#E8B84B',
      purpose: 'Bone & immune health',
      prescribedBy: 'Dr. Sarah Chen',
      instructions: 'Take with lunch or a fatty meal for best absorption',
      frequency: 'once-daily',
      times: ['12:00'],
      daysOfWeek: [0,1,2,3,4,5,6],
      startDate: '2024-03-01',
      active: true,
      refillDate: '2026-10-15',
      pillCount: 52,
    },
    {
      id: 'med-4',
      name: 'Aspirin',
      genericName: 'Acetylsalicylic Acid',
      dosage: '81 mg',
      compartment: 'D',
      color: '#D96C5A',
      purpose: 'Heart health & blood thinning',
      prescribedBy: 'Dr. James Park',
      instructions: 'Take with a full glass of water',
      frequency: 'once-daily',
      times: ['21:00'],
      daysOfWeek: [0,1,2,3,4,5,6],
      startDate: '2023-09-20',
      active: true,
      refillDate: '2026-09-20',
      pillCount: 48,
    },
  ];

  /* ─── Today's Schedule (simulated time: 14:05) ─── */
  const todaySchedule = [
    {
      id: 'dose-t1',
      medicineId: 'med-1',
      scheduledTime: '08:00',
      status: 'taken',   /* taken on time */
      takenAt: '08:03',
      notes: '',
    },
    {
      id: 'dose-t2',
      medicineId: 'med-2',
      scheduledTime: '08:00',
      status: 'taken',
      takenAt: '08:03',
      notes: '',
    },
    {
      id: 'dose-t3',
      medicineId: 'med-3',
      scheduledTime: '12:00',
      status: 'missed',  /* missed — past, not taken */
      takenAt: null,
      notes: '',
    },
    {
      id: 'dose-t4',
      medicineId: 'med-1',
      scheduledTime: '18:00',
      status: 'upcoming',
      takenAt: null,
      notes: '',
    },
    {
      id: 'dose-t5',
      medicineId: 'med-4',
      scheduledTime: '21:00',
      status: 'upcoming',
      takenAt: null,
      notes: '',
    },
  ];

  /* ─── 14-Day History (going back from yesterday) ─── */
  function generateHistory() {
    const history = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Dose definitions for each day
    const dailyDoses = [
      { medicineId: 'med-1', time: '08:00' },
      { medicineId: 'med-2', time: '08:00' },
      { medicineId: 'med-3', time: '12:00' },
      { medicineId: 'med-1', time: '18:00' },
      { medicineId: 'med-4', time: '21:00' },
    ];

    // Adherence pattern per day (index 0 = 14 days ago)
    // true = taken, false = missed
    const patterns = [
      [true,  true,  false, true,  true ],  // day -14
      [true,  true,  true,  true,  false],  // day -13
      [true,  false, true,  true,  true ],  // day -12
      [true,  true,  true,  true,  true ],  // day -11 (100%)
      [true,  true,  true,  false, true ],  // day -10
      [true,  true,  false, true,  true ],  // day -9
      [true,  true,  true,  true,  true ],  // day -8 (100%)
      [false, true,  true,  true,  true ],  // day -7
      [true,  true,  true,  true,  true ],  // day -6 (100%)
      [true,  true,  false, false, true ],  // day -5
      [true,  true,  true,  true,  true ],  // day -4 (100%)
      [true,  false, true,  true,  true ],  // day -3
      [true,  true,  true,  true,  false],  // day -2
      [true,  true,  false, true,  true ],  // yesterday
    ];

    for (let d = 0; d < 14; d++) {
      const date = new Date(today);
      date.setDate(date.getDate() - (14 - d));
      const dateStr = date.toISOString().split('T')[0];
      const dayPattern = patterns[d] || [true, true, true, true, true];

      dailyDoses.forEach((dose, i) => {
        const taken = dayPattern[i];
        history.push({
          id: `hist-${d}-${i}`,
          medicineId: dose.medicineId,
          date: dateStr,
          scheduledTime: dose.time,
          status: taken ? 'taken' : 'missed',
          takenAt: taken ? dose.time.replace(':', ':0').slice(0,5) : null,
        });
      });
    }
    return history;
  }

  const history = generateHistory();

  /* ─── Reminders / Alerts ─── */
  const reminders = [
    {
      id: 'rem-1',
      type: 'missed-dose',
      medicineId: 'med-3',
      title: 'Missed Dose — Vitamin D',
      message: 'You missed your 12:00 PM Vitamin D 1000 IU dose.',
      time: '12:15',
      date: new Date().toISOString().split('T')[0],
      severity: 'warning',
      acknowledged: false,
      canTakeNow: true,
    },
    {
      id: 'rem-2',
      type: 'upcoming',
      medicineId: 'med-1',
      title: 'Upcoming Dose — Metformin',
      message: 'Your 6:00 PM Metformin 500 mg dose is due in 4 hours.',
      time: '14:05',
      date: new Date().toISOString().split('T')[0],
      severity: 'info',
      acknowledged: false,
      canTakeNow: false,
    },
    {
      id: 'rem-3',
      type: 'refill',
      medicineId: 'med-2',
      title: 'Refill Reminder — Lisinopril',
      message: 'Only 11 pills remaining. Consider refilling soon.',
      time: '09:00',
      date: new Date().toISOString().split('T')[0],
      severity: 'alert',
      acknowledged: false,
      canTakeNow: false,
    },
  ];

  /* ─── User Profiles ─── */
  const users = {
    patient: {
      id: 'user-1',
      name: 'Mary Johnson',
      initials: 'MJ',
      email: 'mary.johnson@email.com',
      phone: '+1 (555) 234-5678',
      age: 68,
      dob: '1958-03-14',
      role: 'patient',
      address: '42 Maple Street, Springfield, IL 62701',
      avatar: null,
      conditions: ['Type 2 Diabetes', 'Hypertension'],
      linkedCaregivers: ['user-2'],
      notificationPrefs: {
        email: true,
        sms: true,
        push: true,
        reminderLeadTime: 30,      /* minutes before dose */
        missedDoseAlert: true,
        weeklyReport: true,
      },
    },
    caregiver: {
      id: 'user-2',
      name: 'James Johnson',
      initials: 'JJ',
      email: 'james.johnson@email.com',
      phone: '+1 (555) 987-6543',
      role: 'caregiver',
      relationship: 'Son',
      linkedPatients: ['user-1'],
      notificationPrefs: {
        email: true,
        sms: true,
        push: false,
        missedDoseAlert: true,
        weeklyReport: true,
      },
    },
  };

  /* ─── Device Status ─── */
  const device = {
    id: 'ESP32-A4F2',
    name: 'Living Room Dispenser',
    connected: true,
    lastSync: '2 minutes ago',
    lastSyncTimestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    battery: 87,
    wifiStrength: 'Strong', /* Strong / Fair / Weak */
    firmware: '2.1.4',
    compartments: {
      A: { medicineId: 'med-1', filled: true, pillCount: 24 },
      B: { medicineId: 'med-2', filled: true, pillCount: 11 },
      C: { medicineId: 'med-3', filled: true, pillCount: 52 },
      D: { medicineId: 'med-4', filled: true, pillCount: 48 },
    },
  };

  /* ─── Weekly Adherence (last 7 days, percent per day) ─── */
  function getWeeklyAdherence() {
    const today = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayHistory = history.filter(h => h.date === dateStr);
      const taken = dayHistory.filter(h => h.status === 'taken').length;
      const total = dayHistory.length;
      days.push({
        date: dateStr,
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        taken,
        total,
        pct: total > 0 ? Math.round((taken / total) * 100) : 0,
      });
    }
    return days;
  }

  async function updateHardwareSchedule(timeString, compartmentAngle) {
    const { getFirestore, doc, setDoc } = await import("https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js");
    const { getApp } = await import("https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js");
    const db = getFirestore(getApp());
    await setDoc(doc(db, "schedule", "activeAlarm"), {
      time: timeString,
      angle: parseInt(compartmentAngle, 10)
    });
  }

  return {
    medicines,
    todaySchedule,
    history,
    reminders,
    users,
    device,
    getWeeklyAdherence,
    updateHardwareSchedule,
  };
})();
