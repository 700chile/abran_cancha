export interface BroadcasterResolution {
  logoUrl: string | null;
  remainingText: string;
  logoHeight?: number;
}

export const BROADCASTER_LOGOS: Record<string, string> = {
  'MEGA': '/logos/broadcaster/mega.png',
  'MEGA 2': '/logos/broadcaster/mega2.png',
  'PASSLINE': '/logos/broadcaster/passline.png',
  'TICKETMASTER': '/logos/broadcaster/ticketmaster.png',
  'YOUTUBE': '/logos/broadcaster/youtube.png',
};

/**
 * Resolves a broadcaster name to a logo URL and any remaining text.
 * @param transmision The transmission text (e.g. "MEGA", "YOUTUBE SANTIAGO WANDERERS")
 */
export function resolveBroadcaster(transmision: string): BroadcasterResolution {
  if (!transmision) {
    return { logoUrl: null, remainingText: '' };
  }

  // Normalize: trim, uppercase, and collapse multiple spaces to a single space
  const cleanText = transmision.trim().replace(/\s+/g, ' ').toUpperCase();

  // 1. Check exact matches first
  if (cleanText === 'MEGA') {
    return { logoUrl: BROADCASTER_LOGOS['MEGA'], remainingText: '', logoHeight: 48 };
  }
  if (cleanText === 'MEGA 2') {
    return { logoUrl: BROADCASTER_LOGOS['MEGA 2'], remainingText: '', logoHeight: 48 };
  }
  if (cleanText === 'PASSLINE') {
    return { logoUrl: BROADCASTER_LOGOS['PASSLINE'], remainingText: '' };
  }
  if (cleanText === 'TICKETMASTER') {
    return { logoUrl: BROADCASTER_LOGOS['TICKETMASTER'], remainingText: '' };
  }

  // 2. Check prefix matches (starts with "YOUTUBE")
  if (cleanText.startsWith('YOUTUBE')) {
    // Extract the remaining text after "YOUTUBE" (length 7)
    const remaining = transmision.trim().substring(7).trim();
    return {
      logoUrl: BROADCASTER_LOGOS['YOUTUBE'],
      remainingText: remaining,
      logoHeight: 48,
    };
  }

  // 3. Fallback: No logo mapping, keep the original text
  return { logoUrl: null, remainingText: transmision };
}
