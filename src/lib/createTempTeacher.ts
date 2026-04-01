// import { doc, setDoc, serverTimestamp } from "firebase/firestore";
// import { db } from "@/lib/firebaseConfig";

// export async function createProfile() {
//   const targetUid = "JPHgUj5q7yd5WEdGBHinfT42ZfR2";
//   const targetEmail = "jason.oosthuizen2505@gmail.com"; 

//   try {
//     const subjects = [
//       { name: "History (IGCSE)", curriculum: "British Curriculum" },
//       { name: "Science (Co-ordinated or Combined)", curriculum: "British Curriculum" },
//        { name: "Global Perspectives", curriculum: "British Curriculum" },
//       { name: "Economics (IGCSE)", curriculum: "British Curriculum" },
//        { name: "Geography (IGCSE)", curriculum: "British Curriculum" },
//             { name: "Geography", curriculum: "British Curriculum" },
//         { name: "Afrikaans", curriculum: "British Curriculum" },
//         { name: "Design & Technology", curriculum: "British Curriculum" },
//          { name: "Biology (IGCSE)", curriculum: "British Curriculum" },
//          { name: "Physical Education", curriculum: "British Curriculum" },
//            { name: "Business Studies (IGCSE)", curriculum: "British Curriculum" },
//            { name: "Computer Science (IGCSE)", curriculum: "British Curriculum" },
//             { name: "British Curriculum Primary Art & Design", curriculum: "British Curriculum" },
//             { name: "English Language (IGCSE)", curriculum: "British Curriculum" },
//             { name: "Art & Design", curriculum: "British Curriculum" },
//             { name: "Digital Literacy", curriculum: "British Curriculum" },
//              { name: "English (Checkpoint)", curriculum: "British Curriculum" },
//               { name: "English Literature (AS-Level)", curriculum: "British Curriculum" },
//                { name: "Environmental Management (IGCSE)", curriculum: "British Curriculum" },

//     ];

//     console.log("🛠️ Initializing/Overriding Profile for:", targetUid);

//     // 1️⃣ USERS Collection (The Auth/Role anchor)
//     // setDoc + merge: true = Create if missing, update if exists.
//     await setDoc(doc(db, "users", targetUid), {
//       uid: targetUid,
//       email: targetEmail,
//       role: "teacher",
//       applicationStatus: "approved", 
//       profileCompleted: true,
//       lastRoleSync: serverTimestamp(),
//       updatedAt: serverTimestamp(),
//     }, { merge: true });

//     // 2️⃣ TEACHERS Collection (The Dashboard data)
//     await setDoc(doc(db, "teachers", targetUid), {
//       uid: targetUid,
//       email: targetEmail,
//       firstName: "Jason",
//       lastName: "Oosthuizen",
//       status: "approved",
//       approved: true,
//       classActivated: true,
//       personalInfo: {
//         firstName: "Jason",
//         lastName: "Oosthuizen",
//         email: targetEmail,
//         gradePhase: "Secondary",
//         curriculum: "British Curriculum",
//         yearsOfExperience: 5,
//       },
//       subjects: subjects,
//       updatedAt: serverTimestamp(),
//     }, { merge: true });

//     // 3️⃣ TEACHER APPLICATIONS (The history log)
//     await setDoc(doc(db, "teacherApplications", targetUid), {
//      uid: targetUid,
//       email: targetEmail,
//       firstName: "Jason",
//       lastName: "Oosthuizen",
//       status: "approved",
//       approved: true,
//       classActivated: true,
//       personalInfo: {
//         firstName: "Jason",
//         lastName: "Oosthuizen",
//         email: targetEmail,
//         gradePhase: "Secondary",
//         curriculum: "British Curriculum",
//         yearsOfExperience: 5,
//       },
//       subjects: subjects,
//       updatedAt: serverTimestamp(),
//     }, { merge: true });

//     console.log("✅ Documents created/synced successfully.");
//     alert("✅ Success! Jason's profile is ready. Redirecting...");

//     window.location.href = "/teacher-dashboard";

//   } catch (error: any) {
//     console.error("🔥 Firestore Error:", error);
//     // If you get "Missing or insufficient permissions", 
//     // it's your Security Rules blocking the 'set' operation.
//     alert("Update failed: " + (error.message || "Permission Denied"));
//   }
// }



// // ===========================================TREVOR =======================================================

// import { doc, setDoc, serverTimestamp } from "firebase/firestore";
// import { db } from "@/lib/firebaseConfig";

// export async function createProfile() {
//   const targetUid =  "Vgtg6VXh8wOPcwyB5bWV3uiwqdx1";
//   const targetEmail = "trevor.ryan.187@gmail.com"; 

//   try {
//     const subjects = [
//       { name: "Mathematics (AS-Level)", curriculum: "British Curriculum" },
//         { name: "Mathematics (A-Level)", curriculum: "British Curriculum" },
//       { name: "Physics (A-Level)", curriculum: "British Curriculum" },
//       { name: "Physics (AS-Level)", curriculum: "British Curriculum" },
//       { name: "Further Mathematics (A-Level)", curriculum: "British Curriculum" },
//       { name: "Mathematics (IGCSE)", curriculum: "British Curriculum" },
//       { name: "Physics (IGCSE)", curriculum: "British Curriculum" },
//       { name: "Chemistry (IGCSE)", curriculum: "British Curriculum" },
//       { name: "Chemistry (AS-Level)", curriculum: "British Curriculum" },
//       { name: "Mathematics (Checkpoint)", curriculum: "British Curriculum" },
//       { name: "Bible Study", curriculum: "British Curriculum" }
//     ];

//     console.log("🛠️ Syncing Profile for:", targetUid);

//     // 1️⃣ USERS Collection
//     await setDoc(doc(db, "users", targetUid), {
//       uid: targetUid,
//       email: targetEmail,
//       role: "teacher",
//       applicationStatus: "approved",
//       profileCompleted: true,
//       updatedAt: serverTimestamp(),
//     }, { merge: true });

//     // 2️⃣ TEACHERS Collection
//     await setDoc(doc(db, "teachers", targetUid), {
//       uid: targetUid,
//       email: targetEmail,
//       firstName: "Trevor",
//       lastName: "Ryan",
//       status: "approved",
//       yearsOfExperience: 30,
//       personalInfo: {
//         firstName: "Trevor",
//         lastName: "Ryan",
//         email: targetEmail,
//         phone: "0826449390",
//         bio: "",
//         gradePhase: "Secondary",
//         curriculum: "British Curriculum",
//       },
//       subjects: subjects,
//       updatedAt: serverTimestamp(),
//     }, { merge: true });

//     // 3️⃣ TEACHER APPLICATIONS Collection
//     await setDoc(doc(db, "teacherApplications", targetUid), {
//       uid: targetUid,
//       email: targetEmail,
//       firstName: "Trevor",
//       lastName: "Ryan",
//       status: "approved",
//       yearsOfExperience: 30,
//       personalInfo: {
//         firstName: "Trevor",
//         lastName: "Ryan",
//         email: targetEmail,
//         phone: "0826449390",
//         bio: "",
//         gradePhase: "Secondary",
//         curriculum: "British Curriculum",
//       },
//       subjects: subjects,
//       updatedAt: serverTimestamp(),
//     }, { merge: true });

//     console.log("✅ Trevor Ryan profile synced successfully.");
//     alert("✅ Trevor Ryan's profile updated successfully.");

//   } catch (error: any) {
//     console.error("🔥 Firestore Error:", error);
//     alert("Update failed: " + (error.message || "Permission Denied"));
//   }
// }

// // ===========================================TANYA =======================================================

// import { doc, setDoc, serverTimestamp } from "firebase/firestore";
// import { db } from "@/lib/firebaseConfig";

// export async function createProfile() {
//   const targetUid =  "U2cdxDz10eSJzbbcUYTt9XEYsJF3"; 
//   const targetEmail = "tanyaprinsloo73@gmail.com"; 

//   try {
//     const subjects = [
//       { name: "Morning Devotion", curriculum: "British Curriculum" },
//         { name: "Bible Studies", curriculum: "British Curriculum" },

//     ];

//     console.log("🛠️ Syncing Profile for:", targetUid);

//     // 1️⃣ USERS Collection
//     await setDoc(doc(db, "users", targetUid), {
//       uid: targetUid,
//       email: targetEmail,
//       role: "teacher",
//       applicationStatus: "approved",
//       profileCompleted: true,
//       updatedAt: serverTimestamp(),
//     }, { merge: true });

//     // 2️⃣ TEACHERS Collection
//     await setDoc(doc(db, "teachers", targetUid), {
//       uid: targetUid,
//       email: targetEmail,
//       firstName: "Tanya",
//       lastName: "Prinsloo",
//       status: "approved",
//       yearsOfExperience: 30,
//       personalInfo: {
//         firstName: "Tanya",
//         lastName: "Prinsloo",
//         email: targetEmail,
//         phone: "84 666 000 6",
//         bio: "",
//         gradePhase: "All Phases",
//         curriculum: "British Curriculum",
//       },
//       subjects: subjects,
//       updatedAt: serverTimestamp(),
//     }, { merge: true });

//     // 3️⃣ TEACHER APPLICATIONS Collection
//     await setDoc(doc(db, "teacherApplications", targetUid), {
//       uid: targetUid,
//       email: targetEmail,
//       firstName: "Tanya",
//       lastName: "Prinsloo",
//       status: "approved",
//       yearsOfExperience: 20,
//       personalInfo: {
//         firstName: "Tanya",
//         lastName: "Prinsloo",
//         email: targetEmail,
//         phone: "84 666 000 6",
//         bio: "",
//         gradePhase: "All Phases",
//         curriculum: "British Curriculum",
//       },
//       subjects: subjects,
//       updatedAt: serverTimestamp(),
//     }, { merge: true });

//     console.log("✅ Tanya Prinsloo profile synced successfully.");
//     alert("✅ Tanya's profile updated successfully.");

//   } catch (error: any) {
//     console.error("🔥 Firestore Error:", error);
//     alert("Update failed: " + (error.message || "Permission Denied"));
//   }
// }

// ===========================================PAULA =======================================================

// import { doc, setDoc, serverTimestamp } from "firebase/firestore";
// import { db } from "@/lib/firebaseConfig";

// export async function createProfile() {
//   const targetUid =  "X378me6BkrZSpqUDDiVqWYZsP9O2"; 
//   const targetEmail = "pslater930@gmail.com"; 

//   try {
//     const subjects = [
//       { name: "Morning Devotion", curriculum: "British Curriculum" },
//         { name: "English(Primary)", curriculum: "British Curriculum" },
//         { name: "Mathematics(Primary)", curriculum: "British Curriculum" },
//         { name: "Science(Primary)", curriculum: "British Curriculum" },

//     ];

//     console.log("🛠️ Syncing Profile for:", targetUid);

//     // 1️⃣ USERS Collection
//     await setDoc(doc(db, "users", targetUid), {
//       uid: targetUid,
//       email: targetEmail,
//       role: "teacher",
//       applicationStatus: "approved",
//       profileCompleted: true,
//       updatedAt: serverTimestamp(),
//     }, { merge: true });

//     // 2️⃣ TEACHERS Collection
//     await setDoc(doc(db, "teachers", targetUid), {
//       uid: targetUid,
//       email: targetEmail,
//       firstName: "Pauline",
//       lastName: "Slater",
//       status: "approved",
//       yearsOfExperience: 15,
//       personalInfo: {
//         firstName: "Pauline",
//         lastName: "Slater",
//         email: targetEmail,
//         phone: "0733419398",
//         bio: "",
//         gradePhase: "primary",
//         curriculum: "British Curriculum",
//       },
//       subjects: subjects,
//       updatedAt: serverTimestamp(),
//     }, { merge: true });

//     // 3️⃣ TEACHER APPLICATIONS Collection
//     await setDoc(doc(db, "teacherApplications", targetUid), {
//       uid: targetUid,
//       email: targetEmail,
//       firstName: "Pauline",
//       lastName: "Slater",
//       status: "approved",
//       yearsOfExperience: 15,
//       personalInfo: {
//         firstName: "Pauline",
//         lastName: "Slater",
//         email: targetEmail,
//         phone: "0733419398",
//         bio: "",
//         gradePhase: "primary",
//         curriculum: "British Curriculum",
//       },
//       subjects: subjects,
//       updatedAt: serverTimestamp(),
//     }, { merge: true });

//     console.log("✅ Pauline Slater profile synced successfully.");
//     alert("✅ Pauline's profile updated successfully.");

//   } catch (error: any) {
//     console.error("🔥 Firestore Error:", error);
//     alert("Update failed: " + (error.message || "Permission Denied"));
//   }
// }


// ===========================================ABITON=======================================================

import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";

export async function createProfile() {
  const targetUid = "LbKKY3pKsaMJoJnkfT3HrMu4B1l1";
  const targetEmail = "abitonp@gmail.com";

  try {
    const subjects = [
      { name: "Coding", curriculum: "British Curriculum" },
      { name: "AI", curriculum: "British Curriculum" },
      { name: "Robotics", curriculum: "British Curriculum" },

    ];

    console.log("🛠️ Syncing Profile for:", targetUid);

    // 1️⃣ USERS Collection
    await setDoc(doc(db, "users", targetUid), {
      uid: targetUid,
      email: targetEmail,
      role: "teacher",
      applicationStatus: "approved",
      profileCompleted: true,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    // 2️⃣ TEACHERS Collection
    await setDoc(doc(db, "teachers", targetUid), {
      uid: targetUid,
      email: targetEmail,
      firstName: "Abiton",
      lastName: "Padera",
      status: "approved",
      yearsOfExperience: 15,
      personalInfo: {
        firstName: "Abiton",
        lastName: "Padera",
        email: targetEmail,
        phone: "0656564983",
        bio: "",
        gradePhase: "secondary",
        curriculum: "British Curriculum",
      },
      subjects: subjects,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    // 3️⃣ TEACHER APPLICATIONS Collection
    await setDoc(doc(db, "teacherApplications", targetUid), {
      uid: targetUid,
      email: targetEmail,
      firstName: "Abiton",
      lastName: "Padera",
      status: "approved",
      yearsOfExperience: 5,
      personalInfo: {
        firstName: "Abiton",
        lastName: "Padera",
        email: targetEmail,
        phone: "0656564983",
        bio: "",
        gradePhase: "secondary",
        curriculum: "British Curriculum",
      },
      subjects: subjects,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    console.log("✅ Abiton Padera profile synced successfully.");
    alert("✅ Abiton's profile updated successfully.");

  } catch (error: any) {
    console.error("🔥 Firestore Error:", error);
    alert("Update failed: " + (error.message || "Permission Denied"));
  }
}