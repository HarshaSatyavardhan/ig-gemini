import React from 'react';

// Custom SVG Icon definitions
const ICON_PATHS: Record<string, React.ReactNode> = {
    dna: (
        <>
            <path d="M2 15c6.667-6 13.333 0 20-6" />
            <path d="M9 22c1.798-1.998 2.518-3.995 2.807-5.993" />
            <path d="M15 2c-1.798 1.998-2.518 3.995-2.807 5.993" />
            <path d="M17 6l-2.5-2.5" />
            <path d="M14 8l-1-1" />
            <path d="M7 18l2.5 2.5" />
            <path d="M3.5 14.5l-1 1" />
            <path d="M20 9l-1 1" />
            <path d="M14.5 21.5l-5-5" />
            <path d="M6.5 2.5l5 5" />
        </>
    ),
    'loader-2': <path d="M21 12a9 9 0 1 1-6.219-8.56" />,
    play: <polygon points="5 3 19 12 5 21 5 3" />,
    'align-left': (
        <>
            <line x1="17" y1="10" x2="3" y2="10" />
            <line x1="21" y1="6" x2="3" y2="6" />
            <line x1="21" y1="14" x2="3" y2="14" />
            <line x1="17" y1="18" x2="3" y2="18" />
        </>
    ),
    terminal: (
        <>
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
        </>
    ),
    activity: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
    file: (
        <>
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
            <polyline points="13 2 13 9 20 9" />
        </>
    ),
    target: (
        <>
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
        </>
    ),
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
    alert: (
        <>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
        </>
    ),
    settings: (
        <>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </>
    ),
    layers: (
        <>
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
        </>
    ),
    flask: (
        <>
            <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2" />
            <path d="M8.5 2h7" />
            <path d="M7 16h10" />
        </>
    )
};

interface IconProps {
    name: string;
    size?: number;
    className?: string;
}

export const Icon: React.FC<IconProps> = ({ name, size = 20, className = "" }) => {
    const iconPath = ICON_PATHS[name];
    if (!iconPath) return null;

    return (
        <span
            className={className}
            style={{ width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                width={size}
                height={size}
            >
                {iconPath}
            </svg>
        </span>
    );
};

interface CardProps {
    children: React.ReactNode;
    className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = "" }) => (
    <div className={`bg-white/70 backdrop-blur-xl border border-slate-200/80 shadow-sm rounded-xl p-6 ${className}`}>
        {children}
    </div>
);

interface BadgeProps {
    children: React.ReactNode;
    type?: 'blue' | 'green' | 'purple' | 'red' | 'amber';
}

export const Badge: React.FC<BadgeProps> = ({ children, type = "blue" }) => {
    const colors: Record<string, string> = {
        blue: "bg-blue-100 text-blue-700 border-blue-200",
        green: "bg-emerald-100 text-emerald-700 border-emerald-200",
        purple: "bg-purple-100 text-purple-700 border-purple-200",
        red: "bg-red-100 text-red-700 border-red-200",
        amber: "bg-amber-100 text-amber-700 border-amber-200",
    };
    return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${colors[type] || colors.blue}`}>
            {children}
        </span>
    );
};
