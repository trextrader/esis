from __future__ import annotations
# app/services/intake_service.py
from app.api.schemas import CaseInput, StructuredCase

MEDICAL_KEYWORDS = ["pain", "infection", "hospital", "discharged", "medication", "injury", "fever", "wound"]
EXPOSURE_KEYWORDS = ["freezing", "cold", "heat", "outside", "weather", "exposure", "night"]
DOCUMENT_KEYWORDS = ["lost", "id", "documents", "paperwork", "referral", "caseworker", "records"]


def normalize_case(inp: CaseInput) -> StructuredCase:
    text = inp.raw_text.lower()
    domains = []
    symptoms = []

    # Domain detection from explicit checkboxes (authoritative)
    if inp.has_pain or inp.recent_discharge:
        domains.append("medical")
    if inp.has_exposure_risk:  # Only flag from explicit checkbox, not absence of shelter
        domains.append("exposure")
    if inp.has_lost_documents:
        domains.append("documents")

    # Supplement from free text (only add if not already present)
    if any(k in text for k in MEDICAL_KEYWORDS) and "medical" not in domains:
        domains.append("medical")
    if any(k in text for k in EXPOSURE_KEYWORDS) and "exposure" not in domains:
        domains.append("exposure")
    if any(k in text for k in DOCUMENT_KEYWORDS) and "documents" not in domains:
        domains.append("documents")

    # Extract symptom keywords from text
    symptom_words = ["pain", "infection", "fever", "wound", "bleeding"]
    symptoms = [w for w in symptom_words if w in text]

    constraints = {
        "low_battery": inp.low_battery,
        "low_funds": inp.low_funds,
        "no_transport": inp.no_transport,
        "has_shelter": inp.has_shelter,
        "recent_discharge": inp.recent_discharge,  # Required for triage scoring
    }

    resources = {
        "has_phone": True,
        "low_battery": inp.low_battery,
    }

    return StructuredCase(
        risk_domains=list(set(domains)),
        symptoms=symptoms,
        constraints=constraints,
        resources=resources,
        notes=inp.raw_text[:500],
    )
