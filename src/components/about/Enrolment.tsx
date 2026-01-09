"use client";

import React from "react";
import { Link } from "react-router-dom";
import { 
  School, 
  Globe, 
  CheckCircle, 
  Zap, 
  Calendar, 
  CreditCard, 
  MapPin, 
  Monitor 
} from "lucide-react";

const Enrolment: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 px-6 py-12">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Urgent Opening Banner */}
        <div className="relative overflow-hidden bg-indigo-900 rounded-3xl p-8 text-white shadow-2xl border-4 border-indigo-200">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <School size={120} />
          </div>
          <div className="relative z-10 text-center">
            <span className="bg-yellow-400 text-indigo-900 px-4 py-1 rounded-full text-sm font-black uppercase tracking-widest">
              Academic Year 2026
            </span>
            <h2 className="mt-4 text-4xl md:text-5xl font-black">
              School Opens: <span className="text-yellow-300">21 January 2026</span>
            </h2>
            <p className="mt-4 text-xl text-indigo-100 max-w-2xl mx-auto">
              Grade 1 to Grade 12 • Cambridge & CAPS Curriculum • 
              <span className="block font-bold text-white">Virtual or Physical Campus — You Decide!</span>
            </p>
          </div>
        </div>

        {/* Heading Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-800 to-purple-700">
            Your Education, Your Choice
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Experience the freedom of <strong>Hybrid Learning</strong>. Register online anytime 
            throughout the year and join our community of excellence.
          </p>
        </div>

        {/* Hybrid Choice Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-blue-100 flex flex-col items-center text-center group hover:bg-blue-600 transition-all duration-300">
            <div className="bg-blue-100 p-4 rounded-2xl text-blue-600 group-hover:bg-white group-hover:scale-110 transition-transform">
              <MapPin size={40} />
            </div>
            <h3 className="mt-6 text-2xl font-bold text-gray-800 group-hover:text-white">Physical Campus</h3>
            <p className="mt-2 text-gray-600 group-hover:text-blue-50">
              Interactive classroom environment, face-to-face mentoring, and campus sports.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-xl border border-purple-100 flex flex-col items-center text-center group hover:bg-purple-600 transition-all duration-300">
            <div className="bg-purple-100 p-4 rounded-2xl text-purple-600 group-hover:bg-white group-hover:scale-110 transition-transform">
              <Monitor size={40} />
            </div>
            <h3 className="mt-6 text-2xl font-bold text-gray-800 group-hover:text-white">Virtual School</h3>
            <p className="mt-2 text-gray-600 group-hover:text-purple-50">
              High-definition live classes, digital resources, and flexible global learning.
            </p>
          </div>
        </div>

        {/* The Choice Banner */}
        <div className="bg-gradient-to-r from-pink-500 to-orange-400 p-1 rounded-3xl shadow-lg">
          <div className="bg-white rounded-[1.4rem] p-6 text-center">
            <p className="text-lg font-bold text-gray-800 flex items-center justify-center gap-2">
              <Zap className="text-orange-500" />
              <strong>Unique Feature:</strong> You can switch your mode of learning at the start of <u>every term</u>!
            </p>
          </div>
        </div>

        {/* Enrolment Process Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-8 bg-white rounded-3xl shadow-lg border-b-8 border-indigo-500 hover:-translate-y-2 transition-transform">
            <div className="text-indigo-500 mb-4"><Globe size={32} /></div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">1. Register Online</h2>
            <p className="text-gray-600 text-sm">
              Complete our secure digital form. We accept applications <strong>365 days a year</strong>. 
              Join the next available intake.
            </p>
          </div>

          <div className="p-8 bg-white rounded-3xl shadow-lg border-b-8 border-purple-500 hover:-translate-y-2 transition-transform">
            <div className="text-purple-500 mb-4"><CreditCard size={32} /></div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">2. Pay Securely</h2>
            <p className="text-gray-600 text-sm">
              Pay your <strong>Registration Fee</strong> via PayFast to secure your spot. 
              Places are limited per grade to ensure quality.
            </p>
          </div>

          <div className="p-8 bg-white rounded-3xl shadow-lg border-b-8 border-green-500 hover:-translate-y-2 transition-transform">
            <div className="text-green-500 mb-4"><CheckCircle size={32} /></div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">3. Start Learning</h2>
            <p className="text-gray-600 text-sm">
              Receive your orientation pack and login details. Get ready for 
              <strong> 21 Jan 2026</strong>!
            </p>
          </div>
        </div>

        {/* Why Choose Us List */}
        <div className="grid md:grid-cols-2 gap-8 items-center bg-white p-10 rounded-[3rem] shadow-xl border border-gray-100">
          <div>
            <h2 className="text-3xl font-black text-gray-800 mb-6">Why Our Hybrid Model Works</h2>
            <ul className="space-y-4">
              {[
                "Global Recognition: Cambridge & CAPS qualification pathways.",
                "Termly Flexibility: Adapt your school life to your family needs.",
                "Expert Faculty: Specialist teachers for every subject.",
                "Small Classes: Personalized attention in every lesson.",
                "Character First: Christian-based values and mentorship."
              ].map((benefit, i) => (
                <li key={i} className="flex items-start gap-3 text-gray-700">
                  <div className="mt-1 bg-green-100 text-green-600 rounded-full p-1"><CheckCircle size={16} /></div>
                  <span className="font-medium">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-200 rounded-2xl rotate-3"></div>
            <img 
              src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80" 
              alt="Happy Students" 
              className="relative rounded-2xl shadow-lg border-4 border-white"
            />
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center py-10">
          <div className="inline-block p-1 bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 rounded-full shadow-2xl">
            <Link
              to="/login"
              className="block bg-white text-gray-900 font-black text-2xl px-12 py-6 rounded-full hover:bg-transparent hover:text-white transition-all duration-300"
            >
              Secure Your 2026 Spot Now!
            </Link>
          </div>
          <p className="mt-6 text-gray-500 flex items-center justify-center gap-2">
            <Calendar size={18} /> Registrations processed daily for 2026 intake.
          </p>
        </div>

        {/* Navigation */}
        <div className="text-center">
          <Link
            to="/about"
            className="text-gray-500 font-bold hover:text-indigo-600 transition underline decoration-2 underline-offset-4"
          >
            ← Back to About Us
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Enrolment;