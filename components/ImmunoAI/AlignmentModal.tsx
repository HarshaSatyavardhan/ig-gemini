import React from 'react';
import { Dna, X } from 'lucide-react';

interface AlignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    querySeq: string;
}

export const AlignmentModal: React.FC<AlignmentModalProps> = ({ isOpen, onClose, querySeq }) => {
    if (!isOpen) return null;

    const subjectName = "Adalimumab (Humira)";
    // Adalimumab VH Sequence for comparison
    const subjectSeq = "EVQLVESGGGLVQPGGSLRLSCAASGFTFSSYAMSWVRQAPGKGLEWVSAISGSGGSTYYADSVKGRFTISRDNSKNTLYLQMNSLRAEDTAVYYCARDYYGSSWYFDVWGQGTLVTVSS";

    // Split into chunks for readability
    const chunkSize = 40;
    const chunks: number[] = [];
    for (let i = 0; i < Math.max(querySeq.length, subjectSeq.length); i += chunkSize) {
        chunks.push(i);
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Dna className="text-indigo-600" size={20} /> Alignment View
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">Comparing Input (Query) vs. {subjectName} (Ref)</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    <div className="space-y-8 font-mono text-sm">
                        {chunks.map((startIdx) => {
                            const qChunk = querySeq.slice(startIdx, startIdx + chunkSize).padEnd(chunkSize, '-');
                            const sChunk = subjectSeq.slice(startIdx, startIdx + chunkSize).padEnd(chunkSize, '-');

                            return (
                                <div key={startIdx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                    {/* Position Header */}
                                    <div className="flex justify-between text-xs text-slate-400 mb-2 px-2">
                                        <span>Pos {startIdx + 1}</span>
                                        <span>{Math.min(startIdx + chunkSize, Math.max(querySeq.length, subjectSeq.length))}</span>
                                    </div>

                                    {/* Subject (Reference) */}
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="w-16 text-xs font-bold text-slate-400 text-right select-none">REF</span>
                                        <div className="flex tracking-widest text-slate-500">
                                            {sChunk.split('').map((char, i) => (
                                                <span key={i} className="w-4 text-center">{char}</span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Alignment Line */}
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="w-16 select-none"></span>
                                        <div className="flex tracking-widest">
                                            {qChunk.split('').map((char, i) => {
                                                const match = char === sChunk[i];
                                                const gap = char === '-' || sChunk[i] === '-';
                                                return (
                                                    <span key={i} className="w-4 text-center text-[10px] h-4 flex items-center justify-center">
                                                        {gap ? '' : match ? <span className="w-1 h-1 rounded-full bg-emerald-400"></span> : <span className="text-red-500 font-bold">x</span>}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Query (Input) */}
                                    <div className="flex items-center gap-3">
                                        <span className="w-16 text-xs font-bold text-indigo-600 text-right select-none">QUERY</span>
                                        <div className="flex tracking-widest">
                                            {qChunk.split('').map((char, i) => {
                                                const match = char === sChunk[i];
                                                return (
                                                    <span
                                                        key={i}
                                                        className={`w-4 text-center font-bold ${match ? 'text-slate-800' : 'bg-red-100 text-red-600 rounded'}`}
                                                    >
                                                        {char}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-white rounded-b-2xl flex justify-between items-center text-xs text-slate-500">
                    <div className="flex gap-4">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> Match</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-100 border border-red-200"></span> Mismatch</span>
                    </div>
                    <button onClick={onClose} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
