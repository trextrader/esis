// mobile/src/engine/triage.ts
import { StructuredCase, RiskAssessment } from './types';

const clamp = (v: number) => Math.max(0, Math.min(1, v));

function scoreMedical(c: StructuredCase): number {
  let s = 0;
  if (c.riskDomains.includes('medical'))          s += 0.4;
  s += Math.min(c.symptoms.length * 0.15, 0.3);
  if (c.constraints.recentDischarge)              s += 0.2;
  if (!c.constraints.hasShelter)                  s += 0.1;
  const severe = new Set(['infection','sepsis','fever','wound']);
  if (c.symptoms.some(sym => severe.has(sym)))    s += 0.2;
  return clamp(s);
}

function scoreExposure(c: StructuredCase): number {
  let s = 0;
  if (c.riskDomains.includes('exposure'))         s += 0.5;
  if (!c.constraints.hasShelter)                  s += 0.2;
  if (c.constraints.lowBattery)                   s += 0.15;
  if (c.constraints.lowFunds)                     s += 0.1;
  if (c.constraints.noTransport)                  s += 0.1;
  return clamp(s);
}

function scoreDocuments(c: StructuredCase): number {
  let s = 0;
  if (c.riskDomains.includes('documents'))        s += 0.5;
  if (!c.constraints.hasShelter)                  s += 0.1;
  return clamp(s);
}

function scoreEnforcement(c: StructuredCase): number {
  let s = 0;
  if (c.riskDomains.includes('enforcement'))             s += 0.4;
  if (c.constraints.wasDisplaced)                        s += 0.25;
  if (c.constraints.wasThreatenedWithArrest)             s += 0.2;
  if (c.constraints.lostBelongingsDueToInteraction)      s += 0.2;
  if (!c.constraints.hasShelter)                         s += 0.1;
  return clamp(s);
}

export function scoreRisk(c: StructuredCase): RiskAssessment {
  const medical      = scoreMedical(c);
  const exposure     = scoreExposure(c);
  const documentation= scoreDocuments(c);
  const enforcement  = scoreEnforcement(c);
  const maxRisk      = Math.max(medical, exposure, documentation, enforcement);
  return {
    medicalRisk:      medical,
    exposureRisk:     exposure,
    documentationRisk:documentation,
    enforcementRisk:  enforcement,
    overallPriority:  maxRisk >= 0.8 ? 'high' : maxRisk >= 0.5 ? 'medium' : 'low',
    requiresEscalation: maxRisk >= 0.8,
  };
}
