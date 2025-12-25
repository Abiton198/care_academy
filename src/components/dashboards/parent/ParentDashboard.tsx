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
} from "lucide-react";

/* ======================================================
   CONSTANTS
====================================================== */
const SCHOOL_NAME = "Care Academy"; // ← Change this to your school name

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

  // Parent profile
  const [title, setTitle] = useState("");
  const [fullName, setFullName] = useState("");
  const [contact, setContact] = useState("");
  const [address, setAddress] = useState("");
  const [profileCompleted, setProfileCompleted] = useState(true);

  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const sections = [
    "Overview",
    "Registration",
    "Payments",
    "Communications",
    "Status",
    "Settings",
  ];

  /* ======================================================
     DATA FETCH
  ===================================================== */
  useEffect(() => {
    if (!user?.uid) return;

    let unsubStudents: () => void;
    let unsubTimetable: () => void;

    const fetchData = async () => {
      try {
        /* Parent Profile */
        const parentSnap = await getDoc(doc(db, "parents", user.uid));
        if (parentSnap.exists()) {
          const data = parentSnap.data();
          setTitle(data.title || "");
          setFullName(data.fullName || "");
          setContact(data.contact || "");
          setAddress(data.address || "");
          const completed = data.profileCompleted === true;
          setProfileCompleted(completed);
          if (!completed) {
            setShowWizard(true);
            setWizardStep(1);
          }
        }

        /* Students */
        const qStudents = query(
          collection(db, "students"),
          where("parentId", "==", user.uid)
        );
        unsubStudents = onSnapshot(qStudents, (snap) => {
          const list = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Student),
          }));
          setStudents(list);
          if (!selectedChildId && list.length > 0) {
            setSelectedChildId(list[0].id);
          }
        });

        /* Full Timetable (real-time) */
        const qTimetable = query(
          collection(db, "timetable"),
          orderBy("day"),
          orderBy("time")
        );
        unsubTimetable = onSnapshot(qTimetable, (snap) => {
          setTimetable(
            snap.docs.map((d) => ({
              id: d.id,
              ...(d.data() as TimetableEntry),
            }))
          );
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
    };
  }, [user?.uid]);

  /* ======================================================
     LOGOUT
  ===================================================== */
  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  /* ======================================================
     SAVE PROFILE
  ===================================================== */
  const saveProfileAndContinue = async () => {
    if (!fullName || !contact || !address) {
      alert("Please complete all required fields.");
      return;
    }

    await setDoc(
      doc(db, "parents", user!.uid),
      {
        title,
        fullName,
        contact,
        address,
        profileCompleted: true,
        updatedAt: new Date(),
      },
      { merge: true }
    );

    setProfileCompleted(true);
    setWizardStep(2);
    setActiveTab("Registration");
  };

  /* ======================================================
     RENDER SECTION
  ===================================================== */
  const renderSection = () => {
    switch (activeTab) {
      case "Overview":
        return (
          <OverviewSection
            students={students}
            selectedChildId={selectedChildId}
            setSelectedChildId={setSelectedChildId}
            timetable={timetable}
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin h-12 w-12 border-4 border-indigo-600 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  /* ======================================================
     PERSONALIZED WELCOME
  ===================================================== */
  const welcomeName = profileCompleted
    ? `${title ? title + " " : ""}${fullName}`
    : user?.email?.split("@")[0] || "Parent";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-6 space-y-8">

        {/* Header with School Name */}
        <div className="bg-white rounded-3xl shadow-2xl p-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-5xl font-extrabold text-indigo-900 flex items-center gap-4">
              <Sparkles className="w-12 h-12 text-yellow-500" />
              Welcome back, {welcomeName}!
            </h1>
            <p className="text-2xl text-indigo-700 mt-3">
              {SCHOOL_NAME} Parent Portal
            </p>
            <p className="text-lg text-gray-600 mt-2">
              Stay connected with your child's learning journey
            </p>
          </div>
          <Button onClick={handleLogout} size="lg" className="bg-red-600 hover:bg-red-700">
            <LogOut className="w-6 h-6 mr-3" /> Logout
          </Button>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg p-3">
          <div className="flex flex-wrap gap-3">
            {sections.map((s) => (
              <button
                key={s}
                onClick={() => setActiveTab(s)}
                className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all ${
                  activeTab === s
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {renderSection()}
        </div>
      </div>

      {/* Wizard Modal */}
      {showWizard && !profileCompleted && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-10">
            {wizardStep === 1 && (
              <>
                <h2 className="text-3xl font-bold text-indigo-800 mb-6">
                  Complete Your Profile
                </h2>
                <div className="space-y-5">
                  <input
                    className="w-full border-2 border-gray-300 rounded-xl p-4 text-lg"
                    placeholder="Title (Mr/Mrs/Ms)"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <input
                    className="w-full border-2 border-gray-300 rounded-xl p-4 text-lg"
                    placeholder="Full Name *"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                  <input
                    className="w-full border-2 border-gray-300 rounded-xl p-4 text-lg"
                    placeholder="Contact Number *"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                  />
                  <textarea
                    className="w-full border-2 border-gray-300 rounded-xl p-4 text-lg"
                    placeholder="Home Address *"
                    rows={4}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-4 mt-8">
                  <Button variant="outline" onClick={() => setShowWizard(false)}>
                    Later
                  </Button>
                  <Button onClick={saveProfileAndContinue} className="bg-indigo-600 px-8">
                    Continue
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ======================================================
   OVERVIEW SECTION – REAL-TIME STATS
====================================================== */
function OverviewSection({
  students,
  selectedChildId,
  setSelectedChildId,
  timetable,
}: {
  students: Student[];
  selectedChildId: string | null;
  setSelectedChildId: (id: string) => void;
  timetable: TimetableEntry[];
}) {
  const selectedChild = students.find((s) => s.id === selectedChildId);

  // Filter timetable for selected child (flexible matching for IGCSE)
  const childTimetable = useMemo(() => {
    if (!selectedChild || !selectedChild.subjects || selectedChild.subjects.length === 0) return [];

    return timetable.filter((entry) => {
      return (
        entry.grade === selectedChild.grade &&
        selectedChild.subjects!.some((sub) =>
          entry.subject.toLowerCase().includes(sub.toLowerCase().replace(" (igcse)", ""))
        )
      );
    });
  }, [timetable, selectedChild]);

  // Stats
  const weeklyLessons = childTimetable.length;

  const today = new Date().toLocaleString("en-us", { weekday: "long" });
  const todayLessons = childTimetable.filter((slot) => slot.day === today);
  const upcomingToday = todayLessons.length;

  const nextClassToday = todayLessons.sort((a, b) => a.time.localeCompare(b.time))[0];

  if (students.length === 0) {
    return (
      <div className="text-center py-20">
        <GraduationCap className="w-24 h-24 text-gray-300 mx-auto mb-6" />
        <h3 className="text-3xl font-bold text-gray-700 mb-4">No Students Registered</h3>
        <p className="text-xl text-gray-600">Enroll your child to view their progress.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Child Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6">
        <div>
          <label className="text-lg font-semibold text-gray-700">Viewing:</label>
          <Select value={selectedChildId || ""} onValueChange={setSelectedChildId}>
            <SelectTrigger className="w-80 mt-2">
              <SelectValue placeholder="Select a child" />
            </SelectTrigger>
            <SelectContent>
              {students.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.firstName} {s.lastName} — Grade {s.grade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedChild && (
          <Button
            size="lg"
            onClick={() => window.open(`/student-dashboard/${selectedChild.id}`, "_blank")}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
          >
            <ExternalLink className="w-6 h-6 mr-3" /> Open Student Portal
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Current Week Lessons */}
        <Card className="bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-2xl hover:scale-105 transition">
          <CardHeader>
            <CardTitle className="flex items-center gap-4 text-2xl">
              <BookOpen className="w-10 h-10" /> Current Week Lessons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-6xl font-extrabold">{weeklyLessons}</p>
            <p className="mt-3 text-teal-100 text-lg">Total scheduled classes</p>
          </CardContent>
        </Card>

        {/* Upcoming Today */}
        <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-2xl hover:scale-105 transition">
          <CardHeader>
            <CardTitle className="flex items-center gap-4 text-2xl">
              <Clock className="w-10 h-10" /> Upcoming Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-6xl font-extrabold">{upcomingToday}</p>
            <p className="mt-3 text-orange-100 text-lg">Classes remaining</p>
          </CardContent>
        </Card>

        {/* Next Class Today */}
        <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-2xl hover:scale-105 transition">
          <CardHeader>
            <CardTitle className="flex items-center gap-4 text-2xl">
              <Calendar className="w-10 h-10" /> Next Class Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nextClassToday ? (
              <>
                <p className="text-4xl font-bold">{nextClassToday.time}</p>
                <p className="mt-2 text-purple-100 text-xl">
                  {nextClassToday.subject} • {nextClassToday.grade}
                </p>
              </>
            ) : (
              <p className="text-3xl text-purple-100">No classes today</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}