import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebaseConfig";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { Star, Quote } from "lucide-react";

export const TestimonialCarousel = () => {
    const [reviews, setReviews] = useState<any[]>([]);

    useEffect(() => {
        const q = query(
            collection(db, "reviews"),
            where("status", "==", "approved"),
            orderBy("createdAt", "desc"),
            limit(6)
        );

        const unsub = onSnapshot(q, (snap) => {
            setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, []);

    if (reviews.length === 0) return null;

    return (
        <section className="py-20 bg-slate-50 overflow-hidden">
            <div className="max-w-7xl mx-auto px-6 text-center mb-12">
                <h2 className="text-4xl font-black text-slate-900 mb-4">What Our Parents Say</h2>
                <div className="w-20 h-1.5 bg-blue-600 mx-auto rounded-full" />
            </div>

            <div className="flex gap-6 overflow-x-auto px-6 pb-12 no-scrollbar">
                {reviews.map((rev) => (
                    <div key={rev.id} className="min-w-[350px] bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm relative">
                        <Quote className="absolute top-8 right-8 text-blue-50/50" size={60} />

                        <div className="flex gap-1 mb-4">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} size={16} className={i < rev.rating ? "fill-yellow-400 text-yellow-400" : "text-slate-100"} />
                            ))}
                        </div>

                        <p className="text-slate-600 italic mb-8 relative z-10">"{rev.comment}"</p>

                        <div className="flex items-center gap-4">
                            {rev.parentPhoto ? (
                                <img
                                    src={rev.parentPhoto}
                                    alt={rev.parentName}
                                    className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-sm"
                                />
                            ) : (
                                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-indigo-100">
                                    {rev.parentName[0]}
                                </div>
                            )}
                            <div>
                                <p className="font-black text-slate-800 text-sm uppercase leading-none mb-1">
                                    {rev.parentName}
                                </p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    Verified Parent
                                </p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                                    {rev.createdAt?.toDate ? (
                                        // Converts Firebase Timestamp to "11 April 2026"
                                        rev.createdAt.toDate().toLocaleDateString('en-GB', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric'
                                        })
                                    ) : (
                                        "Recently"
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};