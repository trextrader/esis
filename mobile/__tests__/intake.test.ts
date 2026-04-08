// mobile/__tests__/intake.test.ts
import { normalizeCase } from '../src/engine/intake';
import { CaseInput, DEFAULT_CASE_INPUT } from '../src/engine/types';

function inp(overrides: Partial<CaseInput>): CaseInput {
  return { ...DEFAULT_CASE_INPUT, ...overrides };
}

test('detects medical domain from pain checkbox', () => {
  const result = normalizeCase(inp({ hasPain: true }));
  expect(result.riskDomains).toContain('medical');
});

test('detects exposure domain from checkbox', () => {
  const result = normalizeCase(inp({ hasExposureRisk: true }));
  expect(result.riskDomains).toContain('exposure');
});

test('detects enforcement domain from displacement', () => {
  const result = normalizeCase(inp({ wasDisplaced: true }));
  expect(result.riskDomains).toContain('enforcement');
  expect(result.constraints.wasDisplaced).toBe(true);
});

test('detects enforcement from free text keyword', () => {
  const result = normalizeCase(inp({ rawText: 'police told me to leave' }));
  expect(result.riskDomains).toContain('enforcement');
});

test('passes constraints through', () => {
  const result = normalizeCase(inp({
    lowBattery: true, noTransport: true, recentDischarge: true,
  }));
  expect(result.constraints.lowBattery).toBe(true);
  expect(result.constraints.noTransport).toBe(true);
  expect(result.constraints.recentDischarge).toBe(true);
});

test('deduplicates domains', () => {
  const result = normalizeCase(inp({
    hasPain: true,
    rawText: 'pain and injury in hospital',
  }));
  const medCount = result.riskDomains.filter(d => d === 'medical').length;
  expect(medCount).toBe(1);
});
