"use client";

import React from "react";
import { Link } from "react-router-dom";
import { 
  CheckCircle, 
  CreditCard, 
  ShieldCheck, 
  Zap, 
  Star, 
  Gift, 
  ArrowRight,
  Monitor
} from "lucide-react";

const FeesStructure: React.FC = () => {
  // Calculation Logic for UI Clarity
  const tuition = 1200;
  const lmsFee = tuition * 0.10; // 20% Taxable LMS Fee
  const totalMonthly = tuition + lmsFee;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 px-6 py-12">
      <div className="max-w-6xl mx-auto space-y-12">

        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-bold tracking-wide">
            <Star size={16} className="fill-emerald-700" />
            Quality Education for Every Child
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-gray-900 leading-tight">
            Transparent & <span className="text-emerald-600">Affordable</span> Fees
          </h1>
          <p className="mt-3 text-lg text-gray-600 max-w-3xl mx-auto">
            Our mission is to provide world-class Cambridge and Christian-based education 
            at a price that makes sense for modern families. 
            <strong> Classes start 26 January 2026.</strong>
          </p>
        </div>

        {/* The Core Fee Breakdown */}
        <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-gray-100 max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2">
            <div className="p-10 bg-emerald-600 text-white flex flex-col justify-center">
              <h2 className="text-3xl font-bold">Standard Monthly</h2>
              <p className="mt-2 opacity-90">Fixed monthly tuition for all grades.</p>
              <div className="mt-8 space-y-4">
                <div className="flex justify-between items-center text-xl border-b border-emerald-500 pb-2">
                  <span>Base Tuition</span>
                  <span className="font-bold text-2xl">R{tuition.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm opacity-80 italic">
                  <span className="flex items-center gap-1"><Monitor size={14}/> LMS App Fee (20%)</span>
                  <span>R{lmsFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-3xl font-black pt-4">
                  <span>Total Due</span>
                  <span className="text-yellow-300">R{totalMonthly.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="p-10 flex flex-col justify-center space-y-4 bg-gray-50">
              <h3 className="font-bold text-gray-800 text-xl">What this covers:</h3>
              <ul className="space-y-3">
                {[
                  "Experienced subject-specialist teachers",
                  "Full access to the Learning Management System",
                  "Continuous progress tracking & reporting",
                  "Christian-based academic support",
                  "Choice of Virtual or Campus attendance"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-600">
                    <CheckCircle size={18} className="text-emerald-500 flex-shrink-0" />
                    <span className="text-sm font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Payment Plan Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Monthly Option */}
          <div className="bg-white p-8 rounded-3xl shadow-lg border-2 border-transparent hover:border-emerald-500 transition-all text-center">
            <h3 className="text-xl font-bold text-gray-800">Monthly Plan</h3>
            <p className="text-gray-500 text-sm mt-2">Pay as you go</p>
            <div className="my-6">
              <span className="text-4xl font-black text-gray-900">R{totalMonthly}</span>
              <span className="text-gray-500 font-medium">/mo</span>
            </div>
            <p className="text-xs text-gray-400 mb-6">Billed on the 1st of every month</p>
            <Link to="/login" className="block w-full py-3 rounded-xl bg-gray-100 text-gray-800 font-bold hover:bg-gray-200 transition">
              Select Monthly
            </Link>
          </div>

          {/* Quarterly Option */}
          <div className="bg-white p-8 rounded-3xl shadow-xl border-2 border-emerald-500 transition-all text-center relative transform md:scale-105">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
              Most Popular
            </div>
            <h3 className="text-xl font-bold text-gray-800">Quarterly (3 Mo)</h3>
            <p className="text-gray-500 text-sm mt-2">Paid per term</p>
            <div className="my-6">
              <span className="text-4xl font-black text-emerald-600">R3,420</span>
            </div>
            <p className="text-xs text-emerald-600 font-bold mb-6 italic">Save 5% (R180) per term</p>
            <Link to="/login" className="block w-full py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-200">
              Save with Quarterly
            </Link>
          </div>

          {/* Yearly Option */}
          <div className="bg-white p-8 rounded-3xl shadow-lg border-2 border-transparent hover:border-indigo-500 transition-all text-center">
            <h3 className="text-xl font-bold text-gray-800">Yearly (Billed Once)</h3>
            <p className="text-gray-500 text-sm mt-2">Maximum Savings</p>
            <div className="my-6">
              <span className="text-4xl font-black text-indigo-600">R12,960</span>
            </div>
            <p className="text-xs text-indigo-600 font-bold mb-6 italic">Get 1 Month FREE (Save R1,440)</p>
            <Link to="/login" className="block w-full py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition">
              Best Value: Yearly
            </Link>
          </div>
        </div>

        {/* Early Bird & Security Info */}
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 opacity-20 -mr-4 -mt-4 group-hover:rotate-12 transition-transform">
              <Gift size={120} />
            </div>
            <h3 className="text-2xl font-black flex items-center gap-2">
              <Zap size={24} className="fill-current" /> Early Bird Special
            </h3>
            <p className="mt-4 text-lg font-medium leading-relaxed">
              Register and pay your registration fee by <strong>20 January 2026</strong> and get an 
              additional <span className="bg-white text-orange-600 px-2 py-0.5 rounded-lg font-bold">10% OFF</span> your first month's tuition!
            </p>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-dashed border-gray-200 flex flex-col justify-center items-center text-center">
            <div className="text-emerald-500 mb-4 bg-emerald-50 p-4 rounded-full">
              <ShieldCheck size={48} />
            </div>
            <h3 className="text-xl font-bold text-gray-800">Safe & Secure Payments</h3>
            <p className="text-gray-500 mt-2 text-sm">
              We use <strong>PayFast</strong>, South Africa’s most trusted payment gateway. 
              Pay via Instant EFT, Credit Card, or Debit Card with total peace of mind.
            </p>
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center pt-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Give your child the quality education they deserve.</h2>
          <Link
            to="/login"
            className="inline-flex items-center gap-3 bg-gray-900 text-white font-black text-xl px-12 py-6 rounded-2xl shadow-2xl hover:bg-emerald-600 transition-all duration-300 transform hover:scale-105"
          >
            Join 2026 Intake <ArrowRight />
          </Link>
          <div className="mt-6 flex items-center justify-center gap-6 text-gray-400">
            <div className="flex items-center gap-1 text-xs"><CreditCard size={14}/> Instant EFT</div>
            <div className="flex items-center gap-1 text-xs"><ShieldCheck size={14}/> PCI-DSS Secure</div>
          </div>
        </div>

        {/* Footer Nav */}
        <div className="text-center">
          <Link
            to="/about"
            className="text-gray-400 font-bold hover:text-emerald-600 transition underline decoration-2 underline-offset-4"
          >
            ← Back to About Us
          </Link>
        </div>
      </div>
    </div>
  );
};

export default FeesStructure;