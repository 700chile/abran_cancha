
// Función para obtener la ruta correcta del logo
export const getTeamLogo = (teamName: string): string | null => {
    if (!teamName) return null;
    
    const teamNameLower = teamName.toLowerCase();
    
    // Debug logging
    console.log('Looking for logo for team:', teamName);
    
    // Mapa de nombres de equipos a nombres de archivo de logos
    const logoMap: { [key: string]: string } = {
        'audax': 'Audax.png',
        'audax italiano': 'Audax.png',
        'everton': 'Everton.png',
        'recoleta': 'Recoleta.svg',
        'deportes recoleta': 'Recoleta.svg',
        'santiago morning': 'Santiago-Morning.svg',
        'santiago wanderers': 'Santiago-Wanderers-2.svg',
        'universidad de chile': 'UChile.png',
        'u. de chile': 'UChile.png',
        'universidad de concepción': 'Ude-Concepcion.svg',
        'u. de concepción': 'Ude-Concepcion.svg',
        'universidad de concepcion': 'Ude-Concepcion.svg',
        'u. de concepcion': 'Ude-Concepcion.svg',
        'universidad católica': 'catolica.png',
        'u. católica': 'catolica.png',
        'u. catolica': 'catolica.png',
        'colo colo': 'colocolo.png',
        'coquimbo': 'coquimbo.png',
        'coquimbo unido': 'coquimbo.png',
        'iquique': 'deportesiqui.png',
        'deportes iquique': 'deportesiqui.png',
        'huachipato': 'huachipato.png',
        'palestino': 'palestino.png',
        'unión española': 'union-espanola.png',
        'union española': 'union-espanola.png',
        'magallanes': 'Magallanes.svg',
        'deportes temuco': 'Temuco-1.svg',
        'temuco': 'Temuco-1.svg',
        'argentina': 'ARG.png',
        'bolivia': 'BOL.png',
        'brasil': 'BRA.png',
        'chile': 'CHI.png',
        'colombia': 'COL.png',
        'ecuador': 'ECU.png',
        'paraguay': 'PAR.png',
        'perú': 'PER.png',
        'peru': 'PER.png',
        'uruguay': 'URU.png',
        'venezuela': 'VEN.png'
    };

    // Resolver a la carpeta pública /logos/ para el resto de la app
    for (const [key, logoName] of Object.entries(logoMap)) {
        if (teamNameLower.includes(key)) {
            console.log('Found logo:', logoName, 'for team:', teamName);
            return `/logos/${logoName}`;
        }
    }

    // Si no se encuentra el logo, devolver null
    console.log('No logo found for team:', teamName);
    return null;
};
