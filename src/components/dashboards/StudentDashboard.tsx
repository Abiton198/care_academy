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
  addDoc,
  serverTimestamp,
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

/* Context & Custom */
import { useAuth } from "../auth/AuthProvider";
import NextClassCountdownCard from "@/lib/NextClassCountdownCard";
import MoodleCard from "./MoodleCard";
import AudioPDFReader from "@/lib/AudioPDFReader";
import FlashCardComponent from "@/components/FlashCard";
import { flashCards } from "@/lib/flashcards";

import logo from "@/img/care.png";

// =============================================================================
// TYPES
// =============================================================================

interface StudentProfile {
  id: string;
  firstName: string;
  lastName?: string;
  grade: string;
  parentId?: string;
  parentName?: string;
  email?: string;
  dashboardLocked?: boolean;
  lockReason?: string;
  subjects?: Array<{ name: string } | string>;
  sessionUid?: string;
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

const parseLessonDate = (timeStr: string, baseDate: Date): Date => {
  const [clock, meridian] = timeStr.split(" ");
  let [hours, minutes] = clock.split(":").map(Number);

  if (meridian === "PM" && hours !== 12) hours += 12;
  if (meridian === "AM" && hours === 12) hours = 0;

  const lessonDate = new Date(baseDate);
  lessonDate.setHours(hours, minutes, 0, 0);
  return lessonDate;
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
  // ✅ FIX 1: Destructure `user` from useAuth so logLinkAccess doesn't crash
  const { logoutStudent, user } = useAuth();
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [classLinks, setClassLinks] = useState<ClassLink[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "timetable" | "links" | "audio-pdf">("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [now, setNow] = useState(new Date());

  // ✅ FIX 2: authLoading starts true and is properly guarded
  const [authLoading, setAuthLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  // ✅ FIX 3: Session check supports BOTH student sessions AND parent portal views
  useEffect(() => {
    const stored = sessionStorage.getItem("studentSession");

    // Case A: Student logged in via student login page
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (!parsed.studentId) throw new Error("Invalid session");
        setSession(parsed);
      } catch (e) {
        console.error("Session parse failed");
        sessionStorage.removeItem("studentSession");
        navigate("/");
        return;
      } finally {
        setAuthLoading(false);
      }
      return;
    }

    // Case B: Parent opening child portal via Firebase Auth (window.open from parent dashboard)
    // user comes from Firebase Auth — if present, it's a parent viewing their child
    if (user?.uid) {
      // Construct a mock session so the rest of the dashboard works
      setSession({ studentId, isParentView: true, parentUid: user.uid });
      setAuthLoading(false);
      return;
    }

    // Case C: Neither — redirect to home
    // Wait briefly to allow Firebase Auth to rehydrate before giving up
    const timeout = setTimeout(() => {
      if (!sessionStorage.getItem("studentSession")) {
        console.warn("No session and no auth user → redirecting to home");
        navigate("/");
      }
      setAuthLoading(false);
    }, 1500);

    return () => clearTimeout(timeout);
  }, [navigate, user, studentId]);

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Load student profile
  useEffect(() => {
    if (!studentId || !session) return;

    const loadProfile = async () => {
      try {
        const docRef = doc(db, "students", studentId.trim());
        const snap = await getDoc(docRef);

        if (!snap.exists()) {
          setProfileError(`Student record not found.`);
          setProfileLoaded(true);
          return;
        }

        const data = snap.data() as StudentProfile;

        // ✅ FIX 4: Skip sessionUid check for parent portal views
        if (!session.isParentView) {
          if (data.sessionUid !== session.studentId) {
            console.warn("Session mismatch — logging out student.");
            sessionStorage.removeItem("studentSession");
            navigate("/");
            return;
          }
        } else {
          // For parent view: verify the student belongs to this parent
          if (user?.uid && data.parentId && data.parentId !== user.uid) {
            console.warn("Parent does not own this student record.");
            navigate("/parent-dashboard");
            return;
          }
        }

        setProfile({ id: snap.id, ...data });
        setProfileError(null);
      } catch (err) {
        console.error("Firestore Error:", err);
        setProfileError("Database connection failed. Check your internet.");
      } finally {
        setProfileLoaded(true);
      }
    };

    loadProfile();
  }, [studentId, session, navigate, user]);

  // Fetch timetable
  useEffect(() => {
    if (!profile?.grade) return;

    const q = query(collection(db, "timetable"), where("grade", "==", profile.grade));

    const unsub = onSnapshot(
      q,
      (snap) => setTimetable(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as TimetableEntry[]),
      (err) => console.error("Timetable error:", err)
    );

    return () => unsub();
  }, [profile?.grade]);

  // Fetch class links
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
            studentSubjects.includes(linkSubject);

          return gradeMatch && subjectMatch;
        });

        setClassLinks(links);
      },
      (err) => console.error("Class links error:", err)
    );

    return () => unsub();
  }, [profile]);

  // ✅ FIX 5: Filter timetable by student's enrolled subjects
  const studentSubjectNames = useMemo(() => {
    if (!profile?.subjects) return null; // null = no filter (show all)
    return (profile.subjects || []).map((s) =>
      (typeof s === "string" ? s : s?.name || "").trim().toLowerCase()
    );
  }, [profile?.subjects]);

  // Computed values
  const today = now.toLocaleDateString("en-US", { weekday: "long" });

  const todayClasses = useMemo(() => {
    return timetable.filter((t) => {
      const dayMatch = t.day === today;
      if (!studentSubjectNames) return dayMatch;
      const subjectMatch = studentSubjectNames.some((sub) =>
        t.subject.toLowerCase().includes(sub.replace(" (igcse)", ""))
      );
      return dayMatch && subjectMatch;
    });
  }, [timetable, today, studentSubjectNames]);

  const filteredTimetable = useMemo(() => {
    if (!studentSubjectNames) return timetable;
    return timetable.filter((t) =>
      studentSubjectNames.some((sub) =>
        t.subject.toLowerCase().includes(sub.replace(" (igcse)", ""))
      )
    );
  }, [timetable, studentSubjectNames]);

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

  // ✅ FIX 1 APPLIED: user is now properly available here
  const logLinkAccess = async (link: ClassLink) => {
    if (!profile) return;
    try {
      const actorId = session?.isParentView ? user?.uid : session?.studentId;
      await addDoc(collection(db, "class_links", link.id, "auditTrail"), {
        studentId: actorId || "unknown",
        studentName: profile.firstName,
        grade: profile.grade,
        subject: link.subject || "general",
        action: "opened_link",
        isParentView: session?.isParentView ?? false,
        clickedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("Audit log failed:", e);
    }
  };

  const handleLogout = () => {
    if (session?.isParentView) {
      // Parent viewing child portal — go back to parent dashboard
      navigate("/parent-dashboard");
    } else {
      logoutStudent?.();
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

  // ✅ FIX 3 APPLIED: Sort timetable by day and time
  const sortedTimetable = useMemo(() => {
    const dayOrder: Record<string, number> = {
      'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6, 'Sunday': 7
    };

    return [...filteredTimetable].sort((a, b) => {
      // 1. Sort by Day
      const dayA = dayOrder[a.day] || 99;
      const dayB = dayOrder[b.day] || 99;
      if (dayA !== dayB) return dayA - dayB;

      // 2. Sort by Time (if days are the same)
      const timeA = parseLessonDate(a.time, new Date()).getTime();
      const timeB = parseLessonDate(b.time, new Date()).getTime();
      return timeA - timeB;
    });
  }, [filteredTimetable]);


  // ✅ FIX 2 APPLIED: Show loader while auth is resolving
  if (authLoading || (!profileLoaded && !profileError)) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="font-black text-slate-400 uppercase tracking-widest text-xs">
          Synchronizing Portal...
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
          <p className="text-sm text-slate-500 mb-6">{profileError || "Unable to load your profile."}</p>
          <Button onClick={handleLogout} variant="outline">
            Return to Login
          </Button>
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

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900">
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logo} alt="Logo" className="w-12 h-12 object-contain" />
            <div>
              <h1 className="text-lg font-black leading-tight">
                {profile.firstName} {profile.lastName}
              </h1>
              <div className="flex items-center gap-2">
                <Badge className="w-fit bg-indigo-50 text-indigo-600 text-[10px] border-none">
                  Grade {profile.grade}
                </Badge>
                {/* ✅ Show parent view indicator */}
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

        <nav className="max-w-7xl mx-auto px-6 flex gap-8 border-t">
          {[
            { id: "overview", icon: LayoutDashboard, label: "Overview" },
            { id: "timetable", icon: Clock, label: "Schedule" },
            { id: "links", icon: Video, label: "Resources" },
            { id: "audio-pdf", icon: BookOpen, label: "Audio PDF" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 text-xs font-black uppercase transition-all border-b-2 flex items-center gap-2 ${activeTab === tab.id
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

      <main className="max-w-7xl mx-auto p-6 md:p-10 space-y-10">
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
              <StatCard
                icon={CalendarIcon}
                title="Today's Lessons"
                value={todayClasses.length}
                color="indigo"
              />
              <StatCard
                icon={BookOpen}
                title="Weekly Lessons"
                value={filteredTimetable.length}
                color="amber"
              />
              <StatCard
                icon={Video}
                title="Resources"
                value={classLinks.length}
                color="emerald"
              />
            </div>

            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">
                Today's Schedule ({today})
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
                          <div className="w-14 h-14 bg-white rounded-2xl flex flex-col items-center justify-center shadow-sm border border-slate-100">
                            <span className="text-[10px] font-black text-indigo-600 leading-none">
                              {item.time.split(" ")[1]}
                            </span>
                            <span className="text-[14px] font-black text-slate-800">
                              {item.time.split(" ")[0]}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-black text-slate-800 text-sm uppercase">
                              {item.subject}
                            </h4>
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
                  <div className="text-center py-12 text-slate-400">
                    No lessons scheduled for today.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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
                {/* ✅ Now using the sorted list */}
                {sortedTimetable.map((entry) => (
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
                ))}
                {sortedTimetable.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-10 text-center text-slate-400 text-sm">
                      No timetable entries found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

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
                {filteredLinks.length} resources found
              </p>
            </div>

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
                    onClick={() => {
                      logLinkAccess(link);
                      window.open(link.url, "_blank", "noopener,noreferrer");
                    }}
                    className="w-full bg-slate-50 hover:bg-indigo-600 text-slate-600 hover:text-white font-black rounded-xl h-12"
                  >
                    Open Resource <ArrowRight size={14} className="ml-2" />
                  </Button>
                </div>
              ))}

              {filteredLinks.length === 0 && (
                <div className="col-span-3 text-center py-16 text-slate-400">
                  No resources found.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "audio-pdf" && <AudioPDFReader />}
      </main>
    </div>
  );
};

export default StudentDashboard;