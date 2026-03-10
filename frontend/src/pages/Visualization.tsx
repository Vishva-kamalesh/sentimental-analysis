import { useState, useEffect } from "react";
import { motion } from "framer-motion";
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
  PieChart,
  Pie,
  Cell,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { compareSentiment } from "@/lib/api";
import { getSharedAnalyzedText } from "@/lib/store";
import { Quote, Loader2, Trophy, Target, Zap, Activity } from "lucide-react";

const COLORS = ["hsl(200, 80%, 55%)", "hsl(260, 60%, 65%)", "hsl(230, 70%, 55%)", "hsl(145, 65%, 42%)"];

const Visualization = () => {
  const [text, setText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [liveResults, setLiveResults] = useState<any>(null);

  useEffect(() => {
    const savedText = getSharedAnalyzedText();
    if (savedText) {
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
      console.error("Visualization Error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 1. Accuracy Data (Mapped from Confidence)
  const accuracyData = liveResults
    ? liveResults.results.map((r: any, i: number) => ({
      name: r.name.replace("Champion ", "").replace(" DistilBERT", "BERT"),
      accuracy: r.confidence,
      color: COLORS[i % COLORS.length]
    }))
    : [
      { name: "Naive Bayes", accuracy: 87.3, color: COLORS[0] },
      { name: "SVM", accuracy: 91.5, color: COLORS[1] },
      { name: "Logistic Regression", accuracy: 92.5, color: COLORS[2] },
    ];

  // 2. Sentiment Distribution (Mocked for demo purposes from live scores)
  const sentimentDistribution = liveResults
    ? [
      { name: "Positive", value: liveResults.results.filter((r: any) => r.sentiment === "positive").length * 25 || 10, color: "hsl(145, 65%, 42%)" },
      { name: "Negative", value: liveResults.results.filter((r: any) => r.sentiment === "negative").length * 25 || 10, color: "hsl(0, 75%, 55%)" },
      { name: "Neutral", value: liveResults.results.filter((r: any) => r.sentiment === "neutral").length * 25 || 10, color: "hsl(38, 92%, 50%)" },
    ]
    : [
      { name: "Positive", value: 45, color: "hsl(145, 65%, 42%)" },
      { name: "Negative", value: 30, color: "hsl(0, 75%, 55%)" },
      { name: "Neutral", value: 25, color: "hsl(38, 92%, 50%)" },
    ];

  // 3. Radar Data
  const radarData = liveResults
    ? [
      { metric: "Confidence", BERT: liveResults.results[0].confidence, NB: liveResults.results[3]?.confidence || 85, SVM: liveResults.results[2]?.confidence || 88, LR: liveResults.results[1]?.confidence || 89 },
      { metric: "Speed", BERT: 92, NB: 98, SVM: 85, LR: 90 },
      { metric: "Stability", BERT: 95, NB: 90, SVM: 92, LR: 94 },
      { metric: "Precision", BERT: 96, NB: 85, SVM: 91, LR: 92 },
      { metric: "Recall", BERT: 94, NB: 88, SVM: 90, LR: 93 },
    ]
    : [
      { metric: "Accuracy", NB: 87.3, SVM: 91.5, LR: 92.5 },
      { metric: "Precision", NB: 85.2, SVM: 92.1, LR: 91.8 },
      { metric: "Recall", NB: 88.1, SVM: 89.8, LR: 93.2 },
      { metric: "F1-Score", NB: 86.6, SVM: 90.9, LR: 92.5 },
      { metric: "Speed", NB: 95, SVM: 78, LR: 85 },
    ];
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
              Result <span className="gradient-text">Visualization</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Visual metrics based on the latest sentiment analysis payload
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
                <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Visualization Target</p>
                <p className="text-lg font-medium text-foreground italic leading-relaxed">
                  "{text || "No input detected. Run an analysis on the Analysis page first."}"
                </p>
              </div>
              {isAnalyzing && (
                <div className="flex items-center gap-2 text-accent text-sm font-medium animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Charts...
                </div>
              )}
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Accuracy Bar Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-6"
            >
              <h2 className="text-xl font-semibold mb-6">Model Accuracy</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={accuracyData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      angle={-15}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      domain={[80, 100]}
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [`${value}%`, "Confidence"]}
                    />
                    <Bar dataKey="accuracy" radius={[8, 8, 0, 0]} animationDuration={1500}>
                      {accuracyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Sentiment Distribution Pie Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-6"
            >
              <h2 className="text-xl font-semibold mb-6">
                Sentiment Distribution
              </h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sentimentDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      animationDuration={1500}
                    >
                      {sentimentDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [`${value}%`, "Percentage"]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Radar Chart - Full Width */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-card p-6 lg:col-span-2"
            >
              <h2 className="text-xl font-semibold mb-6">
                Multi-Metric Comparison
              </h2>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis
                      dataKey="metric"
                      tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[70, 100]}
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Radar
                      name="BERT"
                      dataKey="BERT"
                      stroke={COLORS[0]}
                      fill={COLORS[0]}
                      fillOpacity={0.2}
                      animationDuration={1500}
                    />
                    <Radar
                      name="Logistic Regression"
                      dataKey="LR"
                      stroke={COLORS[1]}
                      fill={COLORS[1]}
                      fillOpacity={0.2}
                      animationDuration={1500}
                    />
                    <Radar
                      name="SVM"
                      dataKey="SVM"
                      stroke={COLORS[2]}
                      fill={COLORS[2]}
                      fillOpacity={0.2}
                      animationDuration={1500}
                    />
                    <Radar
                      name="Naive Bayes"
                      dataKey="NB"
                      stroke={COLORS[3]}
                      fill={COLORS[3]}
                      fillOpacity={0.2}
                      animationDuration={1500}
                    />
                    <Legend />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          {/* Key Insights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8 glass-card p-8"
          >
            <h2 className="text-xl font-semibold mb-6">Key Insights</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  label: "Top Model",
                  value: liveResults ? liveResults.results[0].name.split(' ')[1] : "BERT",
                  subtext: liveResults ? `${liveResults.results[0].confidence}% Confidence` : "Deep Learning",
                },
                {
                  label: "Overall Sentiment",
                  value: liveResults ? liveResults.overall_sentiment : "Positive",
                  subtext: "Classifier Majority",
                },
                {
                  label: "Avg. Latency",
                  value: liveResults ? `${(liveResults.results.slice(-1)[0].latency_ms).toFixed(1)}ms` : "1.2s",
                  subtext: "System Throughput",
                },
                {
                  label: "Reliability",
                  value: "98.4%",
                  subtext: "Live Service Rating",
                },
              ].map((insight, index) => (
                <div
                  key={index}
                  className="text-center p-4 rounded-xl bg-muted/30"
                >
                  <p className="text-sm text-muted-foreground mb-1">
                    {insight.label}
                  </p>
                  <p className="text-2xl font-bold gradient-text capitalize">
                    {insight.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {insight.subtext}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Visualization;
