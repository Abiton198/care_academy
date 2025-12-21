import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";

// ✅ Initialize Admin SDK once
if (!admin.apps.length) {
  admin.initializeApp();
}

// ---------- Types ----------
interface CreateUserData {
  email: string;
  password: string;
  name: string;
  role: "admin" | "principal" | "teacher" | "student" | "parent";
  extraData?: Record<string, any>;
}

interface DeleteUserData {
  targetUid: string;
  role: "admin" | "principal" | "teacher" | "student" | "parent";
}

// ---------- Utility: Audit Log ----------
async function logAudit(
  action: "create" | "delete",
  performedBy: string,
  performedByEmail: string | null,
  targetUid: string,
  role: string,
  details: Record<string, any> = {}
) {
  await admin.firestore().collection("auditLogs").add({
    action,
    performedBy,
    performedByEmail,
    targetUid,
    role,
    details,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * 👤 Create a new user (Auth + Firestore + custom claim)
 * Restricted to Admins only
 */
export const createUserProfile = onCall<CreateUserData>(async (request) => {
  const data = request.data;
  const context = request.auth;

  if (!context) {
    throw new HttpsError("unauthenticated", "You must be logged in.");
  }

  const roleClaim = context.token?.role;
  if (roleClaim !== "admin") {
    throw new HttpsError("permission-denied", "Only admins can create users.");
  }

  const { email, password, name, role, extraData } = data;
  if (!email || !password || !name || !role) {
    throw new HttpsError(
      "invalid-argument",
      "email, password, name, and role are required."
    );
  }

  try {
    // 1️⃣ Create user in Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    // 2️⃣ Assign role claim
    await admin.auth().setCustomUserClaims(userRecord.uid, { role });

    // 3️⃣ Add Firestore profile
    await admin
      .firestore()
      .collection(`${role}s`)
      .doc(userRecord.uid)
      .set({
        uid: userRecord.uid,
        email,
        name,
        role,
        ...extraData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    // 4️⃣ Log action
    await logAudit(
      "create",
      context.uid,
      context.token.email || null,
      userRecord.uid,
      role,
      { email, name }
    );

    return { success: true, uid: userRecord.uid };
  } catch (err: any) {
    console.error("Create user error:", err);
    throw new HttpsError("internal", err?.message || "Unknown error");
  }
});

/**
 * 🗑️ Delete user (Auth + Firestore cleanup)
 * Restricted to Admins only
 */
export const deleteUser = onCall<DeleteUserData>(async (request) => {
  const data = request.data;
  const context = request.auth;

  if (!context) {
    throw new HttpsError("unauthenticated", "You must be logged in.");
  }

  const roleClaim = context.token?.role;
  if (roleClaim !== "admin") {
    throw new HttpsError("permission-denied", "Only admins can delete users.");
  }

  const { targetUid, role } = data;
  if (!targetUid || !role) {
    throw new HttpsError(
      "invalid-argument",
      "targetUid and role are required."
    );
  }

  try {
    await admin.auth().deleteUser(targetUid);
    await admin.firestore().collection(`${role}s`).doc(targetUid).delete();

    await logAudit(
      "delete",
      context.uid,
      context.token.email || null,
      targetUid,
      role
    );

    return { success: true, message: `User ${targetUid} deleted.` };
  } catch (err: any) {
    console.error("Delete user error:", err);
    throw new HttpsError("internal", err?.message || "Unknown error");
  }
});

/**
 * 🔄 Sync Firestore `/users/{userId}` role → Auth custom claims
 */
export const syncUserRoleClaims = onDocumentWritten("users/{userId}", async (event) => {
  const userId = event.params.userId;
  const afterSnap = event.data?.after;

  if (!afterSnap?.data()) {
    console.log(`ℹ️ User ${userId} deleted or missing`);
    return;
  }

  const afterData = afterSnap.data();
  if (!afterData) {
    console.log(`ℹ️ No data found for user ${userId}`);
    return;
  }

  const role = afterData.role as string | undefined;
  if (!role) {
    console.log(`ℹ️ User ${userId} has no role to sync`);
    return;
  }

  try {
    await admin.auth().setCustomUserClaims(userId, { role });
    console.log(`✅ Synced role "${role}" for user ${userId}`);

    await admin.firestore().collection("users").doc(userId).update({
      lastRoleSync: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error(`❌ Failed to sync role for user ${userId}:`, err);
  }
});

