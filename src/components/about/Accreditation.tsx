"use client";

import React from "react";
import { Link } from "react-router-dom";

// Placeholder logo URLs (replace with local assets or CDN links)
const logos = {
  google: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg",
  amazon: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg",
  ibm: "https://upload.wikimedia.org/wikipedia/commons/5/51/IBM_logo.svg",
};

const Accreditation: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-gray-100 px-6 py-12">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Heading */}
        <h1 className="text-4xl font-bold text-teal-700 text-center">
          Accreditation & University Pathways
        </h1>
        <p className="text-center text-lg text-gray-700 max-w-3xl mx-auto">
          At <strong>NextGen Independent Online School</strong>, your child learns from{" "}
          <strong className="text-indigo-600">highly rated, experienced teachers</strong> 
          — SACE-registered experts in <strong>CAPS</strong> and <strong>Cambridge</strong> curricula.
        </p>

        {/* Key Accreditation Points */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition border-l-4 border-indigo-500">
            <h2 className="text-xl font-semibold text-teal-600 mb-2">Highly Rated Teachers</h2>
            <p className="text-gray-700">
              Our <strong>SACE-registered educators</strong> average <strong>12+ years</strong> of experience 
              and are <strong>top-rated by parents</strong> for CAPS (Grade 10–12) and Cambridge (Form 3–6). 
              Every extra lesson is led by specialists who’ve produced <strong>distinctions year after year</strong>.
            </p>
          </div>

          <div className="p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition border-l-4 border-green-500">
            <h2 className="text-xl font-semibold text-teal-600 mb-2">Curriculum-Aligned Excellence</h2>
            <p className="text-gray-700">
              All online extra lessons strictly follow the <strong>DBE CAPS</strong> and{" "}
              <strong>Cambridge Assessment International Education</strong> syllabi. 
              No shortcuts — just <strong>goal-oriented, exam-focused support</strong> starting <strong>5 January 2026</strong>.
            </p>
          </div>

          <div className="p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition border-l-4 border-purple-500">
            <h2 className="text-xl font-semibold text-teal-600 mb-2">Secure Online Assessments</h2>
            <p className="text-gray-700">
              Monthly progress tests and mock exams are conducted via <strong>secure proctoring</strong>. 
              Parents receive <strong>detailed performance reports</strong> to track improvement in real time.
            </p>
          </div>

          <div className="p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition border-l-4 border-yellow-500">
            <h2 className="text-xl font-semibold text-teal-600 mb-2">Pre-University Boost</h2>
            <p className="text-gray-700">
              Every learner gains access to a <strong>free accredited pre-university course</strong> 
              (Google, IBM, Amazon, or Coursera) — strengthening applications to <strong>NMU, UCT, Wits, and global universities</strong>.
            </p>
          </div>
        </div>

        {/* Timeline */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-teal-700 text-center mb-8">
            The NextGen Extra Lessons Journey (2026)
          </h2>
          <div className="space-y-8 relative border-l-4 border-teal-400 pl-6">
            <div>
              <h3 className="text-lg font-semibold text-teal-600">Step 1: Enrolment & Onboarding</h3>
              <p className="text-gray-700">
                Register online in minutes. Get instant access to your child’s dashboard and teacher intro session.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-teal-600">Step 2: Live After-School Classes</h3>
              <p className="text-gray-700">
                <strong>Weekly interactive lessons</strong> (Mon–Thu, 4–6 PM) with <strong>recorded replays</strong>. 
                Small groups (max 15) for personalized attention.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-teal-600">Step 3: Monthly Exams & Feedback</h3>
              <p className="text-gray-700">
                Secure online tests + <strong>1-on-1 teacher feedback</strong>. 
                Parents receive progress reports with actionable insights.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-teal-600">Step 4: Exam Readiness & University Edge</h3>
              <p className="text-gray-700">
                Full mock exams, past paper drills, and a <strong>pre-university certificate</strong> 
                — ensuring <strong>top marks and strong university applications</strong>.
              </p>
              <div className="flex flex-wrap gap-4 mt-2 items-center">
                <img src="/logos/coursera.jpeg" alt="Coursera" className="h-8" />
                <img src={logos.google} alt="Google" className="h-6" />
                <img src={logos.amazon} alt="Amazon" className="h-6" />
                <img src={logos.ibm} alt="IBM" className="h-8" />
              </div>
            </div>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-8 rounded-2xl shadow-lg text-center mt-12">
          <h3 className="text-2xl font-bold mb-3">
            Online Extra Lessons 2026 – Registrations Now Open!
          </h3>
          <p className="text-lg mb-4 max-w-3xl mx-auto">
            <strong>Affordable (from R350/subject)</strong> • <strong>Highly rated teachers</strong> •{" "}
            <strong>Starts 5 January 2026</strong>
          </p>
          <Link
            to="/login"
            className="inline-block bg-yellow-400 text-indigo-900 font-bold px-8 py-3 rounded-full hover:bg-yellow-300 transition shadow-md transform hover:scale-105"
          >
            Register Now – Limited Spots!
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

export default Accreditation;