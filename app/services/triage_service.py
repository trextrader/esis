from __future__ import annotations
# app/services/triage_service.py
from app.api.schemas import StructuredCase, RiskAssessment


def score_risk(case: StructuredCase) -> RiskAssessment:
    medical = _score_medical(case)
    exposure = _score_exposure(case)
    documents = _score_documents(case)
    return RiskAssessment(
        medical_risk=medical,
        exposure_risk=exposure,
        documentation_risk=documents,
    )


def _score_medical(case: StructuredCase) -> float:
    score = 0.0
    if "medical" in case.risk_domains:
        score += 0.4
    if case.symptoms:
        score += min(len(case.symptoms) * 0.15, 0.3)
    if case.constraints.get("recent_discharge"):
        score += 0.2
    if not case.constraints.get("has_shelter"):
        score += 0.1
    severe = {"infection", "sepsis", "fever", "wound"}
    if severe & set(case.symptoms):
        score += 0.2
    return min(score, 1.0)


def _score_exposure(case: StructuredCase) -> float:
    score = 0.0
    if "exposure" in case.risk_domains:
        score += 0.5
    if not case.constraints.get("has_shelter"):
        score += 0.2
    if case.constraints.get("low_battery"):
        score += 0.15
    if case.constraints.get("low_funds"):
        score += 0.1
    if case.constraints.get("no_transport"):
        score += 0.1
    return min(score, 1.0)


def _score_documents(case: StructuredCase) -> float:
    score = 0.0
    if "documents" in case.risk_domains:
        score += 0.5
    if case.constraints.get("referral_broken"):
        score += 0.3
    if not case.constraints.get("has_shelter"):
        score += 0.1
    return min(score, 1.0)
