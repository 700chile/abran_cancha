export type PosterMatch = {
  local: string | null;
  visita: string | null;
  estadio: string | null;
  programacion: string;
};

export type RenderOptions = {
  backgroundUrl: string;
  competitionTitle: string;
  divisionTitle: string;
  roundTitle: string;
  width?: number;
  height?: number;
  pixelRatio?: number;
  getLogoUrl: (teamName: string | null) => string | null;
};

function isSameOrigin(resourceUrl: string): boolean {
  try {
    const u = new URL(resourceUrl, window.location.origin);
    return u.origin === window.location.origin;
  } catch {
    return true; // data URLs or invalid will be treated as same-origin fallback
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Only set crossOrigin for off-origin assets; same-origin must omit to avoid 0x0 on some hosts
    if (!isSameOrigin(url) && !url.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      if (img.naturalWidth === 0 || img.naturalHeight === 0) {
        reject(new Error(`Image loaded but has zero size: ${url}`));
        return;
      }
      resolve(img);
    };
    img.onerror = (e) => {
      console.error('[Poster] image load error', url, e);
      reject(e);
    };
    img.src = url;
  });
}

function fmtTime(timeIso: string) {
  const d = new Date(timeIso);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${hh}.${mm}`;
}

function fmtDateLine(timeIso: string) {
  const d = new Date(timeIso);
  const days = ['DOMINGO','LUNES','MARTES','MIÉRCOLES','JUEVES','VIERNES','SÁBADO'];
  const months = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
  const dayName = days[d.getDay()];
  const day = d.getDate();
  const month = months[d.getMonth()];
  return `${dayName} ${day} ${month}`;
}

export async function renderScheduleImage(matches: PosterMatch[], opts: RenderOptions): Promise<string> {
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
    console.log('[Poster] loading background', opts.backgroundUrl);
    const bg = await loadImage(opts.backgroundUrl);
    ctx.drawImage(bg, 0, 0, width, height);
  } catch (e) {
    console.warn('[Poster] background failed to load, drawing fallback', e);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
  }

  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 34px Inter, system-ui, -apple-system, Segoe UI, Roboto';
  ctx.fillText(opts.competitionTitle.toUpperCase(), 210, 70);
  ctx.font = '600 24px Inter, system-ui, -apple-system, Segoe UI, Roboto';
  ctx.fillText(opts.divisionTitle.toUpperCase(), 210, 110);
  ctx.font = '500 22px Inter, system-ui, -apple-system, Segoe UI, Roboto';
  ctx.fillText(opts.roundTitle.toUpperCase(), 210, 140);

  const startY = 200;
  const rowH = 130;
  const leftX = 90;
  const logoSize = 64;

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const y = startY + i * rowH;

    const lUrl = opts.getLogoUrl(m.local);
    const vUrl = opts.getLogoUrl(m.visita);
    if (lUrl) {
      try { const li = await loadImage(lUrl); ctx.drawImage(li, leftX, y, logoSize, logoSize); } catch {}
    }
    if (vUrl) {
      try { const vi = await loadImage(vUrl); ctx.drawImage(vi, leftX + logoSize + 16, y, logoSize, logoSize); } catch {}
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 40px Inter, system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillText(fmtTime(m.programacion), leftX + logoSize*2 + 48, y);

    ctx.font = '700 18px Inter, system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillText(fmtDateLine(m.programacion), leftX + logoSize*2 + 48, y + 50);

    ctx.font = '600 18px Inter, system-ui, -apple-system, Segoe UI, Roboto';
    const estadio = (m.estadio ?? '').toUpperCase();
    const estadioMaxWidth = width - (leftX + logoSize*2 + 48) - 60;
    wrapFillText(ctx, `ESTADIO ${estadio}`, leftX + logoSize*2 + 48, y + 78, estadioMaxWidth, 22);
  }

  return canvas.toDataURL('image/png');
}

function wrapFillText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';
  let ly = y;
  for (let n = 0; n < words.length; n++) {
    const testLine = line ? line + ' ' + words[n] : words[n];
    const metrics = ctx.measureText(testLine);
    const w = metrics.width;
    if (w > maxWidth && n > 0) {
      ctx.fillText(line, x, ly);
      line = words[n];
      ly += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) ctx.fillText(line, x, ly);
}
