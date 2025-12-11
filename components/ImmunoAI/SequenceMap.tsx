import React, { useState } from 'react';
import { Dna, Microscope } from 'lucide-react';
import { RegionData } from '../../utils/bioinformatics';

interface SequenceMapProps {
    regions: RegionData;
    sequence: string;
}

export const SequenceMap: React.FC<SequenceMapProps> = ({ regions, sequence }) => {
    const [hoveredRegion, setHoveredRegion] = useState<{ name: string; seq: string } | null>(null);

    const getRegionColor = (name: string) => {
        if (name.includes('cdr')) return 'bg-pink-500';
        return 'bg-blue-600';
    };

    return (
        <div className="w-full bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Dna size={18} className="text-blue-600" /> Sequence Topology
                </h3>
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">Length: {sequence.length} AA</span>
            </div>

            <div className="flex w-full h-12 rounded-lg overflow-hidden relative mb-2 ring-1 ring-slate-900/5">
                {Object.entries(regions).map(([key, seq], idx) => (
                    <div
                        key={key}
                        className={`h-full ${getRegionColor(key)} relative group cursor-pointer border-r border-white/20 transition-all duration-300`}
                        style={{
                            width: `${(seq.length / sequence.length) * 100}%`,
                            transitionDelay: `${idx * 50}ms`
                        }}
                        onMouseEnter={() => setHoveredRegion({ name: key, seq })}
                        onMouseLeave={() => setHoveredRegion(null)}
                    >
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/20">
                            <span className="text-[10px] font-bold text-white uppercase">{key}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="h-24 bg-slate-50 rounded-lg p-3 overflow-x-auto border border-slate-200 font-mono text-sm shadow-inner">
                {hoveredRegion ? (
                    <div className="animate-in fade-in duration-200">
                        <span className="text-xs uppercase text-slate-500 block mb-1">{hoveredRegion.name} Region ({hoveredRegion.seq.length} AA)</span>
                        <p className="text-blue-700 tracking-widest break-all font-medium">{hoveredRegion.seq}</p>
                        <div className="mt-2 text-xs flex gap-4 text-slate-500">
                            <span>Start: {sequence.indexOf(hoveredRegion.seq) + 1}</span>
                            <span>End: {sequence.indexOf(hoveredRegion.seq) + hoveredRegion.seq.length}</span>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-400 gap-2">
                        <Microscope size={16} />
                        <span>Hover over the sequence map above to inspect regions</span>
                    </div>
                )}
            </div>
        </div>
    );
};
