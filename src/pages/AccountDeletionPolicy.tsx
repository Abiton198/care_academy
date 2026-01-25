"use client";

import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Trash2, 
  AlertTriangle, 
  Mail, 
  Smartphone, 
  History,
  ShieldAlert
} from "lucide-react";

const AccountDeletionPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto bg-white shadow-2xl rounded-[2.5rem] overflow-hidden border border-red-50">
        
        {/* Header Section */}
        <div className="bg-red-600 p-10 text-white relative overflow-hidden">
          <div className="relative z-10">
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)} 
              className="mb-6 text-white/80 hover:text-white hover:bg-white/10 rounded-xl"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <h1 className="text-3xl font-black uppercase tracking-tighter italic">
              Account Deletion <span className="text-red-200">Request</span>
            </h1>
            <p className="text-red-100 text-xs font-bold uppercase tracking-widest mt-2">
              Care Academy Data Management Portal
            </p>
          </div>
          <Trash2 size={180} className="absolute -right-10 -bottom-10 text-black/10 rotate-12" />
        </div>

        {/* Introduction */}
        <div className="p-10 pb-0">
          <p className="text-slate-600 leading-relaxed">
            At <strong>Care Academy</strong>, we value your privacy. If you no longer wish to use our services, 
            you can request the deletion of your account and all associated data through the methods outlined below.
          </p>
        </div>

        {/* Steps Section */}
        <div className="p-10 space-y-8">
          <section className="space-y-4">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <Smartphone size={16} className="text-red-600" />
              How to Request Deletion
            </h2>
            
            <div className="grid gap-4">
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:border-red-200 transition-colors">
                <h4 className="font-black text-slate-800 uppercase text-xs mb-2">Option 1: In-App</h4>
                <p className="text-sm text-slate-600">
                  Log in to your Parent Dashboard, navigate to <strong>Settings &gt; Profile</strong>, 
                  and find the <strong>Danger Zone</strong> section at the bottom to initiate an immediate wipe.
                </p>
              </div>

              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:border-red-200 transition-colors">
                <h4 className="font-black text-slate-800 uppercase text-xs mb-2">Option 2: Via Email</h4>
                <p className="text-sm text-slate-600">
                  Send an email to <span className="font-bold text-indigo-600">nextgenskills96@gmail.com</span> with 
                  the subject <code className="bg-white px-2 py-1 rounded border">Account Deletion Request</code>.
                </p>
              </div>
            </div>
          </section>

          {/* Data Policy Section */}
          <section className="space-y-4">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <ShieldAlert size={16} className="text-red-600" />
              Data Deletion Policy
            </h2>
            <div className="bg-red-50 rounded-[2rem] p-8 border border-red-100 space-y-6">
              <div className="flex gap-4">
                <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                <p className="text-sm text-red-900">
                  <strong>Permanently Deleted:</strong> Profile information (name, email), student registration details, class links, and personalized settings.
                </p>
              </div>
              <div className="flex gap-4">
                <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                <p className="text-sm text-red-900">
                  <strong>Financial Records:</strong> In accordance with local tax laws, transaction history and invoices will be kept for 5 years before being purged.
                </p>
              </div>
              <div className="flex gap-4">
                <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                <p className="text-sm text-red-900">
                  <strong>Retention Period:</strong> Your account is deactivated immediately. Full data purging from our systems occurs within 30 days.
                </p>
              </div>
            </div>
          </section>

          {/* Action Call */}
          <div className="flex flex-col items-center py-6">
            <a 
              href="mailto:abitonp@gmail.com?subject=Account%20Deletion%20Request" 
              className="w-full md:w-auto px-10 py-4 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-red-200 transition-all flex items-center justify-center gap-3"
            >
              <Mail size={18} />
              Email Support to Delete Account
            </a>
          </div>

          <div className="pt-8 border-t border-slate-100 text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              Developer: Care Academy Dev Team | App Name: Care Academy Portal
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountDeletionPolicy;