"use client";

import React, { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebaseConfig";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  setDoc,
  query,
  where,
  getDocs,
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

import { useAuth } from "@/components/auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import TimetableManager from "@/lib/TimetableManager";
import {
  LogOut, Search, Eye, Users, CheckCircle, ChevronDown, ChevronUp, MapPin, 
  Laptop, GraduationCap, Megaphone, Calendar, DollarSign, SendHorizontal
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
}

interface Teacher {
  id: string;
  uid?: string;
  personalInfo?: { firstName?: string; lastName?: string; email?: string; };
  status?: "pending" | "approved" | "rejected";
}

const PrincipalDashboard: React.FC = () => {
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

  const { logout } = useAuth();
  const navigate = useNavigate();

  /* ---------------- Real-time Listeners ---------------- */
  useEffect(() => {
    const unsubStudents = onSnapshot(collection(db, "students"), (snap) => {
      setStudents(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Student) })));
    });
    const unsubTeachers = onSnapshot(collection(db, "teacherApplications"), (snap) => {
      setTeachers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Teacher) })));
      setLoading(false);
    });
    return () => { unsubStudents(); unsubTeachers(); };
  }, []);

  /* ---------------- Student Finance Listener ---------------- */
  useEffect(() => {
    if (selectedType === "student" && selectedItem?.id && showModal) {
      // Query invoices specifically for this student
      const q = query(
        collection(db, "invoices"),
        where("studentId", "==", selectedItem.id),
        orderBy("createdAt", "desc")
      );

      const unsub = onSnapshot(q, (snap) => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setPaymentHistory(docs);
        
        // Calculate pending total safely
        const total = docs
          .filter(d => d.status === "pending")
          .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
        setPendingAmount(total);
      });
      return () => unsub();
    }
  }, [selectedItem, selectedType, showModal]);

  /* ---------------- Finance Handlers ---------------- */
  
  const clearSingleInvoice = async (invoiceId: string, student: any) => {
    try {
      const batch = writeBatch(db);
      const invoiceRef = doc(db, "invoices", invoiceId);
      
      batch.update(invoiceRef, { 
        status: "paid", 
        clearedAt: serverTimestamp(),
        clearedBy: "Principal" 
      });

      // Check if this was the last pending invoice for this child
      const otherPending = paymentHistory.filter(inv => inv.id !== invoiceId && inv.status === "pending");
      
      if (otherPending.length === 0) {
        const studentRef = doc(db, "students", student.id);
        batch.update(studentRef, { 
          paymentReceived: true,
          lastPaymentDate: serverTimestamp()
        });
      }

      await batch.commit();
    } catch (err) {
      console.error("Payment clear failed:", err);
    }
  };

  const generateMonthlyInvoices = async () => {
    if (!window.confirm("Generate monthly invoices for all enrolled students?")) return;
    setIsPublishing(true);

    try {
      const batch = writeBatch(db);
      const monthName = new Date().toLocaleString('default', { month: 'long' });
      const currentYear = new Date().getFullYear();
      
      // Prevent duplicates: find students who already have a pending invoice for this cycle
      const invSnap = await getDocs(query(collection(db, "invoices"), where("status", "==", "pending")));
      const alreadyBilledIds = new Set(invSnap.docs.map(doc => doc.data().studentId));

      let count = 0;
      const processedThisLoop = new Set();

      students.forEach((s) => {
        if (s.status === "enrolled" && !alreadyBilledIds.has(s.id) && !processedThisLoop.has(s.id)) {
          processedThisLoop.add(s.id);
          count++;

          const invRef = doc(collection(db, "invoices"));
          batch.set(invRef, {
            parentId: s.parentId || "unknown",
            studentId: s.id,
            studentNames: `${s.firstName} ${s.lastName}`,
            amount: 1200, // 💡 Number type (no quotes)
            category: `${monthName} ${currentYear} Tuition`,
            status: "pending",
            createdAt: serverTimestamp(),
          });

          // Flick student status to "Owing" (Red)
          batch.update(doc(db, "students", s.id), { 
            paymentReceived: false,
            lastInvoiceDate: serverTimestamp() 
          });
        }
      });

      if (count > 0) {
        await batch.commit();
        alert(`Successfully generated ${count} invoices.`);
      } else {
        alert("No new students required billing.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPublishing(false);
    }
  };

  /* ---------------- Analytics & Filters ---------------- */
  const stats = useMemo(() => ({
    totalStudents: students.length,
    campus: students.filter(s => s.learningMode === "Campus").length,
    virtual: students.filter(s => (s.learningMode || "Virtual") === "Virtual").length,
    totalTeachers: teachers.filter(t => t.status === "approved").length,
    unpaid: students.filter(s => !s.paymentReceived).length,
    pendingApps: teachers.filter(t => t.status === "pending").length,
  }), [students, teachers]);

  const filteredData = useMemo(() => {
    if (viewMode === "students") {
      return students.filter(s => {
        const matchesSearch = `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesPay = paymentFilter === "all" ? true : (paymentFilter === "paid" ? s.paymentReceived : !s.paymentReceived);
        return matchesSearch && matchesPay;
      });
    }
    return teachers.filter(t => `${t.personalInfo?.firstName}`.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [viewMode, students, teachers, searchTerm, paymentFilter]);

  const handleLogout = async () => { await logout(); navigate("/login"); };

  return (
    <div className="min-h-screen bg-[#f1f5f9] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center bg-white/70 backdrop-blur-md p-6 rounded-[2.5rem] shadow-xl border border-white/50">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
              <GraduationCap size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 leading-tight">Care Academy Console</h1>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">Administration Panel</p>
            </div>
          </div>
          <div className="flex gap-4">
            <Button onClick={generateMonthlyInvoices} className="bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black shadow-lg">
              <DollarSign className="mr-2" size={18} /> RUN BILLING
            </Button>
            <Button variant="ghost" className="rounded-2xl font-bold text-slate-500 hover:bg-rose-50 hover:text-rose-600" onClick={handleLogout}>
              <LogOut size={18} className="mr-2" /> Sign Out
            </Button>
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard label="Enrollment" value={stats.totalStudents} sub="Active Learners" color="bg-indigo-600" icon={<Users/>} />
          <StatCard label="Finance" value={stats.unpaid} sub="Unpaid Accounts" color="bg-rose-500" icon={<DollarSign/>} />
          <StatCard label="Staff" value={stats.totalTeachers} sub="Approved Teachers" color="bg-emerald-500" icon={<CheckCircle/>} />
          <StatCard label="Hybrid" value={stats.campus + stats.virtual} sub="Campus & Virtual" color="bg-amber-500" icon={<Laptop/>} />
        </div>

        {/* Table Section */}
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
                  <Input placeholder="Search records..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-12 h-12 rounded-2xl border-none bg-slate-100/80" />
                </div>
                {viewMode === "students" && (
                  <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                    <SelectTrigger className="w-36 h-12 rounded-2xl bg-slate-100/80 border-none font-black text-xs uppercase"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Finance: All</SelectItem>
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
                  <th className="px-8 py-5 text-left">Mode</th>
                  <th className="px-8 py-5 text-left">Status</th>
                  <th className="px-8 py-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredData.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-all">
                    <td className="px-8 py-6">
                      <div className="font-black text-slate-800 text-sm">
                        {viewMode === "students" ? `${item.firstName} ${item.lastName}` : `${item.personalInfo?.firstName} ${item.personalInfo?.lastName}`}
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold">ID: {item.id.slice(0,10)}</div>
                    </td>
                    <td className="px-8 py-6">
                       <Badge variant="secondary" className="rounded-xl px-3 py-1 text-[10px] font-bold">
                         {item.learningMode || "Virtual"}
                       </Badge>
                    </td>
                    <td className="px-8 py-6">
                      {viewMode === "students" ? (
                        <div className={`text-[10px] font-black px-3 py-1.5 rounded-xl flex items-center gap-2 w-fit ${item.paymentReceived ? "text-emerald-700 bg-emerald-100" : "text-rose-700 bg-rose-100"}`}>
                           <span className={`w-2 h-2 rounded-full ${item.paymentReceived ? "bg-emerald-500" : "bg-rose-500 animate-pulse"}`}></span>
                           {item.paymentReceived ? "CLEARED" : "OWING"}
                        </div>
                      ) : <Badge>{item.status || "pending"}</Badge>}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <Button variant="ghost" size="icon" onClick={() => {setSelectedItem(item); setSelectedType(viewMode === "students" ? "student" : "teacher"); setShowModal(true);}}>
                        <Eye size={20}/>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Profile Dialog */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl rounded-[3rem] p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-slate-900 p-8 text-white">
            <DialogHeader>
              <h2 className="text-3xl font-black italic">Record Dossier</h2>
              <p className="text-indigo-300 font-bold text-xs uppercase tracking-widest">{selectedType} information</p>
            </DialogHeader>
          </div>
          
          <div className="p-8">
            <Tabs defaultValue="info">
              <TabsList className="grid w-full grid-cols-2 mb-8 bg-slate-100 rounded-2xl p-1">
                <TabsTrigger value="info" className="font-black uppercase text-xs">Overview</TabsTrigger>
                <TabsTrigger value="finance" className="font-black uppercase text-xs">{selectedType === "student" ? "Finance" : "Review"}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="info" className="grid grid-cols-2 gap-4 animate-in fade-in duration-300">
                <InfoBox label="Full Name" value={selectedType === "student" ? `${selectedItem?.firstName} ${selectedItem?.lastName}` : "Staff Member"} />
                <InfoBox label="Contact" value={selectedItem?.parentEmail || "N/A"} />
                <InfoBox label="Status" value={selectedItem?.status || "Active"} />
                <InfoBox label="Grade" value={selectedItem?.grade || "N/A"} />
              </TabsContent>

              <TabsContent value="finance" className="space-y-6 animate-in fade-in duration-300">
                {selectedType === "student" ? (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Outstanding Amount</p>
                        <h3 className="text-3xl font-black text-rose-600">R{(Number(pendingAmount) || 0).toFixed(2)}</h3>
                      </div>
                      <Badge className={selectedItem?.paymentReceived ? "bg-emerald-500" : "bg-rose-500"}>
                        {selectedItem?.paymentReceived ? "Cleared" : "Payment Due"}
                      </Badge>
                    </div>

                    <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b">
                          <tr className="text-[9px] font-black text-slate-400 uppercase">
                            <th className="p-4">Invoice</th>
                            <th className="p-4 text-right">Amount</th>
                            <th className="p-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {paymentHistory.map((inv) => (
                            <tr key={inv.id} className="text-xs">
                              <td className="p-4 font-bold text-slate-800 uppercase">{inv.category}</td>
                              <td className="p-4 text-right font-black">R{(Number(inv.amount) || 0).toFixed(2)}</td>
                              <td className="p-4 text-right">
                                {inv.status === "pending" ? (
                                  <Button size="sm" onClick={() => clearSingleInvoice(inv.id, selectedItem)} className="bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl text-[9px] font-black h-8 px-4 border border-emerald-100">
                                    CLEAR
                                  </Button>
                                ) : <div className="text-emerald-500 font-black flex items-center justify-end gap-1"><CheckCircle size={12}/> PAID</div>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="p-10 text-center text-slate-400 font-bold italic">Reviewing staff credentials...</div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ---------------- Helper Components ---------------- */
const StatCard = ({ label, value, sub, icon, color }: any) => (
  <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-white flex items-center gap-5">
    <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center text-white shadow-lg`}>
      {icon}
    </div>
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
    <p className="text-sm font-bold text-slate-800">{value}</p>
  </div>
);

export default PrincipalDashboard;

// student approval card still need to be done - showing pending applications only
// teacher profile view still needs to be done