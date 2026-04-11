"use client";

import React from "react";
import { useNavigate } from "react-router-dom";
import student from "../img/student.jpg";
import { Link } from "react-router-dom";
import { TestimonialCarousel } from "@/lib/TestimonialCarousel";

const LandingPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="bg-slate-50 text-gray-800">

            {/* HERO */}
            <section className="bg-gradient-to-r from-blue-900 to-indigo-700 text-white py-16 px-6">
                <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">

                    <div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            Is Your Child Finding Maths, Science or Literacy Challenging?
                        </h1>

                        <p className="text-lg mb-6">
                            We are here to support and guide your child with a <strong>British Curriculum Homeschool Programme</strong>,
                            from <strong>Primary School to High School</strong>, helping them grow in confidence and develop
                            their God-given potential for a bright <strong>international future</strong>.
                        </p>

                        <div className="space-y-2 mb-6">
                            <p>✔ British Curriculum</p>
                            <p>✔ Small Classes & Individual Attention</p>
                            <p>✔ Live Interactive Lessons</p>
                            <p>✔ Moodle & CARE App Learning System</p>
                            <p>✔ Sound Bible Teaching</p>
                        </div>

                        <div className="flex gap-4 flex-wrap">
                            <button
                                onClick={() => navigate("/login")}
                                className="bg-yellow-400 text-black px-6 py-3 rounded-xl font-semibold shadow hover:bg-blue-300 transition"
                            >
                                Register on Platform
                            </button>

                            <button
                                onClick={() => navigate("/login")}
                                className="bg-green-400 text-black px-6 py-3 rounded-xl font-semibold shadow hover:bg-slate-300 transition"
                            >
                                Sign in
                            </button>
                        </div>
                    </div>

                    <div>
                        <img
                            src={student}
                            alt="Student"
                            className="rounded-2xl shadow-lg w-full"
                        />
                    </div>
                </div>
            </section>

            {/* PROGRAM */}
            <section className="py-16 px-6 bg-white text-center">
                <h2 className="text-3xl font-bold mb-6">A Complete Learning Journey</h2>

                <p className="text-lg mb-10">
                    From Primary School to High School, preparing learners for global careers.
                </p>

                <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    <div className="p-6 shadow rounded-xl">
                        <h3 className="font-bold text-xl mb-2">Primary School</h3>
                        <p>Strong foundations in Maths, Science, and literacy.</p>
                    </div>

                    <div className="p-6 shadow rounded-xl">
                        <h3 className="font-bold text-xl mb-2">Middle School</h3>
                        <p>Concept mastery and critical thinking skills.</p>
                    </div>

                    <div className="p-6 shadow rounded-xl">
                        <h3 className="font-bold text-xl mb-2">High School</h3>
                        <p>Exam readiness and international career preparation.</p>
                    </div>
                </div>
            </section>

            {/* FEATURES */}
            <section className="bg-slate-100 py-16 px-6">
                <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10">

                    <div>
                        <h2 className="text-3xl font-bold mb-6">Why Choose CARE Academy?</h2>

                        <ul className="space-y-3 text-lg">
                            <li>✔ British Curriculum aligned learning</li>
                            <li>✔ Small classes for personal attention</li>
                            <li>✔ Interactive live lessons</li>
                            <li>✔ Progress tracking via Moodle & CARE App</li>
                            <li>✔ Affordable monthly plans</li>
                        </ul>
                    </div>

                    <div className="bg-white p-8 rounded-2xl shadow text-center">
                        <h3 className="text-2xl font-bold mb-4">Affordable Pricing</h3>
                        <p className="text-4xl font-bold text-indigo-700 mb-2">From R2 000</p>
                        <p className="mb-4">per month (Core Subjects + 2 Electives)</p>

                        <button
                            onClick={() => navigate("/about/enrolment")}
                            className="bg-indigo-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-green-500 transition"
                        >
                            Enrollment Info
                        </button>
                    </div>
                </div>
            </section>

            {/* Testimonials */}
            <TestimonialCarousel />

            {/* CTA */}
            <section className="bg-indigo-700 text-white py-16 px-6 text-center">
                <h2 className="text-3xl font-bold mb-4">Limited Spaces Available</h2>

                <p className="mb-6">
                    Give your child the advantage of structured online education.
                </p>

                <button
                    onClick={() => navigate("/login")}
                    className="bg-yellow-400 text-black px-8 py-4 rounded-xl font-semibold shadow hover:bg-green-300 transition"
                >
                    Start Learning Today
                </button>
            </section>

            {/* FOOTER */}
            <footer className="bg-gray-950 text-white py-10 text-center">
                <p className="text-lg mb-2">Contact Tanya</p>
                <p className="text-xl font-semibold mb-2">+27 84 666 0006</p>
            </footer>

            {/* FLOATING WHATSAPP */}
            <a
                href="https://wa.me/27826449390"
                target="_blank"
                className="fixed bottom-6 right-6 bg-green-500 text-white px-5 py-3 rounded-full shadow-lg hover:bg-green-600"
            >
                WhatsApp
            </a>

            <footer className="bg-gray-950 text-white/40 py-10 border-t border-white/5">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">

                        {/* Copyright & Branding */}
                        <div className="text-[10px] tracking-widest uppercase">
                            © {new Date().getFullYear()} British Curriculum Hybrid Christian Academy
                            <span className="mx-2 text-white/10">|</span>
                            Excellence Reformed
                        </div>

                        {/* Compliance Links */}
                        <nav className="flex gap-8">
                            <Link
                                to="/privacy-policy"
                                className="text-[10px] tracking-widest uppercase hover:text-white transition-colors border-b border-transparent hover:border-white/20 pb-1"
                            >
                                Privacy Policy
                            </Link>

                            <Link
                                to="/delete-account-request"
                                className="text-[10px] tracking-widest uppercase hover:text-rose-400 transition-colors border-b border-transparent hover:border-rose-400/20 pb-1"
                            >
                                Delete Account
                            </Link>
                        </nav>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;