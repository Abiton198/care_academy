"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebaseConfig";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp, Lock, Unlock } from "lucide-react";

const ALL_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DEFAULT_TIME_SLOTS = ["03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM", "07:00 PM", "08:00 PM"];

interface Teacher {
  id: string;
  firstName?: string;
  lastName?: string;
  subjects?: string[];
}

interface TimetableEntry {
  id: string;
  grade: string;
  subject: string;
  day: string;
  time: string;
  duration: number;
  teacherId: string;
  teacherName: string;
  curriculum: "CAPS" | "Cambridge";
}

const TimetableManager: React.FC = () => {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set(ALL_DAYS));
  const [lockedDays, setLockedDays] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<string | null>(null);

  // Custom weekend times
  const [satSlots, setSatSlots] = useState<string[]>(DEFAULT_TIME_SLOTS);
  const [sunSlots, setSunSlots] = useState<string[]>([]);
  const [newSatTime, setNewSatTime] = useState("");
  const [newSunTime, setNewSunTime] = useState("");

  // Editing state
  const [editCurriculum, setEditCurriculum] = useState<"CAPS" | "Cambridge">("CAPS");
  const [editGrade, setEditGrade] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editTeacherId, setEditTeacherId] = useState("");

  /* ============================================================
     Fetch Teachers
     ============================================================ */
 useEffect(() => {
  const unsub = onSnapshot(collection(db, "teachers"), (snap) => {
    const fetched = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        // ←it's always an array
        subjects: Array.isArray(data.subjects)
          ? data.subjects
          : data.subject // fallback if old field name
          ? [data.subject]
          : [],
      };
    });
    setTeachers(fetched);
  });
  return () => unsub();
}, []);

  /* ============================================================
     Fetch Timetable
     ============================================================ */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "timetable"), (snap) => {
      setEntries(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as TimetableEntry),
        }))
      );
    });
    return () => unsub();
  }, []);

  /* ============================================================
     Reset & Initialize Edit State
     ============================================================ */
  useEffect(() => {
    if (!editingCell) {
      setEditCurriculum("CAPS");
      setEditGrade("");
      setEditSubject("");
      setEditTeacherId("");
      return;
    }

    const [day, time] = editingCell.split("-");
    const entry = entries.find((e) => e.day === day && e.time === time);

    if (entry) {
      setEditCurriculum(entry.curriculum);
      setEditGrade(entry.grade);
      setEditSubject(entry.subject);
      setEditTeacherId(entry.teacherId);
    } else {
      setEditCurriculum("CAPS");
      setEditGrade("");
      setEditSubject("");
      setEditTeacherId("");
    }
  }, [editingCell, entries]);

  /* ============================================================
     Grade Options
     ============================================================ */
  const getGradeOptions = () => {
    if (editCurriculum === "CAPS") {
      return Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`);
    }
    return ["Form 1", "Form 2", "Form 3", "Form 4", "Form 5", "Form 6"];
  };

  /* ============================================================
     Available Teachers for Subject
     ============================================================ */
  const getTeachersForSubject = () => {
    if (!editSubject) return teachers;
    return teachers.filter((t) => t.subjects?.includes(editSubject));
  };

  /* ============================================================
     Time Slots
     ============================================================ */
  const getTimeSlots = (day: string): string[] => {
    if (day === "Saturday") return satSlots;
    if (day === "Sunday") return sunSlots;
    return DEFAULT_TIME_SLOTS;
  };

  const addTime = (day: "Saturday" | "Sunday", time: string, setTime: React.Dispatch<React.SetStateAction<string>>) => {
    if (time && !getTimeSlots(day).includes(time)) {
      const sorted = [...getTimeSlots(day), time].sort();
      if (day === "Saturday") setSatSlots(sorted);
      else setSunSlots(sorted);
      setTime("");
    }
  };

  const removeTime = (day: "Saturday" | "Sunday", time: string) => {
    if (day === "Saturday") setSatSlots((prev) => prev.filter((t) => t !== time));
    else setSunSlots((prev) => prev.filter((t) => t !== time));
  };

  /* ============================================================
     Toggle Day & Lock
     ============================================================ */
  const toggleDay = (day: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      next.has(day) ? next.delete(day) : next.add(day);
      return next;
    });
  };

  const toggleLock = (day: string) => {
    setLockedDays((prev) => {
      const next = new Set(prev);
      next.has(day) ? next.delete(day) : next.add(day);
      return next;
    });
  };

  /* ============================================================
     Get Entry
     ============================================================ */
  const getEntry = (day: string, time: string) => {
    return entries.find((e) => e.day === day && e.time === time);
  };

  /* ============================================================
     Save/Update Entry
     ============================================================ */
  const saveEntry = async (day: string, time: string) => {
    if (!editGrade || !editSubject || !editTeacherId) {
      alert("Please select grade, subject, and teacher");
      return;
    }

    const teacher = teachers.find((t) => t.id === editTeacherId);
    if (!teacher) return;

    const existing = getEntry(day, time);

    // Conflict check: same teacher or same grade at same time
    const conflict = entries.some(
      (e) =>
        e.id !== existing?.id &&
        e.day === day &&
        e.time === time &&
        (e.teacherId === editTeacherId || e.grade === editGrade)
    );

    if (conflict) {
      alert("Conflict: This teacher or grade is already booked at this time");
      return;
    }

    const newData = {
      grade: editGrade,
      subject: editSubject,
      day,
      time,
      duration: 60,
      teacherId: editTeacherId,
      teacherName: `${teacher.firstName || ""} ${teacher.lastName || ""}`.trim(),
      curriculum: editCurriculum,
    };

    try {
      if (existing) {
        await updateDoc(doc(db, "timetable", existing.id), newData);
      } else {
        await addDoc(collection(db, "timetable"), newData);
      }
      setEditingCell(null);
    } catch (err) {
      console.error("Save failed:", err);
      alert("Failed to save timetable entry");
    }
  };

  /* ============================================================
     Remove Entry
     ============================================================ */
  const removeEntry = async (id: string) => {
    try {
      await deleteDoc(doc(db, "timetable", id));
      setEditingCell(null);
    } catch (err) {
      console.error(err);
    }
  };

  /* ============================================================
     Render Cell
     ============================================================ */
  const renderCell = (day: string, time: string) => {
    const entry = getEntry(day, time);
    const isLocked = lockedDays.has(day);
    const cellKey = `${day}-${time}`;
    const isEditing = editingCell === cellKey;

    return (
      <Popover open={isEditing} onOpenChange={(open) => !open && setEditingCell(null)}>
        <PopoverTrigger asChild>
          <div
            className={`
              min-h-24 p-3 border-2 rounded-lg cursor-pointer transition-all text-sm relative shadow-sm
              ${isLocked ? "opacity-60 cursor-not-allowed" : "hover:shadow-md"}
              ${entry
                ? entry.curriculum === "CAPS"
                  ? "bg-gradient-to-br from-green-100 to-emerald-100 border-green-500"
                  : "bg-gradient-to-br from-blue-100 to-indigo-100 border-blue-500"
                : "bg-gray-50 border-dashed border-gray-300 hover:bg-gray-100"
              }
            `}
            onClick={(e) => {
              if (isLocked) return;
              e.stopPropagation();
              setEditingCell(cellKey);
            }}
          >
            {isLocked && <Lock className="absolute top-2 right-2 w-4 h-4 text-gray-500" />}
            {entry ? (
              <div className="space-y-1">
                <p className="font-bold text-base">{entry.subject}</p>
                <p className="text-sm text-gray-700">{entry.teacherName}</p>
                <p className="text-xs text-gray-600">{entry.grade}</p>
                <Badge
                  variant={entry.curriculum === "CAPS" ? "success" : "info"}
                  className="text-xs"
                >
                  {entry.curriculum}
                </Badge>
              </div>
            ) : (
              <p className="text-center text-gray-400 text-2xl">+</p>
            )}
          </div>
        </PopoverTrigger>

        {!isLocked && (
          <PopoverContent className="w-96 p-5 space-y-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h4 className="font-bold text-lg text-indigo-800">{day} • {time}</h4>

            {/* Curriculum */}
            <div className="flex gap-3">
              <Button
                variant={editCurriculum === "CAPS" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setEditCurriculum("CAPS")}
              >
                CAPS
              </Button>
              <Button
                variant={editCurriculum === "Cambridge" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setEditCurriculum("Cambridge")}
              >
                Cambridge
              </Button>
            </div>

            {/* Grade */}
            <Select value={editGrade} onValueChange={setEditGrade}>
              <SelectTrigger>
                <SelectValue placeholder="Select Grade/Level" />
              </SelectTrigger>
              <SelectContent>
                {getGradeOptions().map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Subject */}
            <Select value={editSubject} onValueChange={setEditSubject}>
              <SelectTrigger>
                <SelectValue placeholder="Select Subject" />
              </SelectTrigger>
              <SelectContent>
                {[...new Set(teachers.flatMap((t) => t.subjects || []))].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Teacher - filtered by subject */}
            <Select value={editTeacherId} onValueChange={setEditTeacherId}>
              <SelectTrigger>
                <SelectValue placeholder="Select Teacher" />
              </SelectTrigger>
              <SelectContent>
                {getTeachersForSubject().map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.firstName} {t.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              onClick={() => saveEntry(day, time)}
            >
              {entry ? "Update Class" : "Schedule Class"}
            </Button>

            {entry && (
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => removeEntry(entry.id)}
              >
                Remove Class
              </Button>
            )}
          </PopoverContent>
        )}
      </Popover>
    );
  };

  return (
    <Card className="bg-white shadow-2xl rounded-2xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white">
        <CardTitle className="text-3xl font-bold flex items-center gap-4">
          School Timetable Manager
        </CardTitle>
      </CardHeader>
      <CardContent className="p-8">
        {/* Custom Weekend Slots */}
        <div className="grid md:grid-cols-2 gap-6 mb-8 p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
          <div>
            <h4 className="font-bold text-lg mb-3 text-indigo-800">Saturday Slots</h4>
            <div className="flex gap-3 mb-4">
              <Input
                placeholder="e.g. 09:00 AM"
                value={newSatTime}
                onChange={(e) => setNewSatTime(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTime("Saturday", newSatTime, setNewSatTime)}
              />
              <Button onClick={() => addTime("Saturday", newSatTime, setNewSatTime)}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {satSlots.map((t) => (
                <Badge key={t} variant="secondary" className="px-3 py-1">
                  {t}
                  <button
                    onClick={() => removeTime("Saturday", t)}
                    className="ml-2 text-red-600 hover:text-red-800"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-bold text-lg mb-3 text-purple-800">Sunday Slots</h4>
            <div className="flex gap-3 mb-4">
              <Input
                placeholder="e.g. 10:00 AM"
                value={newSunTime}
                onChange={(e) => setNewSunTime(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTime("Sunday", newSunTime, setNewSunTime)}
              />
              <Button onClick={() => addTime("Sunday", newSunTime, setNewSunTime)}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {sunSlots.map((t) => (
                <Badge key={t} variant="secondary" className="px-3 py-1">
                  {t}
                  <button
                    onClick={() => removeTime("Sunday", t)}
                    className="ml-2 text-red-600 hover:text-red-800"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Timetable Grid */}
        <div className="space-y-6">
          {ALL_DAYS.map((day) => {
            const timeSlots = getTimeSlots(day);
            const hasSlots = timeSlots.length > 0;

            return (
              <div key={day} className="border-2 border-indigo-200 rounded-xl overflow-hidden shadow-md">
                <div className="bg-gradient-to-r from-indigo-100 to-purple-100 p-4 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <h3 className="text-2xl font-bold text-indigo-900">{day}</h3>
                    {lockedDays.has(day) && <Lock className="w-6 h-6 text-gray-600" />}
                    {!hasSlots && <span className="text-sm text-gray-600">(No time slots)</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      size="sm"
                      variant={lockedDays.has(day) ? "default" : "outline"}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLock(day);
                      }}
                    >
                      {lockedDays.has(day) ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                    </Button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDay(day);
                      }}
                      className="p-2 rounded-lg hover:bg-white/50 transition"
                    >
                      {expandedDays.has(day) ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                    </button>
                  </div>
                </div>

                {expandedDays.has(day) && hasSlots && (
                  <div className="p-6 bg-gray-50">
                    <div className="grid grid-cols-8 gap-4 text-center font-medium text-gray-700 mb-4">
                      <div>Time</div>
                      {timeSlots.map((t) => (
                        <div key={t}>{t}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-8 gap-4">
                      <div className="text-right font-medium text-gray-600 pr-4">Classes →</div>
                      {timeSlots.map((time) => (
                        <div key={time}>{renderCell(day, time)}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-10 flex flex-wrap justify-center gap-8 text-lg">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-100 to-emerald-100 border-2 border-green-500"></div>
            <span className="font-medium">CAPS (Grade 1–12)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 border-2 border-blue-500"></div>
            <span className="font-medium">Cambridge (Form 1–6)</span>
          </div>
          <div className="flex items-center gap-3">
            <Lock className="w-6 h-6 text-gray-600" />
            <span className="font-medium">Locked Day</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TimetableManager;