import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { User, Mail, Calendar, ShieldCheck, LogOut, ChevronRight, Activity, Cpu, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import FloatingLines from "@/components/FloatingLines";

const Profile = () => {
    const { user, logout } = useAuth();

    if (!user) return null;

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    return (
        <div className="min-h-screen pt-24 pb-12 px-4 relative overflow-hidden">
            {/* Background Effect */}
            <div className="absolute inset-0 z-0">
                <FloatingLines
                    linesGradient={['#8B8FE6', '#7C77E5', '#A5A6F6']}
                    animationSpeed={0.3}
                    parallaxStrength={0.05}
                />
            </div>

            <div className="max-w-4xl mx-auto relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                >
                    {/* Profile Header Card */}
                    <Card className="bg-slate-900/80 backdrop-blur-xl border-white/10 overflow-hidden text-white shadow-2xl">
                        <div className="relative h-32 bg-gradient-to-r from-primary/40 to-secondary/40">
                            <div className="absolute -bottom-12 left-8 p-1.5 rounded-3xl bg-slate-950/50 backdrop-blur-2xl border border-white/10">
                                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-inner">
                                    <User className="w-12 h-12 text-white" />
                                </div>
                            </div>
                        </div>
                        <CardHeader className="pt-16 pb-8 px-8 flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
                            <div>
                                <h1 className="text-4xl font-black tracking-tight text-white mb-1">
                                    {user.full_name || "User Profile"}
                                </h1>
                                <p className="text-primary-foreground/70 font-medium flex items-center gap-2">
                                    <Mail className="w-4 h-4" /> {user.email || "No email provided"}
                                </p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <Badge variant="outline" className="bg-primary/20 border-primary/30 text-white px-4 py-1.5 rounded-full backdrop-blur-md font-bold tracking-wider">
                                    {user.provider?.toUpperCase() || "LOCAL"} ACCOUNT
                                </Badge>
                                <p className="text-[10px] text-white/40 uppercase tracking-[0.3em] font-bold">Authenticated Profile</p>
                            </div>
                        </CardHeader>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Stats / Details */}
                        <div className="md:col-span-2 space-y-6">
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 }}
                            >
                                <Card className="bg-slate-900/60 backdrop-blur-lg border-white/5 h-full">
                                    <CardHeader className="pb-4">
                                        <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em]">Account Ecosystem</h3>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-center justify-between p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 rounded-xl bg-primary/20 group-hover:bg-primary/30 transition-colors">
                                                    <Calendar className="w-5 h-5 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Member Since</p>
                                                    <p className="text-white font-bold text-lg">{user.created_at ? formatDate(user.created_at) : "N/A"}</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-white/20" />
                                        </div>

                                        <div className="flex items-center justify-between p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 rounded-xl bg-green-500/20 group-hover:bg-green-500/30 transition-colors">
                                                    <ShieldCheck className="w-5 h-5 text-green-500" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Security Status</p>
                                                    <p className="text-white font-bold text-lg">{user.is_active ? "Verified & Operational" : "Pending Verification"}</p>
                                                </div>
                                            </div>
                                            <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)] animate-pulse" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <Card className="bg-slate-900/40 backdrop-blur-md border-white/5 p-6 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-xl bg-destructive/10">
                                            <LogOut className="w-5 h-5 text-destructive" />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-bold">Session Security</h4>
                                            <p className="text-[10px] text-white/40 uppercase tracking-widest">Terminate current access token</p>
                                        </div>
                                    </div>
                                    <Button variant="destructive" size="sm" onClick={logout} className="rounded-full px-8 font-bold shadow-lg shadow-destructive/20">
                                        LOGOUT
                                    </Button>
                                </Card>
                            </motion.div>
                        </div>

                        {/* Right Sidebar Info */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="space-y-6"
                        >
                            <Card className="bg-slate-900/60 backdrop-blur-lg border-white/5 overflow-hidden">
                                <div className="p-6 space-y-6">
                                    <div className="flex items-center gap-3 text-secondary">
                                        <Activity className="w-5 h-5" />
                                        <h3 className="font-bold text-[10px] tracking-[0.25em] uppercase">Intelligence Node</h3>
                                    </div>
                                    <div className="space-y-5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-white/40 text-[10px] font-bold uppercase tracking-wider">AI Inference</span>
                                            <Badge className="bg-secondary/20 text-secondary border-none text-[10px] py-0 px-2">ENABLED</Badge>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-white/40 text-[10px] font-bold uppercase tracking-wider">Voice Processing</span>
                                            <Badge className="bg-primary/20 text-primary border-none text-[10px] py-0 px-2">ACTIVE</Badge>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-white/40 text-[10px] font-bold uppercase tracking-wider">Storage Node</span>
                                            <Badge variant="outline" className="border-white/10 text-white/40 text-[8px] px-1.5 uppercase font-black">MONGODB_CLUSTER_V1</Badge>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 bg-black/20 flex gap-6 justify-center">
                                    <Cpu className="w-4 h-4 text-white/10" />
                                    <Database className="w-4 h-4 text-white/10" />
                                    <Activity className="w-4 h-4 text-white/10" />
                                </div>
                            </Card>

                            <div className="p-6 rounded-[2rem] bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent border border-white/10 text-center relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 blur-[50px] rounded-full" />
                                <p className="text-[10px] uppercase font-black tracking-[0.3em] text-primary mb-3">Enterprise Tier</p>
                                <p className="text-white/70 text-xs leading-relaxed font-medium">
                                    Ready for large-scale emotional data mapping?
                                </p>
                                <Button variant="link" className="text-white font-bold text-xs mt-3 h-auto p-0 hover:text-primary transition-colors">
                                    Request API Access →
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Profile;
