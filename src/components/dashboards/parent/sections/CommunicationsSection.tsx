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

// Fallback constants if they aren't imported
const ADMIN_UID = "admin_user_id"; // Replace with your actual Admin UID
const PRINCIPAL_UID = "principal_user_id"; // Replace with your actual Principal UID

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
  teacherId?: string;
  studentId?: string;
  subject?: string;
  participants: string[];
  type: "teacher" | "admin" | "principal"; 
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
     FETCH STUDENTS + BUILD TEACHER CONVERSATIONS
  ===================================================== */
  useEffect(() => {
    if (!user?.uid) return;

    const run = async () => {
      try {
        const studentSnap = await getDocs(
          query(collection(db, "students"), where("parentId", "==", user.uid))
        );

        const studentList = studentSnap.docs.map(d => ({
          id: d.id,
          ...(d.data() as Student),
        }));

        setStudents(studentList);

        const convs: Conversation[] = [];

        for (const student of studentList) {
          for (const subject of student.subjects || []) {
            // Using array-contains in case teacher has multiple subjects
            const teacherSnap = await getDocs(
              query(
                collection(db, "teachers"),
                where("approved", "==", true),
                where("subjects", "array-contains", subject) 
              )
            );

            if (teacherSnap.empty) continue;

            const teacherId = teacherSnap.docs[0].id;
            const convId = `${user.uid}_${teacherId}_${student.id}`;

            convs.push({
              id: convId,
              label: `${subject} Teacher (${student.firstName})`,
              teacherId,
              studentId: student.id,
              subject,
              participants: [user.uid, teacherId],
              type: "teacher" // Assigned type correctly
            });
          }
        }

        setConversations(convs);
      } catch (err) {
        console.error("Error fetching communication data:", err);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [user?.uid]);

  /* ======================================================
     REAL-TIME MESSAGES
  ===================================================== */
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
        setMessages(prev => ({ ...prev, [conv.id]: list }));
      });

      unsubs.push(unsub);
    });

    return () => unsubs.forEach(u => u());
  }, [conversations, user?.uid]);

  /* ======================================================
     MARK AS READ
  ===================================================== */
  useEffect(() => {
    if (!activeConv || !user?.uid) return;

    const currentMessages = messages[activeConv] || [];
    currentMessages.forEach(msg => {
      if (!msg.readBy.includes(user.uid)) {
        updateDoc(
          doc(db, "conversations", activeConv, "messages", msg.id),
          { readBy: [...msg.readBy, user.uid] }
        );
      }
    });
  }, [activeConv, messages, user?.uid]);

  /* ======================================================
     SEND MESSAGE
  ===================================================== */
  const sendMessage = async (conv: Conversation) => {
    if (!newMessage.trim() || !user?.uid || sending) return;

    setSending(true);
    try {
      const convRef = doc(db, "conversations", conv.id);
      const text = newMessage.trim();

      // 1. Update/Create Conversation Metadata
      await setDoc(
        convRef,
        {
          participants: conv.participants,
          lastMessage: text,
          lastMessageTime: serverTimestamp(),
          type: conv.type,
          label: conv.label
        },
        { merge: true }
      );

      // 2. Add Message to Subcollection
      await addDoc(collection(convRef, "messages"), {
        text: text,
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

  if (loading) return <p className="p-6 text-center">Loading chats…</p>;

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center border-b pb-3">
        <button onClick={() => navigate(-1)} className="flex gap-1 text-gray-600">
          <ArrowLeft size={18} /> Back
        </button>
        <button onClick={() => navigate("/parent-dashboard")}>
          <X size={18} />
        </button>
      </div>

      <h1 className="text-2xl font-bold text-center">Communications</h1>

      <div
        onClick={() => navigate("/parent-dashboard")}
        className="cursor-pointer rounded-lg px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium"
      >
        📢 Check school announcements in <strong>Overview</strong>
      </div>

      {/* CONVERSATIONS LIST */}
      <div className="space-y-4">
        {conversations.length === 0 ? (
          <p className="text-center text-gray-500 py-10">No active teacher contacts found.</p>
        ) : (
          conversations.map(conv => {
            const msgs = messages[conv.id] || [];
            const unread = msgs.filter(m => !m.readBy.includes(user!.uid)).length;

            return (
              <div key={conv.id} className="border rounded-lg overflow-hidden shadow-sm">
                <button
                  onClick={() => setActiveConv(activeConv === conv.id ? null : conv.id)}
                  className="w-full flex justify-between items-center px-4 py-4 bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-800">{conv.label}</span>
                    {unread > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {unread} NEW
                      </span>
                    )}
                  </div>
                  {activeConv === conv.id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </button>

                {activeConv === conv.id && (
                  <div className="p-4 bg-gray-50 border-t space-y-4">
                    <div className="max-h-80 overflow-y-auto space-y-3 p-2">
                      {msgs.map(m => (
                        <div
                          key={m.id}
                          className={`flex ${m.sender === user?.uid ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`text-sm p-3 rounded-2xl max-w-[80%] shadow-sm ${
                              m.sender === user?.uid
                                ? "bg-indigo-600 text-white rounded-tr-none"
                                : "bg-white text-gray-800 border rounded-tl-none"
                            }`}
                          >
                            {m.text}
                          </div>
                        </div>
                      ))}
                      <div ref={el => (messagesEndRefs.current[conv.id] = el)} />
                    </div>

                    <div className="flex gap-2 bg-white p-2 rounded-lg border shadow-inner">
                      <input
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage(conv)}
                        className="flex-1 bg-transparent border-none focus:ring-0 px-2 py-1 text-sm"
                        placeholder="Type your message..."
                      />
                      <button
                        disabled={sending || !newMessage.trim()}
                        onClick={() => sendMessage(conv)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-full transition-colors disabled:opacity-50"
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