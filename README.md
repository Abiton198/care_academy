## NextGen Online Support School – 

### Overview
A role-based online school dashboard system built with React, TypeScript, Firebase (Auth, Firestore, Storage), Tailwind CSS, and shadcn/ui. Supports parents, students, teachers, and principals with real-time features like timetables, chat, attendance, and payments.

### Tech Stack
- **Frontend**: React 18, TypeScript, React Router v6
- **Backend**: Firebase v9 (Firestore, Auth, Storage)
- **UI**: Tailwind CSS, shadcn/ui, Lucide Icons
- **State**: React Hooks, Context (AuthProvider)
- **Deployment**: Netlify Hosting

### Project Structure
```
src/
├── components/
│   ├── auth/ (AuthProvider.tsx)
│   ├── chat/ (ChatWidget.tsx)
│   ├── dashboards/ (ParentDashboard.tsx, StudentDashboard.tsx, TeacherDashboard.tsx, PrincipalDashboard.tsx)
│   ├── sections/ (PaymentsSection.tsx, Registration.tsx, Settings.tsx, Status.tsx,      CommunicationsSection.tsx.)
│   └── ui/ (shadcn components)
├── lib/
│   ├── firebaseConfig.ts
│   └── TimetableManager.tsx
|    |___utils.ts
├── pages/ (AboutUs.tsx, NotFound.tsx)
├── App.tsx (Routing)
├── main.tsx (Entry)
└── index.css (Tailwind)
```

### Key Features
- **Auth**: Role-based (parent, teacher, principal) with Google login
- **Parent Dashboard**: Register child, pay fees, view timetable, chat
- **Student Dashboard**: Timetable, class links (Zoom/Classroom), attendance stats
- **Teacher Dashboard**: Manage links, view students, mark attendance, chat
- **Principal Dashboard**: Approve/reject, stats (CAPS/Cambridge), timetable manager
- **Timetable**: Weekly, collapsible, real-time, CAPS/Cambridge filter
- **Chat**: Real-time parent-teacher, typing indicators, history
- **Attendance**: Live stats, progress bars
- **Payments**: Per-student tracking
- **Dark Mode**: Toggle in student dashboard

### Firestore Schema
- `users/{uid}`: { role: "parent/teacher/principal" }
- `parents/{uid}`: { name, email }
- `students/{id}`: { firstName, lastName, grade, subjects[], curriculum, parentId, status }
- `teachers/{uid}`: { firstName, lastName, subject, contact, zoomLink, googleClassroomLink, status }
- `timetable/{id}`: { grade, subject, day, time, duration, teacherName, curriculum }
- `attendance/{id}`: { studentId, subject, date, status: "present/absent" }
- `registrations/{studentId}/payments/{id}`: { amount, paymentStatus }
- `conversations/{convId}`: { participants[], lastMessage, lastMessageTime }
  - `/messages/{msgId}`: { text, sender, timestamp }

### Setup & Installation
1. Clone repo: `git clone <git@github.com:Abiton198/nextgen-online-school.git>`
2. Install: `npm install`
3. Add `.env.local` with Firebase keys:
   ```
   VITE_FIREBASE_API_KEY=xxx
   VITE_FIREBASE_AUTH_DOMAIN=xxx
   VITE_FIREBASE_PROJECT_ID=xxx
   VITE_FIREBASE_STORAGE_BUCKET=xxx
   VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
   VITE_FIREBASE_APP_ID=xxx
   ```
4. Run: `npm run dev`

### Deployment
- **Netlify**: `netlify --prod`
- **Firebase**: `firebase deploy --only hosting`

### Security Rules (Firestore)
```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Parents: own profile
    match /parents/{parentId} {
      allow read, write: if request.auth.uid == parentId;
    }

    // Students: parent reads own children
    match /students/{studentId} {
      allow read: if request.auth.uid == resource.data.parentId;
    }

    // Teachers: own profile
    match /teachers/{teacherId} {
      allow read, write: if request.auth.uid == teacherId;
    }

    // Timetable: read all, write principal
    match /timetable/{entryId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'principal';
    }

    // Conversations
    match /conversations/{convId} {
      allow read, write: if request.auth.uid in resource.data.participants;
      match /messages/{msgId} {
        allow read, write: if request.auth.uid in get(/databases/$(database)/documents/conversations/$(convId)).data.participants;
      }
    }

    // Default deny
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Future Enhancements
- **Grades & Reports**
- **Homework Upload**
- **Parent-Teacher Chat (Full)**
- **Mobile App**
- **Email Notifications**

### Contributing
1. Fork repo
2. Create branch: `git checkout -b feature/xyz`
3. Commit: `git commit -m "Add xyz"`
4. Push: `git push origin feature/xyz`
5. PR

### License
MIT – Free for educational use.

---

