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
      
      // Gradient dark overlay for better text readability (darker and starts higher)
      const grad = ctx.createLinearGradient(0, height * 0.2, 0, height);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.5, 'rgba(0,0,0,0.7)');
      grad.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      
      // Continue with rest of drawing
      drawPosterContent();
    };
    bg.onerror = () => {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);
      drawPosterContent();
    };
    bg.src = opts.backgroundUrl || '';

    function drawPosterContent() {
      if (!ctx) return;
      
      // Header
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left'; // Aligned to left
      
      // Matchday title (main title) - white text only
      ctx.font = '800 60px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(opts.roundTitle.toUpperCase(), 120, 900);

      // Competition subtitle - white text only
      ctx.font = '700 40px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(opts.competitionTitle.toUpperCase(), 120, 960);

      ctx.textAlign = 'left'; // Reset to left for rest of content

      // Revista logo (circular) positioned correctly
      const revistaLogo = new Image();
      revistaLogo.src = '/revista-logo.jpg';
      revistaLogo.onload = () => {
        if (!ctx) return;
        
        // Draw green horizontal line behind logo, aligned with titles
        ctx.strokeStyle = '#00D084'; // Exact green from standings poster
        ctx.lineWidth = 6; // Same width as standings poster
        ctx.beginPath();
        ctx.moveTo(120, 1050); // Moved down 50px
        ctx.lineTo(width - 120, 1050); // End line
        ctx.stroke();
        
        // Draw small vertical lines at the ends
        ctx.beginPath();
        ctx.moveTo(120, 1040); // Start vertical line 10px above
        ctx.lineTo(120, 1060); // End vertical line 10px below
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(width - 120, 1040); // Start vertical line 10px above
        ctx.lineTo(width - 120, 1060); // End vertical line 10px below
        ctx.stroke();
        
        // Draw circular logo
        const logoSize = 120; // Increased from 100 to 120
        const logoX = (width - logoSize) / 2; // Centered horizontally
        const logoY = 1000; // Moved down 50px
        
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
      const tableY = 1050; // Moved much lower
      const rowH = 120; // Height for each match

      let totalMatchesProcessed = 0;
      const totalMatches = matches.length;

      // Draw matches
      matches.forEach((match, index) => {
        const y = tableY + (index * rowH);
        
        // Load and draw team logos
        let logosLoaded = 0;
        const totalLogos = 2;
        
        function checkAllLogosLoaded() {
          if (!ctx) return;
          
          logosLoaded++;
          if (logosLoaded >= totalLogos) {
            // Goals display instead of VS - with outline
            ctx.font = '800 108px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto'; // Made 1.5x bigger
            ctx.strokeStyle = '#888888'; // Gray color
            ctx.lineWidth = 6; // Made thicker
            ctx.lineJoin = 'round';
            ctx.textAlign = 'center';
            const localGoals = match.localGoals !== undefined ? match.localGoals.toString() : '0';
            const visitGoals = match.visitGoals !== undefined ? match.visitGoals.toString() : '0';
            ctx.strokeText(`${localGoals} - ${visitGoals}`, width / 2, y + 60); // Outline first
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`${localGoals} - ${visitGoals}`, width / 2, y + 60); // Fill text
            
            totalMatchesProcessed++;
            
            // Check if all matches are processed
            if (totalMatchesProcessed >= totalMatches) {
              // Draw credits after all content is complete
              if (opts.credit) {
                ctx.save();
                ctx.fillStyle = 'rgba(255,255,255,0.9)';
                ctx.font = '600 24px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
                const creditText = opts.credit.toUpperCase();
                const creditWithCopyright = creditText.startsWith('©') ? creditText : `© ${creditText}`;
                ctx.textAlign = 'right';
                ctx.textBaseline = 'bottom';
                ctx.fillText(creditWithCopyright, width - 20, height - 20);
                ctx.restore();
              }
              
              // Return the data URL
              resolve(canvas.toDataURL('image/png'));
            }
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
              ctx.drawImage(localLogo, 300, y + 20, 160, 160); // Moved closer to center
              checkAllLogosLoaded();
            };
            localLogo.onerror = () => {
              console.log('Local team logo not found for:', match.local);
              checkAllLogosLoaded();
            };
            localLogo.src = localLogoUrl;
          } else {
            checkAllLogosLoaded();
          }
        } else {
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
              ctx.drawImage(visitLogo, width - 460, y + 20, 160, 160); // Moved closer to center
              checkAllLogosLoaded();
            };
            visitLogo.onerror = () => {
              console.log('Visit team logo not found for:', match.visita);
              checkAllLogosLoaded();
            };
            visitLogo.src = visitLogoUrl;
          } else {
            checkAllLogosLoaded();
          }
        } else {
          checkAllLogosLoaded();
        }
      });
    }
  });
};
