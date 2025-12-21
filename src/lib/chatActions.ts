import { db } from "@/lib/firebaseConfig";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

export interface Message {
  id: string;
  sender: string;
  recipient: string;
  text: string;
  createdAt: any;
}

// ---------------- Send a message ----------------
export async function sendMessage(
  sender: string,
  recipient: string,
  text: string
) {
  if (!sender) throw new Error("Sender not authenticated.");
  if (!recipient) throw new Error("Recipient not provided.");
  if (!text.trim()) return;

  await addDoc(collection(db, "messages"), {
    sender,
    recipient,
    text,
    createdAt: serverTimestamp(),
  });
}

// ---------------- Subscribe to chat messages ----------------
export function subscribeToMessages(
  principalUid: string,
  chatTo: string,
  callback: (messages: Message[]) => void
) {
  const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message));
    callback(
      msgs.filter(
        (m) =>
          m.sender === principalUid ||
          m.recipient === principalUid ||
          m.sender === chatTo ||
          m.recipient === chatTo
      )
    );
  });
}
