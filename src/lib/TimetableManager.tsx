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
import { Loader2, Trash2, Plus, Calendar as CalendarIcon, AlertCircle, CheckCircle2 } from "lucide-react";

/* =========================================================
   CONSTANTS
========================================================= */
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIMES = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];
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

  // Form State
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");

  /* 1. SYNC TEACHERS */
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

  /* 2. SYNC TIMETABLE */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "timetable"), (snap) => {
      setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() } as TimetableEntry)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  /* 3. FILTER LOGIC */
  const availableSubjects = useMemo(() => {
    const allSubs = teachers.flatMap(t => t.subjects);
    return Array.from(new Set(allSubs)).sort();
  }, [teachers]);

  const availableTeachers = useMemo(() => {
    if (!subject) return [];
    return teachers.filter(t => t.subjects.includes(subject));
  }, [subject, teachers]);

  /* 4. ACTIONS */
  const createSlot = async () => {
    if (!day || !time || !grade || !subject || !selectedTeacherId) {
      alert("Validation Failed: Please ensure all 5 fields are selected.");
      return;
    }

    setIsSaving(true);
    const teacherObj = teachers.find(t => t.id === selectedTeacherId);

    const hasConflict = entries.some(
      e => e.day === day && e.time === time && e.grade === grade
    );

    if (hasConflict) {
      alert(`Schedule Conflict: ${grade} already has a class at ${time} on ${day}.`);
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
      
      // Success: Only reset subject/teacher to allow quick entry for same grade/day
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
      
      {/* SELECTION TRACKER (Debug Bar) */}
      <div className="bg-slate-900 p-4 rounded-3xl shadow-2xl flex flex-wrap gap-6 items-center justify-center border border-slate-800">
        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mr-2">Status Panel:</p>
        <StatusItem label="Day" value={day} />
        <StatusItem label="Time" value={time} />
        <StatusItem label="Grade" value={grade} />
        <StatusItem label="Subject" value={subject} />
        <StatusItem label="Teacher" value={selectedTeacherId ? "Selected" : null} />
      </div>

      <Card className="border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden">
        <div className="p-8 bg-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-2xl">
              <CalendarIcon size={24} />
            </div>
            <div>
              <CardTitle className="text-xl font-black uppercase tracking-tight">Cambridge Timetable Master</CardTitle>
              <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest">Global Schedule Management</p>
            </div>
          </div>
        </div>
        
        <CardContent className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-end">
            
            {/* Day & Time */}
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Timing</Label>
              <div className="flex gap-2">
                <Select value={day} onValueChange={(v) => setDay(v)}>
                  <SelectTrigger className="rounded-2xl border-none bg-slate-100 font-bold text-xs h-12 shadow-inner">
                    <SelectValue placeholder="Day" />
                  </SelectTrigger>
                  <SelectContent>{DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={time} onValueChange={(v) => setTime(v)}>
                  <SelectTrigger className="rounded-2xl border-none bg-slate-100 font-bold text-xs h-12 shadow-inner">
                    <SelectValue placeholder="Time" />
                  </SelectTrigger>
                  <SelectContent>{TIMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Grade Selection */}
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Grade Level</Label>
              <Select value={grade} onValueChange={(v) => setGrade(v)}>
                <SelectTrigger className="rounded-2xl border-none bg-slate-100 font-bold text-xs h-12 shadow-inner">
                  <SelectValue placeholder="Select Grade" />
                </SelectTrigger>
                <SelectContent>{CAMBRIDGE_GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Subject Selection */}
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Subject</Label>
              <Select value={subject} onValueChange={(v) => { setSubject(v); setSelectedTeacherId(""); }}>
                <SelectTrigger className="rounded-2xl border-none bg-slate-100 font-bold text-xs h-12 shadow-inner">
                  <SelectValue placeholder="Choose Subject" />
                </SelectTrigger>
                <SelectContent>{availableSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Teacher Selection */}
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
              className="w-full bg-indigo-600 hover:bg-slate-900 text-white font-black rounded-2xl h-12 shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {isSaving ? <Loader2 className="animate-spin" size={18} /> : <><Plus size={18}/> PUBLISH SLOT</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* TIMETABLE GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {DAYS.map((d) => {
          const dayEntries = entries.filter(e => e.day === d).sort((a,b) => a.time.localeCompare(b.time));
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
                          <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-none text-[9px] font-black px-3 py-1 rounded-lg">{e.time}</Badge>
                          <span className="text-[9px] font-black text-slate-300 uppercase">{e.grade}</span>
                        </div>
                        <p className="font-black text-slate-800 text-sm uppercase leading-tight">{e.subject}</p>
                        <div className="flex items-center gap-2 mt-2">
                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                           <p className="text-[10px] text-slate-400 font-bold">{e.teacherName}</p>
                        </div>
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-2 rounded-2xl border-none shadow-2xl bg-white/90 backdrop-blur-md">
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

/* Helper Component for the Status Panel */
const StatusItem = ({ label, value }: { label: string, value: string | null }) => (
  <div className="flex items-center gap-2">
    <div className={`w-2 h-2 rounded-full ${value ? "bg-emerald-500" : "bg-rose-500 animate-pulse"}`} />
    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{label}:</span>
    <span className={`text-[9px] font-black uppercase ${value ? "text-white" : "text-slate-600"}`}>
      {value || "MISSING"}
    </span>
  </div>
);

export default TimetableManager;