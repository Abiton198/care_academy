"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
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
  User,
  GraduationCap,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ===========================================================
   HELPERS
   =========================================================== */
const normalizeGrade = (grade?: string): string =>
  grade ? grade.replace(/^grade\s*/i, "").trim().toLowerCase() : "";

/* ===========================================================
   TYPES
   =========================================================== */
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
  duration: number;
  teacherName: string;
  curriculum: "CAPS" | "Cambridge";
}

const sections = [
  "Overview",
  "Registration",
  "Payments",
  "Communications",
  "Status",
  "Settings",
];

/* ===========================================================
   MAIN COMPONENT
   =========================================================== */
export default function ParentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  /* ---------------- Core Dashboard State ---------------- */
  const [activeTab, setActiveTab] = useState("Overview");
  const [students, setStudents] = useState<Student[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  /* ---------------- Parent Profile State ---------------- */
  const [title, setTitle] = useState("");
  const [fullName, setFullName] = useState("");
  const [contact, setContact] = useState("");
  const [address, setAddress] = useState("");

  /* ---------------- Wizard Enforcement ---------------- */
  const [showWizard, setShowWizard] = useState(false);
  const [profileCompleted, setProfileCompleted] = useState(true);
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);

  /* ===========================================================
     DATA FETCH
     =========================================================== */
  useEffect(() => {
    if (!user?.uid) return;

    let unsubStudents: () => void;
    let unsubTimetable: () => void;

    const fetchData = async () => {
      try {
        /* -------- Parent Profile -------- */
        const parentSnap = await getDoc(doc(db, "parents", user.uid));
        if (parentSnap.exists()) {
          const data = parentSnap.data();

          setTitle(data.title || "");
          setFullName(data.fullName || "");
          setContact(data.contact || "");
          setAddress(data.address || "");

          const completed = data.profileCompleted === true;
          setProfileCompleted(completed);

          // 🔁 Enforce wizard
          if (!completed) {
            setShowWizard(true);
            setWizardStep(1);
          }
        }

        /* -------- Students -------- */
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

        /* -------- Timetable -------- */
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

  /* ===========================================================
     LOGOUT
     =========================================================== */
  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  /* ===========================================================
     SAVE PROFILE (WIZARD STEP 1)
     =========================================================== */
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

  /* ===========================================================
     SECTION RENDER
     =========================================================== */
  const renderSection = () => {
    switch (activeTab) {
      case "Overview":
        return <OverviewSection {...{ students, selectedChildId, setSelectedChildId, timetable }} />;
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
              className="mt-4 bg-indigo-600 text-white"
            >
              Edit Parent Profile
            </Button>
          </>
        );
      default:
        return null;
    }
  };

  /* ===========================================================
     LOADING
     =========================================================== */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-b-2 border-indigo-600 rounded-full" />
      </div>
    );
  }

  /* ===========================================================
     UI
     =========================================================== */
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-6 space-y-6">

        {/* HEADER */}
        <div className="bg-white rounded-2xl shadow-lg p-6 flex justify-between">
          <div>

            {/* personalized welcome updated after profile update */}
            <h1 className="text-3xl font-bold text-indigo-800">
              {profileCompleted ? (
                <>Welcome {title && `${title} `}{fullName} 👋</>
              ) : (
                <>Welcome 👋</>
              )}
            </h1>

            <p className="text-gray-600">Parent Dashboard</p>
          </div>
          <Button onClick={handleLogout} className="bg-red-600 text-white">
            <LogOut size={18} /> Logout
          </Button>
        </div>

        {/* TABS */}
        <div className="flex gap-2 bg-white p-2 rounded-xl shadow">
          {sections.map((s) => (
            <button
              key={s}
              onClick={() => setActiveTab(s)}
              className={`px-4 py-2 rounded-lg ${
                activeTab === s
                  ? "bg-indigo-600 text-white"
                  : "hover:bg-gray-100"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* CONTENT */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          {renderSection()}
        </div>
      </div>

      {/* ===================================================
         ONBOARDING WIZARD MODAL
         =================================================== */}
      {showWizard && !profileCompleted && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-6">

            {/* STEP 1 */}
            {wizardStep === 1 && (
              <>
                <h2 className="text-2xl font-bold text-indigo-700 mb-4">
                  Complete Parent Profile
                </h2>

                <div className="space-y-3">
                  <input className="w-full border p-3 rounded" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
                  <input className="w-full border p-3 rounded" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  <input className="w-full border p-3 rounded" placeholder="Contact Number" value={contact} onChange={(e) => setContact(e.target.value)} />
                  <textarea className="w-full border p-3 rounded" placeholder="Home Address" rows={3} value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>

                <div className="flex justify-between mt-6">
                  <button onClick={() => setShowWizard(false)} className="text-gray-500">
                    Later
                  </button>
                  <Button onClick={saveProfileAndContinue} className="bg-indigo-600 text-white">
                    Continue to Child Enrolment
                  </Button>
                </div>
              </>
            )}

            {/* STEP 2 */}
            {wizardStep === 2 && (
              <>
                <h2 className="text-2xl font-bold text-indigo-700 mb-4">
                  Enrol Your Child
                </h2>
                <p className="text-gray-600 mb-6">
                  Please complete your child’s registration to continue.
                </p>
                <Button
                  onClick={() => setShowWizard(false)}
                  className="bg-green-600 text-white w-full"
                >
                  Go to Registration
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
/* ===========================================================
   OVERVIEW SECTION (ADDED REAL-TIME STATS + COLLAPSIBLE VIEW)
   =========================================================== */
function OverviewSection({
  students,
  selectedChildId,
  setSelectedChildId,
  timetable,
}: any) {

  const [showTimetable, setShowTimetable] = useState(true);

  const selectedChild = students.find((s) => s.id === selectedChildId);

  const childGradeNorm = useMemo(
    () => normalizeGrade(selectedChild?.grade),
    [selectedChild?.grade]
  );

  const childSubjects = useMemo(
    () => selectedChild?.subjects || [],
    [selectedChild?.subjects]
  );

  /* ===========================================================
     FILTERED TIMETABLE (REAL-TIME)
     =========================================================== */
  const childTimetable = useMemo(() => {
    if (!selectedChild || !childGradeNorm || childSubjects.length === 0) return [];

    return timetable
      .filter((entry) => {
        const entryGradeNorm = normalizeGrade(entry.grade);
        return (
          entryGradeNorm === childGradeNorm &&
          childSubjects.includes(entry.subject)
        );
      })
      .sort((a, b) => {
        const dayOrder = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];
        const dayA = dayOrder.indexOf(a.day);
        const dayB = dayOrder.indexOf(b.day);
        if (dayA !== dayB) return dayA - dayB;
        return a.time.localeCompare(b.time);
      });
  }, [timetable, childGradeNorm, childSubjects, selectedChild]);

  /* ===========================================================
     GROUP BY DAY (UNCHANGED)
     =========================================================== */
  const groupedTimetable = useMemo(() => {
    const groups: Record<string, TimetableEntry[]> = {};
    childTimetable.forEach((entry) => {
      if (!groups[entry.day]) groups[entry.day] = [];
      groups[entry.day].push(entry);
    });
    return Object.entries(groups);
  }, [childTimetable]);

  /* ===========================================================
     REAL-TIME STATS (NEW)
     =========================================================== */

  // Total lessons this week
  const weeklyLessonsCount = childTimetable.length;

  // Unique subjects this week
  const weeklySubjects = useMemo(
    () => [...new Set(childTimetable.map((t) => t.subject))],
    [childTimetable]
  );

  // Next upcoming lesson (simple sorted assumption)
  const nextLesson = childTimetable[0];

  /* ===========================================================
     EMPTY STATE
     =========================================================== */
  if (students.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="bg-gray-200 border-2 border-dashed rounded-xl w-24 h-24 mx-auto mb-4 flex items-center justify-center">
          <GraduationCap className="w-12 h-12 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-700">
          No Students Registered
        </h3>
        <p className="text-gray-500 mt-2">
          Register your first child to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* ===================================================
         CHILD SELECTOR + PORTAL ACCESS (UNCHANGED)
         =================================================== */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="font-medium text-gray-700">Select Child:</label>
          <Select value={selectedChildId || ""} onValueChange={setSelectedChildId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Choose a child" />
            </SelectTrigger>
            <SelectContent>
              {students.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.firstName} {s.lastName} – Grade {s.grade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedChild && (
          <Button
            onClick={() =>
              window.open(`/student-dashboard/${selectedChild.id}`, "_blank")
            }
            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white flex items-center gap-2"
          >
            <ExternalLink size={18} />
            Access Student Portal
          </Button>
        )}
      </div>

      {/* ===================================================
         📊 REAL-TIME STATS CARDS (NEW)
         =================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Next Lesson"
          value={
            nextLesson
              ? `${nextLesson.subject} • ${nextLesson.day} ${nextLesson.time}`
              : "No upcoming lesson"
          }
          icon={<Clock className="w-6 h-6" />}
          gradient="from-green-500 to-emerald-600"
        />

        <StatCard
          title="Lessons This Week"
          value={weeklyLessonsCount}
          icon={<Calendar className="w-6 h-6" />}
          gradient="from-indigo-500 to-purple-600"
        />

        <StatCard
          title="Subjects This Week"
          value={weeklySubjects.length > 0 ? weeklySubjects.join(", ") : "None"}
          icon={<BookOpen className="w-6 h-6" />}
          gradient="from-orange-500 to-pink-600"
        />
      </div>

      {/* ===================================================
         COLLAPSIBLE TIMETABLE (ADDED, DOES NOT BREAK UI)
         =================================================== */}
      <Card className="border-0 shadow-xl overflow-hidden">
        <CardHeader
          onClick={() => setShowTimetable(!showTimetable)}
          className="cursor-pointer bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
        >
          <CardTitle className="text-xl font-bold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="w-6 h-6" />
              Weekly Timetable
            </span>
            <span className="text-sm">
              {showTimetable ? "Hide" : "Show"}
            </span>
          </CardTitle>
        </CardHeader>

        {showTimetable && (
          <CardContent className="p-6 bg-gradient-to-b from-gray-50 to-white">
            {childSubjects.length === 0 ? (
              <p className="text-center text-gray-600">
                No subjects selected.
              </p>
            ) : groupedTimetable.length === 0 ? (
              <p className="text-center text-gray-600">
                No classes scheduled yet.
              </p>
            ) : (
              <div className="space-y-6">
                {groupedTimetable.map(([day, slots]) => (
                  <div key={day} className="bg-white rounded-xl border p-5">
                    <h3 className="font-bold text-indigo-800 mb-4">
                      {day}
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {slots.map((slot) => (
                        <div
                          key={slot.id}
                          className={`p-4 rounded-lg border-l-4 ${
                            slot.curriculum === "CAPS"
                              ? "bg-green-50 border-green-500"
                              : "bg-blue-50 border-blue-500"
                          }`}
                        >
                          <p className="font-semibold">{slot.subject}</p>
                          <p className="text-sm">{slot.teacherName}</p>
                          <p className="text-sm">
                            {slot.time} ({slot.duration} min)
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}

/* ===========================================================
   STAT CARD (NEW – REUSABLE)
   =========================================================== */
function StatCard({
  title,
  value,
  icon,
  gradient,
}: {
  title: string;
  value: any;
  icon: React.ReactNode;
  gradient: string;
}) {
  return (
    <div
      className={`rounded-2xl p-5 text-white shadow-lg bg-gradient-to-r ${gradient}`}
    >
      <div className="flex items-center gap-3">
        {icon}
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <p className="mt-3 text-xl font-bold">{value}</p>
    </div>
  );
}
