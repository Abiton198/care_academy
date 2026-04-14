"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface StudentSession {
  studentId: string;
  firstName: string;
  lastName?: string;
  grade: string;
  role: "student";
}

interface StudentAuthContextType {
  student: StudentSession | null;
  isLoading: boolean;
  login: (data: StudentSession) => void;
  logout: () => void;
}

const StudentAuthContext = createContext<StudentAuthContextType>({
  student: null,
  isLoading: true,
  login: () => { },
  logout: () => { },
});

export const StudentAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [student, setStudent] = useState<StudentSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load session from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem("studentSession");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setStudent(parsed);
      } catch (e) {
        console.error("Failed to parse student session");
        sessionStorage.removeItem("studentSession");
      }
    }
    setIsLoading(false);
  }, []);

  const login = (data: StudentSession) => {
    setStudent(data);
    sessionStorage.setItem("studentSession", JSON.stringify(data));
  };

  const logout = () => {
    setStudent(null);
    sessionStorage.removeItem("studentSession");
  };

  return (
    <StudentAuthContext.Provider value={{ student, isLoading, login, logout }}>
      {children}
    </StudentAuthContext.Provider>
  );
};

export const useStudentAuth = () => useContext(StudentAuthContext);