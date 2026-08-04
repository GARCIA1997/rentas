import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateSuggestedRent,
  getNextPaymentDateFromDay,
  isContractRenewalEligible,
} from './rentCalculation.js';

describe('calculateSuggestedRent', () => {
  test('aplica 7% y redondea hacia arriba a la decena', () => {
    assert.equal(calculateSuggestedRent(6000), 6420); // 6420 exacto
    assert.equal(calculateSuggestedRent(5000), 5350); // 5350 exacto
    assert.equal(calculateSuggestedRent(8500), 9100); // 9095 -> 9100
  });

  test('acepta el monto como string, que es como llega de Prisma Decimal', () => {
    assert.equal(calculateSuggestedRent('8500'), 9100);
  });

  test('nunca sugiere menos que la renta actual', () => {
    for (const rent of [1, 100, 999, 12345]) {
      assert.ok(calculateSuggestedRent(rent) >= rent, `falló con renta ${rent}`);
    }
  });
});

describe('getNextPaymentDateFromDay', () => {
  test('cae en el mes siguiente al de referencia', () => {
    const next = getNextPaymentDateFromDay(new Date('2026-01-15T00:00:00Z'), 7);
    assert.equal(next.getUTCMonth(), 1); // febrero
    assert.equal(next.getUTCDate(), 7);
  });

  test('topa el día en 28 para que exista en cualquier mes', () => {
    const next = getNextPaymentDateFromDay(new Date('2026-01-15T00:00:00Z'), 31);
    assert.equal(next.getUTCDate(), 28);
  });
});

describe('isContractRenewalEligible', () => {
  const enDias = (dias) => new Date(Date.now() + dias * 24 * 60 * 60 * 1000);

  test('es elegible un contrato ACTIVE que vence dentro de 2 meses', () => {
    assert.equal(isContractRenewalEligible({ status: 'ACTIVE', endDate: enDias(30) }), true);
  });

  test('no es elegible si vence a más de 2 meses', () => {
    assert.equal(isContractRenewalEligible({ status: 'ACTIVE', endDate: enDias(120) }), false);
  });

  test('no es elegible si ya venció', () => {
    assert.equal(isContractRenewalEligible({ status: 'ACTIVE', endDate: enDias(-1) }), false);
  });

  test('no es elegible si no está ACTIVE', () => {
    for (const status of ['DRAFT', 'EXPIRED', 'CANCELLED']) {
      assert.equal(isContractRenewalEligible({ status, endDate: enDias(30) }), false, status);
    }
  });
});
