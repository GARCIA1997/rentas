// Preprocesamiento de imagen en canvas, del lado del cliente.
//
// POR QUÉ EN EL CLIENTE: el OCR (tesseract.js) corre en el navegador sobre el blob
// recién capturado, ANTES de subir la foto. Cualquier preprocesamiento hecho en el
// backend llega demasiado tarde para el OCR — sólo mejora la copia archivada.
// Este archivo es el que de verdad determina si Tesseract lee algo o no.
//
// El orden de las operaciones importa y no es arbitrario:
//   recortar → rotar → escalar → gris → estirar contraste → binarizar
// Recortar primero descarta el fondo (la mesa, la mano, la sombra) antes de calcular
// el histograma; si se hiciera al final, el contraste se calcularía contra píxeles
// que ni siquiera son de la credencial.

/** Región de interés en coordenadas normalizadas (0..1) del frame de video. */
export interface Roi {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PreprocessOptions {
  /** Recorte de la credencial. Sin esto el OCR ve toda la escena y se pierde. */
  roi?: Roi;
  /** El marco guía es vertical pero el texto del INE es horizontal: hay que girarlo. */
  rotateDeg?: 0 | 90 | -90 | 180;
  /** Tesseract rinde mejor cerca de 300 DPI; una credencial escalada a ~2200px lo aproxima. */
  targetLongEdge?: number;
  /** Umbral adaptativo. Cierra el paso a sombras y reflejos, pero borra texto muy tenue. */
  binarize?: boolean;
  /** Ventana del umbral local, como fracción del ancho. */
  thresholdWindowRatio?: number;
  /** Sesgo del umbral: más alto = más píxeles a negro. */
  thresholdBias?: number;
}

const DEFAULTS: Required<Omit<PreprocessOptions, 'roi' | 'rotateDeg'>> = {
  targetLongEdge: 2200,
  binarize: true,
  thresholdWindowRatio: 1 / 16,
  thresholdBias: 0.12,
};

/** Decodifica un blob a algo dibujable. `createImageBitmap` evita un decode extra. */
export async function decodeImage(blob: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(blob);
    } catch {
      // Safari viejo puede fallar con algunos JPEG; se cae al <img> de abajo.
    }
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo decodificar la imagen'));
    };
    img.src = url;
  });
}

const sourceSize = (src: ImageBitmap | HTMLImageElement) => ({
  width: 'width' in src ? src.width : (src as HTMLImageElement).naturalWidth,
  height: 'height' in src ? src.height : (src as HTMLImageElement).naturalHeight,
});

/**
 * Recorta la ROI, rota para dejar el texto horizontal y escala al tamaño objetivo.
 * Devuelve un canvas todavía en color: el gris y el umbral van después.
 */
function cropRotateScale(
  src: ImageBitmap | HTMLImageElement,
  roi: Roi | undefined,
  rotateDeg: number,
  targetLongEdge: number,
): HTMLCanvasElement {
  const { width: srcW, height: srcH } = sourceSize(src);

  const sx = roi ? Math.max(0, Math.round(roi.x * srcW)) : 0;
  const sy = roi ? Math.max(0, Math.round(roi.y * srcH)) : 0;
  const sw = roi ? Math.min(srcW - sx, Math.round(roi.w * srcW)) : srcW;
  const sh = roi ? Math.min(srcH - sy, Math.round(roi.h * srcH)) : srcH;

  const rotated = rotateDeg === 90 || rotateDeg === -90;
  // Tras rotar 90°, el lado largo del resultado es el lado corto del recorte.
  const outLong = rotated ? sh : sw;
  const outShort = rotated ? sw : sh;
  const scale = Math.min(targetLongEdge / Math.max(outLong, 1), 4);

  const destW = Math.max(1, Math.round(outLong * scale));
  const destH = Math.max(1, Math.round(outShort * scale));

  const canvas = document.createElement('canvas');
  canvas.width = destW;
  canvas.height = destH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D no disponible');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.save();
  ctx.translate(destW / 2, destH / 2);
  ctx.rotate((rotateDeg * Math.PI) / 180);
  // Tras rotar, el destino se mide en el sistema del recorte, no del canvas.
  const drawW = rotated ? destH : destW;
  const drawH = rotated ? destW : destH;
  ctx.drawImage(src, sx, sy, sw, sh, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();

  return canvas;
}

/**
 * Gris por luminancia + estirado de contraste por percentiles.
 *
 * Se usan los percentiles 2/98 en vez del min/max real porque un solo píxel de
 * reflejo especular (blanco puro) o una sombra dura bastarían para anular el
 * estirado por completo.
 */
function grayscaleAndStretch(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = image.data;
  const histogram = new Uint32Array(256);

  for (let i = 0; i < px.length; i += 4) {
    const gray = (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) | 0;
    px[i] = gray;
    histogram[gray]++;
  }

  const totalPixels = px.length / 4;
  const lowCut = totalPixels * 0.02;
  const highCut = totalPixels * 0.98;

  let low = 0;
  let high = 255;
  let running = 0;
  for (let v = 0; v < 256; v++) {
    running += histogram[v];
    if (running >= lowCut) {
      low = v;
      break;
    }
  }
  running = 0;
  for (let v = 0; v < 256; v++) {
    running += histogram[v];
    if (running >= highCut) {
      high = v;
      break;
    }
  }

  const span = Math.max(1, high - low);
  const lut = new Uint8Array(256);
  for (let v = 0; v < 256; v++) {
    lut[v] = Math.max(0, Math.min(255, Math.round(((v - low) / span) * 255)));
  }

  for (let i = 0; i < px.length; i += 4) {
    const g = lut[px[i]];
    px[i] = g;
    px[i + 1] = g;
    px[i + 2] = g;
    px[i + 3] = 255;
  }

  ctx.putImageData(image, 0, 0);
}

/**
 * Umbral adaptativo de Bradley-Roth sobre imagen integral.
 *
 * Un umbral global no sirve aquí: la foto de una credencial casi siempre tiene un
 * lado más iluminado que el otro, y cualquier corte único deja media credencial
 * en negro. El umbral local compara cada píxel contra la media de su vecindad,
 * así que la iluminación desigual deja de importar. La imagen integral lo hace
 * en O(n) en vez de O(n·ventana²).
 */
function adaptiveThreshold(canvas: HTMLCanvasElement, windowRatio: number, bias: number): void {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  const { width: w, height: h } = canvas;
  const image = ctx.getImageData(0, 0, w, h);
  const px = image.data;

  // Imagen integral con una fila/columna de ceros de guarda, para no ramificar en los bordes.
  const integral = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    for (let x = 0; x < w; x++) {
      rowSum += px[(y * w + x) * 4];
      integral[(y + 1) * (w + 1) + (x + 1)] = integral[y * (w + 1) + (x + 1)] + rowSum;
    }
  }

  const half = Math.max(4, Math.floor((w * windowRatio) / 2));

  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - half);
    const y1 = Math.min(h - 1, y + half);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - half);
      const x1 = Math.min(w - 1, x + half);

      const area = (x1 - x0 + 1) * (y1 - y0 + 1);
      const sum =
        integral[(y1 + 1) * (w + 1) + (x1 + 1)] -
        integral[y0 * (w + 1) + (x1 + 1)] -
        integral[(y1 + 1) * (w + 1) + x0] +
        integral[y0 * (w + 1) + x0];

      const idx = (y * w + x) * 4;
      const value = px[idx] * area < sum * (1 - bias) ? 0 : 255;
      px[idx] = value;
      px[idx + 1] = value;
      px[idx + 2] = value;
    }
  }

  ctx.putImageData(image, 0, 0);
}

/** Pipeline completo. Devuelve un canvas listo para pasar a Tesseract. */
export async function preprocessForOcr(
  source: Blob | ImageBitmap | HTMLImageElement,
  options: PreprocessOptions = {},
): Promise<HTMLCanvasElement> {
  const opts = { ...DEFAULTS, ...options };
  const image = source instanceof Blob ? await decodeImage(source) : source;

  const canvas = cropRotateScale(image, options.roi, options.rotateDeg ?? 0, opts.targetLongEdge);
  grayscaleAndStretch(canvas);
  if (opts.binarize) {
    adaptiveThreshold(canvas, opts.thresholdWindowRatio, opts.thresholdBias);
  }
  return canvas;
}

/**
 * Recorta una banda de un canvas ya procesado, en fracciones de su altura.
 * Se usa para aislar el MRZ, que siempre vive en la franja inferior del reverso.
 */
export function cropBand(
  canvas: HTMLCanvasElement,
  fromRatio: number,
  toRatio: number,
): HTMLCanvasElement {
  const top = Math.floor(canvas.height * fromRatio);
  const height = Math.max(1, Math.floor(canvas.height * (toRatio - fromRatio)));

  const out = document.createElement('canvas');
  out.width = canvas.width;
  out.height = height;
  const ctx = out.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D no disponible');
  ctx.drawImage(canvas, 0, top, canvas.width, height, 0, 0, canvas.width, height);
  return out;
}
