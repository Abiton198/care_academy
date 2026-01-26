import bcrypt from "bcryptjs";
import { db } from "@/lib/firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";

export async function studentLogin(username: string, password: string) {
  const q = query(
    collection(db, "students"),
    where("username", "==", username.toLowerCase()),
    where("active", "==", true)
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error("Invalid username or password");
  }

  const studentDoc = snap.docs[0];
  const student = studentDoc.data();

  const valid = await bcrypt.compare(password, student.passwordHash);

  if (!valid) {
    throw new Error("Invalid username or password");
  }

  return {
    id: studentDoc.id,
    firstName: student.firstName,
    lastName: student.lastName,
    grade: student.grade,
    parentId: student.parentId,
  };
}
