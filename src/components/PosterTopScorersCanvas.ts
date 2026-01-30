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
  const height = 1500; // Changed from 1600 to 1500 for 4:5 ratio
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
  ctx.strokeText('GOLEADORAS', width / 2, 490); // Changed to GOLEADORAS
  ctx.fillStyle = '#ffffff';
  ctx.fillText('GOLEADORAS', width / 2, 490);
  
  // Subtitle with outline
  ctx.font = '700 44px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
  ctx.strokeText(opts.subtitle.toUpperCase(), width / 2, 580); // Moved further down (was 550)
  ctx.fillText(opts.subtitle.toUpperCase(), width / 2, 580);
  
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
    const logoSize = 100; // Increased from 80
    const logoX = (width - logoSize) / 2; // Centered horizontally
    const logoY = 630; // Moved down 20px (was 610)
    
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

  // Table header line - center the table in the image
  const tableWidth = 750; // Approximate total width of the table
  const tableX = (width - tableWidth) / 2; // Center the table horizontally
  const tableY = 720; // Moved down 50px (was 670)
  const rowH = 60; // Reduced from 70 - lines closer together

  // Column positions - adjusted widths
  const colPos = {
    pos: tableX,
    name: tableX + 60, // Same as before
    team: tableX + 550, // Moved further right (was 450) - player names column wider
    goals: tableX + 700, // Moved left (was 650) - last two columns narrower
  } as const;

  // Table headers
  ctx.font = '700 28px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('POS', colPos.pos, tableY);
  ctx.fillText('JUGADORA', colPos.name, tableY);
  
  // Center CLUB title
  const teamColumnWidth = 200; // Same as logo column width
  const teamColumnCenter = colPos.team + (teamColumnWidth / 2);
  const teamTitleWidth = ctx.measureText('CLUB').width;
  const teamTitleX = teamColumnCenter - (teamTitleWidth / 2);
  ctx.fillText('CLUB', teamTitleX, tableY);
  
  // Center GOLES title
  const goalsColumnWidth = 100; // Same as goals column width
  const goalsColumnCenter = colPos.goals + (goalsColumnWidth / 2);
  const goalsTitleWidth = ctx.measureText('GOLES').width;
  const goalsTitleX = goalsColumnCenter - (goalsTitleWidth / 2);
  ctx.fillText('GOLES', goalsTitleX, tableY);

  // Pink horizontal line beneath column titles - twice as wide
  ctx.strokeStyle = '#FFB3D9';
  ctx.lineWidth = 6; // Doubled from 3 to 6
  ctx.beginPath();
  ctx.moveTo(tableX, tableY + 40); // Start from left edge of POS column
  ctx.lineTo(colPos.goals + 100, tableY + 40); // End after GOLES column
  ctx.stroke();

  // Draw top scorers
  for (const [index, scorer] of topScorers.entries()) {
    const y = tableY + 50 + (index * rowH);
    
    // Position number - larger font
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 44px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto'; // Increased from 40px
    ctx.fillText(String(index + 1), colPos.pos, y);

    // Player name - larger font
    ctx.font = '800 46px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto'; // Increased from 42px
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
      
      // Draw team logo centered in column - larger size
      const logoSize = 75; // Increased from 50
      const logoColumnWidth = 200; // Approximate width of team column
      const logoColumnCenter = colPos.team + (logoColumnWidth / 2);
      const logoX = logoColumnCenter - (logoSize / 2); // Center the logo
      ctx.drawImage(teamLogo, logoX, y - 10, logoSize, logoSize);
    } catch (error) {
      console.log('Team logo not found for:', scorer.team_name);
      // Draw placeholder or skip
    }

    // Goals with orange background, centered in column
    const goalsText = String(scorer.goals);
    const goalsWidth = ctx.measureText(goalsText).width;
    const goalsColumnWidth = 100; // Approximate width of goals column
    const goalsColumnCenter = colPos.goals + (goalsColumnWidth / 2);
    const goalsX = goalsColumnCenter - (goalsWidth / 2); // Center the text
    
    // Orange background centered
    ctx.fillStyle = '#FF6B35'; // More reddish-orange color
    ctx.fillRect(goalsX - 10, y - 8, goalsWidth + 20, 48);
    
    // Goals text with outline, centered - larger font
    ctx.font = '700 38px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto'; // Increased from 34px
    ctx.strokeStyle = '#888888';
    ctx.lineWidth = 2;
    ctx.strokeText(goalsText, goalsX, y);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(goalsText, goalsX, y);
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
