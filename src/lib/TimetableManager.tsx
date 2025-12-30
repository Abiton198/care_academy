"use client";

/* =========================================================
   IMPORTS
========================================================= */
import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebaseConfig";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
  query,
  where,
} from "firebase/firestore";

/* UI Components */
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

/* =========================================================
   CONSTANTS
========================================================= */
const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const TIMES = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
];

const CAPS_GRADES = Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`);
const CAMBRIDGE_GRADES = Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`);

/* =========================================================
   TYPES
========================================================= */
interface Teacher {
  id: string;              // teacher UID
  name: string;
  subjects: string[];
}

interface TimetableEntry {
  id: string;
  day: string;
  time: string;
  grade: string;
  subject: string;
  teacherName: string;
  teacherUid: string;
  curriculum: "CAPS" | "Cambridge";
}

/* =========================================================
   COMPONENT
========================================================= */
const TimetableManager: React.FC = () => {
  /* ---------------- STATE ---------------- */
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);

  // Create slot form
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  const [curriculum, setCurriculum] =
    useState<"CAPS" | "Cambridge">("CAPS");
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [teacher, setTeacher] = useState<Teacher | null>(null);

  // Editing slot
  const [editing, setEditing] = useState<TimetableEntry | null>(null);

  /* =========================================================
     FETCH APPROVED TEACHERS
========================================================= */
  useEffect(() => {
    const q = query(
      collection(db, "teacherApplications"),
      where("status", "==", "approved")
    );

    const unsub = onSnapshot(q, (snap) => {
      const fetched: Teacher[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: data.uid,
          name: `${data.personalInfo?.firstName || ""} ${data.personalInfo?.lastName || ""}`.trim(),
          subjects: data.subjects?.map((s: any) => s.name) || [],
        };
      });

      setTeachers(fetched);
      setSubjects([...new Set(fetched.flatMap((t) => t.subjects))]);
    });

    return () => unsub();
  }, []);

  /* =========================================================
     FETCH TIMETABLE (REALTIME)
========================================================= */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "timetable"), (snap) => {
      setEntries(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<TimetableEntry, "id">),
        }))
      );
    });

    return () => unsub();
  }, []);

  /* =========================================================
     CRITICAL FIXES (DEPENDENT STATE)
========================================================= */

  // When subject changes → previously selected teacher may be invalid
  useEffect(() => {
    setTeacher(null);
  }, [subject]);

  // When curriculum changes → previously selected grade may be invalid
  useEffect(() => {
    setGrade("");
  }, [curriculum]);

  /* =========================================================
     CREATE TIMETABLE SLOT
========================================================= */
  const createSlot = async () => {
    if (!day || !time || !grade || !subject || !teacher) return;

    // Prevent duplicate slots
    const conflict = entries.find(
      (e) =>
        e.day === day &&
        e.time === time &&
        e.grade === grade &&
        e.curriculum === curriculum
    );

    if (conflict) {
      alert("A class already exists for this time and grade.");
      return;
    }

    await addDoc(collection(db, "timetable"), {
      day,
      time,
      grade,
      subject,
      curriculum,
      teacherName: teacher.name,
      teacherUid: teacher.id,
      createdAt: new Date(),
    });

    // Reset form
    setDay("");
    setTime("");
    setGrade("");
    setSubject("");
    setTeacher(null);
  };

  /* =========================================================
     UPDATE SLOT
========================================================= */
  const updateSlot = async () => {
    if (!editing) return;

    await updateDoc(doc(db, "timetable", editing.id), {
      day: editing.day,
      time: editing.time,
      grade: editing.grade,
      subject: editing.subject,
      curriculum: editing.curriculum,
      teacherName: editing.teacherName,
    });

    setEditing(null);
  };

  /* =========================================================
     DELETE SLOT
========================================================= */
  const deleteSlot = async (id: string) => {
    await deleteDoc(doc(db, "timetable", id));
    setEditing(null);
  };

  /* =========================================================
     RENDER
========================================================= */
  return (
    <Card className="mt-6 shadow-lg">
      <CardHeader>
        <CardTitle>School Timetable (CAPS & Cambridge)</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* ================= CREATE SLOT ================= */}
        <div className="grid md:grid-cols-6 gap-3 bg-gray-50 p-4 rounded-lg">
          {/* Day */}
          <Select value={day} onValueChange={setDay}>
            <SelectTrigger><SelectValue placeholder="Day" /></SelectTrigger>
            <SelectContent>
              {DAYS.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Time */}
          <Select value={time} onValueChange={setTime}>
            <SelectTrigger><SelectValue placeholder="Time" /></SelectTrigger>
            <SelectContent>
              {TIMES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Curriculum */}
          <Select
            value={curriculum}
            onValueChange={(v) => setCurriculum(v as any)}
          >
            <SelectTrigger><SelectValue placeholder="Curriculum" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="CAPS">CAPS</SelectItem>
              <SelectItem value="Cambridge">Cambridge</SelectItem>
            </SelectContent>
          </Select>

          {/* Grade */}
          <Select value={grade} onValueChange={setGrade}>
            <SelectTrigger><SelectValue placeholder="Grade" /></SelectTrigger>
            <SelectContent>
              {(curriculum === "CAPS" ? CAPS_GRADES : CAMBRIDGE_GRADES).map(
                (g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                )
              )}
            </SelectContent>
          </Select>

          {/* Subject */}
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
            <SelectContent>
              {subjects.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Teacher */}
          <Select
            value={teacher?.id}
            onValueChange={(id) =>
              setTeacher(teachers.find((t) => t.id === id) || null)
            }
          >
            <SelectTrigger><SelectValue placeholder="Teacher" /></SelectTrigger>
            <SelectContent>
              {teachers
                .filter((t) => t.subjects.includes(subject))
                .map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
            </SelectContent>
          </Select>

          {/* Teacher availability warning */}
          {subject &&
            teachers.filter((t) => t.subjects.includes(subject)).length === 0 && (
              <p className="md:col-span-6 text-xs text-red-600 font-semibold">
                No approved teacher teaches this subject
              </p>
            )}

          <Button
            onClick={createSlot}
            disabled={!day || !time || !grade || !subject || !teacher}
            className="md:col-span-6 bg-indigo-600 disabled:opacity-50"
          >
            Add Slot
          </Button>
        </div>

        {/* ================= TIMETABLE DISPLAY ================= */}
        <div className="grid gap-4">
          {DAYS.map((d) => (
            <div key={d}>
              <h3 className="font-semibold mb-2">{d}</h3>
              <div className="grid grid-cols-5 gap-2">
                {entries
                  .filter((e) => e.day === d)
                  .map((e) => (
                    <Popover key={e.id}>
                      <PopoverTrigger asChild>
                        <div
                          className={`p-2 rounded cursor-pointer text-xs
                          ${
                            e.curriculum === "CAPS"
                              ? "bg-green-100 border border-green-400"
                              : "bg-blue-100 border border-blue-400"
                          }`}
                        >
                          <p className="font-semibold">{e.subject}</p>
                          <p>{e.grade}</p>
                          <Badge className="mt-1">{e.time}</Badge>
                        </div>
                      </PopoverTrigger>

                      <PopoverContent className="w-64 space-y-2">
                        <p className="font-bold">{e.subject}</p>
                        <p>{e.teacherName}</p>
                        <p>{e.grade}</p>

                        <Button size="sm" onClick={() => setEditing(e)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteSlot(e.id)}
                        >
                          Delete
                        </Button>
                      </PopoverContent>
                    </Popover>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default TimetableManager;
