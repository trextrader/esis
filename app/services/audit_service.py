from __future__ import annotations
# app/services/audit_service.py
from app.api.schemas import StructuredCase, RiskAssessment, RecommendationOutput
from typing import List, Optional


def generate_audit(
    case: StructuredCase,
    risk: RiskAssessment,
    recommendation: RecommendationOutput,
    primary_pathway: Optional[str] = None,
) -> dict:
    triggered_flags: List[str] = []
    if risk.medical_risk >= 0.8:
        triggered_flags.append(f"Medical risk threshold exceeded ({risk.medical_risk:.2f} >= 0.80)")
    if risk.exposure_risk >= 0.7:
        triggered_flags.append(f"Exposure risk threshold exceeded ({risk.exposure_risk:.2f} >= 0.70)")
    if risk.documentation_risk >= 0.5:
        triggered_flags.append(f"Documentation failure risk elevated ({risk.documentation_risk:.2f} >= 0.50)")
    if risk.enforcement_risk >= 0.5:
        triggered_flags.append(f"Enforcement-driven harm risk elevated ({risk.enforcement_risk:.2f} >= 0.50)")
    if risk.requires_escalation:
        triggered_flags.append("Escalation required — at least one risk dimension >= 0.80")

    # Enforcement-specific flags
    if case.constraints.get("was_displaced"):
        triggered_flags.append("Enforcement-driven displacement event detected")
    if case.constraints.get("was_threatened_with_arrest"):
        triggered_flags.append("Criminalization pressure detected during survival state")
    if case.constraints.get("lost_belongings_due_to_interaction"):
        triggered_flags.append("Loss of survival-critical resources due to enforcement interaction")

    active_constraints = [k for k, v in case.constraints.items() if v]
    suppressed = [d for d in ["medical", "exposure", "documents", "enforcement"] if d not in case.risk_domains]
    primary = primary_pathway or (case.risk_domains[0] if case.risk_domains else "general")

    return {
        "case_id": case.case_id,
        "triggered_flags": triggered_flags,
        "active_constraints": active_constraints,
        "risk_scores": {
            "medical": round(risk.medical_risk, 3),
            "exposure": round(risk.exposure_risk, 3),
            "documentation": round(risk.documentation_risk, 3),
            "enforcement": round(risk.enforcement_risk, 3),
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
