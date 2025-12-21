"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useAuth } from "../auth/AuthProvider";
import { db } from "@/lib/firebaseConfig";
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  orderBy,
  updateDoc,
  addDoc,
  serverTimestamp,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  Settings,
  X,
  Calendar,
  Clock,
  BookOpen,
  GraduationCap,
  Send,
  MessageCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

/* ---------------- Types ---------------- */
interface TeacherProfile {
  firstName?: string;
  lastName?: string;
  subject?: string;
  status?: string;
  classActivated?: boolean;
  zoomLink?: string;
  googleClassroomLink?: string;
}

interface TimetableEntry {
  id: string;
  grade: string;
  subject: string;
  day: string;
  time: string;
  duration: number;
  teacherName: string;
  curriculum: "CAPS" | "Cambridge";
}

interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageTime?: any;
  parentName?: string;
  studentName?: string;
  studentId?: string;
  subject?: string;
  unreadCount?: number;
}

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: any;
}

const TeacherDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [activeTab, setActiveTab] = useState<"timetable" | "classroom" | "settings" | "communications">("timetable");
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [loadingTimetable, setLoadingTimetable] = useState(true);

  const [showEditModal, setShowEditModal] = useState(false);
  const [tempZoom, setTempZoom] = useState("");
  const [tempClassroom, setTempClassroom] = useState("");
  const [saving, setSaving] = useState(false);

  // Communications
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /* ---------------- Full Teacher Name ---------------- */
  const teacherFullName = useMemo(() => {
    if (!profile?.firstName || !profile?.lastName) return "";
    return `${profile.firstName} ${profile.lastName}`.trim();
  }, [profile?.firstName, profile?.lastName]);

  /* ---------------- Fetch Teacher Profile ---------------- */
  useEffect(() => {
    if (!user?.uid) return;
    setLoadingProfile(true);

    const unsub = onSnapshot(
      doc(db, "teachers", user.uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as TeacherProfile;
          setProfile(data);
          setTempZoom(data.zoomLink || "");
          setTempClassroom(data.googleClassroomLink || "");
        } else {
          setProfile(null);
        }
        setLoadingProfile(false);
      },
      () => setLoadingProfile(false)
    );

    return () => unsub();
  }, [user?.uid]);

  /* ---------------- Fetch Timetable ---------------- */
  useEffect(() => {
    if (!teacherFullName || !profile?.subject) {
      setTimetable([]);
      setLoadingTimetable(false);
      return;
    }

    setLoadingTimetable(true);

    const q = query(
      collection(db, "timetable"),
      orderBy("day"),
      orderBy("time")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const allEntries = snap.docs.map((d) => ({ id: d.id, ...(d.data() as TimetableEntry) }));
        const filtered = allEntries.filter((entry) => {
          const nameMatch = entry.teacherName.toLowerCase() === teacherFullName.toLowerCase();
          const subjectMatch = entry.subject.toLowerCase() === profile.subject?.toLowerCase();
          return nameMatch || subjectMatch;
        });

        const dayOrder = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const sorted = filtered.sort((a, b) => {
          const dayA = dayOrder.indexOf(a.day);
          const dayB = dayOrder.indexOf(b.day);
          if (dayA !== dayB) return dayA - dayB;
          return a.time.localeCompare(b.time);
        });

        setTimetable(sorted);
        setLoadingTimetable(false);
      },
      (error) => {
        console.error("Timetable error:", error);
        setLoadingTimetable(false);
      }
    );

    return () => unsub();
  }, [teacherFullName, profile?.subject]);

  /* ---------------- Group by Day ---------------- */
  const groupedByDay = useMemo(() => {
    const groups: Record<string, TimetableEntry[]> = {};
    timetable.forEach((entry) => {
      if (!groups[entry.day]) groups[entry.day] = [];
      groups[entry.day].push(entry);
    });
    return Object.entries(groups);
  }, [timetable]);

  /* ---------------- Fetch Conversations (MATCH PARENT LOGIC) ---------------- */
  useEffect(() => {
    if (!user?.uid || activeTab !== "communications") return;

    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", user.uid)
    );

    const unsub = onSnapshot(q, async (snap) => {
      const convs: Conversation[] = [];

      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        const parentId = data.participants.find((p: string) => p !== user.uid);
        if (!parentId) continue;

        // Fetch parent name
        const parentDoc = await getDoc(doc(db, "parents", parentId));
        const parentName = parentDoc.exists()
          ? `${parentDoc.data().title || ""} ${parentDoc.data().name || parentDoc.data().parentName || ""}`.trim()
          : "Unknown Parent";

        // Fetch student info from conversation or students collection
        let studentName = "Unknown Student";
        let studentId = data.studentId;
        let subject = data.subject;

        if (studentId) {
          const studentDoc = await getDoc(doc(db, "students", studentId));
          if (studentDoc.exists()) {
            const sData = studentDoc.data();
            studentName = `${sData.firstName} ${sData.lastName}`;
          }
        }

        // Count unread messages
        const messagesQ = query(
          collection(db, "conversations", docSnap.id, "messages"),
          where("sender", "!=", user.uid),
          orderBy("timestamp", "desc")
        );
        const msgSnap = await getDocs(messagesQ);
        const unreadCount = msgSnap.size;

        convs.push({
          id: docSnap.id,
          participants: data.participants,
          lastMessage: data.lastMessage,
          lastMessageTime: data.lastMessageTime,
          parentName,
          studentName,
          studentId,
          subject,
          unreadCount,
        });
      }

      // Sort by last message time
      convs.sort((a, b) => {
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
        return b.lastMessageTime.toMillis() - a.lastMessageTime.toMillis();
      });

      setConversations(convs);
    });

    return () => unsub();
  }, [user?.uid, activeTab]);

  /* ---------------- Fetch Messages for Selected Conv ---------------- */
  useEffect(() => {
    if (!selectedConv) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, "conversations", selectedConv.id, "messages"),
      orderBy("timestamp", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Message),
      }));
      setMessages(msgs);
      setTimeout(scrollToBottom, 100);
    });

    return () => unsub();
  }, [selectedConv]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  /* ---------------- Send Message ---------------- */
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConv || sending) return;

    setSending(true);
    try {
      const msgRef = await addDoc(
        collection(db, "conversations", selectedConv.id, "messages"),
        {
          text: newMessage.trim(),
          sender: user.uid,
          timestamp: serverTimestamp(),
        }
      );

      await updateDoc(doc(db, "conversations", selectedConv.id), {
        lastMessage: newMessage.trim(),
        lastMessageTime: serverTimestamp(),
      });

      setNewMessage("");
    } catch (err) {
      console.error("Send error:", err);
      alert("Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  /* ---------------- Save Settings ---------------- */
  const handleSaveSettings = async () => {
    if (!user?.uid) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "teachers", user.uid), {
        zoomLink: tempZoom || null,
        googleClassroomLink: tempClassroom || null,
      });
      setShowEditModal(false);
    } catch (err) {
      console.error("Error:", err);
      alert("Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  /* ---------------- Logout ---------------- */
  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  /* ---------------- Guards ---------------- */
  if (!user) return <div className="min-h-screen flex items-center justify-center">Please sign in.</div>;
  if (loadingProfile) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin mr-2" /> Loading...</div>;
  if (!profile) return <div className="min-h-screen flex items-center justify-center text-red-600">No profile found.</div>;
  if (profile.status !== "approved" || !profile.classActivated) return <div className="min-h-screen flex items-center justify-center text-yellow-600">Pending approval.</div>;

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 flex justify-between items-center py-4">
          <div>
            <h1 className="text-xl font-bold text-blue-700">{profile.firstName} {profile.lastName}</h1>
            <p className="text-gray-600 text-sm">Subject: <span className="font-medium">{profile.subject}</span></p>
          </div>
          <Button onClick={handleLogout} className="bg-red-600 hover:bg-red-700">Logout</Button>
        </div>

        {/* Tabs */}
        <div className="flex justify-center space-x-2 md:space-x-4 border-t bg-gray-100 py-2 overflow-x-auto">
          {["timetable", "classroom", "communications", "settings"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-3 md:px-4 py-2 rounded transition capitalize text-sm md:text-base ${
                activeTab === tab ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-200"
              }`}
            >
              {tab === "communications" ? "Chat" : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto w-full flex-grow p-4 md:p-6">
        {/* TIMETABLE */}
        {activeTab === "timetable" && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-blue-700">My Weekly Schedule</h2>
            {loadingTimetable ? (
              <div className="text-center py-8"><Loader2 className="animate-spin mx-auto" /></div>
            ) : groupedByDay.length === 0 ? (
              <p className="text-center text-gray-500 italic py-8">No classes scheduled.</p>
            ) : (
              groupedByDay.map(([day, slots]) => (
                <div key={day} className="bg-white rounded-lg shadow-sm border p-4">
                  <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                    <Calendar className="w-5 h-5" /> {day}
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {slots.map((slot) => (
                      <Card key={slot.id} className={`p-4 border-l-4 ${slot.curriculum === "CAPS" ? "border-green-500 bg-green-50" : "border-blue-500 bg-blue-50"}`}>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 font-semibold"><BookOpen className="w-4 h-4" /> {slot.subject}</div>
                          <div className="flex items-center gap-2 text-sm text-gray-700"><GraduationCap className="w-4 h-4" /> {slot.grade}</div>
                          <div className="flex items-center gap-2 text-sm text-gray-700"><Clock className="w-4 h-4" /> {slot.time} ({slot.duration} min)</div>
                          <div className="mt-1"><span className={`px-2 py-0.5 text-xs rounded-full text-white ${slot.curriculum === "CAPS" ? "bg-green-600" : "bg-blue-600"}`}>{slot.curriculum}</span></div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          {profile.zoomLink && <a href={profile.zoomLink} target="_blank" rel="noopener noreferrer"><Button size="sm" className="bg-blue-600 text-xs">Zoom</Button></a>}
                          {profile.googleClassroomLink && <a href={profile.googleClassroomLink} target="_blank" rel="noopener noreferrer"><Button size="sm" className="bg-green-600 text-xs">Classroom</Button></a>}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* CLASSROOM */}
        {activeTab === "classroom" && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Classroom Links</h2>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                <div><p className="font-medium">Zoom Meeting</p><p className="text-sm text-gray-600">Start or join live classes.</p></div>
                <Button onClick={() => profile.zoomLink ? window.open(profile.zoomLink, "_blank") : alert("No link")} className="bg-blue-600">Join Zoom</Button>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                <div><p className="font-medium">Google Classroom</p><p className="text-sm text-gray-700">Assignments and grades.</p></div>
                <Button onClick={() => profile.googleClassroomLink ? window.open(profile.googleClassroomLink, "_blank") : alert("No link")} className="bg-green-600">Open Classroom</Button>
              </div>
            </div>
          </Card>
        )}

        {/* COMMUNICATIONS */}
        {activeTab === "communications" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
            {/* Chat List */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" /> Parent Chats
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-96">
                  {conversations.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No messages yet.</p>
                  ) : (
                    conversations.map((conv) => (
                      <div
                        key={conv.id}
                        onClick={() => setSelectedConv(conv)}
                        className={`p-3 border-b cursor-pointer hover:bg-gray-50 transition ${selectedConv?.id === conv.id ? "bg-blue-50" : ""}`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{conv.parentName}</p>
                            <p className="text-xs text-gray-600">{conv.studentName} • {conv.subject}</p>
                            <p className="text-xs text-gray-500 truncate mt-1">{conv.lastMessage || "No messages"}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {conv.unreadCount! > 0 && (
                              <span className="bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                                {conv.unreadCount}
                              </span>
                            )}
                            {conv.lastMessageTime && (
                              <p className="text-xs text-gray-400">
                                {new Date(conv.lastMessageTime.toDate()).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Chat Window */}
            <Card className="lg:col-span-2 flex flex-col">
              {selectedConv ? (
                <>
                  <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-lg">{selectedConv.parentName}</CardTitle>
                        <p className="text-sm text-gray-600">{selectedConv.studentName} • {selectedConv.subject}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 p-0 flex flex-col">
                    <ScrollArea className="flex-1 p-4">
                      {messages.length === 0 ? (
                        <p className="text-center text-gray-400 py-8">Start the conversation!</p>
                      ) : (
                        messages.map((msg) => {
                          const isMe = msg.sender === user.uid;
                          const time = msg.timestamp
                            ? new Date(msg.timestamp.toDate()).toLocaleString("en-ZA", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Sending...";

                          return (
                            <div
                              key={msg.id}
                              className={`mb-3 flex ${isMe ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-xs px-4 py-2 rounded-lg shadow-sm ${
                                  isMe
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-100 border text-gray-800"
                                }`}
                              >
                                <p className="text-sm">{msg.text}</p>
                                <p className={`text-xs mt-1 ${isMe ? "text-blue-100" : "text-gray-500"}`}>
                                  {time}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </ScrollArea>
                    <div className="border-t p-3 flex gap-2 bg-white">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                        placeholder="Type a message..."
                        className="flex-1"
                      />
                      <Button onClick={sendMessage} disabled={sending || !newMessage.trim()} className="bg-blue-600 hover:bg-blue-700">
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <p>Select a conversation to start chatting.</p>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* SETTINGS */}
        {activeTab === "settings" && (
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Account Settings</h2>
              <Button onClick={() => setShowEditModal(true)} className="flex items-center gap-1 bg-blue-600">
                <Settings className="w-4 h-4" /> Edit Links
              </Button>
            </div>
            <div className="space-y-3 text-gray-700">
              <p><strong>Name:</strong> {profile.firstName} {profile.lastName}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Subject:</strong> {profile.subject}</p>
              <p><strong>Zoom:</strong> {profile.zoomLink ? <a href={profile.zoomLink} target="_blank" className="text-blue-600 underline">{profile.zoomLink}</a> : <span className="text-gray-500">Not set</span>}</p>
              <p><strong>Classroom:</strong> {profile.googleClassroomLink ? <a href={profile.googleClassroomLink} target="_blank" className="text-green-600 underline">{profile.googleClassroomLink}</a> : <span className="text-gray-500">Not set</span>}</p>
            </div>
          </Card>
        )}
      </div>

      {/* EDIT MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-blue-700">Update Links</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-red-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Zoom Link</label>
                <input type="url" value={tempZoom} onChange={(e) => setTempZoom(e.target.value)} placeholder="https://zoom.us/j/..." className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Google Classroom</label>
                <input type="url" value={tempClassroom} onChange={(e) => setTempClassroom(e.target.value)} placeholder="https://classroom.google.com/..." className="w-full border rounded-lg px-3 py-2" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button onClick={() => setShowEditModal(false)} variant="secondary">Cancel</Button>
              <Button onClick={handleSaveSettings} disabled={saving} className="bg-blue-600">
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;