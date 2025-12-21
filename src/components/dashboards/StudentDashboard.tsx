"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "@/lib/firebaseConfig";
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  Calendar,
  Clock,
  BookOpen,
  User,
  ExternalLink,
  Video,
  FileText,
  Moon,
  Sun,
  Home,
  LogOut,
  Target,
  CheckCircle,
  XCircle,
  Trophy,
} from "lucide-react";

/* ============================================================
   Types
   ============================================================ */
interface Student {
  id: string;
  firstName: string;
  lastName: string;
  grade: string;
  subjects: string[];
  parentId: string;
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

interface TeacherLink {
  zoomLink?: string;
  googleClassroomLink?: string;
}

interface Attendance {
  date: string;
  subject: string;
  status: "present" | "absent";
}

/* ============================================================
   Student Dashboard
   ============================================================ */
const StudentDashboard: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();

  const [student, setStudent] = useState<Student | null>(null);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [teacherLinks, setTeacherLinks] = useState<Record<string, TeacherLink>>({});
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "timetable" | "classlinks">("overview");
  const [isDark, setIsDark] = useState(false);

  /* ============================================================
     Fetch Student Profile
     ============================================================ */
  useEffect(() => {
    if (!studentId) {
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(doc(db, "students", studentId), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Student;
        setStudent({ ...data, id: snap.id });
      } else {
        setStudent(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [studentId]);

  /* ============================================================
     Fetch Timetable + Teacher Links
     ============================================================ */
  useEffect(() => {
    if (!student?.grade || !student?.subjects?.length) return;

    const q = query(
      collection(db, "timetable"),
      where("grade", "==", student.grade),
      orderBy("day"),
      orderBy("time")
    );

    const unsub = onSnapshot(q, async (snap) => {
      const entries = snap.docs.map((d) => ({ id: d.id, ...d.data() } as TimetableEntry));
      setTimetable(entries);

      const links: Record<string, TeacherLink> = {};
      for (const subject of student.subjects) {
        const tq = query(
          collection(db, "teachers"),
          where("subject", "==", subject),
          where("status", "==", "approved"),
          where("classActivated", "==", true)
        );
        const tsnap = await getDocs(tq);
        if (!tsnap.empty) {
          const tdata = tsnap.docs[0].data();
          links[subject] = {
            zoomLink: tdata.zoomLink,
            googleClassroomLink: tdata.googleClassroomLink,
          };
        }
      }
      setTeacherLinks(links);
    });

    return () => unsub();
  }, [student?.grade, student?.subjects]);

  /* ============================================================
     Fetch Attendance
     ============================================================ */
  useEffect(() => {
    if (!studentId) return;

    const q = query(
      collection(db, "attendance"),
      where("studentId", "==", studentId),
      orderBy("date", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const records = snap.docs.map((d) => d.data() as Attendance);
      setAttendance(records);
    });

    return () => unsub();
  }, [studentId]);

  /* ============================================================
     Live & Next Class
     ============================================================ */
  const now = useMemo(() => new Date(), [timetable]);
  const today = useMemo(() => now.toLocaleDateString("en-US", { weekday: "long" }), [now]);
  const currentTime = useMemo(() => now.toTimeString().slice(0, 5), [now]);

  const liveClass = useMemo(() => {
    return timetable.find((c) => {
      if (c.day !== today) return false;
      const [h, m] = c.time.split(":");
      const start = new Date();
      start.setHours(parseInt(h), parseInt(m), 0, 0);
      const end = new Date(start.getTime() + c.duration * 60000);
      return now >= start && now <= end;
    }) || null;
  }, [timetable, today, now]);

  const nextClass = useMemo(() => {
    if (liveClass) return null;
    return timetable
      .filter((c) => c.day === today && c.time > currentTime)
      .sort((a, b) => a.time.localeCompare(b.time))[0] || null;
  }, [timetable, today, currentTime, liveClass]);

  /* ============================================================
     Group Timetable
     ============================================================ */
  const groupedTimetable = useMemo(() => {
    const groups: Record<string, TimetableEntry[]> = {};
    timetable.forEach((entry) => {
      if (!groups[entry.day]) groups[entry.day] = [];
      groups[entry.day].push(entry);
    });
    return Object.entries(groups).sort(([a], [b]) => {
      const order = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      return order.indexOf(a) - order.indexOf(b);
    });
  }, [timetable]);

  /* ============================================================
     Attendance Stats
     ============================================================ */
  const attendanceStats = useMemo(() => {
    const totalScheduled = timetable.length;
    const attended = attendance.filter((a) => a.status === "present").length;
    const missed = attendance.filter((a) => a.status === "absent").length;
    const attendanceRate = totalScheduled > 0 ? (attended / totalScheduled) * 100 : 0;

    return { totalScheduled, attended, missed, attendanceRate };
  }, [timetable, attendance]);

  const subjectStats = useMemo(() => {
    return student?.subjects.map((subject) => {
      const classes = timetable.filter((t) => t.subject === subject).length;
      const attended = attendance.filter((a) => a.subject === subject && a.status === "present").length;
      const rate = classes > 0 ? (attended / classes) * 100 : 0;
      const teacher = timetable.find((t) => t.subject === subject)?.teacherName || "TBD";
      return { subject, teacher, classes, attended, rate };
    }) || [];
  }, [student, timetable, attendance]);

  /* ============================================================
     Navigation
     ============================================================ */
  const goToParentDashboard = () => {
    navigate("/parent-dashboard");
  };

  const goToLogin = () => {
    navigate("/login");
  };

  /* ============================================================
     Loading & Error
     ============================================================ */
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center p-8">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-700 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-6">
        <Card className="max-w-md text-center p-8 shadow-lg">
          <h3 className="text-red-600 font-bold text-xl mb-2">Student Not Found</h3>
          <p className="text-gray-600 mb-4">Please check the link or contact your parent.</p>
          <Button onClick={goToParentDashboard} className="bg-indigo-600 hover:bg-indigo-700">
            Back to Parent Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  /* ============================================================
     UI
     ============================================================ */
  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-900 text-white" : "bg-gradient-to-br from-blue-50 to-indigo-100"}`}>
      {/* Header */}
      <header className={`bg-white/90 backdrop-blur-sm shadow-sm sticky top-0 z-50 ${isDark ? "bg-gray-800" : ""}`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToParentDashboard}
              className={`hover:bg-gray-100 ${isDark ? "hover:bg-gray-700" : ""}`}
            >
              <Home size={18} />
            </Button>
            <h1 className={`text-xl font-bold ${isDark ? "text-white" : "text-indigo-800"}`}>
              {student.firstName}'s Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDark(!isDark)}
              className={`hover:bg-gray-100 ${isDark ? "hover:bg-gray-700" : ""}`}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </Button>
            <Button
              onClick={goToLogin}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <LogOut size={18} className="mr-1" /> Logout
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <nav className={`bg-gradient-to-r ${isDark ? "from-gray-800 to-gray-700" : "from-indigo-600 to-purple-600"} text-white`}>
          <div className="max-w-6xl mx-auto px-6 flex gap-1">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex-1 py-3 font-medium transition ${
                activeTab === "overview" ? "bg-white/20" : ""
              } hover:bg-white/10`}
            >
              <Target className="inline w-5 h-5 mr-2" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab("timetable")}
              className={`flex-1 py-3 font-medium transition ${
                activeTab === "timetable" ? "bg-white/20" : ""
              } hover:bg-white/10`}
            >
              <Calendar className="inline w-5 h-5 mr-2" />
              Timetable
            </button>
            <button
              onClick={() => setActiveTab("classlinks")}
              className={`flex-1 py-3 font-medium transition ${
                activeTab === "classlinks" ? "bg-white/20" : ""
              } hover:bg-white/10`}
            >
              <FileText className="inline w-5 h-5 mr-2" />
              Class Links
            </button>
          </div>
        </nav>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto p-6 space-y-6">

        {/* Live Class */}
        {liveClass && (
          <Card className="border-l-4 border-red-500 bg-red-50 shadow-lg animate-pulse">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-red-800 flex items-center gap-2">
                  <Video className="w-5 h-5 animate-pulse" />
                  LIVE NOW: {liveClass.subject}
                </h3>
                <p className="text-sm text-gray-700">{liveClass.teacherName}</p>
              </div>
              {teacherLinks[liveClass.subject]?.zoomLink ? (
                <a href={teacherLinks[liveClass.subject].zoomLink} target="_blank" rel="noopener">
                  <Button className="bg-red-600 hover:bg-red-700 text-white">
                    Join Live
                  </Button>
                </a>
              ) : (
                <Button disabled className="bg-gray-400">No Link</Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Attendance Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-green-400 to-emerald-600 text-white shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-90">Classes Attended</p>
                      <p className="text-3xl font-bold">{attendanceStats.attended}</p>
                    </div>
                    <CheckCircle className="w-10 h-10 opacity-80" />
                  </div>
                  <Progress value={attendanceStats.attendanceRate} className="mt-3 h-2 bg-white/30" />
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-400 to-pink-600 text-white shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-90">Classes Missed</p>
                      <p className="text-3xl font-bold">{attendanceStats.missed}</p>
                    </div>
                    <XCircle className="w-10 h-10 opacity-80" />
                  </div>
                  <Progress value={100 - attendanceStats.attendanceRate} className="mt-3 h-2 bg-white/30" />
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-400 to-indigo-600 text-white shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-90">Total Scheduled</p>
                      <p className="text-3xl font-bold">{attendanceStats.totalScheduled}</p>
                    </div>
                    <Trophy className="w-10 h-10 opacity-80" />
                  </div>
                  <div className="mt-3 text-sm">
                    <p className="font-medium">
                      Attendance: {attendanceStats.attendanceRate.toFixed(0)}%
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Subjects */}
            <h2 className="text-2xl font-bold text-indigo-800 flex items-center gap-2">
              <BookOpen className="w-7 h-7" />
              My Subjects
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {subjectStats.map((stat) => {
                const colors = [
                  "from-purple-400 to-pink-600",
                  "from-teal-400 to-cyan-600",
                  "from-orange-400 to-red-600",
                  "from-lime-400 to-green-600",
                  "from-indigo-400 to-blue-600",
                ];
                const color = colors[subjectStats.indexOf(stat) % colors.length];

                return (
                  <Card key={stat.subject} className={`bg-gradient-to-br ${color} text-white shadow-lg`}>
                    <CardContent className="p-5">
                      <h3 className="font-bold text-lg">{stat.subject}</h3>
                      <p className="text-sm opacity-90">({stat.teacher})</p>
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Attended</span>
                          <span>{stat.attended} / {stat.classes}</span>
                        </div>
                        <Progress value={stat.rate} className="h-2 bg-white/30" />
                        <p className="text-xs text-right">{stat.rate.toFixed(0)}% attendance</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Timetable & Class Links Tabs */}
        {/* ... (same as before, unchanged) ... */}
        {/* Timetable Tab */}
        {activeTab === "timetable" && (
          <div className="space-y-6">
            {groupedTimetable.length === 0 ? (
              <Card className="text-center p-12">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg font-medium">No classes scheduled</p>
              </Card>
            ) : (
              groupedTimetable.map(([day, slots]) => (
                <Card key={day} className="overflow-hidden shadow-lg">
                  <CardHeader className={`bg-gradient-to-r ${
                    day === today ? "from-red-500 to-pink-600" : "from-indigo-500 to-purple-600"
                  } text-white`}>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      {day}
                      {day === today && <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">Today</span>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {slots.map((slot) => {
                        const links = teacherLinks[slot.subject] || {};
                        const isLive = liveClass?.id === slot.id;
                        return (
                          <div
                            key={slot.id}
                            className={`p-5 flex items-center justify-between flex-wrap gap-4 ${
                              isLive ? "bg-red-50 border-l-4 border-red-500" : "hover:bg-gray-50"
                            }`}
                          >
                            <div className="flex-1">
                              <h4 className={`font-semibold flex items-center gap-2 ${
                                isLive ? "text-red-800" : "text-indigo-800"
                              }`}>
                                <BookOpen className="w-4 h-4" />
                                {slot.subject}
                                {isLive && <span className="ml-2 px-2 py-0.5 bg-red-600 text-white text-xs rounded-full animate-pulse">LIVE</span>}
                              </h4>
                              <p className="text-sm text-gray-700 flex items-center gap-2">
                                <User className="w-4 h-4" />
                                {slot.teacherName}
                              </p>
                              <p className="text-sm text-gray-700 flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                {slot.time} • {slot.duration} min
                              </p>
                            </div>
                            <div className="flex gap-2">
                              {links.zoomLink ? (
                                <a href={links.zoomLink} target="_blank" rel="noopener">
                                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                                    <Video size={16} /> Zoom
                                  </Button>
                                </a>
                              ) : (
                                <Button size="sm" disabled className="bg-gray-400 text-xs">
                                  Zoom N/A
                                </Button>
                              )}
                              {links.googleClassroomLink ? (
                                <a href={links.googleClassroomLink} target="_blank" rel="noopener">
                                  <Button size="sm" variant="outline">Classroom</Button>
                                </a>
                              ) : (
                                <Button size="sm" disabled variant="outline" className="text-xs">
                                  Classroom N/A
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Class Links Tab */}
        {activeTab === "classlinks" && (
          <div className="space-y-6">
            <h2 className={`text-xl font-bold flex items-center gap-2 ${isDark ? "text-white" : "text-indigo-800"}`}>
              <ExternalLink className="w-6 h-6" />
              My Class Links
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {student.subjects.map((subject) => {
                const links = teacherLinks[subject] || {};
                return (
                  <Card key={subject} className={`shadow-md hover:shadow-lg transition ${isDark ? "bg-gray-800" : ""}`}>
                    <CardContent className="p-5">
                      <h3 className={`font-bold mb-3 ${isDark ? "text-white" : "text-indigo-800"}`}>{subject}</h3>
                      <div className="flex flex-wrap gap-3 justify-center">
                        {links.zoomLink ? (
                          <a href={links.zoomLink} target="_blank" rel="noopener">
                            <Button className="bg-blue-600 hover:bg-blue-700">
                              <Video size={16} className="mr-1" /> Join Zoom
                            </Button>
                          </a>
                        ) : (
                          <Button disabled className="bg-gray-400">
                            Zoom Not Set
                          </Button>
                        )}
                        {links.googleClassroomLink ? (
                          <a href={links.googleClassroomLink} target="_blank" rel="noopener">
                            <Button variant="outline">Open Classroom</Button>
                          </a>
                        ) : (
                          <Button disabled variant="outline">
                            Classroom Not Set
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentDashboard;