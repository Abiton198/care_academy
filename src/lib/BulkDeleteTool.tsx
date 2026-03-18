import React, { useState } from 'react';
import { doc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { Trash2, AlertTriangle, UserX, CheckCircle } from "lucide-react";

// Inside your component, create a helper to get names correctly
const getDisplayName = (user: any) => {
  // Check for Student structure
  if (user.firstName) return `${user.firstName} ${user.lastName}`;
  // Check for Teacher/Application structure
  if (user.personalInfo?.firstName) return `${user.personalInfo.firstName} ${user.personalInfo.lastName}`;
  // Fallback for Users collection
  return user.email || "Unknown User";
};

// Use this for the ID to ensure checkboxes are unique

export const BulkDeleteTool = ({ teachers = [], students = [] }) => {
    const [isOpen, setIsOpen] = useState(false);
    const getUniqueId = (user: any) => user.uid || user.id || user.stdId;
  const [view, setView] = useState<'teachers' | 'students'>('teachers');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [step, setStep] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const list = view === 'teachers' ? teachers : students;

  const toggleSelection = (id: string) => {
    if (!id) return; // Prevent "ticking everyone" if ID is missing
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const getSelectedNames = () => {
    return list
      .filter(u => selectedIds.includes(u.uid || u.id))
      .map(u => getDisplayName(u))
      .join(", ");
  };

  const handleFinalDelete = async () => {
    setIsDeleting(true);
    const batch = writeBatch(db);

    try {
      selectedIds.forEach((id) => {
        // 1. Delete the profile (either in /students/std_xxx or /teachers/uid)
        batch.delete(doc(db, view, id));
        
        // 2. IMPORTANT: We also need to find the user's Auth UID to delete from /users/
        // For students, the parent link might stay, but for teachers, id IS the uid.
        batch.delete(doc(db, "users", id));
      });

      await batch.commit();
      setStep(3); 
    } catch (error) {
      console.error(error);
      alert("Error during deletion.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="mt-12 flex justify-center">
      <button onClick={() => setIsOpen(true)} className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg">
        <Trash2 className="inline mr-2" /> Delete Profiles
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl">
            
            {step === 0 && (
              <>
                <h2 className="text-2xl font-bold mb-4 text-center">Delete {view === 'teachers' ? 'Teachers' : 'Students'}</h2>
                
                <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-xl">
                  <button onClick={() => { setView('teachers'); setSelectedIds([]); }} className={`flex-1 py-2 rounded-lg font-bold ${view === 'teachers' ? 'bg-white shadow' : 'text-gray-400'}`}>Teachers</button>
                  <button onClick={() => { setView('students'); setSelectedIds([]); }} className={`flex-1 py-2 rounded-lg font-bold ${view === 'students' ? 'bg-white shadow' : 'text-gray-400'}`}>Students</button>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2 mb-6">
                  {list.map((user) => {
                    const id = user.uid || user.id; // Corrected ID selection
                    const name = getDisplayName(user);
                    
                    return (
                      <label key={id} className={`flex items-center gap-3 p-4 border-2 rounded-2xl cursor-pointer transition-all ${selectedIds.includes(id) ? 'border-red-500 bg-red-50' : 'border-gray-100'}`}>
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(id)}
                          onChange={() => toggleSelection(id)}
                          className="w-5 h-5 accent-red-600"
                        />
                        <div>
                          <p className="font-bold">{name}</p>
                          <p className="text-xs text-gray-400">{user.email || user.parentEmail}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setIsOpen(false)} className="flex-1 py-3 text-gray-500">Cancel</button>
                  <button 
                    disabled={selectedIds.length === 0}
                    onClick={() => setStep(1)}
                    className="flex-1 bg-gray-900 text-white rounded-xl py-3 font-bold disabled:opacity-20"
                  >
                    Confirm ({selectedIds.length})
                  </button>
                </div>
              </>
            )}

            {step === 1 && (
              <div className="text-center">
                <UserX className="mx-auto text-blue-600 mb-4" size={48} />
                <h2 className="text-xl font-bold mb-2">Verify Profile</h2>
                <p className="text-gray-600 mb-6 italic">"Do you want to delete the profile for <span className="text-black font-bold not-italic">{getSelectedNames()}</span>?"</p>
                <button onClick={() => setStep(2)} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold mb-2">Yes, Continue</button>
                <button onClick={() => setStep(0)} className="w-full text-gray-400">No, go back</button>
              </div>
            )}

            {step === 2 && (
              <div className="text-center">
                <AlertTriangle className="mx-auto text-red-600 mb-4 animate-bounce" size={48} />
                <h2 className="text-2xl font-black text-red-600 mb-2">FINAL WARNING</h2>
                <p className="text-gray-500 mb-8">This action is permanent and will remove all database records for these users.</p>
                <button 
                  onClick={handleFinalDelete} 
                  className="w-full bg-red-600 text-white py-4 rounded-2xl font-black shadow-lg mb-2"
                >
                  {isDeleting ? "DELETING..." : "CONFIRM PERMANENT DELETE"}
                </button>
                <button onClick={() => setStep(1)} className="text-gray-400">Cancel</button>
              </div>
            )}

            {step === 3 && (
              <div className="text-center">
                <CheckCircle className="mx-auto text-green-600 mb-4" size={64} />
                <h2 className="text-2xl font-bold mb-2">Success!</h2>
                <p className="text-gray-500 mb-8">Profiles have been removed from the system.</p>
                <button onClick={() => window.location.reload()} className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold">Close</button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
};