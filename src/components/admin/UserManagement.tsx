import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebaseConfig";
import {
  collection,
  doc,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import { sendPasswordResetEmail, getAuth } from "firebase/auth";
import { httpsCallable, getFunctions } from "firebase/functions";
import { useAuth } from "../auth/AuthProvider";

// Predefined dropdowns
const GRADES = Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`);
const STEM_SUBJECTS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
];

const UserManagement: React.FC = () => {
  const { user } = useAuth();
  const functions = getFunctions();

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Collapsible cards
  const [showCreateCard, setShowCreateCard] = useState(false);
  const [showUsersCard, setShowUsersCard] = useState(true);

  // Form state
  const [role, setRole] = useState<"student" | "teacher" | "parent" | "admin">(
    "student"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [grade, setGrade] = useState(""); // student
  const [subject, setSubject] = useState(""); // teacher
  const [childName, setChildName] = useState(""); // parent
  const [childGrade, setChildGrade] = useState(""); // parent
  const [showPassword, setShowPassword] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterSubject, setFilterSubject] = useState("");

  // ✅ Create user via Cloud Function
  const handleCreateUser = async () => {
    try {
      setLoading(true);

      const extraData: Record<string, any> = {};
      if (role === "student") extraData.grade = grade;
      if (role === "teacher") extraData.subject = subject;
      if (role === "parent") {
        extraData.childName = childName;
        extraData.childGrade = childGrade;
      }

      const createFn = httpsCallable(functions, "createUserProfile");
      await createFn({
        role,
        email,
        password,
        name,
        extraData: { ...extraData, createdBy: user?.email || "system" },
      });

      alert(`${role} profile created successfully!`);
      setEmail("");
      setPassword("");
      setName("");
      setGrade("");
      setSubject("");
      setChildName("");
      setChildGrade("");

      fetchUsers();
    } catch (err: any) {
      console.error("Error creating user:", err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Reset password
  const handleResetPassword = async (userEmail: string) => {
    try {
      await sendPasswordResetEmail(getAuth(), userEmail);
      alert(`Password reset email sent to ${userEmail}`);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // ✅ Delete user via Cloud Function
  const handleDeleteUser = async (u: any) => {
    if (!window.confirm(`Delete ${u.name} (${u.email})?`)) return;

    try {
      setLoading(true);

      const delFn = httpsCallable(functions, "deleteUser");
      await delFn({ targetUid: u.uid, role: u.role });

      alert(`Deleted ${u.role} ${u.name}`);
      fetchUsers();
    } catch (err: any) {
      console.error("Delete error:", err);
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch users
  const fetchUsers = async () => {
    setLoading(true);
    const all: any[] = [];
    for (const col of ["students", "teachers", "parents", "admins"]) {
      const snap = await getDocs(
        query(collection(db, col), orderBy("createdAt", "desc"))
      );
      snap.forEach((d) => all.push(d.data()));
    }
    setUsers(all);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Apply search + filters
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());

    const matchesRole = filterRole === "all" || u.role === filterRole;
    const matchesGrade =
      !filterGrade || (u.role === "student" && u.grade === filterGrade);
    const matchesSubject =
      !filterSubject || (u.role === "teacher" && u.subject === filterSubject);

    return matchesSearch && matchesRole && matchesGrade && matchesSubject;
  });

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Create User Card */}
      <div className="bg-white rounded-lg shadow">
        <div
          className="flex justify-between items-center p-4 border-b cursor-pointer"
          onClick={() => setShowCreateCard(!showCreateCard)}
        >
          <h2 className="text-lg font-bold">Create User</h2>
          <span>{showCreateCard ? "−" : "+"}</span>
        </div>
        {showCreateCard && (
          <div className="p-4 space-y-4">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="parent">Parent</option>
              <option value="admin">Admin</option>
            </select>

            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border rounded px-3 py-2 pr-16"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-2 flex items-center text-sm text-blue-600"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            {role === "student" && (
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Select Grade</option>
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            )}

            {role === "teacher" && (
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Select Subject</option>
                {STEM_SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}

            {role === "parent" && (
              <>
                <input
                  type="text"
                  placeholder="Child Name"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                />
                <select
                  value={childGrade}
                  onChange={(e) => setChildGrade(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Select Child Grade</option>
                  {GRADES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </>
            )}

            <button
              onClick={handleCreateUser}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            >
              {loading ? "Creating..." : `Create ${role}`}
            </button>
          </div>
        )}
      </div>

      {/* Users List Card */}
      <div className="bg-white rounded-lg shadow">
        <div
          className="flex justify-between items-center p-4 border-b cursor-pointer"
          onClick={() => setShowUsersCard(!showUsersCard)}
        >
          <h2 className="text-lg font-bold">All Users</h2>
          <span>{showUsersCard ? "−" : "+"}</span>
        </div>
        {showUsersCard && (
          <div className="p-4 space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                placeholder="Search name/email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border rounded px-3 py-2 flex-1"
              />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="border rounded px-3 py-2"
              >
                <option value="all">All Roles</option>
                <option value="student">Students</option>
                <option value="teacher">Teachers</option>
                <option value="parent">Parents</option>
                <option value="admin">Admins</option>
              </select>
              {filterRole === "student" && (
                <select
                  value={filterGrade}
                  onChange={(e) => setFilterGrade(e.target.value)}
                  className="border rounded px-3 py-2"
                >
                  <option value="">All Grades</option>
                  {GRADES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              )}
              {filterRole === "teacher" && (
                <select
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                  className="border rounded px-3 py-2"
                >
                  <option value="">All Subjects</option>
                  {STEM_SUBJECTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Users table */}
            {loading ? (
              <p>Loading...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 border">Name</th>
                      <th className="p-2 border">Email</th>
                      <th className="p-2 border">Role</th>
                      <th className="p-2 border">Extra</th>
                      <th className="p-2 border">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.uid} className="text-center">
                        <td className="border p-2">{u.name}</td>
                        <td className="border p-2">{u.email}</td>
                        <td className="border p-2">{u.role}</td>
                        <td className="border p-2">
                          {u.role === "student" && u.grade}
                          {u.role === "teacher" && u.subject}
                          {u.role === "parent" &&
                            `${u.childName} (${u.childGrade})`}
                        </td>
                        <td className="border p-2 space-x-2">
                          <button
                            onClick={() => handleResetPassword(u.email)}
                            className="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600 text-xs"
                          >
                            Reset Password
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 text-xs"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
