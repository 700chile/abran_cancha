import { getTeamLogo } from '../utils/teamLogos';

interface TopScorer {
  player_name: string;
  team_name: string;
  goals: number;
  team_id?: string;
}

interface PosterOptions {
  backgroundUrl: string;
  title: string;
  subtitle: string;
  credit?: string;
}

export async function renderTopScorersPoster(
  topScorers: TopScorer[],
  opts: PosterOptions
): Promise<string> {
  const canvas = document.createElement('canvas');
  const width = 1200;
  const height = 1600;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d')!;
  
  // Background image
  try {
    const bg = new Image();
    bg.crossOrigin = 'anonymous';
    bg.src = opts.backgroundUrl;
    await new Promise((resolve, reject) => {
      bg.onload = resolve;
      bg.onerror = reject;
    });

    // Cover behavior
    const r = Math.max(width / bg.naturalWidth, height / bg.naturalHeight);
    const bw = bg.naturalWidth * r;
    const bh = bg.naturalHeight * r;
    const bx = (width - bw) / 2;
    const by = (height - bh) / 2;
    ctx.drawImage(bg, bx, by, bw, bh);
  } catch {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
  }

  // Gradient dark overlay for better text readability (0% at top, 50% at bottom)
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, 'rgba(0,0,0,0.1)');
  grad.addColorStop(1, 'rgba(0,0,0,0.3)');
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
  ctx.strokeText(opts.title.toUpperCase(), width / 2, 290);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(opts.title.toUpperCase(), width / 2, 290);
  
  // Subtitle with outline
  ctx.font = '700 44px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
  ctx.strokeText(opts.subtitle.toUpperCase(), width / 2, 350);
  ctx.fillText(opts.subtitle.toUpperCase(), width / 2, 350);
  
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
    const logoSize = 80;
    const logoX = (width - logoSize) / 2; // Centered horizontally
    const logoY = 410; // Between header and table
    
    // Save context state
    ctx.save();
    
    // Create circular clipping path
    ctx.beginPath();
    ctx.arc(logoX + logoSize/2, logoY + logoSize/2, logoSize/2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    
    // Draw image within circular clip
    ctx.drawImage(revistaLogo, logoX, logoY, logoSize, logoSize);
    
    // Restore context state
    ctx.restore();
    
    // Add subtle border around circle
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(logoX + logoSize/2, logoY + logoSize/2, logoSize/2, 0, Math.PI * 2);
    ctx.stroke();
    
  } catch (error) {
    console.log('Revista logo not found or failed to load:', error);
    // Continue without logo if it fails
  }

  // Table header line
  const tableX = 120;
  const tableY = 520;
  const rowH = 80; // Height for each row

  // Column positions
  const colPos = {
    pos: tableX,
    name: tableX + 80,
    team: tableX + 600,
    goals: tableX + 850,
  } as const;

  // Table headers
  ctx.font = '700 28px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('POS', colPos.pos, tableY);
  ctx.fillText('JUGADORA', colPos.name, tableY);
  ctx.fillText('EQUIPO', colPos.team, tableY);
  ctx.fillText('GOLES', colPos.goals, tableY);

  // Draw top scorers
  for (const [index, scorer] of topScorers.entries()) {
    const y = tableY + 50 + (index * rowH);
    
    // Position marker for top 3
    if (index < 3) {
      if (index === 0) {
        ctx.fillStyle = '#FFD700'; // Gold
        ctx.fillRect(tableX - 20, y - 6, 6, 44);
      } else if (index === 1) {
        ctx.fillStyle = '#C0C0C0'; // Silver
        ctx.fillRect(tableX - 20, y - 6, 6, 44);
      } else if (index === 2) {
        ctx.fillStyle = '#CD7F32'; // Bronze
        ctx.fillRect(tableX - 20, y - 6, 6, 44);
      }
    }

    // Position number
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 36px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillText(String(index + 1), colPos.pos, y);

    // Player name
    ctx.font = '800 38px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillText(scorer.player_name.toUpperCase(), colPos.name, y);

    // Team logo
    try {
      const teamLogo = new Image();
      teamLogo.crossOrigin = 'anonymous';
      const logoUrl = getTeamLogo(scorer.team_name);
      if (!logoUrl) {
        console.log('Team logo not found for:', scorer.team_name);
        continue;
      }
      teamLogo.src = logoUrl;
      
      await new Promise<void>((resolve, reject) => {
        teamLogo.onload = () => resolve();
        teamLogo.onerror = () => reject(new Error('Failed to load team logo'));
      });
      
      // Draw team logo
      const logoSize = 50;
      ctx.drawImage(teamLogo, colPos.team, y - 10, logoSize, logoSize);
    } catch (error) {
      console.log('Team logo not found for:', scorer.team_name);
      // Draw placeholder or skip
    }

    // Goals with pink background
    const goalsText = String(scorer.goals);
    const goalsWidth = ctx.measureText(goalsText).width;
    
    // Pink background
    ctx.fillStyle = '#FFB3D9';
    ctx.fillRect(colPos.goals - 10, y - 8, goalsWidth + 20, 48);
    
    // Goals text with outline
    ctx.font = '700 34px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
    ctx.strokeStyle = '#888888';
    ctx.lineWidth = 2;
    ctx.strokeText(goalsText, colPos.goals, y);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(goalsText, colPos.goals, y);
  }

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

  return canvas.toDataURL('image/jpeg', 0.9);
}
