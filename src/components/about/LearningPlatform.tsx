"use client";

import React from "react";
import { Link } from "react-router-dom";

const LearningPlatform: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-purple-200 px-6 py-12">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Banner */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-2xl shadow-lg text-center">
          <h2 className="text-2xl font-bold mb-2">
            Online Extra Lessons 2026 – Registrations Open!
          </h2>
          <p className="text-lg mb-4 max-w-3xl mx-auto">
            <strong>Affordable, reliable support</strong> for Grade 10–12 (CAPS) & Cambridge Form 3–6. 
            Starts <strong>5 January 2026</strong> with highly rated teachers.
          </p>
          <Link
            to="/login"
            className="inline-block bg-yellow-400 text-indigo-900 font-bold px-6 py-2 rounded-full hover:bg-yellow-300 transition shadow-md"
          >
            Register Now →
          </Link>
        </div>

        {/* Heading */}
        <h1 className="text-4xl font-bold text-purple-700 text-center">
          Our Learning Platform
        </h1>
        <p className="text-center text-lg text-gray-700 max-w-3xl mx-auto">
          At <strong>NextGen Independent Online School</strong>, our platform powers 
          <strong>after-school extra lessons</strong> — blending <strong>Google Classroom & Zoom</strong> 
          with <strong>custom dashboards</strong> for seamless, goal-oriented support in CAPS and Cambridge curricula.
        </p>

        {/* Google Classroom Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-xl bg-white shadow-lg">
            <h2 className="text-2xl font-semibold text-purple-600 mb-3">
              How Our Platform Works for Extra Lessons
            </h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>
                Learners join <strong>live after-school sessions</strong> (Mon–Thu, 4–6 PM) via Zoom, integrated with Google Classroom.
              </li>
              <li>
                Teachers deliver <strong>targeted support</strong>, share resources, assign practice, and give instant feedback.
              </li>
              <li>
                Content follows <strong>prescribed CAPS & Cambridge syllabi</strong>, focusing on exam prep, past papers, and weak areas.
              </li>
              <li>
                <strong>24/7 access</strong> to recordings, notes, quizzes, and forums for flexible revision.
              </li>
              <li>
                Parents track attendance, progress, and teacher notes in real time.
              </li>
            </ul>
          </div>

          <div className="p-6 rounded-xl bg-gradient-to-tr from-purple-600 to-purple-400 text-white shadow-lg">
            <h2 className="text-2xl font-semibold mb-3">Why This Matters for Parents</h2>
            <p className="text-lg">
              Our platform transforms extra lessons into a <strong>reliable, interactive boost</strong> — 
              not just homework help, but <strong>goal-oriented guidance</strong> from experienced teachers to improve grades and confidence.
            </p>
          </div>
        </div>

        {/* Dashboard Section */}
        <div className="p-6 rounded-xl bg-white shadow-lg">
          <h2 className="text-2xl font-semibold text-indigo-600 mb-4">
            Integrated Dashboards — Parents, Teachers, and Students
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Student Card */}
            <div className="p-4 bg-indigo-50 rounded-lg shadow hover:shadow-md transition">
              <h3 className="text-xl font-semibold text-indigo-700 mb-2">🎓 Student Dashboard</h3>
              <p className="text-gray-700 text-sm">
                Access live sessions, replays, assignments, <strong>progress trackers</strong>, 
                and chat with teachers for personalized help.
              </p>
            </div>

            {/* Teacher Card */}
            <div className="p-4 bg-indigo-50 rounded-lg shadow hover:shadow-md transition">
              <h3 className="text-xl font-semibold text-indigo-700 mb-2">👩‍🏫 Teacher Dashboard</h3>
              <p className="text-gray-700 text-sm">
                Highly rated experts manage groups, share targeted resources, 
                track individual progress, and provide <strong>1-on-1 feedback</strong>.
              </p>
            </div>

            {/* Parent Card */}
            <div className="p-4 bg-indigo-50 rounded-lg shadow hover:shadow-md transition">
              <h3 className="text-xl font-semibold text-indigo-700 mb-2">👨‍👩‍👧 Parent Dashboard</h3>
              <p className="text-gray-700 text-sm">
                Monitor <strong>attendance, grades, reports</strong>, and payments — 
                with alerts for upcoming tests and improvements.
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center mt-10">
          <p className="text-lg font-semibold text-purple-800">
            🚀 Join our platform for <strong>affordable extra support</strong> — 
            empowering your child with the tools for success in 2026.
          </p>
          <Link
            to="/login"
            className="inline-block mt-6 bg-purple-600 text-white px-6 py-3 rounded-lg shadow hover:bg-purple-700 transition"
          >
            Register for 2026 Extra Lessons
          </Link>
        </div>

        {/* Back Navigation */}
        <div className="text-center mt-6">
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

export default LearningPlatform;