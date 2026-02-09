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
}

export const renderMatchImage = (
  matches: PosterMatch[],
  opts: MatchPosterOptions
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const width = 1200;
    const height = 1500;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    // Load background image first
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
      
      // Continue with rest of drawing
      drawPosterContent();
    };
    bg.onerror = () => {
      console.log('Background image failed to load, using black background');
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);
      drawPosterContent();
    };
    bg.src = opts.backgroundUrl || '';

    function drawPosterContent() {
      if (!ctx) return;
      
      // Gradient dark overlay for better text readability (0% at top, 75% at bottom)
      const grad = ctx.createLinearGradient(0, 0, 0, height); // Start gradient from top
      grad.addColorStop(0, 'rgba(0,0,0,0)'); // No darkening at top
      grad.addColorStop(0.6, 'rgba(0,0,0,0.3)'); // Start darkening at 60%
      grad.addColorStop(1, 'rgba(0,0,0,0.75)'); // 75% dark at bottom
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Header
      ctx.textBaseline = 'top';
      ctx.textAlign = 'center';
      
      // Matchday title (main title) with outline - larger font
      ctx.font = '800 72px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
      ctx.strokeStyle = '#888888';
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      ctx.strokeText(opts.roundTitle.toUpperCase(), width / 2, 850); // Moved higher
      ctx.fillStyle = '#ffffff';
      ctx.fillText(opts.roundTitle.toUpperCase(), width / 2, 850);

      // Competition subtitle with outline - smaller font
      ctx.font = '700 50px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
      ctx.strokeText(opts.competitionTitle.toUpperCase(), width / 2, 930); // Moved lower
      ctx.fillStyle = '#ffffff';
      ctx.fillText(opts.competitionTitle.toUpperCase(), width / 2, 930);

      ctx.textAlign = 'left'; // Reset to left for rest of content

      // Revista logo (circular) positioned correctly
      const revistaLogo = new Image();
      revistaLogo.src = '/revista-logo.jpg';
      revistaLogo.onload = () => {
        if (!ctx) return;
        
        // Draw circular logo
        const logoSize = 100;
        const logoX = (width - logoSize) / 2; // Centered horizontally
        const logoY = 850; // Positioned above titles
        
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
        
        // Continue with team logos
        drawTeamLogos();
      };
      revistaLogo.onerror = () => {
        console.log('Revista logo failed to load');
        drawTeamLogos();
      };
    }

    function drawTeamLogos() {
      if (!ctx) return;
      
      // Table setup - positioned much lower
      const tableX = 120;
      const tableY = 1050; // Moved much lower
      const rowH = 120; // Height for each match

      // Draw matches
      matches.forEach((match, index) => {
        const y = tableY + (index * rowH);
        
        // Load and draw team logos
        let logosLoaded = 0;
        const totalLogos = 2;
        
        function checkAllLogosLoaded() {
          if (!ctx) return;
          
          if (logosLoaded >= totalLogos) {
            // Goals display instead of VS
            ctx.font = '800 72px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            const localGoals = match.localGoals !== undefined ? match.localGoals.toString() : '0';
            const visitGoals = match.visitGoals !== undefined ? match.visitGoals.toString() : '0';
            ctx.fillText(`${localGoals} - ${visitGoals}`, width / 2, y + 60);
            
            // Credit (bottom-right rotated)
            if (opts.credit) {
              ctx.save();
              ctx.translate(width - 10, height - 10); // Start at bottom right corner
              ctx.rotate(-Math.PI / 2);
              ctx.fillStyle = 'rgba(255,255,255,0.9)';
              ctx.font = '600 18px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
              const creditText = opts.credit.toUpperCase();
              ctx.fillText(creditText, 0, 0);
              ctx.restore();
            }
            
            // Return the data URL
            resolve(canvas.toDataURL('image/png'));
          }
        }
        
        // Local team logo
        if (opts.getLogoUrl) {
          const localLogo = new Image();
          localLogo.crossOrigin = 'anonymous';
          const localLogoUrl = opts.getLogoUrl(match.local);
          if (localLogoUrl) {
            localLogo.onload = () => {
              if (!ctx) return;
              ctx.drawImage(localLogo, tableX, y + 20, 80, 80);
              logosLoaded++;
              checkAllLogosLoaded();
            };
            localLogo.onerror = () => {
              console.log('Local team logo not found for:', match.local);
              logosLoaded++;
              checkAllLogosLoaded();
            };
            localLogo.src = localLogoUrl;
          } else {
            logosLoaded++;
            checkAllLogosLoaded();
          }
        } else {
          logosLoaded++;
          checkAllLogosLoaded();
        }
        
        // Visit team logo
        if (opts.getLogoUrl) {
          const visitLogo = new Image();
          visitLogo.crossOrigin = 'anonymous';
          const visitLogoUrl = opts.getLogoUrl(match.visita);
          if (visitLogoUrl) {
            visitLogo.onload = () => {
              if (!ctx) return;
              ctx.drawImage(visitLogo, width - 200, y + 20, 80, 80);
              logosLoaded++;
              checkAllLogosLoaded();
            };
            visitLogo.onerror = () => {
              console.log('Visit team logo not found for:', match.visita);
              logosLoaded++;
              checkAllLogosLoaded();
            };
            visitLogo.src = visitLogoUrl;
          } else {
            logosLoaded++;
            checkAllLogosLoaded();
          }
        } else {
          logosLoaded++;
          checkAllLogosLoaded();
        }
      });
    }
  });
};
