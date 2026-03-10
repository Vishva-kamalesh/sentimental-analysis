import { motion } from "framer-motion";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { FaceScanner } from "@/components/FaceScanner";

const Facial = () => {
    return (
        <div className="min-h-screen bg-background">
            <Navigation />
            <main className="pt-24 pb-16">
                <div className="container mx-auto px-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-12"
                    >
                        <h1 className="text-3xl sm:text-4xl font-bold mb-4">
                            Facial <span className="gradient-text">Sentiment Scanner</span>
                        </h1>
                        <p className="text-muted-foreground max-w-2xl mx-auto">
                            Analyze facial expressions in real-time to detect emotions.
                        </p>
                    </motion.div>
                    <div className="max-w-4xl mx-auto">
                        <FaceScanner />
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default Facial;
