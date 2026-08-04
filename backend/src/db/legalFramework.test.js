import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveJurisdiction,
  resolveTenancyLaw,
  maxLegalTermYears,
  checkStatutoryCompliance,
  buildLegalBasisText,
  buildJurisdictionText,
} from './legalFramework.js';

describe('resolveJurisdiction', () => {
  test('mapea las ciudades dadas de alta a su entidad', () => {
    assert.equal(resolveJurisdiction('Coahuayana de Hidalgo').state, 'Michoacán de Ocampo');
    assert.equal(resolveJurisdiction('Villa de Álvarez, Colima').state, 'Colima');
  });

  test('tolera variaciones de captura y acentos', () => {
    assert.equal(resolveJurisdiction('COAHUAYANA').state, 'Michoacán de Ocampo');
    assert.equal(resolveJurisdiction('Villa de Alvarez').state, 'Colima');
  });

  test('cae al default cuando la ciudad es desconocida o falta', () => {
    assert.equal(resolveJurisdiction('Ciudad Inventada').state, 'Michoacán de Ocampo');
    assert.equal(resolveJurisdiction().state, 'Michoacán de Ocampo');
  });
});

describe('resolveTenancyLaw', () => {
  const michoacan = resolveJurisdiction('Coahuayana de Hidalgo');
  const colima = resolveJurisdiction('Villa de Álvarez, Colima');

  test('la Ley Inquilinaria de Michoacán aplica sólo a vivienda', () => {
    assert.ok(resolveTenancyLaw(michoacan, 'HOUSE'));
    assert.equal(resolveTenancyLaw(michoacan, 'LOCAL'), null);
  });

  test('Colima no tiene ley inquilinaria registrada', () => {
    assert.equal(resolveTenancyLaw(colima, 'HOUSE'), null);
  });
});

describe('maxLegalTermYears', () => {
  test('10 años para habitación y 15 para comercio', () => {
    assert.equal(maxLegalTermYears('HOUSE'), 10);
    assert.equal(maxLegalTermYears('LOCAL'), 15);
  });
});

describe('checkStatutoryCompliance', () => {
  const vivienda = (extra) => ({
    city: 'Coahuayana de Hidalgo',
    propertyType: 'HOUSE',
    monthlyRent: 8500,
    depositAmount: 8500,
    durationMonths: 12,
    ...extra,
  });

  test('un contrato conforme no genera observaciones', () => {
    assert.deepEqual(checkStatutoryCompliance(vivienda()), []);
  });

  test('señala el depósito mayor a un mes (art. 15)', () => {
    const issues = checkStatutoryCompliance(vivienda({ depositAmount: 17000 }));
    assert.equal(issues.length, 1);
    assert.match(issues[0], /art\. 15/);
  });

  test('señala el plazo menor a un año (art. 14)', () => {
    const issues = checkStatutoryCompliance(vivienda({ durationMonths: 6 }));
    assert.equal(issues.length, 1);
    assert.match(issues[0], /art\. 14/);
  });

  test('no aplica los topes a locales comerciales', () => {
    const issues = checkStatutoryCompliance(vivienda({ propertyType: 'LOCAL', depositAmount: 34000 }));
    assert.deepEqual(issues, []);
  });

  test('no aplica los topes fuera de Michoacán', () => {
    const issues = checkStatutoryCompliance(
      vivienda({ city: 'Villa de Álvarez, Colima', depositAmount: 25500 })
    );
    assert.deepEqual(issues, []);
  });

  test('no revienta cuando la renta es cero', () => {
    assert.doesNotThrow(() => checkStatutoryCompliance(vivienda({ monthlyRent: 0 })));
  });
});

describe('textos legales', () => {
  const michoacan = resolveJurisdiction('Coahuayana de Hidalgo');
  const colima = resolveJurisdiction('Villa de Álvarez, Colima');

  test('la vivienda en Michoacán invoca la Ley Inquilinaria', () => {
    const texto = buildLegalBasisText(michoacan, 'HOUSE');
    assert.match(texto, /Ley Inquilinaria del Estado de Michoacán/);
    assert.match(texto, /irrenunciables/);
    assert.match(texto, /10 años/);
  });

  test('el local comercial en Michoacán no la invoca y usa 15 años', () => {
    const texto = buildLegalBasisText(michoacan, 'LOCAL');
    assert.doesNotMatch(texto, /Ley Inquilinaria/);
    assert.match(texto, /15 años/);
  });

  test('Colima cita su articulado verificado', () => {
    const texto = buildLegalBasisText(colima, 'HOUSE');
    assert.match(texto, /Código Civil para el Estado de Colima/);
    assert.match(texto, /2288/); // objeto y plazos
    assert.match(texto, /2379/); // causas de rescisión
  });

  test('no se citan artículos del código civil de Michoacán, que no se verificaron', () => {
    const texto = buildLegalBasisText(michoacan, 'LOCAL');
    assert.match(texto, /Código Civil para el Estado de Michoacán de Ocampo/);
    assert.doesNotMatch(texto, /Michoacán de Ocampo<\/strong> \(arts\./);
  });

  test('la jurisdicción nombra la entidad y salva las normas de orden público', () => {
    const texto = buildJurisdictionText(michoacan, 'HOUSE');
    assert.match(texto, /Estado de Michoacán de Ocampo/);
    assert.match(texto, /se tendrán por no puestas/);
  });
});
