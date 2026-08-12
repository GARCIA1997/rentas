// Funciones puras sobre texto OCR crudo del INE (credencial para votar). No dependen del
// motor de OCR usado (tesseract.js) ni de React — sólo reciben el texto ya reconocido.
//
// La fecha de nacimiento se deriva de la CURP en vez de buscarla por la etiqueta
// "FECHA DE NACIMIENTO": la CURP es matcheable por regex sin importar el layout/ruido
// del OCR, mientras que el valor junto a una etiqueta depende de que el OCR haya
// preservado el orden de líneas correctamente.

export interface ParsedIneData {
  fullName?: string;
  curp?: string;
  birthDate?: string; // ISO yyyy-mm-dd
  address?: string;
  idDocument?: string; // Clave de elector
}

const CURP_REGEX = /[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d/;

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

export function extractCurp(rawText: string): string | null {
  const flat = stripNonAlnum(rawText);
  const match = flat.match(CURP_REGEX);
  return match ? match[0] : null;
}

// Posiciones 5-10 de la CURP codifican AAMMDD. El diferenciador de siglo (posición 17)
// es un dígito para nacidos antes de 2000 y una letra para nacidos de 2000 en adelante.
export function deriveBirthDateFromCurp(curp: string): string | null {
  if (!CURP_REGEX.test(curp) || curp.length !== 18) return null;

  const yy = curp.slice(4, 6);
  const mm = curp.slice(6, 8);
  const dd = curp.slice(8, 10);
  const centuryDigit = curp[16];
  const century = /[0-9]/.test(centuryDigit) ? 1900 : 2000;

  const year = century + parseInt(yy, 10);
  const month = parseInt(mm, 10);
  const day = parseInt(dd, 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function extractClaveElector(rawText: string): string | null {
  const lines = toLines(rawText);
  const token = findTokenNearLabel(lines, 'CLAVE DE ELECTOR', 13);
  if (!token) return null;

  const match = token.match(/[A-Z0-9]{13,18}/);
  return match ? match[0].slice(0, 18) : null;
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

  // Buscar CURP con mayor tolerancia — puede estar entre ruido de códigos de barras
  let curp = extractCurp(combined);
  if (!curp) {
    // Intento alternativo: buscar el patrón CURP incluso si hay caracteres raros alrededor
    const curpMatch = combined.match(/[A-Z]{4}\d{6}[HM][A-Z]{5}[\w]{2}\d/);
    if (curpMatch) {
      curp = curpMatch[0].substring(0, 18);
    }
  }

  return {
    fullName: extractFullName(frontText) ?? undefined,
    curp: curp ?? undefined,
    birthDate: curp ? deriveBirthDateFromCurp(curp) ?? undefined : undefined,
    address: extractAddress(frontText) ?? undefined,
    idDocument: extractClaveElector(frontText) ?? undefined,
  };
}
