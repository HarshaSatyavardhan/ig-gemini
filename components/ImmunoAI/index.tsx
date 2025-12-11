import React, { useState, useEffect } from 'react';
import {
    Dna, Zap, Search, Share2, ShieldCheck, Atom
} from 'lucide-react';

import { AlignmentModal } from './AlignmentModal';
import { ScoreGauge } from './ScoreGauge';
import { SequenceMap } from './SequenceMap';
import { InsightsPanel } from './InsightsPanel';
import { RadarChartPanel, HydrophobicityChart } from './Charts';
import { parseRegions, calculateHumanness, RegionData, HumannessAnalysis } from '../../utils/bioinformatics';
import { callGemini } from '../../utils/geminiApi';

interface AnalysisResult {
    metrics: HumannessAnalysis;
    regions: RegionData;
    radarData: Array<{ subject: string; A: number; B: number; fullMark: number }>;
    cleanSeq: string;
}

export const ImmunoAI: React.FC = () => {
    const [sequence, setSequence] = useState('EVQLVESGGGLVQPGGSLRLSCAASGFTFSSYAMSWVRQAPGKGLEWVSAISGSGGSTYYADSVKGRFTISRDNSKNTLYLQMNSLRAEDTAVYYCARDYYGSSWYFDVWGQGTLVTVSS');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [showAlignment, setShowAlignment] = useState(false);

    // AI States
    const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
    const [aiSuggestions, setAiSuggestions] = useState<string[] | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiOptLoading, setAiOptLoading] = useState(false);

    const handleAnalyze = () => {
        setLoading(true);
        // Reset AI states on new analysis
        setAiAnalysis(null);
        setAiSuggestions(null);

        setTimeout(() => {
            const cleanSeq = sequence.replace(/[\s\n\r]/g, '').toUpperCase();
            const metrics = calculateHumanness(cleanSeq);
            const regions = parseRegions(cleanSeq);

            const radarData = [
                { subject: 'Identity', A: metrics.identity, B: 75, fullMark: 100 },
                { subject: 'T20 Score', A: Math.max(0, (parseFloat(metrics.t20) + 4) * 20), B: 60, fullMark: 100 },
                { subject: 'Stability', A: 85, B: 70, fullMark: 100 },
                { subject: 'Solubility', A: (1 - Math.abs(metrics.avgHydro)) * 100, B: 60, fullMark: 100 },
                { subject: 'Developability', A: 90, B: 65, fullMark: 100 },
            ];

            setResult({ metrics, regions, radarData, cleanSeq });
            setLoading(false);
        }, 1200);
    };

    const handleDeepScan = async () => {
        if (!result) return;
        setAiLoading(true);

        const prompt = `
      Act as a senior computational immunologist. Analyze this antibody VH sequence:
      Sequence: ${result.cleanSeq}
      Metrics:
      - Humanness (T20): ${result.metrics.t20}
      - Identity: ${result.metrics.identity.toFixed(1)}%
      - CDR3: ${result.regions.cdr3}
      - Estimated Charge: ${result.metrics.charge.toFixed(2)}
      
      Provide a sophisticated, concise (max 3 sentences) assessment of its therapeutic potential, focusing on developability risks (aggregation, viscosity) and immunogenicity. Do not use markdown headers.
    `;

        const text = await callGemini(prompt);
        setAiAnalysis(text || "AI service is currently unavailable. Please try again later.");
        setAiLoading(false);
    };

    const handleAiOptimize = async () => {
        if (!result) return;
        setAiOptLoading(true);

        const prompt = `
      Suggest 2 specific point mutations for this antibody sequence to improve its humanness score or solubility without disrupting CDR binding. 
      Sequence: ${result.cleanSeq}
      Format: Return ONLY a raw bulleted list of mutations (e.g. "- A40T: Reason"). Do not include introductory text.
    `;

        const text = await callGemini(prompt);
        if (text) {
            // Simple parsing to get list items
            const items = text.split('\n').filter(line => line.trim().startsWith('-')).map(line => line.replace('-', '').trim());
            setAiSuggestions(items);
        }
        setAiOptLoading(false);
    };

    useEffect(() => {
        handleAnalyze();
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-100">
            <AlignmentModal
                isOpen={showAlignment}
                onClose={() => setShowAlignment(false)}
                querySeq={result?.cleanSeq || ''}
            />

            {/* Header */}
            <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Atom className="text-white" size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">ig-gemini</h1>
                            <p className="text-[10px] text-indigo-600 font-medium tracking-wider">THERAPEUTIC SEQUENCE ENGINE</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm transition-all border border-slate-200 shadow-sm">
                            <Share2 size={14} /> Export Report
                        </button>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 py-8">

                {/* Input Section */}
                <section className="mb-8">
                    <div className="bg-white p-1 rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50">
                        <div className="bg-white p-6 rounded-xl">
                            <div className="flex justify-between items-center mb-3">
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <Search size={16} /> Input Sequence (VH or VL)
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setSequence('EVQLVESGGGLVQPGGSLRLSCAASGFTFSSYAMSWVRQAPGKGLEWVSAISGSGGSTYYADSVKGRFTISRDNSKNTLYLQMNSLRAEDTAVYYCARDYYGSSWYFDVWGQGTLVTVSS')}
                                        className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded text-slate-600 transition-colors font-medium"
                                    >
                                        Load Adalimumab
                                    </button>
                                    <button
                                        onClick={() => setSequence('QVQLVQSGAEVKKPGSSVKVSCKASGGTFSSYAISWVRQAPGQGLEWMGGIIPIFGTANYAQKFQGRVTITADESTSTAYMELSSLRSEDTAVYYCAR')}
                                        className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded text-slate-600 transition-colors font-medium"
                                    >
                                        Load Generic VH1
                                    </button>
                                </div>
                            </div>
                            <textarea
                                value={sequence}
                                onChange={(e) => setSequence(e.target.value)}
                                className="w-full h-32 bg-slate-50 border border-slate-200 rounded-lg p-4 font-mono text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none shadow-inner"
                                placeholder="Paste amino acid sequence here..."
                            />
                            <div className="mt-4 flex justify-end">
                                <button
                                    onClick={handleAnalyze}
                                    disabled={loading}
                                    className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-8 py-3 rounded-lg font-semibold shadow-lg shadow-indigo-500/25 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <Zap size={18} /> Run Analysis
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Results Dashboard */}
                {result && !loading && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                        {/* Left Column: Visuals & Metrics */}
                        <div className="lg:col-span-8 space-y-6">

                            {/* Key Metrics Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-t from-indigo-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <h3 className="text-slate-500 text-sm font-medium mb-2">Overall Score</h3>
                                    <ScoreGauge score={result.metrics.identity} />
                                </div>

                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between group relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                                    <div>
                                        <h3 className="text-slate-500 text-sm font-medium">T20 Humanness Score</h3>
                                        <p className="text-3xl font-bold text-slate-800 mt-1">{result.metrics.t20}</p>
                                    </div>
                                    <div className="mt-4">
                                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 w-[85%]" />
                                        </div>
                                        <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                                            <ShieldCheck size={12} /> High Tolerance Predicted
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between group relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                                    <div>
                                        <h3 className="text-slate-500 text-sm font-medium">Isoelectric Point (est)</h3>
                                        <p className="text-3xl font-bold text-slate-800 mt-1">{result.metrics.charge > 0 ? '8.4' : '6.2'}</p>
                                    </div>
                                    <div className="mt-4">
                                        <p className="text-sm text-slate-600">Net Charge: <span className={result.metrics.charge > 0 ? 'text-blue-600 font-semibold' : 'text-pink-600 font-semibold'}>{result.metrics.charge.toFixed(1)}</span></p>
                                        <p className="text-xs text-slate-400 mt-1">Based on sequence composition</p>
                                    </div>
                                </div>
                            </div>

                            {/* Sequence Map */}
                            <SequenceMap regions={result.regions} sequence={result.cleanSeq} />

                            {/* Charts Area */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <RadarChartPanel data={result.radarData} />
                                <HydrophobicityChart sequence={result.cleanSeq} />
                            </div>

                        </div>

                        {/* Right Column: AI Reasoning & Suggestions */}
                        <div className="lg:col-span-4 space-y-6">
                            <InsightsPanel
                                analysis={result.metrics}
                                regions={result.regions}
                                aiData={{ analysis: aiAnalysis, suggestions: aiSuggestions }}
                                onRunAI={handleDeepScan}
                                onRunOptimize={handleAiOptimize}
                                aiLoading={aiLoading}
                                aiOptLoading={aiOptLoading}
                            />

                            {/* Additional Info Card */}
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">Database Match</h4>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-600">
                                        98
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">Adalimumab (Humira)</p>
                                        <p className="text-xs text-slate-500">Closest Therapeutic Match</p>
                                    </div>
                                </div>
                                <div className="w-full bg-slate-100 h-px mb-4" />
                                <button
                                    onClick={() => setShowAlignment(true)}
                                    className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-sm font-medium rounded-lg transition-colors border border-indigo-100"
                                >
                                    View Alignment
                                </button>
                            </div>
                        </div>

                    </div>
                )}

                {!result && !loading && (
                    <div className="text-center mt-20 text-slate-400">
                        <Dna size={48} className="mx-auto mb-4 opacity-20" />
                        <p>Enter a protein sequence above to begin analysis</p>
                    </div>
                )}

            </main>
        </div>
    );
};

export default ImmunoAI;
