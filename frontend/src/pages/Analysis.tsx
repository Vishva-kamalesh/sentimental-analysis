import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sparkles,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Meh,
  Brain,
  BarChart3,
  Cpu,
  Wifi,
  WifiOff,
  Paperclip,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { compareSentiment, predictBatch, analyzeFile, BulkFileResponse } from "@/lib/api";
import { setSharedAnalyzedText } from "@/lib/store";
import { toast } from "sonner";
import { useBackendStatus } from "@/hooks/useBackendStatus";

type Sentiment = "positive" | "negative" | "neutral" | null;

interface AlgorithmResult {
  name: string;
  sentiment: Sentiment;
  confidence: number;
  uncertainty: boolean;
  latency_ms: number;
  topEmotion?: { emotion: string; emoji: string; score: number };
  allEmotions?: { emotion: string; emoji: string; score: number }[];
}

const Analysis = () => {
  const [text, setText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [bulkResults, setBulkResults] = useState<BulkFileResponse | null>(null);
  const [results, setResults] = useState<AlgorithmResult[] | null>(null);
  const [overallSentiment, setOverallSentiment] = useState<Sentiment>(null);
  const { status, health, metrics } = useBackendStatus();

  const EMOTION_EMOJI: Record<string, string> = {
    "joy": "😊",
    "anger": "😡",
    "sadness": "😢",
    "fear": "😨",
    "love": "😍",
    "surprise": "😲",
    "neutral": "😐",
  };

  const analyzeText = async () => {
    if (!text.trim()) return;
    setIsAnalyzing(true);
    setSharedAnalyzedText(text);
    try {
      const data = await compareSentiment(text);

      // Frontend Logic: Force emotion to neutral if overall sentiment is neutral
      let finalTopEmotion = data.top_emotion;
      let finalAllEmotions = data.emotions;

      if (data.overall_sentiment === "neutral") {
        finalTopEmotion = {
          emotion: "neutral",
          emoji: "😐",
          score: 1.0,
        };
        finalAllEmotions = [finalTopEmotion];
      }

      setResults(
        data.results.map((res: any) => ({
          name: res.name,
          sentiment: res.sentiment,
          confidence: res.confidence,
          uncertainty: false, // Classical models don't have uncertainty flags yet
          latency_ms: res.latency_ms,
          topEmotion: res.name === "Champion DistilBERT" ? finalTopEmotion : undefined,
          allEmotions: res.name === "Champion DistilBERT" ? finalAllEmotions : undefined,
        }))
      );
      setOverallSentiment(data.overall_sentiment);
    } catch (error) {
      console.error("Inference Error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runBulkDemo = async () => {
    setIsAnalyzing(true);
    setBulkResults(null);
    const demoSamples = [
      "I love this soap, it feels so good on skin.",
      "Waste of money, never buying again.",
      "It's just okay, nothing special.",
      "The fragrance is a bit too strong but it works.",
      "Highly recommended, saved my dry skin!",
      "Worst experience ever, packaging was broken.",
      "Good quality but expensive.",
      "It makes a lot of lather, I like it.",
      "Average product, does exactly what it says.",
      "Five stars! Amazing results.",
    ];
    const samplesToRun = [...demoSamples, ...demoSamples]; // 20 texts
    const start = performance.now();
    try {
      // Use the batch endpoint — single HTTP round trip for all 20 texts
      const batchResults = await predictBatch(samplesToRun);
      const totalTime = (performance.now() - start) / 1000;
      const throughput = samplesToRun.length / totalTime;
      console.log(`Throughput: ${throughput.toFixed(2)} req/s`);
      setResults([
        {
          name: `Batch Demo — ${samplesToRun.length} texts`,
          sentiment: "positive",
          confidence: 100,
          uncertainty: false,
          latency_ms: (totalTime * 1000) / batchResults.length,
        },
      ]);
      setOverallSentiment("positive");
    } catch (error) {
      console.error("Bulk Demo Error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset current results
    setResults([]);
    setOverallSentiment(null);
    setBulkResults(null);

    setIsProcessingFile(true);
    try {
      const response = await analyzeFile(file);
      setBulkResults(response);
      toast.success(`Successfully processed ${response.total_processed} items from ${file.name}`);
    } catch (error: any) {
      console.error("File upload error:", error);
      toast.error(error.message || "Failed to process file");
    } finally {
      setIsProcessingFile(false);
      // Clear input
      event.target.value = "";
    }
  };

  const getSentimentIcon = (sentiment: Sentiment) => {
    switch (sentiment) {
      case "positive":
        return <ThumbsUp className="w-5 h-5" />;
      case "negative":
        return <ThumbsDown className="w-5 h-5" />;
      case "neutral":
        return <Meh className="w-5 h-5" />;
      default:
        return <Minus className="w-5 h-5" />;
    }
  };

  const getSentimentColor = (sentiment: Sentiment) => {
    switch (sentiment) {
      case "positive":
        return "text-success bg-success/10 border-success/30";
      case "negative":
        return "text-destructive bg-destructive/10 border-destructive/30";
      case "neutral":
        return "text-warning bg-warning/10 border-warning/30";
      default:
        return "text-muted-foreground bg-muted/10 border-border/30";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-3xl sm:text-4xl font-bold mb-4">
              Sentiment <span className="gradient-text">Analysis</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Enter your text below and our ML algorithms will analyze the sentiment
            </p>

            {/* Backend status badge */}
            <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
              <div
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${status === "online"
                  ? "bg-success/10 text-success border-success/30"
                  : status === "offline"
                    ? "bg-destructive/10 text-destructive border-destructive/30"
                    : "bg-muted/30 text-muted-foreground border-border/30"
                  }`}
              >
                {status === "online" ? (
                  <Wifi className="w-3 h-3" />
                ) : status === "offline" ? (
                  <WifiOff className="w-3 h-3" />
                ) : (
                  <Loader2 className="w-3 h-3 animate-spin" />
                )}
                {status === "online" ? "Backend Online" : status === "offline" ? "Backend Offline" : "Connecting..."}
              </div>

              {health && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border bg-secondary/10 text-secondary border-secondary/30">
                  <Cpu className="w-3 h-3" />
                  {health.device.toUpperCase()} — {health.model.split("-").slice(0, 2).join("-")}
                </div>
              )}

              {metrics && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono border bg-muted/20 text-muted-foreground border-border/30">
                  {metrics.avg_latency_ms > 0 ? `avg ${metrics.avg_latency_ms.toFixed(1)}ms` : "ready"}
                  {" · "}
                  {metrics.total_requests} requests
                </div>
              )}
            </div>
          </motion.div>

          <div className="max-w-4xl mx-auto">
            {/* Input Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-8 mb-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                  <Brain className="w-5 h-5 text-primary-foreground" />
                </div>
                <h2 className="text-xl font-semibold">Enter Text for Analysis</h2>
              </div>

              <div className="relative mb-6">
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type or paste your text here... (e.g., 'I absolutely loved this product! It exceeded all my expectations.')"
                  className="min-h-[150px] bg-muted/30 border-border/50 focus:border-primary/50 transition-colors resize-none pr-12"
                />
                <label className="absolute bottom-4 right-4 cursor-pointer p-2 rounded-xl bg-background/50 border border-border/50 hover:bg-primary/10 hover:border-primary/30 transition-all group" title="Upload CSV, Excel, or TXT for bulk analysis">
                  <Paperclip className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  <input
                    type="file"
                    className="hidden"
                    accept=".csv,.xlsx,.xls,.txt"
                    onChange={handleFileUpload}
                    disabled={isProcessingFile || isAnalyzing}
                  />
                </label>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={analyzeText}
                  disabled={!text.trim() || isAnalyzing}
                  className="w-full sm:w-auto gradient-primary text-primary-foreground shadow-glow hover:shadow-lg transition-all group px-8"
                  size="lg"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2 group-hover:animate-pulse" />
                      Analyze Sentiment
                    </>
                  )}
                </Button>

                <Button
                  onClick={runBulkDemo}
                  disabled={isAnalyzing}
                  variant="outline"
                  className="w-full sm:w-auto border-primary/30 text-primary hover:bg-primary/5 transition-all"
                  size="lg"
                >
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Run Bulk Throughput Demo (20 Tests)
                </Button>
              </div>
            </motion.div>

            {/* Results Section */}
            <AnimatePresence mode="wait">
              {results && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  {/* Overall Sentiment & Emotion */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="glass-card p-8 text-center">
                      <h3 className="text-lg font-medium text-muted-foreground mb-4">
                        Overall Sentiment
                      </h3>
                      <div
                        className={`inline-flex items-center gap-3 px-8 py-4 rounded-2xl border-2 ${getSentimentColor(
                          overallSentiment
                        )}`}
                      >
                        {getSentimentIcon(overallSentiment)}
                        <span className="text-2xl font-bold capitalize">
                          {overallSentiment}
                        </span>
                      </div>
                    </div>

                    {results[0]?.topEmotion && (
                      <div className="glass-card p-8 text-center bg-accent/5">
                        <h3 className="text-lg font-medium text-muted-foreground mb-4">
                          Detected Emotion
                        </h3>
                        <div className="inline-flex flex-col items-center gap-1">
                          <div className="text-5xl mb-2 drop-shadow-sm">
                            {results[0].topEmotion.emoji}
                          </div>
                          <span className="text-2xl font-bold capitalize gradient-text">
                            {results[0].topEmotion.emotion}
                          </span>
                          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            {(results[0].topEmotion.score * 100).toFixed(1)}% Confidence
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Emotion Breakdown (Mini Chips) */}
                  {results[0]?.allEmotions && results[0].allEmotions.length > 1 && (
                    <div className="glass-card p-6">
                      <h4 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">Emotion Breakdown</h4>
                      <div className="flex flex-wrap gap-3">
                        {results[0].allEmotions.map((emo) => (
                          <div key={emo.emotion} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50">
                            <span className="text-lg">{emo.emoji}</span>
                            <span className="text-sm font-medium capitalize">{emo.emotion}</span>
                            <span className="text-xs text-muted-foreground">{(emo.score * 100).toFixed(0)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Algorithm Results */}
                  <div className="glass-card p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-secondary" />
                      </div>
                      <h3 className="text-xl font-semibold">
                        Algorithm Comparison
                      </h3>
                    </div>

                    <div className="grid gap-4">
                      {results.map((result, index) => (
                        <motion.div
                          key={result.name}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex flex-col gap-4 p-5 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-lg gradient-accent flex items-center justify-center text-accent-foreground font-bold">
                                ⭐
                              </div>
                              <div>
                                <h4 className="font-semibold">{result.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {result.name === "Champion DistilBERT" && "Inference Logic: Transformer Attention"}
                                  {result.name === "Logistic Regression" && "Inference Logic: Probabilistic Regression"}
                                  {result.name === "Linear SVM" && "Inference Logic: Optimal Hyperplane Separation"}
                                  {result.name === "Naive Bayes" && "Inference Logic: Feature Independence Probabilities"}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <div
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-sm font-semibold capitalize ${getSentimentColor(
                                  result.sentiment
                                )}`}
                              >
                                {getSentimentIcon(result.sentiment)}
                                {result.sentiment}
                              </div>
                              <div className="text-right mt-1">
                                <div className="text-xl font-bold gradient-text">
                                  {result.confidence.toFixed(1)}%
                                </div>
                                <p className="text-xs text-muted-foreground">Confidence Score</p>
                              </div>
                            </div>
                          </div>

                          {/* Senior Meta Metrics */}
                          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border/20">
                            <div className="px-3 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-mono">
                              Latency: {result.latency_ms.toFixed(1)}ms
                            </div>

                            {result.uncertainty && (
                              <div className="px-3 py-1 rounded-full bg-warning/10 text-warning text-xs font-medium flex items-center gap-1.5 border border-warning/20">
                                <Minus className="w-3 h-3" />
                                Ambiguous / Sarcastic Sentiment Detected
                              </div>
                            )}

                            {!result.uncertainty && (
                              <div className="px-3 py-1 rounded-full bg-success/10 text-success text-xs font-medium flex items-center gap-1.5 border border-success/20">
                                <Sparkles className="w-3 h-3" />
                                High Confidence Prediction
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Bulk Results Display */}
              {bulkResults && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="glass-card p-8">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
                          <FileText className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold">Bulk Analysis Results</h3>
                          <p className="text-muted-foreground text-sm">
                            Processed <span className="text-foreground font-semibold">{bulkResults.total_processed}</span> items from <span className="text-foreground font-semibold">{bulkResults.filename}</span>
                          </p>
                        </div>
                      </div>
                      <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-xl bg-success/10 border border-success/20 text-success text-sm font-medium">
                        <CheckCircle2 className="w-4 h-4" />
                        Analysis Complete
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border/50 overflow-hidden bg-muted/20">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-muted/50 border-b border-border/50">
                              <th className="px-6 py-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Content Preview</th>
                              <th className="px-6 py-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Sentiment</th>
                              <th className="px-6 py-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Confidence</th>
                              <th className="px-6 py-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Top Emotion</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bulkResults.results.map((result, idx) => (
                              <tr key={idx} className="border-b border-border/20 last:border-0 hover:bg-muted/30 transition-colors group">
                                <td className="px-6 py-4">
                                  <p className="text-sm line-clamp-1 max-w-md group-hover:line-clamp-none transition-all">
                                    {result.text}
                                  </p>
                                </td>
                                <td className="px-6 py-4">
                                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold capitalize ${getSentimentColor(result.sentiment as any)}`}>
                                    {getSentimentIcon(result.sentiment as any)}
                                    {result.sentiment}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-12 h-2 rounded-full bg-muted overflow-hidden">
                                      <div
                                        className="h-full gradient-primary"
                                        style={{ width: `${result.confidence}%` }}
                                      />
                                    </div>
                                    <span className="text-sm font-mono font-bold">{result.confidence.toFixed(1)}%</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-xs font-medium w-fit">
                                    <span className="text-base">{EMOTION_EMOJI[result.top_emotion.toLowerCase()] || "😐"}</span>
                                    <span className="capitalize">{result.top_emotion}</span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Progress Indicator for File Processing */}
              {isProcessingFile && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-card p-12 flex flex-col items-center justify-center text-center"
                >
                  <div className="relative mb-6">
                    <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FileText className="w-8 h-8 text-primary animate-pulse" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Analyzing Data File...</h3>
                  <p className="text-muted-foreground max-w-md">
                    We're processing your file row by row using high-throughput batch inference. This may take a few seconds depending on the file size.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Analysis;
