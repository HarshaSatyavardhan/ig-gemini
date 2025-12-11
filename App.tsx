import React, { useState, useEffect, useMemo } from 'react';
import { 
  Dna, 
  Activity, 
  Info, 
  ChevronRight, 
  Settings, 
  Share2, 
  Zap, 
  Search, 
  AlertCircle,
  CheckCircle2,
  Cpu,
  X,
  Sparkles,
  Bot,
  Microscope
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

// Types
interface Region {
  type: string;
  start: number;
  end: number;
  seq: string;
  color: string;
  name: string;
}

interface NumberingItem {
  index: number;
  aa: string;
  region: string;
  color: string;
  x?: number;
  y?: number;
}

interface AnalysisResult {
  regions: Region[];
  numbering: NumberingItem[];
  score: number;
  reasoning: string[];
  sequence: string;
  scheme: string;
}

/**
 * SIMULATED ANARCI / IMGT NUMBERING LOGIC
 * * In a real-world scenario, this would call a backend Python service (ANARCI).
 * Here, we implement a robust heuristic based on conserved residue anchors 
 * common in VH/VL domains (Kabat/IMGT definitions).
 */
const analyzeSequence = (seq: string, scheme = 'IMGT'): AnalysisResult => {
  const sequence = seq.toUpperCase().replace(/[^A-Z]/g, '');
  const len = sequence.length;
  
  // Anchors for Heuristic Alignment (simplified IMGT)
  // 1. 1st Cys (C23) - usually around 20-25
  // 2. Trp (W41) - usually around 35-40 (Start of FR2)
  // 3. 2nd Cys (C104) - usually around 85-100 (End of FR3 / Start of CDR3)
  // 4. FGXG/WGXG (FR4 motif) - usually around 100-115
  
  let regions: Region[] = [];
  let numbering: NumberingItem[] = [];
  let score = 0;
  let reasoning: string[] = [];

  // --- Step 1: Find Anchors ---
  
  // Find FR4 start (J-region motif: W/F-G-X-G)
  const fr4Regex = /([WF]G.G)/g;
  let match;
  let fr4Index = -1;
  while ((match = fr4Regex.exec(sequence)) !== null) {
    // We take the last one usually, but let's check position to be safe (should be > 80)
    if (match.index > len * 0.7) {
      fr4Index = match.index;
    }
  }

  // Find 2nd Cys (C104) - look backwards from FR4
  let c104Index = -1;
  if (fr4Index !== -1) {
    const searchEnd = fr4Index;
    const searchStart = Math.max(0, fr4Index - 25); // CDR3 is rarely > 25 residues
    for (let i = searchEnd - 1; i >= searchStart; i--) {
      if (sequence[i] === 'C') {
        c104Index = i;
        break;
      }
    }
  }

  // Find 1st Cys (C23)
  let c23Index = sequence.indexOf('C');
  if (c23Index > 30) c23Index = -1; // Too far

  // Find Trp (W41) - usually ~13-15 residues after C23
  let w41Index = -1;
  if (c23Index !== -1) {
    for (let i = c23Index + 10; i < c23Index + 25; i++) {
      if (sequence[i] === 'W') {
        w41Index = i;
        break;
      }
    }
  }

  // --- Step 2: Define Boundaries based on Scheme ---

  // Defaults if anchors fail
  let bounds = {
    fr1_end: 26,
    cdr1_end: 38,
    fr2_end: 55,
    cdr2_end: 65,
    fr3_end: 104,
    cdr3_end: 117
  };

  const hasAnchors = c23Index !== -1 && w41Index !== -1 && c104Index !== -1 && fr4Index !== -1;

  if (hasAnchors) {
    score = 0.95; // High confidence
    reasoning.push(`Identified conserved Cysteine (C23) at pos ${c23Index + 1}.`);
    reasoning.push(`Identified conserved Tryptophan (W41) at pos ${w41Index + 1}.`);
    reasoning.push(`Identified 2nd Cysteine (C104) at pos ${c104Index + 1} bounding FR3.`);
    reasoning.push(`Identified J-region motif (${sequence.substring(fr4Index, fr4Index + 4)}) at pos ${fr4Index + 1}.`);

    if (scheme === 'IMGT') {
      // IMGT: CDR1 (27-38), CDR2 (56-65), CDR3 (105-117)
      // Boundaries are very inclusive
      bounds.fr1_end = c23Index + 4; 
      bounds.cdr1_end = w41Index - 2; 
      bounds.fr2_end = w41Index + 14; 
      bounds.cdr2_end = bounds.fr2_end + 10; 
      bounds.fr3_end = c104Index + 1; // Includes the C
      bounds.cdr3_end = fr4Index;     
    } else if (scheme === 'Kabat') {
      // Kabat: CDR1 (31-35), CDR2 (50-65), CDR3 (95-102)
      // FR1 is longer, CDR1 starts later
      bounds.fr1_end = c23Index + 7; 
      bounds.cdr1_end = w41Index - 4; 
      // FR2 is shorter
      bounds.fr2_end = w41Index + 9; 
      // CDR2 is longer (starts earlier)
      bounds.cdr2_end = w41Index + 24; 
      // CDR3 starts after Cys
      bounds.fr3_end = c104Index + 3; 
      bounds.cdr3_end = fr4Index;
    } else if (scheme === 'Chothia') {
      // Chothia: CDR1 (26-32), CDR2 (52-56), CDR3 (95-102)
      // Structural loops are shorter
      bounds.fr1_end = c23Index + 4; 
      bounds.cdr1_end = w41Index - 6; // Ends much earlier than Kabat
      bounds.fr2_end = w41Index + 11; 
      bounds.cdr2_end = w41Index + 17; // Very short CDR2 loop
      bounds.fr3_end = c104Index + 3; 
      bounds.cdr3_end = fr4Index;
    }

  } else {
    score = 0.4;
    reasoning.push("Structural anchors were ambiguous. Falling back to statistical length models.");
    const scale = len / 120;
    bounds.fr1_end = Math.floor(26 * scale);
    bounds.cdr1_end = Math.floor(38 * scale);
    bounds.fr2_end = Math.floor(55 * scale);
    bounds.cdr2_end = Math.floor(65 * scale);
    bounds.fr3_end = Math.floor(104 * scale);
    bounds.cdr3_end = len - 11;
  }

  // --- Step 3: Map Residues ---
  
  const addRegion = (start: number, end: number, type: string, color: string, name: string) => {
    // Clamp
    if (start >= len) return;
    if (end > len) end = len;
    // ensure start < end
    if (start >= end) end = start; 

    const regionSeq = sequence.substring(start, end);
    regions.push({ type, start, end, seq: regionSeq, color, name });
    
    for (let i = start; i < end; i++) {
      numbering.push({
        index: i + 1,
        aa: sequence[i],
        region: type,
        color: color
      });
    }
  };

  let current = 0;
  addRegion(current, bounds.fr1_end, 'FR1', 'bg-slate-300', 'Framework 1');
  current = bounds.fr1_end;
  
  addRegion(current, bounds.cdr1_end, 'CDR1', 'bg-red-400', 'CDR 1');
  current = bounds.cdr1_end;
  
  addRegion(current, bounds.fr2_end, 'FR2', 'bg-slate-300', 'Framework 2');
  current = bounds.fr2_end;
  
  addRegion(current, bounds.cdr2_end, 'CDR2', 'bg-green-400', 'CDR 2');
  current = bounds.cdr2_end;
  
  addRegion(current, bounds.fr3_end, 'FR3', 'bg-slate-300', 'Framework 3');
  current = bounds.fr3_end;
  
  addRegion(current, bounds.cdr3_end, 'CDR3', 'bg-blue-500', 'CDR 3');
  current = bounds.cdr3_end;
  
  addRegion(current, len, 'FR4', 'bg-slate-300', 'Framework 4');

  return { regions, numbering, score, reasoning, sequence, scheme };
};

// --- GEMINI API INTEGRATION ---
const generateGeminiContent = async (prompt: string): Promise<string> => {
  const apiKey = process.env.API_KEY || "";
  
  if (!apiKey) {
    throw new Error("API Key not found");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // Using gemini-2.5-flash as the base robust model for text tasks
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  return response.text || "No insights generated.";
};


// --- Visual Components ---

const Tooltip = ({ children, text }: { children: React.ReactNode; text: string }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="absolute z-50 bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap">
          {text}
        </div>
      )}
    </div>
  );
};

const NecklacePlot = ({ numbering, showLabels = true }: { numbering: NumberingItem[]; showLabels?: boolean }) => {
  // Generate coordinates for a U-shaped or Loop-shaped path
  
  const points = useMemo(() => {
    // Very simple "Turtle graphics" style generation for the necklace
    // Refined for better packing
    return numbering.map((res, i) => {
      // Use a snake layout (S-shape)
      const rowLen = 25;
      const spacing = 22;
      const row = Math.floor(i / rowLen);
      const col = i % rowLen;
      
      const isRev = row % 2 !== 0;
      const px = isRev 
        ? (rowLen - 1 - col) * spacing + 50 
        : col * spacing + 50;
      const py = row * spacing * 1.5 + 50;
      
      return { x: px, y: py, ...res };
    });

  }, [numbering]);

  return (
    <div className="overflow-x-auto pb-4">
      <svg width={Math.max(800, points.length * 5)} height={Math.max(300, (points[points.length-1]?.y || 0) + 50 || 300)} className="mx-auto">
        {/* Connecting Line */}
        <path 
          d={`M ${points.map(p => `${p.x} ${p.y}`).join(' L ')}`} 
          fill="none" 
          stroke="#e2e8f0" 
          strokeWidth="4" 
        />
        
        {/* Beads */}
        {points.map((p, i) => (
          <g key={i} className="cursor-pointer group">
            <circle 
              cx={p.x} 
              cy={p.y} 
              r="9" 
              className={`transition-all duration-300 ${p.region.startsWith('CDR') ? 'stroke-2 stroke-white' : ''}`}
              fill={
                p.region === 'CDR1' ? '#ef4444' :
                p.region === 'CDR2' ? '#4ade80' :
                p.region === 'CDR3' ? '#3b82f6' :
                '#94a3b8'
              } 
            />
            {showLabels && (
              <text 
                x={p.x} 
                y={p.y} 
                dy=".35em" 
                textAnchor="middle" 
                fill="white" 
                fontSize="8" 
                fontWeight="bold"
                className="pointer-events-none"
              >
                {p.aa}
              </text>
            )}
            
            {/* SVG Tooltip on Hover */}
            <title>{`${p.region} - Pos ${p.index}: ${p.aa}`}</title>
          </g>
        ))}
      </svg>
    </div>
  );
};

const RegionBar = ({ regions }: { regions: Region[] }) => {
  const totalLen = regions.reduce((acc, r) => acc + r.seq.length, 0);
  
  return (
    <div className="w-full h-12 flex rounded-lg overflow-hidden shadow-sm my-6">
      {regions.map((r, i) => (
        <div 
          key={i}
          className={`${r.color} h-full flex items-center justify-center relative group transition-all duration-300 hover:brightness-110`}
          style={{ width: `${(r.seq.length / totalLen) * 100}%` }}
        >
          <span className="text-xs font-bold text-white opacity-80 group-hover:opacity-100 hidden sm:block">
            {r.type}
          </span>
          <div className="absolute top-full mt-2 hidden group-hover:block z-20 bg-gray-800 text-white text-xs p-2 rounded shadow-lg min-w-[100px] text-center">
            <div className="font-bold">{r.name}</div>
            <div>Length: {r.seq.length}</div>
            <div className="font-mono mt-1 text-gray-300 break-all">{r.seq}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default function AntibodyAnalyzer() {
  const defaultSeq = "EVQLVESGGGLVQPGGSLRLSCAASGFTFSSYAMSWVRQAPGKGLEWVSAISGSGGSTYYADSVKGRFTISRDNSKNTLYLQMNSLRAEDTAVYYCARDYYGSSWYFDVWGQGTLVTVSS";
  const [sequence, setSequence] = useState(defaultSeq);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [scheme, setScheme] = useState('IMGT');
  
  // AI Feature States
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [activeAiMode, setActiveAiMode] = useState<string | null>(null);

  // Run analysis when sequence OR scheme changes
  useEffect(() => {
    setIsAnimating(true);
    setAiResult(null); // Clear previous AI results on sequence change
    setAiError(null);
    
    // Simulate processing delay for "AI" feel
    const timer = setTimeout(() => {
      const result = analyzeSequence(sequence, scheme);
      setAnalysis(result);
      setIsAnimating(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [sequence, scheme]);

  const handleSequenceChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSequence(e.target.value);
  };

  const runAiAnalysis = async (mode: string) => {
    if (!analysis) return;
    setAiLoading(true);
    setAiError(null);
    setActiveAiMode(mode);
    
    const cdr1 = analysis.regions.find(r => r.type === 'CDR1')?.seq || "N/A";
    const cdr2 = analysis.regions.find(r => r.type === 'CDR2')?.seq || "N/A";
    const cdr3 = analysis.regions.find(r => r.type === 'CDR3')?.seq || "N/A";
    
    let prompt = "";
    if (mode === 'liabilities') {
      prompt = `
        You are an expert computational biologist specializing in antibody engineering.
        Analyze the following antibody sequence (${scheme} numbering):
        
        Full Sequence: ${sequence}
        CDR1: ${cdr1}
        CDR2: ${cdr2}
        CDR3: ${cdr3}
        
        Please provide a concise technical report covering:
        1. **Likely Species of Origin** (e.g., Human, Mouse, Camelid) based on framework homology.
        2. **Sequence Liabilities:** Identify specific chemical liability motifs (e.g., Deamidation [NG, NS], Oxidation [M, W], Isomerization [DG], Glycosylation [NxS/T]) specifically within the CDRs.
        3. **Therapeutic Similarity:** Does this sequence strongly resemble any FDA-approved antibodies (e.g., Trastuzumab, Adalimumab)?
        
        Format the output as a clean, bulleted list suitable for a dashboard. Keep it under 200 words.
      `;
    } else if (mode === 'humanize') {
      prompt = `
        You are an expert antibody engineer.
        Review the following antibody sequence: ${sequence}
        
        Suggest 3 specific point mutations to improve its stability, solubility, or "humaneness" (reduce immunogenicity), focusing on the Framework Regions (FR).
        
        For each suggestion, strictly follow this format:
        - **Mutation:** [OriginalResidue][Pos][NewResidue] (e.g., A43S)
        - **Rationale:** Brief explanation of why this improves the molecule.
      `;
    }

    try {
      const text = await generateGeminiContent(prompt);
      setAiResult(text);
    } catch (err) {
      console.error(err);
      setAiError("Failed to connect to AI service. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-200">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <Dna size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-600">
                SeqLogic AI
              </h1>
              <p className="text-xs text-slate-500 font-medium tracking-wide">ANTIBODY ANALYZER</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
              <Share2 size={20} />
            </button>
            <button 
              onClick={() => setShowConfig(true)}
              className="flex items-center space-x-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-md"
            >
              <Settings size={16} />
              <span>Config</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        
        {/* Input Section */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-20 h-1"></div>
          <div className="p-6 md:p-8">
            <div className="flex justify-between items-end mb-4">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-2">
                <Search size={16} />
                <span>Input Sequence (VH/VL)</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full font-bold border border-blue-100">
                  {scheme} Scheme
                </span>
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full font-mono">
                  Length: {sequence.length} AA
                </span>
              </div>
            </div>
            
            <textarea
              value={sequence}
              onChange={handleSequenceChange}
              className="w-full h-32 p-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-mono text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
              placeholder="Paste your amino acid sequence here..."
            />
            
            <div className="mt-4 flex flex-wrap gap-2">
              <button 
                onClick={() => setSequence("EVQLVESGGGLVQPGGSLRLSCAASGFTFSSYAMSWVRQAPGKGLEWVSAISGSGGSTYYADSVKGRFTISRDNSKNTLYLQMNSLRAEDTAVYYCARDYYGSSWYFDVWGQGTLVTVSS")}
                className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full hover:bg-blue-100 font-medium transition-colors"
              >
                Load Sample VH
              </button>
              <button 
                onClick={() => setSequence("DIQMTQSPSSLSASVGDRVTITCRASQGISNYLAWYQQKPGKVPKLLIYAASTLQSGVPSRFSGSGSGTDFTLTISSLQPEDVATYYCQKYNSAPLTFGGGTKVEIK")}
                className="text-xs bg-purple-50 text-purple-600 px-3 py-1 rounded-full hover:bg-purple-100 font-medium transition-colors"
              >
                Load Sample VL
              </button>
            </div>
          </div>
        </section>

        {isAnimating ? (
          <div className="h-64 flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin text-blue-600">
              <Cpu size={48} />
            </div>
            <p className="text-slate-500 animate-pulse font-medium"> analyzing structural motifs...</p>
          </div>
        ) : analysis && (
          <>
            {/* Top Analysis Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* AI Structural Reasoning (Rule Based) */}
              <div className="md:col-span-2 space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-center space-x-2 mb-6">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                      <Zap size={20} />
                    </div>
                    <h2 className="text-lg font-bold text-slate-800">Structural Topology Logic</h2>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      {analysis.score > 0.8 ? (
                        <CheckCircle2 className="text-green-500 mt-1 shrink-0" size={20} />
                      ) : (
                        <AlertCircle className="text-amber-500 mt-1 shrink-0" size={20} />
                      )}
                      <div>
                        <h4 className="font-bold text-slate-700 text-sm">
                          {analysis.score > 0.8 ? 'High Confidence Identification' : 'Low Confidence Approximation'}
                        </h4>
                        <p className="text-slate-500 text-sm mt-1">
                          {analysis.score > 0.8 
                            ? `The algorithm successfully anchored sequence features to ${scheme} antibody motifs.` 
                            : "Some standard anchors were missing. Regions are estimated based on average lengths."}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Identified Anchors</p>
                      {analysis.reasoning.map((r, i) => (
                        <div key={i} className="flex items-center space-x-2 text-sm text-slate-600 pl-2 border-l-2 border-indigo-200">
                          <ChevronRight size={14} className="text-indigo-400" />
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ✨ Generative AI Insights Panel ✨ */}
                <div className="bg-gradient-to-br from-indigo-900 to-blue-900 rounded-2xl shadow-lg border border-indigo-700 p-6 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-32 bg-white opacity-5 rounded-full blur-3xl transform translate-x-10 -translate-y-10"></div>
                  
                  <div className="flex items-center justify-between mb-6 relative z-10">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-white/10 text-white rounded-lg backdrop-blur-sm">
                        <Sparkles size={20} />
                      </div>
                      <h2 className="text-lg font-bold">Generative AI Insights</h2>
                    </div>
                    <span className="text-[10px] bg-white/20 px-2 py-1 rounded text-indigo-100">Powered by Gemini</span>
                  </div>

                  {!aiResult && !aiLoading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
                      <button 
                        onClick={() => runAiAnalysis('liabilities')}
                        className="flex items-start space-x-3 bg-white/10 hover:bg-white/20 p-4 rounded-xl transition-all border border-white/10 text-left group"
                      >
                        <Microscope className="shrink-0 mt-1 text-blue-300 group-hover:text-blue-200" size={20} />
                        <div>
                          <h4 className="font-bold text-sm">Scan for Liabilities & Origin</h4>
                          <p className="text-xs text-indigo-200 mt-1">Identify developability risks in CDRs and estimate species.</p>
                        </div>
                      </button>

                      <button 
                        onClick={() => runAiAnalysis('humanize')}
                        className="flex items-start space-x-3 bg-white/10 hover:bg-white/20 p-4 rounded-xl transition-all border border-white/10 text-left group"
                      >
                        <Bot className="shrink-0 mt-1 text-purple-300 group-hover:text-purple-200" size={20} />
                        <div>
                          <h4 className="font-bold text-sm">Suggest Optimizations</h4>
                          <p className="text-xs text-indigo-200 mt-1">Generate point mutations for humanization and stability.</p>
                        </div>
                      </button>
                    </div>
                  )}

                  {aiLoading && (
                    <div className="py-8 flex flex-col items-center justify-center space-y-3 text-indigo-200">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                      <p className="text-sm animate-pulse">Consulting Gemini LLM...</p>
                    </div>
                  )}

                  {aiResult && (
                    <div className="relative z-10 animate-in fade-in slide-in-from-bottom-2">
                      <div className="bg-black/20 rounded-xl p-4 border border-white/10 max-h-60 overflow-y-auto custom-scrollbar">
                        <h4 className="text-xs font-bold text-indigo-300 uppercase mb-2">
                          {activeAiMode === 'liabilities' ? 'Liability Analysis Report' : 'Optimization Suggestions'}
                        </h4>
                        <div className="prose prose-invert prose-sm text-sm text-indigo-50 whitespace-pre-line leading-relaxed">
                          {aiResult}
                        </div>
                      </div>
                      <button 
                        onClick={() => setAiResult(null)}
                        className="mt-4 text-xs font-bold text-indigo-200 hover:text-white flex items-center gap-1 transition-colors"
                      >
                        <ChevronRight size={14} className="rotate-180" />
                        Back to Options
                      </button>
                    </div>
                  )}
                  
                  {aiError && (
                     <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm flex items-center gap-2">
                       <AlertCircle size={16} />
                       {aiError}
                     </div>
                  )}

                </div>
              </div>

              {/* Stats Panel */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between h-fit">
                <div>
                  <div className="flex items-center space-x-2 mb-6">
                    <div className="p-2 bg-pink-100 text-pink-600 rounded-lg">
                      <Activity size={20} />
                    </div>
                    <h2 className="text-lg font-bold text-slate-800">CDR Metrics ({scheme})</h2>
                  </div>
                  <div className="space-y-4">
                    {analysis.regions.filter(r => r.type.startsWith('CDR')).map((cdr, idx) => (
                      <div key={idx} className="flex justify-between items-center group">
                        <div className="flex items-center space-x-2">
                          <span className={`w-3 h-3 rounded-full ${
                            cdr.type === 'CDR1' ? 'bg-red-400' : 
                            cdr.type === 'CDR2' ? 'bg-green-400' : 'bg-blue-500'
                          }`}></span>
                          <span className="font-medium text-slate-600">{cdr.type}</span>
                        </div>
                        <span className="font-mono text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-sm">
                          {cdr.seq.length} AA
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <div className="text-center">
                    <span className="text-4xl font-black text-slate-800">{analysis.regions.find(r => r.type === 'CDR3')?.seq.length || 0}</span>
                    <p className="text-xs text-slate-400 uppercase font-bold mt-1">CDR3 Length</p>
                  </div>
                </div>
              </div>

            </div>

            {/* Sequence Visualization */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-2">
                  <Info size={20} className="text-slate-400" />
                  <h3 className="text-lg font-bold text-slate-700">Sequence Map</h3>
                </div>
                <div className="flex space-x-4 text-xs font-bold text-slate-500">
                  <div className="flex items-center space-x-1"><span className="w-3 h-3 rounded-full bg-slate-300"></span><span>FR</span></div>
                  <div className="flex items-center space-x-1"><span className="w-3 h-3 rounded-full bg-red-400"></span><span>CDR1</span></div>
                  <div className="flex items-center space-x-1"><span className="w-3 h-3 rounded-full bg-green-400"></span><span>CDR2</span></div>
                  <div className="flex items-center space-x-1"><span className="w-3 h-3 rounded-full bg-blue-500"></span><span>CDR3</span></div>
                </div>
              </div>

              {/* 1D Bar */}
              <RegionBar regions={analysis.regions} />

              {/* 2D Necklace Plot */}
              <div className="mt-12 bg-slate-50 rounded-xl border border-slate-200 pt-8 pb-4 overflow-hidden relative">
                <div className="absolute top-4 left-4 text-xs font-bold text-slate-400 uppercase">2D Topology Preview</div>
                <NecklacePlot numbering={analysis.numbering} showLabels={showLabels} />
              </div>

              {/* Residue Grid (for detail) */}
              <div className="mt-12">
                <h4 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider">Detailed Residue Inspector</h4>
                <div className="flex flex-wrap gap-px">
                  {analysis.numbering.map((item, idx) => (
                    <Tooltip key={idx} text={`${item.region} ${item.index}`}>
                      <div className={`
                        w-5 h-5 flex items-center justify-center text-[10px] font-bold rounded-sm cursor-default
                        ${item.region.startsWith('CDR') ? 'text-white' : 'text-slate-600 bg-slate-100'}
                        ${item.region === 'CDR1' ? 'bg-red-400' : ''}
                        ${item.region === 'CDR2' ? 'bg-green-400' : ''}
                        ${item.region === 'CDR3' ? 'bg-blue-500' : ''}
                        hover:scale-150 transition-transform z-0 hover:z-10 relative shadow-sm hover:shadow-md
                      `}>
                        {item.aa}
                      </div>
                    </Tooltip>
                  ))}
                </div>
              </div>

            </div>
          </>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 mt-12 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-slate-400 text-sm">
            Generated by SeqLogic AI • Visualizing Immune Repertoires
          </p>
        </div>
      </footer>

      {/* Configuration Modal */}
      {showConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <Settings size={18} />
                Configuration
              </h3>
              <button 
                onClick={() => setShowConfig(false)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Display Options */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Visualization</h4>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <label className="flex items-center justify-between cursor-pointer group">
                    <div>
                      <span className="font-medium text-slate-700 block">Show Residue Labels</span>
                      <span className="text-xs text-slate-400">Display amino acid letters on the 2D plot</span>
                    </div>
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        checked={showLabels} 
                        onChange={(e) => setShowLabels(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Numbering Scheme Selection */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Numbering Scheme</h4>
                <div className="grid grid-cols-3 gap-2">
                  {['IMGT', 'Kabat', 'Chothia'].map((s) => (
                    <button 
                      key={s}
                      onClick={() => setScheme(s)}
                      className={`
                        py-2 px-3 text-xs font-bold rounded-lg shadow-sm border transition-all
                        ${scheme === s 
                          ? 'bg-blue-600 text-white border-transparent ring-2 ring-blue-600 ring-offset-2' 
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                        }
                      `}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-2 italic flex items-center gap-1">
                  <Info size={12} />
                  {scheme === 'IMGT' && "Standard for immunogenetics. Inclusive CDRs."}
                  {scheme === 'Kabat' && "Classic sequence-based definition. Longer CDR1."}
                  {scheme === 'Chothia' && "Structure-based. Short loops for CDR1/CDR2."}
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setShowConfig(false)} 
                className="px-6 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}