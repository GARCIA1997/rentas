import sharp from 'sharp';

// Preprocesa una imagen para OCR mejorando contraste y legibilidad.
// Útil para fotos del INE tomadas con sombras, reflejos o borrosas.
export async function preprocessImageForOcr(imageBuffer) {
  try {
    // 1. Redimensionar a un tamaño que mejore OCR (width 2000px es estándar)
    // 2. Convertir a escala de grises (las redes neuronales OCR lo prefieren)
    // 3. Aumentar contraste para que el texto negro resalte
    // 4. Mejorar nitidez (sharpening) si está borrosa
    const processedBuffer = await sharp(imageBuffer)
      .resize(2000, 3000, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .grayscale() // Escala de grises mejora OCR
      .normalize() // Normaliza el rango dinámico de píxeles
      .modulate({
        saturation: 0, // Fuerza escala de grises
        brightness: 1.05, // Ligero brillo
        contrast: 1.3, // Aumenta contraste significativamente
      })
      .sharpen({
        sigma: 1.5, // Sharpening para mejorar bordes
      })
      .toBuffer();

    return processedBuffer;
  } catch (error) {
    console.error('Error preprocessing image for OCR:', error);
    // Retornar imagen original si el preprocessamiento falla
    return imageBuffer;
  }
}

// Procesa múltiples imágenes (útil para frente + reverso del INE)
export async function preprocessMultipleImages(imageBuffers) {
  return Promise.all(imageBuffers.map(preprocessImageForOcr));
}
