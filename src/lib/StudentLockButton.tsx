import { useEffect, useState } from "react";
import { doc, onSnapshot, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Eye } from "lucide-react";

interface Props {
  studentId: string;
}

export const StudentLockButton = ({ studentId }: Props) => {
  const [locked, setLocked] = useState(false);
  const [studentName, setStudentName] = useState("");

  useEffect(() => {
    const studentRef = doc(db, "students", studentId);

    const unsubscribe = onSnapshot(studentRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setLocked(data.dashboardLocked || false);
        setStudentName(`${data.firstName} ${data.lastName}`);
      }
    });

    return () => unsubscribe();
  }, [studentId]);

  const toggleLock = async () => {
    const willLock = !locked;
    if (!window.confirm(`${willLock ? "Lock" : "Unlock"} dashboard for ${studentName}?`)) return;

    try {
      const studentRef = doc(db, "students", studentId);
      await updateDoc(studentRef, {
        dashboardLocked: willLock,
        lockReason: willLock ? "fees" : null,
        lockedBy: willLock ? "principal" : null,
        lockedAt: willLock ? serverTimestamp() : null,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Lock toggle failed:", err);
      alert("Unable to update student access.");
    }
  };

  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={toggleLock}
      title={locked ? "Unlock dashboard" : "Lock dashboard"}
      className={`h-8 w-8 rounded-xl ${locked ? "text-rose-600 hover:bg-rose-100" : "text-slate-400 hover:bg-slate-100"}`}
    >
      {locked ? <ShieldCheck size={14} /> : <Eye size={14} />}
    </Button>
  );
};
export default StudentLockButton;