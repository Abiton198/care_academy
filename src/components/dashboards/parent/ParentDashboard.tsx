"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import RegistrationSection from "./sections/RegistrationSection";
import PaymentsSection from "./sections/PaymentSection";
import SettingsSection from "./sections/SettingsSection";
import CommunicationsSection from "./sections/CommunicationsSection";
import StatusSection from "./sections/StatusSection";
import { useAuth } from "@/components/auth/AuthProvider";
import { auth, db } from "@/lib/firebaseConfig";
import { signOut } from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  Calendar,
  Clock,
  BookOpen,
  GraduationCap,
  ExternalLink,
  Sparkles,
  MapPin,
  Laptop,
} from "lucide-react";

/* ======================================================
   CONSTANTS
====================================================== */
const SCHOOL_NAME = "Care Academy";

/* ======================================================
   TYPES
====================================================== */
interface Student {
  id: string;
  firstName: string;
  lastName: string;
  grade: string;
  subjects?: string[];
  status?: string;
  learningMode?: "Campus" | "Virtual"; // New Field
}

interface TimetableEntry {
  id: string;
  grade: string;
  subject: string;
  day: string;
  time: string;
  teacherName: string;
  curriculum: "CAPS" | "Cambridge";
}

/* ======================================================
   HYBRID SWITCH COMPONENT
====================================================== */
function HybridSwitch({ student }: { student: Student }) {
  const [loading, setLoading] = useState(false);
  const currentMode = student.learningMode || "Virtual";

  const toggleMode = async (newMode: "Campus" | "Virtual") => {
    if (newMode === currentMode) return;
    setLoading(true);
    try {
      const studentRef = doc(db, "students", student.id);
      await updateDoc(studentRef, {
        learningMode: newMode,
        lastModeSwitch: new Date(),
      });
    } catch (err) {
      console.error("Error switching mode:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex bg-gray-200 p-1 rounded-xl w-fit border border-gray-300">
        <button
          onClick={() => toggleMode("Campus")}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
            currentMode === "Campus"
              ? "bg-emerald-600 text-white shadow-md"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <MapPin size={16} /> Campus
        </button>
        <button
          onClick={() => toggleMode("Virtual")}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
            currentMode === "Virtual"
              ? "bg-indigo-600 text-white shadow-md"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Laptop size={16} /> Virtual
        </button>
      </div>
      <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium italic">
        Term Status: <span className={currentMode === "Campus" ? "text-emerald-600" : "text-indigo-600"}>
          {currentMode} Learning Active
        </span>
      </p>
    </div>
  );
}

/* ======================================================
   MAIN COMPONENT
====================================================== */
export default function ParentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState("Overview");
  const [students, setStudents] = useState<Student[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [fullName, setFullName] = useState("");
  const [contact, setContact] = useState("");
  const [address, setAddress] = useState("");
  const [profileCompleted, setProfileCompleted] = useState(true);
  
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const sections = ["Overview", "Registration", "Payments", "Communications", "Status", "Settings"];
  
  const [announcement, setAnnouncement] = useState<{
    title: string;
    subject: string;
    updatedAt?: any;
  } | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    let unsubStudents: () => void;
    let unsubTimetable: () => void;

    const fetchData = async () => {
      try {
        const parentSnap = await getDoc(doc(db, "parents", user.uid));
        if (parentSnap.exists()) {
          const data = parentSnap.data();
          setTitle(data.title || "");
          setFullName(data.fullName || "");
          setContact(data.contact || "");
          setAddress(data.address || "");
          setProfileCompleted(data.profileCompleted === true);
          if (data.profileCompleted !== true) {
            setShowWizard(true);
            setWizardStep(1);
          }
        }

        const qStudents = query(collection(db, "students"), where("parentId", "==", user.uid));
        unsubStudents = onSnapshot(qStudents, (snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Student) }));
          setStudents(list);
          if (!selectedChildId && list.length > 0) setSelectedChildId(list[0].id);
        });

        const qTimetable = query(collection(db, "timetable"), orderBy("day"), orderBy("time"));
        unsubTimetable = onSnapshot(qTimetable, (snap) => {
          setTimetable(snap.docs.map((d) => ({ id: d.id, ...(d.data() as TimetableEntry) })));
        });

        setLoading(false);
      } catch (err) {
        console.error("Dashboard load error:", err);
        setLoading(false);
      }
    };
    fetchData();
    return () => { unsubStudents?.(); unsubTimetable?.(); };
  }, [user?.uid]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "announcements", "active"), (snap) => {
      if (snap.exists()) setAnnouncement({ id: snap.id, ...snap.data() } as any);
    });
    return () => unsub();
  }, []);

  const handleLogout = async () => { await signOut(auth); navigate("/"); };

  const saveProfileAndContinue = async () => {
    if (!fullName || !contact || !address) return alert("Complete required fields.");
    await setDoc(doc(db, "parents", user!.uid), { title, fullName, contact, address, profileCompleted: true, updatedAt: new Date() }, { merge: true });
    setProfileCompleted(true); setWizardStep(2); setActiveTab("Registration");
  };

  const renderSection = () => {
    switch (activeTab) {
      case "Overview":
        return <OverviewSection students={students} selectedChildId={selectedChildId} setSelectedChildId={setSelectedChildId} timetable={timetable} announcement={announcement} />;
      case "Registration": return <RegistrationSection />;
      case "Payments": return <PaymentsSection />;
      case "Communications": return <CommunicationsSection />;
      case "Status": return <StatusSection />;
      case "Settings":
        return (
          <>
            <SettingsSection />
            <Button onClick={() => { setShowWizard(true); setWizardStep(1); }} className="mt-6 bg-indigo-600">Edit Parent Profile</Button>
          </>
        );
      default: return null;
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-indigo-50"><div className="animate-spin h-12 w-12 border-4 border-indigo-600 rounded-full border-t-transparent"></div></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="bg-white rounded-3xl shadow-2xl p-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-5xl font-extrabold text-indigo-900 flex items-center gap-4">
              <Sparkles className="w-12 h-12 text-yellow-500" />
              Welcome back, {profileCompleted ? `${title} ${fullName}` : "Parent"}!
            </h1>
            <p className="text-2xl text-indigo-700 mt-3">{SCHOOL_NAME} Parent Portal</p>
          </div>
          <Button onClick={handleLogout} size="lg" className="bg-red-600 hover:bg-red-700"><LogOut className="w-6 h-6 mr-3" /> Logout</Button>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-3">
          <div className="flex flex-wrap gap-3">
            {sections.map((s) => (
              <button key={s} onClick={() => setActiveTab(s)} className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all ${activeTab === s ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8">{renderSection()}</div>
      </div>

      {showWizard && !profileCompleted && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-10">
            <h2 className="text-3xl font-bold text-indigo-800 mb-6">Complete Your Profile</h2>
            <div className="space-y-5">
              <input className="w-full border-2 border-gray-300 rounded-xl p-4" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
              <input className="w-full border-2 border-gray-300 rounded-xl p-4" placeholder="Full Name *" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              <input className="w-full border-2 border-gray-300 rounded-xl p-4" placeholder="Contact *" value={contact} onChange={(e) => setContact(e.target.value)} />
              <textarea className="w-full border-2 border-gray-300 rounded-xl p-4" placeholder="Address *" rows={3} value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="flex justify-end gap-4 mt-8">
              <Button variant="outline" onClick={() => setShowWizard(false)}>Later</Button>
              <Button onClick={saveProfileAndContinue} className="bg-indigo-600">Continue</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OverviewSection({ students, selectedChildId, setSelectedChildId, timetable, announcement }: any) {
  const selectedChild = useMemo(() => students.find((s: any) => s.id === selectedChildId) || null, [students, selectedChildId]);
  
  const childTimetable = useMemo(() => {
    if (!selectedChild?.subjects) return [];
    return timetable.filter((entry: any) => 
      entry.grade === selectedChild.grade && 
      selectedChild.subjects.some((sub: string) => entry.subject.toLowerCase().includes(sub.toLowerCase().replace(" (igcse)", "")))
    );
  }, [timetable, selectedChild]);

  if (students.length === 0) return <div className="text-center py-20"><GraduationCap className="w-24 h-24 text-gray-300 mx-auto" /></div>;

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-indigo-50/50 border border-indigo-100 rounded-2xl p-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-indigo-900 uppercase tracking-wider">Active Learner Profile</label>
          <Select value={selectedChildId || ""} onValueChange={setSelectedChildId}>
            <SelectTrigger className="w-80 h-12 bg-white text-lg font-bold border-2 border-indigo-100">
              <SelectValue placeholder="Select a child" />
            </SelectTrigger>
            <SelectContent>
              {students.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {selectedChild && (
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <HybridSwitch student={selectedChild} />
            <Button size="lg" onClick={() => window.open(`/student-dashboard/${selectedChild.id}`, "_blank")} className="bg-emerald-600 hover:bg-emerald-700 h-12">
              <ExternalLink className="w-5 h-5 mr-2" /> Portal
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-xl">
          <CardHeader><CardTitle className="flex items-center gap-2"><BookOpen /> Weekly Lessons</CardTitle></CardHeader>
          <CardContent><p className="text-5xl font-black">{childTimetable.length}</p></CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-xl">
          <CardHeader><CardTitle className="flex items-center gap-2"><Clock /> Today's Classes</CardTitle></CardHeader>
          <CardContent><p className="text-5xl font-black">{childTimetable.filter((s: any) => s.day === new Date().toLocaleString("en-us", { weekday: "long" })).length}</p></CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-xl">
          <CardHeader><CardTitle className="flex items-center gap-2"><MapPin /> Current Mode</CardTitle></CardHeader>
          <CardContent><p className="text-4xl font-black">{selectedChild?.learningMode || "Virtual"}</p></CardContent>
        </Card>
      </div>

      {announcement && (
        <div className="bg-white border-2 border-indigo-100 rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600"></div>
          <h2 className="text-2xl font-black text-indigo-900 mb-4">{announcement.title}</h2>
          <p className="text-gray-700 text-lg whitespace-pre-wrap">{announcement.subject}</p>
          <div className="mt-8 pt-4 border-t border-gray-100 flex justify-between text-[10px] uppercase tracking-widest text-gray-400 font-bold italic">
            <span>{announcement.updatedAt?.seconds ? new Date(announcement.updatedAt.seconds * 1000).toDateString() : "Latest Update"}</span>
            <span className="text-indigo-600">Office of The Principal</span>
          </div>
        </div>
      )}
    </div>
  );
}