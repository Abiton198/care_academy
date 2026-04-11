import React, { useState } from "react";
// 1. Import the logic functions from the main Firebase library
import {
    collection,
    addDoc,
    serverTimestamp,
    doc,
    getDoc,
    updateDoc
} from "firebase/firestore";

// 2. Import only your initialized database instance from your config file
import { db } from "@/lib/firebaseConfig";

import { Star, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";


interface ReviewModalProps {
    user: { uid: string; displayName?: string; photoURL?: string };
    onClose: () => void;
}

export const ReviewModal = ({ user, onClose }: ReviewModalProps) => {
    const [parentReview, setParentReview] = useState("");
    const [rating, setRating] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmitReview = async () => {
        if (rating === 0) return alert("Please select a star rating!");
        setIsSubmitting(true);

        try {
            const parentDocRef = doc(db, "parents", user.uid);
            const parentSnap = await getDoc(parentDocRef);

            let officialName = "Care Academy Parent";
            let officialPhoto = user.photoURL || null;

            if (parentSnap.exists()) {
                const data = parentSnap.data();
                officialName = data.fullName || `${data.firstName} ${data.lastName}`;
                officialPhoto = data.photoURL || officialPhoto;
            }

            // 1. Create the Review
            await addDoc(collection(db, "reviews"), {
                parentUid: user.uid,
                parentName: officialName,
                parentPhoto: officialPhoto,
                comment: parentReview,
                rating,
                status: "approved",
                createdAt: serverTimestamp(),
            });

            // 2. MARK AS REVIEWED in Parent document (CRITICAL)
            await updateDoc(parentDocRef, {
                hasReviewed: true,
                lastReviewDate: serverTimestamp()
            });

            onClose();
        } catch (error) {
            console.error("Submission Error:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-[100] p-4">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">Academy Review</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Help us grow the academy</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                <textarea
                    className="w-full border-2 border-slate-100 rounded-3xl p-5 text-sm bg-slate-50 outline-none focus:border-blue-500 transition-all mb-6 resize-none"
                    rows={4}
                    placeholder="Share your experience with our classes..."
                    value={parentReview}
                    onChange={(e) => setParentReview(e.target.value)}
                />

                <div className="flex justify-center gap-3 mb-8">
                    {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                            key={s}
                            size={32}
                            onClick={() => setRating(s)}
                            className={`cursor-pointer transition-transform hover:scale-110 ${rating >= s ? "fill-yellow-400 text-yellow-400" : "text-slate-200"
                                }`}
                        />
                    ))}
                </div>

                <div className="flex gap-4">
                    <Button
                        variant="ghost"
                        className="flex-1 py-6 font-black text-slate-400 uppercase tracking-widest"
                        onClick={onClose}
                    >
                        Later
                    </Button>
                    <Button
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-6 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-100"
                        onClick={handleSubmitReview}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" /> : "Submit Review"}
                    </Button>
                </div>
            </div>
        </div>
    );
};