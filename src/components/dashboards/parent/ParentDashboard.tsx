"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/lib/firebaseConfig";
import { signOut } from "firebase/auth";
import { Eye, EyeOff, RefreshCw, UserCheck } from "lucide-react";
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
  limit,
} from "firebase/firestore";
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
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Settings } from "lucide-react";
import { ChevronDown, ChevronUp } from "lucide-react";
import PendingInvoiceModal from "./PendingInvoiceModal";
import logo from "@/img/care.png";
import { ReviewModal } from "@/lib/ReviewModal";

/* ======================================================
   CONSTANTS & TYPES
====================================================== */
const SCHOOL_NAME = "Care Academy";

interface Student {
  // 🔑 Identity
  id: string;
  firstName: string;
  lastName: string;
  grade: string;

  // 👨‍👩‍👧 Parent linkage
  parentId: string;

  // 🔐 Student login (NOT Firebase Auth)
  username: string;
  passwordHash: string;
  loginEnabled: boolean;
  rawPassword?: string;  // password

  // 🎓 Academic info
  subjects?: string[];
  learningMode?: "Campus" | "Virtual";
  status?: "active" | "suspended" | "archived";

  // 🕒 Audit
  createdBy: string;        // parent uid
  createdAt: any;           // Firestore Timestamp
  updatedAt?: any;
  user: string;
}


interface TimetableEntry {
  id: string;
  grade: string;
  subject: string;
  day: string;
  time: string;
  teacherName: string;
  curriculum: "CAPS" | "British Curriculum";
  user: string;
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  createdAt?: any;
  author: string;
  user: string;
}

/* ======================================================
   HYBRID LEARNING SWITCH
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
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${currentMode === "Campus"
            ? "bg-emerald-600 text-white shadow-md"
            : "text-gray-500 hover:text-gray-700"
            }`}
        >
          <MapPin size={16} /> Campus
        </button>
        <button
          onClick={() => toggleMode("Virtual")}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${currentMode === "Virtual"
            ? "bg-indigo-600 text-white shadow-md"
            : "text-gray-500 hover:text-gray-700"
            }`}
        >
          <Laptop size={16} /> Virtual
        </button>
      </div>
      <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium italic">
        Term Status:{" "}
        <span className={currentMode === "Campus" ? "text-emerald-600" : "text-indigo-600"}>
          {currentMode} Learning Active
        </span>
      </p>
    </div>
  );
}

/* ======================================================
   MAIN PARENT DASHBOARD
====================================================== */
export default function ParentDashboard() {
  const { logoutStudent, logoutParent } = useAuth();
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

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const sections = ["Overview", "Registration", "Payments", "Communications", "Status", "Settings"];

  const [newStudentFirstName, setNewStudentFirstName] = useState("");
  const [newStudentLastName, setNewStudentLastName] = useState("");
  const [newStudentGrade, setNewStudentGrade] = useState("");
  const [newStudentUsername, setNewStudentUsername] = useState("");
  const [newStudentPassword, setNewStudentPassword] = useState("");
  const [creatingStudent, setCreatingStudent] = useState(false);
  const [selectedStudentForLogin, setSelectedStudentForLogin] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordCardOpen, setIsPasswordCardOpen] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [pendingInvoiceCount, setPendingInvoiceCount] = useState(0);
  const [showReview, setShowReview] = useState(true);




  // Load parent profile + real-time data
  useEffect(() => {
    if (!user?.uid) return;

    let unsubStudents: (() => void) | undefined;
    let unsubTimetable: (() => void) | undefined;
    let unsubAnnouncements: (() => void) | undefined;

    const fetchData = async () => {
      try {
        // Parent profile
        const parentSnap = await getDoc(doc(db, "parents", user.uid));
        if (parentSnap.exists()) {
          const data = parentSnap.data();
          setTitle(data.title || "");
          setFullName(data.fullName || "");
          setContact(data.contact || "");
          setAddress(data.address || "");
          setProfileCompleted(data.profileCompleted === true);

          if (!data.profileCompleted) {
            setShowWizard(true);
            setWizardStep(1);
          }
        }

        // Real-time students
        const qStudents = query(collection(db, "students"), where("parentId", "==", user.uid));
        unsubStudents = onSnapshot(qStudents, (snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Student) }));
          setStudents(list);
          if (!selectedChildId && list.length > 0) {
            setSelectedChildId(list[0].id);
          }
        });

        // Real-time timetable
        const qTimetable = query(collection(db, "timetable"), orderBy("day"), orderBy("time"));
        unsubTimetable = onSnapshot(qTimetable, (snap) => {
          setTimetable(snap.docs.map((d) => ({ id: d.id, ...(d.data() as TimetableEntry) })));
        });

        // Real-time announcements (latest 10)
        const qAnn = query(
          collection(db, "announcements"),
          orderBy("createdAt", "desc"),
          limit(10)
        );
        unsubAnnouncements = onSnapshot(qAnn, (snap) => {
          const data = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as Announcement[];
          setAnnouncements(data);
        });

        setLoading(false);
      } catch (err) {
        console.error("Dashboard load error:", err);
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      unsubStudents?.();
      unsubTimetable?.();
      unsubAnnouncements?.();
    };
  }, [user?.uid, selectedChildId]);

  // REVIEW MODAL 
  useEffect(() => {
    if (!user?.uid) return;

    const checkReviewStatus = async () => {
      const parentSnap = await getDoc(doc(db, "parents", user.uid));

      if (parentSnap.exists()) {
        const data = parentSnap.data();

        // Only show the modal if they haven't reviewed AND they have completed their profile
        if (!data.hasReviewed && data.profileCompleted) {
          // You can add a delay so it doesn't pop up immediately on login
          setTimeout(() => setShowReview(true), 5000);
        }
      }
    };

    checkReviewStatus();
  }, [user?.uid]);

  const handleLater = () => {
    sessionStorage.setItem("reviewPostponed", "true");
    setShowReview(false);
    setShowInvoiceModal(false);
  };



  // MODAL POPUP INVOICE
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "invoices"),
      where("parentId", "==", user.uid),
      where("status", "==", "pending")
    );

    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setPendingInvoiceCount(snap.size);
        setShowInvoiceModal(true);
      } else {
        setShowInvoiceModal(false);
      }
    });

    return () => unsub();
  }, [user?.uid]);


  const handlePayNow = () => {
    setShowInvoiceModal(false);
    navigate("/parent-dashboard?sections=payments&tab=history");
  };





  const handleLogout = async () => {
    try {
      if (user?.role === "parent") {
        // 1. If a student is logging out
        logoutParent()
        // Note: logoutStudent handles the redirect to /student-login internally
      } else {
        // 2. If a Parent, Teacher, or Admin is logging out

        await logoutStudent();
        // This will clear Firebase Auth but leave studentSession alone
        navigate("/");
      }
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const renderSection = () => {
    switch (activeTab) {
      case "Overview":
        return (
          <OverviewSection
            students={students}
            selectedChildId={selectedChildId}
            setSelectedChildId={setSelectedChildId}
            timetable={timetable}
            announcements={announcements}
            user={user}
          />
        );
      case "Registration":
        return <RegistrationSection />;
      case "Payments":
        return <PaymentsSection />;
      case "Communications":
        return <CommunicationsSection />;
      case "Status":
        return <StatusSection />;
      case "Settings":
        return (
          <>
            <SettingsSection />
            <Button
              onClick={() => {
                setShowWizard(true);
                setWizardStep(1);
              }}
              className="mt-6 bg-indigo-600"
            >
              Edit Parent Profile
            </Button>
          </>
        );
      default:
        return null;
    }
  };

  // Popoup wizard
  useEffect(() => {
    if (!user?.uid) return;

    const parentRef = doc(db, "parents", user.uid);

    // Listen for profile completion status
    const unsub = onSnapshot(parentRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        // If profileCompleted is false or undefined, show the wizard
        if (!data.profileCompleted) {
          setShowWizard(true);
          setProfileCompleted(false);
        } else {
          setShowWizard(false);
          setProfileCompleted(true);
        }

        // Pre-fill fields if some data already exists
        setFullName(data.fullName || user.displayName || "");
        setContact(data.contact || "");
        setAddress(data.address || "");
        setTitle(data.title || "");
      } else {
        // New user with no document yet
        setShowWizard(true);
        setProfileCompleted(false);
      }
    });

    return () => unsub();
  }, [user?.uid]);

  // 2. Helper to generate default username and random password
  const autoFillCredentials = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    // Pre-fill with existing username if already set, otherwise generate default
    if (student.username) {
      setNewStudentUsername(student.username);
    } else {
      const defaultUser = `${student.firstName.toLowerCase()}.${student.lastName.toLowerCase()}`;
      setNewStudentUsername(defaultUser);
    }

    setSelectedStudentForLogin(studentId);
  };

  // ============================================================
  // REPLACE createStudentLogin — saves username only, no password
  // ============================================================
  const createStudentLogin = async () => {
    if (!selectedStudentForLogin || !newStudentUsername.trim()) {
      alert("Please select a student and enter a username.");
      return;
    }

    setCreatingStudent(true);

    try {
      const studentRef = doc(db, "students", selectedStudentForLogin);

      await updateDoc(studentRef, {
        username: newStudentUsername.trim().toLowerCase().replace(/\s+/g, ""),
        loginEnabled: true,
        // Clear any old password fields so login can't accidentally use them
        passwordHash: null,
        rawPassword: null,
        updatedAt: new Date(),
      });

      alert(`Login username set to: ${newStudentUsername.trim().toLowerCase().replace(/\s+/g, "")}`);

      setNewStudentUsername("");
      setSelectedStudentForLogin("");
    } catch (err) {
      console.error("Username update error:", err);
      alert("Failed to set username. Please try again.");
    } finally {
      setCreatingStudent(false);
    }
  };


  const saveProfileAndContinue = async () => {
    if (!fullName || !contact || !address) {
      alert("Please complete required fields marked with *");
      return;
    }

    try {
      const parentRef = doc(db, "parents", user!.uid);

      await setDoc(parentRef, {
        title,
        fullName,
        contact,
        address,
        email: user?.email, // Keep email synced
        profileCompleted: true,
        updatedAt: new Date(), // Use serverTimestamp for accuracy
      }, { merge: true });

      // Close wizard and switch tabs
      setShowWizard(false);
      setProfileCompleted(true);

      // Move to the next logic (Registering Student)
      setActiveTab("Registration");

      // Optional: Toast notification
      console.log("Profile verified. Moving to student registration.");

    } catch (err) {
      console.error("Profile save failed:", err);
      alert("System error: Could not save profile.");
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-indigo-50">
        <div className="animate-spin h-12 w-12 border-4 border-indigo-600 rounded-full border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Welcome Header */}
        <div className="bg-white rounded-3xl shadow-2xl p-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-5xl font-extrabold text-indigo-900 flex items-center gap-4">
              <img src={logo} alt="Logo" className="w-12 h-12" /> <Sparkles className="w-12 h-12 text-yellow-500" />
              Welcome, {profileCompleted ? `${title} ${fullName}` : "Parent"}!
            </h1>
            <p className="text-2xl text-indigo-700 mt-3">{SCHOOL_NAME} Parent Portal</p>
          </div>
          <Button onClick={handleLogout} size="lg" className="bg-red-600 hover:bg-red-700">
            <LogOut className="w-6 h-6 mr-3" /> Logout
          </Button>
        </div>

        {/* New Feature Alert */}
        <div className="bg-gradient-to-r from-yellow-50 to-amber-100 border-2 border-yellow-200 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="bg-yellow-100 p-3 rounded-xl">
              <Sparkles className="w-8 h-8 text-yellow-600" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-yellow-900">New Feature Alert!</h3>
              <p className="text-lg text-yellow-800 mt-2">
                We've added a PDF Audio Reader and Dictionary in your Student's Dashboard for easier learning. Encourage your child to use these tools to enhance their learning experience.
              </p>
            </div>
          </div>
        </div>

        {/* Review Modal  */}
        {showReview && <ReviewModal user={user} onClose={() => setShowReview(false)} />}

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg p-3">
          <div className="flex flex-wrap gap-3">
            {sections.map((s) => (
              <button
                key={s}
                onClick={() => setActiveTab(s)}
                className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all ${activeTab === s
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* STUDENT PASSWORDS */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm mt-8 transition-all duration-300 overflow-hidden">

          {/* CLICKABLE HEADER */}
          <button
            onClick={() => setIsPasswordCardOpen(!isPasswordCardOpen)}
            className="w-full p-10 flex items-center justify-between hover:bg-slate-50/50 transition-colors text-left"
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl transition-colors ${isPasswordCardOpen ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                <UserCheck size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">
                  Student Portal Access
                </h2>
                {!isPasswordCardOpen && (
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Click to set or update student username
                  </p>
                )}
              </div>
            </div>
            <div className={`transition-transform duration-300 ${isPasswordCardOpen ? 'rotate-180' : 'rotate-0'}`}>
              <ChevronDown size={28} className="text-slate-300" />
            </div>
          </button>

          {/* EXPANDABLE CONTENT */}
          <div className={`transition-all duration-300 ease-in-out ${isPasswordCardOpen ? 'max-h-[600px] opacity-100 p-10 pt-0' : 'max-h-0 opacity-0 pointer-events-none'}`}>
            <div className="space-y-6 border-t border-slate-50 pt-8">

              {/* Info banner */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3">
                <div className="mt-0.5 text-indigo-500">
                  <AlertCircle size={16} />
                </div>
                <p className="text-xs text-indigo-700 font-medium leading-relaxed">
                  Students log in using their <strong>username only</strong> — no password required.
                  Set a simple, memorable username for your child below.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Step 1: Select Student */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">
                    1. Select Registered Student
                  </label>
                  <Select
                    value={selectedStudentForLogin}
                    onValueChange={(val) => autoFillCredentials(val)}
                  >
                    <SelectTrigger className="h-14 rounded-2xl border-2 border-slate-100 font-bold">
                      <SelectValue placeholder="Choose a student..." />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.firstName} {s.lastName} (Grade {s.grade})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Step 2: Username */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">
                    2. Set Login Username
                  </label>
                  <Input
                    placeholder="e.g. jane.smith or janey"
                    value={newStudentUsername}
                    onChange={(e) => setNewStudentUsername(e.target.value)}
                    className="h-14 rounded-2xl border-2 border-slate-100 font-bold"
                  />
                  {/* Show normalised preview so parent knows exactly what gets saved */}
                  {newStudentUsername && (
                    <p className="text-[10px] text-indigo-500 ml-2 font-bold">
                      Will be saved as:{" "}
                      <span className="font-black">
                        {newStudentUsername.trim().toLowerCase().replace(/\s+/g, "")}
                      </span>
                    </p>
                  )}
                </div>

              </div>

              {/* Current username display if already set */}
              {selectedStudentForLogin && (() => {
                const s = students.find(st => st.id === selectedStudentForLogin);
                return s?.username ? (
                  <div className="bg-slate-50 rounded-2xl px-5 py-3 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Current Username
                    </span>
                    <span className="font-black text-slate-700 text-sm">{s.username}</span>
                  </div>
                ) : null;
              })()}

            </div>
          </div>

          {/* SAVE BUTTON — always visible at bottom */}
          <Button
            onClick={createStudentLogin}
            disabled={creatingStudent || !selectedStudentForLogin || !newStudentUsername.trim()}
            className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50"
          >
            {creatingStudent ? "Saving..." : "Save Username & Enable Access"}
          </Button>

        </div>


        {/* INVOICE POPUP MODAL */}
        <PendingInvoiceModal
          open={showInvoiceModal}
          invoiceCount={pendingInvoiceCount}
          onPayNow={handlePayNow}
          onLater={handleLater}
        />


        {/* Main Content */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">{renderSection()}</div>
      </div>

      {/* Profile Completion Wizard */}
      {showWizard && !profileCompleted && (
        <div className="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full p-10 animate-in zoom-in-95 duration-300">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Settings className="animate-spin-slow" size={32} />
              </div>
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Setup Your Profile</h2>
              <p className="text-slate-500 font-medium">Complete these details to begin student registration</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <Input
                  className="col-span-1 h-14 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 font-bold"
                  placeholder="Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <Input
                  className="col-span-3 h-14 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 font-bold"
                  placeholder="Full Name *"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <Input
                className="h-14 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 font-bold"
                placeholder="Primary Contact Number *"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />

              <Textarea
                className="rounded-2xl border-2 border-slate-100 focus:border-indigo-500 font-medium p-4"
                placeholder="Full Residential Address *"
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-3 mt-10">
              <Button
                onClick={saveProfileAndContinue}
                className="h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-lg shadow-lg shadow-indigo-200 transition-all active:scale-95"
              >
                SAVE & START REGISTRATION
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowWizard(false)}
                className="text-slate-400 font-bold hover:text-slate-600"
              >
                I'll do this later
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ======================================================
   OVERVIEW SECTION
====================================================== */
function OverviewSection({
  students,
  selectedChildId,
  setSelectedChildId,
  timetable,
  announcements,
  user
}: {
  students: Student[];
  selectedChildId: string | null;
  setSelectedChildId: (id: string) => void;
  timetable: TimetableEntry[];
  announcements: Announcement[];
  user: string;
}) {
  const selectedChild = useMemo(
    () => students.find((s) => s.id === selectedChildId) || null,
    [students, selectedChildId]
  );

  const hasStudents = students.length > 0;

  const todayName = format(new Date(), "EEEE");

  const todaysClassesCount = useMemo(() => {
    if (!selectedChild) return 0;
    return timetable.filter(
      (entry) =>
        entry.grade === selectedChild.grade &&
        entry.day === todayName &&
        selectedChild.subjects?.some((sub) =>
          entry.subject.toLowerCase().includes(sub.toLowerCase().replace(" (igcse)", ""))
        )
    ).length;
  }, [timetable, selectedChild, todayName]);

  const weeklyClassesCount = useMemo(() => {
    if (!selectedChild) return 0;
    return timetable.filter(
      (entry) =>
        entry.grade === selectedChild.grade &&
        selectedChild.subjects?.some((sub) =>
          entry.subject.toLowerCase().includes(sub.toLowerCase().replace(" (igcse)", ""))
        )
    ).length;
  }, [timetable, selectedChild]);

  const latestAnnouncement = announcements[0];

  return (
    <div className="space-y-10">
      {/* Child Selector + Hybrid Switch */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-indigo-50/50 border border-indigo-100 rounded-2xl p-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-indigo-900 uppercase tracking-wider">
            Active Learner Profile
          </label>
          <Select value={selectedChildId || ""} onValueChange={setSelectedChildId}>
            <SelectTrigger className="w-80 h-12 bg-white text-lg font-bold border-2 border-indigo-100">
              <SelectValue placeholder="Select a child" />
            </SelectTrigger>
            <SelectContent>
              {students.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.firstName} {s.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedChild && (
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <HybridSwitch student={selectedChild} />
            <Button
              size="lg"
              onClick={() => {
                if (!selectedChild?.id) return;
                localStorage.setItem(
                  `parentViewSession_${selectedChild.id}`,
                  JSON.stringify({
                    studentId: selectedChild.id,
                    firstName: selectedChild.firstName,
                    lastName: selectedChild.lastName,
                    grade: selectedChild.grade,
                    role: "student",
                    isParentView: true,
                    parentUid: user?.uid,
                    loginMethod: "parent-view",
                    loginTime: Date.now(),
                  })
                );
                window.open(`/student-dashboard/${selectedChild.id}`, "_blank");
              }}
              className="bg-emerald-600 hover:bg-emerald-700 h-12"
            >
              <ExternalLink className="w-5 h-5 mr-2" /> Child Portal
            </Button>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="bg-slate-900 text-white shadow-2xl rounded-[2rem] border-none overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <BookOpen size={80} />
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-indigo-400">
              <Calendar size={16} /> Weekly Lessons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-6xl font-black tracking-tighter">{weeklyClassesCount}</p>
            <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase">British Curriculum Curriculum</p>
          </CardContent>
        </Card>

        <Card className="bg-indigo-600 text-white shadow-2xl rounded-[2rem] border-none overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Clock size={80} />
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-indigo-200">
              <Clock size={16} /> Today's Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-6xl font-black tracking-tighter">{todaysClassesCount}</p>
            <p className="text-[10px] font-bold text-indigo-200 mt-2 uppercase">{todayName}</p>
          </CardContent>
        </Card>

        <Card className="bg-white text-slate-900 shadow-xl rounded-[2rem] border-2 border-slate-50 overflow-hidden relative group">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
              <MapPin size={16} /> Learning Mode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-6xl font-black tracking-tighter">
              {selectedChild?.learningMode || "N/A"}
            </p>
            <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase">Current Term</p>
          </CardContent>
        </Card>
      </div>

      {/* Announcements */}
      {announcements.length > 0 ? (
        <div className="space-y-8">
          {/* Featured: Latest Announcement */}
          <div className="bg-white border-2 border-slate-100 shadow-sm rounded-[3rem] p-10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-3 h-full bg-indigo-600"></div>
            <div className="flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-[0.3em] mb-6">
              <span className="w-8 h-[2px] bg-indigo-600"></span>
              Latest Briefing
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight uppercase leading-none">
              {latestAnnouncement.title}
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed whitespace-pre-wrap font-medium">
              {latestAnnouncement.body}
            </p>
            <div className="mt-10 pt-6 border-t border-slate-50 flex justify-between items-center text-[10px] uppercase tracking-widest text-slate-400 font-bold">
              <span>
                Issued:{" "}
                {latestAnnouncement.createdAt?.seconds
                  ? format(new Date(latestAnnouncement.createdAt.seconds * 1000), "dd MMM yyyy")
                  : "Just now"}
              </span>
              <span className="text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                {latestAnnouncement.author}
              </span>
            </div>
          </div>

          {/* Archive */}
          {announcements.length > 1 && (
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-6">
                Previous Briefings
              </h3>
              <div className="grid gap-4">
                {announcements.slice(1).map((msg) => (
                  <div
                    key={msg.id}
                    className="bg-slate-50/50 border border-slate-100 rounded-[2rem] p-6 hover:bg-white transition-all group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-black text-slate-800 uppercase text-sm tracking-tight">
                        {msg.title}
                      </h4>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">
                        {msg.createdAt?.seconds
                          ? format(new Date(msg.createdAt.seconds * 1000), "dd MMM")
                          : ""}
                      </span>
                    </div>
                    <p className="text-slate-500 text-xs line-clamp-2 font-medium">{msg.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-indigo-50 border-2 border-dashed border-indigo-200 rounded-[3rem] p-12 text-center">
          <AlertCircle className="mx-auto text-indigo-300 mb-4" size={48} />
          <h2 className="text-2xl font-black text-indigo-900 uppercase tracking-tight">
            No Announcements Yet
          </h2>
          <p className="text-indigo-600/70 max-w-md mx-auto mt-2 font-medium">
            Principal updates will appear here when available.
          </p>
        </div>
      )}

      {/* No Students State */}
      {!hasStudents && (
        <div className="bg-indigo-50 border-2 border-dashed border-indigo-200 rounded-[3rem] p-12 text-center">
          <AlertCircle className="mx-auto text-indigo-300 mb-4" size={48} />
          <h2 className="text-2xl font-black text-indigo-900 uppercase tracking-tight">
            No British Curriculum Registrations Found
          </h2>
          <p className="text-indigo-600/70 max-w-md mx-auto mt-2 font-medium">
            To view timetables, access class links, and receive principal announcements, please complete your child's registration.
          </p>
        </div>
      )}
    </div>
  );
}