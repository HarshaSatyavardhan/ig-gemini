import { AMINO_ACID_PROPERTIES, HUMAN_GERMLINES } from './aminoAcidProperties';

export interface RegionData {
    fr1: string;
    cdr1: string;
    fr2: string;
    cdr2: string;
    fr3: string;
    cdr3: string;
    fr4: string;
}

export interface HumannessAnalysis {
    identity: number;
    t20: string;
    avgHydro: number;
    charge: number;
    isHuman: boolean;
}

// Heuristic Region Parsing (Simplified Kabat/Chothia for demo)
export const parseRegions = (seq: string): RegionData => {
    const cys1Index = seq.indexOf('C');
    const cys3Index = seq.lastIndexOf('C');
    const wgIndex = seq.lastIndexOf('WG');

    if (cys1Index === -1 || cys3Index === -1 || cys3Index <= cys1Index) {
        const len = seq.length;
        return {
            fr1: seq.substring(0, 25),
            cdr1: seq.substring(25, 33),
            fr2: seq.substring(33, 50),
            cdr2: seq.substring(50, 58),
            fr3: seq.substring(58, 95),
            cdr3: seq.substring(95, 105),
            fr4: seq.substring(105, len)
        };
    }

    return {
        fr1: seq.substring(0, cys1Index + 4),
        cdr1: seq.substring(cys1Index + 4, cys1Index + 12),
        fr2: seq.substring(cys1Index + 12, cys1Index + 29),
        cdr2: seq.substring(cys1Index + 29, cys3Index - 32),
        fr3: seq.substring(cys3Index - 32, cys3Index + 3),
        cdr3: seq.substring(cys3Index + 3, wgIndex !== -1 ? wgIndex : seq.length - 10),
        fr4: seq.substring(wgIndex !== -1 ? wgIndex : seq.length - 10)
    };
};

export const calculateHumanness = (seq: string): HumannessAnalysis => {
    let matchScore = 0;
    const totalLen = Math.min(seq.length, HUMAN_GERMLINES['IGHV3-23'].length);

    for (let i = 0; i < totalLen; i++) {
        if (seq[i] === HUMAN_GERMLINES['IGHV3-23'][i]) matchScore++;
    }

    const identity = (matchScore / totalLen) * 100;
    const t20 = ((identity - 85) / 10).toFixed(2);

    let totalHydro = 0;
    let charge = 0;
    for (const char of seq) {
        if (AMINO_ACID_PROPERTIES[char]) {
            totalHydro += AMINO_ACID_PROPERTIES[char].hydro;
            charge += AMINO_ACID_PROPERTIES[char].charge;
        }
    }
    const avgHydro = totalHydro / seq.length;

    return {
        identity,
        t20,
        avgHydro,
        charge,
        isHuman: identity > 85
    };
};
