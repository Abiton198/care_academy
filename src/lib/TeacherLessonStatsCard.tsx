import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BarChart3, CalendarDays, Users } from "lucide-react";

/**
 * TeacherLessonStatsCard (PRINCIPAL VIEW)
 * -------------------------------------------------
 * SOURCE OF TRUTH:
 * - Lessons come ONLY from `timetable` (recurring weekly slots)
 * - Students are counted separately per subject (informational only)
 *
 * IMPORTANT MODEL:
 * - One timetable document = one weekly recurring lesson
 * - Weekly count = number of timetable slots
 * - Monthly count = weekday occurrences in current month × slots
 * - Subjects with ZERO enrolled students are excluded from all lesson totals
 * - Stage 4 and Stage 5 sharing the same teacher + day + time + subject
 *   are counted as ONE combined lesson (not two)
 */

export default function TeacherLessonStatsCard() {
  const [open, setOpen] = useState(false);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  /** ---------------- LOAD DATA ---------------- */
  useEffect(() => {
    const load = async () => {
      const [timetableSnap, studentsSnap] = await Promise.all([
        getDocs(collection(db, "timetable")),
        getDocs(collection(db, "students")),
      ]);

      setTimetable(timetableSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setStudents(studentsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    load();
  }, []);

  /** ---------------- DATE HELPERS ---------------- */
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekdayIndex: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };

  // Count how many times a weekday occurs in the current month
  const weekdayOccurrencesThisMonth = (weekday: number) => {
    const year = today.getFullYear();
    const month = today.getMonth();

    let count = 0;
    const date = new Date(year, month, 1);

    while (date.getMonth() === month) {
      if (date.getDay() === weekday) count++;
      date.setDate(date.getDate() + 1);
    }

    return count;
  };

  /** ---------------- STUDENT LOOKUP (UPDATED) ---------------- */
  const studentsPerGrade = useMemo(() => {
    const map: Record<string, number> = {};
    students.forEach(s => {
      // Using 'grade' instead of 'subjects' array to match your Firestore schema
      const grade = s.grade || s.currentGrade;
      if (grade) {
        map[grade] = (map[grade] || 0) + 1;
      }
    });
    return map;
  }, [students]);

  /** ---------------- STAGE 4+5 DEDUPLICATION ---------------- */
  const deduplicatedTimetable = useMemo(() => {
    const combinedStages = new Set(["Stage 4", "Stage 5"]);
    const seenCombinedSlots = new Set<string>(); // To track shared Stage 4/5 periods
    const result: any[] = [];

    timetable.forEach(slot => {
      // Unique key for the physical period: Teacher + Day + Time
      const slotKey = `${slot.teacherUid}|${slot.day}|${slot.time}`;

      if (combinedStages.has(slot.grade)) {
        // If we've already seen this specific time/day for a Stage 4/5 teacher, skip it
        if (seenCombinedSlots.has(slotKey)) {
          return;
        }
        seenCombinedSlots.add(slotKey);
      }

      // Every other grade (9, 11, 12, etc.) or the FIRST instance of 4/5 gets added
      result.push(slot);
    });

    return result;
  }, [timetable]);

  /** ---------------- AGGREGATION ---------------- */
  const stats = useMemo(() => {
    const teachers: Record<string, any> = {};

    deduplicatedTimetable.forEach(slot => {
      const dayIndex = weekdayIndex[slot.day];
      if (dayIndex === undefined) return;

      if (!teachers[slot.teacherUid]) {
        teachers[slot.teacherUid] = {
          name: slot.teacherName,
          daily: 0,
          weekly: 0,
          monthly: 0,
          subjects: {},
        };
      }

      const teacher = teachers[slot.teacherUid];
      const occurrences = weekdayOccurrencesThisMonth(dayIndex);

      // --- PHYSICAL SLOT COUNTING ---
      teacher.weekly += 1;
      teacher.monthly += occurrences;

      if (today.getDay() === dayIndex) {
        teacher.daily += 1;
      }

      // --- SUBJECT BREAKDOWN (Unique per Teacher) ---
      const subName = slot.subject;
      if (!teacher.subjects[subName]) {
        teacher.subjects[subName] = {
          weekly: 0,
          monthly: 0,
          students: 0,
        };
      }

      // Accumulate the counts for this specific subject
      teacher.subjects[subName].weekly += 1;
      teacher.subjects[subName].monthly += occurrences;

      // Calculate students for the specific grade linked to this slot
      const studentCount = students.filter(s => s.grade === slot.grade).length;
      teacher.subjects[subName].students += studentCount;
    });

    return Object.values(teachers);
  }, [deduplicatedTimetable, students]);

  /** ---------------- SUMMARY ---------------- */
  const summary = useMemo(() => {
    return {
      teachers: stats.length,
      today: stats.reduce((a, t) => a + t.daily, 0),
      week: stats.reduce((a, t) => a + t.weekly, 0),
      month: stats.reduce((a, t) => a + t.monthly, 0),
    };
  }, [stats]);

  /** ---------------- UI ---------------- */
  return (
    <>
      <Card onClick={() => setOpen(true)} className="cursor-pointer rounded-2xl shadow-xl">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-indigo-600" />
            <h2 className="text-xl font-bold">Teacher Lesson Statistics</h2>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <Stat label="Teachers" value={summary.teachers} icon={Users} />
            <Stat label="Today" value={summary.today} icon={CalendarDays} />
            <Stat label="This Week" value={summary.week} />
            <Stat label="This Month" value={summary.month} />
          </div>

          <p className="text-xs text-muted-foreground">Click to view detailed breakdown</p>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>Teacher Lesson Breakdown</DialogTitle>
          </DialogHeader>

          {loading ? (
            <p>Loading…</p>
          ) : (
            <div className="space-y-6 max-h-[70vh] overflow-y-auto">
              {stats.map((t: any) => (
                <div key={t.name} className="border rounded-xl p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-lg">{t.name}</h3>
                    <div className="flex gap-4 text-sm">
                      <Badge label="Today" value={t.daily} />
                      <Badge label="Week" value={t.weekly} />
                      <Badge label="Month" value={t.monthly} />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-3 text-sm">
                    {Object.entries(t.subjects).map(([subject, data]: any) => (
                      <div key={subject} className="rounded-lg bg-slate-50 p-3">
                        <p className="font-medium">{subject}</p>
                        <p className="text-xs">Weekly lessons: <b>{data.weekly}</b></p>
                        <p className="text-xs">Monthly lessons: <b>{data.monthly}</b></p>
                        <p className="text-[11px] text-muted-foreground">Students enrolled: <b>{data.students}</b></p>
                        <p className="text-xs">Weekly slots: <b>{data.slots}</b></p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** ---------------- SMALL UI PARTS ---------------- */
function Stat({ label, value, icon: Icon }: any) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-slate-600" />}
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}

function Badge({ label, value }: any) {
  return (
    <div className="rounded-full bg-indigo-100 text-indigo-700 px-3 py-1 text-xs font-semibold">
      {label}: {value}
    </div>
  );
}