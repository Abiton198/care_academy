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
  getDoc,
  getDocs,
  where,
} from "firebase/firestore";
import { Send, X } from "lucide-react";

/* ===========================================================
   INTERFACES
   =========================================================== */
interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: any;
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  subjects: string[];
  grade?: string;
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
  const [chatOpen, setChatOpen] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState<string>("Teacher");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const typingTimeout = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /* ──────────────────────────────────────────────────────
     FETCH STUDENTS & SUBJECTS
     ────────────────────────────────────────────────────── */
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        let q = query(collection(db, "students"), where("parentId", "==", parentId));
        let snap = await getDocs(q);

        if (snap.empty) {
          q = query(collection(db, "students"), where("linkedParentId", "==", parentId));
          snap = await getDocs(q);
        }

        if (snap.empty && parentName.includes("@")) {
          q = query(collection(db, "students"), where("linkedParentEmail", "==", parentName));
          snap = await getDocs(q);
        }

        const studentList = snap.docs.map((d) => ({
          id: d.id,
          firstName: d.data().firstName || "Student",
          lastName: d.data().lastName || "",
          subjects: d.data().subjects || [],
          grade: d.data().grade || "",
        } as Student));

        setStudents(studentList);
      } catch (err) {
        console.error("Error fetching students:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [parentId, parentName]);

  /* ──────────────────────────────────────────────────────
     SELECT SUBJECT + STUDENT → FIND TEACHER
     ────────────────────────────────────────────────────── */
  const selectSubject = async (subject: string, studentId: string) => {
    setSelectedSubject(subject);
    setSelectedStudentId(studentId);
    setMessages([]);
    setTeacherId(null);
    setTeacherName("Loading...");

    try {
      const teacherQ = query(
        collection(db, "teachers"),
        where("subject", "==", subject),
        where("approved", "==", true)
      );
      const teacherSnap = await getDocs(teacherQ);

      if (!teacherSnap.empty) {
        const teacherDoc = teacherSnap.docs[0];
        const data = teacherDoc.data();
        setTeacherId(teacherDoc.id);
        setTeacherName(`${data.firstName || ""} ${data.lastName || ""}`.trim() || "Teacher");
      } else {
        setTeacherName(`${subject} Teacher (Unassigned)`);
      }
    } catch (err) {
      console.error("Error finding teacher:", err);
      setTeacherName(`${subject} Teacher`);
    }
  };

  /* ──────────────────────────────────────────────────────
     CONVERSATION ID: parent_teacher_studentId
     ────────────────────────────────────────────────────── */
  const conversationId = teacherId && selectedStudentId
    ? `${parentId}_${teacherId}_${selectedStudentId}`
    : null;

  /* ──────────────────────────────────────────────────────
     LISTEN TO MESSAGES
     ────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!conversationId) return;

    const q = query(
      collection(db, "conversations", conversationId, "messages"),
      orderBy("timestamp", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message));
      setMessages(msgs);
    }, (err) => {
      console.error("Snapshot error:", err);
    });

    return () => unsub();
  }, [conversationId]);

  /* ──────────────────────────────────────────────────────
     TYPING INDICATOR
     ────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!conversationId || !teacherId) return;

    const typingRef = doc(db, "conversations", conversationId, "typing", teacherId);
    const unsub = onSnapshot(typingRef, (snap) => {
      const data = snap.data();
      setIsTyping(data?.isTyping === true);
    });

    return () => unsub();
  }, [conversationId, teacherId]);

  const updateTyping = async (isTyping: boolean) => {
    if (!conversationId) return;
    try {
      await setDoc(
        doc(db, "conversations", conversationId, "typing", parentId),
        { isTyping, updatedAt: serverTimestamp() },
        { merge: true }
      );
    } catch (err) {
      console.error("Typing update failed:", err);
    }
  };

  const handleTyping = (val: string) => {
    setMessage(val);
    if (!typingTimeout.current && val.trim()) {
      updateTyping(true);
    }

    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      updateTyping(false);
      typingTimeout.current = null;
    }, 1500);
  };

  /* ──────────────────────────────────────────────────────
     SEND MESSAGE – FIXED
     ────────────────────────────────────────────────────── */
  const sendMessage = async () => {
    if (!message.trim() || !conversationId || !teacherId || sending) return;

    setSending(true);
    const convRef = doc(db, "conversations", conversationId);

    try {
      // 1. Ensure conversation exists
      const convSnap = await getDoc(convRef);
      if (!convSnap.exists()) {
        await setDoc(convRef, {
          participants: [parentId, teacherId],
          subject: selectedSubject,
          studentId: selectedStudentId,
          lastMessage: message.trim(),
          lastMessageTime: serverTimestamp(),
        });
      } else {
        await setDoc(convRef, {
          lastMessage: message.trim(),
          lastMessageTime: serverTimestamp(),
        }, { merge: true });
      }

      // 2. Add message
      await addDoc(collection(convRef, "messages"), {
        text: message.trim(),
        sender: parentId,
        timestamp: serverTimestamp(),
      });

      setMessage("");
      updateTyping(false);
    } catch (err: any) {
      console.error("Send failed:", err);
      alert(`Failed to send: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  /* ──────────────────────────────────────────────────────
     AUTO-SCROLL
     ────────────────────────────────────────────────────── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ──────────────────────────────────────────────────────
     FORCE OPEN
     ────────────────────────────────────────────────────── */
  useEffect(() => {
    if (forceOpen) setChatOpen(true);
  }, [forceOpen]);

  const toggleChat = () => {
    const newState = !chatOpen;
    setChatOpen(newState);
    if (!newState && onClose) onClose();
  };

  /* ──────────────────────────────────────────────────────
     LOADING
     ────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button className="bg-gray-400 text-white rounded-full p-4 shadow-lg animate-pulse">
          Loading...
        </button>
      </div>
    );
  }

  /* ===========================================================
     UI RENDER
     =========================================================== */
  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={toggleChat}
          className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full p-4 shadow-xl hover:from-green-600 hover:to-emerald-700 transition transform hover:scale-110 flex items-center gap-2"
        >
          Chat
        </button>
      </div>

      {/* Chat Window */}
      {chatOpen && (
        <div className="fixed bottom-20 right-6 w-80 bg-white border-2 border-gray-200 rounded-xl shadow-2xl overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
            <div className="flex items-center gap-2">
              {parentPhoto ? (
                <img src={parentPhoto} alt="" className="w-8 h-8 rounded-full" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center text-xs font-bold">
                  {parentName[0]}
                </div>
              )}
              <div>
                <p className="font-bold text-sm">{parentName}</p>
                {selectedSubject && <p className="text-xs opacity-90">{selectedSubject}</p>}
              </div>
            </div>
            <button onClick={toggleChat} className="text-white hover:opacity-70">
              <X size={18} />
            </button>
          </div>

          {/* Subject Selector */}
          {!selectedSubject && students.length > 0 && (
            <div className="p-3 bg-gray-50 border-b">
              <p className="text-sm font-medium text-gray-700 mb-2">Select Subject:</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {students.map((student) =>
                  student.subjects.map((sub) => (
                    <button
                      key={`${student.id}-${sub}`}
                      onClick={() => selectSubject(sub, student.id)}
                      className="w-full text-left px-3 py-2 rounded bg-white border hover:bg-indigo-50 text-sm"
                    >
                      {sub} ({student.firstName})
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Messages */}
          {selectedSubject && (
            <>
              <div className="h-64 overflow-y-auto p-3 space-y-2 bg-gray-50">
                {messages.length === 0 ? (
                  <p className="text-center text-gray-400 text-xs">Start the conversation!</p>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex ${m.sender === parentId ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-xs px-3 py-2 rounded-lg text-sm shadow-sm ${
                          m.sender === parentId
                            ? "bg-blue-600 text-white"
                            : "bg-white border text-gray-800"
                        }`}
                      >
                        <p>{m.text}</p>
                        {m.timestamp && (
                          <p className={`text-xs mt-1 ${m.sender === parentId ? "text-blue-100" : "text-gray-500"}`}>
                            {new Date(m.timestamp.toDate()).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Typing */}
              {isTyping && (
                <p className="text-xs text-green-600 px-3 py-1 italic">
                  {teacherName} is typing...
                </p>
              )}

              {/* Input */}
              <div className="flex gap-2 p-3 border-t bg-white">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={message}
                  onChange={(e) => handleTyping(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={sending}
                />
                <button
                  onClick={sendMessage}
                  disabled={!message.trim() || sending}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 flex items-center gap-1 transition"
                >
                  <Send size={16} />
                  {sending ? "Sending" : "Send"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}