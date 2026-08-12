// Funciones puras sobre texto OCR crudo del INE (credencial para votar). No dependen del
// motor de OCR usado (tesseract.js) ni de React — sólo reciben el texto ya reconocido.
//
// La fecha de nacimiento se deriva de la CURP en vez de buscarla por la etiqueta
// "FECHA DE NACIMIENTO": la CURP es matcheable por regex sin importar el layout/ruido
// del OCR, mientras que el valor junto a una etiqueta depende de que el OCR haya
// preservado el orden de líneas correctamente.

import type { MrzResult } from './mrzParser';

export interface ParsedIneData {
  fullName?: string;
  curp?: string;
  birthDate?: string; // ISO yyyy-mm-dd
  address?: string;
  idDocument?: string; // Clave de elector
  confidence?: 'high' | 'medium' | 'low'; // Nivel de confianza de la lectura
}

// CURP tiene formato muy específico: 4 letras + 6 dígitos (AAMMDD) + 1 letra (sexo) + 5 letras + 1 letra/dígito + 1 dígito
const CURP_REGEX = /[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z\d]\d/;

// Clave de elector: 6 letras + 8 dígitos + 1 letra (sexo) + 3 dígitos
const CLAVE_ELECTOR_REGEX = /[A-Z]{6}\d{8}[HM]\d{3}/;

const stripNonAlnum = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '');

const toLines = (rawText: string) =>
  rawText
    .toUpperCase()
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const findTokenNearLabel = (lines: string[], label: string, minLen: number): string | null => {
  const idx = lines.findIndex((line) => line.includes(label));
  if (idx === -1) return null;

  // El valor puede quedar pegado a la etiqueta en la misma línea, o caer en la
  // siguiente — el layout varía según qué tan bien el OCR separó los bloques.
  const sameLine = lines[idx].split(label)[1] ?? '';
  const candidates = [sameLine, lines[idx + 1] ?? ''];
  for (const candidate of candidates) {
    const token = stripNonAlnum(candidate);
    if (token.length >= minLen) return token;
  }
  return null;
};

// La CURP tiene un tipo fijo por posición, y eso permite corregir las confusiones
// clásicas del OCR sin adivinar: donde la norma exige dígito, una "O" sólo puede ser
// un 0; donde exige letra, un "0" sólo puede ser O.
//
//   0-3  letras   4-9 dígitos (AAMMDD)   10 H/M   11-15 letras   16 letra o dígito   17 dígito
const LETTER_FROM_DIGIT: Record<string, string> = {
  '0': 'O', '1': 'I', '5': 'S', '8': 'B', '6': 'G', '2': 'Z', '4': 'A',
};
const DIGIT_FROM_LETTER: Record<string, string> = {
  O: '0', Q: '0', D: '0', I: '1', L: '1', S: '5', B: '8', G: '6', Z: '2', A: '4',
};

/** Año de nacimiento a partir de AAMMDD, resolviendo el siglo por plausibilidad. */
function inferBirthYear(yy: number): number {
  const currentYear = new Date().getFullYear();
  return 2000 + yy > currentYear ? 1900 + yy : 2000 + yy;
}

export function normalizeCurp(curp: string): string {
  const chars = curp.split('');
  const forceLetter = (index: number) => {
    const char = chars[index];
    if (/\d/.test(char)) chars[index] = LETTER_FROM_DIGIT[char] ?? char;
  };
  const forceDigit = (index: number) => {
    const char = chars[index];
    if (/[A-Z]/.test(char)) chars[index] = DIGIT_FROM_LETTER[char] ?? char;
  };

  for (let i = 0; i <= 3; i++) forceLetter(i);
  for (let i = 4; i <= 9; i++) forceDigit(i);
  for (let i = 11; i <= 15; i++) forceLetter(i);
  forceDigit(17);

  // La posición 16 admite letra Y dígito, así que por tipo no se puede corregir —
  // y es justo donde el OCR confunde 0 con O. Se resuelve aplicando la regla de la
  // norma al revés: como el siglo ya se deduce por la edad, y la norma dice que los
  // nacidos antes de 2000 llevan dígito ahí y los de 2000 en adelante llevan letra,
  // el siglo determina de qué tipo tiene que ser ese carácter.
  const yy = parseInt(chars.slice(4, 6).join(''), 10);
  if (!Number.isNaN(yy)) {
    if (inferBirthYear(yy) < 2000) forceDigit(16);
    else forceLetter(16);
  }

  return chars.join('');
}

export function extractCurp(rawText: string): string | null {
  const flat = stripNonAlnum(rawText);
  const match = flat.match(CURP_REGEX);
  return match ? normalizeCurp(match[0]) : null;
}

/**
 * Deriva la fecha de nacimiento de las posiciones 4-9 de la CURP (AAMMDD).
 *
 * El siglo NO se toma del diferenciador de la posición 16 aunque la norma lo codifique
 * ahí (dígito = 1900s, letra = 2000s). Ese carácter es justo donde el OCR confunde 0
 * con O, y equivocarlo mueve la fecha un siglo entero en silencio: una credencial de
 * 1985 se registraría como 2085. Se resuelve por plausibilidad, que no depende de
 * ningún carácter suelto: si interpretarlo como 20xx da una fecha futura, es 19xx.
 */
export function deriveBirthDateFromCurp(curp: string): string | null {
  const normalized = normalizeCurp(curp);
  if (!CURP_REGEX.test(normalized) || normalized.length !== 18) return null;

  const yy = parseInt(normalized.slice(4, 6), 10);
  const month = parseInt(normalized.slice(6, 8), 10);
  const day = parseInt(normalized.slice(8, 10), 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const year = inferBirthYear(yy);

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function extractClaveElector(rawText: string): string | null {
  const lines = toLines(rawText);
  const token = findTokenNearLabel(lines, 'CLAVE DE ELECTOR', 13);
  if (!token) return null;

  // Buscar el patrón específico de clave de elector
  const match = token.match(CLAVE_ELECTOR_REGEX);
  if (match) return match[0];

  // Fallback: buscar cualquier secuencia de 13+ caracteres alfanuméricos
  const fallbackMatch = token.match(/[A-Z0-9]{13,18}/);
  return fallbackMatch ? fallbackMatch[0].slice(0, 18) : null;
}

export function extractAddress(rawText: string): string | null {
  const lines = toLines(rawText);
  const startIdx = lines.findIndex((line) => line.includes('DOMICILIO'));
  if (startIdx === -1) return null;

  const stopLabels = [
    'CLAVE DE ELECTOR',
    'CURP',
    'FECHA DE NACIMIENTO',
    'SEXO',
    'AÑO DE REGISTRO',
    'ANO DE REGISTRO',
  ];

  const addressLines: string[] = [];
  for (let i = startIdx + 1; i < lines.length && addressLines.length < 3; i++) {
    if (stopLabels.some((label) => lines[i].includes(label))) break;
    addressLines.push(lines[i]);
  }

  return addressLines.length ? addressLines.join(', ') : null;
}

export function extractFullName(rawText: string): string | null {
  const lines = toLines(rawText);
  const startIdx = lines.findIndex((line) => line.includes('NOMBRE'));
  if (startIdx === -1) return null;

  const stopLabels = ['DOMICILIO', 'CLAVE DE ELECTOR', 'CURP'];

  const nameLines: string[] = [];
  for (let i = startIdx + 1; i < lines.length && nameLines.length < 3; i++) {
    if (stopLabels.some((label) => lines[i].includes(label))) break;
    nameLines.push(lines[i]);
  }

  return nameLines.length ? nameLines.join(' ') : null;
}

// Combina el texto OCR de ambos lados de la credencial. La clave de elector y el
// domicilio normalmente sólo están en el frente; la CURP puede aparecer en cualquiera
// de los dos lados según el formato de la credencial.
//
// Nota: el OCR del INE es desafiante porque los campos están en un layout específico
// con códigos de barras, QR y hologramas. Se mejora con cada captura; si el OCR falla,
// los campos se dejan en blanco para que el usuario los rellene manualmente.
export function parseIneText(frontText: string, backText = ''): ParsedIneData {
  const combined = `${frontText}\n${backText}`;

  // Extraer campos individuales
  const fullName = extractFullName(frontText);
  const address = extractAddress(frontText);
  const idDocument = extractClaveElector(frontText);

  // Buscar CURP con mayor tolerancia — puede estar entre ruido de códigos de barras
  let curp = extractCurp(combined);
  if (!curp) {
    // Intento alternativo: buscar el patrón CURP incluso si hay caracteres raros alrededor
    const curpMatch = combined.match(/[A-Z]{4}\d{6}[HM][A-Z]{5}[\w]{2}\d/);
    if (curpMatch) {
      curp = curpMatch[0].substring(0, 18);
    }
  }

  // Derivar fecha de nacimiento si se encontró CURP
  const birthDate = curp ? deriveBirthDateFromCurp(curp) : undefined;

  // Calcular nivel de confianza basado en cuántos campos se extrajeron exitosamente
  let confidence: 'high' | 'medium' | 'low' = 'low';
  const fieldsFound = [fullName, curp, birthDate, address, idDocument].filter(Boolean).length;
  if (fieldsFound >= 4) confidence = 'high';
  else if (fieldsFound >= 2) confidence = 'medium';

  return {
    fullName: fullName ?? undefined,
    curp: curp ?? undefined,
    birthDate: birthDate ?? undefined,
    address: address ?? undefined,
    idDocument: idDocument ?? undefined,
    confidence,
  };
}

/** De dónde salió cada campo, para poder marcar en la UI qué es confiable. */
export type FieldSource = 'mrz' | 'curp' | 'ocr';

export interface ParsedIneResult extends ParsedIneData {
  sources: Partial<Record<'fullName' | 'curp' | 'birthDate' | 'address' | 'idDocument', FieldSource>>;
  /** El MRZ trae dígitos verificadores: si cuadran, la fecha es dato duro, no una lectura. */
  mrzVerified: boolean;
}

/**
 * Fusiona el resultado completo del OCR en los campos del formulario.
 *
 * Prioridad deliberada por campo, según qué fuente es confiable para cada uno:
 *   - nombre       → MRZ (línea 3, tipografía OCR-B) antes que el frente
 *   - nacimiento   → MRZ con verificador; si no, se deriva de la CURP; al final el frente
 *   - CURP         → regex en cualquier lado (su formato es autovalidante)
 *   - domicilio    → sólo el frente, no existe en el MRZ
 *   - clave elector→ sólo el frente
 */
export function parseIneData(ocr: {
  frontText: string;
  backText?: string;
  mrzText?: string;
  mrz?: MrzResult | null;
  curp?: string | null;
}): ParsedIneResult {
  const frontText = ocr.frontText ?? '';
  const backText = ocr.backText ?? '';
  const mrz = ocr.mrz ?? null;

  const sources: ParsedIneResult['sources'] = {};

  // --- CURP: su propio formato la valida, así que se acepta de donde salga, pero
  // siempre pasa por el normalizador: `findCurpAnywhere` (en mrzParser) devuelve la
  // coincidencia cruda, sin la corrección posicional que arregla los O/0 del OCR.
  const rawCurp = ocr.curp ?? extractCurp(`${frontText}\n${backText}\n${ocr.mrzText ?? ''}`);
  const curp = rawCurp ? normalizeCurp(rawCurp) : null;
  if (curp) sources.curp = 'curp';

  // --- Nombre: el MRZ gana porque su tipografía está hecha para máquinas.
  let fullName = mrz?.fullName ?? null;
  if (fullName) {
    sources.fullName = 'mrz';
  } else {
    fullName = extractFullName(frontText);
    if (fullName) sources.fullName = 'ocr';
  }

  // --- Nacimiento: MRZ verificado > CURP > MRZ sin verificar.
  let birthDate: string | null = null;
  if (mrz?.birthDate && mrz.checksums.birthDate) {
    birthDate = mrz.birthDate;
    sources.birthDate = 'mrz';
  } else if (curp) {
    birthDate = deriveBirthDateFromCurp(curp);
    if (birthDate) sources.birthDate = 'curp';
  }
  if (!birthDate && mrz?.birthDate) {
    birthDate = mrz.birthDate;
    sources.birthDate = 'mrz';
  }

  const address = extractAddress(frontText);
  if (address) sources.address = 'ocr';

  const idDocument = extractClaveElector(frontText);
  if (idDocument) sources.idDocument = 'ocr';

  // La confianza pesa el MRZ verificado por encima del conteo de campos: dos campos
  // salidos de un MRZ que cuadra valen más que cinco adivinados del frente.
  const fieldsFound = [fullName, curp, birthDate, address, idDocument].filter(Boolean).length;
  const mrzVerified = Boolean(mrz && (mrz.checksums.birthDate || mrz.checksums.documentNumber));

  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (mrzVerified && fieldsFound >= 3) confidence = 'high';
  else if (fieldsFound >= 4) confidence = 'high';
  else if (fieldsFound >= 2) confidence = 'medium';

  return {
    fullName: fullName ?? undefined,
    curp: curp ?? undefined,
    birthDate: birthDate ?? undefined,
    address: address ?? undefined,
    idDocument: idDocument ?? undefined,
    confidence,
    sources,
    mrzVerified,
  };
}
