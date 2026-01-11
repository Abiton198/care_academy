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
  deleteDoc,
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
  Loader2, LogOut, Edit2, Save, ExternalLink, Video, Check, X, 
  Sparkles, BookOpen, Send, MessageCircle, Users, PlusCircle, Trash2,
  Clock
} from "lucide-react";

/* ======================================================
   TYPES & INTERFACES
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

interface ClassLink {
  id: string;
  title: string;
  url: string;
  type: string;        // e.g., "classroom", "resource", "zoom"
  grade: string;       // e.g., "Primary", "A-Level", or "all"
  teacherId: string;   // The UID of the teacher
  teacherName: string; // The flattened name (e.g., "Adel Tops")
  createdAt: any;      // Firestore Timestamp
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
}

const TeacherDashboard: React.FC = () => {
  const navigate = useNavigate();
  const auth = getAuth();

  // Core State
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Resources / Links State
  const [resources, setResources] = useState<ClassLink[]>([]);
  const [availableGrades, setAvailableGrades] = useState<string[]>([]);
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>("all");
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  const [editResourceData, setEditResourceData] = useState<any>(null);
  const [newResource, setNewResource] = useState({ 
    title: "", 
    url: "", 
    type: "classroom", 
    targetGrade: "all" 
  });

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfile, setEditProfile] = useState<Partial<TeacherProfile>>({});

  // Chat State
  const [chatOpen, setChatOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [totalUnread, setTotalUnread] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const teacherFullName = `${profile?.firstName || ""} ${profile?.lastName || ""}`.trim();
  const [status, setStatus] = useState<string | null>(null);


  /* ======================================================
     1. AUTHENTICATION & PROFILE DATA
  ===================================================== */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { u ? setUser(u) : navigate("/"); });
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
     2. SYNC TIMETABLE, STUDENTS & GRADES
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
      const studentList = snap.docs.map(d => ({ id: d.id, ...d.data() } as Student));
      setStudents(studentList);

      const grades = new Set<string>();
      studentList.forEach(s => { if (s.grade) grades.add(s.grade); });
      setAvailableGrades(Array.from(grades).sort());
    });

    return () => { unsubTime(); unsubStud(); };
  }, [teacherFullName, profile?.subjects]);

  /* ======================================================
     3. RESOURCE ENGINE (CRUD & AUDIT TRAIL)
  ===================================================== */
  useEffect(() => {
  // Ensure we have a valid UID before trying to query
  if (!user?.uid) return;

  const q = query(
    collection(db, "class_links"), 
    where("teacherId", "==", user.uid),
    orderBy("createdAt", "desc")
  );
  
  const unsub = onSnapshot(q, (snap) => {
    const fetchedLinks = snap.docs.map(d => ({ 
      id: d.id, 
      ...d.data() 
    } as ClassLink));
    
    setResources(fetchedLinks);
    console.log("Audit Trail Updated:", fetchedLinks.length, "links found.");
  }, (error) => {
    // This will catch the 'Missing Index' error in your console
    console.error("Firestore Subscription Error:", error);
  });

  return () => unsub();
}, [user?.uid]); // Bind specifically to the UID


// updateDoc, deleteDoc
const handleUpdateResource = async (id: string) => {
    try {
      const resourceRef = doc(db, "class_links", id);
      await updateDoc(resourceRef, {
        title: editResourceData.title,
        url: editResourceData.url,
        type: editResourceData.type,
        grade: editResourceData.grade,
        updatedAt: serverTimestamp()
      });
      setEditingResourceId(null);
    } catch (err) {
      console.error("Update failed:", err);
    }
  };

  const handleDeleteResource = async (id: string) => {
    if (confirm("Permanently remove this link from student dashboards?")) {
      await deleteDoc(doc(db, "class_links", id));
    }
  };

  const filteredResources = resources.filter(r => 
    selectedGradeFilter === "all" ? true : r.grade === selectedGradeFilter
  );

const handleAddResource = async () => {
  if (!newResource.title || !newResource.url) return alert("Title and URL are required");

  // 1. Correctly extract the name from the nested personalInfo map
  const firstName = user?.personalInfo?.firstName || "";
  const lastName = user?.personalInfo?.lastName || "";
  const fullName = `${firstName} ${lastName}`.trim() || "Educator";

  try {
    await addDoc(collection(db, "class_links"), {
      title: newResource.title,
      url: newResource.url,
      type: newResource.type,
      grade: newResource.targetGrade,
      teacherId: user?.uid,
      // 2. Use the field name 'teacherName' to match your audit trail requirements
      teacherName: fullName, 
      createdAt: serverTimestamp()
    });

    setNewResource({ ...newResource, title: "", url: "" });
  } catch (err) {
    console.error("Error adding resource:", err);
  }
};
  /* ======================================================
     4. CHAT & MESSAGING LOGIC
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
      text, sender: user.uid, timestamp: serverTimestamp()
    });
    await updateDoc(convRef, { lastMessage: text, lastMessageTime: serverTimestamp() });
  };

  /* ======================================================
     5. PROFILE UPDATES
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

  useEffect(() => {
    if (!user) return;

    // Real-time listener to the user's status
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        setStatus(snap.data().applicationStatus);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 pb-20 font-sans">
      
      {/* HEADER SECTION */}
      <div className="bg-indigo-600 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black flex items-center gap-2 tracking-tight">
              <Sparkles className="text-amber-400" /> TEACHER CENTRAL
            </h1>
            <p className="opacity-80 font-medium">Educator: {teacherFullName}</p>
          </div>
          <Button variant="secondary" className="font-bold shadow-lg" onClick={() => signOut(auth)}>
            <LogOut className="mr-2" /> Logout
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="bg-white p-1 rounded-2xl shadow-md border inline-flex overflow-hidden">
            <TabsTrigger value="overview" className="px-8 py-3 font-bold">Overview</TabsTrigger>
            <TabsTrigger value="students" className="px-8 py-3 font-bold">Students</TabsTrigger>
            <TabsTrigger value="links" className="px-8 py-3 font-bold">Link Engine</TabsTrigger>
            <TabsTrigger value="timetable" className="px-8 py-3 font-bold">Timetable</TabsTrigger>
            <TabsTrigger value="profile" className="px-8 py-3 font-bold">My Profile</TabsTrigger>
          </TabsList>

{/* STATUS BANNER */}
        {status === "submitted" && (
          <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-[2rem] flex items-center gap-6 mb-8 animate-in slide-in-from-top-4">
            <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
              <Clock size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-amber-900 uppercase tracking-tight">Application Under Review</h2>
              <p className="text-sm text-amber-700 font-medium">The Principal is currently verifying your SACE credentials. Full portal access will unlock upon approval.</p>
            </div>
          </div>
        )}

          {/* DASHBOARD OVERVIEW */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-0 shadow-2xl rounded-3xl overflow-hidden">
                <CardHeader><CardTitle className="uppercase tracking-widest text-[10px] opacity-70">Schedule</CardTitle></CardHeader>
                <CardContent>
                   <p className="text-5xl font-black">{timetable.length}</p>
                   <p className="text-sm mt-2 opacity-80">Classes assigned this week</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0 shadow-2xl rounded-3xl overflow-hidden">
                <CardHeader><CardTitle className="uppercase tracking-widest text-[10px] opacity-70">Enrolment</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-5xl font-black">{students.length}</p>
                  <p className="text-sm mt-2 opacity-80">Students across your subjects</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* STUDENT LIST */}
          <TabsContent value="students">
            <Card className="shadow-2xl border-0 rounded-[2rem] overflow-hidden">
              <CardHeader className="bg-slate-900 text-white p-8">
                <CardTitle className="flex items-center gap-3 text-2xl font-black">
                  <Users className="text-indigo-400" /> STUDENT ROSTER
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {students.map(s => (
                    <div key={s.id} className="group p-6 border-2 rounded-3xl bg-white shadow-sm hover:border-indigo-500 hover:shadow-xl transition-all duration-300">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="font-black text-xl text-slate-800 leading-tight">{s.firstName} {s.lastName}</p>
                          <Badge className="mt-2 bg-indigo-50 text-indigo-600 border-none font-bold">GRADE {s.grade}</Badge>
                        </div>
                        <Button size="icon" className="rounded-full bg-slate-100 text-slate-600 hover:bg-indigo-600 hover:text-white" onClick={() => startConversation(s, s.subjects[0])}>
                          <MessageCircle size={20} />
                        </Button>
                      </div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Subjects: {s.subjects.join(", ")}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* LINK ENGINE TAB */}
          <TabsContent value="links">
            <div className="space-y-6">
              
              {/* PUBLISHING ENGINE */}
              <Card className="border-0 shadow-2xl bg-indigo-900 text-white rounded-[2rem] overflow-hidden">
                <div className="p-8 border-b border-white/10 bg-white/5 flex justify-between items-center">
                   <div>
                     <h2 className="text-2xl font-black">LINK PUBLISHING ENGINE</h2>
                     <p className="text-xs text-indigo-300 font-bold uppercase tracking-widest mt-1">Updates Student Dashboards instantly</p>
                   </div>
                   <div className="bg-white/10 p-2 rounded-xl border border-white/20">
                     <Label className="text-[10px] font-black uppercase text-indigo-200 block mb-1">Filter Audit Trail</Label>
                     <select 
                        className="bg-transparent text-xs font-bold outline-none cursor-pointer"
                        value={selectedGradeFilter}
                        onChange={(e) => setSelectedGradeFilter(e.target.value)}
                      >
                        <option className="text-black" value="all">View All Grades</option>
                        {availableGrades.map(g => <option className="text-black" key={g} value={g}>{g}</option>)}
                      </select>
                   </div>
                </div>
                <CardContent className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-end">
                    <div className="space-y-2 col-span-1">
                      <Label className="text-[10px] uppercase font-black text-indigo-200">Target Grade</Label>
                      <select 
                        className="w-full h-12 px-4 rounded-xl bg-white/10 border-2 border-white/10 text-white text-sm font-bold focus:border-white/40 transition-all outline-none"
                        value={newResource.targetGrade}
                        onChange={e => setNewResource({...newResource, targetGrade: e.target.value})}
                      >
                        <option className="text-black" value="all">All Grades</option>
                        {availableGrades.map(g => <option className="text-black" key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2 col-span-1 md:col-span-1">
                      <Label className="text-[10px] uppercase font-black text-indigo-200">Link Title</Label>
                      <Input className="h-12 bg-white/10 border-2 border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-white/40 font-bold" placeholder="e.g. Maths Live Session" value={newResource.title} onChange={e => setNewResource({...newResource, title: e.target.value})} />
                    </div>
                    <div className="space-y-2 col-span-1 md:col-span-1">
                      <Label className="text-[10px] uppercase font-black text-indigo-200">URL / Zoom Link</Label>
                      <Input className="h-12 bg-white/10 border-2 border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-white/40 font-mono text-xs" placeholder="https://zoom.us/..." value={newResource.url} onChange={e => setNewResource({...newResource, url: e.target.value})} />
                    </div>
                    <div className="space-y-2 col-span-1">
                      <Label className="text-[10px] uppercase font-black text-indigo-200">Category</Label>
                      <select 
                        className="w-full h-12 px-4 rounded-xl bg-white/10 border-2 border-white/10 text-white text-sm font-bold focus:border-white/40 outline-none"
                        value={newResource.type} 
                        onChange={e => setNewResource({...newResource, type: e.target.value})}
                      >
                        <option className="text-black" value="classroom">Classroom / Live</option>
                        <option className="text-black" value="resource">Study Material</option>
                      </select>
                    </div>
                    <Button onClick={handleAddResource} className="h-12 bg-amber-400 hover:bg-amber-500 text-black font-black rounded-xl shadow-xl transition-transform active:scale-95">
                      <PlusCircle className="mr-2 h-5 w-5" /> PUBLISH LINK
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* AUDIT TRAIL / MANAGEMENT TABLE */}
              <div className="bg-white rounded-[2rem] shadow-2xl border-0 overflow-hidden">
                <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
                  <h3 className="font-black text-slate-800 text-xl tracking-tight uppercase">Audit Trail & Record Management</h3>
                  <Badge variant="secondary" className="px-4 py-1 rounded-full font-bold">{filteredResources.length} RECORDS ACTIVE</Badge>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-100/50 text-[10px] uppercase font-black text-slate-400 tracking-widest">
                        <th className="px-8 py-5">Audience</th>
                        <th className="px-8 py-5">Document Details</th>
                        <th className="px-8 py-5">Action Point</th>
                        <th className="px-8 py-5 text-right">Settings</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredResources.map((item) => {
                        const isEditing = editingResourceId === item.id;
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-8 py-6">
                              {isEditing ? (
                                <select 
                                  className="text-xs font-bold border rounded-lg p-2"
                                  value={editResourceData.grade}
                                  onChange={e => setEditResourceData({...editResourceData, grade: e.target.value})}
                                >
                                  <option value="all">All Grades</option>
                                  {availableGrades.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                              ) : (
                                <Badge className={`${item.grade === 'all' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-600 text-white'} border-none text-[10px] font-black px-3 py-1`}>
                                  {item.grade === 'all' ? 'GLOBAL' : `GRADE ${item.grade}`}
                                </Badge>
                              )}
                            </td>
                            <td className="px-8 py-6">
                              {isEditing ? (
                                <Input className="h-9 text-sm font-bold" value={editResourceData.title} onChange={e => setEditResourceData({...editResourceData, title: e.target.value})} />
                              ) : (
                                <div>
                                  <p className="font-black text-slate-800 text-base">{item.title}</p>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.type}</span>
                                </div>
                              )}
                            </td>
                            <td className="px-8 py-6">
                              {isEditing ? (
                                <Input className="h-9 text-xs font-mono" value={editResourceData.url} onChange={e => setEditResourceData({...editResourceData, url: e.target.value})} />
                              ) : (
                                <div className="flex items-center gap-2">
                                  <p className="text-[11px] text-indigo-500 font-mono truncate max-w-[200px] bg-indigo-50 px-2 py-1 rounded-md">{item.url}</p>
                                  <a href={item.url} target="_blank" rel="noreferrer" className="text-slate-300 hover:text-indigo-600"><ExternalLink size={14}/></a>
                                </div>
                              )}
                            </td>
                            <td className="px-8 py-6 text-right">
                              <div className="flex justify-end gap-3">
                                {isEditing ? (
                                  <>
                                    <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 shadow-md" onClick={() => handleUpdateResource(item.id)}>
                                      <Check size={16} />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="text-slate-400" onClick={() => setEditingResourceId(null)}>
                                      <X size={16} />
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <button onClick={() => { setEditingResourceId(item.id); setEditResourceData(item); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Edit2 size={16}/></button>
                                    <button onClick={() => handleDeleteResource(item.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={16}/></button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredResources.length === 0 && (
                    <div className="py-20 text-center flex flex-col items-center">
                       <BookOpen className="text-slate-200 w-16 h-16 mb-4" />
                       <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No link records found</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TIMETABLE VIEW */}
          <TabsContent value="timetable">
            <Card className="shadow-2xl overflow-hidden border-0 rounded-[2rem]">
              <table className="w-full text-left">
                <thead className="bg-slate-900 text-white">
                  <tr className="uppercase text-[10px] tracking-widest font-black">
                    <th className="px-8 py-6">Day</th>
                    <th className="px-8 py-6">Time Slot</th>
                    <th className="px-8 py-6">Subject Area</th>
                    <th className="px-8 py-6">Student Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {timetable.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-8 py-6 font-black text-slate-700">{t.day}</td>
                      <td className="px-8 py-6 font-medium text-slate-500">{t.time}</td>
                      <td className="px-8 py-6"><Badge className="bg-indigo-100 text-indigo-700 border-none font-black">{t.subject}</Badge></td>
                      <td className="px-8 py-6 font-bold text-slate-400">GRADE {t.grade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </TabsContent>

          {/* TEACHER PROFILE */}
          <TabsContent value="profile">
            <Card className="shadow-2xl border-0 rounded-[2rem] overflow-hidden">
              <CardHeader className="flex flex-row justify-between items-center bg-indigo-50 p-8">
                <CardTitle className="text-2xl font-black text-indigo-900">IDENTITY PROFILE</CardTitle>
                {!isEditingProfile ? (
                  <Button onClick={() => setIsEditingProfile(true)} className="rounded-xl shadow-lg font-bold"><Edit2 size={16} className="mr-2" /> EDIT BIO</Button>
                ) : (
                  <div className="flex gap-2">
                    <Button onClick={handleSaveProfile} className="bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg font-bold"><Save size={16} className="mr-2" /> SAVE CHANGES</Button>
                    <Button onClick={() => setIsEditingProfile(false)} variant="ghost" className="font-bold">CANCEL</Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-10 space-y-10">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-2"><Label className="font-black text-[10px] text-slate-400 uppercase">First Name</Label><Input className="h-12 rounded-xl bg-slate-50 border-none font-bold text-slate-900" value={profile?.firstName} disabled /></div>
                  <div className="space-y-2"><Label className="font-black text-[10px] text-slate-400 uppercase">Last Name</Label><Input className="h-12 rounded-xl bg-slate-50 border-none font-bold text-slate-900" value={profile?.lastName} disabled /></div>
                  <div className="space-y-2"><Label className="font-black text-[10px] text-slate-400 uppercase">Registered Email</Label><Input className="h-12 rounded-xl bg-slate-50 border-none font-bold text-slate-900" value={profile?.email} disabled /></div>
                  <div className="space-y-2">
                    <Label className="font-black text-[10px] text-slate-400 uppercase">Contact Number</Label>
                    <Input className={`h-12 rounded-xl border-2 font-bold ${isEditingProfile ? 'border-indigo-200' : 'bg-slate-50 border-none text-slate-900'}`} value={isEditingProfile ? editProfile.phone : profile?.phone} disabled={!isEditingProfile} onChange={e => setEditProfile({...editProfile, phone: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-black text-[10px] text-slate-400 uppercase">Professional Biography</Label>
                  <Textarea className={`rounded-2xl border-2 font-medium leading-relaxed ${isEditingProfile ? 'border-indigo-200' : 'bg-slate-50 border-none text-slate-900'}`} rows={5} value={isEditingProfile ? editProfile.bio : profile?.bio} disabled={!isEditingProfile} onChange={e => setEditProfile({...editProfile, bio: e.target.value})} />
                </div>
                <div className="pt-6 border-t">
                   <Label className="font-black text-[10px] text-slate-400 uppercase mb-4 block">Specializations</Label>
                   <div className="flex flex-wrap gap-3">
                    {profile?.subjects?.map((sub, i) => (
                      <Badge key={i} className="py-2 px-6 rounded-full bg-slate-900 text-white font-bold">{sub.name} • {sub.curriculum}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* CHAT WIDGET (DYNAMIC OVERLAY) */}
      <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end">
        {chatOpen && (
          <div className="mb-6 w-[400px] h-[600px] bg-white rounded-[2rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] border-0 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <span className="font-black uppercase tracking-widest text-[10px] block opacity-50">Communication</span>
                <span className="text-lg font-bold">{activeConvId ? "Active Message" : "Inbox"}</span>
              </div>
              <button className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition" onClick={() => { setChatOpen(false); setActiveConvId(null); }}><X size={20} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto bg-slate-50 p-6 space-y-4">
              {activeConvId ? (
                messages.map(m => (
                  <div key={m.id} className={`flex ${m.sender === user?.uid ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] p-4 rounded-3xl text-sm font-medium shadow-sm ${m.sender === user?.uid ? "bg-indigo-600 text-white rounded-br-none" : "bg-white text-slate-800 rounded-bl-none border border-slate-100"}`}>
                      {m.text}
                    </div>
                  </div>
                ))
              ) : (
                conversations.map(c => (
                  <div key={c.id} onClick={() => setActiveConvId(c.id)} className="p-5 border-2 rounded-3xl bg-white cursor-pointer hover:border-indigo-500 transition shadow-sm group">
                    <p className="font-black text-slate-800 group-hover:text-indigo-600 transition-colors">{c.subject}</p>
                    <p className="text-xs text-slate-400 mt-1 truncate font-bold uppercase">{c.lastMessage}</p>
                  </div>
                ))
              )}
              <div ref={scrollRef} />
            </div>

            {activeConvId && (
              <div className="p-6 border-t bg-white flex gap-3">
                <Input className="h-12 bg-slate-50 border-none rounded-xl font-medium" placeholder="Message parent..." value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChatMessage()} />
                <Button className="h-12 w-12 rounded-xl bg-indigo-600 shadow-lg" onClick={sendChatMessage}><Send size={20} /></Button>
              </div>
            )}
          </div>
        )}
        <button onClick={() => setChatOpen(!chatOpen)} className="bg-indigo-600 text-white p-6 rounded-[2rem] shadow-2xl relative hover:scale-105 active:scale-95 transition-all duration-300">
          <MessageCircle size={32} />
          {totalUnread > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-7 h-7 rounded-full flex items-center justify-center border-4 border-white font-black">{totalUnread}</span>}
        </button>
      </div>
    </div>
  );
};

export default TeacherDashboard;