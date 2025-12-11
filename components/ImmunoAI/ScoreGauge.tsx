import React from 'react';

interface ScoreGaugeProps {
    score: number;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({ score }) => {
    const normalizedScore = Math.min(Math.max(score, 0), 100);
    const strokeDasharray = `${normalizedScore * 3.77} 377`;

    let color = '#ef4444'; // red
    if (score > 60) color = '#eab308'; // yellow
    if (score > 80) color = '#22c55e'; // green

    return (
        <div className="relative flex items-center justify-center w-48 h-48">
            <svg className="transform -rotate-90 w-full h-full">
                <circle
                    cx="96" cy="96" r="60"
                    stroke="#e2e8f0" strokeWidth="10" fill="transparent"
                />
                <circle
                    cx="96" cy="96" r="60"
                    stroke={color} strokeWidth="10" fill="transparent"
                    strokeDasharray={strokeDasharray}
                    className="transition-all duration-1000 ease-out"
                />
            </svg>
            <div className="absolute text-center">
                <span className="text-4xl font-bold text-slate-800">{score.toFixed(1)}%</span>
                <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">Humanness</p>
            </div>
        </div>
    );
};
