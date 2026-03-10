import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import { motion } from 'framer-motion';
import { LogIn, UserPlus, Mail, Lock, AlertCircle, Loader2, Brain, Cpu, Layers, Database, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import FloatingLines from '@/components/FloatingLines';

const Auth = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const endpoint = isLogin ? '/login' : '/register';
            const body = isLogin
                ? { email, password }
                : { email, password, full_name: fullName };

            const response = await fetch(`/api${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'An error occurred');
            }

            if (isLogin) {
                login(data.access_token);
                toast.success('Successfully logged in!');
            } else {
                setIsLogin(true);
                toast.success('Account created! Please log in.');
            }
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse: any) => {
        try {
            const response = await fetch('/api/google-auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: credentialResponse.credential }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.detail);

            login(data.access_token);
            toast.success('Successfully logged in with Google!');
        } catch (err: any) {
            toast.error('Google Sign-In failed');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 md:p-12 lg:p-24 relative overflow-hidden">
            {/* Background Animation & Pattern */}
            <div className="absolute inset-0 z-0">
                <FloatingLines
                    linesGradient={['#8B8FE6', '#7C77E5', '#A5A6F6']}
                    animationSpeed={0.5}
                    parallaxStrength={0.1}
                    lineCount={[8]}
                    lineDistance={[10]}
                    mixBlendMode="multiply"
                />

                {/* Dot Pattern Overlay */}
                <div className="absolute inset-0 opacity-40 pointer-events-none" style={{
                    backgroundImage: `radial-gradient(#8B8FE6 0.5px, transparent 0.5px), radial-gradient(#8B8FE6 0.5px, transparent 0.5px)`,
                    backgroundSize: `20px 20px`,
                    backgroundPosition: `0 0, 10px 10px`
                }}></div>

                {/* Hexagonal Mesh (Subtle) */}
                <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100' viewBox='0 0 56 100'%3E%3Cpath d='M28 66L0 50L0 16L28 0L56 16L56 50L28 66L28 100' fill='none' stroke='%238B8FE6' stroke-width='1'/%3E%3C/svg%3E")`,
                    backgroundSize: '56px 100px'
                }}></div>
            </div>

            <div className="z-10 w-full max-w-7xl flex flex-col lg:flex-row items-center lg:items-start justify-between gap-12 lg:gap-24 relative">
                {/* Left Info Section - Visible on lg screens */}
                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="flex-1 hidden lg:flex flex-col gap-10 py-10"
                >
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
                                <Brain className="w-10 h-10 text-[#A5A6F6]" />
                            </div>
                            <h2 className="text-5xl font-extrabold tracking-tight text-white drop-shadow-xl">Sentiment Insights Engine</h2>
                        </div>
                        <p className="text-xl text-white/80 max-w-lg leading-relaxed font-medium">
                            A production-ready platform for advanced emotional intelligence analysis.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {/* AI Core */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 text-[#A5A6F6]">
                                <Cpu className="w-6 h-6" />
                                <h3 className="font-bold uppercase tracking-wider text-sm opacity-90">AI Core & Algorithms</h3>
                            </div>
                            <ul className="space-y-5">
                                <li className="flex flex-col gap-1">
                                    <span className="text-white font-bold text-lg">DistilBERT & RoBERTa</span>
                                    <span className="text-white/60 text-sm leading-relaxed">Multilingual sentiment & 7-emotion detection.</span>
                                </li>
                                <li className="flex flex-col gap-1">
                                    <span className="text-white font-bold text-lg">Entropy Thresholding</span>
                                    <span className="text-white/60 text-sm leading-relaxed">Uncertainty logic for mission-critical data integrity.</span>
                                </li>
                                <li className="flex flex-col gap-1">
                                    <span className="text-white font-bold text-lg">Async Batching</span>
                                    <span className="text-white/60 text-sm leading-relaxed">High-throughput GPU processing for massive scaling.</span>
                                </li>
                            </ul>
                        </div>

                        {/* Features */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 text-[#A5A6F6]">
                                <Zap className="w-6 h-6" />
                                <h3 className="font-bold uppercase tracking-wider text-sm opacity-90">Unique Features</h3>
                            </div>
                            <div className="flex flex-col gap-4">
                                <div className="p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md hover:bg-white/10 transition-all cursor-default">
                                    <h4 className="text-white font-bold text-base mb-2">Bulk File Processing</h4>
                                    <p className="text-white/60 text-sm leading-relaxed">Analyze CSV, Excel, and TXT files instantly with one click.</p>
                                </div>
                                <div className="p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md hover:bg-white/10 transition-all cursor-default">
                                    <h4 className="text-white font-bold text-base mb-2">Interactive Parallax UI</h4>
                                    <p className="text-white/60 text-sm leading-relaxed">GPU-accelerated WebGL animations and fluid responsiveness.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Mobile Responsive Logo - Shown on small screens */}
                <div className="lg:hidden z-10 mb-8 flex flex-col items-center gap-2">
                    <div className="flex items-center gap-3">
                        <Brain className="w-10 h-10 text-[#7C77E5]" />
                        <h2 className="text-3xl font-bold tracking-tight text-[#7C77E5]">NLP Sentiment</h2>
                    </div>
                </div>

                {/* Login Form (Right side) */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, x: 20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    transition={{ duration: 0.4 }}
                    className="w-full max-w-[450px] z-10"
                >
                    <Card className="bg-white border-none shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[32px] px-4 py-6">
                        <CardHeader className="text-center space-y-2 pb-8">
                            <h1 className="text-2xl font-bold text-[#1F2937]">
                                {isLogin ? 'Log in to NLP Sentiment' : 'Sign up for NLP Sentiment'}
                            </h1>
                            <p className="text-[#6B7280] font-medium">
                                {isLogin ? 'Welcome back! Please log in to your account.' : 'Join us to get advanced insights.'}
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <form onSubmit={handleSubmit} className="space-y-5">
                                {!isLogin && (
                                    <div className="space-y-2">
                                        <div className="relative">
                                            <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9CA3AF]" />
                                            <Input
                                                id="name"
                                                placeholder="Full Name"
                                                className="pl-12 py-7 bg-white border-[#E5E7EB] rounded-xl focus:border-[#7C77E5] focus:ring-[#7C77E5] transition-all text-base placeholder:text-[#9CA3AF]"
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                required={!isLogin}
                                            />
                                        </div>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9CA3AF]" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="Email"
                                            className="pl-12 py-7 bg-white border-[#E5E7EB] rounded-xl focus:border-[#7C77E5] focus:ring-[#7C77E5] transition-all text-base placeholder:text-[#9CA3AF]"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9CA3AF]" />
                                        <Input
                                            id="password"
                                            type="password"
                                            placeholder="Password"
                                            className="pl-12 py-7 bg-white border-[#E5E7EB] rounded-xl focus:border-[#7C77E5] focus:ring-[#7C77E5] transition-all text-base placeholder:text-[#9CA3AF]"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                    </div>
                                    {isLogin && (
                                        <div className="flex justify-end pr-1">
                                            <button type="button" className="text-sm text-[#6B7280] hover:text-[#7C77E5] transition-colors">
                                                Forgot password?
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-3 rounded-lg bg-red-50 text-red-500 text-sm border border-red-100 flex items-center gap-2"
                                    >
                                        <AlertCircle className="h-4 w-4" />
                                        <p>{error}</p>
                                    </motion.div>
                                )}

                                <Button
                                    type="submit"
                                    className="w-full bg-[#8B8FE6] hover:bg-[#7C77E5] text-white font-bold py-7 rounded-xl shadow-lg shadow-[#8B8FE6]/20 active:scale-[0.98] transition-all text-lg"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    ) : isLogin ? (
                                        'Log In'
                                    ) : (
                                        'Sign Up'
                                    )}
                                </Button>
                            </form>

                            <div className="relative my-4 flex items-center gap-4">
                                <div className="flex-1 h-[1px] bg-[#E5E7EB]"></div>
                                <span className="text-[#9CA3AF] text-sm font-medium">or</span>
                                <div className="flex-1 h-[1px] bg-[#E5E7EB]"></div>
                            </div>

                            <div className="flex justify-center -mx-1">
                                <div className="w-full relative py-2">
                                    <GoogleLogin
                                        onSuccess={handleGoogleSuccess}
                                        onError={() => {
                                            toast.error('Google Sign-In failed');
                                        }}
                                        useOneTap
                                        theme="outline"
                                        shape="rectangular"
                                        width="384px"
                                        text="signin_with"
                                    />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col items-center pt-2">
                            <p className="text-[#6B7280] font-medium">
                                {isLogin ? "Don't have an account? " : "Already have an account? "}
                                <button
                                    onClick={() => setIsLogin(!isLogin)}
                                    className="text-[#8B8FE6] font-bold hover:text-[#7C77E5] transition-all"
                                >
                                    {isLogin ? 'Sign Up' : 'Sign In'}
                                </button>
                            </p>
                        </CardFooter>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
};

export default Auth;
