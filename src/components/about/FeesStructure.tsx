"use client";

import React from "react";
import { Link } from "react-router-dom";

const FeesStructure: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100 px-6 py-12">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-green-800">
            Online Extra Lessons 2026 – Fees Structure
          </h1>
          <p className="mt-3 text-lg text-gray-700 max-w-3xl mx-auto">
            <strong>Affordable, flexible, per-subject pricing</strong> — the more subjects you add, the more you save. 
            Powered by <strong>PayFast</strong> with instant monthly billing.
          </p>
          <p className="mt-2 text-sm text-green-600 font-medium">
            Classes start <strong>5 January 2026</strong> • Small groups (max 15) • Highly rated teachers
          </p>
        </div>

        {/* Pricing Packages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-10">

          {/* Single Subject */}
          <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition transform hover:-translate-y-1 border-t-4 border-blue-500">
            <div className="text-center">
              <h2 className="text-xl font-bold text-blue-700">1 Subject</h2>
              <p className="text-3xl font-extrabold text-gray-800 mt-3">R350</p>
              <p className="text-sm text-gray-500">per month</p>
              <ul className="mt-4 space-y-2 text-sm text-gray-600">
                <li>Live weekly classes</li>
                <li>Recorded replays</li>
                <li>Monthly tests + reports</li>
              </ul>
              <div className="mt-5">
                <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
                  Perfect for targeted help
                </span>
              </div>
            </div>
          </div>

          {/* 2–3 Subjects (Most Popular) */}
          <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition transform hover:-translate-y-1 border-t-4 border-yellow-500 relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full">
                MOST POPULAR
              </span>
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-yellow-700">2–3 Subjects</h2>
              <p className="text-3xl font-extrabold text-gray-800 mt-3">R320</p>
              <p className="text-sm text-gray-500">per subject / month</p>
              <p className="text-xs text-green-600 font-bold mt-1">Save 8.6% per subject</p>
              <ul className="mt-4 space-y-2 text-sm text-gray-600">
                <li>All 1-subject features</li>
                <li>Bundle progress dashboard</li>
                <li>1-on-1 teacher check-in</li>
              </ul>
              <div className="mt-5">
                <span className="text-xs bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-medium">
                  Ideal for core support
                </span>
              </div>
            </div>
          </div>

          {/* 4–5 Subjects */}
          <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition transform hover:-translate-y-1 border-t-4 border-purple-500">
            <div className="text-center">
              <h2 className="text-xl font-bold text-purple-700">4–5 Subjects</h2>
              <p className="text-3xl font-extrabold text-gray-800 mt-3">R290</p>
              <p className="text-sm text-gray-500">per subject / month</p>
              <p className="text-xs text-green-600 font-bold mt-1">Save 17% per subject</p>
              <ul className="mt-4 space-y-2 text-sm text-gray-600">
                <li>All previous features</li>
                <li>Weekly parent reports</li>
                <li>Exam prep bootcamp</li>
              </ul>
              <div className="mt-5">
                <span className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-medium">
                  Best for full support
                </span>
              </div>
            </div>
          </div>

          {/* 6+ Subjects (Best Value) */}
          <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition transform hover:-translate-y-1 border-t-4 border-green-600">
            <div className="text-center">
              <h2 className="text-xl font-bold text-green-700">6+ Subjects</h2>
              <p className="text-3xl font-extrabold text-gray-800 mt-3">R250</p>
              <p className="text-sm text-gray-500">per subject / month</p>
              <p className="text-xs text-red-600 font-bold mt-1">Save 28.6% per subject!</p>
              <ul className="mt-4 space-y-2 text-sm text-gray-600">
                <li>All features included</li>
                <li>Free pre-university course</li>
                <li>Priority teacher access</li>
                <li>Guaranteed small group</li>
              </ul>
              <div className="mt-5">
                <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
                  MAX VALUE
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Table Summary */}
        <div className="bg-white rounded-xl shadow-md p-6 mt-8">
          <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">Monthly Cost Examples</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">1 Subject</p>
              <p className="text-xl font-bold text-blue-600">R350</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">3 Subjects</p>
              <p className="text-xl font-bold text-yellow-600">R960</p>
              <p className="text-xs text-green-600">R320 each</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">5 Subjects</p>
              <p className="text-xl font-bold text-purple-600">R1,450</p>
              <p className="text-xs text-green-600">R290 each</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">7 Subjects</p>
              <p className="text-xl font-bold text-green-600">R1,750</p>
              <p className="text-xs text-red-600">R250 each</p>
            </div>
          </div>
        </div>

        {/* Payment & Policy Info */}
        <div className="bg-gradient-to-r from-teal-500 to-green-600 text-white p-6 rounded-xl shadow-lg text-center">
          <h3 className="text-xl font-bold mb-3">Simple, Safe, Flexible</h3>
          <p className="text-sm max-w-2xl mx-auto">
            Monthly billing via <strong>PayFast</strong> • Cancel or adjust subjects anytime • 
            No contracts • <strong>First month pro-rata</strong> • Early bird: <strong>10% OFF first month</strong> if registered by 30 Nov 2025
          </p>
        </div>

        {/* CTA */}
        <div className="text-center mt-10">
          <p className="text-xl font-bold text-green-800 mb-4">
            The more your child learns, the less you pay per subject.
          </p>
          <Link
            to="/login"
            className="inline-block bg-gradient-to-r from-green-600 to-teal-600 text-white font-bold text-lg px-8 py-4 rounded-full shadow-lg hover:shadow-xl transition transform hover:scale-105"
          >
            Enrol Now – Save More with More Subjects!
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

export default FeesStructure;