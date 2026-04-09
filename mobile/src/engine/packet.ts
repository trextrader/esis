// mobile/src/engine/packet.ts
// TypeScript port of app/services/packet_service.py
import { StructuredCase, RiskAssessment, RecommendationOutput, CasePacket } from './types';

export function generatePacket(
  c: StructuredCase,
  risk: RiskAssessment,
  rec: RecommendationOutput,
): CasePacket {
  const priorityLabel = risk.overallPriority.toUpperCase();
  const domainsStr = c.riskDomains.length > 0 ? c.riskDomains.join(', ') : 'general';
  const firstAction = rec.topActions[0] || 'immediate triage';

  const enforcementNote = risk.enforcementRisk >= 0.5
    ? '⚠️ Enforcement interaction contributed to current instability. Displacement or criminalization risk observed. '
    : '';

  const onePageSummary =
    `${enforcementNote}` +
    `[${priorityLabel} PRIORITY] Individual presenting with ${domainsStr} risk. ` +
    `Medical risk: ${Math.round(risk.medicalRisk * 100)}%. ` +
    `Exposure risk: ${Math.round(risk.exposureRisk * 100)}%. ` +
    rec.summary;

  const advocateScript =
    `Hello, I am calling on behalf of an individual in crisis who needs immediate assistance. ` +
    `This person has been assessed with ${priorityLabel} priority needs in: ${domainsStr}. ` +
    `The recommended next step is: ${firstAction}. ` +
    `This person ${risk.requiresEscalation ? 'requires escalation' : 'needs prompt support'}. ` +
    `Can you please confirm availability and next steps?`;

  const now = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
  const referralLines = [
    `ESIS Referral — ${now}`,
    `Case ID: ${c.caseId}`,
    `Priority: ${priorityLabel}`,
    `Active Domains: ${domainsStr}`,
    '',
    'Recommended Actions:',
    ...rec.topActions.map((a, i) => `  ${i + 1}. ${a}`),
  ];

  return {
    caseId: c.caseId,
    createdAt: new Date().toISOString(),
    onePageSummary,
    advocateScript,
    referralHandoff: referralLines.join('\n'),
    actionTimeline: rec.topActions,
    preservationChecklist: rec.whatToPreserve,
  };
}
