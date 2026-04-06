from __future__ import annotations
# app/services/audit_service.py
from app.api.schemas import StructuredCase, RiskAssessment, RecommendationOutput
from typing import List


def generate_audit(
    case: StructuredCase,
    risk: RiskAssessment,
    recommendation: RecommendationOutput,
) -> dict:
    triggered_flags: List[str] = []
    if risk.medical_risk >= 0.8:
        triggered_flags.append(f"Medical risk threshold exceeded ({risk.medical_risk:.2f} >= 0.80)")
    if risk.exposure_risk >= 0.7:
        triggered_flags.append(f"Exposure risk threshold exceeded ({risk.exposure_risk:.2f} >= 0.70)")
    if risk.documentation_risk >= 0.5:
        triggered_flags.append(f"Documentation failure risk elevated ({risk.documentation_risk:.2f} >= 0.50)")
    if risk.requires_escalation:
        triggered_flags.append("Escalation required — at least one risk dimension >= 0.80")

    active_constraints = [k for k, v in case.constraints.items() if v]
    suppressed = [d for d in ["medical", "exposure", "documents"] if d not in case.risk_domains]
    primary = case.risk_domains[0] if case.risk_domains else "general"

    return {
        "case_id": case.case_id,
        "triggered_flags": triggered_flags,
        "active_constraints": active_constraints,
        "risk_scores": {
            "medical": round(risk.medical_risk, 3),
            "exposure": round(risk.exposure_risk, 3),
            "documentation": round(risk.documentation_risk, 3),
        },
        "pathway_selected": primary,
        "why_this_route": (
            f"Primary pathway '{primary}' selected based on highest domain risk score. "
            f"{len(triggered_flags)} risk flag(s) triggered. "
            f"Suppressed pathways: {suppressed if suppressed else 'none'}."
        ),
        "suppressed_alternatives": suppressed,
        "escalation_required": risk.requires_escalation,
    }
