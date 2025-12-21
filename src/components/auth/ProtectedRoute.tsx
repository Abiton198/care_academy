"use client";

import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";

interface ProtectedRouteProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-lg font-medium">
        Checking authentication...
      </div>
    );
  }

  // Not logged in at all → back to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Role mismatch → send back to login with a query param
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/login?unauthorized=true" replace />;
  }

  return <>{children}</>;
};
