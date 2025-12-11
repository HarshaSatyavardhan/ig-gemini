// Amino acid properties for bioinformatics calculations
export const AMINO_ACID_PROPERTIES: Record<string, { hydro: number; charge: number; mass: number; category: string }> = {
    'A': { hydro: 1.8, charge: 0, mass: 89, category: 'Nonpolar' },
    'R': { hydro: -4.5, charge: 1, mass: 174, category: 'Positive' },
    'N': { hydro: -3.5, charge: 0, mass: 132, category: 'Polar' },
    'D': { hydro: -3.5, charge: -1, mass: 133, category: 'Negative' },
    'C': { hydro: 2.5, charge: 0, mass: 121, category: 'Polar' },
    'Q': { hydro: -3.5, charge: 0, mass: 146, category: 'Polar' },
    'E': { hydro: -3.5, charge: -1, mass: 147, category: 'Negative' },
    'G': { hydro: -0.4, charge: 0, mass: 75, category: 'Nonpolar' },
    'H': { hydro: -3.2, charge: 0.5, mass: 155, category: 'Positive' },
    'I': { hydro: 4.5, charge: 0, mass: 131, category: 'Nonpolar' },
    'L': { hydro: 3.8, charge: 0, mass: 131, category: 'Nonpolar' },
    'K': { hydro: -3.9, charge: 1, mass: 146, category: 'Positive' },
    'M': { hydro: 1.9, charge: 0, mass: 149, category: 'Nonpolar' },
    'F': { hydro: 2.8, charge: 0, mass: 165, category: 'Nonpolar' },
    'P': { hydro: -1.6, charge: 0, mass: 115, category: 'Nonpolar' },
    'S': { hydro: -0.8, charge: 0, mass: 105, category: 'Polar' },
    'T': { hydro: -0.7, charge: 0, mass: 119, category: 'Polar' },
    'W': { hydro: -0.9, charge: 0, mass: 204, category: 'Nonpolar' },
    'Y': { hydro: -1.3, charge: 0, mass: 181, category: 'Polar' },
    'V': { hydro: 4.2, charge: 0, mass: 117, category: 'Nonpolar' },
};

// Simplified consensus sequences for common Human VH germlines
export const HUMAN_GERMLINES: Record<string, string> = {
    'IGHV1-69': 'QVQLVQSGAEVKKPGSSVKVSCKASGGTFSSYAISWVRQAPGQGLEWMGGIIPIFGTANYAQKFQGRVTITADESTSTAYMELSSLRSEDTAVYYCAR',
    'IGHV3-23': 'EVQLLESGGGLVQPGGSLRLSCAASGFTFSSYAMSWVRQAPGKGLEWVSAISGSGGSTYYADSVKGRFTISRDNSKNTLYLQMNSLRAEDTAVYYCAK',
    'IGHV4-34': 'QVQLQQWGAGLLKPSETLSLTCAVYGGSFSGYYWSWIRQPPGKGLEWIGEINHSGSTNYNPSLKSRVTISVDTSKNQFSLKLSSVTAADTAVYYCAR',
};
