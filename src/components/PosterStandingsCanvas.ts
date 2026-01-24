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
  const width = opts.width ?? 1080;
  const height = opts.height ?? 1350;
  const pixelRatio = opts.pixelRatio ?? 2;
  const canvas = document.createElement('canvas');
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2D context');
  ctx.scale(pixelRatio, pixelRatio);

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
    const bg = await loadImage(opts.backgroundUrl);
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

  // Dark overlay for readability
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, 'rgba(0,0,0,0.35)');
  grad.addColorStop(0.4, 'rgba(0,0,0,0.55)');
  grad.addColorStop(1, 'rgba(0,0,0,0.65)');
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
  ctx.strokeText(opts.title.toUpperCase(), width / 2, 90);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(opts.title.toUpperCase(), width / 2, 90);
  
  // Subtitle with outline
  ctx.font = '700 44px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
  ctx.strokeText(opts.subtitle.toUpperCase(), width / 2, 170);
  ctx.fillText(opts.subtitle.toUpperCase(), width / 2, 170);
  
  ctx.textAlign = 'left'; // Reset to left for rest of content

  // Table header line
  const tableX = 80;
  const tableY = 250;
  const rowH = 62; // Reduced from 72 to bring rows closer

  // Column positions
  const colPos = {
    num: tableX,
    club: tableX + 100, // Increased spacing for arrows
    pj: tableX + 550, // Adjusted spacing
    dif: tableX + 640, // Adjusted spacing
    ptsBgX: tableX + 710, // Adjusted spacing
    pts: tableX + 730, // Adjusted spacing
    rend: tableX + 820, // Adjusted spacing
  } as const;

  // Header labels
  ctx.font = '800 28px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('#', colPos.num, tableY);
  ctx.fillText('CLUB', colPos.club, tableY);
  ctx.fillText('PJ', colPos.pj, tableY);
  ctx.fillText('DIF', colPos.dif, tableY);
  
  // PTS header with pink background and outline
  ctx.fillStyle = '#FF4081';
  ctx.fillRect(colPos.ptsBgX - 10, tableY - 6, 90, 44);
  ctx.strokeStyle = '#888888';
  ctx.lineWidth = 2;
  ctx.strokeRect(colPos.ptsBgX - 10, tableY - 6, 90, 44);
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
  for (let i = 0; i < maxRows; i++) {
    const r = rows[i];
    const y = tableY + 50 + i * rowH;

    // PTS pill background (continuous with header)
    ctx.fillStyle = '#FF4081';
    ctx.fillRect(colPos.ptsBgX - 10, y - 6, 90, 44);
    ctx.strokeStyle = '#888888';
    ctx.lineWidth = 2;
    ctx.strokeRect(colPos.ptsBgX - 10, y - 6, 90, 44);

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
    ctx.font = '800 32px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
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
      ctx.moveTo(colPos.club - 25, y + 36);
      ctx.lineTo(colPos.club - 8, y + 12);
      ctx.lineTo(colPos.club - 42, y + 12);
      ctx.closePath();
      ctx.fill();
    }

    // Reset fillStyle to white for club name
    ctx.fillStyle = '#ffffff';

    // Club name
    ctx.font = '800 34px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillText(r.club.toUpperCase(), colPos.club, y);

    // PJ, DIF
    ctx.font = '700 30px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillText(String(r.pj), colPos.pj, y);
    ctx.fillText(String(r.dif), colPos.dif, y);

    // PTS with outline
    ctx.font = '700 30px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
    ctx.strokeStyle = '#888888';
    ctx.lineWidth = 2;
    ctx.strokeText(String(r.pts), colPos.pts + 4, y);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(r.pts), colPos.pts + 4, y);

    // REND (percentage)
    ctx.font = '700 30px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillText(`${r.rend}%`, colPos.rend, y);
  }

  // Legend (two lines)
  ctx.font = '600 22px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
  ctx.fillStyle = '#ffffff';
  const legendY = height - 90;
  const competitionId = opts.competitionId ?? 2;
  
  if (competitionId === 33) {
    // World Cup qualifiers legend - two lines
    ctx.fillStyle = '#00D084';
    ctx.fillRect(tableX, legendY - 10, 6, 24);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('TOP 2', tableX + 20, legendY);
    ctx.fillText('(CLASIFICAN AL MUNDIAL)', tableX + 20, legendY + 25);
    
    ctx.fillStyle = '#2196F3';
    ctx.fillRect(tableX + 380, legendY - 10, 6, 24);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('3RO Y 4TO', tableX + 400, legendY);
    ctx.fillText('(REPECHAJE)', tableX + 400, legendY + 25);
  } else if (competitionId <= 2) {
    // National competition legend - two lines
    ctx.fillStyle = '#00D084';
    ctx.fillRect(tableX, legendY - 10, 6, 24);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('CLASIFICA A', tableX + 20, legendY);
    ctx.fillText('PLAY-OFFS', tableX + 20, legendY + 25);
    
    ctx.fillStyle = '#FF5C5C';
    ctx.fillRect(tableX + 220, legendY - 10, 6, 24);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('DESCIENDE AL', tableX + 240, legendY);
    ctx.fillText('ASCENSO 2026', tableX + 240, legendY + 25);
  } else if (competitionId === 32) {
    // Other competition legend - two lines
    ctx.fillStyle = '#00D084';
    ctx.fillRect(tableX, legendY - 10, 6, 24);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('TOP 2', tableX + 20, legendY);
    ctx.fillText('(SEMIFINALES)', tableX + 20, legendY + 25);
    
    ctx.fillStyle = '#2196F3';
    ctx.fillRect(tableX + 280, legendY - 10, 6, 24);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('3ER', tableX + 300, legendY);
    ctx.fillText('(5TO LUGAR)', tableX + 300, legendY + 25);
  }

  // Credit (bottom-right rotated)
  if (opts.credit) {
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

  return canvas.toDataURL('image/png');
}
