import React, { useState, useEffect, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { GlobalWorkerOptions } from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min?url";

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

    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    // 🔊 Load voices
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

    // ✂️ Split text into readable chunks
    const splitTextIntoChunks = (text: string) => {
        return text.match(/[^.!?]+[.!?]+/g) || [text];
    };

    // 📄 Upload + Extract
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

            const pdf = await pdfjsLib.getDocument({
                data: arrayBuffer,
            }).promise;

            let extractedText = "";

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();

                const pageText = content.items
                    .map((item: any) => item.str || "")
                    .join(" ");

                extractedText += pageText + " ";
            }

            if (!extractedText.trim()) {
                extractedText =
                    "⚠️ No readable text found. This may be a scanned PDF.";
            }

            const splitChunks = splitTextIntoChunks(extractedText);

            setText(extractedText);
            setChunks(splitChunks);
        } catch (error) {
            console.error(error);
            setText("❌ Failed to read PDF.");
        } finally {
            setLoading(false);
        }
    };

    // ▶️ Speak chunk by chunk
    const speakChunk = (index: number) => {
        if (index >= chunks.length) {
            setIsSpeaking(false);
            return;
        }

        const utterance = new SpeechSynthesisUtterance(chunks[index]);

        const voice = voices.find((v) => v.name === selectedVoice);
        if (voice) utterance.voice = voice;

        utterance.rate = rate;

        utterance.onend = () => {
            setCurrentIndex((prev) => {
                const next = prev + 1;
                speakChunk(next);
                return next;
            });
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

    // 🧠 AI placeholders (future integration)
    const handleSummarize = () => {
        alert("AI Summary coming soon 🚀");
    };

    const handleExplain = () => {
        alert("AI Explanation mode coming soon 🤖");
    };

    return (
        <div className="p-6 bg-white rounded-2xl shadow-xl max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-blue-600 mb-4">
                📄 AI Audio PDF Reader
            </h2>

            {/* Upload */}
            <input
                type="file"
                accept="application/pdf"
                onChange={handleFileUpload}
                className="mb-3"
            />

            <p className="text-sm text-gray-500 mb-2">
                {fileName ? `Loaded: ${fileName}` : "No file selected"}
            </p>

            {loading && (
                <p className="text-blue-500 mb-3">⏳ Extracting PDF...</p>
            )}

            {/* Controls */}
            <div className="flex flex-wrap gap-3 mb-4">
                <button onClick={handlePlay} className="bg-green-600 text-white px-4 py-2 rounded-xl">
                    ▶ Play
                </button>
                <button onClick={handlePause} className="bg-yellow-500 text-white px-4 py-2 rounded-xl">
                    ⏸ Pause
                </button>
                <button onClick={handleResume} className="bg-blue-500 text-white px-4 py-2 rounded-xl">
                    🔄 Resume
                </button>
                <button onClick={handleStop} className="bg-red-600 text-white px-4 py-2 rounded-xl">
                    ⛔ Stop
                </button>
            </div>

            {/* AI Buttons */}
            <div className="flex gap-3 mb-4">
                <button onClick={handleSummarize} className="bg-purple-600 text-white px-4 py-2 rounded-xl">
                    🧠 Summarize
                </button>
                <button onClick={handleExplain} className="bg-indigo-600 text-white px-4 py-2 rounded-xl">
                    🤖 Explain
                </button>
            </div>

            {/* Voice */}
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

            {/* Speed */}
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

            {/* Highlighted Reading */}
            <div className="bg-gray-100 p-4 rounded-xl h-64 overflow-y-auto text-sm leading-6">
                {chunks.length > 0 ? (
                    chunks.map((chunk, i) => (
                        <span
                            key={i}
                            className={`${i === currentIndex
                                    ? "bg-yellow-300 text-black font-semibold"
                                    : ""
                                }`}
                        >
                            {chunk + " "}
                        </span>
                    ))
                ) : (
                    "Upload a PDF to start reading"
                )}
            </div>
        </div>
    );
};

export default AudioPDFReader;