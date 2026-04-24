"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Download, Eye, FileText, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import type { TimetableSlot } from "@/types/timetable";

interface TimetableExportManagerProps {
  timetableData: TimetableSlot[];
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
const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ================= MOBILE DAY VIEW ================= */
// Shows one day at a time with prev/next navigation — replaces the wide table on mobile

const MobileDayView = ({
  filteredData,
  viewType,
  timeSlots,
}: {
  filteredData: TimetableSlot[];
  viewType: string;
  timeSlots: string[];
}) => {
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const activeDay = DAYS[activeDayIdx];

  const slotsForDay = useMemo(() => {
    return timeSlots
      .map((time) => {
        const matches = filteredData.filter(
          (s) =>
            normalizeDay(s.day) === normalizeDay(activeDay) &&
            normalizeTime(s.time) === normalizeTime(time)
        );
        const seen = new Set<string>();
        return {
          time,
          entries: matches.filter((m) => {
            const k = `${m.subject}|${m.grade}|${m.teacherUid}`;
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          }),
        };
      })
      .filter((slot) => slot.entries.length > 0);
  }, [filteredData, activeDay, timeSlots]);

  return (
    <div className="flex flex-col gap-3">
      {/* Day pill navigator */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-2 shadow-sm border border-slate-100">
        <button
          onClick={() => setActiveDayIdx((i) => Math.max(0, i - 1))}
          disabled={activeDayIdx === 0}
          className="p-2 rounded-xl disabled:opacity-25 hover:bg-slate-100 transition-colors"
        >
          <ChevronLeft size={16} className="text-slate-600" />
        </button>

        <div className="flex gap-1">
          {DAYS_SHORT.map((d, i) => (
            <button
              key={d}
              onClick={() => setActiveDayIdx(i)}
              className={`w-9 h-9 rounded-xl text-[10px] font-black uppercase transition-all ${
                i === activeDayIdx
                  ? "bg-indigo-600 text-white shadow-md scale-105"
                  : "text-slate-400 hover:bg-slate-100"
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        <button
          onClick={() => setActiveDayIdx((i) => Math.min(DAYS.length - 1, i + 1))}
          disabled={activeDayIdx === DAYS.length - 1}
          className="p-2 rounded-xl disabled:opacity-25 hover:bg-slate-100 transition-colors"
        >
          <ChevronRight size={16} className="text-slate-600" />
        </button>
      </div>

      {/* Active day label */}
      <p className="text-center text-xs font-black text-indigo-600 uppercase tracking-widest">
        {activeDay}
      </p>

      {/* Slots */}
      {slotsForDay.length === 0 ? (
        <div className="text-center py-14 text-slate-400 text-sm font-bold">
          No classes scheduled for {activeDay}
        </div>
      ) : (
        <div className="space-y-3">
          {slotsForDay.map(({ time, entries }) => (
            <div
              key={time}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
            >
              <div className="bg-indigo-600 px-4 py-2 flex items-center gap-2">
                <span className="text-white font-black text-xs">{time}</span>
              </div>
              <div className="divide-y divide-slate-50">
                {entries.map((m, i) => (
                  <div key={i} className="px-4 py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-black text-slate-800 text-sm leading-tight truncate">
                        {m.subject}
                      </div>
                      <div className="text-[11px] text-indigo-500 font-bold mt-0.5">
                        {viewType === "individual" ? m.grade : m.teacherName}
                      </div>
                    </div>
                    {viewType !== "individual" && (
                      <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-1 rounded-lg whitespace-nowrap shrink-0">
                        {m.grade}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ================= MAIN COMPONENT ================= */

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
          {/* Shorter label on mobile */}
          <span className="hidden sm:inline">
            {isTeacherMode ? "View My Timetable" : "Generate Reports"}
          </span>
          <span className="sm:hidden">Timetable</span>
        </Button>
      </DialogTrigger>

      {/* Full-screen on mobile, large modal on desktop */}
      <DialogContent className="
        w-full max-w-none sm:max-w-5xl
        h-[100dvh] sm:h-auto sm:max-h-[90vh]
        m-0 sm:m-auto
        rounded-none sm:rounded-2xl
        flex flex-col p-0 gap-0
      ">
        {/* HEADER */}
        <DialogHeader className="px-4 pt-5 pb-4 sm:px-6 border-b border-slate-100 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-xl font-black">
            <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 shrink-0" />
            <span className="truncate">{displayName}</span>
          </DialogTitle>
        </DialogHeader>

        {/* CONTROLS */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-slate-50 border-b border-slate-100 shrink-0 space-y-3">
          {/* Scope toggle */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
              {isTeacherMode ? "View" : "Report Scope"}
            </label>
            <div className="flex gap-2 flex-wrap">
              {isTeacherMode ? (
                <>
                  <Button
                    size="sm"
                    onClick={() => setViewType("individual")}
                    variant={viewType === "individual" ? "default" : "outline"}
                    className="text-xs h-9 rounded-xl flex-1 sm:flex-none"
                  >
                    My Schedule
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setViewType("consolidated")}
                    variant={viewType === "consolidated" ? "default" : "outline"}
                    className="text-xs h-9 rounded-xl flex-1 sm:flex-none"
                  >
                    <Users className="w-3 h-3 mr-1.5" />
                    Master Timetable
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    onClick={() => setViewType("consolidated")}
                    variant={viewType === "consolidated" ? "default" : "outline"}
                    className="text-xs h-9 rounded-xl flex-1 sm:flex-none"
                  >
                    <Users className="w-3 h-3 mr-1.5" />
                    All School
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setViewType("grade")}
                    variant={viewType === "grade" ? "default" : "outline"}
                    className="text-xs h-9 rounded-xl flex-1 sm:flex-none"
                  >
                    By Grade
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setViewType("individual")}
                    variant={viewType === "individual" ? "default" : "outline"}
                    className="text-xs h-9 rounded-xl flex-1 sm:flex-none"
                  >
                    By Teacher
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Grade selector */}
          {!isTeacherMode && viewType === "grade" && (
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                Grade
              </label>
              <select
                className="w-full sm:w-56 border rounded-xl p-2.5 text-sm bg-white"
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
              >
                {grades.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          )}

          {/* Teacher selector */}
          {!isTeacherMode && viewType === "individual" && (
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                Teacher
              </label>
              <select
                className="w-full sm:w-56 border rounded-xl p-2.5 text-sm bg-white"
                value={selectedTeacherUid}
                onChange={(e) => setSelectedTeacherUid(e.target.value)}
              >
                {teachers.map((t) => <option key={t.uid} value={t.uid}>{t.name}</option>)}
              </select>
            </div>
          )}

          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {filteredData.length} slot{filteredData.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* PREVIEW */}
        <div className="flex-1 overflow-auto bg-slate-100 p-3 sm:p-4">
          {timeSlots.length === 0 ? (
            <div className="text-center text-gray-400 py-20 text-sm font-bold">
              No timetable data to display
            </div>
          ) : (
            <>
              {/* ── Mobile: one day at a time ── */}
              <div className="block sm:hidden">
                <MobileDayView
                  filteredData={filteredData}
                  viewType={viewType}
                  timeSlots={timeSlots}
                />
              </div>

              {/* ── Desktop: full grid table ── */}
              <div className="hidden sm:block">
                <table className="w-full border-collapse bg-white text-xs rounded-xl overflow-hidden shadow">
                  <thead>
                    <tr className="bg-indigo-600 text-white">
                      <th className="p-3 font-black text-left w-20">Time</th>
                      {DAYS.map((d) => (
                        <th key={d} className="p-3 font-black text-center">{d}</th>
                      ))}
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
                                  <div
                                    key={i}
                                    className="bg-indigo-50 border border-indigo-100 p-2 mb-1 rounded-lg last:mb-0"
                                  >
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
              </div>
            </>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 p-4 border-t bg-white shrink-0">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            {isTeacherMode && viewType === "individual" && "Your assigned slots only"}
            {isTeacherMode && viewType === "consolidated" && "Master timetable — read only"}
            {!isTeacherMode && viewType === "consolidated" && "All grades shown"}
            {!isTeacherMode && viewType === "grade" && `Showing ${selectedGrade} only`}
            {!isTeacherMode && viewType === "individual" && "Selected teacher's slots only"}
          </p>
          <Button
            onClick={handleDownloadPDF}
            className="bg-emerald-600 hover:bg-emerald-700 rounded-xl w-full sm:w-auto"
          >
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}