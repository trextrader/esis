from __future__ import annotations
# app/services/audit_service.py
from app.api.schemas import StructuredCase, RiskAssessment, RecommendationOutput
from typing import List, Optional, Tuple


def _resolve_pathway(
    risk: RiskAssessment,
    provided: Optional[str] = None,
) -> Tuple[str, Optional[str], Optional[str]]:
    """
    Derive pathway, primary_driver, and secondary_driver from risk scores.
    Returns (pathway_name, primary_driver, secondary_driver).
    primary_driver and secondary_driver are only set for multi-domain escalation.
    """
    scores = {
        "medical": risk.medical_risk,
        "exposure": risk.exposure_risk,
        "documentation": risk.documentation_risk,
        "enforcement": risk.enforcement_risk,
    }

    if provided:
        pathway = provided
    elif all(v == 0.0 for v in scores.values()):
        pathway = "general"
    else:
        high = [(k, v) for k, v in scores.items() if v >= 0.8]
        if len(high) >= 2:
            pathway = "multi-domain escalation"
        else:
            # Map routing_service keys to audit keys ("documents" → "documentation")
            _key_map = {"documents": "documentation"}
            from app.services.routing_service import _pick_primary
            raw = _pick_primary(risk)
            pathway = _key_map.get(raw, raw)

    primary_driver: Optional[str] = None
    secondary_driver: Optional[str] = None
    if pathway == "multi-domain escalation":
        sorted_domains = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        primary_driver = sorted_domains[0][0]
        secondary_driver = sorted_domains[1][0] if len(sorted_domains) > 1 else None

    return pathway, primary_driver, secondary_driver


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
        triggered_flags.append(f"Enforcement-induced system risk elevated ({risk.enforcement_risk:.2f} >= 0.50)")
    if risk.requires_escalation:
        triggered_flags.append("Escalation required — at least one risk dimension >= 0.80")

    # Enforcement-specific flags
    if case.constraints.get("was_displaced"):
        triggered_flags.append("System-induced displacement event detected")
    if case.constraints.get("was_threatened_with_arrest"):
        triggered_flags.append("Criminalization pressure detected during survival state")
    if case.constraints.get("lost_belongings_due_to_interaction"):
        triggered_flags.append("Loss of survival-critical resources due to enforcement interaction")

    active_constraints = [k for k, v in case.constraints.items() if v]
    suppressed = [d for d in ["medical", "exposure", "documentation", "enforcement"] if d not in case.risk_domains]

    pathway, primary_driver, secondary_driver = _resolve_pathway(risk, primary_pathway)

    scores = {
        "medical": round(risk.medical_risk, 3),
        "exposure": round(risk.exposure_risk, 3),
        "documentation": round(risk.documentation_risk, 3),
        "enforcement": round(risk.enforcement_risk, 3),
    }

    if pathway == "multi-domain escalation":
        pd_score = scores.get(primary_driver, 0) if primary_driver else 0
        sd_score = scores.get(secondary_driver, 0) if secondary_driver else 0
        why = (
            f"Multi-domain escalation — 2+ risk domains exceeded threshold. "
            f"Primary driver: {primary_driver} ({pd_score:.0%}). "
            f"Secondary driver: {secondary_driver} ({sd_score:.0%}). "
            f"{len(triggered_flags)} risk flag(s) triggered."
        )
    else:
        why = (
            f"Primary pathway '{pathway}' selected based on highest domain risk score. "
            f"{len(triggered_flags)} risk flag(s) triggered. "
            f"Suppressed pathways: {suppressed if suppressed else 'none'}."
        )

    result: dict = {
        "case_id": case.case_id,
        "triggered_flags": triggered_flags,
        "active_constraints": active_constraints,
        "risk_scores": scores,
        "pathway_selected": pathway,
        "why_this_route": why,
        "suppressed_alternatives": suppressed,
        "escalation_required": risk.requires_escalation,
    }

    if primary_driver:
        result["primary_driver"] = primary_driver
    if secondary_driver:
        result["secondary_driver"] = secondary_driver

    return result
