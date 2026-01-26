import bcrypt from "bcryptjs";
import { db } from "@/lib/firebaseConfig";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export async function createStudent({
  parentUid,
  username,
  password,
  firstName,
  lastName,
  grade,
}: {
  parentUid: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  grade: string;
}) {
  const passwordHash = await bcrypt.hash(password, 10);

  const studentRef = doc(db, "students", crypto.randomUUID());

  await setDoc(studentRef, {
    username: username.toLowerCase(),
    passwordHash,
    firstName,
    lastName,
    grade,
    parentId: parentUid,
    active: true,
    createdAt: serverTimestamp(),
  });
}
