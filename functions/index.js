/**
 * Firebase Cloud Functions for PerlEvents ERP
 * - Concurrency-Safe Booking Reservation
 * - Trusted Admin-Only Account Creation
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.database();

/**
 * Helper: minutes from midnight
 */
function timeToMins(t) {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function checkOverlap(sA, eA, sB, eB) {
  return Math.max(sA, sB) < Math.min(eA, eB);
}

/**
 * 1. Admin Provision Employee Account
 * Caller must be authenticated and verified as 'admin' in /users/{uid}
 */
exports.provisionEmployeeAccount = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const callerUid = context.auth.uid;
  const callerSnap = await db.ref(`users/${callerUid}`).once('value');
  const callerProfile = callerSnap.val();

  if (!callerProfile || callerProfile.role !== 'admin' || !callerProfile.isActive) {
    throw new functions.https.HttpsError('permission-denied', 'Only active Admins can create employee accounts.');
  }

  const { fullName, email, role, phone, assignedBanquetIds } = data;
  if (!fullName || !email || !role || !['salesperson', 'manager'].includes(role)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid employee parameters.');
  }

  // 1. Create auth user with temporary password or email link
  const tempPassword = `PE@${Math.random().toString(36).substring(2, 8)}!2026`;
  const userRecord = await admin.auth().createUser({
    email,
    password: tempPassword,
    displayName: fullName,
  });

  // 2. Set Custom User Claims
  await admin.auth().setCustomUserClaims(userRecord.uid, {
    role,
    organizationId: callerProfile.organizationId,
  });

  // 3. Save User Profile in Realtime Database
  const newProfile = {
    uid: userRecord.uid,
    fullName,
    email: email.toLowerCase(),
    phone: phone || '',
    role,
    organizationId: callerProfile.organizationId,
    isActive: true,
    createdAt: new Date().toISOString(),
    createdBy: callerUid,
    updatedAt: new Date().toISOString(),
    assignedBanquetIds: assignedBanquetIds || [],
  };

  await db.ref(`users/${userRecord.uid}`).set(newProfile);

  // 4. Record Audit Log
  await db.ref('activityLogs').push({
    actorId: callerUid,
    actorName: callerProfile.fullName,
    actorRole: 'admin',
    action: `Created ${role} Account`,
    module: 'users',
    recordId: userRecord.uid,
    details: `Admin provisioned ${fullName} (${email}) as ${role}.`,
    timestamp: new Date().toISOString(),
  });

  return { success: true, uid: userRecord.uid, email, temporaryPassword: tempPassword };
});

/**
 * 2. Concurrency-Safe Banquet Reservation Transaction
 */
exports.reserveBookingSlot = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const callerUid = context.auth.uid;
  const callerSnap = await db.ref(`users/${callerUid}`).once('value');
  const caller = callerSnap.val();
  if (!caller || !['admin', 'salesperson'].includes(caller.role) || !caller.isActive) {
    throw new functions.https.HttpsError('permission-denied', 'Unauthorized role.');
  }

  const { banquetId, date, startTime, endTime, eventName, eventId } = data;
  const bookingSlotsRef = db.ref(`bookingSlots/${banquetId}/${date}`);

  // Transaction over the specific banquet day slots
  return bookingSlotsRef.transaction((currentSlots) => {
    const slots = currentSlots || {};
    const reqStart = timeToMins(startTime);
    let reqEnd = timeToMins(endTime);
    if (reqEnd <= reqStart) reqEnd += 24 * 60;

    // Buffer check
    const buffer = 60; // 60 mins setup & cleanup
    const effStart = reqStart - buffer;
    const effEnd = reqEnd + buffer;

    for (const key of Object.keys(slots)) {
      const slot = slots[key];
      if (slot.status === 'cancelled') continue;
      if (eventId && slot.eventId === eventId) continue;

      const sStart = timeToMins(slot.startTime) - buffer;
      let sEnd = timeToMins(slot.endTime) + buffer;
      if (sEnd <= sStart) sEnd += 24 * 60;

      if (checkOverlap(effStart, effEnd, sStart, sEnd)) {
        // Abort transaction due to collision
        return; // Returning undefined aborts transaction
      }
    }

    const slotId = `slot_${Date.now()}`;
    slots[slotId] = {
      id: slotId,
      banquetId,
      date,
      startTime,
      endTime,
      eventId: eventId || `evt_${Date.now()}`,
      eventName,
      status: 'confirmed',
      organizationId: caller.organizationId,
      createdAt: new Date().toISOString(),
    };

    return slots;
  }).then((result) => {
    if (!result.committed) {
      throw new functions.https.HttpsError('already-exists', 'Requested time slot is no longer available. Please select another slot.');
    }
    return { success: true };
  });
});
