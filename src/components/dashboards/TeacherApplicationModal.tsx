"use client";

import TeacherApplicationForm from "../auth/TeacherApplicationForm";
import { auth } from "@/lib/firebaseConfig";
import { signOut } from "firebase/auth";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void; // Added to trigger the dashboard redirect
  applicationId?: string | null;
  userId?: string | null;
}

export default function TeacherApplicationModal({
  open,
  onClose,
  onSubmitted,
  applicationId,
  userId
}: Props) {
  if (!open) return null;

  const handleForcedExit = async () => {
    // Prevents redirect loops if they close the window without applying
    await signOut(auth);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] shadow-2xl relative animate-in zoom-in-95 duration-300">
        
        {/* Header / Close Button */}
        <div className="sticky top-0 bg-white z-10 p-6 border-b border-slate-50 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-slate-900">Professional Application</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter">British Curriculum Educator Registry</p>
          </div>
          <button 
            onClick={handleForcedExit}
            className="p-2 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* The Form Content */}
        <div className="p-8">
          <TeacherApplicationForm
            applicationId={applicationId} // The draft ID
            userId={applicationId}        // Also pass as userId (since we used the UID as the draft ID)
            onClose={onClose}
            onSubmitted={onSubmitted}
          />
        </div>
      </div>
    </div>
  );
}