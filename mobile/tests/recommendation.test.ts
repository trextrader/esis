// mobile/__tests__/recommendation.test.ts
import { generateRecommendation } from '../src/engine/recommendation';
import { StructuredCase, RiskAssessment } from '../src/engine/types';

const acuteCase: StructuredCase = {
  caseId: 'x', timestamp: '', notes: '',
  riskDomains: ['enforcement', 'exposure', 'medical'],
  symptoms: ['pain'],
  constraints: {
    hasShelter: false, wasDisplaced: true, wasThreatenedWithArrest: true,
    recentDischarge: true, lowBattery: true,
  },
};
const acuteRisk: RiskAssessment = {
  medicalRisk: 0.85, exposureRisk: 1.0,
  documentationRisk: 0.6, enforcementRisk: 0.95,
  overallPriority: 'high', requiresEscalation: true,
};

test('acute case produces immediateActions', () => {
  const r = generateRecommendation(acuteCase, acuteRisk);
  expect(r.immediateActions.length).toBeGreaterThan(0);
  expect(r.stabilizationActions.length).toBeGreaterThan(0);
  expect(r.recoveryActions.length).toBeGreaterThan(0);
});

test('acute case does NOT put SOAR in topActions[0]', () => {
  const r = generateRecommendation(acuteCase, acuteRisk);
  expect(r.topActions[0].toLowerCase()).not.toContain('soar');
  expect(r.topActions[0].toLowerCase()).not.toContain('ssi');
  expect(r.topActions[0].toLowerCase()).not.toContain('section 811');
});

test('acute case topActions[0] is about immediate safety', () => {
  const r = generateRecommendation(acuteCase, acuteRisk);
  const firstAction = r.topActions[0].toLowerCase();
  const isSurvival = firstAction.includes('indoor') ||
    firstAction.includes('relocate') || firstAction.includes('shelter') ||
    firstAction.includes('211');
  expect(isSurvival).toBe(true);
});

test('SOAR appears in fallbackPlan for acute case', () => {
  const r = generateRecommendation(acuteCase, acuteRisk);
  expect(r.fallbackPlan.toLowerCase()).toContain('soar');
});

test('non-acute case has empty horizons', () => {
  const lowCase: StructuredCase = {
    caseId: 'y', timestamp: '', notes: '', riskDomains: [],
    symptoms: [], constraints: { hasShelter: true },
  };
  const lowRisk: RiskAssessment = {
    medicalRisk: 0.1, exposureRisk: 0.1, documentationRisk: 0.1,
    enforcementRisk: 0.0, overallPriority: 'low', requiresEscalation: false,
  };
  const r = generateRecommendation(lowCase, lowRisk);
  expect(r.immediateActions).toHaveLength(0);
  expect(r.topActions.length).toBeGreaterThan(0);
});
