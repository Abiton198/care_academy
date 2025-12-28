"use client";

import React, { useEffect, useState, useRef } from "react";
import { db } from "@/lib/firebaseConfig";
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  updateDoc,
  serverTimestamp,
  getDocs,
  orderBy,
  addDoc,
  setDoc,
  arrayUnion,
  getDoc,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged, signOut, User } from "firebase/auth";
import { useNavigate } from "react-router-dom";

/* UI Components */
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/* Icons */
import {
  Loader2, LogOut, Edit2, Save, ExternalLink, Calendar, Clock, Video,
  Link, Check, X, Sparkles, BookOpen, Send, MessageCircle, Users
} from "lucide-react";

/* ======================================================
   TYPES
====================================================== */
interface TeacherProfile {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  bio?: string;
  subjects?: { name: string; curriculum: string }[];
  status?: "pending" | "approved" | "rejected";
}

interface TimetableSlot {
  id: string;
  day: string;
  time: string;
  subject: string;
  grade: string;
  curriculum: string;
  zoomLink?: string;
  classroomLink?: string;
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  parentId: string;
  linkedParentId?: string;
  subjects: string[];
  grade?: string;
}

interface Conversation {
  id: string;
  participants: string[];
  subject: string;
  lastMessage: string;
  lastMessageTime: any;
  studentId: string;
}

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: any;
  readBy: string[];
  participants: string[];
}

const TeacherDashboard: React.FC = () => {
  const navigate = useNavigate();
  const auth = getAuth();

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Chat State
  const [chatOpen, setChatOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [totalUnread, setTotalUnread] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Editing State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfile, setEditProfile] = useState<Partial<TeacherProfile>>({});
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editLinks, setEditLinks] = useState<{ zoomLink?: string; classroomLink?: string }>({});

  const teacherFullName = `${profile?.firstName || ""} ${profile?.lastName || ""}`.trim();

  /* ======================================================
     1. AUTH & PROFILE
  ===================================================== */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { u ? setUser(u) : navigate("/login"); });
    return () => unsub();
  }, [auth, navigate]);

  useEffect(() => {
    if (!user) return;
    const qProfile = query(collection(db, "teacherApplications"), where("uid", "==", user.uid));
    const unsub = onSnapshot(qProfile, (snap) => {
      if (!snap.empty) {
        const data = snap.docs[0].data();
        setProfile({
          firstName: data.personalInfo?.firstName,
          lastName: data.personalInfo?.lastName,
          email: data.personalInfo?.email,
          phone: data.personalInfo?.phone,
          bio: data.personalInfo?.bio,
          subjects: data.subjects,
          status: data.status,
        });
        setEditProfile({ phone: data.personalInfo?.phone || "", bio: data.personalInfo?.bio || "" });
      }
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  /* ======================================================
     2. FETCH DATA (TIMETABLE & STUDENTS)
  ===================================================== */
  useEffect(() => {
    if (!teacherFullName || !profile?.subjects) return;

    const qTime = query(collection(db, "timetable"), where("teacherName", "==", teacherFullName));
    const unsubTime = onSnapshot(qTime, (snap) => {
      setTimetable(snap.docs.map(d => ({ id: d.id, ...d.data() } as TimetableSlot)));
    });

    const subjectNames = profile.subjects.map(s => s.name);
    const qStud = query(collection(db, "students"), where("subjects", "array-contains-any", subjectNames));
    const unsubStud = onSnapshot(qStud, (snap) => {
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() } as Student)));
    });

    return () => { unsubTime(); unsubStud(); };
  }, [teacherFullName, profile?.subjects]);

  /* ======================================================
     3. CHAT LOGIC (TEACHER TO PARENT)
  ===================================================== */
  useEffect(() => {
    if (!user) return;
    const qConv = query(collection(db, "conversations"), where("participants", "array-contains", user.uid));
    const unsubConv = onSnapshot(qConv, (snap) => {
      setConversations(snap.docs.map(d => ({ id: d.id, ...d.data() } as Conversation)));
      setTotalUnread(snap.docs.length); 
    });
    return () => unsubConv();
  }, [user]);

  useEffect(() => {
    if (!activeConvId || !user) return;
    const qMsgs = query(collection(db, "conversations", activeConvId, "messages"), orderBy("timestamp", "asc"));
    return onSnapshot(qMsgs, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as Message)));
    });
  }, [activeConvId, user]);

  const startConversation = async (student: Student, subject: string) => {
    if (!user) return;
    const parentId = student.parentId || student.linkedParentId;
    if (!parentId) return alert("Parent not found for this student.");

    const convId = `${parentId}_${user.uid}_${student.id}`;
    
    // Check if we already have this conversation in our local list to avoid permission errors on getDoc
    const existing = conversations.find(c => c.id === convId);

    if (!existing) {
      try {
        await setDoc(doc(db, "conversations", convId), {
          participants: [parentId, user.uid],
          subject,
          studentId: student.id,
          createdAt: serverTimestamp(),
          lastMessage: "Conversation initiated",
          lastMessageTime: serverTimestamp(),
        }, { merge: true });
      } catch (err) {
        console.error("Error starting conversation:", err);
      }
    }

    setActiveConvId(convId);
    setChatOpen(true);
  };

  const sendChatMessage = async () => {
    if (!newMessage.trim() || !activeConvId || !user) return;
    const text = newMessage.trim();
    setNewMessage("");

    const activeConv = conversations.find(c => c.id === activeConvId);
    if (!activeConv) return;

    const convRef = doc(db, "conversations", activeConvId);
    
    await addDoc(collection(convRef, "messages"), {
      text,
      sender: user.uid,
      participants: activeConv.participants, // Use participants from conversation doc
      timestamp: serverTimestamp(),
      readBy: [user.uid]
    });

    await updateDoc(convRef, { 
        lastMessage: text, 
        lastMessageTime: serverTimestamp() 
    });
  };

  /* ======================================================
     4. ACTIONS
  ===================================================== */
  const handleSaveProfile = async () => {
    if (!user) return;
    const q = query(collection(db, "teacherApplications"), where("uid", "==", user.uid));
    const snap = await getDocs(q);
    if (!snap.empty) {
      await updateDoc(doc(db, "teacherApplications", snap.docs[0].id), {
        "personalInfo.phone": editProfile.phone,
        "personalInfo.bio": editProfile.bio,
        updatedAt: serverTimestamp(),
      });
      setIsEditingProfile(false);
    }
  };

  const saveLinks = async () => {
    if (!editingSlotId) return;
    await updateDoc(doc(db, "timetable", editingSlotId), {
      zoomLink: editLinks.zoomLink?.trim() || null,
      classroomLink: editLinks.classroomLink?.trim() || null,
      updatedAt: serverTimestamp(),
    });
    setEditingSlotId(null);
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 pb-20">
      {/* Header */}
      <div className="bg-indigo-600 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2"><Sparkles /> Teacher Dashboard</h1>
            <p className="opacity-80">Welcome back, {teacherFullName}</p>
          </div>
          <Button variant="secondary" onClick={() => signOut(auth)}><LogOut className="mr-2" /> Logout</Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="bg-white p-1 rounded-xl shadow-md inline-flex">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="links">Links</TabsTrigger>
            <TabsTrigger value="timetable">Timetable</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                <CardHeader><CardTitle>Classes This Week</CardTitle></CardHeader>
                <CardContent><p className="text-5xl font-bold">{timetable.length}</p></CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                <CardHeader><CardTitle>Total Students</CardTitle></CardHeader>
                <CardContent><p className="text-5xl font-bold">{students.length}</p></CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* STUDENTS */}
          <TabsContent value="students">
            <Card className="shadow-xl">
              <CardHeader><CardTitle className="flex items-center gap-2"><Users /> My Students</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {students.map(s => (
                    <div key={s.id} className="p-5 border rounded-2xl bg-white shadow-sm flex justify-between items-center hover:shadow-md transition">
                      <div>
                        <p className="font-bold text-indigo-900">{s.firstName} {s.lastName}</p>
                        <p className="text-xs text-gray-500">{s.grade} • {s.subjects.join(", ")}</p>
                      </div>
                      <Button size="sm" className="rounded-full" onClick={() => startConversation(s, s.subjects[0])}>
                        <MessageCircle size={16} className="mr-2" /> Message Parent
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MANAGE LINKS */}
          <TabsContent value="links">
            <Card className="shadow-xl">
              <CardHeader><CardTitle>Manage Class Links</CardTitle></CardHeader>
              <CardContent className="grid gap-6">
                {timetable.map(slot => (
                  <div key={slot.id} className="p-6 border rounded-2xl bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h3 className="font-bold text-lg">{slot.subject}</h3>
                      <p className="text-sm text-gray-600">{slot.day} {slot.time} • {slot.grade}</p>
                      {slot.zoomLink && <a href={slot.zoomLink} target="_blank" className="text-xs text-blue-600 underline block mt-1">{slot.zoomLink}</a>}
                    </div>
                    {editingSlotId === slot.id ? (
                      <div className="flex-1 w-full max-w-md space-y-2">
                        <Input placeholder="Zoom Link" value={editLinks.zoomLink} onChange={e => setEditLinks({...editLinks, zoomLink: e.target.value})} />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveLinks}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingSlotId(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <Button variant="outline" onClick={() => { setEditingSlotId(slot.id); setEditLinks({ zoomLink: slot.zoomLink || "" }); }}>Edit Link</Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TIMETABLE */}
          <TabsContent value="timetable">
            <Card className="shadow-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-indigo-50">
                  <tr><th className="p-4 font-bold text-indigo-900">Day</th><th className="p-4 font-bold text-indigo-900">Time</th><th className="p-4 font-bold text-indigo-900">Subject</th><th className="p-4 font-bold text-indigo-900">Grade</th></tr>
                </thead>
                <tbody>
                  {timetable.map(t => (
                    <tr key={t.id} className="border-t hover:bg-gray-50">
                      <td className="p-4 font-medium">{t.day}</td>
                      <td className="p-4 text-gray-600">{t.time}</td>
                      <td className="p-4 text-indigo-700 font-bold">{t.subject}</td>
                      <td className="p-4">{t.grade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </TabsContent>

          {/* PROFILE (FULL UI RESTORED) */}
          <TabsContent value="profile">
            <Card className="shadow-xl">
              <CardHeader className="flex flex-row justify-between items-center bg-indigo-50 rounded-t-xl">
                <CardTitle>My Profile</CardTitle>
                {!isEditingProfile ? (
                  <Button onClick={() => setIsEditingProfile(true)} size="sm"><Edit2 size={16} className="mr-2" /> Edit</Button>
                ) : (
                  <div className="flex gap-2">
                    <Button onClick={handleSaveProfile} size="sm"><Save size={16} className="mr-2" /> Save</Button>
                    <Button onClick={() => setIsEditingProfile(false)} variant="ghost" size="sm">Cancel</Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="grid md:grid-cols-2 gap-6">
                  <div><Label>First Name</Label><Input value={profile?.firstName} disabled /></div>
                  <div><Label>Last Name</Label><Input value={profile?.lastName} disabled /></div>
                  <div><Label>Email</Label><Input value={profile?.email} disabled /></div>
                  <div>
                    <Label>Phone Number</Label>
                    <Input value={isEditingProfile ? editProfile.phone : profile?.phone} disabled={!isEditingProfile} onChange={e => setEditProfile({...editProfile, phone: e.target.value})} />
                  </div>
                </div>
                <div>
                  <Label>Bio / About Me</Label>
                  <Textarea rows={4} value={isEditingProfile ? editProfile.bio : profile?.bio} disabled={!isEditingProfile} onChange={e => setEditProfile({...editProfile, bio: e.target.value})} />
                </div>
                <div>
                  <Label>Subjects I Teach</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profile?.subjects?.map((sub, i) => (
                      <Badge key={i} variant="secondary" className="py-2 px-4">{sub.name} ({sub.curriculum})</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* FLOATING CHAT WIDGET */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {chatOpen && (
          <div className="mb-4 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
            <div className="p-4 bg-indigo-600 text-white flex justify-between items-center">
              <span className="font-bold">{activeConvId ? "Chatting with Parent" : "Messages"}</span>
              <button onClick={() => { setChatOpen(false); setActiveConvId(null); }}><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto bg-gray-50 p-4 space-y-3">
              {activeConvId ? (
                messages.map(m => (
                  <div key={m.id} className={`flex ${m.sender === user?.uid ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${m.sender === user?.uid ? "bg-indigo-600 text-white" : "bg-white border text-gray-800"}`}>
                      {m.text}
                    </div>
                  </div>
                ))
              ) : (
                conversations.map(c => (
                  <div key={c.id} onClick={() => setActiveConvId(c.id)} className="p-4 border rounded-xl bg-white cursor-pointer hover:bg-indigo-50 transition">
                    <p className="font-bold text-indigo-900">{c.subject}</p>
                    <p className="text-sm text-gray-500 truncate">{c.lastMessage}</p>
                  </div>
                ))
              )}
              <div ref={scrollRef} />
            </div>
            {activeConvId && (
              <div className="p-3 border-t bg-white flex gap-2">
                <Input placeholder="Type message..." value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChatMessage()} />
                <Button size="icon" onClick={sendChatMessage} className="bg-indigo-600"><Send size={18} /></Button>
              </div>
            )}
          </div>
        )}
        <button onClick={() => setChatOpen(!chatOpen)} className="bg-indigo-600 text-white p-5 rounded-full shadow-2xl relative hover:scale-105 transition">
          <MessageCircle size={28} />
          {totalUnread > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] w-6 h-6 rounded-full flex items-center justify-center border-2 border-white">{totalUnread}</span>}
        </button>
      </div>
    </div>
  );
};

export default TeacherDashboard;