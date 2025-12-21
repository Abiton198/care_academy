import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

export const createUserProfile = functions.region("us-central1").https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be signed in."
      );
    }

    const callerUid = context.auth.uid;

    // 🔒 Verify caller is an admin in Firestore
    const adminDoc = await admin.firestore().doc(`admins/${callerUid}`).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== "admin") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only admins can create users."
      );
    }

    const {
      email,
      password,
      name,
      role,
      ...extraData
    } = data as {
      email?: string;
      password?: string;
      name?: string;
      role?: "admin" | "teacher" | "student" | "parent";
      [key: string]: any;
    };

    if (!email || !password || !name || !role) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Email, password, name, and role are required."
      );
    }

    try {
      // 1. Create the Firebase Auth user
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: name,
      });

      // 2. Set custom claim
      await admin.auth().setCustomUserClaims(userRecord.uid, { role });

      // 3. Save Firestore doc using **Auth UID as document ID**
      const collection = `${role}s`; // admins, students, teachers, parents
      await admin.firestore().collection(collection).doc(userRecord.uid).set({
        uid: userRecord.uid,
        email,
        name,
        role,
        createdBy: context.auth.token.email,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        ...extraData,
      });

      // 4. Audit log
      await admin.firestore().collection("creationLogs").add({
        uid: userRecord.uid,
        email,
        role,
        createdBy: callerUid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        uid: userRecord.uid,
        message: `${role} user created successfully.`,
      };
    } catch (err: any) {
      console.error("Error creating user:", err);
      throw new functions.https.HttpsError(
        "internal",
        err?.message || "Unknown error"
      );
    }
  }
);
