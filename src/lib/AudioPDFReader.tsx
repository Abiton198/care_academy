import React, { useState, useEffect, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { GlobalWorkerOptions } from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min?url";
import dictionary from "@/data/dictionary";
import { createPortal } from "react-dom";

GlobalWorkerOptions.workerSrc = workerSrc;

const AudioPDFReader: React.FC = () => {
    const [text, setText] = useState("");
    const [chunks, setChunks] = useState<string[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoice, setSelectedVoice] = useState("");
    const [rate, setRate] = useState(1);

    const [loading, setLoading] = useState(false);
    const [fileName, setFileName] = useState("");
    const [isSpeaking, setIsSpeaking] = useState(false);

    // 📖 Dictionary state
    const [selectedWord, setSelectedWord] = useState<string | null>(null);
    const [definition, setDefinition] = useState("");
    const [modalPos, setModalPos] = useState({ x: 0, y: 0 });
    const [showModal, setShowModal] = useState(false);

    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);


    // Load voices
    useEffect(() => {
        const loadVoices = () => {
            const voicesList = speechSynthesis.getVoices();
            setVoices(voicesList);

            if (voicesList.length > 0 && !selectedVoice) {
                setSelectedVoice(voicesList[0].name);
            }
        };

        loadVoices();
        speechSynthesis.onvoiceschanged = loadVoices;
    }, []);

    // ✂️ Split text
    const splitTextIntoChunks = (text: string) => {
        return text.match(/[^.!?]+[.!?]+/g) || [text];
    };

    // 📄 Upload PDF
    const handleFileUpload = async (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        setLoading(true);
        setText("");
        setChunks([]);
        setCurrentIndex(0);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            let extractedText = "";

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();

                const pageText = content.items
                    .map((item: any) => item.str || "")
                    .join(" ");

                extractedText += pageText + " ";
            }

            const splitChunks = splitTextIntoChunks(extractedText);

            setText(extractedText);
            setChunks(splitChunks);
        } catch {
            setText("❌ Failed to read PDF.");
        } finally {
            setLoading(false);
        }
    };

    // ▶️ Speech
    const speakChunk = (index: number) => {
        if (index >= chunks.length) {
            setIsSpeaking(false);
            return;
        }

        // ✅ update highlight FIRST (sync)
        setCurrentIndex(index);

        const utterance = new SpeechSynthesisUtterance(chunks[index]);

        const voice = voices.find((v) => v.name === selectedVoice);
        if (voice) utterance.voice = voice;

        utterance.rate = rate;

        utterance.onend = () => {
            speakChunk(index + 1); // ✅ no state dependency
        };

        utteranceRef.current = utterance;
        speechSynthesis.speak(utterance);
    };

    const handlePlay = () => {
        if (!chunks.length) return;
        setIsSpeaking(true);
        speakChunk(currentIndex);
    };

    const handlePause = () => speechSynthesis.pause();
    const handleResume = () => speechSynthesis.resume();

    const handleStop = () => {
        speechSynthesis.cancel();
        setIsSpeaking(false);
    };

    // 📖 Dictionary logic
    const fetchDefinition = async (word: string) => {
        try {
            setDefinition("Loading...");

            const res = await fetch(
                `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`
            );
            const data = await res.json();

            const meanings = data?.[0]?.meanings || [];

            const formatted = meanings
                .slice(0, 2) // limit to 2 for clean UI
                .map((m: any) => {
                    return `(${m.partOfSpeech}) ${m.definitions[0].definition}`;
                })
                .join("\n");

            setDefinition(formatted || "No definition found.");
        } catch {
            setDefinition("Definition not available.");
        }
    };

    const handleWordClick = async (
        word: string,
        e: React.MouseEvent<HTMLSpanElement>
    ) => {
        const cleanWord = word.replace(/[^a-zA-Z]/g, "");
        if (!cleanWord) return;

        setSelectedWord(cleanWord);

        const rect = e.currentTarget.getBoundingClientRect();

        const modalWidth = 260;
        const modalHeight = 120;

        let x = rect.left + rect.width / 2 - modalWidth / 2;
        let y = rect.bottom + 8;

        // 🧠 Keep inside screen horizontally
        if (x < 10) x = 10;
        if (x + modalWidth > window.innerWidth) {
            x = window.innerWidth - modalWidth - 10;
        }

        // 🧠 If too low → show above word
        if (y + modalHeight > window.innerHeight) {
            y = rect.top - modalHeight - 8;
        }

        setModalPos({ x, y });

        setShowModal(true);
        await fetchDefinition(cleanWord);
    };

    const closeModal = () => setShowModal(false);

    return (
        <div className="p-6 bg-white rounded-2xl shadow-xl max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-blue-600 mb-4">
                📄 AI Audio PDF Reader
            </h2>

            <input
                type="file"
                accept="application/pdf"
                onChange={handleFileUpload}
                className="mb-3"
            />

            <p className="text-sm text-gray-500 mb-2">
                {fileName ? `Loaded: ${fileName}` : "No file selected"}
            </p>

            {loading && <p className="text-blue-500">⏳ Extracting PDF...</p>}

            {/* Voice Selection */}
            <div className="mb-4">
                <label className="block font-semibold mb-1">Voice</label>
                <select
                    value={selectedVoice}
                    onChange={(e) => setSelectedVoice(e.target.value)}
                    className="border p-2 rounded w-full"
                >
                    {voices.map((voice, i) => (
                        <option key={i} value={voice.name}>
                            {voice.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Speed Control */}
            <div className="mb-4">
                <label className="block font-semibold mb-1">
                    Speed: {rate.toFixed(1)}
                </label>
                <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={rate}
                    onChange={(e) => setRate(parseFloat(e.target.value))}
                    className="w-full"
                />
            </div>

            {/* Controls */}
            <div className="flex flex-wrap gap-3 mb-4">
                <button onClick={handlePlay} className="bg-green-600 text-white px-4 py-2 rounded-xl">▶ Play</button>
                <button onClick={handlePause} className="bg-yellow-500 text-white px-4 py-2 rounded-xl">⏸ Pause</button>
                <button onClick={handleResume} className="bg-blue-500 text-white px-4 py-2 rounded-xl">🔄 Resume</button>
                <button onClick={handleStop} className="bg-red-600 text-white px-4 py-2 rounded-xl">⛔ Stop</button>
            </div>

            {/* Text Display */}
            <div className="bg-gray-100 p-4 rounded-xl h-64 overflow-y-auto text-sm leading-6 relative">
                {chunks.length > 0 ? (
                    chunks.map((chunk, i) => (
                        <span key={i}>
                            {chunk.split(" ").map((word, j) => (
                                <span
                                    key={j}
                                    onClick={(e) => handleWordClick(word, e)}
                                    className={`cursor-pointer hover:bg-blue-200 ${i === currentIndex
                                        ? "bg-yellow-300 font-semibold"
                                        : ""
                                        }`}
                                >
                                    {word + " "}
                                </span>
                            ))}
                        </span>
                    ))
                ) : (
                    "Upload a PDF to start reading"
                )}
            </div>

            {/* Modal */}
            {showModal &&
                createPortal(
                    <>
                        {/* overlay */}
                        <div
                            className="fixed inset-0 z-[9998]"
                            onClick={closeModal}
                        />

                        {/* modal */}
                        <div
                            className="fixed z-[9999] bg-white border shadow-2xl rounded-xl p-3 w-[260px] text-sm"
                            style={{
                                top: modalPos.y,
                                left: modalPos.x,
                            }}
                        >
                            <p className="font-bold text-blue-600 mb-1">
                                {selectedWord}
                            </p>

                            <p className="whitespace-pre-line">
                                {definition}
                            </p>
                            <p className="text-xs text-gray-400 mt-2">
                                (tap anywhere to close)
                            </p>
                        </div>
                    </>,
                    document.body
                )}
        </div>
    );
};

export default AudioPDFReader;