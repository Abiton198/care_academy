import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";

export async function getParentInfo(parentId: string) {
  const ref = doc(db, "users", parentId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  const data = snap.data();

  return {
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
  };
}
