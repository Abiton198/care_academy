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
  orderBy,
  deleteDoc
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
  GraduationCap, Megaphone, Calendar, DollarSign, SendHorizontal,
  ShieldCheck, FileText, Briefcase, Trash2, Loader2
} from "lucide-react";

/* ---------------- Sub-Component: Global Billing Modal ---------------- */
const GlobalBillingModal = ({ students, isOpen, onOpenChange, onBill, isPublishing }: any) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [billingAmount, setBillingAmount] = useState(1200);

  const toggleAll = () => {
    if (selectedIds.length === students.length) setSelectedIds([]);
    else setSelectedIds(students.map((s: any) => s.id));
  };

  const toggleOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
        <div className="bg-slate-900 p-6 text-white">
          <DialogHeader><DialogTitle className="font-black text-2xl uppercase italic tracking-tighter">Global Billing Engine</DialogTitle></DialogHeader>
        </div>
        <div className="space-y-6 p-8">
          <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <Label className="font-bold text-slate-600">Standard Tuition Fee</Label>
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-400">R</span>
              <Input type="number" value={billingAmount} onChange={(e) => setBillingAmount(Number(e.target.value))} className="w-32 rounded-xl text-right font-black border-slate-200" />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto border border-slate-100 rounded-2xl">
            <div className="flex items-center gap-3 p-4 border-b border-slate-100 bg-slate-50/50 sticky top-0 z-10">
              <input type="checkbox" checked={selectedIds.length === students.length && students.length > 0} onChange={toggleAll} className="w-5 h-5 rounded-lg accent-indigo-600 cursor-pointer" />
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Select All Enrolled ({students.length})</span>
            </div>
            {students.map((s: any) => (
              <div key={s.id} className="flex items-center gap-3 p-4 hover:bg-indigo-50/30 border-b border-slate-50 last:border-0">
                <input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => toggleOne(s.id)} className="w-5 h-5 rounded-lg accent-indigo-600 cursor-pointer" />
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-700">{s.firstName} {s.lastName}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">{s.grade}</span>
                </div>
              </div>
            ))}
          </div>
          <Button disabled={selectedIds.length === 0 || isPublishing} onClick={() => onBill(selectedIds, billingAmount)} className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-lg">
            {isPublishing ? "GENERATING..." : `GENERATE ${selectedIds.length} INVOICES`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ---------------- Main Component ---------------- */
const PrincipalDashboard: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"students" | "teachers">("students");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  
  const [timetableExpanded, setTimetableExpanded] = useState(false);
  const [announcementExpanded, setAnnouncementExpanded] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");

  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedType, setSelectedType] = useState<"student" | "teacher" | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [pendingAmount, setPendingAmount] = useState<number>(0);
  const [pendingTeachers, setPendingTeachers] = useState<any[]>([]);
  const [selectedTeacherApp, setSelectedTeacherApp] = useState<any | null>(null);
  const teacherUsersQuery = query(collection(db, "users"), where("role", "==", "teacher"), where("applicationStatus", "==", "submitted"));


  const navigate = useNavigate();
   const { user, logout } = useAuth();


  // 1. DATA LISTENERS
const unsubStudents = onSnapshot(collection(db, "students"), (snap) => {
  setStudents(
    snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,                              // Firestore doc id
        studentId: data.studentId ?? d.id,    // ✅ GUARANTEE studentId
        ...data,
      };
    })
  );
});

useEffect(() => {
        const unsubPendingTeachers = onSnapshot(teacherUsersQuery, async (snap) => {
      const pendingList = await Promise.all(snap.docs.map(async (userDoc) => {
        const userData = userDoc.data();
        if (userData.lastSubmissionId) {
          const appDoc = await getDoc(doc(db, "teacherApplications", userData.lastSubmissionId));
          return { id: appDoc.id, uid: userDoc.id, ...appDoc.data(), email: userData.email, personalInfo: appDoc.data()?.personalInfo || {} };
        }
        return null;
      }));
      setPendingTeachers(pendingList.filter(t => t !== null));
      setLoading(false);
    });

    const unsubApps = onSnapshot(collection(db, "teacherApplications"), (snap) => {
      setTeachers(snap.docs.map(d => ({ id: d.id, ...d.data() }))); 
    });

    return () => { unsubStudents(); unsubPendingTeachers(); unsubApps(); };
  }, []);

  // 2. FINANCE LISTENER
// Corrected Finance Listener for PrincipalDashboard.tsx
useEffect(() => {
  if (!selectedItem || selectedType !== "student") return;

  const sid = selectedItem.studentId || selectedItem.id;
  if (!sid) return;

  const q = query(
    collection(db, "invoices"),
    where("studentId", "==", sid),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snap) => {
    const invoices = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setPaymentHistory(invoices);

    // ✅ CALCULATE BALANCE
    const pending = invoices
      .filter(inv => inv.status === "pending")
      .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

    setPendingAmount(pending);
  });
}, [selectedItem, selectedType]);

  // 3. HANDLERS (DEFINED BEFORE RETURN)
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

  const handleApproveStudent = async (studentId: string) => {
    try {
      await updateDoc(doc(db, "students", studentId), { status: "enrolled", enrolledAt: serverTimestamp() });
      alert("Student enrolled.");
    } catch (err) { console.error(err); }
  };

  const handleApproveTeacher = async (teacherAppId: string, teacherUid: string) => {
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, "teacherApplications", teacherAppId), { status: "approved", verifiedAt: serverTimestamp() });
      batch.update(doc(db, "users", teacherUid), { applicationStatus: "approved", role: "teacher" });
      await batch.commit();
      alert("Teacher authorized.");
    } catch (err) { console.error(err); }
  };

 const handleBulkBill = async (ids: string[], amount: number) => {
  setIsPublishing(true);
  try {
    const batch = writeBatch(db);
    const monthYear = new Date().toLocaleString("default", { month: "long", year: "numeric" });

    ids.forEach(studentId => {
      const student = students.find(s => s.id === studentId);

      if (!student) {
        console.warn("Student not found:", studentId);
        return;
      }

      // Make sure parentId exists
      const parentId = student.parentId;
      if (!parentId) {
        console.warn("Parent ID missing for student:", studentId, student.firstName, student.lastName);
        return;
      }

      const invRef = doc(collection(db, "invoices"));
      batch.set(invRef, {
        studentId,
        parentId, // ✅ assign exactly the student's parentId
        studentNames: `${student.firstName} ${student.lastName}`,
        amount,
        category: `${monthYear} Tuition`,
        status: "pending",
        isVerifiedByPrincipal: true,
        createdAt: serverTimestamp(),
      });

      console.log(`Invoice created for ${student.firstName} ${student.lastName} → parentId: ${parentId}`);

      // Update student record to track payment
      batch.update(doc(db, "students", studentId), { paymentReceived: false });
    });

    await batch.commit();
    setIsBillingModalOpen(false);
    alert("Billing complete. Check console for invoice logs.");
  } catch (err) {
    console.error("Bulk billing error:", err);
  } finally {
    setIsPublishing(false);
  }
};



  const clearSingleInvoice = async (invoiceId: string, student: any) => {
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, "invoices", invoiceId), { status: "paid", clearedAt: serverTimestamp(), verifiedBy: "Principal" });
      const remaining = paymentHistory.filter(inv => inv.id !== invoiceId && inv.status === "pending");
      batch.update(doc(db, "students", student.id), { paymentReceived: remaining.length === 0 });
      await batch.commit();
    } catch (err) { console.error(err); }
  };

 const deleteInvoice = async (invoiceId: string, studentId: string) => {
  if (!window.confirm("Permanently delete this invoice? This will affect the student's balance.")) return;

  try {
    // 1. Perform the deletion FIRST
    await deleteDoc(doc(db, "invoices", invoiceId));
    
    // 2. ONLY if deletion succeeds, update the student status
    // We filter the LOCAL paymentHistory state to check what's left
    const remainingPending = paymentHistory.filter(
      inv => inv.id !== invoiceId && inv.status === "pending"
    );

    await updateDoc(doc(db, "students", studentId), { 
      paymentReceived: remainingPending.length === 0 
    });

    alert("Invoice removed successfully.");
  } catch (err: any) {
    console.error("Delete failed:", err);
    // If it fails (like your Permission error), this alert will trigger
    // and the code above will NOT run, preventing the "fake" clearing of payment.
    alert(`Error: ${err.message}. The record was not deleted.`);
  }
};

  const saveTimetableSlot = async (slotData: any) => {
    await addDoc(collection(db, "timetable"), { ...slotData, updatedAt: serverTimestamp() });
  };

  // 4. MEMOS
  const stats = useMemo(() => {
    const enrolled = students.filter(s => s.status === "enrolled");
    return {
      totalStudents: enrolled.length,
      totalTeachers: teachers.filter(t => t.status === "approved").length,
      unpaid: enrolled.filter(s => !s.paymentReceived).length,
      pendingApps: students.filter(s => s.status === "pending").length + pendingTeachers.length,
    };
  }, [students, teachers, pendingTeachers]);

  const filteredData = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    if (viewMode === "students") {
      return students.filter(s => {
        const matchesSearch = `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchLower);
        const matchesPay = paymentFilter === "all" ? true : (paymentFilter === "paid" ? s.paymentReceived : !s.paymentReceived);
        return matchesSearch && matchesPay && s.status === "enrolled";
      });
    }
    return teachers.filter(t => `${t.personalInfo?.firstName} ${t.personalInfo?.lastName}`.toLowerCase().includes(searchLower) && (t.status === "approved" || t.status === "submitted"));
  }, [viewMode, students, teachers, searchTerm, paymentFilter]);

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 pb-24">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white">
          <GraduationCap size={32} />
        </div>
        <div>
          {/* Display dynamic name */}
    <h1 className="text-2xl font-black text-slate-900">
  {user
    ? user.role === "principal"
      ? `Principal ${user.firstName || ""} `  // ✅ show actual name
      : user.role === "teacher"
      ? `Teacher ${user.firstName || user.email?.split("@")[0] || ""}`
      : "Care Academy Admin"
    : "Care Academy"}
</h1>

          {/* Display role dynamically */}
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
            {user?.role === "principal"
              ? "Principal Command"
              : user?.role === "teacher"
              ? "Teacher Dashboard"
              : "Admin Panel"}
          </p>
        </div>
      </div>
      <div className="flex gap-4">
        <Button
          onClick={() => setIsBillingModalOpen(true)}
          className="bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black shadow-lg"
        >
          <DollarSign className="mr-2" size={18} /> GLOBAL BILLING
        </Button>
        <Button
          variant="ghost"
          className="font-bold text-slate-400"
          onClick={async () => {
            await logout();
            navigate("/");
          }}
        >
          <LogOut className="mr-2 h-4 w-4" /> Logout
        </Button>
      </div>
    </header>

        {/* ANALYTICS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard label="Learners" value={stats.totalStudents} sub="Active Enrollment" color="bg-indigo-600" icon={<Users/>} />
          <StatCard label="Accounts" value={stats.unpaid} sub="Payments Pending" color="bg-rose-500" icon={<DollarSign/>} />
          <StatCard label="Faculty" value={stats.totalTeachers} sub="Approved Staff" color="bg-emerald-500" icon={<CheckCircle/>} />
          <StatCard label="Requests" value={stats.pendingApps} sub="Needs Review" color="bg-amber-500" icon={<ShieldCheck/>} />
        </div>

        {/* PENDING NOTIFICATIONS */}
        <div className="space-y-4">
            {students.filter(s => s.status === "pending").length > 0 && (
                <PendingSection title="Pending Learners" items={students.filter(s => s.status === "pending")} onApprove={handleApproveStudent} type="student" />
            )}
            {pendingTeachers.length > 0 && (
                <PendingSection title="Faculty Verifications" items={pendingTeachers} onApprove={(id) => setSelectedTeacherApp(pendingTeachers.find(t => t.id === id))} type="teacher" />
            )}
        </div>

        {/* TABLE */}
        <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden">
          <CardHeader className="p-8 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex bg-white shadow-sm p-1.5 rounded-[1.5rem] border border-slate-100">
                <button onClick={() => setViewMode("students")} className={`px-8 py-2.5 rounded-[1.2rem] text-sm font-black transition-all ${viewMode === "students" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400"}`}>Learners</button>
                <button onClick={() => setViewMode("teachers")} className={`px-8 py-2.5 rounded-[1.2rem] text-sm font-black transition-all ${viewMode === "teachers" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400"}`}>Teachers</button>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <Input placeholder="Search records..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-12 rounded-2xl border-none bg-slate-100/80 font-medium" />
                {viewMode === "students" && (
                  <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                    <SelectTrigger className="w-40 h-12 rounded-2xl bg-slate-100/80 border-none font-black text-[10px] uppercase"><SelectValue/></SelectTrigger>
                    <SelectContent><SelectItem value="all">All Finance</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="pending">Owing</SelectItem></SelectContent>
                  </Select>
                )}
              </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-[10px] font-black uppercase text-slate-400">
                  <th className="px-8 py-5 text-left">Identity</th>
                  <th className="px-8 py-5 text-left">Academic Level</th>
                  <th className="px-8 py-5 text-left">Status</th>
                  <th className="px-8 py-5 text-right">Dossier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredData.map((item: any) => (
                  <tr key={item.id} className="hover:bg-indigo-50/20 transition-all group">
                    <td className="px-8 py-6">
                      <div className="font-black text-slate-800 text-sm">{viewMode === "students" ? `${item.firstName} ${item.lastName}` : `${item.personalInfo?.firstName} ${item.personalInfo?.lastName}`}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">{item.parentEmail || item.personalInfo?.email}</div>
                    </td>
                    <td className="px-8 py-6 text-xs font-bold text-slate-500 uppercase">{viewMode === "students" ? item.grade : item.personalInfo?.gradePhase}</td>
                    <td className="px-8 py-6">
                      {viewMode === "students" ? (
                        <Badge className={`rounded-lg px-3 py-1 text-[9px] font-black border-none ${item.paymentReceived ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"}`}>
                           {item.paymentReceived ? "CLEARED" : "OWING"}
                        </Badge>
                      ) : <Badge className="bg-indigo-100 text-indigo-600 uppercase text-[9px] font-black border-none">{item.status || "active"}</Badge>}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <Button variant="ghost" size="icon" className="group-hover:bg-white rounded-xl shadow-sm" onClick={() => {setSelectedItem(item); setSelectedType(viewMode === "students" ? "student" : "teacher"); setShowModal(true);}}>
                        <Eye size={18} className="text-indigo-600"/>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* MANAGEMENT CARDS */}
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
            <ManagementCard title="Broadcast" icon={<Megaphone/>} color="bg-amber-100" expanded={announcementExpanded} onToggle={() => setAnnouncementExpanded(!announcementExpanded)}>
                <Input placeholder="Subject" value={announcementTitle} onChange={(e) => setAnnouncementTitle(e.target.value)} className="rounded-xl bg-slate-50 font-bold" />
                <Textarea placeholder="Message..." value={announcementBody} onChange={(e) => setAnnouncementBody(e.target.value)} className="rounded-xl bg-slate-50 min-h-[100px]" />
                <Button disabled={isPublishing} onClick={handlePublishAnnouncement} className="w-full bg-slate-900 text-white rounded-xl font-black h-12">
                    {isPublishing ? "SENDING..." : "PUBLISH BROADCAST"}
                </Button>
            </ManagementCard>
            <ManagementCard title="Timetable" icon={<Calendar/>} color="bg-indigo-100" expanded={timetableExpanded} onToggle={() => setTimetableExpanded(!timetableExpanded)}>
                <TimetableManager onSave={saveTimetableSlot} />
            </ManagementCard>
        </div>

        {/* DOSSIER MODAL */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="max-w-3xl rounded-[3rem] p-0 overflow-hidden border-none shadow-2xl">
            <div className="bg-slate-900 p-8 text-white flex justify-between items-center relative overflow-hidden">
                <div className="z-10">
                    <h2 className="text-3xl font-black italic tracking-tighter uppercase">Academic Dossier</h2>
                    <p className="text-indigo-400 font-bold text-[10px] uppercase tracking-[0.3em]">{selectedType} record profile</p>
                </div>
                <div className="bg-white/10 p-4 rounded-3xl backdrop-blur-md z-10">
                    {selectedType === "teacher" ? <Briefcase size={32} /> : <Users size={32} />}
                </div>
            </div>
            
            <div className="p-8">
              <Tabs defaultValue="overview">
                <TabsList className="grid w-full grid-cols-2 mb-8 bg-slate-100 rounded-2xl p-1 h-12">
                  <TabsTrigger value="overview" className="font-black uppercase text-[10px]">Overview</TabsTrigger>
                  <TabsTrigger value="action" className="font-black uppercase text-[10px]">{selectedType === "student" ? "Financial Ledger" : "Credentials"}</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="grid grid-cols-2 gap-6">
                  <InfoBox label="Full Name" value={selectedType === "student" ? `${selectedItem?.firstName} ${selectedItem?.lastName}` : `${selectedItem?.personalInfo?.firstName} ${selectedItem?.personalInfo?.lastName}`} />
                  <InfoBox label="Email" value={selectedItem?.personalInfo?.email || selectedItem?.parentEmail || "N/A"} />
                  <InfoBox label="Level" value={selectedItem?.grade || selectedItem?.personalInfo?.gradePhase || "N/A"} />
                  <InfoBox label="Status" value={selectedItem?.status || "Active"} />
                </TabsContent>

                <TabsContent value="action">
                  {selectedType === "student" ? (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center bg-slate-900 p-8 rounded-[2.5rem] text-white">
                        <div>
                          <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">Balance Owed</p>
                          <h3 className="text-4xl font-black italic">R{pendingAmount.toFixed(2)}</h3>
                        </div>
                        <Badge className={`h-10 px-6 rounded-xl font-black text-[10px] uppercase border-none ${selectedItem?.paymentReceived ? "bg-emerald-500" : "bg-rose-500"}`}>
                          {selectedItem?.paymentReceived ? "CLEARED" : "PENDING"}
                        </Badge>
                      </div>
                      <div className="overflow-hidden border border-slate-100 rounded-[2rem]">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 border-b border-slate-100">
                            <tr className="text-[9px] font-black uppercase text-slate-400"><th className="p-5">Details</th><th className="p-5 text-right">Amount</th><th className="p-5 text-center">Controls</th></tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {paymentHistory.map((inv) => (
                              <tr key={inv.id} className="text-xs">
                                <td className="p-5">
                                  <p className="font-black text-slate-800 uppercase">{inv.category}</p>
                                  <p className="text-[9px] text-slate-400 font-bold">{inv.createdAt?.seconds ? new Date(inv.createdAt.seconds * 1000).toLocaleDateString() : "Draft"}</p>
                                </td>
                                <td className="p-5 text-right font-black text-slate-700">R{inv.amount.toFixed(2)}</td>
                                <td className="p-5 flex justify-center gap-2">
                                  {inv.status === "pending" ? (
                                    <>
                                      <Button size="sm" onClick={() => clearSingleInvoice(inv.id, selectedItem)} className="bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl text-[9px] font-black h-8 px-4 border-none">CLEAR</Button>
                                      <Button size="sm" variant="ghost" onClick={() => deleteInvoice(inv.id, selectedItem.id)} className="h-8 w-8 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl"><Trash2 size={14}/></Button>
                                    </>
                                  ) : <div className="text-emerald-500 font-black text-[10px] flex items-center gap-1 uppercase"><CheckCircle size={14}/> Paid</div>}
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
                        <h4 className="text-[10px] font-black text-indigo-600 uppercase mb-4 flex items-center gap-2 tracking-widest"><FileText size={14}/> Verifiable Attachments</h4>
                        {selectedItem?.documents && Object.entries(selectedItem.documents).map(([key, urls]: any) => (
                            <a key={key} href={urls[0]} target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 bg-white rounded-2xl border border-indigo-100 hover:shadow-md transition-all mb-2">
                              <span className="text-[10px] font-black text-slate-600 uppercase">{key}</span>
                              <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600"><Eye size={14} /></div>
                            </a>
                        ))}
                      </div>
                      {selectedItem?.status === "submitted" && (
                        <Button onClick={() => handleApproveTeacher(selectedItem.id, selectedItem.uid)} className="w-full h-16 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-[1.5rem] shadow-xl text-sm tracking-widest">AUTHORIZE STAFF</Button>
                      )}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </DialogContent>
        </Dialog>

        {/* MODALS */}
        <GlobalBillingModal students={students.filter(s => s.status === "enrolled")} isOpen={isBillingModalOpen} onOpenChange={setIsBillingModalOpen} onBill={handleBulkBill} isPublishing={isPublishing} />
        <TeacherReviewModal application={selectedTeacherApp} onClose={() => setSelectedTeacherApp(null)} onApprove={(appId, uid) => { handleApproveTeacher(appId, uid); setSelectedTeacherApp(null); }} />
      </div>
    </div>
  );
};

/* ---------------- UI HELPERS ---------------- */
const StatCard = ({ label, value, sub, icon, color }: any) => (
  <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-white flex items-center gap-5 transition-all hover:shadow-2xl hover:-translate-y-1">
    <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center text-white shadow-lg`}>{icon}</div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <h3 className="text-2xl font-black text-slate-800 tracking-tighter">{value}</h3>
      <p className="text-[9px] font-bold text-slate-400 italic">{sub}</p>
    </div>
  </div>
);

const PendingSection = ({ title, items, onApprove, type }: any) => (
  <section className={`${type === 'student' ? 'bg-rose-50/50 border-rose-200' : 'bg-indigo-50/50 border-indigo-200'} p-6 rounded-[3rem] border-2 border-dashed`}>
    <h3 className={`text-[10px] font-black ${type === 'student' ? 'text-rose-600' : 'text-indigo-600'} uppercase tracking-[0.2em] mb-4 flex items-center gap-2`}><ShieldCheck size={14} /> {title}</h3>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {items.map((item: any) => (
        <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center transition-all hover:shadow-md">
          <div className="overflow-hidden">
            <p className="font-black text-slate-800 text-xs uppercase truncate">{item.firstName || item.personalInfo?.firstName} {item.lastName || item.personalInfo?.lastName}</p>
            <p className="text-[9px] font-bold text-slate-400 italic uppercase">{item.grade || item.personalInfo?.gradePhase}</p>
          </div>
          <Button onClick={() => onApprove(item.id, item.uid)} size="sm" className={`${type === 'student' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-indigo-600 hover:bg-indigo-700'} text-white font-black text-[9px] rounded-lg h-8`}>REVIEW</Button>
        </div>
      ))}
    </div>
  </section>
);

const ManagementCard = ({ title, icon, color, expanded, onToggle, children }: any) => (
  <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden">
    <CardHeader className="p-8 cursor-pointer hover:bg-slate-50 flex flex-row items-center justify-between transition-colors" onClick={onToggle}>
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center text-slate-600`}>{icon}</div>
        <CardTitle className="text-xl font-black text-slate-800 italic tracking-tighter">{title}</CardTitle>
      </div>
      <div className="text-slate-300" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}><ChevronDown /></div>
    </CardHeader>
    {expanded && <CardContent className="p-8 pt-0 space-y-4">{children}</CardContent>}
  </Card>
);

const InfoBox = ({ label, value }: any) => (
  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 transition-all hover:bg-white hover:shadow-sm">
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    <p className="font-black text-slate-800 text-sm tracking-tight">{value || "Not Set"}</p>
  </div>
);

export default PrincipalDashboard;