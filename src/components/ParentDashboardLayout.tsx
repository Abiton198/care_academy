import React from "react";
import { Outlet, NavLink } from "react-router-dom";

export default function ParentDashboardLayout() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white shadow-md p-4">
        <h2 className="text-lg font-semibold mb-4">Parent Dashboard</h2>
        <nav className="flex flex-col gap-2">
          <NavLink
            to="/parent/payments"
            className={({ isActive }) =>
              `p-2 rounded ${isActive ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"}`
            }
          >
            💳 Payments
          </NavLink>

          <NavLink
            to="/parent/status"
            className={({ isActive }) =>
              `p-2 rounded ${isActive ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"}`
            }
          >
            📋 Application Status
          </NavLink>

          <NavLink
            to="/parent/profile"
            className={({ isActive }) =>
              `p-2 rounded ${isActive ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"}`
            }
          >
            👤 Profile
          </NavLink>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6">
        {/* Outlet renders nested routes like /parent/payments or /parent/status */}
        <Outlet />
      </main>
    </div>
  );
}
