// mobile/src/engine/recommendation.ts
import { StructuredCase, RiskAssessment, RecommendationOutput } from './types';

function isAcute(risk: RiskAssessment, c: StructuredCase): boolean {
  return (
    risk.exposureRisk >= 0.85 ||
    (risk.medicalRisk >= 0.80 && !!c.constraints.recentDischarge) ||
    (risk.enforcementRisk >= 0.80 && !!c.constraints.wasDisplaced) ||
    (!c.constraints.hasShelter && risk.exposureRisk >= 0.70)
  );
}

export function generateRecommendation(
  c: StructuredCase,
  risk: RiskAssessment,
): RecommendationOutput {
  const domainsStr = c.riskDomains.length > 0 ? c.riskDomains.join(', ') : 'general support';

  if (isAcute(risk, c)) {
    const h1: string[] = [];
    if (risk.enforcementRisk >= 0.8 && c.constraints.wasDisplaced) {
      h1.push(
        'Relocate to the nearest indoor safe space immediately — current location was ' +
        'compromised by enforcement contact. Call 211 or walk to the nearest warming center or ER.'
      );
    }
    if (risk.exposureRisk >= 0.7 || !c.constraints.hasShelter) {
      h1.push(
        "Request same-night indoor placement now — call 211 and say: 'I need emergency " +
        "shelter tonight. I have a disability, recent hospital discharge, and cold exposure. " +
        "I need a non-congregate placement.' This triggers a different pathway."
      );
    }
    if (h1.length === 0) h1.push('Call 211 immediately for same-night emergency placement');

    const h2: string[] = [];
    if (risk.medicalRisk >= 0.8 || c.constraints.recentDischarge) {
      h2.push(
        "Return to the ER and demand a social work evaluation — not triage. Say: 'I was " +
        "recently discharged and am now homeless with worsening symptoms. I need a social " +
        "worker to document a discharge-to-street event and reinstate my medical respite referral.'"
      );
    }
    if (risk.enforcementRisk >= 0.5) {
      h2.push(
        'Document the enforcement interaction: date, location, officer descriptions, ' +
        'commands given, belongings lost, what was denied. This is evidence for legal aid, ' +
        'case management, and housing pathway restoration.'
      );
    }
    if (h2.length === 0) h2.push('Contact a case manager or outreach worker within 24 hours');

    const h3: string[] = [];
    if (risk.documentationRisk >= 0.5) {
      h3.push('Connect with coordinated entry and Colorado Legal Services (303-837-1321)');
    }
    h3.push('Begin SOAR (SSI/SSDI) application — retroactive to filing date — once stable');

    return {
      summary:
        `Acute survival state — ${domainsStr} risk domains active. Immediate indoor ` +
        `placement and medical continuity are the first priority. Benefits and housing ` +
        `applications follow once tonight is safe.`,
      topActions:           [h1[0], h2[0], h3[0]],
      immediateActions:     h1.slice(0, 2),
      stabilizationActions: h2.slice(0, 2),
      recoveryActions:      h3.slice(0, 2),
      fallbackPlan:
        'If 211 and shelter are unavailable: go to the nearest ER — you have the right to ' +
        'warmth and safety. State your disability and recent discharge. ' +
        'Call 988 or Colorado Crisis Services (844-493-8255). ' +
        'Next steps once stable: SOAR application, HUD 1-800-569-4287, ' +
        'Colorado Legal Services 303-837-1321.',
      whatToPreserve: [
        'Medical records and discharge paperwork — evidence for respite reinstatement',
        'Documentation of enforcement interaction — date, location, what was said',
        'Contact information for any caseworker or advocate',
      ],
    };
  }

  // Non-acute
  const actions: string[] = [];
  if (risk.medicalRisk >= 0.8)      actions.push('Seek emergency medical evaluation immediately');
  if (risk.exposureRisk >= 0.7)     actions.push('Find indoor shelter or warming center now');
  if (risk.documentationRisk >= 0.5)actions.push('Generate referral packet and begin ID replacement');
  if (risk.enforcementRisk >= 0.8) {
    actions.unshift('Relocate immediately — location compromised by enforcement contact');
    actions.push('Document police interaction for advocate or case manager');
  }
  const defaults = [
    'Contact 211 for immediate resource referral',
    'Document your current situation in writing',
    'Identify the nearest support services',
  ];
  for (const d of defaults) {
    if (actions.length >= 3) break;
    actions.push(d);
  }

  return {
    summary: `High-priority case with active risk domains: ${domainsStr}. Immediate intervention required.`,
    topActions:           actions.slice(0, 3),
    immediateActions:     [],
    stabilizationActions: [],
    recoveryActions:      [],
    fallbackPlan: 'Contact 211, go to the nearest ER for safety and warmth, or call 988.',
    whatToPreserve: [
      'Any remaining ID or government documents',
      'Medical records and discharge paperwork',
      'Contact information for caseworkers or advocates',
    ],
  };
}
