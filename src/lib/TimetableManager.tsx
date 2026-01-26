"use client";

import React, { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebaseConfig";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

/* UI Components */
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2, Plus, Calendar as CalendarIcon, AlertCircle, Clock, UserCheck } from "lucide-react";

// Time Picker remains the same
const TimePicker = ({ value, onChange }: { value: string; onChange: (v: string) => void; }) => {
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  const minutes = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];
  const [h, m] = value ? value.split(":") : ["", ""];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-12 rounded-2xl bg-slate-100 border-none font-bold text-xs shadow-inner w-full justify-start">
          <Clock size={16} className="mr-2 text-slate-500" />
          {value || "Select Time"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4 rounded-2xl shadow-xl border-none">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[10px] font-black uppercase text-slate-400">Hour</Label>
            <Select value={h} onValueChange={(val) => onChange(`${val}:${m || "00"}`)}>
              <SelectTrigger className="h-10 rounded-xl bg-slate-50"><SelectValue placeholder="HH" /></SelectTrigger>
              <SelectContent>{hours.map((hr) => (<SelectItem key={hr} value={hr}>{hr}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] font-black uppercase text-slate-400">Minute</Label>
            <Select value={m} onValueChange={(val) => onChange(`${h || "08"}:${val}`)}>
              <SelectTrigger className="h-10 rounded-xl bg-slate-50"><SelectValue placeholder="MM" /></SelectTrigger>
              <SelectContent>{minutes.map((min) => (<SelectItem key={min} value={min}>{min}</SelectItem>))}</SelectContent>
            </Select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const CAMBRIDGE_GRADES = [
  "Stage 1", "Stage 2", "Stage 3", "Stage 4", "Stage 5", "Stage 6",
  "Checkpoint (Yr 7-9)", "IGCSE 1 (Yr 10)", "IGCSE 2 (Yr 11)", "AS Level", "A Level"
];

interface Teacher {
  id: string;
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
  curriculum: "Cambridge";
}

const TimetableManager: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");

  useEffect(() => {
    const q = query(collection(db, "teacherApplications"), where("status", "==", "approved"));
    const unsub = onSnapshot(q, (snap) => {
      const fetched = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: data.uid || d.id, 
          name: `${data.personalInfo?.firstName || ""} ${data.personalInfo?.lastName || ""}`.trim(),
          subjects: data.subjects?.map((s: any) => s.name) || [],
        };
      });
      setTeachers(fetched);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "timetable"), (snap) => {
      setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() } as TimetableEntry)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const availableSubjects = useMemo(() => {
    const allSubs = teachers.flatMap(t => t.subjects);
    return Array.from(new Set(allSubs)).sort();
  }, [teachers]);

  const availableTeachers = useMemo(() => {
    if (!subject) return [];
    return teachers.filter(t => t.subjects.includes(subject));
  }, [subject, teachers]);

  const createSlot = async () => {
  if (!day || !time || !grade || !subject || !selectedTeacherId) {
    alert("Validation Failed: Please ensure all 5 fields are selected.");
    return;
  }

  setIsSaving(true);
  const teacherObj = teachers.find(t => t.id === selectedTeacherId);

  // ✅ UPDATED CONFLICT LOGIC:
  // Allow same teacher for Stage 4 & Stage 5 simultaneously
  const teacherBusy = entries.some(e => {
    const isSameTime = e.day === day && e.time === time && e.teacherUid === selectedTeacherId;
    if (!isSameTime) return false;

    // EXCEPTION: If current selection is Stage 4 and existing entry is Stage 5 (or vice versa)
    // they are NOT considered "busy" (blocked), they are allowed to co-teach.
    const isCoTeachingStage = 
      (grade === "Stage 4" && e.grade === "Stage 5") || 
      (grade === "Stage 5" && e.grade === "Stage 4");

    return !isCoTeachingStage; // Block only if it's NOT a valid co-teaching stage
  });

  const classExists = entries.some(
    e => e.day === day && e.time === time && e.grade === grade && e.subject === subject
  );

  if (teacherBusy) {
    alert(`Conflict: Teacher ${teacherObj?.name} is already teaching a different level at ${time} on ${day}.`);
    setIsSaving(false);
    return;
  }

  if (classExists) {
    alert(`Conflict: ${grade} already has ${subject} scheduled at ${time} on ${day}.`);
    setIsSaving(false);
    return;
  }

  try {
    await addDoc(collection(db, "timetable"), {
      day,
      time,
      grade,
      subject,
      curriculum: "Cambridge",
      teacherName: teacherObj?.name || "Unknown",
      teacherUid: selectedTeacherId,
      createdAt: serverTimestamp(),
    });
    
    setSubject("");
    setSelectedTeacherId("");
  } catch (err: any) {
    console.error("Firestore Error:", err);
    alert("Database Error: " + err.message);
  } finally {
    setIsSaving(false);
  }
};

  const deleteSlot = async (id: string) => {
    if (confirm("Permanently delete this class entry?")) {
      await deleteDoc(doc(db, "timetable", id));
    }
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* SELECTION TRACKER */}
      <div className="bg-slate-900 p-4 rounded-3xl shadow-2xl flex flex-wrap gap-6 items-center justify-center border border-slate-800">
        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mr-2">Scheduler Active:</p>
        <StatusItem label="Day" value={day} />
        <StatusItem label="Time" value={time} />
        <StatusItem label="Grade" value={grade} />
        <StatusItem label="Subject" value={subject} />
        <StatusItem label="Teacher" value={selectedTeacherId ? "Ready" : null} />
      </div>

      <Card className="border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden">
        <div className="p-8 bg-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-2xl">
              <CalendarIcon size={24} />
            </div>
            <div>
              <CardTitle className="text-xl font-black uppercase tracking-tight">Cambridge Timetable Master</CardTitle>
              <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest">Supports Overlapping Sessions</p>
            </div>
          </div>
        </div>
        
        <CardContent className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-end">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Timing</Label>
              <div className="flex gap-2">
                <Select value={day} onValueChange={setDay}>
                  <SelectTrigger className="rounded-2xl border-none bg-slate-100 font-bold text-xs h-12 shadow-inner">
                    <SelectValue placeholder="Day" />
                  </SelectTrigger>
                  <SelectContent>{DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
                <TimePicker value={time} onChange={setTime} />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Grade Level</Label>
              <Select value={grade} onValueChange={(v) => setGrade(v)}>
                <SelectTrigger className="rounded-2xl border-none bg-slate-100 font-bold text-xs h-12 shadow-inner">
                  <SelectValue placeholder="Select Grade" />
                </SelectTrigger>
                <SelectContent>{CAMBRIDGE_GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Subject</Label>
              <Select value={subject} onValueChange={(v) => { setSubject(v); setSelectedTeacherId(""); }}>
                <SelectTrigger className="rounded-2xl border-none bg-slate-100 font-bold text-xs h-12 shadow-inner">
                  <SelectValue placeholder="Choose Subject" />
                </SelectTrigger>
                <SelectContent>{availableSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Instructor</Label>
              <Select value={selectedTeacherId} onValueChange={(v) => setSelectedTeacherId(v)} disabled={!subject}>
                <SelectTrigger className="rounded-2xl border-none bg-slate-100 font-bold text-xs h-12 shadow-inner">
                  <SelectValue placeholder={subject ? "Assign Teacher" : "---"} />
                </SelectTrigger>
                <SelectContent>{availableTeachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <Button 
              onClick={createSlot}
              disabled={isSaving}
              className="w-full bg-indigo-600 hover:bg-slate-900 text-white font-black rounded-2xl h-12 shadow-lg transition-all"
            >
              {isSaving ? <Loader2 className="animate-spin" size={18} /> : <><Plus size={18} className="mr-2"/> PUBLISH SLOT</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* TIMETABLE GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {DAYS.map((d) => {
          // Sort entries by time and then by grade to keep them organized
          const dayEntries = entries
            .filter(e => e.day === d)
            .sort((a,b) => a.time.localeCompare(b.time) || a.grade.localeCompare(b.grade));

          return (
            <Card key={d} className="border-none shadow-xl rounded-[2.5rem] bg-white min-h-[400px] flex flex-col">
              <div className="bg-slate-50 p-6 rounded-t-[2.5rem] border-b border-slate-100 text-center">
                <h4 className="text-slate-900 font-black uppercase tracking-widest text-xs">{d}</h4>
              </div>
              <CardContent className="p-6 space-y-4 flex-1">
                {dayEntries.length > 0 ? dayEntries.map((e) => (
                  <Popover key={e.id}>
                    <PopoverTrigger asChild>
                      <div className="p-5 rounded-3xl bg-white border border-slate-100 hover:border-indigo-500 hover:shadow-xl transition-all cursor-pointer group relative">
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex gap-2">
                             <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-none text-[9px] font-black px-3 py-1 rounded-lg">{e.time}</Badge>
                             <Badge variant="outline" className="text-[8px] font-black uppercase text-indigo-400 border-indigo-100">{e.grade}</Badge>
                          </div>
                        </div>
                        <p className="font-black text-slate-800 text-sm uppercase leading-tight">{e.subject}</p>
                        <div className="flex items-center gap-2 mt-2">
                           <UserCheck size={12} className="text-emerald-500" />
                           <p className="text-[10px] text-slate-400 font-bold">{e.teacherName}</p>
                        </div>
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-2 rounded-2xl border-none shadow-2xl bg-white">
                       <Button variant="ghost" onClick={() => deleteSlot(e.id)} className="w-full justify-start text-rose-500 hover:bg-rose-50 font-black text-xs rounded-xl">
                         <Trash2 size={16} className="mr-3" /> DELETE SESSION
                       </Button>
                    </PopoverContent>
                  </Popover>
                )) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                    <AlertCircle size={32} className="text-slate-400 mb-2" />
                    <span className="text-slate-400 font-black text-[10px] uppercase">No Classes</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

const StatusItem = ({ label, value }: { label: string, value: string | null }) => (
  <div className="flex items-center gap-2">
    <div className={`w-2 h-2 rounded-full ${value ? "bg-emerald-500" : "bg-rose-500 animate-pulse"}`} />
    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{label}:</span>
    <span className={`text-[9px] font-black uppercase ${value ? "text-white" : "text-slate-600"}`}>
      {value || "???"}
    </span>
  </div>
);

export default TimetableManager;