"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc
} from "firebase/firestore";
import { db } from "./firebaseConfig";

/* ================================
   Types
================================ */

interface TimetableItem {
  id: string;
  subject: string;
  teacherName: string;
  teacherUid: string;
  grade: string;
  day: string;
  time: string; // "11:20"
}

interface StudentProfile {
  subjects?: string[];
}

interface Props {
  userUid: string;
  role: "student" | "teacher";
  grade?: string;
}

/* ================================
   Component
================================ */

export default function NextClassCountdownCard({
  userUid,
  role,
  grade
}: Props) {

  const [todayClasses, setTodayClasses] = useState<TimetableItem[]>([]);
  const [nextClass, setNextClass] = useState<TimetableItem | null>(null);

  const [timeLeft, setTimeLeft] = useState("00:00:00");
  const [progress, setProgress] = useState(0);
  const [isCurrent, setIsCurrent] = useState(false);

  const [studentSubjects, setStudentSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  /* ================================
     Helpers
  ================================= */

  const getDayName = () =>
    new Date().toLocaleDateString("en-US", {
      weekday: "long"
    });

  const getClassDateTime = (time: string) => {
    const now = new Date();
    const [hours, minutes] = time.split(":").map(Number);

    const date = new Date(now);
    date.setHours(hours);
    date.setMinutes(minutes);
    date.setSeconds(0);
    date.setMilliseconds(0);

    return date;
  };

  const formatTime = (ms: number) => {
    if (ms <= 0) return "00:00:00";

    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    return `${h.toString().padStart(2,"0")}:${m
      .toString()
      .padStart(2,"0")}:${s
      .toString()
      .padStart(2,"0")}`;
  };

  /* ================================
     Detect Dynamic Lesson End
     End = next lesson start
     If no next lesson → default 60 min
  ================================= */

/* ================================
   Detect Dynamic Lesson End
   Default = 40 minutes
   If next lesson is sooner → end at next lesson
================================ */

const DEFAULT_LESSON_MINUTES = 40;

const computeLessonEnd = (
  lessons: TimetableItem[],
  index: number
) => {

  const start = getClassDateTime(lessons[index].time);

  // Default end = 40 minutes after start
  const defaultEnd = new Date(
    start.getTime() + DEFAULT_LESSON_MINUTES * 60000
  );

  // If there is a next lesson
  if (index < lessons.length - 1) {

    const nextStart = getClassDateTime(
      lessons[index + 1].time
    );

    // If next lesson starts BEFORE 40 minutes,
    // lesson ends at next lesson start
    if (nextStart.getTime() < defaultEnd.getTime()) {
      return nextStart;
    }

  }

  // Otherwise default 40 min
  return defaultEnd;
};

  /* ================================
     Fetch Student Subjects
  ================================= */

  useEffect(() => {

    const fetchStudentSubjects = async () => {
      if (role !== "student") return;

      const snap = await getDoc(doc(db, "students", userUid));
      if (snap.exists()) {
        const data = snap.data() as StudentProfile;
        setStudentSubjects(
          data.subjects?.map(s => s.trim().toLowerCase()) || []
        );
      }
    };

    fetchStudentSubjects();

  }, [userUid, role]);

  /* ================================
     Fetch Today's Timetable
  ================================= */

  useEffect(() => {

    const fetchData = async () => {

      try {

        let q;

        if (role === "teacher") {

          q = query(
            collection(db, "timetable"),
            where("teacherUid", "==", userUid),
            where("day", "==", getDayName())
          );

        } else {

          if (!grade) return;

          q = query(
            collection(db, "timetable"),
            where("grade", "==", grade),
            where("day", "==", getDayName())
          );

        }

        const snap = await getDocs(q);

        let classes =
          snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as TimetableItem[];

        // 🔥 FILTER: Only enrolled subjects for students
        if (role === "student") {
          classes = classes.filter(cls =>
            studentSubjects.includes(
              cls.subject.trim().toLowerCase()
            )
          );
        }

        // Sort ascending
        classes.sort(
          (a, b) =>
            getClassDateTime(a.time).getTime() -
            getClassDateTime(b.time).getTime()
        );

        setTodayClasses(classes);

      } catch (error) {
        console.error("Error fetching timetable:", error);
      }

      setLoading(false);

    };

    fetchData();

  }, [userUid, role, grade, studentSubjects]);

  /* ================================
     Countdown Engine
  ================================= */

  useEffect(() => {

    if (!todayClasses.length) return;

    const interval = setInterval(() => {

      const now = new Date();

      for (let i = 0; i < todayClasses.length; i++) {

        const start = getClassDateTime(todayClasses[i].time);
        const end = computeLessonEnd(todayClasses, i);

        // CURRENT
        if (now >= start && now < end) {

          const remaining = end.getTime() - now.getTime();
          const duration = end.getTime() - start.getTime();
          const elapsed = now.getTime() - start.getTime();

          setIsCurrent(true);
          setNextClass(todayClasses[i]);
          setTimeLeft(formatTime(remaining));
          setProgress((elapsed / duration) * 100);

          return;
        }

        // NEXT
        if (start > now) {

          const remaining = start.getTime() - now.getTime();

          setIsCurrent(false);
          setNextClass(todayClasses[i]);
          setTimeLeft(formatTime(remaining));
          setProgress(0);

          return;
        }

      }

      // No more lessons
      setIsCurrent(false);
      setNextClass(null);
      setTimeLeft("00:00:00");
      setProgress(100);

    }, 1000);

    return () => clearInterval(interval);

  }, [todayClasses]);

  /* ================================
     UI STATES
  ================================= */

  if (loading) {
    return (
      <div className="p-6 rounded-3xl shadow bg-white">
        Loading timetable...
      </div>
    );
  }

  if (!nextClass) {
    return (
      <div className="p-6 rounded-3xl shadow bg-gradient-to-br from-gray-100 to-gray-200">
        🎉 No more classes today
      </div>
    );
  }

  /* ================================
     UI
  ================================= */

  return (
    <div className="relative overflow-hidden rounded-3xl p-6 shadow-xl text-white bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700">

      <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 blur-3xl rounded-full"></div>

      <div className="relative z-10">

        <div className="flex items-center gap-2">
          {isCurrent && (
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
          )}
          <p className="text-sm opacity-90">
            {isCurrent ? "Current Class" : "Next Class"}
          </p>
        </div>

        <h2 className="text-2xl font-bold mt-1">
          {nextClass.subject}
        </h2>

        <p className="opacity-80 text-sm">
          {nextClass.teacherName}
        </p>

        <div className="mt-4">
          <p className="text-sm opacity-80">
            {isCurrent ? "Ends in" : "Starts in"}
          </p>
          <p className="text-4xl font-mono font-bold">
            {timeLeft}
          </p>
        </div>

        {isCurrent && (
          <div className="mt-4">
            <div className="w-full bg-white/20 rounded-full h-2">
              <div
                className="bg-green-400 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs mt-1 opacity-80">
              {Math.floor(progress)}% complete
            </p>
          </div>
        )}

        <p className="mt-3 text-xs opacity-70">
          {nextClass.day} • {nextClass.time}
        </p>

      </div>
    </div>
  );
}