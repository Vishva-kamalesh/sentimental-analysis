import { useState, useRef, useEffect } from "react";
import { Mic, Square, Play, Trash2, Loader2, Volume2, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { analyzeVoice, VoiceAnalyzeResponse } from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export const VoiceScanner = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<VoiceAnalyzeResponse | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const [volume, setVolume] = useState(0); // Real volume level (0-100)

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    // Cleanup URLs and AudioContext
    useEffect(() => {
        return () => {
            if (audioUrl) URL.revokeObjectURL(audioUrl);
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close().catch(console.error);
            }
        };
    }, [audioUrl]);

    const startRecording = async () => {
        setResult(null);
        setAudioBlob(null);
        setAudioUrl(null);
        chunksRef.current = [];
        setVolume(0);

        try {
            // log devices to console for troubleshooting
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioDevices = devices.filter(d => d.kind === 'audioinput');
            console.log("🎤 Available Audio Inputs:", audioDevices.map(d => d.label || 'Unnamed Mic'));

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: false,
                    autoGainControl: true
                }
            });

            // ── Real-time Volume Monitoring ──
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

            // Critical for browsers: resume context on user interaction
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }

            const analyser = audioContext.createAnalyser();
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);
            analyser.fftSize = 256;

            audioContextRef.current = audioContext;
            analyserRef.current = analyser;

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            console.log("🔊 AudioContext State:", audioContext.state);

            const updateVolume = () => {
                if (!analyserRef.current) return;
                analyserRef.current.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i];
                }
                const average = sum / bufferLength;

                // If average is 0, the mic is practically dead/muted
                if (average > 0) {
                    setVolume(Math.min(100, Math.floor(average * 2.5)));
                } else {
                    setVolume(0);
                }

                animationFrameRef.current = requestAnimationFrame(updateVolume);
            };
            updateVolume();

            // ── MIME Selection ──
            const mimeType = [
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/ogg;codecs=opus',
                'audio/mp4'
            ].find(type => MediaRecorder.isTypeSupported(type)) || '';

            const recorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (e) => {
                console.log("Data available event triggered, size:", e.data.size);
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            recorder.onstop = () => {
                console.log("Recorder stopped. Total chunks:", chunksRef.current.length);
                if (chunksRef.current.length === 0) {
                    toast.error("No audio data captured. Please check your microphone and try again.");
                    setIsRecording(false);
                    return;
                }

                const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
                console.log("Created blob, size:", blob.size);

                const url = URL.createObjectURL(blob);
                setAudioBlob(blob);
                setAudioUrl(url);

                // Stop all tracks to release the mic
                stream.getTracks().forEach(track => {
                    track.stop();
                    console.log("Track stopped:", track.label);
                });

                // Stop volume analyzer
                if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
                if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                    audioContextRef.current.close().catch(console.error);
                }
            };

            // Remove timeslice for better compatibility, use stop() to trigger final data
            recorder.start();
            console.log("MediaRecorder started with mimeType:", mimeType);

            setIsRecording(true);
            setRecordingTime(0);

            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

            toast.info("Recording... speak now!");
        } catch (err: any) {
            console.error("Mic error:", err);
            toast.error("Could not access microphone. Ensure permissions are granted.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
            toast.success("Recording captured!");
        }
    };

    const runAnalysis = async () => {
        if (!audioBlob) return;

        setIsAnalyzing(true);
        try {
            const res = await analyzeVoice(audioBlob);
            setResult(res);
            toast.success("Voice analysis complete!");
        } catch (err: any) {
            toast.error(err.message || "Voice analysis failed.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="glass-card p-8 flex flex-col items-center">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6 w-full justify-start">
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                    <Mic className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                    <h2 className="text-xl font-semibold">Voice Sentiment Analysis</h2>
                    <p className="text-sm text-muted-foreground">Speak to analyze your tone & sentiment</p>
                </div>
            </div>

            {/* Recording Visualization Area */}
            <div className="w-full max-w-2xl min-h-[200px] relative mb-6 rounded-3xl bg-slate-950/50 border-2 border-primary/20 overflow-hidden flex flex-col items-center justify-center p-8">

                <AnimatePresence mode="wait">
                    {isRecording ? (
                        <motion.div
                            key="recording"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="flex flex-col items-center w-full"
                        >
                            {/* Real Volume Visualizer */}
                            <div className="flex items-center justify-center gap-1.5 h-16 mb-6">
                                {[...Array(12)].map((_, i) => {
                                    // Each bar responds differently to the volume for a natural look
                                    const amp = Math.max(10, volume * (0.5 + Math.random() * 0.5));
                                    return (
                                        <motion.div
                                            key={i}
                                            animate={{
                                                height: [10, amp, 10],
                                                backgroundColor: volume > 30 ? "#3b82f6" : "#1e40af"
                                            }}
                                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                            className="w-2 bg-primary rounded-full"
                                        />
                                    );
                                })}
                            </div>

                            <div className="text-3xl font-mono text-primary flex items-center gap-3">
                                <span className="w-3 h-3 rounded-full bg-destructive animate-ping" />
                                {formatTime(recordingTime)}
                            </div>
                            <p className="text-sm text-primary/60 mt-2 uppercase tracking-[0.2em] font-medium">Recording Voices...</p>
                        </motion.div>
                    ) : audioUrl ? (
                        <motion.div
                            key="preview"
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="flex flex-col items-center w-full"
                        >
                            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                                <Volume2 className="w-8 h-8 text-primary" />
                            </div>
                            <audio src={audioUrl} controls className="w-full max-w-sm h-10 mb-2 brightness-90 contrast-125" />
                            <p className="text-xs text-muted-foreground uppercase">Recording captured ( {formatTime(recordingTime)} )</p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="idle"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center"
                        >
                            <div className="w-20 h-20 rounded-full border-2 border-dashed border-primary/30 flex items-center justify-center mx-auto mb-4">
                                <Mic className="w-10 h-10 text-primary/30" />
                            </div>
                            <p className="text-muted-foreground">Click the button below to start recording</p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Status Overlay */}
                {isAnalyzing && (
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-30 flex flex-col items-center justify-center">
                        <div className="relative">
                            <Loader2 className="w-12 h-12 text-primary animate-spin" />
                            <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="absolute inset-0 bg-primary/20 blur-xl -z-10 rounded-full"
                            />
                        </div>
                        <p className="mt-4 font-semibold text-primary animate-pulse">Analyzing Speech Sentiment...</p>
                        <p className="text-xs text-muted-foreground mt-1">Transcribing and running DistilBERT</p>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="flex flex-wrap gap-4 w-full justify-center">
                {!isRecording ? (
                    <>
                        <Button
                            onClick={startRecording}
                            className="group relative overflow-hidden h-12 px-8 rounded-full shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 gradient-primary"
                        >
                            <Mic className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                            {audioBlob ? "Record Again" : "Start Recording"}
                        </Button>

                        {audioBlob && (
                            <Button
                                onClick={runAnalysis}
                                disabled={isAnalyzing}
                                className="h-12 px-8 rounded-full border-2 border-primary/20 hover:bg-primary/5 transition-all"
                                variant="outline"
                            >
                                <Play className="w-5 h-5 mr-2 text-primary" />
                                Run Analysis
                            </Button>
                        )}

                        {audioBlob && (
                            <Button
                                onClick={() => {
                                    setAudioBlob(null);
                                    setAudioUrl(null);
                                    setResult(null);
                                }}
                                size="icon"
                                variant="ghost"
                                className="h-12 w-12 rounded-full text-destructive hover:bg-destructive/10"
                            >
                                <Trash2 className="w-5 h-5" />
                            </Button>
                        )}
                    </>
                ) : (
                    <Button
                        onClick={stopRecording}
                        variant="destructive"
                        className="h-12 px-8 rounded-full shadow-xl animate-pulse flex items-center gap-2"
                    >
                        <div className="w-3 h-3 rounded-full bg-white shadow-[0_0_10px_white]" />
                        Stop & Analyze
                    </Button>
                )}
            </div>

            {/* Result Area */}
            <AnimatePresence>
                {result && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full mt-10 space-y-6"
                    >
                        {/* Transcription */}
                        <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-2 opacity-10">
                                <Activity className="w-12 h-12" />
                            </div>
                            <h3 className="text-xs font-bold text-primary uppercase tracking-tighter mb-2">Transcribed Text</h3>
                            <p className="text-lg italic font-serif leading-relaxed text-foreground/90">
                                "{result.text}"
                            </p>
                        </div>

                        {/* Analysis Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Primary Sentiment */}
                            <div className="glass-card p-6 flex items-center justify-between border-primary/10">
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Sentiment</p>
                                    <h4 className="text-2xl font-black capitalize gradient-text">{result.sentiment}</h4>
                                </div>
                                <div className="text-4xl bg-background/50 w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner">
                                    {result.sentiment === 'positive' ? '🔥' : result.sentiment === 'negative' ? '⚠️' : '⚓'}
                                </div>
                            </div>

                            {/* Top Emotion */}
                            <div className="glass-card p-6 flex items-center justify-between border-secondary/20">
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Top Emotion</p>
                                    <h4 className="text-2xl font-black capitalize text-secondary">{result.top_emotion.emotion}</h4>
                                </div>
                                <div className="text-5xl drop-shadow-lg">
                                    {result.top_emotion.emoji}
                                </div>
                            </div>
                        </div>

                        {/* Confidence Score */}
                        <div className="w-full bg-muted/30 rounded-full h-8 p-1 flex items-center px-4">
                            <span className="text-[10px] font-bold uppercase mr-4 text-muted-foreground">Confidence</span>
                            <div className="flex-1 bg-background/50 h-2 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${result.confidence * 100}%` }}
                                    className="h-full gradient-primary"
                                />
                            </div>
                            <span className="ml-4 font-mono font-bold text-primary">{(result.confidence * 100).toFixed(1)}%</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
