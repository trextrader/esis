// mobile/__tests__/triage.test.ts
import { scoreRisk } from '../src/engine/triage';
import { StructuredCase } from '../src/engine/types';

function sc(overrides: Partial<StructuredCase>): StructuredCase {
  return {
    caseId: 'test',
    timestamp: '',
    riskDomains: [],
    symptoms: [],
    constraints: {},
    notes: '',
    ...overrides,
  };
}

test('medical risk high on discharge with pain', () => {
  const r = scoreRisk(sc({
    riskDomains: ['medical'],
    symptoms: ['pain', 'infection'],
    constraints: { recentDischarge: true, hasShelter: false },
  }));
  expect(r.medicalRisk).toBeGreaterThanOrEqual(0.8);
  expect(r.requiresEscalation).toBe(true);
});

test('exposure risk high on cold no shelter', () => {
  const r = scoreRisk(sc({
    riskDomains: ['exposure'],
    constraints: { hasShelter: false, lowBattery: true },
  }));
  expect(r.exposureRisk).toBeGreaterThanOrEqual(0.7);
});

test('enforcement risk high on displacement and threat', () => {
  const r = scoreRisk(sc({
    riskDomains: ['enforcement'],
    constraints: { wasDisplaced: true, wasThreatenedWithArrest: true, hasShelter: false },
  }));
  expect(r.enforcementRisk).toBeGreaterThanOrEqual(0.9);
  expect(r.requiresEscalation).toBe(true);
});

test('low risk case', () => {
  const r = scoreRisk(sc({ constraints: { hasShelter: true } }));
  expect(r.overallPriority).toBe('low');
  expect(r.requiresEscalation).toBe(false);
});

test('priority derived from max risk', () => {
  const r = scoreRisk(sc({
    riskDomains: ['enforcement'],
    constraints: { wasDisplaced: true, wasThreatenedWithArrest: true, hasShelter: false },
  }));
  expect(r.overallPriority).toBe('high');
});
