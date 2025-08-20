interface TeamLogoProps {
    teamName: string;
    className?: string;
}

export const getTeamLogo = (teamName: string): string | null => {
    const teamNameLower = teamName.toLowerCase();
    const logoMap: { [key: string]: string } = {
        'audax': 'Audax.png',
        'everton': 'Everton.png',
        'recoleta': 'Recoleta.svg',
        'santiago morning': 'Santiago-Morning.svg',
        'santiago wanderers': 'Santiago-Wanderers-2.svg',
        'universidad de chile': 'UChile.png',
        'universidad de concepción': 'Ude-Concepcion.svg',
        'universidad católica': 'catolica.png',
        'colo colo': 'colocolo.png',
        'coquimbo': 'coquimbo.png',
        'iquique': 'deportesiqui.png',
        'huachipato': 'huachipato.png',
        'palestino': 'palestino.png',
        'unión española': 'union-espanola.png',
        'argentina': 'ARG.png',
        'bolivia': 'BOL.png',
        'brasil': 'BRA.png',
        'chile': 'CHI.png',
        'colombia': 'COL.png',
        'ecuador': 'ECU.png',
        'paraguay': 'PAR.png',
        'perú': 'PER.png',
        'uruguay': 'URU.png',
        'venezuela': 'VEN.png'
    };

    // Try to find the logo by matching parts of the team name
    for (const [key, value] of Object.entries(logoMap)) {
        if (teamNameLower.includes(key)) {
            return `/LOGOS/${value}`;
        }
    }

    // Return null if no logo is found
    return null;
};
