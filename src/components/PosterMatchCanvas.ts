import { getPosterLogo } from '../utils/posterLogos';

interface MatchPosterOptions {
  backgroundUrl?: string;
  competitionTitle: string;
  divisionTitle: string;
  roundTitle: string;
  pixelRatio?: number;
  getLogoUrl?: (name: string) => string;
  credit?: string;
}

interface PosterMatch {
  local: string;
  visita: string;
  estadio: string;
  programacion: string;
}

export const renderMatchImage = async (
  matches: PosterMatch[],
  opts: MatchPosterOptions
): Promise<string> => {
  const width = 1200;
  const height = 1500;
  const ratio = opts.pixelRatio || 2;
  
  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Scale context for high DPI
  ctx.scale(ratio, ratio);

  // Background image or fallback
  try {
    if (opts.backgroundUrl) {
      const bg = new Image();
      bg.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        bg.onload = resolve;
        bg.onerror = reject;
      });
      const r = Math.max(width / bg.naturalWidth, height / bg.naturalHeight);
      const bw = bg.naturalWidth * r;
      const bh = bg.naturalHeight * r;
      const bx = (width - bw) / 2;
      const by = (height - bh) / 2;
      ctx.drawImage(bg, bx, by, bw, bh);
    }
  } catch {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
  }

  // Gradient dark overlay for better text readability (0% at top, 75% at bottom)
  const grad = ctx.createLinearGradient(0, 300, 0, height); // Start gradient from 300px down
  grad.addColorStop(0, 'rgba(0,0,0,0)'); // No darkening at 300px mark
  grad.addColorStop(1, 'rgba(0,0,0,0.75)'); // 75% dark at bottom
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Header
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';
  
  // Title with outline
  ctx.font = '800 72px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
  ctx.strokeStyle = '#888888';
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.strokeText(opts.competitionTitle.toUpperCase(), width / 2, 100);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(opts.competitionTitle.toUpperCase(), width / 2, 100);
  
  // Subtitle with outline
  ctx.font = '700 44px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
  ctx.strokeText(opts.divisionTitle.toUpperCase(), width / 2, 180);
  ctx.fillText(opts.divisionTitle.toUpperCase(), width / 2, 180);

  // Round title with outline
  ctx.font = '700 50px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
  ctx.strokeText(opts.roundTitle.toUpperCase(), width / 2, 250);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(opts.roundTitle.toUpperCase(), width / 2, 250);

  ctx.textAlign = 'left'; // Reset to left for rest of content

  // Revista logo (circular) between header and table
  try {
    const revistaLogo = new Image();
    revistaLogo.src = '/revista-logo.jpg';
    await new Promise((resolve, reject) => {
      revistaLogo.onload = resolve;
      revistaLogo.onerror = reject;
    });
    
    // Draw circular logo
    const logoSize = 100;
    const logoX = (width - logoSize) / 2; // Centered horizontally
    const logoY = 320;
    
    // Save context state
    ctx.save();
    
    // Create circular clipping path
    ctx.beginPath();
    ctx.arc(logoX + logoSize/2, logoY + logoSize/2, logoSize/2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    
    // Draw logo
    ctx.drawImage(revistaLogo, logoX, logoY, logoSize, logoSize);
    
    // Restore context and draw circle outline
    ctx.restore();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(logoX + logoSize/2, logoY + logoSize/2, logoSize/2, 0, Math.PI * 2);
    ctx.stroke();
    
  } catch (error) {
    console.log('Revista logo not found or failed to load:', error);
    // Continue without logo if it fails
  }

  // Table setup
  const tableX = 120;
  const tableY = 450;
  const rowH = 120; // Height for each match

  // Draw matches
  matches.forEach((match, index) => {
    const y = tableY + (index * rowH);
    
    // Match background
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; // Light yellow background
    ctx.fillRect(tableX - 20, y - 10, width - 240, rowH - 20);
    
    // Local team info
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 36px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillText(match.local.toUpperCase(), tableX, y + 20);
    
    // Local team logo
    try {
      const localLogo = new Image();
      localLogo.crossOrigin = 'anonymous';
      const localLogoUrl = opts.getLogoUrl ? opts.getLogoUrl(match.local) : null;
      if (localLogoUrl) {
        localLogo.src = localLogoUrl;
        await new Promise<void>((resolve, reject) => {
          localLogo.onload = () => resolve();
          localLogo.onerror = () => reject(new Error('Failed to load local team logo'));
        });
        ctx.drawImage(localLogo, tableX, y + 60, 80, 80);
      }
    } catch (error) {
      console.log('Local team logo not found for:', match.local);
    }
    
    // VS text
    ctx.font = '800 48px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillStyle = '#888888';
    ctx.fillText('VS', width / 2, y + 80);
    
    // Visit team info
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 36px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillText(match.visita.toUpperCase(), width - 280, y + 20);
    
    // Visit team logo
    try {
      const visitLogo = new Image();
      visitLogo.crossOrigin = 'anonymous';
      const visitLogoUrl = opts.getLogoUrl ? opts.getLogoUrl(match.visita) : null;
      if (visitLogoUrl) {
        visitLogo.src = visitLogoUrl;
        await new Promise<void>((resolve, reject) => {
          visitLogo.onload = () => resolve();
          visitLogo.onerror = () => reject(new Error('Failed to load visit team logo'));
        });
        ctx.drawImage(visitLogo, width - 200, y + 60, 80, 80);
      }
    } catch (error) {
      console.log('Visit team logo not found for:', match.visita);
    }
    
    // Match details
    ctx.font = '600 24px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillStyle = '#cccccc';
    ctx.fillText(match.estadio.toUpperCase(), tableX, y + 90);
    ctx.fillText(match.programacion.toUpperCase(), width - 280, y + 90);
  });

  // Credit (bottom-right rotated)
  if (opts.credit) {
    ctx.save();
    ctx.translate(width - 20, height - 20);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '600 18px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
    const creditText = opts.credit.toUpperCase();
    ctx.fillText(creditText, 0, 0);
    ctx.restore();
  }

  // Return data URL
  return canvas.toDataURL('image/png');
};
