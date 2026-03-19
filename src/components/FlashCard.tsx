import React, { useState } from "react";
import { FlashCard } from "../lib/flashcards";

interface Props {
    card: FlashCard;
}

const FlashCardComponent: React.FC<Props> = ({ card }) => {
    const [showGuide, setShowGuide] = useState(false);

    return (
        <div className="relative p-6 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl shadow-xl max-w-md mx-auto my-4 border-l-4 border-indigo-500 hover:scale-105 transition-transform duration-200 cursor-pointer">
            <h3 className="text-xl font-bold text-indigo-700 mb-2">{card.title}</h3>
            <p className="text-gray-700 mb-4">{card.description}</p>
            {card.actionLabel && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowGuide(true);
                        card.action && card.action();
                    }}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    {card.actionLabel}
                </button>
            )}

            {/* Guide Modal */}
            {showGuide && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-2xl relative">
                        <h4 className="text-lg font-bold mb-3">{card.title} - Guide</h4>
                        <p className="text-gray-700 mb-4">
                            1️⃣ Upload a PDF file using the upload button. <br />
                            2️⃣ Click ▶ Play to start reading aloud. <br />
                            3️⃣ Adjust voice and speed using the controls. <br />
                            4️⃣ Click on any word in the PDF to see its dictionary meaning. <br />
                            5️⃣ Click anywhere outside this guide to close it.
                        </p>
                        <button
                            onClick={() => setShowGuide(false)}
                            className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
                        >
                            ✖
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FlashCardComponent;