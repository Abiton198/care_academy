import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "@/lib/firebaseConfig";
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  getDoc,
  orderBy,
} from "firebase/firestore";

/* UI Components */
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

/* Icons */
import {
  Loader2,
  LogOut,
  ArrowRight,
  Video,
  BookOpen,
  Calendar as CalendarIcon,
  AlertCircle,
  Users,
  LayoutDashboard,
  Clock,
  ExternalLink,
} from "lucide-react";

import NextClassCountdownCard from "@/lib/NextClassCountdownCard";
import MoodleCard from "./MoodleCard";
import AudioPDFReader from "@/lib/AudioPDFReader";
import FlashCardComponent from "@/components/FlashCard";
import { flashCards } from "@/lib/flashcards";

import logo from "@/img/care.png";

// =============================================================================
// TYPES
// =============================================================================

interface StudentSession {
  studentId: string;
  firstName: string;
  lastName: string;
  grade: string;
  role: string;
  loginMethod?: string;
  loginTime?: number;
  isParentView?: boolean;
  parentUid?: string;
}

interface StudentProfile {
  id: string;
  firstName: string;
  lastName?: string;
  grade: string;
  parentId?: string;
  dashboardLocked?: boolean;
  lockReason?: string;
  subjects?: Array<{ name: string } | string>;
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
  name?: string;
  title?: string;
  url: string;
  targetGrade?: string;
  grade?: string;
  type: "classroom" | "external";
  subject?: string;
  teacherName?: string;
  createdAt?: any;
  status?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Parses both 24-hour ("08:00") and 12-hour ("08:00 AM") time strings
 * into a full Date object for comparison.
 */
const parseLessonDate = (timeStr: string, baseDate: Date): Date => {
  const parts = timeStr.trim().split(" ");
  const clock = parts[0];
  const meridian = parts[1]?.toUpperCase();
  let [hours, minutes] = clock.split(":").map(Number);

  if (!meridian) {
    // 24-hour format — use directly
    const lessonDate = new Date(baseDate);
    lessonDate.setHours(hours, minutes || 0, 0, 0);
    return lessonDate;
  }

  // 12-hour format
  if (meridian === "PM" && hours !== 12) hours += 12;
  if (meridian === "AM" && hours === 12) hours = 0;

  const lessonDate = new Date(baseDate);
  lessonDate.setHours(hours, minutes || 0, 0, 0);
  return lessonDate;
};

/**
 * Parses both 24-hour and 12-hour time strings into minutes since midnight
 * for simple numeric comparison/sorting.
 */
const parseTimeToMinutes = (timeStr: string): number => {
  const parts = timeStr.trim().split(" ");
  const clock = parts[0];
  const modifier = parts[1]?.toUpperCase();
  let [hours, minutes] = clock.split(":").map(Number);

  if (!modifier) {
    return hours * 60 + (minutes || 0);
  }

  if (modifier === "PM" && hours !== 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;

  return hours * 60 + (minutes || 0);
};

const getLessonStatus = (
  lesson: TimetableEntry,
  now: Date,
  orderedTodayClasses: TimetableEntry[]
): "done" | "ongoing" | "next" | "upcoming" => {
  const lessonDate = parseLessonDate(lesson.time, now);
  const lessonEnd = new Date(lessonDate.getTime() + 60 * 60 * 1000);

  if (now > lessonEnd) return "done";
  if (now >= lessonDate && now <= lessonEnd) return "ongoing";

  const futureLessons = orderedTodayClasses.filter(
    (l) => parseLessonDate(l.time, now) > now
  );
  if (futureLessons.length > 0 && futureLessons[0].id === lesson.id) return "next";
  return "upcoming";
};

const StatCard = ({
  icon: Icon,
  title,
  value,
  color = "indigo",
}: {
  icon: React.ElementType;
  title: string;
  value: number | string;
  color?: "indigo" | "amber" | "emerald";
}) => {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
      <div className={`p-4 rounded-2xl ${colors[color]}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
        <p className="text-2xl font-black text-slate-800">{value}</p>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const StudentDashboard: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<StudentSession | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [classLinks, setClassLinks] = useState<ClassLink[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "timetable" | "links" | "audio-pdf">("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [now, setNow] = useState(new Date());

  // ===========================================================================
  // STEP 1: Resolve session
  // ===========================================================================
  useEffect(() => {
    if (!studentId) {
      navigate("/");
      return;
    }

    const storedSession = sessionStorage.getItem("studentSession");
    if (storedSession) {
      try {
        const parsed: StudentSession = JSON.parse(storedSession);
        if (!parsed.studentId) throw new Error("Missing studentId in session");
        if (!parsed.isParentView && parsed.studentId !== studentId) {
          sessionStorage.removeItem("studentSession");
          navigate("/");
          return;
        }
        setSession(parsed);
        setSessionChecked(true);
        return;
      } catch (e) {
        console.error("Invalid studentSession:", e);
        sessionStorage.removeItem("studentSession");
      }
    }

    const parentKey = `parentViewSession_${studentId}`;
    const parentStored = localStorage.getItem(parentKey);
    if (parentStored) {
      try {
        const parsed: StudentSession = JSON.parse(parentStored);
        if (!parsed.studentId || parsed.studentId !== studentId) {
          throw new Error("Parent session studentId mismatch");
        }
        sessionStorage.setItem("studentSession", JSON.stringify(parsed));
        localStorage.removeItem(parentKey);
        setSession(parsed);
        setSessionChecked(true);
        return;
      } catch (e) {
        console.error("Invalid parentViewSession:", e);
        localStorage.removeItem(parentKey);
      }
    }

    navigate("/");
  }, [studentId, navigate]);

  // Live clock — updates every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // ===========================================================================
  // STEP 2: Load Firestore student profile
  // ===========================================================================
  useEffect(() => {
    if (!sessionChecked || !session || !studentId) return;

    const loadProfile = async () => {
      try {
        const snap = await getDoc(doc(db, "students", studentId));

        if (!snap.exists()) {
          setProfileError("Student profile not found. Contact your administrator.");
          setProfileLoaded(true);
          return;
        }

        const data = snap.data() as StudentProfile;

        if (session.isParentView && session.parentUid && data.parentId) {
          if (data.parentId !== session.parentUid) {
            navigate("/parent-dashboard");
            return;
          }
        }

        setProfile({ id: snap.id, ...data });
        setProfileError(null);
      } catch (err: any) {
        console.error("Profile load error:", err);
        if (err?.code === "permission-denied") {
          setProfileError("Access denied. Ensure Firestore rules allow reads on the students collection.");
        } else {
          setProfileError("Failed to load profile. Check your internet connection.");
        }
      } finally {
        setProfileLoaded(true);
      }
    };

    loadProfile();
  }, [sessionChecked, session, studentId, navigate]);

  // ===========================================================================
  // STEP 3: Real-time timetable
  //
  // FIX: Query is by grade only — NO subject filtering at the Firestore level.
  // This ensures ALL slots for the grade (e.g. "Morning Devotion", assemblies,
  // new subjects added later) are always received by the listener.
  // Subject filtering happens in the UI layer via filteredTimetable below.
  // ===========================================================================
  useEffect(() => {
    if (!profile?.grade) return;

    const q = query(
      collection(db, "timetable"),
      where("grade", "==", profile.grade)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        console.log("[Timetable] snapshot received, doc count:", snap.docs.length);
        setTimetable(
          snap.docs.map((d) => ({ id: d.id, ...d.data() })) as TimetableEntry[]
        );
      },
      (err) => {
        console.error("[Timetable] listener error:", err);
      }
    );

    return () => unsub();
  }, [profile?.grade]); // ← Only re-subscribe if the grade changes

  // ===========================================================================
  // STEP 4: Real-time class links
  // ===========================================================================
  useEffect(() => {
    if (!profile?.grade) return;

    const qLinks = query(
      collection(db, "class_links"),
      where("status", "==", "active"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      qLinks,
      (snap) => {
        let links = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ClassLink[];

        const studentGrade = profile.grade.trim().toLowerCase();
        const studentSubjects = (profile.subjects || []).map((s) =>
          (typeof s === "string" ? s : s?.name || "").trim().toLowerCase()
        );

        links = links.filter((link) => {
          const targetGrade = (link.targetGrade || link.grade || "").trim().toLowerCase();
          const linkSubject = (link.subject || "").trim().toLowerCase();

          const gradeMatch = targetGrade === "all" || targetGrade === studentGrade;
          const subjectMatch =
            !linkSubject ||
            linkSubject === "all" ||
            linkSubject === "general" ||
            studentSubjects.length === 0 ||
            studentSubjects.includes(linkSubject);

          return gradeMatch && subjectMatch;
        });

        setClassLinks(links);
      },
      (err) => console.error("Class links listener error:", err)
    );

    return () => unsub();
  }, [profile]);

  // ===========================================================================
  // COMPUTED VALUES
  // ===========================================================================

  // Keep studentSubjectNames only for class links filtering (not timetable)
  const studentSubjectNames = useMemo(() => {
    if (!profile?.subjects || profile.subjects.length === 0) return null;
    return profile.subjects.map((s) =>
      (typeof s === "string" ? s : s?.name || "").trim().toLowerCase()
    );
  }, [profile?.subjects]);

  /**
   * NO subject filtering on the timetable.
   *
   * The Firestore query already scopes entries by grade — every slot
   * returned belongs to this student's grade. Filtering by subject on
   * top of that causes selective updates (e.g. "Mathematics(Primary)"
   * failing to match "mathematics" in the student profile) and hides
   * school-wide slots like "Morning Devotion".
   *
   * Students should see their full grade timetable, exactly as the
   * principal published it.
   */
  const filteredTimetable = useMemo(() => timetable, [timetable]);

  const today = now.toLocaleDateString("en-US", { weekday: "long" });

  const todayClasses = useMemo(
    () => filteredTimetable.filter((t) => t.day === today),
    [filteredTimetable, today]
  );

  const orderedTodayClasses = useMemo(() => {
    return [...todayClasses]
      .map((item) => ({ ...item, lessonDate: parseLessonDate(item.time, now) }))
      .sort((a, b) => a.lessonDate.getTime() - b.lessonDate.getTime());
  }, [todayClasses, now]);

  const filteredLinks = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return classLinks;
    return classLinks.filter((link) => {
      const title = (link.title || link.name || "").toLowerCase();
      const subject = (link.subject || "").toLowerCase();
      return title.includes(term) || subject.includes(term);
    });
  }, [classLinks, searchTerm]);

  // Chronologically sorted full timetable for the Schedule tab
  const sortedTimetable = useMemo(() => {
    const dayOrder: Record<string, number> = {
      Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4,
      Friday: 5, Saturday: 6, Sunday: 7,
    };

    return [...filteredTimetable].sort((a, b) => {
      const dayA = dayOrder[a.day] || 99;
      const dayB = dayOrder[b.day] || 99;
      if (dayA !== dayB) return dayA - dayB;
      return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
    });
  }, [filteredTimetable]);

  // ===========================================================================
  // HANDLERS
  // ===========================================================================

  const handleLogout = () => {
    sessionStorage.removeItem("studentSession");
    if (session?.isParentView) {
      navigate("/parent-dashboard");
    } else {
      navigate("/");
    }
  };

  const statusStyles: Record<string, string> = {
    done: "bg-slate-100 text-slate-400",
    ongoing: "bg-green-500 text-white animate-pulse",
    next: "bg-indigo-500 text-white",
    upcoming: "bg-yellow-100 text-yellow-700",
  };

  const statusLabel: Record<string, string> = {
    done: "Done",
    ongoing: "Live Now",
    next: "Next",
    upcoming: "Upcoming",
  };

  // ===========================================================================
  // LOADING / ERROR STATES
  // ===========================================================================

  if (!sessionChecked || !profileLoaded) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="font-black text-slate-400 uppercase tracking-widest text-xs">
          Loading your dashboard...
        </p>
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md bg-white p-10 rounded-3xl shadow-xl text-center">
          <AlertCircle className="mx-auto text-rose-500 mb-4" size={48} />
          <h2 className="text-xl font-black mb-2">Access Error</h2>
          <p className="text-sm text-slate-500 mb-6">{profileError || "Unable to load profile."}</p>
          <Button onClick={handleLogout} variant="outline">Return to Login</Button>
        </div>
      </div>
    );
  }

  if (profile.dashboardLocked) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md bg-white p-10 rounded-3xl shadow-xl text-center">
          <AlertCircle className="mx-auto text-rose-500 mb-4" size={48} />
          <h2 className="text-xl font-black mb-2">Access Restricted</h2>
          <p className="text-sm text-slate-500 mb-6">
            {profile.lockReason || "Please settle pending invoices."}
          </p>
          <Button onClick={handleLogout} variant="outline">
            {session?.isParentView ? "Back to Dashboard" : "Logout"}
          </Button>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // MAIN RENDER
  // ===========================================================================

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900">

      {/* HEADER */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logo} alt="Logo" className="w-12 h-12 object-contain" />
            <div>
              <h1 className="text-lg font-black leading-tight">
                {profile.firstName} {profile.lastName}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-indigo-50 text-indigo-600 text-[10px] border-none">
                  Grade {profile.grade}
                </Badge>
                {session?.isParentView && (
                  <Badge className="bg-amber-50 text-amber-600 text-[10px] border-none">
                    Parent View
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-slate-400 hover:text-rose-500"
          >
            <LogOut size={16} className="mr-2" />
            {session?.isParentView ? "Back to Dashboard" : "Logout"}
          </Button>
        </div>

        <nav className="max-w-7xl mx-auto px-6 flex gap-6 border-t overflow-x-auto">
          {[
            { id: "overview", icon: LayoutDashboard, label: "Overview" },
            { id: "timetable", icon: Clock, label: "Schedule" },
            { id: "links", icon: Video, label: "Resources" },
            { id: "audio-pdf", icon: BookOpen, label: "Audio PDF" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 text-xs font-black uppercase transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto p-6 md:p-10 space-y-10">

        {/* ── OVERVIEW ── */}
        {activeTab === "overview" && (
          <div className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {flashCards.slice(0, 1).map((card) => (
                <FlashCardComponent key={card.id} card={card} />
              ))}
              <MoodleCard />
            </div>

            {profile && (
              <NextClassCountdownCard
                userUid={profile.id}
                role={session?.isParentView ? "parent" : "student"}
                grade={profile.grade}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard icon={CalendarIcon} title="Today's Lessons" value={todayClasses.length} color="indigo" />
              <StatCard icon={BookOpen} title="Weekly Lessons" value={filteredTimetable.length} color="amber" />
              <StatCard icon={Video} title="Resources" value={classLinks.length} color="emerald" />
            </div>

            {/* Today's Schedule */}
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">
                Today's Schedule — {today}
              </h2>
              <div className="space-y-4">
                {orderedTodayClasses.length > 0 ? (
                  orderedTodayClasses.map((item) => {
                    const status = getLessonStatus(item, now, orderedTodayClasses);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-5 bg-slate-50 rounded-3xl border border-slate-100 hover:bg-white transition-colors"
                      >
                        <div className="flex items-center gap-5">
                          {/* ── Time box: works for both "08:00" and "08:00 AM" ── */}
                          <div className="w-14 h-14 bg-white rounded-2xl flex flex-col items-center justify-center shadow-sm border border-slate-100">
                            {item.time.includes(" ") && (
                              <span className="text-[10px] font-black text-indigo-600 leading-none">
                                {item.time.split(" ")[1]}
                              </span>
                            )}
                            <span className="text-[14px] font-black text-slate-800">
                              {item.time.split(" ")[0]}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-black text-slate-800 text-sm uppercase">{item.subject}</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              {item.teacherName}
                            </p>
                          </div>
                        </div>
                        <Badge
                          className={`${statusStyles[status]} px-4 py-1.5 rounded-xl uppercase text-xs font-black tracking-wider`}
                        >
                          {statusLabel[status]}
                        </Badge>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-slate-400 text-sm font-medium">
                    No lessons scheduled for {today}.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── TIMETABLE ── */}
        {activeTab === "timetable" && (
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b">
                  {["Day", "Time", "Subject", "Teacher"].map((h) => (
                    <th key={h} className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedTimetable.length > 0 ? (
                  sortedTimetable.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50/70">
                      <td className="p-6 font-black text-slate-800 text-xs uppercase">{entry.day}</td>
                      <td className="p-6 font-bold text-slate-500 text-xs">{entry.time}</td>
                      <td className="p-6">
                        <Badge className="bg-indigo-50 text-indigo-600 border-none uppercase text-[9px]">
                          {entry.subject}
                        </Badge>
                      </td>
                      <td className="p-6 text-xs font-bold text-slate-400">{entry.teacherName}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-slate-400 text-sm">
                      No timetable entries found for your grade.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── RESOURCES ── */}
        {activeTab === "links" && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="relative w-full max-w-md">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input
                  placeholder="Search resources..."
                  className="pl-12 h-14 rounded-2xl border-slate-100"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {filteredLinks.length} resource{filteredLinks.length !== 1 ? "s" : ""} found
              </p>
            </div>

            {filteredLinks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredLinks.map((link) => (
                  <div
                    key={link.id}
                    className="group bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        {link.type === "classroom" ? <Video size={20} /> : <ExternalLink size={20} />}
                      </div>
                      <Badge variant="outline" className="text-[9px] uppercase">
                        {link.subject || "General"}
                      </Badge>
                    </div>
                    <h3 className="font-black text-slate-800 mb-1">{link.title || link.name}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-6">
                      {link.teacherName || "Unknown Teacher"}
                    </p>
                    <Button
                      onClick={() => window.open(link.url, "_blank", "noopener,noreferrer")}
                      className="w-full bg-slate-50 hover:bg-indigo-600 text-slate-600 hover:text-white font-black rounded-xl h-12"
                    >
                      Open Resource <ArrowRight size={14} className="ml-2" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-slate-400">
                <Video className="mx-auto mb-4 opacity-30" size={40} />
                <p className="text-sm font-bold">No resources available yet.</p>
              </div>
            )}
          </div>
        )}

        {/* ── AUDIO PDF ── */}
        {activeTab === "audio-pdf" && <AudioPDFReader />}
      </main>
    </div>
  );
};

export default StudentDashboard;