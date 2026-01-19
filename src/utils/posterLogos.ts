// Poster-specific logo resolver using assets under src/assets/posters/logosrevista
// Returns a Vite-resolved URL string or null if not found
export const getPosterLogo = (teamName: string): string | null => {
  if (!teamName) return null;
  const teamNameLower = teamName.toLowerCase();

  const logoMap: { [key: string]: string } = {
    'audax': 'audax.png',
    'everton': 'everton.png',
    'recoleta': 'recoleta.png',
    'santiago morning': 'santiago_morning.png',
    'santiago wanderers': 'wanderers.png',
    'universidad de chile': 'u_de_chile.png',
    'universidad de concepción': 'udec.png',
    'universidad católica': 'u_catolica.png',
    'colo colo': 'colo_colo.png',
    'coquimbo': 'coquimbo.png',
    'iquique': 'iquique.png',
    'huachipato': 'huachipato.png',
    'palestino': 'palestino.png',
    'unión española': 'union_espanola.png',
    'argentina': 'ARG.png',
    'bolivia': 'BOL.png',
    'brasil': 'BRA.png',
    'chile': 'CHI.png',
    'colombia': 'COL.png',
    'ecuador': 'ECU.png',
    'paraguay': 'PAR.png',
    'perú': 'PER.png',
    'uruguay': 'URU.png',
    'venezuela': 'VEN.png',
  };

  const basePath = '../assets/posters/logosrevista/';
  for (const [key, logoName] of Object.entries(logoMap)) {
    if (teamNameLower.includes(key)) {
      try {
        return new URL(basePath + logoName, import.meta.url).toString();
      } catch {
        // continue checking
      }
    }
  }
  return null;
};
