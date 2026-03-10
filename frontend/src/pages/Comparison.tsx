import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  CheckCircle,
  Trophy,
  Zap,
  Target,
  Search,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Meh,
  Minus,
  Quote
} from "lucide-react";
import { compareSentiment } from "@/lib/api";
import { getSharedAnalyzedText } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const Comparison = () => {
  const [text, setText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [liveResults, setLiveResults] = useState<any>(null);

  useEffect(() => {
    const savedText = getSharedAnalyzedText();
    if (savedText && savedText !== text) {
      setText(savedText);
      runAnalysis(savedText);
    }
  }, []);

  const runAnalysis = async (inputText: string) => {
    setIsAnalyzing(true);
    try {
      const data = await compareSentiment(inputText);
      setLiveResults(data);
    } catch (error) {
      console.error("Comparison Error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyze = () => {
    if (text.trim()) {
      runAnalysis(text);
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "positive": return <ThumbsUp className="w-4 h-4" />;
      case "negative": return <ThumbsDown className="w-4 h-4" />;
      case "neutral": return <Meh className="w-4 h-4" />;
      default: return <Minus className="w-4 h-4" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive": return "text-success bg-success/10 border-success/30";
      case "negative": return "text-destructive bg-destructive/10 border-destructive/30";
      case "neutral": return "text-warning bg-warning/10 border-warning/30";
      default: return "text-muted-foreground bg-muted/10 border-border/30";
    }
  };

  // Build chart data from live results or fallback to baseline
  const chartData = liveResults
    ? liveResults.results.map((r: any) => ({
      name: r.name === "Champion DistilBERT" ? "BERT" : r.name,
      confidence: r.confidence,
      fill: r.name.includes("BERT") ? "hsl(230, 70%, 55%)" :
        r.name.includes("LR") ? "hsl(200, 80%, 55%)" : "hsl(260, 60%, 65%)"
    }))
    : [
      { name: "Naive Bayes", confidence: 85.8, fill: "hsl(200, 80%, 55%)" },
      { name: "SVM", confidence: 88.4, fill: "hsl(260, 60%, 65%)" },
      { name: "Logistic Reg.", confidence: 89.5, fill: "hsl(230, 70%, 55%)" },
    ];

  const displayResults = liveResults ? liveResults.results : [];
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
              Algorithm <span className="gradient-text">Comparison</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Real-time cross-validation of deep learning vs. classical models
            </p>
          </motion.div>

          {/* Current Input Display */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 mb-12 max-w-3xl mx-auto border-accent/20 bg-accent/5"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                <Quote className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Current Comparison Target</p>
                <p className="text-lg font-medium text-foreground italic leading-relaxed">
                  "{text || "No input detected. Run an analysis on the Analysis page first."}"
                </p>
              </div>
              {isAnalyzing && (
                <div className="flex items-center gap-2 text-accent text-sm font-medium animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating...
                </div>
              )}
            </div>
          </motion.div>

          {/* Stats Bar */}
          {liveResults && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="grid sm:grid-cols-4 gap-4 mb-12"
            >
              {[
                { label: "Winner", value: liveResults.results[0].name.split(' ')[1] || "BERT", icon: Trophy, color: "text-yellow-500" },
                { label: "Confidence", value: `${liveResults.results[0].confidence}%`, icon: Target, color: "text-blue-500" },
                { label: "Latency", value: `${liveResults.results[liveResults.results.length - 1].latency_ms}ms`, icon: Zap, color: "text-purple-500" },
                { label: "Consensus", value: "High", icon: CheckCircle, color: "text-success" },
              ].map((stat, i) => (
                <div key={i} className="glass-card p-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg bg-background/50 flex items-center justify-center ${stat.color}`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="font-bold">{stat.value}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* Chart Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-8 mb-12"
          >
            <h2 className="text-xl font-semibold mb-6">Confidence Score Comparison</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: "hsl(var(--foreground))" }}
                    width={100}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`${value}%`, "Confidence"]}
                  />
                  <Bar
                    dataKey="confidence"
                    radius={[0, 8, 8, 0]}
                    animationDuration={1500}
                  >
                    {chartData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Comparison Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card overflow-hidden"
          >
            <div className="p-6 border-b border-border/50">
              <h2 className="text-xl font-semibold">Live Comparison Metrics</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/30">
                    <th className="text-left p-4 font-semibold text-sm">Algorithm</th>
                    <th className="text-center p-4 font-semibold text-sm">Sentiment</th>
                    <th className="text-center p-4 font-semibold text-sm">Confidence</th>
                    <th className="text-center p-4 font-semibold text-sm">Latency</th>
                    <th className="text-center p-4 font-semibold text-sm">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {!liveResults && (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-muted-foreground">
                        Enter text above and run the comparison to see live algorithm data
                      </td>
                    </tr>
                  )}
                  {displayResults.map((row: any, index: number) => (
                    <motion.tr
                      key={row.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                    >
                      <td className="p-4">
                        <span className="font-semibold text-sm">{row.name}</span>
                      </td>
                      <td className="p-4 text-center">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold capitalize ${getSentimentColor(row.sentiment)}`}>
                          {getSentimentIcon(row.sentiment)}
                          {row.sentiment}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="font-bold text-sm">
                          {row.confidence.toFixed(1)}%
                        </span>
                      </td>
                      <td className="p-4 text-center text-sm text-muted-foreground">
                        {row.latency_ms}ms
                      </td>
                      <td className="p-4 text-center">
                        {index === 0 ? (
                          <div className="flex items-center justify-center gap-1 text-xs font-bold text-yellow-500">
                            <Trophy className="w-3 h-3" /> Best
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                            <CheckCircle className="w-3 h-3" /> Valid
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Comparison;
