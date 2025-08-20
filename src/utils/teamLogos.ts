
// Función para obtener la ruta correcta del logo
export const getTeamLogo = (teamName: string): string | null => {
    if (!teamName) return null;
    
    const teamNameLower = teamName.toLowerCase();
    
    // Mapa de nombres de equipos a nombres de archivo de logos
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

    // Buscar el logo que coincida con el nombre del equipo
    for (const [key, logoName] of Object.entries(logoMap)) {
        if (teamNameLower.includes(key)) {
            // En producción, las imágenes estarán en /logos/
            // En desarrollo, Vite las servirá desde /public/logos/
            return `/logos/${logoName}`;
        }
    }

    // Si no se encuentra el logo, devolver null
    return null;
};
