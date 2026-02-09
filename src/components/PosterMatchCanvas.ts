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
  localGoals?: number;
  visita: string;
  visitGoals?: number;
  estadio: string;
  programacion: string;
}

export const renderMatchImage = (
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
  if (opts.backgroundUrl) {
    const bg = new Image();
    bg.crossOrigin = 'anonymous';
    bg.onload = () => {
      // Draw background
      const r = Math.max(width / bg.naturalWidth, height / bg.naturalHeight);
      const bw = bg.naturalWidth * r;
      const bh = bg.naturalHeight * r;
      const bx = (width - bw) / 2;
      const by = (height - bh) / 2;
      ctx.drawImage(bg, bx, by, bw, bh);
    };
    bg.onerror = () => {
      console.log('Background image failed to load');
    };
    bg.src = opts.backgroundUrl;
  } else {
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
  ctx.strokeText(opts.competitionTitle.toUpperCase(), width / 2, 300); // Moved down from 100
  ctx.fillStyle = '#ffffff';
  ctx.fillText(opts.competitionTitle.toUpperCase(), width / 2, 300);
  
  // Subtitle with outline
  ctx.font = '700 44px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
  ctx.strokeText(opts.divisionTitle.toUpperCase(), width / 2, 380); // Moved down from 180
  ctx.fillText(opts.divisionTitle.toUpperCase(), width / 2, 380);

  // Round title with outline
  ctx.font = '700 50px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
  ctx.strokeText(opts.roundTitle.toUpperCase(), width / 2, 450); // Moved down from 250
  ctx.fillStyle = '#ffffff';
  ctx.fillText(opts.roundTitle.toUpperCase(), width / 2, 450);

  ctx.textAlign = 'left'; // Reset to left for rest of content

  // Revista logo (circular) between header and table
  try {
    const revistaLogo = new Image();
    revistaLogo.src = '/revista-logo.jpg';
    revistaLogo.onload = () => {
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
    };
    revistaLogo.onerror = () => {
      console.log('Revista logo not found or failed to load:', Error);
      // Continue without logo if it fails
    };
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
    
    // Local team logo
    if (opts.getLogoUrl) {
      const localLogo = new Image();
      localLogo.crossOrigin = 'anonymous';
      const localLogoUrl = opts.getLogoUrl(match.local);
      if (localLogoUrl) {
        localLogo.onload = () => {
          ctx.drawImage(localLogo, tableX, y + 60, 80, 80);
        };
        localLogo.onerror = () => {
          console.log('Local team logo not found for:', match.local);
        };
        localLogo.src = localLogoUrl;
      }
    } else {
      console.log('Local team logo not found for:', match.local);
    }
    
    // Goals display instead of VS
    ctx.font = '800 72px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    const localGoals = match.localGoals !== undefined ? match.localGoals.toString() : '0';
    const visitGoals = match.visitGoals !== undefined ? match.visitGoals.toString() : '0';
    ctx.fillText(`${localGoals} - ${visitGoals}`, width / 2, y + 100);
    
    // Visit team logo
    if (opts.getLogoUrl) {
      const visitLogo = new Image();
      visitLogo.crossOrigin = 'anonymous';
      const visitLogoUrl = opts.getLogoUrl(match.visita);
      if (visitLogoUrl) {
        visitLogo.onload = () => {
          ctx.drawImage(visitLogo, width - 200, y + 60, 80, 80);
        };
        visitLogo.onerror = () => {
          console.log('Visit team logo not found for:', match.visita);
        };
        visitLogo.src = visitLogoUrl;
      }
    } else {
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
  return new Promise<string>((resolve) => {
    resolve(canvas.toDataURL('image/png'));
  });
};
