import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, StopCircle, RefreshCcw, ScanFace, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { analyzeFace, FaceAnalyzeResponse } from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const EMOTION_EMOJI: Record<string, string> = {
    joy: "😊", happy: "😊", anger: "😡", angry: "😡",
    sadness: "😢", sad: "😢", fear: "😨", love: "😍",
    surprise: "😲", neutral: "😐",
};

export const FaceScanner = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLiveMode, setIsLiveMode] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<FaceAnalyzeResponse | null>(null);
    const [videoSize, setVideoSize] = useState<{ w: number; h: number } | null>(null);

    const isLiveModeRef = useRef(false);

    // Stop all tracks when unmounting or explicitly stopping
    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setStream(null);
        }
        setIsLiveMode(false);
        isLiveModeRef.current = false;
        setResult(null);
    }, [stream]);

    // Request camera access
    const startCamera = async () => {
        setError(null);
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
            });
            setStream(mediaStream);
        } catch (err: any) {
            console.error("Camera error:", err);
            setError(err.message || "Failed to access webcam.");
            toast.error("Webcam Error: " + (err.message || "Please check permissions."));
        }
    };

    // Attach stream to video tag whenever stream changes
    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, [stopCamera]);

    // Single Analysis
    const captureAndAnalyze = async () => {
        if (!videoRef.current || !canvasRef.current || !stream) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (video.videoWidth === 0) {
            toast.error("Waiting for video feed to start...");
            return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64Image = canvas.toDataURL("image/jpeg", 0.8);

        setIsAnalyzing(true);
        try {
            const res = await analyzeFace(base64Image);
            setResult(res);
            setVideoSize({ w: video.videoWidth, h: video.videoHeight });
            toast.success("Analysis complete!");
        } catch (err: any) {
            toast.error(err.message || "Face analysis failed.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Live Mode Loop
    const runAnalysisLoop = async () => {
        if (!videoRef.current || !canvasRef.current || !isLiveModeRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (video.videoWidth > 0 && canvas.getContext("2d")) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");

            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const base64Image = canvas.toDataURL("image/jpeg", 0.7);

                try {
                    const res = await analyzeFace(base64Image);
                    if (isLiveModeRef.current) {
                        setResult(res);
                        setVideoSize({ w: video.videoWidth, h: video.videoHeight });
                    }
                } catch (err) {
                    // Ignore errors during live loop
                }
            }
        }

        if (isLiveModeRef.current) {
            setTimeout(runAnalysisLoop, 1000); // 1 frame per second
        }
    };

    const toggleLiveMode = () => {
        if (isLiveMode) {
            isLiveModeRef.current = false;
            setIsLiveMode(false);
            toast.info("Live mode paused.");
        } else {
            isLiveModeRef.current = true;
            setIsLiveMode(true);
            toast.success("Live mode started!");
            runAnalysisLoop();
        }
    };

    return (
        <div className="glass-card p-8 flex flex-col items-center">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6 w-full justify-start">
                <div className="w-10 h-10 rounded-xl gradient-secondary flex items-center justify-center">
                    <ScanFace className="w-5 h-5 text-secondary-foreground" />
                </div>
                <div>
                    <h2 className="text-xl font-semibold">Facial Sentiment Scanner</h2>
                    <p className="text-sm text-muted-foreground">Analyze your emotion via webcam</p>
                </div>
            </div>

            {/* Video Container */}
            <div className="w-full max-w-2xl relative mb-6 rounded-2xl bg-black aspect-video border-2 border-primary/20 shadow-2xl overflow-hidden flex items-center justify-center">

                {/* Always render the video tag if stream exists */}
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${stream ? 'block' : 'hidden'}`}
                />

                {/* Hidden canvas for taking snapshots */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Placeholder when no stream */}
                {!stream && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-[#0f172a] p-6 text-center z-10">
                        {error ? (
                            <>
                                <ScanFace className="w-16 h-16 mb-4 opacity-50 text-destructive" />
                                <p className="text-destructive font-semibold">{error}</p>
                            </>
                        ) : (
                            <>
                                <ScanFace className="w-16 h-16 mb-4 opacity-50" />
                                <p>Click "Start Camera" to show the prediction and the live video.</p>
                            </>
                        )}
                    </div>
                )}

                {/* Bounding Box Overlay */}
                {stream && result?.box && videoSize && (!isAnalyzing || isLiveMode) && (
                    <div
                        className="absolute border-2 border-[#36ff0c] pointer-events-none transition-all duration-300 z-20 flex justify-center"
                        style={{
                            left: `${(result.box.x / videoSize.w) * 100}%`,
                            top: `${(result.box.y / videoSize.h) * 100}%`,
                            width: `${(result.box.w / videoSize.w) * 100}%`,
                            height: `${(result.box.h / videoSize.h) * 100}%`,
                            boxShadow: "0 0 10px rgba(54, 255, 12, 0.5)",
                        }}
                    >
                        <div className="absolute -top-7 whitespace-nowrap text-[#36ff0c] text-sm font-semibold tracking-wide drop-shadow-md bg-black/50 px-2 py-0.5 rounded">
                            {result.dominant_emotion.toUpperCase()}
                        </div>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="flex flex-wrap gap-3 w-full justify-center">
                {!stream ? (
                    <Button onClick={startCamera} className="w-full sm:w-auto hover:scale-105 transition-transform">
                        <Camera className="w-4 h-4 mr-2" />
                        Start Camera
                    </Button>
                ) : (
                    <>
                        <Button onClick={stopCamera} variant="destructive" className="w-full sm:w-auto">
                            <StopCircle className="w-4 h-4 mr-2" />
                            Stop Camera
                        </Button>

                        <Button
                            onClick={captureAndAnalyze}
                            disabled={isAnalyzing || isLiveMode}
                            variant="outline"
                            className="w-full sm:w-auto relative"
                        >
                            {isAnalyzing ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
                            ) : (
                                <><ScanFace className="w-4 h-4 mr-2" /> Single Scan</>
                            )}
                        </Button>

                        <Button
                            onClick={toggleLiveMode}
                            className={`w-full sm:w-auto shadow-glow relative ${isLiveMode ? 'bg-[#36ff0c] text-black hover:bg-[#2ee608]' : 'gradient-primary text-primary-foreground'}`}
                        >
                            {isLiveMode ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Live Mode Active</>
                            ) : (
                                <><RefreshCcw className="w-4 h-4 mr-2" /> Start Live Mode</>
                            )}
                        </Button>
                    </>
                )}
            </div>

            {/* Emotion Result Output */}
            <AnimatePresence>
                {result && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: "auto" }}
                        exit={{ opacity: 0, y: 10, height: 0 }}
                        className="w-full mt-6"
                    >
                        <div className="p-4 rounded-xl bg-muted/30 border border-border/50 text-center">
                            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Detected Emotion</h3>
                            <div className="flex flex-col items-center">
                                <div className="text-5xl mb-2 drop-shadow-sm">
                                    {EMOTION_EMOJI[result.dominant_emotion.toLowerCase()] || "😐"}
                                </div>
                                <div className="text-2xl font-bold gradient-text capitalize">
                                    {result.dominant_emotion}
                                </div>
                                {result.emotions && result.emotions.length > 0 && (
                                    <p className="text-sm text-foreground/80 mt-1 font-mono bg-background/50 px-3 py-1 rounded-full">
                                        {(result.emotions[0].score * 100).toFixed(1)}% Confidence
                                    </p>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
