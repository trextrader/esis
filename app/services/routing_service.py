from __future__ import annotations
# app/services/routing_service.py
from app.api.schemas import StructuredCase, RiskAssessment


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
    # Zero-risk guard — prevents medical being selected when all scores are 0
    if risk.medical_risk == 0.0 and risk.exposure_risk == 0.0 and risk.documentation_risk == 0.0:
        return "general"
    if risk.medical_risk >= risk.exposure_risk and risk.medical_risk >= risk.documentation_risk:
        return "medical"
    if risk.exposure_risk >= risk.documentation_risk:
        return "exposure"
    if risk.documentation_risk > 0.3:
        return "documents"
    return "general"
