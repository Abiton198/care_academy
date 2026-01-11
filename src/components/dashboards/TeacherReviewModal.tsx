"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { X, CheckCircle, FileText, ExternalLink, ShieldCheck } from "lucide-react";

interface TeacherApp {
  id: string;
  uid: string;
  email: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    yearsOfExperience: number;
    gradePhase: string;
  };
  subjects: { name: string }[];
  documents?: {
    cv?: string[];
    qualification?: string[];
    idDoc?: string[];
  };
}

interface Props {
  application: TeacherApp | null;
  onClose: () => void;
  onApprove: (appId: string, uid: string) => void;
}

export default function TeacherReviewModal({ application, onClose, onApprove }: Props) {
  if (!application) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600">
              <ShieldCheck size={32} />
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
          </div>

          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Verify Educator Credentials</h2>
          <p className="text-slate-500 text-sm mb-8 font-medium">Reviewing application for <span className="text-indigo-600 font-bold">{application.email}</span></p>

          <div className="space-y-6">
            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Full Name</p>
                <p className="font-bold text-slate-800">{application.personalInfo.firstName} {application.personalInfo.lastName}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Experience</p>
                <p className="font-bold text-slate-800">{application.personalInfo.yearsOfExperience} Years (Cambridge)</p>
              </div>
            </div>

            {/* Subjects */}
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Specializations</p>
              <div className="flex flex-wrap gap-2">
                {application.subjects.map((s, i) => (
                  <span key={i} className="bg-indigo-600 text-white text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider">{s.name}</span>
                ))}
              </div>
            </div>

            {/* Documents */}
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Verification Documents</p>
              <div className="space-y-2">
                {Object.entries(application.documents || {}).map(([key, urls]) => (
                  <a key={key} href={urls[0]} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 border-2 border-slate-100 rounded-xl hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group">
                    <div className="flex items-center gap-3">
                      <FileText size={16} className="text-slate-400 group-hover:text-indigo-500" />
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">{key.replace(/([A-Z])/g, ' $1')}</span>
                    </div>
                    <ExternalLink size={14} className="text-slate-300" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-10">
            <Button variant="outline" onClick={onClose} className="rounded-2xl h-14 font-black text-xs tracking-widest border-2">DECLINE</Button>
            <Button 
              onClick={() => onApprove(application.id, application.uid)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl h-14 font-black text-xs tracking-widest shadow-lg shadow-emerald-100 flex items-center gap-2"
            >
              <CheckCircle size={18} /> APPROVE ACCESS
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}