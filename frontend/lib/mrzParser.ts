// Parser del MRZ (Machine Readable Zone) del reverso del INE.
//
// POR QUÉ EL MRZ Y NO EL FRENTE: el frente de la credencial es lo peor que le puedes
// dar a un OCR — tipografía condensada, fondo con guilloches de seguridad, holograma,
// y un layout que cambió entre las emisiones de 2013, 2019 y 2023. El MRZ es lo
// contrario: tipografía OCR-B diseñada literalmente para que la lea una máquina,
// fondo blanco liso, posiciones fijas por norma, y dígitos verificadores que permiten
// SABER si la lectura salió bien en vez de adivinarlo.
//
// FORMATO: el INE usa TD1 (ICAO 9303 Parte 5): 3 líneas de 30 caracteres.
// (No TD3 — ése es el de pasaportes, 2 líneas de 44. Confundirlos es el error clásico.)
//
//   Línea 1: [0:2] tipo doc  [2:5] estado emisor  [5:14] núm. documento  [14] verif.  [15:30] opcional
//   Línea 2: [0:6] nacimiento  [6] verif.  [7] sexo  [8:14] vencimiento  [14] verif.
//            [15:18] nacionalidad  [18:29] opcional  [29] verificador compuesto
//   Línea 3: [0:30] apellidos<<nombres, relleno con '<'

export interface MrzResult {
  documentNumber?: string;
  birthDate?: string; // ISO yyyy-mm-dd
  expiryDate?: string; // ISO yyyy-mm-dd
  sex?: 'H' | 'M';
  nationality?: string;
  lastName?: string;
  firstName?: string;
  fullName?: string;
  /** Cuántas de las 3 líneas se localizaron. La 3 (nombres) sirve incluso sola. */
  linesFound: number;
  /** Dígitos verificadores que cuadraron, por campo. */
  checksums: { birthDate: boolean; expiryDate: boolean; documentNumber: boolean };
}

const MRZ_LINE_LENGTH = 30;

// Confusiones típicas del OCR. Se aplican según el TIPO del campo, no a ciegas:
// en una fecha, una "O" sólo puede ser un 0; en un apellido, un "0" sólo puede ser O.
// Corregir sabiendo qué campo es se lleva la mayor parte de las lecturas fallidas.
const TO_DIGIT: Record<string, string> = {
  O: '0', Q: '0', D: '0', U: '0',
  I: '1', L: '1', T: '7',
  Z: '2', E: '3', A: '4',
  S: '5', G: '6', B: '8',
};

const TO_ALPHA: Record<string, string> = {
  '0': 'O', '1': 'I', '2': 'Z', '4': 'A', '5': 'S', '6': 'G', '8': 'B',
};

const coerceNumeric = (value: string) =>
  value.replace(/[^0-9]/g, (char) => TO_DIGIT[char] ?? '');

const coerceAlpha = (value: string) =>
  value.replace(/[0-9]/g, (char) => TO_ALPHA[char] ?? '');

/**
 * Dígito verificador ICAO: pesos 7-3-1 cíclicos, letras valen 10..35, '<' vale 0.
 * Es lo que convierte al MRZ en una fuente confiable: si cuadra, la lectura es buena.
 */
function computeCheckDigit(input: string): number {
  const weights = [7, 3, 1];
  let sum = 0;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    let value: number;

    if (char >= '0' && char <= '9') {
      value = char.charCodeAt(0) - 48;
    } else if (char >= 'A' && char <= 'Z') {
      value = char.charCodeAt(0) - 55; // 'A' → 10
    } else {
      value = 0; // '<' y cualquier basura del OCR
    }

    sum += value * weights[i % 3];
  }

  return sum % 10;
}

function verifyCheckDigit(field: string, checkChar: string): boolean {
  const expected = coerceNumeric(checkChar);
  if (expected.length !== 1) return false;
  return computeCheckDigit(field) === Number(expected);
}

/**
 * YYMMDD → ISO. El MRZ no lleva siglo, así que se pivota sobre el año actual:
 * un "95" no puede ser 2095 (sería futuro), un "05" sí puede ser 2005.
 */
function parseMrzDate(raw: string, allowFuture: boolean): string | undefined {
  const digits = coerceNumeric(raw);
  if (digits.length !== 6) return undefined;

  const yy = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const day = Number(digits.slice(4, 6));
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;

  const currentYY = new Date().getFullYear() % 100;
  // El vencimiento sí está en el futuro; el nacimiento nunca.
  const year = allowFuture ? 2000 + yy : yy <= currentYY ? 2000 + yy : 1900 + yy;

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Normaliza el texto OCR al alfabeto del MRZ y devuelve líneas candidatas. */
function findMrzLines(ocrText: string): string[] {
  const normalized = ocrText
    .toUpperCase()
    // Variantes de chevron que el OCR inventa a partir de '<'.
    .replace(/[«‹＜]/g, '<')
    .replace(/[^A-Z0-9<\n]/g, '');

  return normalized
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => {
      // El MRZ real trae 30 caracteres; se acepta ruido de ±10.
      if (line.length < 20 || line.length > 40) return false;
      // Exigir al menos un '<' es lo que separa un MRZ de la prosa: al normalizar se
      // quitan los espacios, así que un renglón de texto común queda como una tira de
      // puras letras y pasaría cualquier filtro basado sólo en el alfabeto. Las tres
      // líneas TD1 llevan relleno '<'; una oración normal, nunca.
      if (!line.includes('<')) return false;
      const mrzChars = (line.match(/[A-Z0-9<]/g) ?? []).length;
      return mrzChars / line.length > 0.9;
    });
}

/**
 * ¿Los primeros 6 caracteres son una fecha YYMMDD plausible tras corregir confusiones?
 *
 * Se valida la fecha de verdad en vez de comparar contra una clase de caracteres:
 * la lista de letras que el OCR confunde con dígitos (O, D, I, L, S, G, B, A, E, Z...)
 * es tan amplia que palabras enteras como "ALGODE" la satisfacen.
 */
function startsWithPlausibleDate(line: string): boolean {
  const digits = coerceNumeric(line.slice(0, 6));
  if (digits.length !== 6) return false;
  const month = Number(digits.slice(2, 4));
  const day = Number(digits.slice(4, 6));
  return month >= 1 && month <= 12 && day >= 1 && day <= 31;
}

const padLine = (line: string) =>
  line.length >= MRZ_LINE_LENGTH
    ? line.slice(0, MRZ_LINE_LENGTH)
    : line.padEnd(MRZ_LINE_LENGTH, '<');

/** La línea de nombres es la única sin verificador, pero es la más valiosa y la más legible. */
function parseNameLine(line: string): { lastName?: string; firstName?: string; fullName?: string } {
  const cleaned = coerceAlpha(line).replace(/<+$/, '');
  const [surnamePart, ...givenParts] = cleaned.split('<<');

  const toWords = (value: string) =>
    value
      .split('<')
      .map((word) => word.trim())
      .filter((word) => word.length > 1)
      .join(' ')
      .trim();

  const lastName = toWords(surnamePart ?? '');
  const firstName = toWords(givenParts.join('<'));

  if (!lastName && !firstName) return {};

  // El INE muestra "NOMBRE APELLIDOS" en ese orden; se respeta para que el campo
  // del formulario coincida con lo que el admin ve en la credencial.
  const fullName = [firstName, lastName].filter(Boolean).join(' ');
  return {
    lastName: lastName || undefined,
    firstName: firstName || undefined,
    fullName: fullName || undefined,
  };
}

/**
 * Extrae los datos del MRZ del texto OCR crudo del reverso.
 *
 * Devuelve resultados PARCIALES a propósito: si sólo se pudo leer la línea de
 * nombres, eso ya vale más que nada, y el formulario de revisión permite corregir.
 */
export function extractMrzData(ocrText: string): MrzResult | null {
  const candidates = findMrzLines(ocrText);
  if (candidates.length === 0) return null;

  const result: MrzResult = {
    linesFound: 0,
    checksums: { birthDate: false, expiryDate: false, documentNumber: false },
  };

  // Identificar cada línea por su forma, no por su posición: el OCR se salta
  // renglones y mete basura entre ellos, así que el orden no es de fiar.
  //
  // El orden de descarte importa: las líneas 1 y 2 también terminan en relleno '<<<',
  // así que buscar la línea de nombres sólo por "contiene <<" las agarraría primero.
  // Se identifica la 1 por su prefijo (IDMEX), la 2 por empezar con la fecha, y la
  // de nombres es la que queda.
  const line1 = candidates.find((line) => /^I[DPM<]?[A-Z]{2,3}/.test(line));
  const line2 = candidates.find((line) => line !== line1 && startsWithPlausibleDate(line));
  const line3 = candidates.find(
    (line) => line !== line1 && line !== line2 && line.includes('<<'),
  );

  if (line1) {
    result.linesFound++;
    const padded = padLine(line1);
    const documentNumber = padded.slice(5, 14).replace(/</g, '');
    if (documentNumber) {
      result.documentNumber = documentNumber;
      result.checksums.documentNumber = verifyCheckDigit(padded.slice(5, 14), padded[14]);
    }
  }

  if (line2) {
    result.linesFound++;
    const padded = padLine(line2);

    const birthDate = parseMrzDate(padded.slice(0, 6), false);
    if (birthDate) {
      result.birthDate = birthDate;
      result.checksums.birthDate = verifyCheckDigit(coerceNumeric(padded.slice(0, 6)), padded[6]);
    }

    const expiryDate = parseMrzDate(padded.slice(8, 14), true);
    if (expiryDate) {
      result.expiryDate = expiryDate;
      result.checksums.expiryDate = verifyCheckDigit(coerceNumeric(padded.slice(8, 14)), padded[14]);
    }

    // OJO: el MRZ marca sexo en inglés (M=male, F=female) y el INE en español
    // (H=hombre, M=mujer). La 'M' significa lo contrario en cada uno.
    const sexChar = padded[7];
    if (sexChar === 'M') result.sex = 'H';
    else if (sexChar === 'F') result.sex = 'M';

    const nationality = coerceAlpha(padded.slice(15, 18)).replace(/</g, '');
    if (nationality.length === 3) result.nationality = nationality;
  }

  if (line3) {
    result.linesFound++;
    Object.assign(result, parseNameLine(padLine(line3)));
  }

  return result.linesFound > 0 ? result : null;
}

/**
 * El CURP no forma parte del estándar TD1, pero el INE lo imprime en el reverso
 * junto al MRZ (y en el frente). Su formato es tan específico que se puede cazar
 * con regex en cualquier parte del texto sin ancla de etiqueta.
 */
export function findCurpAnywhere(text: string): string | null {
  const flat = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const match = flat.match(/[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z\d]\d/);
  return match ? match[0] : null;
}
