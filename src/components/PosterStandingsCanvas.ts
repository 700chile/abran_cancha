export type StandingsPosterRow = {
  pos: number;
  club: string;
  pj: number;
  dif: number;
  pts: number;
  rend: number; // percent 0..100
  var?: string; // 'SUBE' or 'BAJA' for arrows
};

export type StandingsOptions = {
  backgroundUrl: string; // object URL or remote URL
  title: string; // e.g., 'TABLA DE POSICIONES'
  subtitle: string; // e.g., 'PRIMERA DIVISIÓN 2025'
  credit?: string; // e.g., '@fotografo' shown bottom-right
  width?: number;
  height?: number;
  pixelRatio?: number;
  competitionId?: number; // for determining marker logic
  totalTeams?: number; // for determining relegation zone
};

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export async function renderStandingsPoster(rows: StandingsPosterRow[], opts: StandingsOptions): Promise<string> {
  console.log('[StandingsPoster] Starting render with rows:', rows.length, 'opts:', opts);
  console.log('[StandingsPoster] Rows data:', JSON.stringify(rows, null, 2));
  console.log('[StandingsPoster] First row details:', rows[0] ? JSON.stringify(rows[0], null, 2) : 'No rows');
  
  const width = opts.width ?? 1200; // Changed from 1080 to 1200
  const height = opts.height ?? 1500; // Changed from 1350 to 1500 for exact 4:5 ratio
  const pixelRatio = opts.pixelRatio ?? 2;
  
  console.log('[StandingsPoster] Canvas dimensions:', width, 'x', height, 'pixelRatio:', pixelRatio);
  
  const canvas = document.createElement('canvas');
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2D context');
  ctx.scale(pixelRatio, pixelRatio);

  console.log('[StandingsPoster] Canvas context created and scaled');

  // Ensure custom font (Ruda) is loaded if available before drawing text
  if ((document as any).fonts && typeof (document as any).fonts.load === 'function') {
    try {
      const before = (document as any).fonts.check('16px Ruda');
      if (!before) console.warn('[Poster][fonts] Ruda not yet available before load(). Ensure it is imported via @fontsource or a <link>.');
    } catch {}
    try {
      await Promise.all([
        (document as any).fonts.load('800 72px Ruda'),
        (document as any).fonts.load('700 44px Ruda'),
        (document as any).fonts.load('800 28px Ruda'),
        (document as any).fonts.load('800 30px Ruda'),
        (document as any).fonts.load('700 26px Ruda'),
        (document as any).fonts.load('600 18px Ruda'),
      ]);
      await (document as any).fonts.ready;
      try {
        const after = (document as any).fonts.check('16px Ruda');
        console.log('[Poster][fonts] Ruda available after load():', after);
        if (!after) console.warn('[Poster][fonts] Ruda still not available. The font files may not be included or blocked by CSP/network.');
      } catch {}
    } catch (err) {
      console.warn('[Poster][fonts] Error while loading Ruda via document.fonts.load:', err);
    }
  }
  
  // List some common fonts to see what's available
  console.log('Testing common fonts:');
  ['Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana'].forEach(font => {
    ctx.font = `48px ${font}`;
    console.log(`${font}:`, ctx.measureText('TEST').width);
  });

  // Background
  try {
    console.log('[StandingsPoster] Loading background image:', opts.backgroundUrl);
    const bg = await loadImage(opts.backgroundUrl);
    console.log('[StandingsPoster] Background loaded, dimensions:', bg.naturalWidth, 'x', bg.naturalHeight);
    
    // Cover behavior
    const r = Math.max(width / bg.naturalWidth, height / bg.naturalHeight);
    const bw = bg.naturalWidth * r;
    const bh = bg.naturalHeight * r;
    const bx = (width - bw) / 2;
    const by = (height - bh) / 2;
    console.log('[StandingsPoster] Drawing background at:', bx, by, 'size:', bw, 'x', bh);
    ctx.drawImage(bg, bx, by, bw, bh);
  } catch (error) {
    console.error('[StandingsPoster] Background failed to load:', error);
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
  ctx.strokeText(opts.title.toUpperCase(), width / 2, 370); // Moved up 20px
  ctx.fillStyle = '#ffffff';
  ctx.fillText(opts.title.toUpperCase(), width / 2, 370);
  
  // Subtitle with outline
  ctx.font = '700 44px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
  ctx.strokeText(opts.subtitle.toUpperCase(), width / 2, 430); // Moved up 20px
  ctx.fillText(opts.subtitle.toUpperCase(), width / 2, 430);
  
  ctx.textAlign = 'left'; // Reset to left for rest of content

  // Revista logo (circular) between header and table
  try {
    console.log('[StandingsPoster] Loading Revista logo');
    const revistaLogo = new Image();
    revistaLogo.src = '/revista-logo.jpg'; // Will need to be served from public folder
    await new Promise<void>((resolve, reject) => {
      revistaLogo.onload = () => {
        console.log('[StandingsPoster] Revista logo loaded successfully');
        resolve();
      };
      revistaLogo.onerror = (error) => {
        console.error('[StandingsPoster] Revista logo failed to load:', error);
        reject(error);
      };
    });
    
    // Draw circular logo
    const logoSize = 90;
    const logoX = (width - logoSize) / 2; // Centered horizontally
    const logoY = 480; // Moved up 20px (was 500)
    
    console.log('[StandingsPoster] Drawing Revista logo at:', logoX, logoY, 'size:', logoSize);
    
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
    console.error('[StandingsPoster] Revista logo error:', error);
    // Continue without logo if it fails
  }

  // Table header line
  const tableX = 120; // Moved 20px more to the right (total 40px from original)
  const tableY = 550; // Moved up 20px (was 570)
  const rowH = 57; // Increased by 10% from 52 to 57

  // Column positions
  const colPos = {
    num: tableX,
    club: tableX + 110, // Increased by 10% from 100
    pj: tableX + 605, // Increased by 10% from 550
    dif: tableX + 704, // Increased by 10% from 640
    ptsBgX: tableX + 781, // Increased by 10% from 710
    pts: tableX + 803, // Increased by 10% from 730
    rend: tableX + 902, // Increased by 10% from 820
  } as const;

  // Header labels
  ctx.font = '800 28px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('#', colPos.num, tableY);
  ctx.fillText('CLUB', colPos.club, tableY);
  ctx.fillText('PJ', colPos.pj, tableY);
  ctx.fillText('DIF', colPos.dif, tableY);
  
  // PTS header with pink background and outline
  ctx.fillStyle = '#FFB3D9'; // Lighter pink
  ctx.fillRect(colPos.ptsBgX - 10, tableY - 6, 90, 44);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('PTS', colPos.pts, tableY);
  
  ctx.fillText('REND', colPos.rend, tableY);

  // Accent line
  ctx.strokeStyle = '#00D084'; // Exact green from reference
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(tableX, tableY + 34);
  ctx.lineTo(width - 80, tableY + 34);
  ctx.stroke();

  // Rows
  const maxRows = Math.min(rows.length, 14);
  console.log('[StandingsPoster] Processing', maxRows, 'of', rows.length, 'rows');
  
  for (let i = 0; i < maxRows; i++) {
    const r = rows[i];
    const y = tableY + 50 + i * rowH;
    
    console.log(`[StandingsPoster] Drawing row ${i}: pos=${r.pos}, club=${r.club}, pts=${r.pts}`);

    // PTS pill background (continuous with header)
    ctx.fillStyle = '#FFB3D9'; // Lighter pink
    ctx.fillRect(colPos.ptsBgX - 10, y - 6, 90, 44);

    // Position markers (left side bars)
    const competitionId = opts.competitionId ?? 2;
    const totalTeams = opts.totalTeams ?? rows.length;
    
    if (competitionId === 33) {
      // World Cup qualifiers: Top 2 green, 3-4 blue
      if (r.pos <= 2) {
        ctx.fillStyle = '#00D084';
        ctx.fillRect(tableX - 20, y - 6, 6, 44);
      } else if (r.pos === 3 || r.pos === 4) {
        ctx.fillStyle = '#2196F3';
        ctx.fillRect(tableX - 20, y - 6, 6, 44);
      }
    } else if (competitionId <= 2) {
      // National competition: Top 8 green, bottom 2 red
      if (r.pos <= 8) {
        ctx.fillStyle = '#00D084';
        ctx.fillRect(tableX - 20, y - 6, 6, 44);
      } else if (r.pos >= totalTeams - 1) {
        ctx.fillStyle = '#FF5C5C';
        ctx.fillRect(tableX - 20, y - 6, 6, 44);
      }
    } else if (competitionId === 32) {
      // Other competition: Top 2 green, 3rd blue
      if (r.pos <= 2) {
        ctx.fillStyle = '#00D084';
        ctx.fillRect(tableX - 20, y - 6, 6, 44);
      } else if (r.pos === 3) {
        ctx.fillStyle = '#2196F3';
        ctx.fillRect(tableX - 20, y - 6, 6, 44);
      }
    }

    // Position number
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 40px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto'; // Increased from 36px
    ctx.fillText(String(r.pos), colPos.num, y);

    // VAR arrow (up/down triangle)
    if (r.var === 'SUBE') {
      ctx.fillStyle = '#00D084';
      ctx.beginPath();
      ctx.moveTo(colPos.club - 25, y + 4);
      ctx.lineTo(colPos.club - 8, y + 28);
      ctx.lineTo(colPos.club - 42, y + 28);
      ctx.closePath();
      ctx.fill();
    } else if (r.var === 'BAJA') {
      ctx.fillStyle = '#FF5C5C';
      ctx.beginPath();
      ctx.moveTo(colPos.club - 25, y + 24); // Moved up by 12px (about 1/3 of triangle height)
      ctx.lineTo(colPos.club - 8, y);
      ctx.lineTo(colPos.club - 42, y);
      ctx.closePath();
      ctx.fill();
    }

    // Reset fillStyle to white for club name
    ctx.fillStyle = '#ffffff';

    // Club name
    ctx.font = '800 42px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto'; // Increased from 38px
    ctx.fillText(r.club.toUpperCase(), colPos.club, y);

    // PJ, DIF
    ctx.font = '700 38px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto'; // Increased from 34px
    ctx.fillText(String(r.pj), colPos.pj, y);
    ctx.fillText(String(r.dif), colPos.dif, y);

    // PTS with outline
    ctx.font = '700 38px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto'; // Increased from 34px
    ctx.strokeStyle = '#888888';
    ctx.lineWidth = 2;
    ctx.strokeText(String(r.pts), colPos.pts + 4, y);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(r.pts), colPos.pts + 4, y);

    // REND (percentage)
    ctx.font = '700 38px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto'; // Increased from 34px
    ctx.fillText(`${r.rend}%`, colPos.rend, y);
  }

  // Legend (two lines)
  ctx.font = '600 22px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
  ctx.fillStyle = '#ffffff';
  const legendY = height - 90;
  const legendX = tableX + 200; // Moved 50px more to the right (was 150)
  const competitionId = opts.competitionId ?? 2;
  
  // Extract edition number from subtitle for relegation text
  const editionMatch = opts.subtitle.match(/(\d{4})/);
  const currentEdition = editionMatch ? parseInt(editionMatch[1]) : 2026;
  const nextEdition = currentEdition + 1;
  
  if (competitionId === 33) {
    // World Cup qualifiers legend - one line each, properly separated
    ctx.fillStyle = '#00D084';
    ctx.fillRect(legendX, legendY - 10, 6, 24);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('TOP 2 (CLASIFICAN AL MUNDIAL)', legendX + 20, legendY);
    
    ctx.fillStyle = '#2196F3';
    ctx.fillRect(legendX, legendY + 25, 6, 24); // Same X coordinate
    ctx.fillStyle = '#ffffff';
    ctx.fillText('3RO Y 4TO (REPECHAJE)', legendX + 20, legendY + 35); // Same X coordinate
  } else if (competitionId <= 2) {
    // National competition legend - one line each, properly separated
    ctx.fillStyle = '#00D084';
    ctx.fillRect(legendX, legendY - 10, 6, 24);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('CLASIFICA A PLAY-OFFS', legendX + 20, legendY);
    
    ctx.fillStyle = '#FF5C5C';
    ctx.fillRect(legendX, legendY + 25, 6, 24); // Same X coordinate
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`DESCIENDE AL ASCENSO ${nextEdition}`, legendX + 20, legendY + 35); // Same X coordinate
  } else if (competitionId === 32) {
    // Other competition legend - one line each, properly separated
    ctx.fillStyle = '#00D084';
    ctx.fillRect(legendX, legendY - 10, 6, 24);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('TOP 2 (SEMIFINALES)', legendX + 20, legendY);
    
    ctx.fillStyle = '#2196F3';
    ctx.fillRect(legendX, legendY + 25, 6, 24); // Same X coordinate
    ctx.fillStyle = '#ffffff';
    ctx.fillText('3ER (5TO LUGAR)', legendX + 20, legendY + 35); // Same X coordinate
  }

  // Credit (bottom-right rotated)
  if (opts.credit) {
    console.log('[StandingsPoster] Drawing credit:', opts.credit);
    ctx.save();
    ctx.translate(width - 20, height - 20);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '600 18px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
    const creditText = opts.credit.toUpperCase();
    const creditWithCopyright = creditText.startsWith('©') ? creditText : `© ${creditText}`;
    ctx.fillText(creditWithCopyright, 0, 0);
    ctx.restore();
  }

  console.log('[StandingsPoster] About to return canvas data URL');
  const dataUrl = canvas.toDataURL('image/png');
  console.log('[StandingsPoster] Canvas data URL length:', dataUrl.length);
  return dataUrl;
}
