"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebaseConfig";
import {
  collection,
  addDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  where,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { Send, X, Users } from "lucide-react";

/* ===========================================================
   INTERFACES
=========================================================== */
interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: any;
  participants: string[];
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  subjects: string[];
  grade?: string;
}

interface TeacherApplication {
  id: string;
  uid?: string; // The actual Auth UID of the teacher
  personalInfo?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  subjects?: { name: string; curriculum: string }[];
  status?: "pending" | "approved" | "rejected";
}

interface ChatWidgetProps {
  parentId: string;
  parentName: string;
  parentPhoto?: string;
  forceOpen?: boolean;
  onClose?: () => void;
}

/* ===========================================================
   CHAT WIDGET
=========================================================== */
export default function ChatWidget({
  parentId,
  parentName,
  parentPhoto,
  forceOpen,
  onClose,
}: ChatWidgetProps) {
  const auth = getAuth();
  const currentUid = auth.currentUser?.uid;

  const [chatOpen, setChatOpen] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<TeacherApplication[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState<string>("Teacher");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showTeacherDropdown, setShowTeacherDropdown] = useState(false);

  const typingTimeout = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /* 1. FETCH STUDENTS */
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        let q = query(collection(db, "students"), where("parentId", "==", parentId));
        let snap = await getDocs(q);

        if (snap.empty) {
          q = query(collection(db, "students"), where("linkedParentId", "==", parentId));
          snap = await getDocs(q);
        }

        const studentList = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        } as Student));

        setStudents(studentList);
      } catch (err) {
        console.error("Error fetching students:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, [parentId]);

  /* 2. FETCH APPROVED TEACHERS */
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "teacherApplications"), where("status", "==", "approved")),
      (snap) => {
        const teacherList = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as TeacherApplication),
        }));
        setTeachers(teacherList);
      }
    );
    return () => unsub();
  }, []);

  /* 3. SELECT SUBJECT */
  const selectSubject = (subject: string, studentId: string) => {
    setSelectedSubject(subject);
    setSelectedStudentId(studentId);
    setSelectedTeacherId(null);
    setTeacherName("Select Teacher");
    setMessages([]);
    setShowTeacherDropdown(true);
  };

  /* 4. SELECT TEACHER (FIXED: Uses UID) */
  const selectTeacher = (teacher: TeacherApplication) => {
    // We must use the teacher's actual Auth UID for the chat to work with rules
    const teacherUid = teacher.uid || teacher.id; 
    setSelectedTeacherId(teacherUid);
    const name = `${teacher.personalInfo?.firstName || ""} ${teacher.personalInfo?.lastName || ""}`.trim();
    setTeacherName(name || "Teacher");
    setShowTeacherDropdown(false);
  };

  /* 5. CONVERSATION ID */
  const conversationId =
    selectedTeacherId && selectedStudentId
      ? `${currentUid}_${selectedTeacherId}_${selectedStudentId}`
      : null;

  /* 6. LISTEN TO MESSAGES */
  useEffect(() => {
    if (!conversationId) return;
    const q = query(
      collection(db, "conversations", conversationId, "messages"),
      orderBy("timestamp", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message));
      setMessages(msgs);
    });
    return () => unsub();
  }, [conversationId]);

  /* 7. TYPING INDICATOR (FIXED: Existence check) */
  useEffect(() => {
    if (!conversationId || !selectedTeacherId) return;
    const typingRef = doc(db, "conversations", conversationId, "typing", selectedTeacherId);
    const unsub = onSnapshot(typingRef, (snap) => {
      setIsTyping(snap.data()?.isTyping === true);
    });
    return () => unsub();
  }, [conversationId, selectedTeacherId]);

  const updateTyping = async (isTyping: boolean) => {
    if (!conversationId || !currentUid) return;
    // Don't update typing if the conversation document doesn't exist yet
    const convSnap = await getDoc(doc(db, "conversations", conversationId));
    if (!convSnap.exists()) return;

    try {
      await setDoc(
        doc(db, "conversations", conversationId, "typing", currentUid),
        { isTyping, updatedAt: serverTimestamp() },
        { merge: true }
      );
    } catch (err) {
      console.warn("Typing update suppressed.");
    }
  };

  const handleTyping = (val: string) => {
    setMessage(val);
    if (!typingTimeout.current && val.trim()) updateTyping(true);
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      updateTyping(false);
      typingTimeout.current = null;
    }, 1500);
  };

  /* 8. SEND MESSAGE (FIXED: Rules compliance) */
  const sendMessage = async () => {
    if (!message.trim() || !conversationId || sending || !currentUid || !selectedTeacherId) return;

    setSending(true);
    try {
      const convRef = doc(db, "conversations", conversationId);
      const convSnap = await getDoc(convRef);
      const text = message.trim();
      const participants = [currentUid, selectedTeacherId];

      // Ensure parent conversation exists
      if (!convSnap.exists()) {
        await setDoc(convRef, {
          participants: participants,
          subject: selectedSubject,
          studentId: selectedStudentId,
          createdAt: serverTimestamp(),
          lastMessage: text,
          lastMessageTime: serverTimestamp(),
        });
      } else {
        await updateDoc(convRef, {
          lastMessage: text,
          lastMessageTime: serverTimestamp(),
        });
      }

      // Add message with participants array to satisfy security rules
      await addDoc(collection(convRef, "messages"), {
        text: text,
        sender: currentUid,
        participants: participants,
        timestamp: serverTimestamp(),
        readBy: [currentUid],
      });

      setMessage("");
      updateTyping(false);
    } catch (err) {
      console.error("Send failed:", err);
      alert("Permission denied. Ensure you are signed in.");
    } finally {
      setSending(false);
    }
  };

  /* AUTO-SCROLL */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* UI RENDERING */
  if (loading) return null;

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="bg-indigo-600 text-white rounded-full p-4 shadow-2xl hover:bg-indigo-700 transition flex items-center gap-2 font-semibold"
        >
          <Users size={20} /> Chat with Teachers
        </button>
      </div>

      {chatOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[550px] bg-white border rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col">
          {/* Header */}
          <div className="p-4 bg-indigo-600 text-white flex justify-between items-center">
            <div>
              <p className="font-bold">School Support</p>
              {selectedSubject && <p className="text-xs opacity-80">{selectedSubject} • {teacherName}</p>}
            </div>
            <button onClick={() => setChatOpen(false)}><X size={20} /></button>
          </div>

          {/* Selection Screen */}
          {!selectedTeacherId && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Select a Subject</p>
              {students.map(s => s.subjects.map(sub => (
                <button
                  key={`${s.id}-${sub}`}
                  onClick={() => selectSubject(sub, s.id)}
                  className={`w-full text-left p-3 rounded-lg border bg-white hover:border-indigo-500 transition ${selectedSubject === sub ? 'border-indigo-500 ring-1 ring-indigo-500' : ''}`}
                >
                  <p className="font-semibold">{sub}</p>
                  <p className="text-xs text-gray-500">Student: {s.firstName}</p>
                </button>
              )))}

              {selectedSubject && (
                <>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mt-4">Available Teachers</p>
                  {teachers.filter(t => t.subjects?.some(ts => ts.name === selectedSubject)).map(t => (
                    <button
                      key={t.id}
                      onClick={() => selectTeacher(t)}
                      className="w-full text-left p-3 rounded-lg border bg-white hover:bg-green-50 hover:border-green-500 transition"
                    >
                      {t.personalInfo?.firstName} {t.personalInfo?.lastName}
                    </button>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Chat Interface */}
          {selectedTeacherId && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.sender === currentUid ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] p-3 rounded-xl text-sm shadow-sm ${m.sender === currentUid ? "bg-indigo-600 text-white" : "bg-white border"}`}>
                      {m.text}
                    </div>
                  </div>
                ))}
                {isTyping && <p className="text-xs italic text-gray-400">{teacherName} is typing...</p>}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-3 border-t bg-white flex gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={message}
                  onChange={(e) => handleTyping(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={sendMessage}
                  disabled={!message.trim() || sending}
                  className="bg-indigo-600 text-white p-2 rounded-lg disabled:opacity-50"
                >
                  <Send size={18} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}