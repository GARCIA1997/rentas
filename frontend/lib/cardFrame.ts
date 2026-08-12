// Geometría del marco guía de la cámara.
//
// Vive fuera del componente porque es la pieza de la que depende que el OCR lea algo:
// si la ROI que sale de aquí apunta a una región distinta de la que el usuario vio
// dentro del marco, el recorte se lleva el fondo y Tesseract vuelve a no leer nada.
// Separada, se puede verificar numéricamente en vez de a ojo.

import type { Roi } from './imagePreprocess';

/**
 * Proporción del INE (85.6 × 54 mm) puesto de pie. El marco es vertical a propósito:
 * con el teléfono en retrato, una credencial girada 90° ocupa el lado LARGO del sensor
 * y cae con ~50% más de píxeles por milímetro que acostada.
 */
export const CARD_PORTRAIT_RATIO = 85.6 / 54;

const FRAME_WIDTH_RATIO = 0.82;
const FRAME_MAX_HEIGHT_RATIO = 0.84;
/** Se recorta un poco más allá del marco para no cortar caracteres pegados al borde. */
const ROI_PADDING = 0.02;

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** El marco se calcula una vez y se usa para pintar Y para recortar: no pueden desalinearse. */
export function computeFrameRect(containerW: number, containerH: number): Rect {
  let width = containerW * FRAME_WIDTH_RATIO;
  let height = width * CARD_PORTRAIT_RATIO;

  const maxHeight = containerH * FRAME_MAX_HEIGHT_RATIO;
  if (height > maxHeight) {
    height = maxHeight;
    width = height / CARD_PORTRAIT_RATIO;
  }

  return {
    left: (containerW - width) / 2,
    top: (containerH - height) / 2,
    width,
    height,
  };
}

/**
 * Traduce el marco (coordenadas CSS del contenedor) a coordenadas normalizadas del
 * frame de video.
 *
 * El video se pinta con `object-fit: cover`: está escalado al mayor de los dos factores
 * y recortado por el centro. Sin deshacer ese recorte, la ROI queda desplazada justo
 * en la dirección en la que el video sobresale del contenedor.
 */
export function frameRectToRoi(
  frame: Rect,
  containerW: number,
  containerH: number,
  videoW: number,
  videoH: number,
): Roi {
  const scale = Math.max(containerW / videoW, containerH / videoH);
  const offsetX = (videoW * scale - containerW) / 2;
  const offsetY = (videoH * scale - containerH) / 2;

  const x = (frame.left + offsetX) / scale / videoW;
  const y = (frame.top + offsetY) / scale / videoH;
  const w = frame.width / scale / videoW;
  const h = frame.height / scale / videoH;

  const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
  return {
    x: clamp01(x - ROI_PADDING),
    y: clamp01(y - ROI_PADDING),
    w: clamp01(w + ROI_PADDING * 2),
    h: clamp01(h + ROI_PADDING * 2),
  };
}
