import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

interface ApproveTeacherPayload {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
}

export const approveTeacherProfile = functions.https.onCall(
  async (data: ApproveTeacherPayload, context) => {

    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be logged in"
      );
    }

    const { uid, email, firstName, lastName } = data;

    const britishSubjects = [
      { name: "Geography (Primary)", curriculum: "British Curriculum" },
      { name: "Mathematics (Primary)", curriculum: "British Curriculum" },
      { name: "English (Primary)", curriculum: "British Curriculum" },
    ];

    try {
      // USERS
      await db.doc(`users/${uid}`).set({
        uid,
        email,
        role: "teacher",
        applicationStatus: "approved",
        profileCompleted: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      // TEACHERS
      await db.doc(`teachers/${uid}`).set({
        uid,
        email,
        status: "approved",
        approved: true,
        classActivated: true,
        personalInfo: {
          firstName,
          lastName,
          email,
          gradePhase: "Primary",
          curriculum: "British Curriculum",
          yearsOfExperience: 15,
        },
        subjects: britishSubjects,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      // APPLICATIONS
      await db.doc(`teacherApplications/${uid}`).set({
        uid,
        email,
        status: "approved",
        personalInfo: {
          firstName,
          lastName,
          email,
          gradePhase: "Primary",
          curriculum: "British Curriculum",
          yearsOfExperience: 15,
          subjects: britishSubjects,
        },
        subjects: britishSubjects,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      return { success: true, message: "Teacher approved successfully" };

    } catch (err: any) {
      console.error(err);
      throw new functions.https.HttpsError("internal", err.message);
    }
  }
);
