import React from 'react';
import { Sparkles, Zap, AlertTriangle, Activity, ShieldCheck, Loader2 } from 'lucide-react';
import { HumannessAnalysis, RegionData } from '../../utils/bioinformatics';

interface InsightsPanelProps {
    analysis: HumannessAnalysis;
    regions: RegionData;
    aiData: {
        analysis: string | null;
        suggestions: string[] | null;
    };
    onRunAI: () => void;
    onRunOptimize: () => void;
    aiLoading: boolean;
    aiOptLoading: boolean;
}

export const InsightsPanel: React.FC<InsightsPanelProps> = ({
    analysis,
    regions,
    aiData,
    onRunAI,
    onRunOptimize,
    aiLoading,
    aiOptLoading
}) => {
    const staticSuggestions: { type: string; text: string }[] = [];

    // Static Logic (fallback/baseline)
    if (analysis.identity < 85) {
        staticSuggestions.push({ type: 'critical', text: 'Low Framework Identity: Consider humanizing FR2 and FR3 regions.' });
    } else {
        staticSuggestions.push({ type: 'success', text: 'High Framework Identity: Excellent homology to IGHV3-23.' });
    }

    if (analysis.avgHydro > 0.5) {
        staticSuggestions.push({ type: 'warning', text: 'Solubility Risk: High average hydrophobicity detected.' });
    }

    return (
        <div className="space-y-4">
            {/* AI Analysis Box */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 p-5 rounded-xl shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-start mb-3">
                    <h3 className="text-indigo-700 font-semibold flex items-center gap-2">
                        <Sparkles size={18} className={aiLoading ? "animate-pulse" : ""} /> AI Reasoning Engine
                    </h3>
                    <button
                        onClick={onRunAI}
                        disabled={aiLoading}
                        className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-full shadow-md shadow-indigo-200 transition-all disabled:opacity-50 flex items-center gap-1"
                    >
                        {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                        {aiData.analysis ? 'Refresh Scan' : 'Deep Scan'}
                    </button>
                </div>

                <div className="text-sm text-indigo-900 leading-relaxed mb-4 min-h-[100px]">
                    {aiLoading ? (
                        <div className="space-y-2 animate-pulse">
                            <div className="h-2 bg-indigo-200 rounded w-3/4"></div>
                            <div className="h-2 bg-indigo-200 rounded w-full"></div>
                            <div className="h-2 bg-indigo-200 rounded w-5/6"></div>
                        </div>
                    ) : aiData.analysis ? (
                        <div className="animate-in fade-in">
                            {aiData.analysis}
                        </div>
                    ) : (
                        <p>
                            Analysis indicates this sequence is a <strong className="text-indigo-950">VH3 family derivative</strong>.
                            The Humanness Score of <strong className="text-indigo-950">{analysis.identity.toFixed(1)}%</strong> places it in the
                            {analysis.identity > 85 ? ' top tier of therapeutic candidates' : ' requires optimization range'}.
                            The CDR3 length is typical, but charge profile ({analysis.charge > 0 ? 'Positive' : 'Negative'}) suggests scrutiny.
                            <br /><br />
                            <em className="text-xs opacity-70">Click 'Deep Scan' for a detailed Gemini-powered assessment.</em>
                        </p>
                    )}
                </div>
            </div>

            {/* Suggestions List */}
            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-slate-800 font-semibold flex items-center gap-2">
                        <Zap size={18} className="text-yellow-500" /> Optimization Feed
                    </h3>
                    <button
                        onClick={onRunOptimize}
                        disabled={aiOptLoading}
                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-full border border-slate-200 transition-all disabled:opacity-50 flex items-center gap-1"
                    >
                        {aiOptLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} className="text-indigo-500" />}
                        AI Engineer
                    </button>
                </div>
                <ul className="space-y-3">
                    {/* AI Optimization Suggestions */}
                    {aiData.suggestions && aiData.suggestions.length > 0 && (
                        <div className="mb-4 space-y-2 border-b border-slate-100 pb-3">
                            <p className="text-xs font-bold text-indigo-500 uppercase tracking-wide">Gemini Suggestions</p>
                            {aiData.suggestions.map((s, i) => (
                                <li
                                    key={`ai-${i}`}
                                    className="flex gap-3 items-start text-sm p-2 rounded-lg bg-indigo-50/50 border border-indigo-100 animate-in fade-in"
                                    style={{ animationDelay: `${i * 100}ms` }}
                                >
                                    <div className="mt-0.5 text-indigo-500"><Sparkles size={14} /></div>
                                    <span className="text-indigo-900">{s}</span>
                                </li>
                            ))}
                        </div>
                    )}

                    {/* Static Logic Suggestions */}
                    {staticSuggestions.map((s, i) => (
                        <li key={i} className="flex gap-3 items-start text-sm p-2 rounded-lg hover:bg-slate-50 transition-colors">
                            <div className={`mt-0.5 min-w-[16px] ${s.type === 'critical' ? 'text-red-500' : s.type === 'warning' ? 'text-yellow-500' : 'text-green-500'}`}>
                                {s.type === 'critical' ? <AlertTriangle size={16} /> : s.type === 'warning' ? <Activity size={16} /> : <ShieldCheck size={16} />}
                            </div>
                            <span className="text-slate-600">{s.text}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};
