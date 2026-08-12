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

const ADDRESS_STOP_LABELS = [
  'CLAVE DE ELECTOR',
  'CURP',
  'FECHA DE NACIMIENTO',
  'SEXO',
  'AÑO DE REGISTRO',
  'ANO DE REGISTRO',
  'ESTADO',
  'MUNICIPIO',
  'LOCALIDAD',
  'SECCION',
  'SECCIÓN',
  'EMISION',
  'EMISIÓN',
  'VIGENCIA',
  'INSTITUTO NACIONAL',
];

/**
 * ¿Este renglón puede ser un fragmento real de domicilio, o es ruido del OCR?
 *
 * A diferencia del nombre, una línea de domicilio SÍ puede traer dígitos (número
 * exterior, código postal), así que el filtro es más laxo — pero un domicilio real
 * siempre trae al menos una letra: un fragmento de puros dígitos o símbolos es
 * casi siempre basura de un código de barras o el holograma de seguridad.
 */
const looksLikeAddressFragment = (line: string) => {
  const trimmed = line.trim();
  if (trimmed.length < 3) return false;
  if (ADDRESS_STOP_LABELS.some((label) => trimmed.includes(label))) return false;
  // Si el propio renglón trae un CURP o clave de elector reconocible, el OCR se saltó
  // la etiqueta que debía detener la captura — se corta aquí de todos modos.
  if (CURP_REGEX.test(trimmed) || CLAVE_ELECTOR_REGEX.test(trimmed)) return false;

  // Un domicilio real siempre trae al menos una letra — salvo el código postal, que a
  // veces Tesseract envuelve solo en su propio renglón cuando la línea física se parte.
  // Se distingue de basura de código de barras/holograma por el largo: un CP mexicano
  // son 5 dígitos, así que una racha corta de puros dígitos (4-6) se acepta y cualquier
  // otra cosa sin letras (más larga, más corta, o con símbolos) se rechaza.
  if (!/[A-ZÁÉÍÓÚÜÑ]/.test(trimmed)) {
    return /^\d{4,6}$/.test(trimmed);
  }

  return true;
};

/**
 * Domicilio desde el texto del frente.
 *
 * El domicilio real del INE mide 3 renglones casi siempre (calle y número, colonia y
 * CP, municipio/estado), pero el recorte de la imagen puede hacer que Tesseract envuelva
 * una de esas líneas en dos — con el tope viejo de 3 renglones fijos eso cortaba la
 * dirección a la mitad. Ahora se avanza mientras cada renglón parezca domicilio (con
 * un tope generoso de seguridad) y se corta en la primera etiqueta u otro campo.
 */
export function extractAddress(rawText: string): string | null {
  const lines = toLines(rawText);
  // DOMICILIO es casi siempre legible tal cual, pero se tolera que el OCR pierda la
  // última letra ("DOMICILI0" con cero en vez de O) igual que se hace para NOMBRE.
  const startIdx = lines.findIndex((line) => line.includes('DOMICILI'));
  if (startIdx === -1) return null;

  const MAX_ADDRESS_LINES = 6;
  const addressLines: string[] = [];
  for (let i = startIdx + 1; i < lines.length && addressLines.length < MAX_ADDRESS_LINES; i++) {
    if (!lines[i].trim()) continue; // renglón en blanco: se ignora, no corta la captura
    if (!looksLikeAddressFragment(lines[i])) break;
    addressLines.push(lines[i].trim());
  }

  return addressLines.length ? addressLines.join(', ') : null;
}

// Palabras impresas en la credencial que NO son parte de un nombre. Se comparan como
// palabra completa, no como subcadena: buscar "ESTADO" dentro de la línea descartaría
// apellidos legítimos que la contengan por casualidad.
const NON_NAME_WORDS = new Set([
  'INSTITUTO', 'NACIONAL', 'ELECTORAL', 'CREDENCIAL', 'PARA', 'VOTAR', 'MEXICO', 'MÉXICO',
  'NOMBRE', 'DOMICILIO', 'CLAVE', 'ELECTOR', 'CURP', 'SEXO', 'FECHA', 'NACIMIENTO',
  'EDAD', 'ANO', 'AÑO', 'REGISTRO', 'ESTADO', 'MUNICIPIO', 'LOCALIDAD', 'SECCION',
  'SECCIÓN', 'EMISION', 'EMISIÓN', 'VIGENCIA', 'CALLE', 'COL', 'COLONIA',
]);

const NAME_CHARS = /^[A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ'.\- ]*$/;

/**
 * ¿Esto se ve como el nombre de una persona y no como una etiqueta o basura del OCR?
 *
 * Existe porque el modo de falla del OCR del frente no es devolver nada, es devolver
 * *algo*: media etiqueta, un pedazo del domicilio, o ruido del holograma. Meter eso en
 * el campo del nombre es peor que dejarlo vacío — un campo vacío se ve y se llena, un
 * nombre equivocado se firma en el contrato.
 */
export function looksLikePersonName(value: string): boolean {
  const cleaned = value.trim().replace(/\s+/g, ' ');
  if (cleaned.length < 5 || cleaned.length > 70) return false;
  if (/\d/.test(cleaned)) return false;
  if (!NAME_CHARS.test(cleaned)) return false;

  const words = cleaned.split(' ').filter(Boolean);
  // Un nombre completo trae al menos apellido y nombre.
  if (words.length < 2) return false;
  if (words.some((word) => NON_NAME_WORDS.has(word))) return false;
  // Y al menos una palabra de largo real: "DE LA" solo no es un nombre.
  return words.some((word) => word.length >= 3);
}

/** Las líneas de nombre del INE son sólo letras; sirve para saber dónde cortar. */
const isNameFragment = (line: string) =>
  /^[A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ'.\- ]*$/.test(line.trim()) &&
  line.trim().length >= 2 &&
  !line.trim().split(/\s+/).some((word) => NON_NAME_WORDS.has(word));

/**
 * Nombre desde el texto del frente.
 *
 * El INE moderno imprime el nombre en tres renglones bajo la etiqueta NOMBRE (apellido
 * paterno, apellido materno, nombres); los formatos viejos lo ponen en uno o dos. En vez
 * de tomar ciegamente los 3 siguientes renglones, se avanza mientras cada uno *parezca*
 * un fragmento de nombre y se corta en el primero que no: así una etiqueta o una línea
 * de domicilio que el OCR haya dejado en medio ya no se cuela al campo.
 */
export function extractFullName(rawText: string): string | null {
  const lines = toLines(rawText);
  const labelIdx = lines.findIndex((line) => /\bNOMBRE\b/.test(line));

  const collectFrom = (startIdx: number, sameLineRest = ''): string | null => {
    const fragments: string[] = [];
    // El OCR a veces deja el valor pegado a la etiqueta en el mismo renglón.
    if (sameLineRest && isNameFragment(sameLineRest)) fragments.push(sameLineRest.trim());

    for (let i = startIdx; i < lines.length && fragments.length < 3; i++) {
      if (!isNameFragment(lines[i])) break;
      fragments.push(lines[i].trim());
    }

    if (!fragments.length) return null;
    const candidate = fragments.join(' ').replace(/\s+/g, ' ').trim();
    return looksLikePersonName(candidate) ? candidate : null;
  };

  if (labelIdx !== -1) {
    const rest = lines[labelIdx].split(/\bNOMBRE\b/)[1] ?? '';
    const fromLabel = collectFrom(labelIdx + 1, rest);
    if (fromLabel) return fromLabel;
  }

  // Respaldo estructural para cuando el OCR no leyó la etiqueta "NOMBRE": el nombre es
  // el bloque de renglones de puras letras que está justo antes del domicilio.
  const addressIdx = lines.findIndex((line) => /\bDOMICILIO\b/.test(line));
  if (addressIdx > 0) {
    for (let start = Math.max(0, addressIdx - 3); start < addressIdx; start++) {
      const candidate = collectFrom(start);
      if (candidate) return candidate;
    }
  }

  return null;
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

  // --- Nombre: el MRZ gana porque su tipografía está hecha para máquinas, pero sólo si
  // lo que salió de ahí realmente parece un nombre. Ambas fuentes pasan por el mismo
  // filtro, y si ninguna lo pasa el campo se deja VACÍO a propósito: un nombre
  // equivocado acaba firmado en un contrato, uno vacío se ve y se llena.
  let fullName: string | null = null;
  if (mrz?.fullName && looksLikePersonName(mrz.fullName)) {
    fullName = mrz.fullName;
    sources.fullName = 'mrz';
  } else {
    const fromFront = extractFullName(frontText);
    if (fromFront) {
      fullName = fromFront;
      sources.fullName = 'ocr';
    } else if (mrz?.fullName) {
      // Último recurso: el MRZ dio algo que no pasó el filtro (probablemente parcial),
      // pero el frente no dio nada. Se ofrece marcado como lectura del MRZ para que el
      // admin lo corrija en vez de teclear todo.
      fullName = mrz.fullName;
      sources.fullName = 'mrz';
    }
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
