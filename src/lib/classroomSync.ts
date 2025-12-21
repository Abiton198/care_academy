// src/lib/classroomSync.ts
import { db } from '@/lib/firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import { fetchCourses, fetchCoursework } from './classroomApi';

export async function syncClassroomToFirestore(uid: string, token: string, role: 'teacher'|'student') {
  const courses = await fetchCourses(token);

  for (const c of courses) {
    await setDoc(doc(db, `users/${uid}/classroom/courses/${c.id}`), {
      id: c.id,
      name: c.name,
      section: c.section,
      room: c.room,
      alternateLink: c.alternateLink,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    const works = await fetchCoursework(c.id, token);
    for (const w of works) {
      await setDoc(doc(db, `users/${uid}/classroom/courses/${c.id}/coursework/${w.id}`), {
        id: w.id,
        title: w.title,
        workType: w.workType,
        dueDate: w.dueDate,
        state: w.state,
        maxPoints: w.maxPoints,
        updateTime: w.updateTime,
      }, { merge: true });
    }
  }
}
