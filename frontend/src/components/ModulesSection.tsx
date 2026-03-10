import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import {
  FileText,
  Settings,
  Layers,
  GitCompare,
  BarChart2,
  PieChart,
  CheckCircle2,
} from "lucide-react";

const modules = [
  {
    icon: FileText,
    title: "Text Input & Data Collection",
    description: "Collecting and inputting textual data for analysis",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Settings,
    title: "Text Pre-processing",
    description: "Cleaning, tokenization, and normalization",
    color: "from-purple-500 to-pink-500",
  },
  {
    icon: Layers,
    title: "Feature Extraction",
    description: "TF-IDF and word embedding techniques",
    color: "from-orange-500 to-red-500",
  },
  {
    icon: GitCompare,
    title: "Multi-Algorithm Analysis",
    description: "NB, SVM, and Logistic Regression",
    color: "from-green-500 to-emerald-500",
  },
  {
    icon: BarChart2,
    title: "Performance Evaluation",
    description: "Accuracy, precision, and recall metrics",
    color: "from-indigo-500 to-violet-500",
  },
  {
    icon: PieChart,
    title: "Result Visualization",
    description: "Charts and graphical representations",
    color: "from-pink-500 to-rose-500",
  },
  {
    icon: CheckCircle2,
    title: "Final Output & Recommendation",
    description: "Best algorithm selection and results",
    color: "from-teal-500 to-cyan-500",
  },
];

export const ModulesSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="modules" className="py-24" ref={ref}>
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Project <span className="gradient-text">Modules</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            A comprehensive breakdown of the sentiment analysis pipeline
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {modules.map((module, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              className="group"
            >
              <div className="glass-card p-6 h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div
                  className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${module.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-lg`}
                >
                  <module.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{module.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {module.description}
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <div className="w-8 h-1 rounded-full bg-gradient-to-r from-primary to-secondary" />
                  <span className="text-xs text-muted-foreground">
                    Module {index + 1}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
