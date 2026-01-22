export type StandingsPosterRow = {
  pos: number;
  club: string;
  pj: number;
  dif: number;
  pts: number;
  rend: number; // percent 0..100
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
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 72px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
  ctx.fillText(opts.title.toUpperCase(), 100, 90);
  ctx.font = '700 44px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
  ctx.fillText(opts.subtitle.toUpperCase(), 100, 170);

  // Table header line
  const tableX = 80;
  const tableY = 250;
  const rowH = 72;

  // Column positions
  const colPos = {
    num: tableX,
    club: tableX + 80,
    pj: tableX + 580,
    dif: tableX + 680,
    ptsBgX: tableX + 760, // background pill for PTS
    pts: tableX + 780,
    rend: tableX + 880,
  } as const;

  // Header labels
  ctx.font = '800 28px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('#', colPos.num, tableY);
  ctx.fillText('CLUB', colPos.club, tableY);
  ctx.fillText('PJ', colPos.pj, tableY);
  ctx.fillText('DIF', colPos.dif, tableY);
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

    // PTS pill background
    ctx.fillStyle = '#FF4081'; // Exact pink from reference
    ctx.fillRect(colPos.ptsBgX, y - 6, 70, 44);

    // Position markers (left side bars)
    const competitionId = opts.competitionId ?? 2;
    const totalTeams = opts.totalTeams ?? rows.length;
    
    if (competitionId === 33) {
      // World Cup qualifiers: Top 2 green, 3-4 blue
      if (r.pos <= 2) {
        ctx.fillStyle = '#00D084';
        ctx.fillRect(tableX - 20, y - 6, 12, 44);
      } else if (r.pos === 3 || r.pos === 4) {
        ctx.fillStyle = '#2196F3';
        ctx.fillRect(tableX - 20, y - 6, 12, 44);
      }
    } else if (competitionId <= 2) {
      // National competition: Top 8 green, bottom 1 red
      if (r.pos <= 8) {
        ctx.fillStyle = '#00D084';
        ctx.fillRect(tableX - 20, y - 6, 12, 44);
      } else if (r.pos >= totalTeams) {
        ctx.fillStyle = '#FF5C5C';
        ctx.fillRect(tableX - 20, y - 6, 12, 44);
      }
    } else if (competitionId === 32) {
      // Other competition: Top 2 green, 3rd blue
      if (r.pos <= 2) {
        ctx.fillStyle = '#00D084';
        ctx.fillRect(tableX - 20, y - 6, 12, 44);
      } else if (r.pos === 3) {
        ctx.fillStyle = '#2196F3';
        ctx.fillRect(tableX - 20, y - 6, 12, 44);
      }
    }

    // Position number
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 28px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillText(String(r.pos), colPos.num, y);

    // Club name
    ctx.font = '800 30px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillText(r.club.toUpperCase(), colPos.club, y);

    // PJ, DIF
    ctx.font = '700 26px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillText(String(r.pj), colPos.pj, y);
    ctx.fillText(String(r.dif), colPos.dif, y);

    // PTS
    ctx.font = '800 28px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillText(String(r.pts), colPos.pts + 4, y);

    // REND (percentage)
    ctx.font = '700 26px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillText(`${r.rend}%`, colPos.rend, y);
  }

  // Legend (simple)
  ctx.font = '600 22px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
  ctx.fillStyle = '#ffffff';
  const legendY = height - 90;
  const competitionId = opts.competitionId ?? 2;
  
  if (competitionId === 33) {
    // World Cup qualifiers legend
    ctx.fillStyle = '#00D084';
    ctx.fillRect(tableX, legendY - 10, 6, 24);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('TOP 2 (CLASIFICAN AL MUNDIAL)', tableX + 20, legendY);
    ctx.fillStyle = '#2196F3';
    ctx.fillRect(tableX + 380, legendY - 10, 6, 24);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('3RO Y 4TO (REPECHAJE)', tableX + 400, legendY);
  } else if (competitionId <= 2) {
    // National competition legend
    ctx.fillStyle = '#00D084';
    ctx.fillRect(tableX, legendY - 10, 6, 24);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('TOP 8 (PLAY-OFFS)', tableX + 20, legendY);
    ctx.fillStyle = '#FF5C5C';
    ctx.fillRect(tableX + 220, legendY - 10, 6, 24);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('DESCIENDE AL ASCENSO 2026', tableX + 240, legendY);
  } else if (competitionId === 32) {
    // Other competition legend
    ctx.fillStyle = '#00D084';
    ctx.fillRect(tableX, legendY - 10, 6, 24);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('TOP 2 (SEMIFINALES)', tableX + 20, legendY);
    ctx.fillStyle = '#2196F3';
    ctx.fillRect(tableX + 280, legendY - 10, 6, 24);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('3ER (5TO LUGAR)', tableX + 300, legendY);
  }

  // Credit (bottom-right rotated)
  if (opts.credit) {
    ctx.save();
    ctx.translate(width - 20, height - 20);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '600 18px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillText(opts.credit, 0, 0);
    ctx.restore();
  }

  return canvas.toDataURL('image/png');
}
