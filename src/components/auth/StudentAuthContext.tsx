"use client";

import React, { createContext, useContext, useState } from "react";

interface StudentSession {
  id: string;
  firstName: string;
  lastName: string;
  grade: string;
  parentId: string;
}

const StudentAuthContext = createContext<{
  student: StudentSession | null;
  login: (data: StudentSession) => void;
  logout: () => void;
}>({
  student: null,
  login: () => {},
  logout: () => {},
});

export const StudentAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [student, setStudent] = useState<StudentSession | null>(null);

  const login = (data: StudentSession) => {
    setStudent(data);
    localStorage.setItem("studentSession", JSON.stringify(data));
  };

  const logout = () => {
    setStudent(null);
    localStorage.removeItem("studentSession");
  };

  return (
    <StudentAuthContext.Provider value={{ student, login, logout }}>
      {children}
    </StudentAuthContext.Provider>
  );
};

export const useStudentAuth = () => useContext(StudentAuthContext);
