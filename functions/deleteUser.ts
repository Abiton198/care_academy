import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

export const deleteUser = functions.region("us-central1").https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be signed in."
      );
    }

    const callerUid = context.auth.uid;

    // 🔒 Verify caller is an admin
    const adminDoc = await admin.firestore().doc(`admins/${callerUid}`).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== "admin") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only admins can delete users."
      );
    }

    const { targetUid, role } = data as {
      targetUid?: string;
      role?: "admin" | "teacher" | "student" | "parent";
    };

    if (!targetUid || !role) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Both targetUid and role are required."
      );
    }

    try {
      // 1. Delete from Firebase Auth
      await admin.auth().deleteUser(targetUid);

      // 2. Delete Firestore profile
      const collection = `${role}s`;
      await admin.firestore().collection(collection).doc(targetUid).delete();

      // 3. Cascade cleanup for students
      if (role === "student") {
        const db = admin.firestore();

        // Example: delete quiz attempts
        const quizzes = await db
          .collection("quizAttempts")
          .where("studentId", "==", targetUid)
          .get();
        for (const doc of quizzes.docs) {
          await doc.ref.delete();
        }

        // Example: delete leaderboard entries
        const leaderboard = await db
          .collection("leaderboard")
          .where("studentId", "==", targetUid)
          .get();
        for (const doc of leaderboard.docs) {
          await doc.ref.delete();
        }

        // Add more collections here as needed…
      }

      // 4. Audit log
      await admin.firestore().collection("deletionLogs").add({
        targetUid,
        role,
        deletedBy: callerUid,
        deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true, message: `User ${targetUid} and related data deleted.` };
    } catch (err: any) {
      console.error("Error deleting user:", err);
      throw new functions.https.HttpsError(
        "internal",
        err?.message || "Unknown error"
      );
    }
  }
);
