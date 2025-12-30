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
} from "firebase/firestore";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useAuth } from "@/components/auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import TimetableManager from "@/lib/TimetableManager";
import {
  LogOut,
  Search,
  Eye,
  Users,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  MapPin, 
  Laptop,
  GraduationCap,
  Megaphone,
  Calendar,
  DollarSign,
  AlertCircle,
  SendHorizontal
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
}

interface Teacher {
  id: string;
  uid?: string;
  personalInfo?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    yearsOfExperience?: string;
  };
  subjects?: { name: string; curriculum: string }[];
  status?: "pending" | "approved" | "rejected";
  learningMode?: "Campus" | "Virtual";
}

const PrincipalDashboard: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  // UI States
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"students" | "teachers">("students");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [timetableExpanded, setTimetableExpanded] = useState(false);
  const [announcementExpanded, setAnnouncementExpanded] = useState(false);

  // Announcement Form
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  // Modal States
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedType, setSelectedType] = useState<"student" | "teacher" | null>(null);
  const [showModal, setShowModal] = useState(false);

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

  /* ---------------- Analytics ---------------- */   
  const stats = useMemo(() => {
    const totalS = students.length;
    const campusS = students.filter(s => s.learningMode === "Campus").length;
    const virtualS = students.filter(s => (s.learningMode || "Virtual") === "Virtual").length;
    
    return {
      totalStudents: totalS,
      campus: campusS,
      virtual: virtualS,
      totalTeachers: teachers.filter(t => t.status === "approved").length,
      unpaid: students.filter(s => !s.paymentReceived).length,
      pendingApps: teachers.filter(t => t.status === "pending").length,
    };
  }, [students, teachers]);   

  /* ---------------- Filtered Data ---------------- */
  const filteredData = useMemo(() => {
    if (viewMode === "students") {
      return students.filter(s => {
        const matchesSearch = `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesPayment = paymentFilter === "all" ? true : (paymentFilter === "paid" ? s.paymentReceived : !s.paymentReceived);
        return matchesSearch && matchesPayment;
      });
    } else {
      return teachers.filter(t => 
        `${t.personalInfo?.firstName} ${t.personalInfo?.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
  }, [viewMode, students, teachers, searchTerm, paymentFilter]);

  /* ---------------- Handlers ---------------- */
  const handleLogout = async () => { await logout(); navigate("/login"); };

  const handlePublishAnnouncement = async () => {
    if (!announcementTitle || !announcementBody) return;
    setIsPublishing(true);
    try {
      await setDoc(doc(db, "announcements", "active"), {
        title: announcementTitle,
        subject: announcementBody,
        updatedAt: serverTimestamp(),
        author: "Principal Office"
      });
      setAnnouncementTitle("");
      setAnnouncementBody("");
      setAnnouncementExpanded(false);
    } catch (err) { console.error(err); }
    finally { setIsPublishing(false); }
  };

  const updateStatus = async (col: string, id: string, status: string) => {
    await updateDoc(doc(db, col, id), { status, reviewedAt: serverTimestamp() });
    setShowModal(false);
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] p-4 md:p-8 font-sans transition-colors duration-500">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Modern Header */}
        <header className="flex flex-col md:flex-row justify-between items-center bg-white/70 backdrop-blur-md p-6 rounded-[2.5rem] shadow-xl shadow-blue-900/5 border border-white/50">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-tr from-indigo-700 via-indigo-600 to-blue-400 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <GraduationCap size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 leading-tight">Care Academy <span className="text-indigo-600">Console</span></h1>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">Administration v2.0</p>
            </div>
          </div>
          <Button variant="ghost" className="rounded-2xl font-bold text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all" onClick={handleLogout}>
            <LogOut size={18} className="mr-2" /> Sign Out
          </Button>
        </header>

        {/* Dynamic Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard label="Enrollment" value={stats.totalStudents} sub="Active Learners" icon={<Users/>} color="bg-indigo-600" />
          <StatCard label="Finance Status" value={stats.unpaid} sub="Unpaid Accounts" icon={<DollarSign/>} color="bg-rose-500" />
          <StatCard label="Certified Staff" value={stats.totalTeachers} sub={`${stats.pendingApps} Apps Review`} icon={<CheckCircle/>} color="bg-emerald-500" />
          <StatCard 
            label="Learning Modes" 
            value={stats.campus + stats.virtual} 
            sub={`${stats.campus} Campus | ${stats.virtual} Virtual`} 
            icon={<Laptop/>} 
            color="bg-amber-500" 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Registry (Left 2 Columns) */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden">
              <CardHeader className="p-8 border-b border-slate-50 bg-slate-50/30">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="flex bg-white shadow-sm p-1.5 rounded-[1.5rem] border border-slate-100">
                    <button 
                      onClick={() => setViewMode("students")}
                      className={`px-8 py-2.5 rounded-[1.2rem] text-sm font-black transition-all duration-300 ${viewMode === "students" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "text-slate-400 hover:text-slate-600"}`}
                    >Learners</button>
                    <button 
                      onClick={() => setViewMode("teachers")}
                      className={`px-8 py-2.5 rounded-[1.2rem] text-sm font-black transition-all duration-300 ${viewMode === "teachers" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "text-slate-400 hover:text-slate-600"}`}
                    >Teachers</button>
                  </div>

                  <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <Input 
                        placeholder="Filter by name..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-12 h-12 rounded-2xl border-none bg-slate-100/80 focus:bg-white focus:ring-2 ring-indigo-100 transition-all"
                      />
                    </div>
                    {viewMode === "students" && (
                       <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                        <SelectTrigger className="w-36 h-12 rounded-2xl bg-slate-100/80 border-none font-black text-xs text-slate-600 uppercase tracking-tighter"><SelectValue placeholder="Finance"/></SelectTrigger>
                        <SelectContent className="rounded-2xl border-none shadow-2xl">
                          <SelectItem value="all">Total Balance</SelectItem>
                          <SelectItem value="paid">Paid Only</SelectItem>
                          <SelectItem value="pending">Outstanding</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-[600px]">
                  <table className="w-full">
                    <thead className="bg-slate-50/80 sticky top-0 z-10">
                      <tr className="text-[11px] font-black uppercase text-slate-400 tracking-[0.15em]">
                        <th className="px-8 py-5 text-left">Identity</th>
                        <th className="px-8 py-5 text-left">Mode</th>
                        <th className="px-8 py-5 text-left">Account Status</th>
                        <th className="px-8 py-5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredData.map((item: any) => (
                        <tr key={item.id} className="group hover:bg-slate-50/80 transition-all cursor-default">
                          <td className="px-8 py-6">
                            <div className="font-black text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">
                              {viewMode === "students" ? `${item.firstName} ${item.lastName}` : `${item.personalInfo?.firstName} ${item.personalInfo?.lastName}`}
                            </div>
                            <div className="text-[10px] text-slate-400 font-bold tracking-tight">ID: {item.id.slice(0,10)}</div>
                          </td>
                          <td className="px-8 py-6">
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl w-fit font-bold text-[10px] ${item.learningMode === "Campus" ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"}`}>
                              {item.learningMode === "Campus" ? <MapPin size={12}/> : <Laptop size={12}/>}
                              {item.learningMode || "Virtual"}
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            {viewMode === "students" ? (
                               <div className={`text-[10px] font-black px-3 py-1.5 rounded-xl flex items-center gap-2 w-fit ${item.paymentReceived ? "text-emerald-700 bg-emerald-100" : "text-rose-700 bg-rose-100"}`}>
                                 <span className="w-2 h-2 rounded-full animate-pulse bg-current"></span>
                                 {item.paymentReceived ? "CLEARED" : "OWING"}
                               </div>
                            ) : (
                              <Badge variant="outline" className="text-[10px] border-slate-200 uppercase px-3 py-1 rounded-lg">{item.status || "pending"}</Badge>
                            )}
                          </td>
                          <td className="px-8 py-6 text-right">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-none" 
                              onClick={() => {setSelectedItem(item); setSelectedType(viewMode === "students" ? "student" : "teacher"); setShowModal(true);}}
                            >
                              <Eye size={20}/>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Interactive Modules */}
          <div className="space-y-6">
            {/* Collapsible Broadcast Hub */}
            <Card className="border-none shadow-2xl rounded-[2.5rem] bg-indigo-950 text-white overflow-hidden transition-all duration-500">
              <CardHeader 
                className="p-8 cursor-pointer flex flex-row items-center justify-between hover:bg-indigo-900/50 transition-colors"
                onClick={() => setAnnouncementExpanded(!announcementExpanded)}
              >
                <CardTitle className="text-lg font-black flex items-center gap-4">
                  <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-300">
                    <Megaphone size={20}/>
                  </div>
                  Broadcast Hub
                </CardTitle>
                {announcementExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
              </CardHeader>
              
              <div className={`transition-all duration-500 ease-in-out overflow-hidden ${announcementExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}>
                <CardContent className="px-8 pb-8 space-y-5 border-t border-white/5 pt-6">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-indigo-300/50 uppercase tracking-widest">Message Heading</p>
                    <Input 
                      placeholder="e.g. Exam Schedule Release" 
                      value={announcementTitle}
                      onChange={(e) => setAnnouncementTitle(e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-indigo-300/50 uppercase tracking-widest">Full Announcement</p>
                    <textarea 
                      placeholder="Enter details for parents and teachers..."
                      value={announcementBody}
                      onChange={(e) => setAnnouncementBody(e.target.value)}
                      className="w-full bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl p-4 text-sm min-h-[120px] outline-none ring-offset-indigo-950 focus:ring-2 ring-indigo-500/50 transition-all resize-none"
                    />
                  </div>
                  <Button 
                    onClick={handlePublishAnnouncement}
                    disabled={isPublishing}
                    className="w-full h-12 bg-white text-indigo-950 font-black rounded-2xl hover:bg-indigo-50 transition-all shadow-xl shadow-indigo-500/10 group"
                  >
                    {isPublishing ? "Publishing..." : (
                      <span className="flex items-center gap-2">
                        Send to Community <SendHorizontal size={16} className="group-hover:translate-x-1 transition-transform"/>
                      </span>
                    )}
                  </Button>
                </CardContent>
              </div>
            </Card>

            {/* Quick Access Schedule */}
            <button 
              onClick={() => setTimetableExpanded(!timetableExpanded)}
              className={`w-full flex items-center justify-between p-8 rounded-[2.5rem] shadow-xl transition-all duration-300 group overflow-hidden relative ${timetableExpanded ? 'bg-indigo-600 text-white' : 'bg-white text-slate-800 hover:translate-y-[-4px]'}`}
            >
              <div className="flex items-center gap-5 z-10">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${timetableExpanded ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                  <Calendar size={28}/>
                </div>
                <div className="text-left">
                  <span className="block font-black text-lg">Master Schedule</span>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${timetableExpanded ? 'text-indigo-100' : 'text-slate-400'}`}>Edit Class Timings</span>
                </div>
              </div>
              <ChevronDown className={`transition-transform duration-500 z-10 ${timetableExpanded ? 'rotate-180' : ''}`}/>
              {timetableExpanded && <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>}
            </button>
          </div>
        </div>

        {/* Timetable Section (Expansion) */}
        {timetableExpanded && (
          <Card className="border-none shadow-2xl rounded-[3rem] p-10 bg-white animate-in zoom-in-95 duration-500">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight italic">Schedule Builder</h2>
                <p className="text-slate-400 font-bold text-sm">Assign teachers based on their live availability and mode.</p>
              </div>
              <Button variant="outline" className="rounded-2xl h-12 px-6 border-slate-100 font-black text-slate-400 hover:text-rose-500" onClick={() => setTimetableExpanded(false)}>Hide Timetable</Button>
            </div>
            <TimetableManager />
          </Card>
        )}
      </div>

      {/* Modern Profile Dialog */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl rounded-[3rem] border-none shadow-2xl bg-white p-0 overflow-hidden">
          <div className="bg-slate-900 p-8 text-white relative">
            <DialogHeader>
              <DialogTitle className="text-3xl font-black italic">Record Dossier</DialogTitle>
              <p className="text-indigo-300 font-bold text-xs uppercase tracking-[0.2em]">{selectedType === "student" ? "Learner Profile" : "Staff Credentials"}</p>
            </DialogHeader>
            <div className="absolute -bottom-6 right-8 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
          </div>
          
          <div className="p-8">
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-slate-100 rounded-2xl p-1.5 h-14 mb-8">
                <TabsTrigger value="info" className="rounded-[1rem] font-black uppercase text-xs tracking-widest data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm transition-all">Overview</TabsTrigger>
                <TabsTrigger value="special" className="rounded-[1rem] font-black uppercase text-xs tracking-widest data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm transition-all">{selectedType === "teacher" ? "Curriculum" : "Finance"}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="info" className="grid grid-cols-2 gap-5 animate-in fade-in slide-in-from-bottom-2">
                <InfoBox label="Full Name" value={selectedType === "student" ? `${selectedItem?.firstName} ${selectedItem?.lastName}` : `${selectedItem?.personalInfo?.firstName} ${selectedItem?.personalInfo?.lastName}`} />
                <InfoBox label="Registry ID" value={selectedItem?.id.slice(0,12)} />
                <InfoBox label="Contact Email" value={selectedItem?.personalInfo?.email || selectedItem?.parentEmail || "Not Listed"} />
                <InfoBox label="Learning Mode" value={selectedItem?.learningMode || "Virtual"} isBadge />
              </TabsContent>

              <TabsContent value="special" className="animate-in fade-in slide-in-from-bottom-2">
                 {selectedType === "teacher" ? (
                   <div className="p-6 bg-indigo-50 rounded-[2rem] space-y-4">
                     <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Expertise Matrix</p>
                     <div className="flex flex-wrap gap-2">
                       {selectedItem?.subjects?.map((s: any, i: number) => (
                         <Badge key={i} className="bg-white text-indigo-700 border-none shadow-sm px-4 py-1.5 rounded-xl font-black">{s.name} <span className="text-[8px] opacity-40 ml-1">{s.curriculum}</span></Badge>
                       ))}
                     </div>
                     <div className="pt-4 border-t border-indigo-100 flex justify-between items-center">
                        <span className="text-xs font-black text-indigo-900 uppercase">Teaching Experience</span>
                        <span className="text-2xl font-black text-indigo-600">{selectedItem?.personalInfo?.yearsOfExperience || 0} <span className="text-xs">Years</span></span>
                     </div>
                   </div>
                 ) : (
                   <div className="p-8 bg-slate-50 rounded-[2rem] flex flex-col items-center text-center">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${selectedItem?.paymentReceived ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"}`}>
                        <DollarSign size={32}/>
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fee Compliance</p>
                      <h4 className={`text-2xl font-black ${selectedItem?.paymentReceived ? "text-emerald-600" : "text-rose-600"}`}>
                        {selectedItem?.paymentReceived ? "Account Settled" : "Payment Overdue"}
                      </h4>
                   </div>
                 )}
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-10 gap-3">
              <Button variant="ghost" className="rounded-2xl h-12 px-8 font-black text-slate-400" onClick={() => setShowModal(false)}>Close Dossier</Button>
              {selectedItem?.status === "pending" && (
                <Button 
                  className="bg-indigo-600 rounded-2xl h-12 px-8 font-black shadow-xl shadow-indigo-200 hover:scale-105 transition-all"
                  onClick={() => updateStatus(selectedType === "teacher" ? "teacherApplications" : "students", selectedItem.id, selectedType === "teacher" ? "approved" : "enrolled")}
                >Validate & Enroll</Button>
              )}
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* Internal Styled Stat Card Component */
const StatCard = ({ label, value, sub, icon, color }: any) => (
  <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
    <CardContent className="p-8">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">{label}</p>
          <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{value}</h3>
          <p className="text-[11px] font-bold text-slate-500/80 bg-slate-50 px-2 py-0.5 rounded-lg w-fit">{sub}</p>
        </div>
        <div className={`p-4 rounded-2xl text-white shadow-xl ${color} shadow-${color.split('-')[1]}-200`}>
          {React.cloneElement(icon, { size: 24 })}
        </div>
      </div>
    </CardContent>
  </Card>
);

/* Internal Info Field Component */
const InfoBox = ({ label, value, isBadge }: any) => (
  <div className="bg-slate-50/50 border border-slate-100 p-5 rounded-[1.5rem] group hover:bg-white hover:shadow-md transition-all">
    <p className="text-[10px] font-black text-slate-300 uppercase mb-1 tracking-widest">{label}</p>
    {isBadge ? (
      <Badge className="bg-indigo-600 text-white border-none font-black text-[10px] px-3 py-1 rounded-lg uppercase tracking-tighter">{value}</Badge>
    ) : (
      <p className="font-black text-slate-700 text-sm truncate">{value}</p>
    )}
  </div>
);

export default PrincipalDashboard;