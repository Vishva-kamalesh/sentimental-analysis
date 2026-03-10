import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Search, Filter, Trash2, Calendar, FileText, UserSquare, Mic, ChevronRight, Activity, Brain } from 'lucide-react';
import { fetchHistory, HistoryEntry } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import FloatingLines from '@/components/FloatingLines';

const typeIcons: Record<string, any> = {
    text: FileText,
    face: UserSquare,
    voice: Mic,
    text_analysis: FileText,
};

const History = () => {
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<string>('all');

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            setLoading(true);
            const data = await fetchHistory();
            setHistory(data);
        } catch (error) {
            console.error("Failed to load history:", error);
            toast.error("Could not load history");
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const filteredHistory = history.filter(item => {
        const matchesSearch = item.input_data?.toString().toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterType === 'all' || item.type === filterType;
        return matchesSearch && matchesFilter;
    });

    const getSentimentColor = (sentiment: string) => {
        switch (sentiment?.toLowerCase()) {
            case 'positive': return 'text-green-500 bg-green-500/10 border-green-500/20';
            case 'negative': return 'text-red-500 bg-red-500/10 border-red-500/20';
            case 'neutral': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
            default: return 'text-white/40 bg-white/5 border-white/10';
        }
    };

    return (
        <div className="min-h-screen pt-24 pb-12 px-4 relative overflow-hidden bg-background">
            {/* Ambient Background */}
            <div className="absolute inset-0 z-0">
                <FloatingLines
                    linesGradient={['#8B8FE6', '#7C77E5', '#A5A6F6']}
                    animationSpeed={0.2}
                    parallaxStrength={0.05}
                />
            </div>

            <div className="max-w-6xl mx-auto relative z-10 px-4 md:px-0">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12">
                    <div>
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-3 mb-2"
                        >
                            <div className="p-2 rounded-xl bg-primary/20 backdrop-blur-md border border-primary/20">
                                <Clock className="w-6 h-6 text-primary" />
                            </div>
                            <h1 className="text-4xl font-black tracking-tight text-white uppercase italic">Analysis History</h1>
                        </motion.div>
                        <p className="text-white/40 font-medium tracking-widest text-xs uppercase">Your tactical emotional intelligence logs</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                            <Input
                                placeholder="Search logs..."
                                className="pl-10 bg-slate-900/40 border-white/10 text-white rounded-full w-full sm:w-64"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            {['all', 'text', 'face', 'voice'].map((type) => (
                                <Button
                                    key={type}
                                    variant={filterType === type ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setFilterType(type)}
                                    className={`rounded-full px-4 text-[10px] font-black tracking-[0.2em] uppercase transition-all ${filterType === type ? 'bg-primary border-primary' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'
                                        }`}
                                >
                                    {type}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <Card key={i} className="bg-slate-900/60 border-white/5 h-48 animate-pulse shadow-xl" />
                        ))}
                    </div>
                ) : filteredHistory.length === 0 ? (
                    <div className="text-center py-20 bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[3rem] shadow-2xl">
                        <Brain className="w-16 h-16 text-white/10 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">No data recorded</h3>
                        <p className="text-white/40 text-sm">Start an analysis to generate tactical history logs.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AnimatePresence mode="popLayout">
                            {filteredHistory.map((item, index) => {
                                const Icon = typeIcons[item.type] || Activity;
                                const sentiment = item.output_data?.overall_sentiment || item.output_data?.sentiment || 'Processing';
                                const emotion = item.output_data?.top_emotion?.emotion || item.output_data?.dominant_emotion || 'Detecting';
                                const emoji = item.output_data?.top_emotion?.emoji || '📡';

                                return (
                                    <motion.div
                                        key={item._id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <Card className="bg-slate-900/60 backdrop-blur-md border-white/10 hover:border-primary/40 transition-all group relative overflow-hidden h-full flex flex-col hover:bg-slate-900/80 shadow-xl group cursor-default">
                                            {/* Glow Effect */}
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-[40px] rounded-full group-hover:bg-primary/10 transition-all" />

                                            <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 group-hover:border-primary/20 group-hover:bg-primary/5">
                                                        <Icon className="w-4 h-4 text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-white/30 uppercase font-black tracking-widest">{item.type}</p>
                                                        <p className="text-[10px] text-white/20 font-medium">{formatDate(item.timestamp)}</p>
                                                    </div>
                                                </div>
                                                <Badge variant="outline" className={`rounded-full px-3 py-0.5 text-[9px] font-black uppercase tracking-widest ${getSentimentColor(sentiment)}`}>
                                                    {sentiment}
                                                </Badge>
                                            </CardHeader>

                                            <CardContent className="p-6 pt-4 flex-1 flex flex-col justify-between gap-6">
                                                <div className="space-y-4">
                                                    <div className="p-4 rounded-2xl bg-black/30 border border-white/5 group-hover:border-primary/10 transition-all">
                                                        <p className="text-white font-bold leading-relaxed line-clamp-3 text-sm">
                                                            {item.input_data || "No input text available"}
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        <div className="text-2xl">{emoji}</div>
                                                        <div>
                                                            <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest">Dominant Emotion</p>
                                                            <p className="text-white font-black text-xs uppercase italic text-primary">{emotion}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                                                        <span className="text-[9px] text-white/30 uppercase font-bold tracking-[0.1em]">Verified Node</span>
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-primary transition-colors" />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
};

export default History;
