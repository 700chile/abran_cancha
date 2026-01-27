// Poster-specific logo resolver using assets under src/assets/posters/logosrevista
// Returns a Vite-resolved URL string or null if not found
export const getPosterLogo = (teamName: string): string | null => {
  if (!teamName) return null;
  const teamNameLower = teamName.toLowerCase();

  // Debug logging
  console.log('Poster: Looking for logo for team:', teamName);

  // Eagerly import all images in the folder so Vite emits hashed URLs
  const images: Record<string, string> = import.meta.glob(
    '../assets/posters/logosrevista/*.{png,svg,jpg,jpeg,webp}',
    { eager: true, as: 'url' }
  ) as any;

  // Helper: resolve a filename (case-insensitive) to its emitted URL
  const resolveUrl = (fileName: string): string | null => {
    const lower = fileName.toLowerCase();
    for (const [path, url] of Object.entries(images)) {
      const end = path.split('/').pop()?.toLowerCase();
      if (end === lower) return url as string;
    }
    return null;
  };

  const logoMap: { [key: string]: string } = {
    'audax': 'audax.png',
    'audax italiano': 'audax.png',
    'everton': 'everton.png',
    'recoleta': 'recoleta.png',
    'deportes recoleta': 'recoleta.png',
    'santiago morning': 'santiago_morning.png',
    'santiago wanderers': 'wanderers.png',
    'universidad de chile': 'u_de_chile.png',
    'u. de chile': 'u_de_chile.png',
    'universidad de concepción': 'udec.png',
    'u. de concepción': 'udec.png',
    'universidad católica': 'u_catolica.png',
    'u. católica': 'u_catolica.png',
    'u. catolica': 'u_catolica.png',
    'colo colo': 'colo_colo.png',
    'coquimbo': 'coquimbo.png',
    'coquimbo unido': 'coquimbo.png',
    'iquique': 'iquique.png',
    'deportes iquique': 'iquique.png',
    'huachipato': 'huachipato.png',
    'palestino': 'palestino.png',
    'unión española': 'union_espanola.png',
    'union española': 'union_espanola.png',
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
    'venezuela': 'VEN.png',
  };

  for (const [key, logoName] of Object.entries(logoMap)) {
    if (teamNameLower.includes(key)) {
      const url = resolveUrl(logoName);
      if (url) {
        console.log('Poster: Found logo:', logoName, 'for team:', teamName);
        return url;
      }
    }
  }

  console.log('Poster: No logo found for team:', teamName);
  return null;
};
