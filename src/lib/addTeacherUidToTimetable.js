import { db } from "./firebaseConfig";
import { collection, getDocs, updateDoc, doc, query } from "firebase/firestore";

async function addTeacherUidToTimetable() {
  const q = query(collection(db, "timetable"));
  const snap = await getDocs(q);

  for (const d of snap.docs) {
    const data = d.data();
    if (!data.teacherUid && data.teacherName) {
      // Here, you need a mapping of teacherName → teacherUid
      // Example: fetch from teachers collection
      const teacherSnap = await getDocs(
        query(collection(db, "teachers"), where("name", "==", data.teacherName))
      );
      if (!teacherSnap.empty) {
        const teacherDoc = teacherSnap.docs[0];
        const teacherUid = teacherDoc.id;

        await updateDoc(doc(db, "timetable", d.id), {
          teacherUid,
        });
        console.log(`Updated timetable ${d.id} with teacherUid ${teacherUid}`);
      } else {
        console.log(`No teacher found for name: ${data.teacherName}`);
      }
    }
  }
}

addTeacherUidToTimetable().catch(console.error);
