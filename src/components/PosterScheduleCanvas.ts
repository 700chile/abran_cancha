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
  const width = opts.width ?? 1200; // Changed from 1080 to 1200
  const height = opts.height ?? 1500; // Changed from 1350 to 1500 for exact 4:5 ratio
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

  // Ensure custom font (Ruda) is loaded if available before drawing text
  if ((document as any).fonts && typeof (document as any).fonts.load === 'function') {
    try {
      const before = (document as any).fonts.check('16px Ruda');
      if (!before) console.warn('[Poster][fonts] Ruda not yet available before load(). Ensure it is imported via @fontsource or a <link>.');
    } catch {}
    try {
      await Promise.all([
        (document as any).fonts.load('600 34px Ruda'),
        (document as any).fonts.load('600 24px Ruda'),
        (document as any).fonts.load('500 22px Ruda'),
        (document as any).fonts.load('800 40px Ruda'),
        (document as any).fonts.load('700 18px Ruda'),
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

  ctx.textBaseline = 'top';
  ctx.fillStyle = '#000000';
  ctx.font = '700 42px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto'; // Increased from 38px
  ctx.fillText(opts.competitionTitle.toUpperCase(), 510, 80); // Moved right 40px
  ctx.font = '500 40px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto'; // Increased from 36px
  ctx.fillText(opts.divisionTitle.toUpperCase(), 510, 120); // Moved right 40px
  ctx.font = '500 40px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto'; // Increased from 36px
  ctx.fillText(opts.roundTitle.toUpperCase(), 510, 160); // Moved right 40px

  const startY = 300;
  const rowH = 120;
  const leftX = 200;
  const logoSize = 90;

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
    ctx.font = '800 58px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto'; // Increased from 52px
    ctx.fillText(fmtTime(m.programacion), leftX + logoSize*2 + 48, y);

    ctx.font = '700 30px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto'; // Increased from 26px
    ctx.fillText(fmtDateLine(m.programacion), leftX + logoSize*2 + 48, y + 46);

    ctx.font = '600 30px Ruda, Inter, system-ui, -apple-system, Segoe UI, Roboto'; // Increased from 26px
    const estadio = (m.estadio ?? '').toUpperCase();
    const estadioMaxWidth = width - (leftX + logoSize*2 + 48) - 60;
    wrapFillText(ctx, `${estadio}`, leftX + logoSize*2 + 48, y + 76, estadioMaxWidth, 26);
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
