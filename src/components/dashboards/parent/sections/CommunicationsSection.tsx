"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
  updateDoc,
  getDocs,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { useAuth } from "@/components/auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  X,
  ChevronDown,
  ChevronRight,
  Send,
} from "lucide-react";
import ChatWidget from "@/components/chat/ChatWidget";

/* ======================================================
   TYPES
====================================================== */

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  subjects?: string[];
}

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: any;
  readBy: string[];
}

interface Conversation {
  id: string;
  label: string;
  teacherId: string;
  studentId: string;
  subject: string;
  participants: string[];
  type: "teacher";
}

/* ======================================================
   COMPONENT
====================================================== */

export default function CommunicationsSection() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [students, setStudents] = useState<Student[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const messagesEndRefs = useRef<Record<string, HTMLDivElement | null>>({});

  /* ======================================================
     FETCH STUDENTS + MATCH TEACHERS
     (Optimized + Safe Matching)
  ====================================================== */
  useEffect(() => {
    if (!user?.uid) return;

    const run = async () => {
      try {
        setLoading(true);

        /* ---------------------------------------------
           1️⃣ Fetch Students For This Parent
        --------------------------------------------- */
        const studentSnap = await getDocs(
          query(
            collection(db, "students"),
            where("parentId", "==", user.uid)
          )
        );

        const studentList: Student[] = studentSnap.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Student),
        }));

        setStudents(studentList);

        if (studentList.length === 0) {
          setConversations([]);
          return;
        }

        /* ---------------------------------------------
           2️⃣ Fetch Approved Teachers ONCE
        --------------------------------------------- */
        const teacherSnap = await getDocs(
          query(
            collection(db, "teacherApplications"),
            where("status", "==", "approved")
          )
        );

        if (teacherSnap.empty) {
          setConversations([]);
          return;
        }

        const teachers = teacherSnap.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as any),
        }));

        /* ---------------------------------------------
           3️⃣ Match Subjects (Smart Includes Matching)
           Handles:
           - "Coding"
           - "Coding, AI & Robotics"
           - "British Curriculum Primary Mathematics"
        --------------------------------------------- */
        const convMap = new Map<string, Conversation>();

        for (const student of studentList) {
          const studentSubjects = student.subjects || [];

          for (const subject of studentSubjects) {
            const normalizedStudentSubject = subject.toLowerCase().trim();

            const matchedTeacher = teachers.find(teacher =>
              (teacher.subjects || []).some((s: any) => {
                const teacherSubject =
                  s.name?.toLowerCase().trim() || "";

                return (
                  teacherSubject.includes(normalizedStudentSubject) ||
                  normalizedStudentSubject.includes(teacherSubject)
                );
              })
            );

            if (!matchedTeacher) continue;

            const teacherId =
              matchedTeacher.uid || matchedTeacher.id;

            /* ---------------------------------------------
               4️⃣ Generate Unique Conversation ID
            --------------------------------------------- */
            const convId = `${user.uid}_${teacherId}_${student.id}_${subject.replace(/\s+/g, "_")}`;

            if (!convMap.has(convId)) {
              convMap.set(convId, {
                id: convId,
                label: `${subject} Teacher (${student.firstName})`,
                teacherId,
                studentId: student.id,
                subject,
                participants: [user.uid, teacherId],
                type: "teacher",
              });
            }
          }
        }

        setConversations(Array.from(convMap.values()));
      } catch (err) {
        console.error("Error loading communications:", err);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [user?.uid]);

  /* ======================================================
     REAL-TIME MESSAGE LISTENER
  ====================================================== */
  useEffect(() => {
    if (!user?.uid || conversations.length === 0) return;

    const unsubs: Unsubscribe[] = [];

    conversations.forEach(conv => {
      const q = query(
        collection(db, "conversations", conv.id, "messages"),
        orderBy("timestamp", "asc")
      );

      const unsub = onSnapshot(q, snap => {
        const list = snap.docs.map(d => ({
          id: d.id,
          ...(d.data() as Message),
        }));

        setMessages(prev => ({
          ...prev,
          [conv.id]: list,
        }));
      });

      unsubs.push(unsub);
    });

    return () => unsubs.forEach(u => u());
  }, [conversations, user?.uid]);

  /* ======================================================
     MARK MESSAGES AS READ
  ====================================================== */
  useEffect(() => {
    if (!activeConv || !user?.uid) return;

    const currentMessages = messages[activeConv] || [];

    currentMessages.forEach(msg => {
      if (!msg.readBy?.includes(user.uid)) {
        updateDoc(
          doc(db, "conversations", activeConv, "messages", msg.id),
          {
            readBy: [...(msg.readBy || []), user.uid],
          }
        );
      }
    });
  }, [activeConv, messages, user?.uid]);

  /* ======================================================
     SEND MESSAGE
  ====================================================== */
  const sendMessage = async (conv: Conversation) => {
    if (!newMessage.trim() || !user?.uid || sending) return;

    setSending(true);

    try {
      const convRef = doc(db, "conversations", conv.id);
      const text = newMessage.trim();

      /* Create / Update Conversation Metadata */
      await setDoc(
        convRef,
        {
          participants: conv.participants,
          lastMessage: text,
          lastMessageTime: serverTimestamp(),
          type: "teacher",
          label: conv.label,
        },
        { merge: true }
      );

      /* Add Message */
      await addDoc(collection(convRef, "messages"), {
        text,
        sender: user.uid,
        readBy: [user.uid],
        timestamp: serverTimestamp(),
      });

      setNewMessage("");
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  if (loading)
    return <p className="p-6 text-center">Loading chats…</p>;

  /* ======================================================
     UI
  ====================================================== */
  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center border-b pb-3">
        <button
          onClick={() => navigate(-1)}
          className="flex gap-1 text-gray-600"
        >
          <ArrowLeft size={18} /> Back
        </button>
        <button onClick={() => navigate("/parent-dashboard")}>
          <X size={18} />
        </button>
      </div>

      <h1 className="text-2xl font-bold text-center">
        Communications
      </h1>

      {/* CONVERSATIONS LIST */}
      <div className="space-y-4">
        {conversations.length === 0 ? (
          <p className="text-center text-gray-500 py-10">
            No active teacher contacts found.
          </p>
        ) : (
          conversations.map(conv => {
            const msgs = messages[conv.id] || [];
            const unread = msgs.filter(
              m => !m.readBy?.includes(user!.uid)
            ).length;

            return (
              <div
                key={conv.id}
                className="border rounded-lg overflow-hidden shadow-sm"
              >
                <button
                  onClick={() =>
                    setActiveConv(
                      activeConv === conv.id ? null : conv.id
                    )
                  }
                  className="w-full flex justify-between items-center px-4 py-4 bg-white hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-800">
                      {conv.label}
                    </span>
                    {unread > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {unread} NEW
                      </span>
                    )}
                  </div>
                  {activeConv === conv.id ? (
                    <ChevronDown size={20} />
                  ) : (
                    <ChevronRight size={20} />
                  )}
                </button>

                {activeConv === conv.id && (
                  <div className="p-4 bg-gray-50 border-t space-y-4">
                    <div className="max-h-80 overflow-y-auto space-y-3">
                      {msgs.map(m => (
                        <div
                          key={m.id}
                          className={`flex ${
                            m.sender === user?.uid
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <div
                            className={`text-sm p-3 rounded-2xl max-w-[80%] ${
                              m.sender === user?.uid
                                ? "bg-indigo-600 text-white"
                                : "bg-white border"
                            }`}
                          >
                            {m.text}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 bg-white p-2 rounded-lg border">
                      <input
                        value={newMessage}
                        onChange={e =>
                          setNewMessage(e.target.value)
                        }
                        onKeyDown={e =>
                          e.key === "Enter" &&
                          sendMessage(conv)
                        }
                        className="flex-1 px-2 py-1 text-sm"
                        placeholder="Type your message..."
                      />
                      <button
                        disabled={
                          sending || !newMessage.trim()
                        }
                        onClick={() => sendMessage(conv)}
                        className="bg-indigo-600 text-white p-2 rounded-full disabled:opacity-50"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {user && (
        <ChatWidget
          parentId={user.uid}
          parentName={user.email || "Parent"}
          forceOpen={false}
        />
      )}
    </div>
  );
}
