from __future__ import annotations
# app/services/routing_service.py
from app.api.schemas import StructuredCase, RiskAssessment

# Canonical domain names — single source of truth across all services
STATE_NAMES = ["Medical", "Exposure", "Documentation", "Enforcement"]

ROUTING_MAP = {
    "medical": {
        "first_contact": "Hospital social worker or 911",
        "secondary": "Medical respite or recuperative care program",
        "tertiary": "211 — request medical case manager",
    },
    "exposure": {
        "first_contact": "Nearest warming center or emergency shelter",
        "secondary": "211 for emergency placement",
        "tertiary": "Hospital ER for warmth if no shelter available",
    },
    "documents": {
        "first_contact": "211 — request intake advocate",
        "secondary": "Local DMV for ID fee waiver",
        "tertiary": "Coordinated entry access point",
    },
    "enforcement": {
        "first_contact": "Street outreach team or civil rights legal aid organization",
        "secondary": "Coordinated entry access point with enforcement-aware advocate",
        "tertiary": "211 — request enforcement-aware intake specialist",
    },
    "multi-domain escalation": {
        "first_contact": "Mobile crisis team — multi-domain active, immediate escalation required",
        "secondary": "Civil rights advocate and housing counselor simultaneous outreach",
        "tertiary": "211 — state multi-domain crisis, request senior case manager",
    },
    "general": {
        "first_contact": "211",
        "secondary": "Local coordinated entry system",
        "tertiary": "Nearest shelter or drop-in center",
    },
}


def select_pathway(case: StructuredCase, risk: RiskAssessment) -> dict:
    primary = _pick_primary(risk)
    return {
        "primary_pathway": primary,
        "contacts": ROUTING_MAP.get(primary, ROUTING_MAP["general"]),
        "battery_mode": case.constraints.get("low_battery", False),
        "transport_limited": case.constraints.get("no_transport", False),
    }


def _pick_primary(risk: RiskAssessment) -> str:
    scores = {
        "medical": risk.medical_risk,
        "exposure": risk.exposure_risk,
        "documents": risk.documentation_risk,
        "enforcement": risk.enforcement_risk,
    }

    # Zero-risk guard
    if all(v == 0.0 for v in scores.values()):
        return "general"

    # Multi-domain escalation: 2+ domains at or above 0.8
    high_domains = [k for k, v in scores.items() if v >= 0.8]
    if len(high_domains) >= 2:
        return "multi-domain escalation"

    # Single highest domain
    return max(scores, key=lambda k: scores[k])
