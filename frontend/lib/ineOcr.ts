// Orquestación del OCR del INE con tesseract.js.
//
// El `recognize()` de una línea que había antes usaba TODO por defecto: PSM AUTO,
// sin DPI declarado, sin whitelist, sobre la foto cruda completa. Con eso Tesseract
// intenta primero segmentar la página (falla, porque una credencial no es una página),
// y acaba leyendo el fondo. De ahí el "no lee nada".
//
// Lo que cambia aquí:
//   1. Se le pasa la credencial YA recortada, girada, escalada y binarizada.
//   2. PSM SINGLE_BLOCK: "esto es un bloque de texto", no "descubre el layout".
//   3. user_defined_dpi=300: sin esto Tesseract asume un DPI bajo y escoge mal la escala.
//   4. Pasada aparte para el MRZ, con whitelist del alfabeto MRZ.
//   5. Varias pasadas y se escoge la mejor por confianza y campos hallados.

import type { Worker } from 'tesseract.js';
import { cropBand, decodeImage, preprocessForOcr, type Roi } from './imagePreprocess';
import { extractMrzData, findCurpAnywhere, type MrzResult } from './mrzParser';

export interface IneCapture {
  blob: Blob;
  /** Recorte del marco guía, en coordenadas normalizadas del frame de video. */
  roi?: Roi;
  /** Giro necesario para dejar el texto horizontal (el marco guía es vertical). */
  rotateDeg?: 0 | 90 | -90 | 180;
}

export interface IneOcrResult {
  frontText: string;
  backText: string;
  mrzText: string;
  mrz: MrzResult | null;
  curp: string | null;
  meanConfidence: number;
}

export type OcrProgressHandler = (message: string, progress: number) => void;

/** El MRZ vive en la franja inferior del reverso; se recorta con holgura. */
const MRZ_BAND = { from: 0.55, to: 1 };
const MRZ_WHITELIST = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<';
/** Debajo de este puntaje se asume que la credencial quedó girada al revés. */
const ROTATION_RETRY_SCORE = 25;

/** Mensajes en español para los estados internos de tesseract.js. */
const STATUS_LABELS: Record<string, string> = {
  'loading tesseract core': 'Cargando motor de lectura...',
  'initializing tesseract': 'Iniciando motor...',
  'loading language traineddata': 'Descargando modelo de español...',
  'initializing api': 'Preparando lector...',
  'recognizing text': 'Leyendo credencial...',
};

/**
 * Puntúa un texto OCR por cuánta información útil del INE contiene.
 * Sirve para elegir entre pasadas: la confianza que reporta Tesseract sube con
 * texto basura "bien leído", así que sola no basta como criterio.
 */
function scoreIneText(text: string): number {
  const upper = text.toUpperCase();
  let score = 0;

  if (findCurpAnywhere(upper)) score += 40;
  if (/[A-Z]{6}\d{8}[HM]\d{3}/.test(upper.replace(/[^A-Z0-9]/g, ''))) score += 25;
  for (const label of ['NOMBRE', 'DOMICILIO', 'CLAVE DE ELECTOR', 'CURP', 'FECHA DE NACIMIENTO']) {
    if (upper.includes(label)) score += 6;
  }
  // Densidad de letras: penaliza salidas que son casi todo símbolos.
  const letters = (upper.match(/[A-Z]/g) ?? []).length;
  score += Math.min(15, letters / 20);

  return score;
}

interface PassResult {
  text: string;
  confidence: number;
  score: number;
}

async function runPass(
  worker: Worker,
  image: HTMLCanvasElement,
  params: Record<string, string>,
): Promise<PassResult> {
  await worker.setParameters(params);
  const { data } = await worker.recognize(image);
  const text = data.text ?? '';
  return { text, confidence: data.confidence ?? 0, score: scoreIneText(text) };
}

/** Ejecuta una pasada y devuelve null en vez de propagar: una pasada mala no debe tumbar el flujo. */
async function tryPass(
  label: string,
  worker: Worker,
  image: HTMLCanvasElement,
  params: Record<string, string>,
): Promise<PassResult | null> {
  try {
    return await runPass(worker, image, params);
  } catch (error) {
    console.warn(`Pasada OCR "${label}" falló:`, error);
    return null;
  }
}

export async function runIneOcr(
  front: IneCapture,
  back: IneCapture | null,
  onProgress: OcrProgressHandler = () => {},
): Promise<IneOcrResult> {
  const { createWorker, PSM, OEM } = await import('tesseract.js');

  // La carga del modelo domina el tiempo en la primera corrida (~10 MB), así que
  // se reserva la primera mitad de la barra para eso y no salta de 0 a 90.
  let baseProgress = 0;
  const worker = await createWorker(['spa'], OEM.LSTM_ONLY, {
    logger: ({ status, progress }) => {
      const label = STATUS_LABELS[status] ?? 'Procesando...';
      onProgress(label, Math.min(0.95, baseProgress + progress * 0.15));
    },
  });

  try {
    onProgress('Preparando imágenes...', 0.05);

    const frontImage = await decodeImage(front.blob);
    // Dos versiones del frente: binarizada (gana casi siempre) y sólo en gris
    // (rescata credenciales muy tenues, donde el umbral se come el texto).
    const frontBinary = await preprocessForOcr(frontImage, {
      roi: front.roi,
      rotateDeg: front.rotateDeg ?? 0,
      binarize: true,
    });
    const frontGray = await preprocessForOcr(frontImage, {
      roi: front.roi,
      rotateDeg: front.rotateDeg ?? 0,
      binarize: false,
    });

    const commonParams = {
      user_defined_dpi: '300',
      preserve_interword_spaces: '1',
      tessedit_char_whitelist: '',
    };

    baseProgress = 0.2;
    onProgress('Leyendo frente del INE...', 0.2);

    const frontPasses = [
      await tryPass('frente/binaria', worker, frontBinary, {
        ...commonParams,
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      }),
      await tryPass('frente/gris-disperso', worker, frontGray, {
        ...commonParams,
        tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      }),
    ].filter((pass): pass is PassResult => pass !== null);

    let bestFront = frontPasses.sort(
      (a, b) => b.score - a.score || b.confidence - a.confidence,
    )[0];

    // Red de seguridad de orientación: si el usuario giró la credencial hacia el
    // otro lado, el texto queda de cabeza y el OCR devuelve basura. Un puntaje muy
    // bajo es justo esa señal, así que se reintenta con el giro opuesto. Sale más
    // barato que obligar al usuario a repetir la foto.
    let resolvedRotation = front.rotateDeg ?? 0;
    if ((bestFront?.score ?? 0) < ROTATION_RETRY_SCORE && (resolvedRotation === -90 || resolvedRotation === 90)) {
      onProgress('Ajustando orientación...', 0.45);
      const flipped = resolvedRotation === -90 ? 90 : -90;
      const flippedCanvas = await preprocessForOcr(frontImage, {
        roi: front.roi,
        rotateDeg: flipped,
        binarize: true,
      });
      const flippedPass = await tryPass('frente/giro-opuesto', worker, flippedCanvas, {
        ...commonParams,
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      });
      if (flippedPass && flippedPass.score > (bestFront?.score ?? 0)) {
        bestFront = flippedPass;
        resolvedRotation = flipped;
      }
    }

    let backText = '';
    let mrzText = '';
    let backConfidence = 0;

    if (back) {
      baseProgress = 0.55;
      onProgress('Leyendo reverso del INE...', 0.55);

      const backImage = await decodeImage(back.blob);
      const backBinary = await preprocessForOcr(backImage, {
        roi: back.roi,
        // Se hereda el giro que resultó correcto en el frente: si el usuario giró la
        // credencial hacia un lado, casi con certeza giró el reverso igual.
        rotateDeg: resolvedRotation as 0 | 90 | -90 | 180,
        binarize: true,
        // El MRZ es texto chico: se le da más resolución que al frente.
        targetLongEdge: 2600,
      });

      const backPass = await tryPass('reverso/completo', worker, backBinary, {
        ...commonParams,
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      });
      backText = backPass?.text ?? '';
      backConfidence = backPass?.confidence ?? 0;

      baseProgress = 0.78;
      onProgress('Leyendo zona MRZ...', 0.78);

      // Pasada dedicada al MRZ: sólo la franja inferior y sólo su alfabeto.
      // La whitelist es lo que más ayuda aquí — le quita a Tesseract la opción
      // de "leer" acentos, comas o minúsculas que en un MRZ no existen.
      const mrzBand = cropBand(backBinary, MRZ_BAND.from, MRZ_BAND.to);
      const mrzPass = await tryPass('reverso/mrz', worker, mrzBand, {
        user_defined_dpi: '300',
        preserve_interword_spaces: '0',
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
        tessedit_char_whitelist: MRZ_WHITELIST,
      });
      mrzText = mrzPass?.text ?? '';
    }

    onProgress('Interpretando datos...', 0.95);

    const frontText = bestFront?.text ?? '';
    // El MRZ se busca en su pasada dedicada y, si ahí no salió, en el reverso completo.
    const mrz = extractMrzData(mrzText) ?? extractMrzData(backText);
    const curp = findCurpAnywhere(`${frontText}\n${backText}\n${mrzText}`);

    const confidences = [bestFront?.confidence ?? 0, backConfidence].filter((value) => value > 0);
    const meanConfidence = confidences.length
      ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length
      : 0;

    return { frontText, backText, mrzText, mrz, curp, meanConfidence };
  } finally {
    // Sin terminate() el worker deja vivo un WebWorker + el WASM cargado.
    await worker.terminate().catch(() => {});
  }
}
