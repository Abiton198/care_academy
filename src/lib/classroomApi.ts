// src/lib/classroomApi.ts
export async function fetchCourses(token: string) {
  const r = await fetch('https://classroom.googleapis.com/v1/courses', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await r.json();
  return data.courses ?? [];
}

export async function fetchCoursework(courseId: string, token: string) {
  const r = await fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/courseWork`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await r.json();
  return data.courseWork ?? [];
}
