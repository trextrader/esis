from __future__ import annotations
from app.api.schemas import CaseInput, StructuredCase, RiskAssessment, RecommendationOutput, CasePacket


def test_case_input_defaults():
    case = CaseInput(raw_text="discharged and in pain, no shelter")
    assert case.raw_text == "discharged and in pain, no shelter"
    assert case.location is None
    assert case.has_pain is False


def test_risk_assessment_clamps_above_one():
    r = RiskAssessment(medical_risk=1.5, exposure_risk=0.5, documentation_risk=0.2)
    assert r.medical_risk == 1.0


def test_risk_assessment_clamps_below_zero():
    r = RiskAssessment(medical_risk=-0.5, exposure_risk=0.0, documentation_risk=0.0)
    assert r.medical_risk == 0.0


def test_overall_priority_high():
    r = RiskAssessment(medical_risk=0.85, exposure_risk=0.7, documentation_risk=0.3)
    assert r.overall_priority == "high"
    assert r.requires_escalation is True


def test_overall_priority_medium():
    r = RiskAssessment(medical_risk=0.6, exposure_risk=0.4, documentation_risk=0.2)
    assert r.overall_priority == "medium"
    assert r.requires_escalation is False


def test_overall_priority_low():
    r = RiskAssessment(medical_risk=0.1, exposure_risk=0.2, documentation_risk=0.1)
    assert r.overall_priority == "low"
    assert r.requires_escalation is False
