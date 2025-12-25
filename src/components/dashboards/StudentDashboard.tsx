"use client";

/* ======================================================
   IMPORTS
====================================================== */
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
} from "firebase/firestore";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/* Icons */
import {
  Calendar,
  Clock,
  BookOpen,
  Video,
  Link as LinkIcon,
  Home,
  LogOut,
  Users,
  Sparkles,
} from "lucide-react";

/* ======================================================
   TYPES
====================================================== */
interface Student {
  id: string;
  firstName: string;
  grade: string;
  subjects: string[];
}

interface TimetableEntry {
  id: string;
  day: string;
  time: string;
  grade: string;
  subject: string;
  teacherName: string;
  curriculum: "CAPS" | "Cambridge";
  zoomLink?: string | null;
  classroomLink?: string | null;
}

/* ======================================================
   MAIN COMPONENT
====================================================== */
const StudentDashboard: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();

  const [student, setStudent] = useState<Student | null>(null);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "timetable" | "links">("overview");

  /* ======================================================
     FETCH STUDENT PROFILE
  ===================================================== */
  useEffect(() => {
    if (!studentId) return;

    const unsub = onSnapshot(doc(db, "students", studentId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setStudent({
          id: snap.id,
          firstName: data.firstName || "Student",
          grade: data.grade || "",
          subjects: Array.isArray(data.subjects) ? data.subjects : [],
        });
      }
    });

    return () => unsub();
  }, [studentId]);

  /* ======================================================
     FETCH TIMETABLE – REAL-TIME + FLEXIBLE MATCHING
  ===================================================== */
  useEffect(() => {
    if (!student?.grade || student.subjects.length === 0) {
      setTimetable([]);
      return;
    }

    const q = query(
      collection(db, "timetable"),
      where("grade", "==", student.grade),
      orderBy("day"),
      orderBy("time")
    );

    const unsub = onSnapshot(q, (snap) => {
      const allSlots = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as TimetableEntry),
      }));

      // Flexible matching: "Mathematics" matches "Mathematics (IGCSE)"
      const filtered = allSlots.filter((slot) =>
        student.subjects.some((sub) =>
          slot.subject.toLowerCase().includes(sub.toLowerCase().replace(" (igcse)", ""))
        )
      );

      setTimetable(filtered);
    });

    return () => unsub();
  }, [student]);

  /* ======================================================
     GROUP TIMETABLE BY DAY
  ===================================================== */
  const groupedTimetable = useMemo(() => {
    const groups: Record<string, TimetableEntry[]> = {};
    timetable.forEach((slot) => {
      if (!groups[slot.day]) groups[slot.day] = [];
      groups[slot.day].push(slot);
    });
    return Object.entries(groups);
  }, [timetable]);

  /* ======================================================
     DYNAMIC STATS
  ===================================================== */
  const weeklyLessonsCount = timetable.length;

  const today = new Date().toLocaleString("en-us", { weekday: "long" });
  const todayLessons = timetable.filter((slot) => slot.day === today);
  const nextClassToday = todayLessons.sort((a, b) => a.time.localeCompare(b.time))[0];

  /* ======================================================
     RENDER
  ===================================================== */
  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
        <div className="text-center">
          <Sparkles className="w-16 h-16 text-indigo-600 mx-auto mb-4 animate-pulse" />
          <p className="text-xl text-gray-700">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Users className="w-10 h-10 text-indigo-600" />
            <div>
              <h1 className="text-3xl font-bold text-indigo-900">
                {student.firstName}'s Dashboard
              </h1>
              <p className="text-sm text-gray-600">
                Grade {student.grade} • {student.subjects.length} subjects
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" size="lg" onClick={() => navigate("/parent-dashboard")}>
              <Home className="w-5 h-5 mr-2" /> Parent Portal
            </Button>
            <Button variant="destructive" size="lg" onClick={() => navigate("/login")}>
              <LogOut className="w-5 h-5 mr-2" /> Logout
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <nav className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white shadow-md">
          <div className="max-w-7xl mx-auto flex">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex-1 py-5 text-lg font-semibold transition-all flex items-center justify-center gap-3 ${
                activeTab === "overview" ? "bg-white/20 shadow-inner" : "hover:bg-white/10"
              }`}
            >
              <BookOpen className="w-6 h-6" /> OVERVIEW
            </button>
            <button
              onClick={() => setActiveTab("timetable")}
              className={`flex-1 py-5 text-lg font-semibold transition-all flex items-center justify-center gap-3 ${
                activeTab === "timetable" ? "bg-white/20 shadow-inner" : "hover:bg-white/10"
              }`}
            >
              <Calendar className="w-6 h-6" /> TIMETABLE
            </button>
            <button
              onClick={() => setActiveTab("links")}
              className={`flex-1 py-5 text-lg font-semibold transition-all flex items-center justify-center gap-3 ${
                activeTab === "links" ? "bg-white/20 shadow-inner" : "hover:bg-white/10"
              }`}
            >
              <LinkIcon className="w-6 h-6" /> CLASS LINKS
            </button>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-8 space-y-10">

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            <Card className="shadow-2xl border-0 bg-gradient-to-br from-indigo-100 to-purple-100">
              <CardHeader>
                <CardTitle className="text-3xl flex items-center gap-4 text-indigo-900">
                  <Sparkles className="w-10 h-10 text-yellow-500" /> Welcome Back, {student.firstName}!
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg text-gray-700">
                  You have <strong>{weeklyLessonsCount} classes</strong> scheduled this week.
                </p>
              </CardContent>
            </Card>

            {/* Subject Cards */}
            <div className="grid md:grid-cols-3 gap-8">
              {student.subjects.map((subject) => {
                const count = timetable.filter((slot) =>
                  slot.subject.toLowerCase().includes(subject.toLowerCase().replace(" (igcse)", ""))
                ).length;

                return (
                  <Card
                    key={subject}
                    className="shadow-xl hover:shadow-2xl transition bg-gradient-to-br from-teal-50 to-cyan-100"
                  >
                    <CardContent className="p-8 text-center">
                      <h3 className="text-2xl font-bold text-teal-900 mb-3">{subject}</h3>
                      <p className="text-5xl font-extrabold text-cyan-700">{count}</p>
                      <p className="text-lg text-teal-800 mt-2">classes this week</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* TIMETABLE TAB */}
        {activeTab === "timetable" && (
          <div className="space-y-8">
            {groupedTimetable.length > 0 ? (
              groupedTimetable.map(([day, slots]) => (
                <Card key={day} className="shadow-2xl overflow-hidden border-0">
                  <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                    <CardTitle className="text-2xl flex items-center gap-4">
                      <Calendar className="w-8 h-8" /> {day}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-6">
                      {slots.map((slot) => (
                        <div
                          key={slot.id}
                          className="p-6 bg-gradient-to-r from-white to-indigo-50 rounded-xl shadow-md hover:shadow-lg transition"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="text-xl font-bold text-indigo-900">{slot.subject}</h4>
                              <p className="text-lg text-purple-800 mt-1">
                                with <span className="font-semibold">{slot.teacherName}</span>
                              </p>
                              <div className="flex items-center gap-4 mt-3 text-sm text-gray-700">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" /> {slot.time}
                                </span>
                                <Badge variant={slot.curriculum === "CAPS" ? "default" : "secondary"}>
                                  {slot.curriculum}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="p-20 text-center shadow-2xl">
                <Calendar className="w-24 h-24 text-gray-300 mx-auto mb-6" />
                <h3 className="text-3xl font-bold text-gray-700 mb-4">No Classes Scheduled</h3>
                <p className="text-xl text-gray-600">
                  Your weekly timetable will appear here once classes are assigned.
                </p>
              </Card>
            )}
          </div>
        )}

        {/* CLASS LINKS TAB */}
        {activeTab === "links" && (
          <div className="space-y-8">
            <Card className="shadow-2xl border-0">
              <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                <CardTitle className="text-4xl font-bold flex items-center gap-5">
                  <LinkIcon className="w-12 h-12" /> Your Class Links
                </CardTitle>
                <p className="text-xl mt-3 text-teal-100">
                  Quick access to live classes and learning materials
                </p>
              </CardHeader>
              <CardContent className="p-10">
                {timetable.length > 0 ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {timetable.map((slot) => (
                      <Card
                        key={slot.id}
                        className="shadow-xl hover:shadow-2xl transition-all duration-300 border-0 overflow-hidden"
                      >
                        <div className={`h-4 ${slot.curriculum === "CAPS" ? "bg-gradient-to-r from-green-500 to-emerald-600" : "bg-gradient-to-r from-purple-500 to-pink-600"}`} />
                        <CardHeader className="bg-gradient-to-b from-gray-50 to-white">
                          <CardTitle className="text-2xl text-indigo-900">{slot.subject}</CardTitle>
                          <p className="text-lg text-purple-700 mt-1">
                            {slot.day} • {slot.time}
                          </p>
                          <p className="text-sm text-gray-600 mt-2">Teacher: {slot.teacherName}</p>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                          {slot.zoomLink ? (
                            <Button
                              asChild
                              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-6 text-lg shadow-lg"
                            >
                              <a href={slot.zoomLink} target="_blank" rel="noopener noreferrer">
                                <Video className="w-7 h-7 mr-3" /> Join Live Zoom Class
                              </a>
                            </Button>
                          ) : (
                            <Button disabled className="w-full bg-gray-300 text-gray-600 py-6 text-lg">
                              <Video className="w-7 h-7 mr-3" /> Zoom Link Not Set
                            </Button>
                          )}

                          {slot.classroomLink ? (
                            <Button
                              asChild
                              variant="outline"
                              className="w-full border-2 border-purple-500 hover:bg-purple-50 py-6 text-lg font-bold"
                            >
                              <a href={slot.classroomLink} target="_blank" rel="noopener noreferrer">
                                <LinkIcon className="w-7 h-7 mr-3 text-purple-600" /> Open Classroom / Materials
                              </a>
                            </Button>
                          ) : (
                            <Button disabled variant="outline" className="w-full py-6 text-lg text-gray-500 border-gray-300">
                              <LinkIcon className="w-7 h-7 mr-3" /> Classroom Link Not Set
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20">
                    <LinkIcon className="w-28 h-28 text-gray-300 mx-auto mb-8" />
                    <h3 className="text-3xl font-bold text-gray-700 mb-4">No Links Available Yet</h3>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                      Your teachers will set Zoom and classroom links once classes are scheduled.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentDashboard;