import React from "react";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebaseConfig";

const SuspendedScreen: React.FC = () => {
  const handleLogout = async () => {
    await auth.signOut();
    window.location.href = "/admin-login"; // or "/" if you want general landing
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="bg-white shadow-md rounded-lg p-8 max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-red-600 mb-4">
          Account Suspended
        </h1>
        <p className="text-gray-700 mb-6">
          Your account has been suspended by the school administration.
          <br />
          Please contact your principal or school administrator for more details.
        </p>

        <Button onClick={handleLogout} className="w-full">
          Return to Login
        </Button>
      </div>
    </main>
  );
};

export default SuspendedScreen;
