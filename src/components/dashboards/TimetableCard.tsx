"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { db } from "@/lib/firebaseConfig";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  getDocs,
  DocumentData,
} from "firebase/firestore";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/* ============================================================
   Type Definitions
   ============================================================ */
interface TimetableEntry {
  id: string;
  grade: string;
  subject: string;
  date: string;       // "2025-10-20"
  time: string;       // "07:45 AM"
  duration: number;
  teacherName: string;
}

interface TeacherLink {
  teacherName: string;
  googleClassroomLink?: string;
  zoomLink?: string;
}

interface Props {
  grade?: string;
  subjects?: string[];
  showLinks?: boolean;
}

/* ============================================================
   TimetableCard Component
   ============================================================ */
const TimetableCard: React.FC<Props> = ({
  grade,
  subjects = [],
  showLinks = true,
}) => {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [teacherLinks, setTeacherLinks] = useState<Record<string, TeacherLink>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track previously fetched teachers to avoid duplicate queries
  const fetchedTeachers = useRef<Set<string>>(new Set());

  /* ============================================================
     Format Date
     ============================================================ */
  const formatDate = useCallback((isoDate: string): string => {
    try {
      return new Date(isoDate).toLocaleDateString("en-ZA", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
    } catch {
      return isoDate;
    }
  }, []);

  /* ============================================================
     Fetch Teacher Links (Optimized)
     ============================================================ */
  const fetchTeacherLinks = useCallback(
    async (teacherNames: string[]) => {
      const newLinks: Record<string, TeacherLink> = {};
      const teachersToFetch = teacherNames.filter(
        (name) => !fetchedTeachers.current.has(name)
      );

      if (teachersToFetch.length === 0) return;

      const teachersRef = collection(db, "teachers");

      for (const name of teachersToFetch) {
        const [first, last] = name.trim().split(" ");
        if (!first || !last) continue;

        try {
          const tq = query(
            teachersRef,
            where("firstName", "==", first),
            where("lastName", "==", last)
          );
          const res = await getDocs(tq);
          if (!res.empty) {
            const data = res.docs[0].data() as DocumentData;
            newLinks[name] = {
              teacherName: name,
              googleClassroomLink: data.googleClassroomLink,
              zoomLink: data.zoomLink,
            };
            fetchedTeachers.current.add(name);
          }
        } catch (err) {
          console.warn(`Failed to fetch teacher ${name}:`, err);
        }
      }

      if (Object.keys(newLinks).length > 0) {
        setTeacherLinks((prev) => ({ ...prev, ...newLinks }));
      }
    },
    []
  );

  /* ============================================================
     Listen to Timetable (Real-Time)
     ============================================================ */
  useEffect(() => {
    if (!grade || subjects.length === 0) {
      setEntries([]);
      setTeacherLinks({});
      fetchedTeachers.current.clear();
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const timetableRef = collection(db, "timetable");
    const q = query(
      timetableRef,
      where("grade", "==", grade),
      where("subject", "in", subjects),
      orderBy("date"),
      orderBy("time")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data: TimetableEntry[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as TimetableEntry),
        }));

        // Sort by full datetime
        const sorted = data.sort((a, b) => {
          const dateTimeA = new Date(`${a.date} ${a.time}`).getTime();
          const dateTimeB = new Date(`${b.date} ${b.time}`).getTime();
          return dateTimeA - dateTimeB;
        });

        setEntries(sorted);
        setLoading(false);

        // Extract unique teacher names
        const teacherNames = Array.from(new Set(sorted.map((e) => e.teacherName)));
        if (teacherNames.length > 0) {
          fetchTeacherLinks(teacherNames);
        }
      },
      (err) => {
        console.error("Timetable fetch error:", err);
        setError("Failed to load timetable.");
        setLoading(false);
      }
    );

    return () => {
      unsub();
    };
  }, [grade, subjects, fetchTeacherLinks]);

  /* ============================================================
     Render
     ============================================================ */
  if (loading) {
    return (
      <Card className="mt-6">
        <CardContent className="p-6 text-center text-gray-500">
          Loading timetable...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mt-6">
        <CardContent className="p-6 text-center text-red-600">
          {error}
        </CardContent>
      </Card>
    );
  }

  if (!grade || subjects.length === 0) {
    return (
      <Card className="mt-6">
        <CardContent className="p-6 text-center text-gray-500 italic">
          Select a child and subjects to view timetable.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white shadow mt-6">
      <CardHeader>
        <CardTitle className="text-lg">
          Timetable — {grade} ({subjects.join(", ")})
        </CardTitle>
      </CardHeader>

      <CardContent>
        {entries.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">
            No classes scheduled for selected subjects.
          </p>
        ) : (
          <div className="space-y-3">
            {entries.map((e) => {
              const linkInfo = teacherLinks[e.teacherName];

              return (
                <div
                  key={e.id}
                  className="p-4 border rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-indigo-900 text-lg truncate">
                        {e.subject}
                      </p>
                      <p className="text-sm text-gray-700 mt-1">
                        {e.teacherName} • {e.time} ({e.duration} min)
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {formatDate(e.date)}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    {showLinks && (
                      <div className="flex gap-2 flex-shrink-0">
                        {linkInfo?.googleClassroomLink ? (
                          <a
                            href={linkInfo.googleClassroomLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-xs h-8 px-3"
                            >
                              Classroom
                            </Button>
                          </a>
                        ) : (
                          <Button
                            size="sm"
                            disabled
                            className="bg-gray-300 text-gray-600 text-xs h-8 px-3"
                          >
                            Classroom
                          </Button>
                        )}

                        {linkInfo?.zoomLink ? (
                          <a
                            href={linkInfo.zoomLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-xs h-8 px-3"
                            >
                              Zoom
                            </Button>
                          </a>
                        ) : (
                          <Button
                            size="sm"
                            disabled
                            className="bg-gray-300 text-gray-600 text-xs h-8 px-3"
                          >
                            Zoom
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TimetableCard;