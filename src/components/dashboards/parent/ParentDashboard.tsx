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
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/* ---------------- Helper: Normalize Grade ---------------- */
const normalizeGrade = (grade?: string): string => {
  if (!grade) return "";
  return grade.replace(/^grade\s*/i, "").trim().toLowerCase();
};

/* ---------------- Types ---------------- */
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

/* ---------------- Sections ---------------- */
const sections = ["Overview", "Registration", "Payments", "Communications", "Status", "Settings"];

export default function ParentDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("Overview");
  const [parentName, setParentName] = useState("");
  const [title, setTitle] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  const navigate = useNavigate();

  /* ---------------- Real-Time Data Fetch ---------------- */
  useEffect(() => {
    if (!user?.uid) return;

    let unsubStudents: () => void;
    let unsubTimetable: () => void;

    const fetchData = async () => {
      try {
        // Parent name
        const parentDoc = await getDoc(doc(db, "parents", user.uid));
        if (parentDoc.exists()) {
          const data = parentDoc.data();
          setParentName(data.name || data.parentName || "");
          setTitle(data.title || "");
        }

        // Students (real-time)
        const studentQuery = query(
          collection(db, "students"),
          where("parentId", "==", user.uid)
        );
        unsubStudents = onSnapshot(studentQuery, (snap) => {
          const list: Student[] = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Student),
          }));
          setStudents(list);
          if (list.length > 0 && !selectedChildId) {
            setSelectedChildId(list[0].id);
          }
        });

        // Timetable (real-time)
        const timetableQuery = query(
          collection(db, "timetable"),
          orderBy("day"),
          orderBy("time")
        );
        unsubTimetable = onSnapshot(timetableQuery, (snap) => {
          const entries: TimetableEntry[] = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as TimetableEntry),
          }));
          setTimetable(entries);
        });

        setLoading(false);
      } catch (err) {
        console.error("Error:", err);
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      unsubStudents?.();
      unsubTimetable?.();
    };
  }, [user?.uid, selectedChildId]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const renderSection = () => {
    switch (activeTab) {
      case "Overview": return <OverviewSection students={students} selectedChildId={selectedChildId} setSelectedChildId={setSelectedChildId} timetable={timetable} />;
      case "Registration": return <RegistrationSection />;
      case "Payments": return <PaymentsSection />;
      case "Communications": return <CommunicationsSection />;
      case "Status": return <StatusSection />;
      case "Settings": return <SettingsSection />;
      default: return null;
    }
  };

  /* ---------------- UI ---------------- */
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-700 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="p-6 space-y-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-indigo-800">
              Welcome {title && `${title} `}{parentName}
            </h1>
            <p className="text-gray-600 mt-1">Parent Dashboard</p>
          </div>
          <Button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
          >
            <LogOut size={18} /> Logout
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 bg-white p-2 rounded-xl shadow-md">
          {sections.map((s) => (
            <button
              key={s}
              onClick={() => setActiveTab(s)}
              className={`px-5 py-2 rounded-lg font-medium transition-all ${
                activeTab === s
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Section Content */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          {renderSection()}
        </div>
      </div>
    </div>
  );
}

/* ===========================================================
   OVERVIEW SECTION
   =========================================================== */
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
  const childGradeNorm = useMemo(() => normalizeGrade(selectedChild?.grade), [selectedChild?.grade]);
  const childSubjects = useMemo(() => selectedChild?.subjects || [], [selectedChild?.subjects]);

  const childTimetable = useMemo(() => {
    if (!selectedChild || !childGradeNorm || childSubjects.length === 0) return [];

    return timetable
      .filter((entry) => {
        const entryGradeNorm = normalizeGrade(entry.grade);
        const gradeMatch = entryGradeNorm === childGradeNorm;
        const subjectMatch = childSubjects.includes(entry.subject);
        return gradeMatch && subjectMatch;
      })
      .sort((a, b) => {
        const dayOrder = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const dayA = dayOrder.indexOf(a.day);
        const dayB = dayOrder.indexOf(b.day);
        if (dayA !== dayB) return dayA - dayB;
        return a.time.localeCompare(b.time);
      });
  }, [timetable, childGradeNorm, childSubjects, selectedChild]);

  const groupedTimetable = useMemo(() => {
    const groups: Record<string, TimetableEntry[]> = {};
    childTimetable.forEach((entry) => {
      if (!groups[entry.day]) groups[entry.day] = [];
      groups[entry.day].push(entry);
    });
    return Object.entries(groups);
  }, [childTimetable]);

  if (students.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="bg-gray-200 border-2 border-dashed rounded-xl w-24 h-24 mx-auto mb-4 flex items-center justify-center">
          <GraduationCap className="w-12 h-12 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-700">No Students Registered</h3>
        <p className="text-gray-500 mt-2">Register your first child to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Child Selector + Access Portal */}
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
            onClick={() => window.open(`/student-dashboard/${selectedChild.id}`, "_blank")}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white flex items-center gap-2"
          >
            <ExternalLink size={18} />
            Access Student Portal
          </Button>
        )}
      </div>

      {/* Student Summary */}
      {selectedChild && (
        <Card className="border-0 shadow-xl bg-gradient-to-r from-indigo-50 to-purple-50">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-indigo-800 flex items-center gap-3">
              <User className="w-7 h-7" />
              {selectedChild.firstName} {selectedChild.lastName}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Grade</p>
              <p className="text-lg font-semibold text-indigo-700">{selectedChild.grade}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Status</p>
              <p className={`text-lg font-semibold ${selectedChild.status === "enrolled" ? "text-green-600" : "text-orange-600"}`}>
                {selectedChild.status || "Pending"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Subjects Enrolled</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {childSubjects.length > 0 ? (
                  childSubjects.map((sub) => (
                    <span
                      key={sub}
                      className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium"
                    >
                      {sub}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500 italic">None selected</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timetable */}
      <Card className="border-0 shadow-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6" />
            Weekly Timetable
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 bg-gradient-to-b from-gray-50 to-white">
          {childSubjects.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-200 border-2 border-dashed rounded-xl w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <BookOpen className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-gray-600 font-medium">No subjects selected</p>
              <p className="text-sm text-gray-500 mt-1">Go to Registration to enroll in subjects.</p>
            </div>
          ) : groupedTimetable.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-200 border-2 border-dashed rounded-xl w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <Calendar className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-gray-600 font-medium">No classes scheduled</p>
              <p className="text-sm text-gray-500 mt-1">Timetable will appear once classes are assigned.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedTimetable.map(([day, slots]) => (
                <div key={day} className="bg-white rounded-xl shadow-sm border p-5">
                  <h3 className="font-bold text-indigo-800 mb-4 flex items-center gap-2 text-lg">
                    <Calendar className="w-5 h-5" />
                    {day}
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {slots.map((slot) => (
                      <div
                        key={slot.id}
                        className={`p-4 rounded-lg border-l-4 transition-all hover:shadow-md ${
                          slot.curriculum === "CAPS"
                            ? "bg-green-50 border-green-500"
                            : "bg-blue-50 border-blue-500"
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 font-semibold text-gray-800">
                            <BookOpen className="w-4 h-4" />
                            {slot.subject}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <User className="w-4 h-4" />
                            {slot.teacherName}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Clock className="w-4 h-4" />
                            {slot.time} ({slot.duration} min)
                          </div>
                          <div>
                            <span
                              className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full text-white ${
                                slot.curriculum === "CAPS" ? "bg-green-600" : "bg-blue-600"
                              }`}
                            >
                              {slot.curriculum}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}