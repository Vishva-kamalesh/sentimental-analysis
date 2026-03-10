import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Brain, MessageCircle, TrendingUp, Globe, Star, Zap } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Natural Language Processing",
    description:
      "NLP enables computers to understand, interpret, and generate human language, bridging the gap between human communication and machine understanding.",
  },
  {
    icon: MessageCircle,
    title: "Sentiment Analysis",
    description:
      "The process of identifying and extracting opinions from text to determine whether the sentiment is positive, negative, or neutral.",
  },
  {
    icon: TrendingUp,
    title: "Machine Learning Comparison",
    description:
      "Comparative study of multiple algorithms including Naive Bayes, SVM, and Logistic Regression to identify the most effective approach.",
  },
];

const applications = [
  { icon: Star, text: "Product Reviews Analysis" },
  { icon: MessageCircle, text: "Customer Feedback Processing" },
  { icon: Globe, text: "Social Media Monitoring" },
  { icon: Zap, text: "Brand Sentiment Tracking" },
];

export const AboutSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="about" className="py-24 bg-muted/30" ref={ref}>
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            About the <span className="gradient-text">Project</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Understanding the science behind sentiment analysis and its
            real-world applications
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="glass-card p-8 hover:shadow-lg transition-all duration-300 group"
            >
              <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="w-7 h-7 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Applications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="glass-card p-8"
        >
          <h3 className="text-xl font-semibold mb-6 text-center">
            Real-World Applications
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {applications.map((app, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <app.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="font-medium">{app.text}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};
