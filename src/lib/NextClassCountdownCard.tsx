import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  getDocs
} from "firebase/firestore";
import { db } from "./firebaseConfig";

interface TimetableItem {
  id: string;
  subject: string;
  teacherName: string;
  teacherUid: string;
  grade: string;
  day: string;
  time: string;
}

interface Props {
  userUid: string;
  role: "student" | "teacher";
  grade?: string;
}

const LESSON_DURATION = 60; // minutes

export default function NextClassCountdownCard({
  userUid,
  role,
  grade
}: Props) {

  const [nextClass, setNextClass] = useState<TimetableItem | null>(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [progress, setProgress] = useState(0);
  const [isCurrent, setIsCurrent] = useState(false);
  const [loading, setLoading] = useState(true);

  // Get today's day name
  const getDayName = () =>
    new Date().toLocaleDateString("en-US", { weekday: "long" });

  // Parse Firestore time safely
  const getClassDateTime = (time: string) => {

    const [timePart, modifier] =
      time.includes(" ") ? time.split(" ") : [time, null];

    let [hours, minutes] = timePart.split(":").map(Number);

    if (modifier === "PM" && hours !== 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;

    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);
    date.setSeconds(0);
    date.setMilliseconds(0);

    return date;
  };

  // Format countdown
  const formatTime = (ms: number) => {

    if (ms <= 0) return "00:00:00";

    const total = Math.floor(ms / 1000);

    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;

    return `${h.toString().padStart(2,"0")}:${m
      .toString()
      .padStart(2,"0")}:${s
      .toString()
      .padStart(2,"0")}`;
  };

  // Fetch timetable
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

        const classes: TimetableItem[] = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as TimetableItem[];

        const now = new Date();

        // Sort classes
        const sorted = classes.sort(
          (a, b) =>
            getClassDateTime(a.time).getTime() -
            getClassDateTime(b.time).getTime()
        );

        let closest: TimetableItem | null = null;

        for (const cls of sorted) {

          const start = getClassDateTime(cls.time);
          const end = new Date(
            start.getTime() + LESSON_DURATION * 60000
          );

          if (now <= end) {
            closest = cls;
            break;
          }

        }

        setNextClass(closest);

      } catch (e) {
        console.error(e);
      }

      setLoading(false);

    };

    fetchData();

  }, [userUid, role, grade]);

  // Countdown engine
  useEffect(() => {

    const interval = setInterval(() => {

      if (!nextClass) return;

      const now = new Date();

      const start = getClassDateTime(nextClass.time);
      const end = new Date(
        start.getTime() + LESSON_DURATION * 60000
      );

      if (now >= start && now <= end) {

        setIsCurrent(true);

        const remaining = end.getTime() - now.getTime();

        setTimeLeft(formatTime(remaining));

        const elapsed =
          now.getTime() - start.getTime();

        setProgress(
          (elapsed /
            (LESSON_DURATION * 60000)) * 100
        );

      } else {

        setIsCurrent(false);

        const untilStart =
          start.getTime() - now.getTime();

        setTimeLeft(formatTime(untilStart));

        setProgress(0);

      }

    }, 1000);

    return () => clearInterval(interval);

  }, [nextClass]);

  if (loading)
    return (
      <div className="p-5 rounded-3xl shadow bg-white">
        Loading next class...
      </div>
    );

  if (!nextClass)
    return (
      <div className="p-6 rounded-3xl shadow bg-gradient-to-br from-gray-100 to-gray-200">
        🎉 No more classes today
      </div>
    );

  return (

    <div className="relative overflow-hidden rounded-3xl p-6 shadow-xl text-white bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700">

      {/* Glow */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 blur-3xl rounded-full"></div>

      {/* Header */}
      <div className="relative z-10">

        <div className="flex items-center gap-2">

          {isCurrent && (
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
          )}

          <p className="text-sm opacity-90">

            {isCurrent
              ? "Current Class"
              : "Next Class"}

          </p>

        </div>

        <h2 className="text-2xl font-bold mt-1">

          {nextClass.subject}

        </h2>

        <p className="opacity-80 text-sm">

          {nextClass.teacherName}

        </p>

        {/* Timer */}
        <div className="mt-4">

          <p className="text-sm opacity-80">

            {isCurrent
              ? "Ends in"
              : "Starts in"}

          </p>

          <p className="text-4xl font-mono font-bold">

            {timeLeft}

          </p>

        </div>

        {/* Progress */}
        {isCurrent && (

          <div className="mt-4">

            <div className="w-full bg-white/20 rounded-full h-2">

              <div
                className="bg-green-400 h-2 rounded-full transition-all duration-1000"
                style={{
                  width: `${progress}%`
                }}
              />

            </div>

            <p className="text-xs mt-1 opacity-80">

              {Math.floor(progress)}% complete

            </p>

          </div>

        )}

        {/* Footer */}
        <p className="mt-3 text-xs opacity-70">

          {nextClass.day} • {nextClass.time}

        </p>

      </div>

    </div>

  );

}
