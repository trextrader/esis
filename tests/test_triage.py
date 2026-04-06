from __future__ import annotations
from app.services.triage_service import score_risk
from app.api.schemas import StructuredCase


def test_medical_risk_high_on_discharge_with_pain():
    # recent_discharge must be in constraints (as intake_service now includes it)
    case = StructuredCase(
        risk_domains=["medical"],
        symptoms=["pain", "infection"],
        constraints={"recent_discharge": True, "has_shelter": False, "low_battery": False,
                     "low_funds": False, "no_transport": False},
        resources={},
    )
    result = score_risk(case)
    assert result.medical_risk >= 0.8
    assert result.requires_escalation is True


def test_exposure_risk_high_on_cold_no_shelter():
    case = StructuredCase(
        risk_domains=["exposure"],
        symptoms=[],
        constraints={"has_shelter": False, "low_battery": True, "recent_discharge": False,
                     "low_funds": False, "no_transport": False},
        resources={},
    )
    result = score_risk(case)
    assert result.exposure_risk >= 0.7


def test_low_risk_case():
    case = StructuredCase(
        risk_domains=[],
        symptoms=[],
        constraints={"has_shelter": True, "low_battery": False, "recent_discharge": False,
                     "low_funds": False, "no_transport": False},
        resources={},
    )
    result = score_risk(case)
    assert result.overall_priority == "low"
    assert result.requires_escalation is False


def test_routing_general_on_zero_risk():
    from app.services.routing_service import select_pathway
    from app.api.schemas import RiskAssessment
    case = StructuredCase(risk_domains=[], symptoms=[], constraints={}, resources={})
    risk = RiskAssessment(medical_risk=0.0, exposure_risk=0.0, documentation_risk=0.0)
    result = select_pathway(case, risk)
    assert result["primary_pathway"] == "general"
