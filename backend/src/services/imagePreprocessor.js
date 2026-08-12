import sharp from 'sharp';

// Normaliza las fotos del INE ANTES de archivarlas en disco.
//
// OJO CON EL ALCANCE: esto no tiene nada que ver con el OCR. El OCR corre en el
// navegador (tesseract.js) sobre el blob recién capturado, antes de que la foto
// llegue al backend — ver `frontend/lib/imagePreprocess.ts`, que es donde sí vive
// el preprocesamiento que mejora la lectura. Aquí sólo se acota el peso en disco.
//
// Por lo mismo NO se pasa a escala de grises ni se sube el contraste: la copia
// archivada es el respaldo de cumplimiento de la identificación, y una versión
// alterada vale menos como evidencia que el original. Sólo se reorienta según EXIF,
// se acota la resolución y se recomprime.

/** Un INE a ~2000 px de lado largo queda legible a ojo y pesa una fracción del original. */
const MAX_LONG_EDGE = 2000;
const JPEG_QUALITY = 88;

export async function normalizeIneImageForStorage(imageBuffer) {
  try {
    return await sharp(imageBuffer)
      // Las cámaras de celular guardan la orientación en EXIF en vez de rotar los
      // píxeles; sin esto la foto archivada se ve de lado en la mitad de los visores.
      .rotate()
      .resize(MAX_LONG_EDGE, MAX_LONG_EDGE, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer();
  } catch (error) {
    // Una foto que no se puede normalizar se archiva tal cual: perder el respaldo
    // es peor que archivarlo sin optimizar.
    console.error('No se pudo normalizar la imagen del INE, se archiva el original:', error);
    return imageBuffer;
  }
}
