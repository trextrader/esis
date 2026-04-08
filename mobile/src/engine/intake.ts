// mobile/src/engine/intake.ts
import { CaseInput, StructuredCase } from './types';

const MEDICAL_KEYWORDS    = ['pain','infection','hospital','discharged','medication','injury','fever','wound'];
const EXPOSURE_KEYWORDS   = ['freezing','cold','heat','outside','weather','exposure','night'];
const DOCUMENT_KEYWORDS   = ['lost','id','documents','paperwork','referral','caseworker','records'];
const ENFORCEMENT_KEYWORDS= ['police','cop','officer','arrested','displaced','trespass','warrant','dispersed'];

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function normalizeCase(inp: CaseInput): StructuredCase {
  const text = inp.rawText.toLowerCase();
  const domains: string[] = [];

  if (inp.hasPain || inp.recentDischarge)                              domains.push('medical');
  if (inp.hasExposureRisk)                                             domains.push('exposure');
  if (inp.hasLostDocuments)                                            domains.push('documents');
  if (inp.hasPoliceContact || inp.wasDisplaced || inp.wasThreatenedWithArrest) domains.push('enforcement');

  if (MEDICAL_KEYWORDS.some(k => text.includes(k))     && !domains.includes('medical'))     domains.push('medical');
  if (EXPOSURE_KEYWORDS.some(k => text.includes(k))    && !domains.includes('exposure'))    domains.push('exposure');
  if (DOCUMENT_KEYWORDS.some(k => text.includes(k))    && !domains.includes('documents'))   domains.push('documents');
  if (ENFORCEMENT_KEYWORDS.some(k => text.includes(k)) && !domains.includes('enforcement')) domains.push('enforcement');

  const symptomWords = ['pain','infection','fever','wound','bleeding'];
  const symptoms = symptomWords.filter(w => text.includes(w));

  return {
    caseId:     uid(),
    timestamp:  new Date().toISOString(),
    riskDomains: [...new Set(domains)],
    symptoms,
    constraints: {
      lowBattery:                       inp.lowBattery,
      lowFunds:                         inp.lowFunds,
      noTransport:                      inp.noTransport,
      hasShelter:                       inp.hasShelter,
      recentDischarge:                  inp.recentDischarge,
      hasPoliceContact:                 inp.hasPoliceContact,
      wasDisplaced:                     inp.wasDisplaced,
      wasThreatenedWithArrest:          inp.wasThreatenedWithArrest,
      lostBelongingsDueToInteraction:   inp.lostBelongingsDueToInteraction,
    },
    notes: inp.rawText.slice(0, 500),
  };
}
