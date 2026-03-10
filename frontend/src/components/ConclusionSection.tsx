import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Award, Rocket, Globe, Cpu, CheckCircle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const conclusions = [
  "Successfully implemented and compared three ML algorithms",
  "Logistic Regression achieved highest accuracy at 92.5%",
  "SVM demonstrated best precision for negative sentiment",
  "Naive Bayes showed fastest processing time",
];

const futureScope = [
  {
    icon: Cpu,
    title: "Deep Learning Integration",
    description: "Implementing LSTM and Transformer-based models for improved accuracy",
  },
  {
    icon: Rocket,
    title: "Real-time Analysis",
    description: "Live sentiment tracking for streaming data sources",
  },
  {
    icon: Globe,
    title: "Multilingual Support",
    description: "Extending analysis to multiple languages including Hindi and Spanish",
  },
];

export const ConclusionSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="conclusion" className="py-24 bg-muted/30" ref={ref}>
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Conclusion & <span className="gradient-text">Future Scope</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Summary of findings and roadmap for future enhancements
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Conclusions */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="glass-card p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                <Award className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold">Key Findings</h3>
            </div>
            <ul className="space-y-4">
              {conclusions.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-success mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Future Scope */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-4"
          >
            {futureScope.map((item, index) => (
              <div
                key={index}
                className="glass-card p-6 flex items-start gap-4 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center shrink-0">
                  <item.icon className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center"
        >
          <Link to="/analysis">
            <Button
              size="lg"
              className="gradient-primary text-primary-foreground shadow-glow group"
            >
              Try Sentiment Analysis
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};
