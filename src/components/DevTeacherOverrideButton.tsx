import React, { useState } from "react";
// 1. Double check this path! Is it definitely in ../lib/ ?
import { activateTeacher } from "../lib/activateTeacher";

interface TeacherCardProps {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
}

const TeacherCard: React.FC<TeacherCardProps> = ({
  uid,
  email,
  firstName,
  lastName,
}) => {
  const [loading, setLoading] = useState(false);

  const handleActivate = async () => {
    // 2. CHECK: Is the UID actually there?
    if (!uid) {
      console.error("❌ Cannot activate: UID is missing!");
      alert("Error: Teacher UID is missing.");
      return;
    }

    console.log("🚀 Attempting to activate:", { uid, firstName });

    try {
      setLoading(true);
      
      // We pass the object as required by the wrapper we built
      const response = await activateTeacher({
        uid, 
        email, 
        firstName, 
        lastName
      });

      console.log("✅ Server response:", response);
      alert("Teacher approved successfully");
    } catch (err: any) {
      // 3. CHECK: Is it a network error or a code error?
      console.error("🔥 Activation Error:", err);
      alert(err.message || "Approval failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-xl shadow-sm bg-white">
      <div className="mb-4">
        <p className="font-bold text-lg">{firstName} {lastName}</p>
        <p className="text-gray-500 text-sm">{email}</p>
        <p className="text-[10px] text-gray-400 mt-1 uppercase">ID: {uid}</p>
      </div>
      
      <button
        type="button" // 4. Ensure it's not trying to submit a form
        onClick={(e) => {
          e.preventDefault();
          handleActivate();
        }}
        disabled={loading}
        className={`w-full py-2 rounded-lg font-bold transition-all ${
          loading 
            ? "bg-gray-300 cursor-not-allowed" 
            : "bg-green-600 hover:bg-green-700 text-white"
        }`}
      >
        {loading ? "Activating..." : "Approve Teacher"}
      </button>
    </div>
  );
};

export default TeacherCard;