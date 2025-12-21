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

/* ============================================================
   Configuration
   ============================================================ */
const ALL_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DEFAULT_TIME_SLOTS = ["03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM", "07:00 PM", "08:00 PM"];

/* ============================================================
   Types
   ============================================================ */
interface Teacher {
  id: string;
  name: string;
  subjects: string[];
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

/* ============================================================
   Main Component
   ============================================================ */
const TimetableManager: React.FC = () => {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set(ALL_DAYS));
  const [lockedDays, setLockedDays] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<string | null>(null);

  // Custom time slots
  const [satSlots, setSatSlots] = useState<string[]>(DEFAULT_TIME_SLOTS);
  const [sunSlots, setSunSlots] = useState<string[]>([]);
  const [newSatTime, setNewSatTime] = useState("");
  const [newSunTime, setNewSunTime] = useState("");

  // Editing state
  const [editGrade, setEditGrade] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editTeacher, setEditTeacher] = useState("");
  const [editCurriculum, setEditCurriculum] = useState<"CAPS" | "Cambridge">("CAPS");

  /* ============================================================
     Fetch Teachers & Subjects
     ============================================================ */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "teachers"), (snap) => {
      const fetched = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: `${data.firstName || ""} ${data.lastName || ""}`.trim(),
          subjects: Array.isArray(data.subjects) ? data.subjects : [data.subject || ""],
        };
      });
      setTeachers(fetched);
      const unique = [...new Set(fetched.flatMap(t => t.subjects).filter(Boolean))];
      setSubjects(unique);
    });
    return () => unsub();
  }, []);

  /* ============================================================
     Fetch Timetable (Real-Time)
     ============================================================ */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "timetable"), (snap) => {
      setEntries(snap.docs.map(d => ({ id: d.id, ...(d.data() as TimetableEntry) })));
    });
    return () => unsub();
  }, []);

  /* ============================================================
     Reset Edit State
     ============================================================ */
  const resetEditState = () => {
    setEditGrade("");
    setEditSubject("");
    setEditTeacher("");
    setEditCurriculum("CAPS");
  };

  /* ============================================================
     Initialize Edit State When Cell Opens
     ============================================================ */
  useEffect(() => {
    if (!editingCell) {
      resetEditState();
      return;
    }

    const [day, time] = editingCell.split("-");
    const entry = entries.find(e => e.day === day && e.time === time);

    if (entry) {
      setEditGrade(entry.grade);
      setEditSubject(entry.subject);
      setEditTeacher(entry.teacherName);
      setEditCurriculum(entry.curriculum);
    } else {
      resetEditState();
    }
  }, [editingCell, entries]);

  /* ============================================================
     Toggle Day Collapse (Arrow Only)
     ============================================================ */
  const toggleDay = (day: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  /* ============================================================
     Toggle Lock/Unlock Day
     ============================================================ */
  const toggleLock = (day: string) => {
    setLockedDays(prev => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  /* ============================================================
     Add/Remove Custom Time
     ============================================================ */
  const addTime = (day: "Saturday" | "Sunday", time: string, setTime: React.Dispatch<React.SetStateAction<string>>) => {
    if (time && !getTimeSlots(day).includes(time)) {
      if (day === "Saturday") setSatSlots(prev => [...prev, time].sort());
      else setSunSlots(prev => [...prev, time].sort());
      setTime("");
    }
  };

  const removeTime = (day: "Saturday" | "Sunday", time: string) => {
    if (day === "Saturday") setSatSlots(prev => prev.filter(t => t !== time));
    else setSunSlots(prev => prev.filter(t => t !== time));
  };

  const getTimeSlots = (day: string): string[] => {
    if (day === "Saturday") return satSlots;
    if (day === "Sunday") return sunSlots;
    return DEFAULT_TIME_SLOTS;
  };

  /* ============================================================
     Get Entry
     ============================================================ */
  const getEntry = (day: string, time: string): TimetableEntry | undefined => {
    return entries.find(e => e.day === day && e.time === time);
  };

  /* ============================================================
     Save Entry
     ============================================================ */
  const saveEntry = async (day: string, time: string) => {
    if (!editGrade || !editSubject || !editTeacher) {
      alert("Please fill all fields");
      return;
    }

    const existing = getEntry(day, time);
    const newEntry = {
      grade: editGrade,
      subject: editSubject,
      day,
      time,
      duration: 60,
      teacherName: editTeacher,
      curriculum: editCurriculum,
    };

    const conflict = entries.some(e =>
      (e.grade === editGrade || e.teacherName === editTeacher) &&
      e.day === day && e.time === time && e.id !== existing?.id
    );
    if (conflict) {
      alert(`Conflict: ${editGrade} or ${editTeacher} already booked`);
      return;
    }

    try {
      if (existing) {
        await updateDoc(doc(db, "timetable", existing.id), newEntry);
      } else {
        await addDoc(collection(db, "timetable"), newEntry);
      }
      setEditingCell(null);
    } catch (err) {
      console.error(err);
      alert("Save failed");
    }
  };

  /* ============================================================
     Remove Entry
     ============================================================ */
  const removeEntry = async (id: string) => {
    await deleteDoc(doc(db, "timetable", id));
  };

  /* ============================================================
     Render Cell – NO setState in render!
     ============================================================ */
  const renderCell = (day: string, time: string) => {
    const entry = getEntry(day, time);
    const isLocked = lockedDays.has(day);
    const cellKey = `${day}-${time}`;
    const isEditing = editingCell === cellKey;

    const isCAPS = editCurriculum === "CAPS";
    const gradeOptions = isCAPS
      ? ["Grade 10", "Grade 11", "Grade 12"]
      : ["Form 3", "Form 4", "Form 5", "Form 6"];

    return (
      <Popover open={isEditing} onOpenChange={(open) => !open && setEditingCell(null)}>
        <PopoverTrigger asChild>
          <div
            className={`
              min-h-20 p-2 border rounded cursor-pointer transition-all text-xs relative
              ${isLocked ? "opacity-50 cursor-not-allowed" : ""}
              ${entry
                ? entry.curriculum === "CAPS"
                  ? "bg-green-100 border-green-400 hover:bg-green-200"
                  : "bg-blue-100 border-blue-400 hover:bg-blue-200"
                : "bg-gray-50 hover:bg-gray-100 border-dashed"
              }
            `}
            onClick={(e) => {
              if (isLocked) return;
              e.stopPropagation();
              setEditingCell(cellKey);
            }}
          >
            {isLocked && <Lock className="absolute top-1 right-1 w-3 h-3 text-gray-500" />}
            {entry ? (
              <div className="space-y-0.5">
                <p className="font-medium">{entry.subject}</p>
                <p className="text-gray-600 text-xs">{entry.teacherName}</p>
                <Badge variant={entry.curriculum === "CAPS" ? "success" : "info"} className="text-xs px-1.5">
                  {entry.curriculum}
                </Badge>
              </div>
            ) : (
              <p className="text-gray-400 text-center">+</p>
            )}
          </div>
        </PopoverTrigger>

        {!isLocked && (
          <PopoverContent className="w-80 p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h4 className="font-medium text-sm">{day} • {time}</h4>

            {/* Curriculum Toggle */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={editCurriculum === "CAPS" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setEditCurriculum("CAPS")}
              >
                CAPS
              </Button>
              <Button
                size="sm"
                variant={editCurriculum === "Cambridge" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setEditCurriculum("Cambridge")}
              >
                Cambridge
              </Button>
            </div>

            {/* Grade */}
            <Select value={editGrade} onValueChange={setEditGrade}>
              <SelectTrigger><SelectValue placeholder="Select Level" /></SelectTrigger>
              <SelectContent>
                {gradeOptions.map(g => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Subject */}
            <Select value={editSubject} onValueChange={setEditSubject}>
              <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
              <SelectContent>
                {subjects.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Teacher */}
            <Select value={editTeacher} onValueChange={setEditTeacher}>
              <SelectTrigger><SelectValue placeholder="Teacher" /></SelectTrigger>
              <SelectContent>
                {teachers
                  .filter(t => !editSubject || t.subjects.includes(editSubject))
                  .map(t => (
                    <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>

            {/* Add Slot Button */}
            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              onClick={() => saveEntry(day, time)}
            >
              {entry ? "Update Slot" : "Add Slot"}
            </Button>

            {entry && (
              <Button
                size="sm"
                variant="destructive"
                className="w-full"
                onClick={() => {
                  removeEntry(entry.id);
                  setEditingCell(null);
                }}
              >
                Remove
              </Button>
            )}
          </PopoverContent>
        )}
      </Popover>
    );
  };

  return (
    <Card className="bg-white shadow-lg mt-6">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Weekly Timetable (Sun–Sat)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Custom Weekend Times */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium mb-2">Saturday Times</h4>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="e.g. 09:00 AM"
                  value={newSatTime}
                  onChange={(e) => setNewSatTime(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addTime("Saturday", newSatTime, setNewSatTime)}
                />
                <Button size="sm" onClick={() => addTime("Saturday", newSatTime, setNewSatTime)}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {satSlots.map(t => (
                  <Badge key={t} variant="secondary" className="text-xs">
                    {t}
                    <button onClick={() => removeTime("Saturday", t)} className="ml-1 text-red-600">×</button>
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Sunday Times</h4>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="e.g. 10:00 AM"
                  value={newSunTime}
                  onChange={(e) => setNewSunTime(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addTime("Sunday", newSunTime, setNewSunTime)}
                />
                <Button size="sm" onClick={() => addTime("Sunday", newSunTime, setNewSunTime)}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {sunSlots.map(t => (
                  <Badge key={t} variant="secondary" className="text-xs">
                    {t}
                    <button onClick={() => removeTime("Sunday", t)} className="ml-1 text-red-600">×</button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Days - Collapsible with Arrow Only */}
          {ALL_DAYS.map(day => {
            const timeSlots = getTimeSlots(day);
            const hasSlots = timeSlots.length > 0;

            return (
              <div key={day} className="border rounded-lg overflow-hidden">
                <div className="w-full p-3 bg-indigo-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{day}</span>
                    {lockedDays.has(day) && <Lock size={16} className="text-gray-500" />}
                    {!hasSlots && <span className="text-xs text-gray-500">(No slots)</span>}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={lockedDays.has(day) ? "default" : "outline"}
                      onClick={(e) => { e.stopPropagation(); toggleLock(day); }}
                    >
                      {lockedDays.has(day) ? <Lock size={14} /> : <Unlock size={14} />}
                    </Button>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleDay(day); }}
                      className="p-1 hover:bg-indigo-200 rounded"
                    >
                      {expandedDays.has(day) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>

                {expandedDays.has(day) && hasSlots && (
                  <div className="p-3 bg-gray-50">
                    <div className="grid grid-cols-7 gap-2 text-xs">
                      <div className="font-medium text-gray-700 col-span-1">Time</div>
                      {timeSlots.map(time => (
                        <div key={time} className="font-medium text-center col-span-1">{time}</div>
                      ))}

                      <div className="col-span-1"></div>
                      {timeSlots.map(time => (
                        <div key={time} className="col-span-1">
                          {renderCell(day, time)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-green-100 border border-green-400 rounded"></div>
            <span>CAPS (Grade 10–12)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-blue-100 border border-blue-400 rounded"></div>
            <span>Cambridge (Form 3–6)</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-gray-500" />
            <span>Locked</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TimetableManager;