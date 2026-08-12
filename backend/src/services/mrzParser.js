// Parser para el MRZ (Machine Readable Zone) del reverso del INE.
// El MRZ es mucho más confiable que el OCR del frente porque está en formato
// estandarizado y usa tipografía limpia diseñada específicamente para máquinas.

/**
 * @typedef {Object} MrzData
 * @property {string} [lastName]
 * @property {string} [firstName]
 * @property {string} [birthDate] - YYMMDD
 * @property {string} [sex] - M/F/X
 * @property {string} [curp]
 * @property {string} [nationality]
 * @property {string} [documentNumber]
 */

// Valida el checksum de una línea MRZ usando el algoritmo ICAO Doc 9303
function validateMrzChecksum(line, checksumPosition) {
  const weights = [7, 3, 1];
  let sum = 0;

  for (let i = 0; i < checksumPosition; i++) {
    const char = line[i];
    let value;

    if (char >= '0' && char <= '9') {
      value = parseInt(char, 10);
    } else if (char >= 'A' && char <= 'Z') {
      value = char.charCodeAt(0) - 'A'.charCodeAt(0) + 10;
    } else if (char === '<') {
      value = 0;
    } else {
      return false; // Carácter inválido
    }

    sum += value * weights[i % 3];
  }

  const calculatedChecksum = sum % 10;
  const providedChecksum = parseInt(line[checksumPosition], 10);

  return calculatedChecksum === providedChecksum;
}

// Busca líneas de MRZ en el texto OCR crudo.
// El MRZ típicamente aparece como 2 líneas de 44 caracteres con << como separadores.
function findMrzLines(text) {
  const lines = text.split('\n');
  const mrzLines = [];

  for (const line of lines) {
    // MRZ tiene exactamente 44 caracteres y contiene <<
    if (line.length >= 44 && line.includes('<<')) {
      const trimmedLine = line.substring(0, 44);
      // Validar que es principalmente alfanumérico y <<
      if (/^[A-Z0-9<]{44}$/.test(trimmedLine)) {
        mrzLines.push(trimmedLine);
      }
    }
  }

  return mrzLines;
}

// Parsea un par de líneas MRZ válidas (formato TD3: pasaportes e INE)
export function parseMrzLines(line1, line2) {
  const data = {};

  try {
    // Validar checksums (formato TD3)
    if (!validateMrzChecksum(line1, 43) || !validateMrzChecksum(line2, 43)) {
      console.warn('MRZ checksums no válidos');
      return null;
    }

    // Línea 1: Tipo documento (2) + País (3) + Apellidos (39, pad con <<)
    // Línea 2: Número documento (9) + Nacionalidad (3) + Fecha nac (6) + Sexo (1) + Vencimiento (6) + resto

    // Apellidos y nombres desde línea 1
    const nameFields = line1.substring(5, 44).split('<<').filter(Boolean);
    if (nameFields.length >= 1) {
      data.lastName = nameFields[0].trim();
    }
    if (nameFields.length >= 2) {
      data.firstName = nameFields[1].trim();
    }

    // Número de documento (9 caracteres) + checksum
    data.documentNumber = line2.substring(0, 9).trim();

    // Nacionalidad (3 caracteres)
    data.nationality = line2.substring(10, 13).trim();

    // Fecha de nacimiento (YYMMDD) + checksum
    const birthDateStr = line2.substring(13, 19);
    if (/^\d{6}$/.test(birthDateStr)) {
      // Convertir YYMMDD a YYYY-MM-DD
      const yy = parseInt(birthDateStr.substring(0, 2), 10);
      const mm = birthDateStr.substring(2, 4);
      const dd = birthDateStr.substring(4, 6);
      // Usar lógica de siglo similar a CURP: < 50 = 2000s, >= 50 = 1900s
      const century = yy < 50 ? 2000 : 1900;
      const yyyy = century + yy;
      data.birthDate = `${yyyy}-${mm}-${dd}`;
    }

    // Sexo (M/F/X)
    data.sex = line2.substring(20, 21);

    return data;
  } catch (error) {
    console.error('Error parsing MRZ:', error);
    return null;
  }
}

// Función principal: extrae datos del MRZ del texto OCR crudo
export function extractMrzData(ocrText) {
  const mrzLines = findMrzLines(ocrText);

  if (mrzLines.length < 2) {
    return null; // No se encontraron suficientes líneas MRZ
  }

  return parseMrzLines(mrzLines[0], mrzLines[1]);
}

// Busca el CURP dentro de las líneas MRZ (algunos formatos lo incluyen)
export function extractCurpFromMrz(ocrText) {
  // El CURP a veces está en la sección adicional del MRZ o cerca del MRZ
  const curpMatch = ocrText.match(/[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z\d]\d/);
  return curpMatch ? curpMatch[0] : null;
}
