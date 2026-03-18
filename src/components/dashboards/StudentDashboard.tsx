/* =============================================================================
   StudentDashboard.tsx – Secure Student Portal (React + TS + Firebase)
   ============================================================================= */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "@/lib/firebaseConfig";
import {
  collection,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  deleteDoc,
  doc,
  setDoc,
  getDoc,
  addDoc,
  serverTimestamp
} from "firebase/firestore";

/* UI Components */
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getParentInfo } from "@/lib/useParentInfo";
import { useStudentAuth } from "../auth/StudentAuthContext";
// import StatCard from "@/StatCard";
import NextClassCountdownCard from "@/lib/NextClassCountdownCard";

/* Icons */
import {
  Loader2,
  LogOut,
  ArrowRight,
  Video,
  BookOpen,
  Calendar as CalendarIcon,
  AlertCircle,
  FileText,
  Users,
  Send,
  Hand,
  Mic,
  MicOff,
  Sparkles,
  MessageCircle,
  LayoutDashboard,
  Clock,
  ExternalLink,
} from "lucide-react";



/* Auth & Signaling */
import { useAuth } from "../auth/AuthProvider";
import { Signaling } from "@/lib/signaling";
import MoodleCard from "./MoodleCard";
import { useParams } from "react-router-dom";
import { Timestamp } from "firebase/firestore";
import logo from "@/img/care.png";
import AudioPDFReader from "@/lib/AudioPDFReader";


// =============================================================================
// TYPES
// =============================================================================

interface StudentProfile {
  id: string;            // Ensure this is here
  firstName: string;
  lastName?: string;
  grade: string;
  parentId?: string;
  parentName?: string;
  email?: string;
  dashboardLocked?: boolean;
  lockReason?: string;
  subjects?: Array<{ name: string } | string>; // Supports both object and string formats
}

interface TimetableEntry {
  id: string;
  day: string;
  time: string;
  subject: string;
  teacherName: string;
  grade: string;
}

interface ClassLink {
  id: string;
  name: string;
  url: string;
  grade: string;
  type: 'classroom' | 'external';
  subject: string; // Add this!
  teacherUid?: string;
  targetGrade: string;
  teacherName: string; // For display purposes
  title: string; // For display purposes
  updatedAt?: Timestamp;
  createdAt?: Timestamp;
}

// =============================================================================
// CONTROL BUTTON COMPONENT
// =============================================================================
function ControlBtn({ icon: Icon, label, active, onClick, danger, success }: any) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <Button
        onClick={onClick}
        className={`w-12 h-12 rounded-2xl transition-all shadow-lg ${active
          ? (danger ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-500')
          : (success ? 'bg-emerald-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white border border-white/10')
          }`}
      >
        <Icon size={20} />
      </Button>
      <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">{label}</span>
    </div>
  );
}

const formatTimestamp = (timestamp: any) => {
  if (!timestamp?.toDate) return "";

  const date = timestamp.toDate();

  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================
const StudentDashboard: React.FC = () => {
  const { logoutStudent, logoutParent } = useAuth();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  /* ---------------- DATA STATE ---------------- */
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [classLinks, setClassLinks] = useState<ClassLink[]>([]);
  const [linksLoaded, setLinksLoaded] = useState(false);

  /* ---------------- LIVE SESSION STATE ---------------- */
  const [isLive, setIsLive] = useState(false); // Controls if the classroom overlay is visible
  const [activeSession, setActiveSession] = useState<ClassLink | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'searching' | 'connected' | 'disconnected'>('searching');
  const activeSessionId = activeSession?.id;


  // Media Toggles
  const [isMuted, setIsMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);

  // Messaging & Presence
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [onlineStudents, setOnlineStudents] = useState<any[]>([]);
  const [isClassLive, setIsClassLive] = useState(false); // Green light indicator
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [isTeacherLive, setIsTeacherLive] = useState(false); // 
  const [IsLiveOverlay, setIsLiveOverlay] = useState(false); // 

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const signaling = useMemo(() => new Signaling())
  const { loading } = useAuth();

  const [activeTab, setActiveTab] = useState<"overview" | "timetable" | "links">(
    "overview"
  );
  const { studentId } = useParams<{ studentId: string }>();
  const dashboardLocked = profile?.dashboardLocked ?? false;

  const [parent, setParent] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    grade: string;
  } | null>(null);
  const { student } = useStudentAuth();

  const [searchTerm, setSearchTerm] = useState("");
  // Always define now ONCE so all functions use the same reference
  const [studentSubjects, setStudentSubjects] = useState<string[]>([]);
  const [now, setNow] = React.useState(new Date());



  /* ============================= */
  /* DYNAMIC LESSON END CALCULATOR */
  /* ============================= */

  const computeLessonsWithDynamicEnd = (
    lessons: any[]
  ) => {
    if (!lessons || lessons.length === 0)
      return [];

    // Sort by start time
    const sorted = [...lessons].sort((a, b) =>
      a.time.localeCompare(b.time)
    );

    return sorted.map((lesson, index) => {
      const start = parseLessonDate(
        lesson.time
      );

      let end: Date;

      if (index < sorted.length - 1) {
        const nextStart = parseLessonDate(
          sorted[index + 1].time
        );

        // If next lesson starts later → use it
        if (nextStart > start) {
          end = nextStart;
        } else {
          // Safety fallback: 30 mins minimum
          end = new Date(
            start.getTime() + 30 * 60000
          );
        }
      } else {
        // Last lesson fallback (40 min default)
        end = new Date(
          start.getTime() + 40 * 60000
        );
      }

      return {
        ...lesson,
        start,
        end,
      };
    });
  };

  useEffect(() => {
    const fetchStudent = async () => {
      if (!user?.uid) return;

      const studentRef = doc(db, "students", user.uid);
      const snapshot = await getDoc(studentRef);

      if (snapshot.exists()) {
        const data = snapshot.data();
        setStudentSubjects(
          (data.subjects || []).map((s: string) =>
            s.trim() // VERY IMPORTANT (removes leading spaces)
          )
        );
      }
    };

    fetchStudent();
  }, [user]);

  // This function logs every link access to the "link_audit_logs" collection in Firestore
  const logLinkAccess = async (link: any) => {
    console.log("CLICKED LINK:", link);

    if (!user?.uid) {
      console.log("No user UID");
      return;
    }

    if (!profile) {
      console.log("Profile not loaded yet");
      return;
    }

    try {
      await addDoc(
        collection(db, "class_links", link.id, "auditTrail"),
        {
          studentId: user.uid,
          studentName: profile.firstName,
          grade: profile.grade,
          subject: link.subject || "general",
          linkType: link.type || "resource",
          url: link.url || "",
          action: "opened_link",
          clickedAt: serverTimestamp(),
        }
      );

      console.log("Audit log saved successfully");
    } catch (error) {
      console.error("Audit log failed:", error);
    }
  };
  /* ---------------- 1. LOAD PROFILE & DATA ---------------- */
  useEffect(() => {
    // If we have a studentId, try to load it immediately. 
    // Don't wait for the standard Firebase 'user' to be ready.
    if (!studentId) return;

    const loadProfile = async () => {
      try {
        console.log("📡 Portal: Fetching profile for", studentId);
        const studentRef = doc(db, "students", studentId);
        const snap = await getDoc(studentRef);

        if (!snap.exists()) {
          console.error("❌ Portal Error: Student document does not exist in Firestore.");
          setProfileError("Student not found.");
          setProfileLoaded(true); // Stop the loading spinner
          return;
        }

        const data = snap.data();
        console.log("✅ Profile Data Received:", data.firstName);

        setProfile({ id: snap.id, ...data } as StudentProfile);
        setProfileLoaded(true);
      } catch (err) {
        console.error("❌ Database Error:", err);
        setProfileError("Connection blocked by security rules.");
        setProfileLoaded(true);
      }
    };

    loadProfile();
  }, [studentId]);

  // TIME SETTING (For Timetable Highlighting)


  React.useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60 * 1000); // update every minute

    return () => clearInterval(interval);
  }, []);


  useEffect(() => {
    if (!profile?.grade) return;

    const normalizedStudentSubjects =
      (profile.subjects || []).map((s: any) =>
        (typeof s === "string" ? s : s.name || "")
          .trim()
          .toLowerCase()
      );

    /* ========================= */
    /* 1️⃣ TIMETABLE LISTENER */
    /* ========================= */

    const qTime = query(
      collection(db, "timetable"),
      where("grade", "==", profile.grade)
    );

    const unsubTime = onSnapshot(qTime, (snap) => {
      const allLessons = snap.docs.map(
        (d) =>
        ({
          id: d.id,
          ...d.data(),
        } as TimetableEntry)
      );

      // 🎯 FILTER BY ENROLLED SUBJECTS
      const filteredLessons = allLessons.filter(
        (lesson) => {
          const lessonSub = (lesson.subject || "")
            .trim()
            .toLowerCase();

          return normalizedStudentSubjects.includes(
            lessonSub
          );
        }
      );

      // Sort by time ascending
      filteredLessons.sort((a, b) =>
        a.time.localeCompare(b.time)
      );

      setTimetable(filteredLessons);
    });

    /* ========================= */
    /* 2️⃣ CLASS LINKS LISTENER */
    /* ========================= */

    const qLinks = query(
      collection(db, "class_links"),
      where("targetGrade", "in", [
        profile.grade,
        "all",
      ])
    );

    const unsubLinks = onSnapshot(qLinks, (snap) => {
      const allLinks = snap.docs.map(
        (d) =>
        ({
          id: d.id,
          ...d.data(),
        } as ClassLink)
      );

      const studentLinks = allLinks.filter(
        (link) => {
          // 🌍 Global grade link
          if (link.targetGrade === "all")
            return true;

          const linkSub = (link.subject || "")
            .trim()
            .toLowerCase();

          // 🌍 General subject link
          if (
            linkSub === "all" ||
            linkSub === "general"
          )
            return true;

          return normalizedStudentSubjects.includes(
            linkSub
          );
        }
      );

      setClassLinks(studentLinks);

      /* ========================= */
      /* 3️⃣ LIVE ROOM DETECTION */
      /* ========================= */

      const classroomIds = studentLinks
        .filter((l) => l.type === "classroom")
        .map((l) => l.id);

      if (classroomIds.length === 0) {
        setIsTeacherLive(false);
        return;
      }

      const qRooms = query(
        collection(db, "rooms"),
        where("status", "==", "live")
      );

      const unsubRooms = onSnapshot(
        qRooms,
        (roomSnap) => {
          const activeLiveRooms =
            roomSnap.docs.filter((doc) =>
              classroomIds.includes(doc.id)
            );

          setIsTeacherLive(
            activeLiveRooms.length > 0
          );
        }
      );

      // ✅ Proper cleanup of nested listener
      return () => unsubRooms();
    });

    /* ========================= */
    /* CLEANUP */
    /* ========================= */

    return () => {
      unsubTime();
      unsubLinks();
    };

  }, [profile?.grade, profile?.subjects]);

  // search
  const filteredLinks = useMemo(() => {
    return classLinks.filter((link) => {
      // 1. Search Logic: Match title, subject, or teacher name
      const searchMatch =
        link.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        link.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        link.teacherName?.toLowerCase().includes(searchTerm.toLowerCase());

      return searchMatch;
    });
  }, [classLinks, searchTerm]);

  /* ---------------- 2. JOIN LIVE CLASSROOM ---------------- */
  const joinClass = async (link: ClassLink) => {
    setActiveSession(link);
    setIsLiveOverlay(true);
    // Logic for joinRoom(link.id, user.uid, profile.firstName) would trigger here
  };

  /* ---------------- UI HELPERS ---------------- */
  const today = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date());
  const todayClasses = timetable.filter(t => t.day === today);

  const handleLogout = async () => {
    try {
      if (user?.role === "student") {
        // 1. If a student is logging out
        logoutStudent();
        // Note: logoutStudent handles the redirect to /student-login internally
      } else {
        // 2. If a Parent, Teacher, or Admin is logging out
        await logoutParent();
        // This will clear Firebase Auth but leave studentSession alone
        navigate("/");
      }
    } catch (err) {
      console.error("Logout failed", err);
    }
  };


  // STUDENT LINK TO PARENT

  useEffect(() => {
    if (!student?.parentId) return;

    getParentInfo(student.parentId).then(setParent);
  }, [student?.parentId]);

  // Wait for the profile to be fetched from Firestore before showing anything
  if (!profileLoaded) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Synchronizing Portal...</p>
      </div>
    );
  }

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If profile is loaded but no data was found
  if (!profile) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-xl font-bold">Profile Not Found</h2>
        <p>Please contact support or check your link.</p>
      </div>
    );
  }

  if (profile?.dashboardLocked) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="max-w-md bg-white p-10 rounded-3xl shadow-xl text-center">
          <AlertCircle className="mx-auto text-rose-500 mb-4" size={48} />
          <h2 className="text-xl font-black mb-2">Access Temporarily Restricted</h2>
          <p className="text-sm text-slate-500 mb-6">
            Your dashboard has been locked due to {profile.lockReason || "administrative reasons"}.
            Please ask your parent or guardian to settle the invoice.
          </p>
          <Button onClick={handleLogout} variant="outline">
            Logout
          </Button>
        </div>
      </div>
    );
  }



  /* =====================================================
     TIME PARSER (reusable everywhere)
  ===================================================== */
  const parseLessonDate = (timeStr: string) => {
    const [clock, meridian] = timeStr.split(" ");
    let [hours, minutes] = clock.split(":").map(Number);

    if (meridian === "PM" && hours !== 12) hours += 12;
    if (meridian === "AM" && hours === 12) hours = 0;

    const lessonDate = new Date(now);
    lessonDate.setHours(hours, minutes, 0, 0);

    return lessonDate;
  };

  /* =====================================================
     GET LESSON STATUS
     done     → lesson finished
     ongoing  → lesson happening now
     next     → next lesson today
     upcoming → later today
  ===================================================== */
  const getLessonStatus = (
    lesson: any,
    todayLessons: any[]
  ) => {
    // const now = new Date();

    const lessonsWithEnd =
      computeLessonsWithDynamicEnd(todayLessons);

    const currentLesson = lessonsWithEnd.find(
      l => l.id === lesson.id
    );

    if (!currentLesson) return "upcoming";

    if (now > currentLesson.end) return "done";

    if (
      now >= currentLesson.start &&
      now < currentLesson.end
    )
      return "ongoing";

    // Find next lesson
    const futureLessons = lessonsWithEnd
      .filter(l => l.start > now)
      .sort(
        (a, b) =>
          a.start.getTime() -
          b.start.getTime()
      );

    if (
      futureLessons.length > 0 &&
      futureLessons[0].id === lesson.id
    ) {
      return "next";
    }

    return "upcoming";
  };

  /* =====================================================
     BADGE STYLES
  ===================================================== */
  const statusStyles: Record<string, string> = {

    done:
      "bg-slate-100 text-slate-400 border-slate-200",

    ongoing:
      "bg-green-500 text-white border-green-500 animate-pulse",

    next:
      "bg-indigo-500 text-white border-indigo-500",

    upcoming:
      "bg-yellow-100 text-yellow-700 border-yellow-200"
  };

  const statusLabel: Record<string, string> = {

    done: "Done",

    ongoing: "Current",

    next: "Next",

    upcoming: "Upcoming"
  };

  /* ================================
     FILTER + SORT LINKS
  ================================ */

  // 🔥 Clean subject helper
  const cleanSubject = (value: string = "") =>
    value
      .toLowerCase()
      .replace(/\(.*?\)/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const studentGrade = profile?.grade?.toLowerCase().trim();

  // Normalize student subjects
  const enrolledSubjects =
    profile?.subjects?.map((s: any) =>
      cleanSubject(typeof s === "string" ? s : s.name)
    ) || [];

  const enrollmentFilteredLinks = classLinks
    .filter((link) => {
      const linkSubject = cleanSubject(link.subject ?? "");
      const linkGrade = (link.targetGrade ?? "")
        .toLowerCase()
        .trim();

      // 1️⃣ Grade-wide links
      if (linkGrade === "all") return true;

      // 2️⃣ General subject (grade must match)
      if (
        (linkSubject === "all" || linkSubject === "general") &&
        linkGrade === studentGrade
      ) {
        return true;
      }

      // 3️⃣ Must match grade + subject
      const gradeMatches = linkGrade === studentGrade;
      const subjectMatches = enrolledSubjects.includes(linkSubject);

      return gradeMatches && subjectMatches;
    })

    // 🔥 SORT NEWEST FIRST
    .sort((a, b) => {
      const aTime =
        a.updatedAt?.seconds ||
        a.createdAt?.seconds ||
        0;

      const bTime =
        b.updatedAt?.seconds ||
        b.createdAt?.seconds ||
        0;

      return bTime - aTime; // newest first
    });
  /* =====================================================
     DAY ORDER
  ===================================================== */
  const dayOrder: Record<string, number> = {

    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
    Sunday: 7

  };


  /* =====================================================
     MINUTES CONVERTER
  ===================================================== */
  const getMinutes = (timeStr: string) => {
    const date = parseLessonDate(timeStr);
    return date.getHours() * 60 + date.getMinutes();
  };


  /* =====================================================
     FULL TIMETABLE SORT (BY DAY → TIME)
  ===================================================== */
  const sortedTimetable = [...timetable].sort((a, b) => {

    const dayDiff = dayOrder[a.day] - dayOrder[b.day];

    if (dayDiff !== 0) return dayDiff;

    return getMinutes(a.time) - getMinutes(b.time);

  });


  /* =====================================================
     TODAY LESSONS SORT
     Shows:
     CURRENT → NEXT → UPCOMING → DONE (optional)
  ===================================================== */
  const orderedTodayClasses = [...todayClasses]
    .map(item => ({
      ...item,
      lessonDate: parseLessonDate(item.time)
    }))
    .sort((a, b) => {

      const aStart = a.lessonDate.getTime();
      const bStart = b.lessonDate.getTime();
      const nowTime = now.getTime();

      const aDiff = aStart - nowTime;
      const bDiff = bStart - nowTime;

      // Current lesson first
      if (aDiff <= 0 && nowTime <= aStart + 3600000) return -1;
      if (bDiff <= 0 && nowTime <= bStart + 3600000) return 1;

      // Future lessons sorted ascending
      if (aDiff >= 0 && bDiff >= 0) return aDiff - bDiff;

      // Past lessons last
      if (aDiff < 0 && bDiff >= 0) return 1;
      if (aDiff >= 0 && bDiff < 0) return -1;

      return aDiff - bDiff;
    });

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <div className="min-h-screen bg-[#F8FAFC]">
        {/* HEADER */}
        <header className="bg-white border-b sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <img src={logo} alt="Logo" className="w-20 h-20" />
            <div className="flex flex-col">
              <h1 className="text-xl font-black">
                {profile?.firstName ? `Welcome, ${profile.firstName} ${profile.lastName}` : "Student Portal"}
              </h1>
              <p className="text-xs text-slate-400 flex flex-wrap items-center gap-2 mt-1">
                {profile?.grade && <span className="font-semibold text-indigo-600 uppercase tracking-wide">Grade {profile.grade}</span>}
                {profile?.parentName && <span className="text-slate-300">•</span>}
                {profile?.parentName && <span className="font-medium text-slate-500">Linked to {profile.parentName}</span>}
              </p>
            </div>
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut size={16} className="mr-2" />
              Logout
            </Button>
          </div>

          {/* NAV */}
          <nav className="max-w-7xl mx-auto px-6 flex gap-8">
            {[
              { id: "overview", icon: LayoutDashboard, label: "Overview" },
              { id: "timetable", icon: Clock, label: "Schedule" },
              { id: "links", icon: Video, label: "Resources" },
              { id: "audio-pdf", icon: BookOpen, label: "Audio PDF" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`py-4 text-xs font-black uppercase transition ${activeTab === t.id ? "border-b-2 border-indigo-600 text-indigo-600" : "text-slate-400 hover:text-slate-600"
                  }`}
              >
                <t.icon size={14} className="inline mr-2" />
                {t.label}
              </button>
            ))}
          </nav>
        </header>

        <MoodleCard />

        <main className="max-w-7xl mx-auto p-6 md:p-10">
          {/* 1. OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div className="space-y-10 animate-in fade-in duration-500">
              {profile && <NextClassCountdownCard userUid={profile.id} role="student" grade={profile.grade} />}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard icon={CalendarIcon} title="Today's Lessons" value={todayClasses.length} color="indigo" />
                <StatCard icon={BookOpen} title="Weekly Total" value={timetable.length} color="amber" />
                <StatCard icon={Video} title="Available Links" value={classLinks.length} color="emerald" />
              </div>

              <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Today's Schedule ({today})</h2>
                <div className="space-y-4">
                  {orderedTodayClasses.length > 0 ? (
                    orderedTodayClasses.map((item) => {
                      const status = getLessonStatus(item, orderedTodayClasses);
                      return (
                        <div key={item.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-3xl border border-slate-100">
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 bg-white rounded-2xl flex flex-col items-center justify-center shadow-sm">
                              <span className="text-[10px] font-black text-indigo-600 leading-none">{item.time.split(" ")[1]}</span>
                              <span className="text-[12px] font-black text-slate-800">{item.time.split(" ")[0]}</span>
                            </div>
                            <div>
                              <h4 className="font-black text-slate-800 text-sm uppercase">{item.subject}</h4>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.teacherName}</p>
                            </div>
                          </div>
                          <Badge className={statusStyles[status]}>{statusLabel[status]}</Badge>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-slate-400 italic text-sm">No lessons scheduled for today.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 2. TIMETABLE TAB */}
          {activeTab === "timetable" && (
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {["Day", "Time", "Subject", "Teacher"].map((h) => (
                        <th key={h} className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {sortedTimetable.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-6 font-black text-slate-800 text-xs uppercase">{entry.day}</td>
                        <td className="p-6 font-bold text-slate-500 text-xs">{entry.time}</td>
                        <td className="p-6">
                          <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg font-black text-[10px] uppercase">{entry.subject}</span>
                        </td>
                        <td className="p-6 text-xs font-bold text-slate-400">{entry.teacherName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. LINKS TAB */}
          {activeTab === "links" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
              {/* Map your enrollmentFilteredLinks here */}
            </div>
          )}

          {/* 4. AUDIO PDF TAB - 🔹 This is the fix */}
          {activeTab === "audio-pdf" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <AudioPDFReader />
              </div>
            </div>
          )}
        </main>
      </div>

      <main className="max-w-7xl mx-auto p-1 md:p-10">

        {/* LIVE ALERT BANNER */}
        {isClassLive && !isLive && (
          <div className="mb-10 bg-emerald-500 p-1 rounded-[2rem] shadow-2xl shadow-emerald-200 animate-bounce">
            <div className="bg-slate-900 rounded-[1.9rem] p-6 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                </div>
                <div>
                  <h3 className="text-white font-black text-xl italic tracking-tighter uppercase">Live Session Detected</h3>
                  <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Your teacher is currently in the classroom</p>
                </div>
              </div>
              <Button onClick={() => {
                const liveLink = classLinks.find(l => l.type === "classroom");
                if (liveLink) { setActiveSession(liveLink); setIsLive(true); }
              }} className="bg-emerald-500 hover:bg-emerald-600 text-white font-black px-10 h-14 rounded-2xl shadow-xl shadow-emerald-500/20">
                JOIN CLASSROOM NOW
              </Button>
            </div>
          </div>
        )}


        {/* RESOURCE GRID */}
        <div className="grid flex-col md:grid-cols-2 lg:grid-cols-1 gap-8">
          {/* 3. LINKS TAB */}
          {activeTab === "links" && (
            <div className="space-y-8 animate-in fade-in duration-500">

              {/* SEARCH BAR AREA */}
              <div className="relative max-w-md mx-auto md:mx-0">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <Loader2 className={`animate-spin text-indigo-500 ${linksLoaded ? 'hidden' : 'block'}`} size={18} />
                  {!linksLoaded && <div className="w-4 h-4 bg-slate-100 rounded-full" />}
                  {linksLoaded && <Users className="text-slate-400" size={18} />}
                </div>
                <Input
                  type="text"
                  placeholder="Search by subject or teacher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-14 bg-white border-slate-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                />
              </div>


              {/* GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-8">
                {enrollmentFilteredLinks.length > 0 ? (
                  enrollmentFilteredLinks.map((link) => (
                    <Card
                      key={link.id}
                      className="group border-0 shadow-xl rounded-[2.5rem] overflow-hidden hover:scale-[1.03] transition-all cursor-pointer bg-white"
                      onClick={async () => {
                        await logLinkAccess(link); // 🔥 AUDIT FIRST

                        const isExternal =
                          link.url?.startsWith("http") || link.url?.includes(".");

                        if (isExternal) {
                          const destination = link.url.startsWith("http")
                            ? link.url
                            : `https://${link.url}`;

                          window.open(destination, "_blank");
                        } else {
                          joinClass(link);
                        }
                      }}
                    >
                      <CardContent className="p-8">
                        <div className="flex items-center gap-5 mb-6">
                          <div
                            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-sm ${link.type === "classroom"
                              ? "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white"
                              : "bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white"
                              }`}
                          >
                            {link.type === "classroom" ? (
                              <Video size={24} />
                            ) : (
                              <FileText size={24} />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4 className="font-black text-slate-800 uppercase text-sm truncate tracking-tight group-hover:text-indigo-600 transition-colors">
                              {link.title}
                            </h4>

                            {/* SUBJECT + TEACHER */}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase">
                                {link.subject || "General"}
                              </span>

                              <span className="text-[10px] font-bold text-slate-400 truncate">
                                {link.teacherName}
                              </span>
                            </div>

                            {/* 🔥 TIMESTAMP */}
                            <p className="text-[10px] text-slate-400 mt-1">
                              🕒 {formatTimestamp(link.updatedAt || link.createdAt)}
                            </p>
                          </div>
                        </div>

                        <div className="mb-6 p-3 bg-slate-50 rounded-xl border border-slate-100 group-hover:bg-indigo-50/50 transition-colors">
                          <p className="text-[10px] font-mono text-indigo-400 truncate">
                            {link.url}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                          <Badge
                            className={`border-none font-black text-[9px] uppercase tracking-widest px-4 py-1.5 rounded-xl ${link.type === "classroom"
                              ? "bg-emerald-100 text-emerald-600"
                              : "bg-slate-100 text-slate-500"
                              }`}
                          >
                            {link.type === "classroom"
                              ? "● Live Session"
                              : "Resource Material"}
                          </Badge>

                          <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                            <ExternalLink size={18} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-full py-20 text-center">
                    <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="text-slate-400" size={32} />
                    </div>
                    <h3 className="text-slate-800 font-black uppercase text-sm">
                      No Resources Found
                    </h3>
                    <p className="text-slate-400 text-xs mt-1">
                      You don't have any links for your current subjects yet.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Empty State if no links match student's subjects */}
          {enrollmentFilteredLinks.length === 0 && (
            <div className="col-span-full py-20 text-center">
              <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="text-slate-400" size={32} />
              </div>
              <h3 className="text-slate-800 font-black uppercase text-sm">No Resources Found</h3>
              <p className="text-slate-400 text-xs mt-1">You don't have any links for your current subjects yet.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}




// ... (Sub-components like LoadingScreen/ClockIcon omitted for space)
const LoadingScreen = () => (
  <div className="h-screen bg-slate-50 flex flex-col items-center justify-center">
    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Synchronizing Portal...</p>
  </div>
);

const ClockIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
);


/* =============================================================================
   SUB-COMPONENTS
   ============================================================================= */

const StatCard = ({ icon: Icon, title, value, color }: any) => {
  const colorMap: any = {
    indigo: "bg-indigo-50 text-indigo-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };

  return (
    <Card className="border-0 shadow-sm rounded-[2rem] overflow-hidden">
      <CardContent className="p-8 flex items-center gap-6">
        <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center ${colorMap[color]}`}>
          <Icon size={28} />
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
          <p className="text-3xl font-black text-slate-800 tracking-tighter italic">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default StudentDashboard;