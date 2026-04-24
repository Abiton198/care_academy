"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Download, Eye, FileText, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ✅ Single shared type — no more duplicate interface conflict
import type { TimetableSlot } from "@/types/timetable";

interface TimetableExportManagerProps {
  timetableData: TimetableSlot[];
  /**
   * TEACHER MODE — pass the logged-in teacher's uid + name.
   *   - Default view: "My Schedule" (this teacher's slots only)
   *   - Can switch to "Master Timetable" (full school, read-only)
   *   - "By Teacher" selector is completely hidden
   *
   * PRINCIPAL MODE — omit both props.
   *   - Full controls: All School / By Grade / By Teacher
   */
  lockedTeacherUid?: string;
  lockedTeacherName?: string;
}

/* ================= HELPERS ================= */

const normalizeTime = (t: string): string => {
  if (!t) return "";
  const clean = t.trim().toUpperCase().replace(/\s+/g, "");
  const plain = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (plain) return `${plain[1].padStart(2, "0")}:${plain[2]}`;
  const ampm = clean.match(/^(\d{1,2}):(\d{2})(AM|PM)$/);
  if (ampm) {
    let hour = parseInt(ampm[1]);
    const mins = ampm[2];
    const period = ampm[3];
    if (period === "PM" && hour !== 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;
    return `${hour.toString().padStart(2, "0")}:${mins}`;
  }
  return clean;
};

const normalizeDay = (d: string): string => d?.trim().toLowerCase() ?? "";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/* ================= COMPONENT ================= */

export function TimetableExportManager({
  timetableData,
  lockedTeacherUid,
  lockedTeacherName,
}: TimetableExportManagerProps) {
  const isTeacherMode = !!lockedTeacherUid;

  const [viewType, setViewType] = useState<"consolidated" | "grade" | "individual">(
    isTeacherMode ? "individual" : "consolidated"
  );
  const [selectedTeacherUid, setSelectedTeacherUid] = useState<string>(lockedTeacherUid ?? "");
  const [selectedGrade, setSelectedGrade] = useState<string>("");

  const safeData = useMemo(() => {
    if (!timetableData) return [];
    return timetableData.filter((s) => s?.day && s?.time && s?.grade && s?.subject);
  }, [timetableData]);

  const teachers = useMemo(() => {
    if (isTeacherMode) return [];
    const unique = new Map<string, string>();
    safeData.forEach((s) => {
      if (s.teacherUid && !unique.has(s.teacherUid)) unique.set(s.teacherUid, s.teacherName);
    });
    return Array.from(unique.entries()).map(([uid, name]) => ({ uid, name }));
  }, [safeData, isTeacherMode]);

  const grades = useMemo(() => {
    return Array.from(new Set(safeData.map((s) => s.grade.trim()))).sort();
  }, [safeData]);

  useEffect(() => {
    if (!isTeacherMode && teachers.length > 0 && !selectedTeacherUid) {
      setSelectedTeacherUid(teachers[0].uid);
    }
  }, [teachers, selectedTeacherUid, isTeacherMode]);

  useEffect(() => {
    if (grades.length > 0 && !selectedGrade) setSelectedGrade(grades[0]);
  }, [grades, selectedGrade]);

  const filteredData = useMemo(() => {
    // "consolidated" always returns ALL slots — in teacher mode this is the full master timetable
    if (viewType === "consolidated") return safeData;
    if (viewType === "individual") return safeData.filter((s) => s.teacherUid === selectedTeacherUid);
    if (viewType === "grade") return safeData.filter((s) => s.grade.trim() === selectedGrade);
    return safeData;
  }, [viewType, selectedTeacherUid, selectedGrade, safeData]);

  const displayName = useMemo(() => {
    if (viewType === "individual") {
      const name = isTeacherMode
        ? lockedTeacherName || "My Schedule"
        : teachers.find((t) => t.uid === selectedTeacherUid)?.name || "Teacher";
      return `${name} — Schedule`;
    }
    if (viewType === "grade") return `${selectedGrade} Timetable`;
    return "Master School Timetable";
  }, [viewType, selectedGrade, selectedTeacherUid, teachers, isTeacherMode, lockedTeacherName]);

  const timeSlots = useMemo(() => {
    return Array.from(new Set(filteredData.map((s) => normalizeTime(s.time)))).sort();
  }, [filteredData]);

  const buildScheduleMap = (data: TimetableSlot[]) => {
    const map: Record<string, { label: string; key: string }[]> = {};
    data.forEach((slot) => {
      const mapKey = `${normalizeDay(slot.day)}-${normalizeTime(slot.time)}`;
      if (!map[mapKey]) map[mapKey] = [];
      const label =
        viewType === "individual"
          ? `${slot.subject}\n${slot.grade}`
          : viewType === "grade"
          ? `${slot.subject}\n${slot.teacherName}`
          : `${slot.subject}\n${slot.grade} · ${slot.teacherName}`;
      const uniqueKey = `${slot.subject}|${slot.grade}|${slot.teacherUid}`;
      if (!map[mapKey].some((x) => x.key === uniqueKey)) {
        map[mapKey].push({ label, key: uniqueKey });
      }
    });
    return map;
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF("landscape");
    const scheduleMap = buildScheduleMap(filteredData);
    const rows = timeSlots.map((time) => [
      time,
      ...DAYS.map((day) => {
        const cell = scheduleMap[`${normalizeDay(day)}-${normalizeTime(time)}`] || [];
        return cell.map((x) => x.label).join("\n────────\n");
      }),
    ]);
    doc.setFontSize(14);
    doc.text(displayName, 14, 12);
    autoTable(doc, {
      startY: 20,
      head: [["Time", ...DAYS]],
      body: rows,
      theme: "grid",
      styles: { fontSize: 7, halign: "center", valign: "middle", cellPadding: 3 },
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold" },
      columnStyles: { 0: { cellWidth: 18, fontStyle: "bold" } },
    });
    doc.save(`${displayName.replace(/\s+/g, "_")}.pdf`);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="bg-indigo-600 hover:bg-indigo-700 flex gap-2 shadow-lg">
          <FileText className="w-4 h-4" />
          {isTeacherMode ? "View My Timetable" : "View Master Timetable"}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Eye className="w-5 h-5 text-indigo-600" />
            {displayName}
          </DialogTitle>
        </DialogHeader>

        {/* SCOPE CONTROLS */}
        <div className="flex flex-wrap gap-6 items-end bg-slate-50 p-4 rounded-lg border mb-2">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">
              {isTeacherMode ? "View" : "Report Scope"}
            </label>
            <div className="flex gap-2">
              {isTeacherMode ? (
                <>
                  <Button
                    size="sm"
                    onClick={() => setViewType("individual")}
                    variant={viewType === "individual" ? "default" : "outline"}
                  >
                    My Schedule
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setViewType("consolidated")}
                    variant={viewType === "consolidated" ? "default" : "outline"}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Master Timetable
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    onClick={() => setViewType("consolidated")}
                    variant={viewType === "consolidated" ? "default" : "outline"}
                  >
                    <Users className="w-4 h-4 mr-2" /> All School
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setViewType("grade")}
                    variant={viewType === "grade" ? "default" : "outline"}
                  >
                    By Grade
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setViewType("individual")}
                    variant={viewType === "individual" ? "default" : "outline"}
                  >
                    By Teacher
                  </Button>
                </>
              )}
            </div>
          </div>

          {!isTeacherMode && viewType === "grade" && (
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Grade</label>
              <select
                className="border rounded-lg p-2 text-sm bg-white"
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
              >
                {grades.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          )}

          {!isTeacherMode && viewType === "individual" && (
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Teacher</label>
              <select
                className="border rounded-lg p-2 text-sm bg-white"
                value={selectedTeacherUid}
                onChange={(e) => setSelectedTeacherUid(e.target.value)}
              >
                {teachers.map((t) => <option key={t.uid} value={t.uid}>{t.name}</option>)}
              </select>
            </div>
          )}

          <div className="ml-auto text-[10px] font-black text-slate-400 uppercase tracking-widest self-end pb-1">
            {filteredData.length} slot{filteredData.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* PREVIEW TABLE */}
        <div className="flex-1 overflow-auto bg-slate-100 p-4 rounded-xl">
          {timeSlots.length === 0 ? (
            <div className="text-center text-gray-400 py-20 text-sm font-bold">
              No timetable data to display
            </div>
          ) : (
            <table className="w-full border-collapse bg-white text-xs rounded-xl overflow-hidden shadow">
              <thead>
                <tr className="bg-indigo-600 text-white">
                  <th className="p-3 font-black text-left w-20">Time</th>
                  {DAYS.map((d) => <th key={d} className="p-3 font-black text-center">{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((time, rowIdx) => (
                  <tr key={time} className={rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="p-3 font-black text-indigo-600 border-r border-slate-100 whitespace-nowrap">
                      {time}
                    </td>
                    {DAYS.map((day) => {
                      const matches = filteredData.filter(
                        (s) =>
                          normalizeDay(s.day) === normalizeDay(day) &&
                          normalizeTime(s.time) === normalizeTime(time)
                      );
                      const seen = new Set<string>();
                      const unique = matches.filter((m) => {
                        const k = `${m.subject}|${m.grade}|${m.teacherUid}`;
                        if (seen.has(k)) return false;
                        seen.add(k);
                        return true;
                      });
                      return (
                        <td key={day} className="p-2 border border-slate-100 align-top">
                          {unique.length === 0 ? (
                            <div className="text-slate-200 text-center">—</div>
                          ) : (
                            unique.map((m, i) => (
                              <div key={i} className="bg-indigo-50 border border-indigo-100 p-2 mb-1 rounded-lg last:mb-0">
                                <div className="font-black text-slate-800 leading-tight">{m.subject}</div>
                                <div className="text-[10px] text-indigo-500 font-bold mt-0.5">
                                  {viewType === "individual"
                                    ? m.grade
                                    : viewType === "grade"
                                    ? m.teacherName
                                    : `${m.grade} · ${m.teacherName}`}
                                </div>
                              </div>
                            ))
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex justify-between items-center gap-3 p-4 border-t">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            {isTeacherMode && viewType === "individual" && "Your assigned slots only"}
            {isTeacherMode && viewType === "consolidated" && "Master timetable — read only"}
            {!isTeacherMode && viewType === "consolidated" && "All grades — switch to 'By Grade' for a cleaner per-class view"}
            {!isTeacherMode && viewType === "grade" && `Showing ${selectedGrade} only`}
            {!isTeacherMode && viewType === "individual" && "Showing selected teacher's slots only"}
          </p>
          <Button onClick={handleDownloadPDF} className="bg-emerald-600 hover:bg-emerald-700">
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}