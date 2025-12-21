"use client";

import React from "react";
import { Link } from "react-router-dom";

const Enrolment: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 px-6 py-12">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Urgent Banner */}
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-indigo-700 animate-pulse">
            Online Extra Lessons 2026 – Registrations NOW OPEN!
          </h2>
          <p className="mt-3 text-lg text-gray-800 max-w-4xl mx-auto font-medium">
            <strong>Grade 10–12 (CAPS)</strong> • <strong>Cambridge Form 3–6</strong> • 
            Starts <strong className="text-red-600">5 January 2026</strong>
          </p>
          <p className="mt-2 text-gray-700">
            After-school online support with <strong>highly rated, experienced teachers</strong> — 
            <strong>affordable, reliable, and 100% exam-focused</strong>.
          </p>
        </div>

        {/* Heading */}
        <h1 className="text-4xl font-bold text-indigo-800 text-center">
          Enrolment Made Simple & Secure
        </h1>
        <p className="text-center text-lg text-gray-700 max-w-3xl mx-auto">
          Register in <strong>under 5 minutes</strong>. Secure your child’s spot with 
          <strong> PayFast</strong> — South Africa’s trusted payment gateway.
        </p>

        {/* Enrolment Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition border-t-4 border-indigo-500">
            <h2 className="text-xl font-semibold text-indigo-600 mb-2">Step 1: Choose Subjects</h2>
            <p className="text-gray-700 text-sm">
              Select from <strong>Maths, Physics, Chemistry, Biology, Accounting, Business, English</strong> 
              and more — CAPS or Cambridge. Mix & match per need.
            </p>
          </div>

          <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition border-t-4 border-purple-500">
            <h2 className="text-xl font-semibold text-purple-600 mb-2">Step 2: Secure Payment</h2>
            <p className="text-gray-700 text-sm">
              Pay safely via <strong>PayFast</strong>. Only <strong>R350/month per subject</strong>. 
              Bundle 3+ subjects and save <strong>15%</strong>.
            </p>
          </div>

          <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition border-t-4 border-green-500">
            <h2 className="text-xl font-semibold text-green-600 mb-2">Step 3: Start Learning</h2>
            <p className="text-gray-700 text-sm">
              Instant access to <strong>live classes, recordings, notes, and teacher chat</strong>. 
              First session: <strong>Monday, 5 Jan 2026</strong>.
            </p>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg text-white space-y-4">
          <h2 className="text-2xl font-semibold">Why Parents Trust Our Extra Lessons</h2>
          <ul className="list-disc list-inside space-y-2 text-lg">
            <li><strong>Expert Teachers:</strong> SACE-registered, 12+ years exp, top-rated by parents.</li>
            <li><strong>Curriculum-Aligned:</strong> 100% CAPS & Cambridge — no gaps, no surprises.</li>
            <li><strong>Goal-Oriented:</strong> Monthly tests, mock exams, progress reports.</li>
            <li><strong>Flexible & Affordable:</strong> Pay per subject, cancel anytime, bundle discounts.</li>
            <li><strong>Proven Results:</strong> 85%+ of students improve by 1–2 letter grades in 3 months.</li>
          </ul>
        </div>

        {/* Early Bird Offer */}
        <div className="bg-yellow-100 border-2 border-yellow-400 rounded-xl p-6 text-center">
          <p className="text-xl font-bold text-yellow-900">
            Early Bird Special: <span className="text-2xl">First 50 Registrations Get 10% OFF!</span>
          </p>
          <p className="text-gray-700 mt-1">Limited spots — classes capped at 15 students per group.</p>
        </div>

        {/* Call to Action */}
        <div className="text-center mt-12">
          <p className="text-xl font-bold text-indigo-900">
            Don’t wait for Term 1 stress. 
            <span className="block text-purple-700">Give your child the <strong>extra edge</strong> they need in 2026.</span>
          </p>
          <Link
            to="/login"
            className="inline-block mt-6 bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold text-lg px-8 py-4 rounded-full shadow-lg hover:shadow-xl transition transform hover:scale-105 animate-pulse"
          >
            Register Now – Secure Your Spot!
          </Link>
        </div>

        {/* Back Navigation */}
        <div className="text-center mt-8">
          <Link
            to="/about"
            className="inline-block bg-gray-200 text-gray-800 px-6 py-2 rounded-lg shadow hover:bg-gray-300 transition"
          >
            ← Back to About Us
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Enrolment;