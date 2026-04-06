from __future__ import annotations
from app.services.intake_service import normalize_case
from app.api.schemas import CaseInput


def test_normalize_detects_medical_domain_from_checkbox():
    inp = CaseInput(raw_text="I have severe pain", has_pain=True)
    result = normalize_case(inp)
    assert "medical" in result.risk_domains


def test_normalize_detects_medical_from_discharge_checkbox():
    inp = CaseInput(raw_text="just left the hospital", recent_discharge=True)
    result = normalize_case(inp)
    assert "medical" in result.risk_domains


def test_normalize_detects_exposure_only_from_explicit_checkbox():
    # No exposure checkbox → no exposure domain even if no shelter
    inp = CaseInput(raw_text="test", has_exposure_risk=False, has_shelter=False)
    result = normalize_case(inp)
    assert "exposure" not in result.risk_domains


def test_normalize_detects_exposure_from_checkbox():
    inp = CaseInput(raw_text="freezing outside, no shelter", has_exposure_risk=True, has_shelter=False)
    result = normalize_case(inp)
    assert "exposure" in result.risk_domains


def test_normalize_detects_document_domain():
    inp = CaseInput(raw_text="lost my ID", has_lost_documents=True)
    result = normalize_case(inp)
    assert "documents" in result.risk_domains


def test_normalize_captures_constraints():
    inp = CaseInput(raw_text="test", low_battery=True, no_transport=True, recent_discharge=True)
    result = normalize_case(inp)
    assert result.constraints.get("low_battery") is True
    assert result.constraints.get("no_transport") is True
    assert result.constraints.get("recent_discharge") is True


def test_normalize_medical_from_text_keywords():
    inp = CaseInput(raw_text="I have a fever and an infection")
    result = normalize_case(inp)
    assert "medical" in result.risk_domains
