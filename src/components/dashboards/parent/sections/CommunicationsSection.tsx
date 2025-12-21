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
  getDoc,
  setDoc,
  getDocs,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { useAuth } from "@/components/auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, X, ChevronDown, ChevronRight, MessageCircle, School, User, Send, MessageSquare } from "lucide-react";
import ChatWidget from "@/components/chat/ChatWidget";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  subjects?: string[];
  grade?: string;
}

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: any;
}

interface Conversation {
  id: string;
  label: string;
  type: "principal" | "admin" | "teacher";
  subject?: string;
  teacherId?: string;
  studentName?: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: any;
}

export default function CommunicationsSection() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [students, setStudents] = useState<Student[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showWidget, setShowWidget] = useState(false);

  const messagesEndRefs = useRef<Record<string, HTMLDivElement | null>>({});

  /* ---------------- Fetch Students & Build Conversations ---------------- */
  useEffect(() => {
    if (!user?.uid) return;

    const fetchStudents = async () => {
      try {
        let q = query(collection(db, "students"), where("parentId", "==", user.uid));
        let snap = await getDocs(q);

        if (snap.empty) {
          q = query(collection(db, "students"), where("linkedParentId", "==", user.uid));
          snap = await getDocs(q);
        }

        if (snap.empty && user?.email) {
          q = query(collection(db, "students"), where("linkedParentEmail", "==", user.email));
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

        const dynamicConvs: Conversation[] = [
          { id: "principal", label: "Principal", type: "principal" },
          { id: "admin", label: "Admin", type: "admin" },
        ];

        for (const student of studentList) {
          const studentName = `${student.firstName} ${student.lastName}`.trim();

          for (const subject of student.subjects || []) {
            const teacherQ = query(
              collection(db, "teachers"),
              where("subject", "==", subject),
              where("approved", "==", true)
            );
            const teacherSnap = await getDocs(teacherQ);

            const teacherId = !teacherSnap.empty ? teacherSnap.docs[0].id : null;

            const convId = teacherId
              ? `${user.uid}_${teacherId}_${student.id}`
              : `${user.uid}_teacher_${subject}_${student.id}`;

            dynamicConvs.push({
              id: convId,
              label: `${subject} Teacher (${studentName})`,
              type: "teacher",
              subject,
              teacherId,
              studentName,
            });
          }
        }

        const uniqueConvs = Array.from(new Map(dynamicConvs.map(c => [c.id, c])).values());
        setConversations(uniqueConvs);
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [user?.uid, user?.email]);

  /* ---------------- Real-Time Messages ---------------- */
  useEffect(() => {
    if (!user?.uid || conversations.length === 0) return;

    const unsubscribes: Unsubscribe[] = [];

    conversations.forEach((conv) => {
      const messagesRef = collection(db, "conversations", conv.id, "messages");
      const q = query(messagesRef, orderBy("timestamp", "asc"));

      const unsub = onSnapshot(q, (snap) => {
        const msgList = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        } as Message));

        setMessages((prev) => ({
          ...prev,
          [conv.id]: msgList,
        }));

        if (activeConv === conv.id) {
          setTimeout(() => {
            messagesEndRefs.current[conv.id]?.scrollIntoView({ behavior: "smooth" });
          }, 100);
        }
      });

      unsubscribes.push(unsub);
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [user?.uid, conversations, activeConv]);

  /* ---------------- Real-Time Announcements ---------------- */
  useEffect(() => {
    const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Announcement));
      setAnnouncements(list);
    });
    return () => unsub();
  }, []);

  /* ---------------- Send Message ---------------- */
  const sendMessage = async (conv: Conversation) => {
    if (!newMessage.trim() || !user?.uid || sending) return;

    setSending(true);
    try {
      const convRef = doc(db, "conversations", conv.id);

      const convSnap = await getDoc(convRef);
      if (!convSnap.exists()) {
        const participants = conv.teacherId
          ? [user.uid, conv.teacherId]
          : conv.type === "principal"
            ? [user.uid, "principal"]
            : [user.uid, "admin"];

        await setDoc(convRef, {
          participants,
          studentId: conv.studentName
            ? students.find(s => `${s.firstName} ${s.lastName}` === conv.studentName)?.id
            : null,
          subject: conv.subject,
          lastMessage: newMessage.trim(),
          lastMessageTime: serverTimestamp(),
        });
      } else {
        await setDoc(convRef, {
          lastMessage: newMessage.trim(),
          lastMessageTime: serverTimestamp(),
        }, { merge: true });
      }

      await addDoc(collection(convRef, "messages"), {
        text: newMessage.trim(),
        sender: user.uid,
        timestamp: serverTimestamp(),
      });

      setNewMessage("");
    } catch (err) {
      console.error("Send error:", err);
      alert("Failed to send. Try again.");
    } finally {
      setSending(false);
    }
  };

  /* ---------------- Loading ---------------- */
  if (loading) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">Loading your conversations...</p>
      </div>
    );
  }

  /* ---------------- Render ---------------- */
  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6 relative">

      {/* Navigation */}
      <div className="sticky top-0 z-10 bg-white border-b flex justify-between items-center px-2 py-3 mb-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-gray-600 hover:text-black">
          <ArrowLeft size={18} /> Back
        </button>
        <button onClick={() => navigate("/parent-dashboard")} className="text-gray-600 hover:text-red-600">
          <X size={20} />
        </button>
      </div>

      <h1 className="text-2xl font-bold text-gray-800 text-center">Communications Hub</h1>

      {/* Enrolled Students */}
      {students.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm font-medium text-blue-800">
            Enrolled: {students.map(s => `${s.firstName} ${s.lastName} (${s.grade || "N/A"})`).join(" | ")}
          </p>
        </div>
      )}

      {/* Conversations */}
      <div className="space-y-3">
        {conversations.length === 0 ? (
          <p className="text-center text-gray-500">No subjects enrolled. Register a student to start.</p>
        ) : (
          conversations.map((conv) => {
            const convMessages = messages[conv.id] || [];
            const isActive = activeConv === conv.id;

            return (
              <div key={conv.id} className="border rounded-lg bg-white shadow-sm overflow-hidden">
                <button
                  onClick={() => setActiveConv(isActive ? null : conv.id)}
                  className="w-full flex justify-between items-center px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition"
                >
                  <div className="flex items-center gap-2">
                    {conv.type === "principal" && <School className="w-5 h-5 text-indigo-600" />}
                    {conv.type === "admin" && <User className="w-5 h-5 text-green-600" />}
                    {conv.type === "teacher" && <MessageCircle className="w-5 h-5 text-purple-600" />}
                    <span className="font-semibold text-gray-800">{conv.label}</span>
                    {convMessages.length > 0 && (
                      <span className="ml-auto text-xs text-gray-500">
                        {convMessages.length} message{convMessages.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  {isActive ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </button>

                {isActive && (
                  <div className="p-4 space-y-3 border-t">
                    <div className="max-h-64 overflow-y-auto space-y-3 p-3 bg-gray-50 rounded-lg border">
                      {convMessages.length > 0 ? (
                        convMessages.map((msg) => {
                          const isMe = msg.sender === user?.uid;
                          const time = msg.timestamp
                            ? new Date(msg.timestamp.toDate()).toLocaleString("en-ZA", {
                                hour: "2-digit",
                                minute: "2-digit",
                                day: "numeric",
                                month: "short",
                              })
                            : "Sending...";

                          return (
                            <div
                              key={msg.id}
                              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-xs px-3 py-2 rounded-lg text-sm shadow-sm ${
                                  isMe
                                    ? "bg-blue-600 text-white"
                                    : "bg-white border text-gray-800"
                                }`}
                              >
                                <p>{msg.text}</p>
                                <p className={`text-xs mt-1 ${isMe ? "text-blue-100" : "text-gray-500"}`}>
                                  {time}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-center text-gray-500">Start the conversation!</p>
                      )}
                      <div ref={el => (messagesEndRefs.current[conv.id] = el)} />
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={`Message ${conv.label.split(" (")[0]}...`}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(conv)}
                        className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={sending}
                      />
                      <button
                        onClick={() => sendMessage(conv)}
                        disabled={!newMessage.trim() || sending}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-1 transition"
                      >
                        <Send size={16} />
                        {sending ? "Sending" : "Send"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Announcements */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5 shadow-md">
        <h2 className="text-lg font-bold text-green-800 mb-3 flex items-center gap-2">
          <School className="w-5 h-5" /> School Announcements
        </h2>
        <div className="space-y-3">
          {announcements.length > 0 ? (
            announcements.map((a) => (
              <div key={a.id} className="bg-white rounded-lg p-3 border shadow-sm">
                <p className="font-semibold text-gray-800">{a.title}</p>
                <p className="text-sm text-gray-700 mt-1">{a.content}</p>
                {a.createdAt && (
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(a.createdAt.toDate()).toLocaleDateString("en-ZA", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center">No announcements.</p>
          )}
        </div>
      </div>

      {/* Floating Chat Widget Button */}
      <button
        onClick={() => setShowWidget(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full p-4 shadow-xl hover:from-green-600 hover:to-emerald-700 transition transform hover:scale-110 z-50 flex items-center gap-2"
      >
        <MessageSquare size={20} />
        Chat
      </button>

      {/* Chat Widget (Uses same conversations) */}
      {showWidget && (
        <ChatWidget
          parentId={user?.uid!}
          parentName={user?.displayName || "Parent"}
          parentPhoto={user?.photoURL}
          forceOpen={true}
          onClose={() => setShowWidget(false)}
        />
      )}

      <p className="text-center text-xs text-gray-500 mt-6">
        Need help? Call support: <strong>(+27) 65 656 4983</strong>
      </p>
    </div>
  );
}