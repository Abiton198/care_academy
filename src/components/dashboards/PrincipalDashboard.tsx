"use client";

import React, { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebaseConfig";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  addDoc,
  query,
  where,
  getDoc,
  writeBatch,
  orderBy
} from "firebase/firestore";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import { useAuth } from "@/components/auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import TimetableManager from "@/lib/TimetableManager";
import TeacherReviewModal from "@/components/dashboards/TeacherReviewModal";

import {
  LogOut, Search, Eye, Users, CheckCircle, ChevronDown, ChevronUp, 
  Laptop, GraduationCap, Megaphone, Calendar, DollarSign, SendHorizontal,
  UserCheck, ShieldCheck, FileText, Briefcase, Loader2
} from "lucide-react";

/* ---------------- Types ---------------- */
interface Student {
  id: string;
  firstName?: string;
  lastName?: string;
  grade?: string;
  status?: "pending" | "enrolled" | "rejected";
  learningMode?: "Campus" | "Virtual";
  paymentReceived?: boolean;
  parentId?: string;
  parentEmail?: string;
  subjects?: string[];
}

interface Teacher {
  id: string;
  uid?: string;
  personalInfo?: { 
    firstName?: string; 
    lastName?: string; 
    email?: string; 
    yearsOfExperience?: number;
    gradePhase?: string;
  };
  subjects?: { name: string }[];
  status?: "pending" | "submitted" | "approved" | "rejected";
  documents?: Record<string, string[]>;
}

const PrincipalDashboard: React.FC = () => {
  /* ---------------- State ---------------- */
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"students" | "teachers">("students");
  const [paymentFilter, setPaymentFilter] = useState("all");
  
  const [timetableExpanded, setTimetableExpanded] = useState(false);
  const [announcementExpanded, setAnnouncementExpanded] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedType, setSelectedType] = useState<"student" | "teacher" | null>(null);
  const [showModal, setShowModal] = useState(false);

  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [pendingAmount, setPendingAmount] = useState<number>(0);

  const [pendingTeachers, setPendingTeachers] = useState<any[]>([]);
  const [selectedTeacherApp, setSelectedTeacherApp] = useState<any | null>(null);

  const { logout } = useAuth();
  const navigate = useNavigate();

  /* ---------------- Real-time Listeners ---------------- */
/* Updated useEffect for PrincipalDashboard.tsx */
useEffect(() => {
  // 1. Listen for Students
  const unsubStudents = onSnapshot(collection(db, "students"), (snap) => {
    setStudents(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Student) })));
  });

  // 2. Listen for Users with role 'teacher' and status 'submitted'
  const teacherUsersQuery = query(
    collection(db, "users"), 
    where("role", "==", "teacher"),
    where("applicationStatus", "==", "submitted")
  );

  const unsubPendingTeachers = onSnapshot(teacherUsersQuery, async (snap) => {
    const pendingList = await Promise.all(
      snap.docs.map(async (userDoc) => {
        const userData = userDoc.data();
        
        // Fetch the actual application details using the lastSubmissionId
        if (userData.lastSubmissionId) {
          const appDoc = await getDoc(doc(db, "teacherApplications", userData.lastSubmissionId));
          return {
            id: appDoc.id,
            uid: userDoc.id,
            ...appDoc.data(),
            email: userData.email, // Use email from user doc
            personalInfo: appDoc.data()?.personalInfo || {}
          };
        }
        return null;
      })
    );
    
    // Filter out any nulls and update state
    setPendingTeachers(pendingList.filter(t => t !== null));
    setLoading(false);
  });

  return () => {
    unsubStudents();
    unsubPendingTeachers();
  };
}, []);

  /* ---------------- Student Finance Listener ---------------- */
  useEffect(() => {
    if (selectedType === "student" && selectedItem?.id && showModal) {
      const q = query(
        collection(db, "invoices"),
        where("studentId", "==", selectedItem.id),
        orderBy("createdAt", "desc")
      );
      const unsub = onSnapshot(q, (snap) => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setPaymentHistory(docs);
        const total = docs
          .filter(d => d.status === "pending")
          .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
        setPendingAmount(total);
      });
      return () => unsub();
    }
  }, [selectedItem, selectedType, showModal]);

  /* ---------------- Approval Handlers ---------------- */
  const handleApproveStudent = async (studentId: string) => {
    try {
      await updateDoc(doc(db, "students", studentId), {
        status: "enrolled",
        enrolledAt: serverTimestamp()
      });
      alert("Student enrollment approved.");
    } catch (err) { console.error(err); }
  };

  // Teacher Approval with Batched Updates
  const handleApproveTeacher = async (teacherAppId: string, teacherUid: string) => {
  try {
    const batch = writeBatch(db);

    // 1. Update the Application document
    const appRef = doc(db, "teacherApplications", teacherAppId);
    batch.update(appRef, { 
      status: "approved",
      verifiedAt: serverTimestamp() 
    });

    // 2. Update the User document (This unlocks their dashboard)
    const userRef = doc(db, "users", teacherUid);
    batch.update(userRef, { 
      applicationStatus: "approved",
      role: "teacher" // Ensure role is strictly set
    });

    await batch.commit();
    alert("Teacher credentials verified. Full access granted.");
  } catch (err) {
    console.error("Approval Error:", err);
    alert("Failed to approve teacher.");
  }
};

  /* ---------------- Finance Handlers ---------------- */
  const clearSingleInvoice = async (invoiceId: string, student: any) => {
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, "invoices", invoiceId), { 
        status: "paid", 
        clearedAt: serverTimestamp(),
        clearedBy: "Principal" 
      });
      const otherPending = paymentHistory.filter(inv => inv.id !== invoiceId && inv.status === "pending");
      if (otherPending.length === 0) {
        batch.update(doc(db, "students", student.id), { paymentReceived: true });
      }
      await batch.commit();
    } catch (err) { console.error(err); }
  };

  const generateMonthlyInvoices = async () => {
    if (!window.confirm("Run global billing cycle?")) return;
    setIsPublishing(true);
    try {
      const batch = writeBatch(db);
      const monthYear = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
      let count = 0;
      students.forEach((s) => {
        if (s.status === "enrolled") {
          const invRef = doc(collection(db, "invoices"));
          batch.set(invRef, {
            parentId: s.parentId || "unknown",
            studentId: s.id,
            studentNames: `${s.firstName} ${s.lastName}`,
            amount: 1200,
            category: `${monthYear} Tuition`,
            status: "pending",
            createdAt: serverTimestamp(),
          });
          batch.update(doc(db, "students", s.id), { paymentReceived: false });
          count++;
        }
      });
      if (count > 0) await batch.commit();
      alert(`Billed ${count} students.`);
    } catch (err) { console.error(err); } finally { setIsPublishing(false); }
  };

  /* ---------------- Announcement & Timetable ---------------- */
  const handlePublishAnnouncement = async () => {
    if (!announcementTitle || !announcementBody) return alert("Fill all fields");
    setIsPublishing(true);
    try {
      await addDoc(collection(db, "announcements"), {
        title: announcementTitle,
        body: announcementBody,
        author: "Principal",
        createdAt: serverTimestamp(),
        target: "all"
      });
      setAnnouncementTitle(""); setAnnouncementBody("");
      alert("Broadcast live.");
    } catch (err) { console.error(err); } finally { setIsPublishing(false); }
  };

  const saveTimetableSlot = async (slotData: any) => {
    await addDoc(collection(db, "timetable"), { ...slotData, updatedAt: serverTimestamp() });
  };

 /* ---------------- Stats & Filtering ---------------- */
const stats = useMemo(() => {
  const enrolled = students.filter(s => s.status === "enrolled");
  
  // Ensure we check for the string "approved" exactly
  const approvedTeachersCount = teachers.filter(t => t.status === "approved").length;
    
  // We check 'students' for "pending" AND 'pendingTeachers' (which comes from the users listener)
  const totalPendingRequests = students.filter(s => s.status === "pending").length + pendingTeachers.length;

  return {
    totalStudents: enrolled.length,
    campus: enrolled.filter(s => s.learningMode === "Campus").length,
    virtual: enrolled.filter(s => (s.learningMode || "Virtual") === "Virtual").length,
    totalTeachers: approvedTeachersCount,
    unpaid: enrolled.filter(s => !s.paymentReceived).length,
    pendingApps: totalPendingRequests,
  };
}, [students, teachers, pendingTeachers]);

 const filteredData = useMemo(() => {
  const searchLower = searchTerm.toLowerCase();

  if (viewMode === "students") {
    return students.filter(s => {
      const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
      const matchesSearch = fullName.includes(searchLower);
      const matchesPay = paymentFilter === "all" 
        ? true 
        : (paymentFilter === "paid" ? s.paymentReceived : !s.paymentReceived);
      
      return matchesSearch && matchesPay && s.status === "enrolled";
    });
  }

  // Teacher View: Combine active teachers and pending ones for the search
  return teachers.filter(t => {
    const teacherName = `${t.personalInfo?.firstName} ${t.personalInfo?.lastName}`.toLowerCase();
    const matchesSearch = teacherName.includes(searchLower);
    // Show them in the main list if they are approved or currently under review
    return matchesSearch && (t.status === "approved" || t.status === "submitted");
  });
}, [viewMode, students, teachers, searchTerm, paymentFilter]);


  const handleLogout = async () => { await logout(); navigate("/"); };

  useEffect(() => {
  // Listener 1: All Teacher Applications (For Approved Stats)
  const unsubApps = onSnapshot(collection(db, "teacherApplications"), (snap) => {
    const apps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setTeachers(apps); 
  });

  // Listener 2: Users with 'submitted' status (For Pending Stats)
  const q = query(collection(db, "users"), where("applicationStatus", "==", "submitted"));
  const unsubUsers = onSnapshot(q, (snap) => {
    // This updates pendingTeachers.length, which triggers the 'Requests' stat
    setPendingTeachers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });

  return () => { unsubApps(); unsubUsers(); };
}, []);

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8 pb-24">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg"><GraduationCap size={32} /></div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">Care Academy Admin</h1>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Principal Dashboard</p>
            </div>
          </div>
          <div className="flex gap-4">
            <Button onClick={generateMonthlyInvoices} className="bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black shadow-lg">
              <DollarSign className="mr-2" size={18} /> GLOBAL BILLING
            </Button>
            <Button variant="ghost" className="rounded-2xl font-bold text-slate-500 hover:bg-rose-50 hover:text-rose-600" onClick={handleLogout}>
              <LogOut size={18} className="mr-2" /> Sign Out
            </Button>
          </div>
        </header>

        {/* Analytics Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard label="Learners" value={stats.totalStudents} sub="Active Enrollment" color="bg-indigo-600" icon={<Users/>} />
          <StatCard label="Accounts" value={stats.unpaid} sub="Payments Pending" color="bg-rose-500" icon={<DollarSign/>} />
          <StatCard label="Faculty" value={stats.totalTeachers} sub="Approved Staff" color="bg-emerald-500" icon={<CheckCircle/>} />
          <StatCard label="Requests" value={stats.pendingApps} sub="Needs Review" color="bg-amber-500" icon={<ShieldCheck/>} />
        </div>

        {/* NEW: Pending Student Approvals Section */}
        {students.filter(s => s.status === "pending").length > 0 && (
          <section className="bg-rose-50/50 p-6 rounded-[3rem] border-2 border-dashed border-rose-200 animate-in fade-in duration-700">
            <h3 className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <ShieldCheck size={14} /> Critical: Pending Student Applications
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {students.filter(s => s.status === "pending").map(student => (
                <div key={student.id} className="bg-white p-4 rounded-2xl shadow-sm border border-rose-100 flex justify-between items-center">
                  <div>
                    <p className="font-black text-slate-800 text-xs uppercase">{student.firstName} {student.lastName}</p>
                    <p className="text-[9px] font-bold text-slate-400 italic">{student.grade}</p>
                  </div>
                  <Button onClick={() => handleApproveStudent(student.id)} size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[9px] rounded-lg px-4">APPROVE</Button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* NEW: Pending Teacher Verifications Section */}
        {pendingTeachers.length > 0 && (
  <section className="bg-indigo-50/50 p-6 rounded-[3rem] border-2 border-dashed border-indigo-200 animate-in fade-in duration-700 mt-8">
    <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
      <ShieldCheck size={14} /> Critical: Pending Teacher Verifications
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {pendingTeachers.map(teacher => (
        <div key={teacher.id} className="bg-white p-4 rounded-2xl shadow-sm border border-indigo-100 flex justify-between items-center">
          <div>
            <p className="font-black text-slate-800 text-xs uppercase">{teacher.personalInfo.firstName} {teacher.personalInfo.lastName}</p>
            <p className="text-[9px] font-bold text-slate-400 italic">{teacher.email}</p>
          </div>
          <Button 
            onClick={() => setSelectedTeacherApp(teacher)} 
            size="sm" 
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[9px] rounded-lg px-4"
          >
            REVIEW
          </Button>
        </div>
      ))}
    </div>
  </section>
)}

        {/* Main Registry Table */}
        <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden">
          <CardHeader className="p-8 bg-slate-50/30">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex bg-white shadow-sm p-1.5 rounded-[1.5rem] border border-slate-100">
                <button onClick={() => setViewMode("students")} className={`px-8 py-2.5 rounded-[1.2rem] text-sm font-black transition-all ${viewMode === "students" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400"}`}>Learners</button>
                <button onClick={() => setViewMode("teachers")} className={`px-8 py-2.5 rounded-[1.2rem] text-sm font-black transition-all ${viewMode === "teachers" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400"}`}>Teachers</button>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-12 h-12 rounded-2xl border-none bg-slate-100/80" />
                </div>
                {viewMode === "students" && (
                  <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                    <SelectTrigger className="w-36 h-12 rounded-2xl bg-slate-100/80 border-none font-black text-xs uppercase"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Finance</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="pending">Owing</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr className="text-[11px] font-black uppercase text-slate-400">
                  <th className="px-8 py-5 text-left">Identity</th>
                  <th className="px-8 py-5 text-left">Academic Level</th>
                  <th className="px-8 py-5 text-left">Account Status</th>
                  <th className="px-8 py-5 text-right">Dossier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredData.map((item: any) => (
                  <tr key={item.id} className="hover:bg-indigo-50/20 transition-all">
                    <td className="px-8 py-6">
                      <div className="font-black text-slate-800 text-sm">
                        {viewMode === "students" ? `${item.firstName} ${item.lastName}` : `${item.personalInfo?.firstName} ${item.personalInfo?.lastName}`}
                      </div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase">{item.parentEmail || item.personalInfo?.email}</div>
                    </td>
                    <td className="px-8 py-6 text-xs font-bold text-slate-500">
                       {viewMode === "students" ? item.grade : `${item.personalInfo?.gradePhase} Specialty`}
                    </td>
                    <td className="px-8 py-6">
                      {viewMode === "students" ? (
                        <Badge className={`rounded-lg px-3 py-1 text-[9px] font-black ${item.paymentReceived ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"}`}>
                           {item.paymentReceived ? "CLEARED" : "OWING"}
                        </Badge>
                      ) : <Badge className="bg-indigo-100 text-indigo-600 uppercase text-[9px] font-black">{item.status || "active"}</Badge>}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <Button variant="ghost" size="icon" className="hover:bg-white hover:shadow-md rounded-xl" onClick={() => {setSelectedItem(item); setSelectedType(viewMode === "students" ? "student" : "teacher"); setShowModal(true);}}>
                        <Eye size={20} className="text-indigo-600"/>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Management: Announcements & Timetable */}
        <div className="grid grid-cols-1 gap-8">
          <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden">
            <CardHeader className="p-8 cursor-pointer hover:bg-slate-50 flex flex-row items-center justify-between" onClick={() => setAnnouncementExpanded(!announcementExpanded)}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center"><Megaphone size={24} /></div>
                <CardTitle className="text-xl font-black text-slate-800">School Broadcast System</CardTitle>
              </div>
              {announcementExpanded ? <ChevronUp /> : <ChevronDown />}
            </CardHeader>
            {announcementExpanded && (
              <CardContent className="p-8 pt-0 space-y-4 animate-in slide-in-from-top-4 duration-300">
                <Input placeholder="Announcement Title" value={announcementTitle} onChange={(e) => setAnnouncementTitle(e.target.value)} className="rounded-xl border-slate-100 bg-slate-50 font-bold" />
                <Textarea placeholder="Write message details..." value={announcementBody} onChange={(e) => setAnnouncementBody(e.target.value)} className="rounded-xl border-slate-100 bg-slate-50 min-h-[100px]" />
                <Button disabled={isPublishing} onClick={handlePublishAnnouncement} className="w-full bg-slate-900 text-white rounded-xl font-black h-12">
                   {isPublishing ? "Publishing..." : "SEND TO ALL USERS"} <SendHorizontal className="ml-2" size={18} />
                </Button>
              </CardContent>
            )}
          </Card>

          <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden">
            <CardHeader className="p-8 cursor-pointer hover:bg-slate-50 flex flex-row items-center justify-between" onClick={() => setTimetableExpanded(!timetableExpanded)}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center"><Calendar size={24} /></div>
                <CardTitle className="text-xl font-black text-slate-800">Timetable Scheduler</CardTitle>
              </div>
              {timetableExpanded ? <ChevronUp /> : <ChevronDown />}
            </CardHeader>
            {timetableExpanded && (
              <CardContent className="p-8 pt-0 animate-in slide-in-from-top-4 duration-300">
                <TimetableManager onSave={saveTimetableSlot} />
              </CardContent>
            )}
          </Card>
        </div>
      </div>

      {/* Record Dossier Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-3xl rounded-[3rem] p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
            <DialogHeader>
              <h2 className="text-3xl font-black italic tracking-tighter">Academic Dossier</h2>
              <p className="text-indigo-400 font-bold text-[10px] uppercase tracking-[0.3em]">{selectedType} record profile</p>
            </DialogHeader>
            {selectedType === "teacher" ? <Briefcase size={32} className="text-indigo-500 opacity-50"/> : <Users size={32} className="text-indigo-500 opacity-50"/>}
          </div>
          
          <div className="p-8">
            <Tabs defaultValue="overview">
              <TabsList className="grid w-full grid-cols-2 mb-8 bg-slate-100 rounded-2xl p-1 h-12">
                <TabsTrigger value="overview" className="font-black uppercase text-[10px]">Overview</TabsTrigger>
                <TabsTrigger value="action" className="font-black uppercase text-[10px]">{selectedType === "student" ? "Finance" : "Review Docs"}</TabsTrigger>
              </TabsList>
              
             <TabsContent value="overview" className="grid grid-cols-2 gap-4 animate-in fade-in duration-500">
                <InfoBox 
                  label="Full Name" 
                  value={
                    selectedType === "student" 
                      ? `${selectedItem?.firstName ?? ""} ${selectedItem?.lastName ?? ""}`.trim() 
                      : `${selectedItem?.personalInfo?.firstName ?? selectedItem?.firstName ?? ""} ${selectedItem?.personalInfo?.lastName ?? selectedItem?.lastName ?? ""}`.trim()
                  } 
                />
                <InfoBox 
                  label="Contact Email" 
                  value={selectedItem?.personalInfo?.email || selectedItem?.email || selectedItem?.parentEmail || "N/A"} 
                />
                <InfoBox 
                  label="Grade/Phase" 
                  value={selectedItem?.personalInfo?.gradePhase || selectedItem?.grade || "N/A"} 
                />
                <InfoBox 
                  label="Registry Status" 
                  value={selectedItem?.status || selectedItem?.applicationStatus || "Active"} 
                />
                
                {selectedType === "teacher" && (
                  <div className="col-span-2 space-y-2 mt-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase">Specializations</Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedItem?.subjects && selectedItem.subjects.length > 0 ? (
                        selectedItem.subjects.map((s: any, i: number) => (
                          <Badge key={i} className="bg-indigo-50 text-indigo-600 border-indigo-100 rounded-lg">
                            {s.name || s}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">No subjects listed</span>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>


              <TabsContent value="action" className="animate-in fade-in duration-500">
                {selectedType === "student" ? (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Arrears</p>
                        <h3 className="text-3xl font-black text-rose-600">R{(Number(pendingAmount) || 0).toFixed(2)}</h3>
                      </div>
                      <Badge className={selectedItem?.paymentReceived ? "bg-emerald-500" : "bg-rose-500"}>
                        {selectedItem?.paymentReceived ? "Cleared" : "Payment Due"}
                      </Badge>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto border border-slate-100 rounded-2xl">
                      <table className="w-full text-left">
                        <tbody className="divide-y divide-slate-50">
                          {paymentHistory.map((inv) => (
                            <tr key={inv.id} className="text-xs">
                              <td className="p-4 font-bold text-slate-800">{inv.category}</td>
                              <td className="p-4 text-right font-black">R{(Number(inv.amount) || 0).toFixed(2)}</td>
                              <td className="p-4 text-right">
                                {inv.status === "pending" ? (
                                  <Button size="sm" onClick={() => clearSingleInvoice(inv.id, selectedItem)} className="bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl text-[9px] font-black h-8 px-4">CLEAR</Button>
                                ) : <CheckCircle size={16} className="text-emerald-500 ml-auto"/>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100">
                      <h4 className="text-[10px] font-black text-indigo-600 uppercase mb-4 flex items-center gap-2"><FileText size={14}/> Credential Documents</h4>
                      <div className="grid grid-cols-1 gap-2">
                        {selectedItem?.documents && Object.entries(selectedItem.documents).map(([key, urls]: any) => (
                          <a key={key} href={urls[0]} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 bg-white rounded-xl border border-indigo-200 hover:border-indigo-400 transition-colors">
                            <span className="text-[10px] font-black text-slate-600 uppercase">{key}</span>
                            <Eye size={14} className="text-indigo-500" />
                          </a>
                        ))}
                      </div>
                    </div>
                    {selectedItem?.status === "submitted" && (
                      <Button onClick={() => handleApproveTeacher(selectedItem.id, selectedItem.uid)} className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-lg">AUTHORIZE STAFF PROFILE</Button>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      <TeacherReviewModal 
        application={selectedTeacherApp}
        onClose={() => setSelectedTeacherApp(null)}
        onApprove={(appId, uid) => {
          handleApproveTeacher(appId, uid);
          setSelectedTeacherApp(null);
        }}
      />
    </div>
  );
};

/* ---------------- Helper Components ---------------- */
const StatCard = ({ label, value, sub, icon, color }: any) => (
  <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-white flex items-center gap-5">
    <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center text-white shadow-lg`}>{icon}</div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <h3 className="text-2xl font-black text-slate-900">{value}</h3>
      <p className="text-[10px] font-bold text-slate-400">{sub}</p>
    </div>
  </div>
);

const InfoBox = ({ label, value }: any) => (
  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{label}</p>
    <p className="text-sm font-bold text-slate-800">{value || "N/A"}</p>
  </div>
);

export default PrincipalDashboard;