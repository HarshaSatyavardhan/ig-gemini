import React, { useState, useEffect, useRef } from 'react';
import { Icon, Card, Badge } from './UIComponents';

// Types
interface CDRInfo {
    seq: string;
    start: number;
    end: number;
}

interface Analysis {
    cdr1?: CDRInfo;
    cdr2?: CDRInfo;
    cdr3?: CDRInfo;
    assessment: string;
    score: number;
}

interface HistoryItem {
    generation: number;
    sequence: string;
    score: number;
    reason: string;
    mutation: string;
}

interface SafetyAnalysis {
    risk_level: 'Low' | 'Medium' | 'High';
    flags: string[];
    summary: string;
}

interface LogEntry {
    message: string;
    type: 'info' | 'error' | 'success' | 'process';
    timestamp: string;
}

// Gemini API Call
const callGemini = async (prompt: string, systemInstruction: string, apiKey: string): Promise<any> => {
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    systemInstruction: { parts: [{ text: systemInstruction }] },
                    generationConfig: {
                        responseMimeType: "application/json",
                        temperature: 0.7
                    }
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `API Error: ${response.status}`);
        }

        const data = await response.json();
        if (!data.candidates || !data.candidates[0]?.content) {
            throw new Error("No candidates returned.");
        }

        let rawText = data.candidates[0].content.parts[0].text;
        rawText = rawText.replace(/```json\n?|```/g, '').trim();
        return JSON.parse(rawText);
    } catch (error) {
        console.error("Gemini API Error:", error);
        return null;
    }
};

const callGeminiText = async (prompt: string, systemInstruction: string, apiKey: string): Promise<string | null> => {
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    systemInstruction: { parts: [{ text: systemInstruction }] },
                    generationConfig: {
                        responseMimeType: "text/plain",
                        temperature: 0.7
                    }
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `API Error: ${response.status}`);
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("Gemini Text API Error:", error);
        return null;
    }
};

export const AffinityMaturation: React.FC = () => {
    const apiKey = (process.env as any).API_KEY || "";

    const [sequence, setSequence] = useState("EVQLVESGGGLVQPGGSLRLSCAASGFNIKDTYIHWVRQAPGKGLEWVARIYPTNGYTRYADSVKGRFTISADTSKNTAYLQMNSLRAEDTAVYYCSRWGGDGFYAMDYWGQGTLVTVSS");
    const [targetAntigen, setTargetAntigen] = useState("HER2 (Human Epidermal Growth Factor Receptor 2)");
    const [includeAntigen, setIncludeAntigen] = useState(true);
    const [optimizationGoal, setOptimizationGoal] = useState("Affinity");

    const [isProcessing, setIsProcessing] = useState(false);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [isCheckingSafety, setIsCheckingSafety] = useState(false);
    const [iteration, setIteration] = useState(0);
    const [numGenerations, setNumGenerations] = useState(5);
    const [numCandidates, setNumCandidates] = useState(3);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [currentAnalysis, setCurrentAnalysis] = useState<Analysis | null>(null);
    const [report, setReport] = useState<string | null>(null);
    const [safetyAnalysis, setSafetyAnalysis] = useState<SafetyAnalysis | null>(null);

    const addLog = (message: string, type: LogEntry['type'] = "info") => {
        setLogs(prev => [...prev, { message, type, timestamp: new Date().toLocaleTimeString() }]);
    };

    const getGoalPromptContext = () => {
        const antigenCtx = includeAntigen
            ? `Target Antigen: ${targetAntigen}`
            : "Target Antigen: None/Unknown. Focus on intrinsic antibody properties.";

        let goalInstructions = "";
        switch (optimizationGoal) {
            case "Affinity":
                goalInstructions = "Focus on CDR loop optimization to improve binding energy and shape complementarity to the target.";
                break;
            case "Solubility":
                goalInstructions = "Focus on replacing exposed hydrophobic residues with polar/charged residues to prevent aggregation.";
                break;
            case "Stability":
                goalInstructions = "Focus on removing chemical liabilities (deamidation/oxidation sites) and improving core packing.";
                break;
            case "Specificity":
                goalInstructions = "Focus on reducing non-specific binding by modulating charge and reducing stickiness.";
                break;
            default:
                goalInstructions = "Focus on general sequence optimization.";
        }

        return `${antigenCtx}\nOptimization Goal: ${optimizationGoal}\nInstructions: ${goalInstructions}`;
    };

    const analyzeSequence = async (seq: string) => {
        addLog(`Analyzing sequence. Goal: ${optimizationGoal}...`, "info");
        const prompt = `
      Analyze the following Antibody VH sequence. 
      ${getGoalPromptContext()}
      
      1. Identify CDRs.
      2. Provide a brief structural assessment relevant to the Optimization Goal.
      3. Calculate a baseline "${optimizationGoal} Score" (0-100).
      
      Sequence: ${seq}
    `;

        const system = `
      You are an expert Structural Biologist and Antibody Engineer. 
      Output JSON format:
      {
        "cdr1": {"seq": "...", "start": X, "end": Y},
        "cdr2": {"seq": "...", "start": X, "end": Y},
        "cdr3": {"seq": "...", "start": X, "end": Y},
        "assessment": "string",
        "score": number
      }
    `;

        return await callGemini(prompt, system, apiKey);
    };

    const runSafetyCheck = async () => {
        if (!sequence) return;
        setIsCheckingSafety(true);
        addLog("Running CMC & Developability scan...", "process");

        const prompt = `
      Perform a specific Developability and Safety Assessment on this antibody VH sequence.
      Sequence: ${sequence}
      
      Check for:
      1. Chemical Liabilities (Post-Translational Modifications).
      2. Physical Stability.
      3. Immunogenicity.
      
      Output JSON:
      {
        "risk_level": "Low" | "Medium" | "High",
        "flags": ["list of string issues found"],
        "summary": "Concise summary of manufacturability"
      }
    `;

        const system = "You are an expert in Antibody Developability, CMC, and Formulation.";
        const result = await callGemini(prompt, system, apiKey);

        if (result) {
            setSafetyAnalysis(result);
            addLog("Safety assessment complete.", "success");
        }
        setIsCheckingSafety(false);
    };

    const generateMutations = async (seq: string, analysis: Analysis, currentGen: number) => {
        addLog(`Generation ${currentGen}: Proposing ${numCandidates} candidate mutations for ${optimizationGoal}...`, "process");

        const antigenInstruction = includeAntigen
            ? `Use your knowledge of the target antigen's structure (${targetAntigen}) to guide mutations.`
            : "Do NOT use antigen-specific binding info. Rely solely on biophysical rules for the antibody itself.";

        const prompt = `
      Current Sequence: ${seq}
      CDRs: ${JSON.stringify(analysis)}
      ${getGoalPromptContext()}
      
      Task: Propose ${numCandidates} distinct single-point mutations in the CDRs (or Framework if relevant).
      ${antigenInstruction}
      
      For each mutation:
      1. Specify the residue change (e.g., S54Y).
      2. Explain the BIOPHYSICAL REASONING relative to the Optimization Goal (${optimizationGoal}).
      3. Predict a "Confidence Score" (0-100) that the goal property improves.
    `;

        const system = `
      You are an AI Evolutionary Algorithm. 
      Output JSON format:
      {
        "mutations": [
          { "code": "X00Y", "pos": 0, "wt": "X", "mut": "Y", "reason": "...", "confidence": 0 },
          ...
        ]
      }
    `;
        return await callGemini(prompt, system, apiKey);
    };

    const evaluateMutations = async (mutations: any) => {
        if (!mutations?.mutations) return null;
        const best = mutations.mutations.reduce((prev: any, current: any) =>
            (prev.confidence > current.confidence) ? prev : current
        );
        return best;
    };

    const runEvolutionLoop = async () => {
        setIsProcessing(true);
        setReport(null);
        setSafetyAnalysis(null);
        setHistory([]);
        setLogs([]);
        setIteration(0);

        try {
            let currentSeq = sequence;
            let currentGen = 0;
            const maxGens = numGenerations;

            const initialAnalysis = await analyzeSequence(currentSeq);

            if (!initialAnalysis) {
                setIsProcessing(false);
                addLog("Initialization failed. Check API key and logs.", "error");
                return;
            }

            let currentScore = initialAnalysis.score;

            setCurrentAnalysis(initialAnalysis);
            setHistory([{
                generation: 0,
                sequence: currentSeq,
                score: currentScore,
                reason: "Wild Type Initialization",
                mutation: "None"
            }]);

            while (currentGen < maxGens) {
                currentGen++;
                setIteration(currentGen);

                const mutations = await generateMutations(currentSeq, initialAnalysis, currentGen);
                if (!mutations?.mutations) {
                    addLog("Generation step failed or yielded no mutations. Stopping.", "error");
                    break;
                }

                const bestMut = await evaluateMutations(mutations);

                if (!bestMut) {
                    addLog("Evaluation failed to select a mutation. Stopping.", "error");
                    break;
                }

                addLog(`Selected Mutation: ${bestMut.code} (${bestMut.reason})`, "success");

                const applyPrompt = `
          Original: ${currentSeq}
          Mutation to apply: Change residue at index ${bestMut.pos} (0-indexed) from ${bestMut.wt} to ${bestMut.mut}.
          Return the FULL new sequence and an updated ${optimizationGoal} Score (0-100).
          ${getGoalPromptContext()}
          Previous Score: ${currentScore}
        `;
                const applySystem = `Output JSON: { "new_sequence": "...", "new_score": number }`;
                const applied = await callGemini(applyPrompt, applySystem, apiKey);

                if (applied) {
                    currentSeq = applied.new_sequence;
                    currentScore = applied.new_score;

                    setHistory(prev => [...prev, {
                        generation: currentGen,
                        sequence: currentSeq,
                        score: currentScore,
                        reason: bestMut.reason,
                        mutation: bestMut.code
                    }]);
                    setSequence(currentSeq);
                } else {
                    addLog("Failed to apply mutation (API error).", "error");
                    break;
                }

                await new Promise(r => setTimeout(r, 1500));
            }

            addLog("Maturation cycle complete.", "success");

        } catch (err: any) {
            addLog(`Critical Error in Loop: ${err.message}`, "error");
            console.error(err);
        } finally {
            setIsProcessing(false);
        }
    };

    const generateReport = async () => {
        if (!history.length) return;
        setIsGeneratingReport(true);
        addLog("Generating scientific report...", "process");

        const prompt = `
      Write a concise scientific summary of this in silico affinity maturation campaign.
      
      Context: ${getGoalPromptContext()}
      Evolutionary History: ${JSON.stringify(history)}
      
      Structure the report with these sections:
      1. Campaign Overview (Goal: ${optimizationGoal}, Starting score vs Final score).
      2. Key Biophysical Mechanisms (Summarize the reasoning behind the key accepted mutations).
      3. Conclusion & Next Steps (Recommendation for wet-lab validation).
      
      Keep it professional, technical, and concise.
    `;

        const system = "You are a Senior Scientist writing a lab notebook entry.";
        const text = await callGeminiText(prompt, system, apiKey);

        if (text) {
            setReport(text);
            addLog("Report generated successfully.", "success");
        }
        setIsGeneratingReport(false);
    };

    const renderSequence = () => {
        if (!currentAnalysis) {
            return <p className="font-mono break-all text-sm text-slate-500">{sequence}</p>;
        }

        const { cdr1, cdr2, cdr3 } = currentAnalysis;
        const highlightMap = new Array(sequence.length).fill(null);

        const mark = (subseq: string | undefined, type: string) => {
            if (!subseq) return;
            const idx = sequence.indexOf(subseq);
            if (idx !== -1) {
                for (let i = 0; i < subseq.length; i++) highlightMap[idx + i] = type;
            }
        };

        if (cdr1) mark(cdr1.seq, 'cdr1');
        if (cdr2) mark(cdr2.seq, 'cdr2');
        if (cdr3) mark(cdr3.seq, 'cdr3');

        const getCdrClass = (type: string) => {
            switch (type) {
                case 'cdr1': return 'bg-blue-100 text-blue-700 border-b-2 border-blue-500 px-0.5 rounded font-bold';
                case 'cdr2': return 'bg-purple-100 text-purple-700 border-b-2 border-purple-500 px-0.5 rounded font-bold';
                case 'cdr3': return 'bg-emerald-100 text-emerald-700 border-b-2 border-emerald-500 px-0.5 rounded font-bold';
                default: return '';
            }
        };

        return (
            <div className="font-mono text-sm leading-6 break-all tracking-wide text-slate-700">
                {sequence.split('').map((char, i) => {
                    const type = highlightMap[i];
                    if (!type) return <span key={i}>{char}</span>;
                    return <span key={i} className={getCdrClass(type)}>{char}</span>;
                })}
            </div>
        );
    };

    const logsEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    return (
        <div className="min-h-screen p-6 md:p-12 max-w-7xl mx-auto bg-slate-50">

            {/* Header */}
            <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 mb-2">
                        In Silico Affinity Maturation
                    </h1>
                    <p className="text-slate-500 flex items-center gap-2">
                        <Icon name="dna" size={16} />
                        Test-Time Compute Framework for Antibody Engineering
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column */}
                <div className="lg:col-span-1 flex flex-col gap-6">

                    {/* Experiment Setup */}
                    <Card>
                        <h3 className="text-sm font-semibold text-slate-600 mb-3 uppercase tracking-wider">Experiment Setup</h3>
                        <div className="space-y-4">
                            {/* Optimization Goal */}
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                                    <Icon name="flask" size={14} /> Optimization Goal
                                </label>
                                <select
                                    value={optimizationGoal}
                                    onChange={(e) => setOptimizationGoal(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
                                >
                                    <option value="Affinity">Affinity (Binding Strength)</option>
                                    <option value="Solubility">Solubility (Reduce Aggregation)</option>
                                    <option value="Stability">Stability (Thermal/Chemical)</option>
                                    <option value="Specificity">Specificity (Reduce Polyspecificity)</option>
                                </select>
                            </div>

                            {/* Antigen Toggle */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-xs font-medium text-slate-500 flex items-center gap-1">
                                        <Icon name="target" size={14} /> Target Antigen
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-400">{includeAntigen ? 'Enabled' : 'Disabled'}</span>
                                        <button
                                            onClick={() => setIncludeAntigen(!includeAntigen)}
                                            className={`w-8 h-4 rounded-full transition-colors relative ${includeAntigen ? 'bg-blue-500' : 'bg-slate-300'}`}
                                        >
                                            <div
                                                className="w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all"
                                                style={{ left: includeAntigen ? '18px' : '2px' }}
                                            />
                                        </button>
                                    </div>
                                </div>

                                {includeAntigen ? (
                                    <input
                                        type="text"
                                        value={targetAntigen}
                                        onChange={(e) => setTargetAntigen(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500"
                                        placeholder="e.g. HER2, Spike Protein"
                                    />
                                ) : (
                                    <div className="w-full bg-slate-100 border border-slate-200 rounded px-3 py-2 text-xs text-slate-400 italic">
                                        Optimizing intrinsic properties without specific target binding context.
                                    </div>
                                )}
                            </div>

                            {/* Generations Slider */}
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                                    <Icon name="settings" size={14} /> Number of Generations
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="range"
                                        min="1"
                                        max="15"
                                        value={numGenerations}
                                        onChange={(e) => setNumGenerations(parseInt(e.target.value))}
                                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                    <span className="text-sm font-bold text-slate-700 w-8 text-center">{numGenerations}</span>
                                </div>
                            </div>

                            {/* Candidates Slider */}
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                                    <Icon name="layers" size={14} /> Mutation Candidates per Generation
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="range"
                                        min="1"
                                        max="10"
                                        value={numCandidates}
                                        onChange={(e) => setNumCandidates(parseInt(e.target.value))}
                                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                    <span className="text-sm font-bold text-slate-700 w-8 text-center">{numCandidates}</span>
                                </div>
                            </div>

                            {/* Start Button */}
                            <button
                                onClick={runEvolutionLoop}
                                disabled={isProcessing}
                                className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 shadow-lg
                  ${isProcessing
                                        ? 'bg-slate-200 cursor-not-allowed text-slate-400'
                                        : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:opacity-90 shadow-blue-500/30'
                                    }
                `}
                            >
                                {isProcessing ? <Icon name="loader-2" className="animate-spin" /> : <Icon name="play" />}
                                {isProcessing ? 'Running Simulation...' : 'Start Maturation ✨'}
                            </button>
                        </div>
                    </Card>

                    {/* Sequence Card */}
                    <Card className="relative overflow-hidden">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-800">
                                <Icon name="align-left" className="text-blue-500" />
                                Variable Heavy Chain
                            </h2>
                            {isProcessing && <span className="text-xs text-green-600 animate-pulse">Sequencing...</span>}
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 min-h-[120px]">
                            {renderSequence()}
                        </div>
                        <div className="mt-4 flex gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> CDR1</span>
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500"></div> CDR2</span>
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> CDR3</span>
                        </div>
                    </Card>

                    {/* Safety Check */}
                    <Card>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-800">
                                <Icon name="shield" className="text-amber-500" />
                                Safety & Developability
                            </h2>
                            <button
                                onClick={runSafetyCheck}
                                disabled={isCheckingSafety || isProcessing}
                                className="text-xs px-3 py-1 bg-amber-50 text-amber-600 rounded-full border border-amber-200 hover:bg-amber-100 transition-colors flex items-center gap-1 disabled:opacity-50"
                            >
                                {isCheckingSafety && <Icon name="loader-2" size={12} className="animate-spin" />}
                                Run Safety Scan
                            </button>
                        </div>

                        {safetyAnalysis ? (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-slate-500 uppercase">Risk Level</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${safetyAnalysis.risk_level === 'Low' ? 'bg-green-50 text-green-700 border-green-200' :
                                            safetyAnalysis.risk_level === 'Medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                'bg-red-50 text-red-700 border-red-200'
                                        }`}>
                                        {safetyAnalysis.risk_level} Risk
                                    </span>
                                </div>
                                {safetyAnalysis.flags.length > 0 && (
                                    <div className="bg-red-50 p-2 rounded border border-red-100 text-xs text-red-800 space-y-1">
                                        {safetyAnalysis.flags.map((flag, i) => (
                                            <div key={i} className="flex items-start gap-1">
                                                <span className="mt-0.5"><Icon name="alert" size={10} /></span>
                                                <span>{flag}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <p className="text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-2">
                                    {safetyAnalysis.summary}
                                </p>
                            </div>
                        ) : (
                            <div className="text-xs text-slate-400 italic text-center py-4">
                                Run a scan to check for aggregation prone regions, immunogenicity, and chemical instability.
                            </div>
                        )}
                    </Card>

                    {/* System Logs */}
                    <Card className="flex-1 min-h-[250px] flex flex-col relative overflow-hidden">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-800">
                            <Icon name="terminal" className="text-emerald-500" />
                            System Logs
                        </h2>
                        <div className="flex-1 overflow-y-auto space-y-2 font-mono text-xs pr-2 max-h-[250px]">
                            {logs.map((log, i) => (
                                <div key={i} className={`p-2 rounded border-l-2 ${log.type === 'error' ? 'border-red-500 bg-red-50 text-red-700' :
                                        log.type === 'success' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' :
                                            log.type === 'process' ? 'border-purple-500 bg-purple-50 text-purple-700' :
                                                'border-blue-500 bg-blue-50 text-blue-700'
                                    }`}>
                                    <span className="opacity-50 mr-2 text-slate-500">[{log.timestamp}]</span>
                                    {log.message}
                                </div>
                            ))}
                            <div ref={logsEndRef}></div>
                        </div>
                        {isProcessing && (
                            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                <div
                                    className="w-full h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent absolute animate-pulse"
                                    style={{ animation: 'scan 2s linear infinite' }}
                                />
                            </div>
                        )}
                    </Card>
                </div>

                {/* Right Column */}
                <div className="lg:col-span-2 flex flex-col gap-6">

                    {/* Score Display */}
                    <Card className="h-[200px]">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                                <Icon name="activity" className="text-green-500" />
                                Evolutionary Trajectory
                            </h2>
                            {history.length > 0 && (
                                <div className="text-right">
                                    <div className="text-3xl font-bold text-emerald-600">
                                        {history[history.length - 1]?.score || 0}
                                    </div>
                                    <div className="text-xs text-slate-400">Current Score</div>
                                </div>
                            )}
                        </div>

                        {/* Simple Score Bar Visualization */}
                        <div className="flex items-end gap-1 h-24">
                            {history.map((item, idx) => (
                                <div
                                    key={idx}
                                    className="flex-1 bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-sm transition-all duration-500 relative group"
                                    style={{ height: `${item.score}%` }}
                                >
                                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-1 py-0.5 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                        Gen {item.generation}: {item.score}
                                    </div>
                                </div>
                            ))}
                            {history.length === 0 && (
                                <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                                    Start maturation to see progress
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Report Button & Display */}
                    {history.length > 0 && !isProcessing && (
                        <div className="flex justify-end">
                            <button
                                onClick={generateReport}
                                disabled={isGeneratingReport}
                                className="bg-white border border-slate-200 hover:border-blue-300 text-slate-600 hover:text-blue-600 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm flex items-center gap-2"
                            >
                                {isGeneratingReport ? <Icon name="loader-2" className="animate-spin" /> : <Icon name="file" />}
                                Generate Campaign Summary ✨
                            </button>
                        </div>
                    )}

                    {report && (
                        <Card className="bg-gradient-to-br from-white to-blue-50 border-blue-100">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Icon name="file" className="text-blue-600" />
                                Scientific Report
                            </h3>
                            <div className="prose prose-sm prose-slate max-w-none whitespace-pre-line text-slate-700">
                                {report}
                            </div>
                        </Card>
                    )}

                    {/* Mutation History */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {history.slice().reverse().map((item, idx) => (
                            <Card key={idx} className={`${idx === 0 ? 'border-blue-200 shadow-lg shadow-blue-500/5 bg-white' : 'bg-slate-50'}`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Generation {item.generation}</div>
                                        <div className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                            {item.mutation === "None" ? "Wild Type" : item.mutation}
                                            {idx === 0 && item.mutation !== "None" && <Badge type="blue">Latest</Badge>}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-emerald-600">{item.score}</div>
                                        <div className="text-[10px] text-slate-400">SCORE</div>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-600 leading-relaxed border-t border-slate-200 pt-3">
                                    {item.reason}
                                </p>
                            </Card>
                        ))}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default AffinityMaturation;
