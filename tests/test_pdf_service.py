# tests/test_pdf_service.py
import pytest
from app.api.schemas import (
    StructuredCase, RiskAssessment, HousingTrack,
    RecommendationOutput, CasePacket
)
from app.services.pdf_service import generate_pdf


def _make_structured() -> StructuredCase:
    return StructuredCase(
        case_id="test1234",
        timestamp="2026-04-11T06:00:00",
        risk_domains=["medical"],
        symptoms=["pain"],
        constraints={"city": "denver", "low_battery": True},
        notes="Test case notes.",
    )


def _make_risk() -> RiskAssessment:
    return RiskAssessment(
        medical_risk=1.0,
        exposure_risk=0.55,
        documentation_risk=0.6,
        enforcement_risk=0.1,
    )


def _make_housing_track() -> HousingTrack:
    return HousingTrack(
        track_id="disability_housing",
        track_name="Disability Housing Track",
        priority_score=38,
        rationale=["Disability flag set", "Age 50+"],
        immediate_actions=["Start SOAR application immediately"],
        target_programs=["HUD Section 811", "SOAR program"],
        estimated_timeline="60–90 days",
        community_ping_message="Seeking disability housing placement.",
    )


def _make_recommendation() -> RecommendationOutput:
    return RecommendationOutput(
        summary="Acute survival state — medical risk active.",
        top_actions=["Call 211 now"],
        fallback_plan="Go to nearest ER.",
        what_to_preserve=["ID", "medical records"],
        immediate_actions=["Request emergency shelter tonight"],
        stabilization_actions=["Return to ER for social work eval"],
        recovery_actions=["Start SOAR application"],
    )


def _make_packet() -> CasePacket:
    return CasePacket(
        case_id="test1234",
        created_at="2026-04-11T06:00:00",
        one_page_summary="This person requires immediate medical respite.",
        advocate_script="Say: I need medical respite housing.",
        referral_handoff="Refer to Stout Street Health Center.",
        action_timeline=["Hour 1: Call 211", "Day 1: ER social work"],
        preservation_checklist=["Keep all medical paperwork", "Photograph belongings"],
    )


def _make_audit() -> dict:
    return {
        "case_id": "test1234",
        "triggered_flags": ["Medical risk threshold exceeded"],
        "active_constraints": ["low_battery"],
        "risk_scores": {"medical": 1.0, "exposure": 0.55},
        "pathway_selected": "medical",
        "why_this_route": "Medical risk highest.",
        "escalation_required": True,
    }


def test_generate_pdf_returns_bytes():
    pdf = generate_pdf(
        structured=_make_structured(),
        risk=_make_risk(),
        housing_track=_make_housing_track(),
        recommendation=_make_recommendation(),
        packet=_make_packet(),
        audit=_make_audit(),
        nearby=[],
    )
    assert isinstance(pdf, bytes)
    assert len(pdf) > 1000  # a real PDF is at least a few KB


def test_pdf_starts_with_pdf_header():
    pdf = generate_pdf(
        structured=_make_structured(),
        risk=_make_risk(),
        housing_track=_make_housing_track(),
        recommendation=_make_recommendation(),
        packet=_make_packet(),
        audit=_make_audit(),
        nearby=[],
    )
    assert pdf[:4] == b"%PDF"


def test_generate_pdf_with_nearby_resources():
    nearby = [
        {"name": "Stout Street Health Center", "phone": "303-293-2220",
         "distance_mi": 0.5, "type": "medical", "hours": "Mon-Fri 8am-5pm"},
    ]
    pdf = generate_pdf(
        structured=_make_structured(),
        risk=_make_risk(),
        housing_track=_make_housing_track(),
        recommendation=_make_recommendation(),
        packet=_make_packet(),
        audit=_make_audit(),
        nearby=nearby,
    )
    assert isinstance(pdf, bytes)
    assert len(pdf) > 1000


def test_generate_pdf_returns_none_on_weasyprint_failure(monkeypatch):
    import app.services.pdf_service as svc
    monkeypatch.setattr(svc, "_html_to_pdf", lambda html: (_ for _ in ()).throw(Exception("weasyprint failed")))
    result = generate_pdf(
        structured=_make_structured(),
        risk=_make_risk(),
        housing_track=_make_housing_track(),
        recommendation=_make_recommendation(),
        packet=_make_packet(),
        audit=_make_audit(),
        nearby=[],
    )
    assert result is None
