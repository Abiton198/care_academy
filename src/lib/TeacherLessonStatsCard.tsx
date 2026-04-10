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

  /** ---------------- STUDENT LOOKUP ---------------- */
  const studentsPerSubject = useMemo(() => {
    const map: Record<string, number> = {};

    students.forEach(s => {
      if (!Array.isArray(s.subjects)) return;
      s.subjects.forEach((sub: string) => {
        map[sub] = (map[sub] || 0) + 1;
      });
    });

    return map;
  }, [students]);

  /** ---------------- STAGE 4+5 DEDUPLICATION ---------------- */
  /**
   * If two timetable slots share the same:
   *   teacherUid + day + time + subject
   * and their grades are "Stage 4" and "Stage 5",
   * they represent ONE combined class period — deduplicate to a single slot.
   */
  const deduplicatedTimetable = useMemo(() => {
    const combinedStages = new Set(["Stage 4", "Stage 5"]);
    const seenCombinedKeys = new Set<string>();
    const result: any[] = [];

    timetable.forEach(slot => {
      if (combinedStages.has(slot.grade)) {
        // Build a key that is stage-agnostic — same period regardless of Stage 4 or 5
        const key = `${slot.teacherUid}|${slot.day}|${slot.time}|${slot.subject}`;

        if (seenCombinedKeys.has(key)) {
          // Second stage for this period — skip it, already counted
          return;
        }
        seenCombinedKeys.add(key);
      }

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

      // SKIP subjects with no enrolled students — excluded from all lesson totals
      const enrolledCount = studentsPerSubject[slot.subject] || 0;
      if (enrolledCount === 0) return;

      // WEEKLY: every deduplicated slot counts once
      teacher.weekly += 1;

      // MONTHLY: weekday occurrences × slots
      teacher.monthly += weekdayOccurrencesThisMonth(dayIndex);

      // DAILY: only if today matches slot day
      if (today.getDay() === dayIndex) {
        teacher.daily += 1;
      }

      // SUBJECT BUCKET
      if (!teacher.subjects[slot.subject]) {
        teacher.subjects[slot.subject] = {
          weekly: 0,
          monthly: 0,
          students: enrolledCount,
        };
      }

      teacher.subjects[slot.subject].weekly += 1;
      teacher.subjects[slot.subject].monthly += weekdayOccurrencesThisMonth(dayIndex);
    });

    return Object.values(teachers);
  }, [deduplicatedTimetable, studentsPerSubject]);

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