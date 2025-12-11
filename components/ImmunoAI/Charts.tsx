import React from 'react';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip
} from 'recharts';
import { Activity } from 'lucide-react';
import { AMINO_ACID_PROPERTIES } from '../../utils/aminoAcidProperties';

interface RadarData {
    subject: string;
    A: number;
    B: number;
    fullMark: number;
}

interface RadarChartPanelProps {
    data: RadarData[];
}

export const RadarChartPanel: React.FC<RadarChartPanelProps> = ({ data }) => {
    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-80 flex flex-col">
            <h3 className="text-slate-800 font-semibold mb-4 flex items-center gap-2">
                <Activity size={18} className="text-indigo-500" /> Multi-Parameter Audit
            </h3>
            <div className="flex-1 w-full -ml-4">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar
                            name="Candidate"
                            dataKey="A"
                            stroke="#6366f1"
                            strokeWidth={2}
                            fill="#6366f1"
                            fillOpacity={0.4}
                        />
                        <Radar
                            name="Baseline"
                            dataKey="B"
                            stroke="#94a3b8"
                            strokeWidth={1}
                            fill="transparent"
                            strokeDasharray="3 3"
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#1e293b', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            itemStyle={{ color: '#6366f1' }}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

interface HydrophobicityChartProps {
    sequence: string;
}

export const HydrophobicityChart: React.FC<HydrophobicityChartProps> = ({ sequence }) => {
    const data = sequence.split('').map((char, i) => ({
        i,
        val: AMINO_ACID_PROPERTIES[char]?.hydro || 0
    }));

    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-80 flex flex-col">
            <h3 className="text-slate-800 font-semibold mb-4 flex items-center gap-2">
                <Activity size={18} className="text-pink-500" /> Hydrophobicity Profile
            </h3>
            <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorHydro" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="i" tick={false} stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#1e293b', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            labelStyle={{ display: 'none' }}
                        />
                        <Area type="monotone" dataKey="val" stroke="#ec4899" fillOpacity={1} fill="url(#colorHydro)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
