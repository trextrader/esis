# PDF Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Download Full Report as PDF" button at the bottom of the ESIS Streamlit app that exports all 7 report sections as a styled PDF using WeasyPrint.

**Architecture:** A new `app/services/pdf_service.py` builds an HTML string from the 6 data objects produced by the analysis pipeline, embeds the logo as base64, and converts it to PDF bytes via `weasyprint.HTML(string=html).write_pdf()`. The Streamlit app imports `generate_pdf` and renders a `st.download_button` inside the `if analyze_btn:` block, after the audit trail expander.

**Tech Stack:** WeasyPrint ≥60.0, Python base64, pathlib, existing Pydantic models from `app/api/schemas.py`

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `app/services/pdf_service.py` | HTML builder + WeasyPrint conversion |
| Create | `tests/test_pdf_service.py` | Unit tests for pdf_service |
| Create | `packages.txt` | System deps for HuggingFace Spaces |
| Modify | `requirements.txt` | Add `weasyprint>=60.0` |
| Modify | `app/ui/streamlit_app.py` | Import + download button at bottom |

---

## Task 1: Add dependencies

**Files:**
- Modify: `requirements.txt`
- Create: `packages.txt`

- [ ] **Step 1: Add weasyprint to requirements.txt**

Open `requirements.txt` and add after the last line:
```
weasyprint>=60.0
```

- [ ] **Step 2: Create packages.txt for HuggingFace Spaces**

Create `packages.txt` at repo root with these system packages (required by WeasyPrint on Ubuntu):
```
libpango-1.0-0
libcairo2
libgdk-pixbuf2.0-0
libffi-dev
shared-mime-info
```

- [ ] **Step 3: Install weasyprint locally**

```bash
pip install weasyprint>=60.0
```

Expected: WeasyPrint installs without error. On Windows you may see a warning about Cairo — this is fine for development; it works on HuggingFace Spaces (Ubuntu).

- [ ] **Step 4: Commit**

```bash
git add requirements.txt packages.txt
git commit -m "chore: add weasyprint and HuggingFace system packages"
```

---

## Task 2: Write the failing tests

**Files:**
- Create: `tests/test_pdf_service.py`

- [ ] **Step 1: Create the test file**

Create `tests/test_pdf_service.py`:

```python
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_pdf_service.py -v
```

Expected: `ImportError: cannot import name 'generate_pdf' from 'app.services.pdf_service'` — the module doesn't exist yet.

- [ ] **Step 3: Commit the test file**

```bash
git add tests/test_pdf_service.py
git commit -m "test: failing tests for pdf_service"
```

---

## Task 3: Implement pdf_service.py

**Files:**
- Create: `app/services/pdf_service.py`

- [ ] **Step 1: Create the service file**

Create `app/services/pdf_service.py`:

```python
# app/services/pdf_service.py
from __future__ import annotations

import base64
import json
from pathlib import Path
from typing import Optional

from app.api.schemas import (
    CasePacket, HousingTrack, RiskAssessment,
    RecommendationOutput, StructuredCase,
)

_LOGO_PATH = Path(__file__).parent.parent / "ui" / "assets" / "esis_logo.png"


def _logo_base64() -> str:
    if _LOGO_PATH.exists():
        return base64.b64encode(_LOGO_PATH.read_bytes()).decode()
    return ""


def _pct(v: float) -> int:
    return round(v * 100)


def _risk_color(v: float) -> str:
    if v >= 0.8:
        return "#EF4444"
    if v >= 0.5:
        return "#F97316"
    return "#22C55E"


def _risk_bar(label: str, value: float, icon: str) -> str:
    pct = _pct(value)
    color = _risk_color(value)
    return f"""
    <div style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
        <span style="color:#d1d5db;font-size:13px;">{icon} {label}</span>
        <span style="color:{color};font-weight:bold;font-size:13px;">{pct}%</span>
      </div>
      <div style="background:#374151;border-radius:4px;height:8px;width:100%;">
        <div style="background:{color};border-radius:4px;height:8px;width:{pct}%;"></div>
      </div>
    </div>"""


def _list_items(items: list[str], bullet: str = "▸") -> str:
    if not items:
        return "<p style='color:#9ca3af;font-size:12px;'>None</p>"
    return "".join(
        f"<p style='margin:4px 0;font-size:13px;color:#e5e7eb;'>{bullet} {item}</p>"
        for item in items
    )


def _section(title: str, content: str) -> str:
    return f"""
    <div style="margin-bottom:24px;border-left:3px solid #e94560;padding-left:14px;">
      <h2 style="color:#e94560;font-size:15px;font-weight:700;
                 text-transform:uppercase;letter-spacing:0.08em;margin:0 0 10px 0;">
        {title}
      </h2>
      {content}
    </div>"""


def _build_html(
    structured: StructuredCase,
    risk: RiskAssessment,
    housing_track: HousingTrack,
    recommendation: RecommendationOutput,
    packet: CasePacket,
    audit: dict,
    nearby: list[dict],
) -> str:
    logo_b64 = _logo_base64()
    logo_html = (
        f'<img src="data:image/png;base64,{logo_b64}" '
        f'style="height:48px;margin-bottom:8px;" /><br>'
        if logo_b64 else ""
    )

    city = structured.constraints.get("city", "unknown").title()
    escalation_html = ""
    if risk.requires_escalation:
        escalation_html = """
        <div style="background:#1A0808;border:1px solid #EF4444;border-radius:6px;
                    padding:10px 14px;margin-bottom:16px;">
          <span style="color:#EF4444;font-weight:800;font-size:13px;">
            ⚠️ ESCALATION REQUIRED — HIGH PRIORITY
          </span>
        </div>"""

    # Section 1 — Header
    header = f"""
    <div style="text-align:center;margin-bottom:28px;
                border-bottom:1px solid #374151;padding-bottom:20px;">
      {logo_html}
      <h1 style="color:#e94560;font-size:22px;font-weight:900;
                 letter-spacing:0.1em;margin:0;">ESIS REPORT</h1>
      <p style="color:#9ca3af;font-size:12px;margin:6px 0 0 0;">
        Case ID: <strong style="color:#e5e7eb;">{structured.case_id}</strong>
        &nbsp;·&nbsp; {structured.timestamp[:19].replace("T", " ")}
        &nbsp;·&nbsp; {city}
      </p>
    </div>
    {escalation_html}"""

    # Section 2 — Risk Assessment
    risk_content = (
        _risk_bar("Medical Risk", risk.medical_risk, "🩺") +
        _risk_bar("Exposure Risk", risk.exposure_risk, "🌡️") +
        _risk_bar("Documentation Risk", risk.documentation_risk, "📋") +
        _risk_bar("Enforcement Risk", risk.enforcement_risk, "🚔") +
        f"<p style='color:#9ca3af;font-size:12px;margin-top:8px;'>"
        f"Overall priority: <strong style='color:#e5e7eb;'>"
        f"{risk.overall_priority.upper()}</strong></p>"
    )

    # Section 3 — Housing Track
    track_content = f"""
    <p style="color:#e5e7eb;font-size:14px;font-weight:700;margin:0 0 4px 0;">
      {housing_track.track_name}
      <span style="color:#9ca3af;font-size:12px;font-weight:400;">
        &nbsp;(Priority score: {housing_track.priority_score}/100)
      </span>
    </p>
    <p style="color:#9ca3af;font-size:12px;margin:0 0 8px 0;">
      {housing_track.estimated_timeline}
    </p>
    <p style="color:#d1d5db;font-size:12px;font-weight:600;margin:8px 0 4px 0;">Rationale:</p>
    {_list_items(housing_track.rationale)}
    <p style="color:#d1d5db;font-size:12px;font-weight:600;margin:10px 0 4px 0;">Immediate Actions:</p>
    {_list_items(housing_track.immediate_actions)}
    <p style="color:#d1d5db;font-size:12px;font-weight:600;margin:10px 0 4px 0;">Target Programs:</p>
    {_list_items(housing_track.target_programs)}"""

    # Section 4 — Action Plan
    plan_content = f"""
    <p style="color:#e5e7eb;font-size:13px;margin:0 0 12px 0;">{recommendation.summary}</p>
    <p style="color:#d1d5db;font-size:12px;font-weight:600;margin:0 0 4px 0;">
      Horizon 1 — Do This Now (0–2 hours):
    </p>
    {_list_items(recommendation.immediate_actions)}
    <p style="color:#d1d5db;font-size:12px;font-weight:600;margin:10px 0 4px 0;">
      Horizon 2 — Next 24 Hours:
    </p>
    {_list_items(recommendation.stabilization_actions)}
    <p style="color:#d1d5db;font-size:12px;font-weight:600;margin:10px 0 4px 0;">
      Horizon 3 — Recovery Track:
    </p>
    {_list_items(recommendation.recovery_actions)}
    <p style="color:#d1d5db;font-size:12px;font-weight:600;margin:10px 0 4px 0;">
      Fallback Plan:
    </p>
    <p style="color:#e5e7eb;font-size:13px;background:#1f2937;
              padding:8px 12px;border-radius:4px;margin:0;">
      {recommendation.fallback_plan}
    </p>"""

    # Section 5 — Nearby Resources
    if nearby:
        resource_rows = "".join(
            f"<p style='margin:4px 0;font-size:12px;color:#e5e7eb;'>"
            f"▸ <strong>{r.get('name','')}</strong> &nbsp;·&nbsp; "
            f"📞 {r.get('phone','')} &nbsp;·&nbsp; "
            f"📍 {r.get('distance_mi', '?')} mi &nbsp;·&nbsp; "
            f"{r.get('hours','')}</p>"
            for r in nearby[:12]
        )
        resources_section = _section("Nearby Resources", resource_rows)
    else:
        resources_section = _section(
            "Nearby Resources",
            "<p style='color:#9ca3af;font-size:12px;'>No location provided.</p>"
        )

    # Section 6 — Advocacy Packet
    packet_content = f"""
    <p style="color:#d1d5db;font-size:12px;font-weight:600;margin:0 0 4px 0;">One-Page Summary:</p>
    <p style="color:#e5e7eb;font-size:13px;margin:0 0 12px 0;">{packet.one_page_summary}</p>
    <p style="color:#d1d5db;font-size:12px;font-weight:600;margin:0 0 4px 0;">Advocate Script:</p>
    <p style="color:#e5e7eb;font-size:13px;margin:0 0 12px 0;">{packet.advocate_script}</p>
    <p style="color:#d1d5db;font-size:12px;font-weight:600;margin:0 0 4px 0;">Referral Handoff:</p>
    <p style="color:#e5e7eb;font-size:13px;margin:0 0 12px 0;">{packet.referral_handoff}</p>
    <p style="color:#d1d5db;font-size:12px;font-weight:600;margin:0 0 4px 0;">Action Timeline:</p>
    {_list_items(packet.action_timeline)}
    <p style="color:#d1d5db;font-size:12px;font-weight:600;margin:10px 0 4px 0;">
      Preservation Checklist:
    </p>
    {_list_items(packet.preservation_checklist)}"""

    # Section 7 — Audit Trail
    audit_json = json.dumps(audit, indent=2)
    audit_content = f"""
    <pre style="background:#111827;color:#86efac;font-size:10px;
                padding:10px;border-radius:4px;white-space:pre-wrap;
                word-break:break-word;">{audit_json}</pre>"""

    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  @page {{ size: A4; margin: 18mm 16mm; }}
  body {{
    font-family: -apple-system, Arial, sans-serif;
    background: #1a1a2e;
    color: #e5e7eb;
    margin: 0;
    padding: 0;
    font-size: 13px;
    line-height: 1.5;
  }}
  h1, h2, h3, p {{ margin: 0; padding: 0; }}
</style>
</head>
<body>
  {header}
  {_section("Risk Assessment", risk_content)}
  {_section("Housing Track", track_content)}
  {_section("Action Plan", plan_content)}
  {resources_section}
  {_section("Advocacy Packet", packet_content)}
  {_section("Audit Trail", audit_content)}
  <div style="text-align:center;margin-top:24px;color:#4b5563;font-size:10px;">
    ESIS — Edge Survival Intelligence System · Gemma 4 Good Hackathon 2026 ·
    Built with lived experience.
  </div>
</body>
</html>"""


def _html_to_pdf(html: str) -> bytes:
    """Thin wrapper around weasyprint — isolated for monkeypatching in tests."""
    from weasyprint import HTML  # noqa: PLC0415 — lazy import, weasyprint is optional
    return HTML(string=html).write_pdf()


def generate_pdf(
    structured: StructuredCase,
    risk: RiskAssessment,
    housing_track: HousingTrack,
    recommendation: RecommendationOutput,
    packet: CasePacket,
    audit: dict,
    nearby: list[dict],
) -> Optional[bytes]:
    """
    Build a styled PDF of the full ESIS report.
    Returns PDF bytes on success, None on failure.
    """
    try:
        html = _build_html(structured, risk, housing_track, recommendation, packet, audit, nearby)
        return _html_to_pdf(html)
    except Exception:
        return None
```

- [ ] **Step 2: Run the tests**

```bash
pytest tests/test_pdf_service.py -v
```

Expected:
```
test_generate_pdf_returns_bytes         PASSED
test_pdf_starts_with_pdf_header         PASSED
test_generate_pdf_with_nearby_resources PASSED
test_generate_pdf_returns_none_on_weasyprint_failure PASSED
```

If WeasyPrint has Cairo issues on Windows, `test_generate_pdf_returns_bytes` and `test_pdf_starts_with_pdf_header` may fail locally but will pass on HuggingFace Spaces (Ubuntu). The `None` fallback test should always pass.

- [ ] **Step 3: Commit**

```bash
git add app/services/pdf_service.py
git commit -m "feat: pdf_service — WeasyPrint HTML-to-PDF report generation"
```

---

## Task 4: Wire download button into Streamlit

**Files:**
- Modify: `app/ui/streamlit_app.py`

- [ ] **Step 1: Add the import at the top of streamlit_app.py**

Find the block of service imports (around line 15–24) and add:
```python
from app.services.pdf_service import generate_pdf
```

After this line (existing):
```python
from app.services.housing_track_service import (
    assign_housing_track, get_resource_programs, EDU_LABELS, RESOURCE_PROGRAMS
)
```

- [ ] **Step 2: Add the download button at the bottom**

Find this block near the end of the file (inside the `if analyze_btn:` block):
```python
    with st.expander("🔍  Audit Trail — Why this plan was selected"):
        st.json(audit)

    st.caption(
        "ESIS — Edge Survival Intelligence System | Gemma 4 Good Hackathon 2026 | "
        "Built with lived experience."
    )
```

Replace it with:
```python
    with st.expander("🔍  Audit Trail — Why this plan was selected"):
        st.json(audit)

    st.divider()
    pdf_bytes = generate_pdf(
        structured=structured,
        risk=risk,
        housing_track=housing_track,
        recommendation=recommendation,
        packet=packet,
        audit=audit,
        nearby=nearby,
    )
    if pdf_bytes:
        st.download_button(
            label="⬇️  Download Full Report as PDF",
            data=pdf_bytes,
            file_name=f"esis_report_{structured.case_id}.pdf",
            mime="application/pdf",
            use_container_width=True,
        )
    else:
        st.warning(
            "PDF generation unavailable — WeasyPrint system dependencies missing. "
            "This works on HuggingFace Spaces."
        )

    st.caption(
        "ESIS — Edge Survival Intelligence System | Gemma 4 Good Hackathon 2026 | "
        "Built with lived experience."
    )
```

- [ ] **Step 3: Run the app locally and verify**

```bash
streamlit run app/ui/streamlit_app.py
```

1. Fill in a scenario and click **Analyze with ESIS**
2. Scroll to the bottom — the download button should appear
3. Click it — browser should download `esis_report_<case_id>.pdf`
4. Open the PDF — verify all 7 sections are present

On Windows, if WeasyPrint's Cairo is missing, a yellow warning banner appears instead of the button — this is expected. The button will work on HuggingFace Spaces.

- [ ] **Step 4: Commit**

```bash
git add app/ui/streamlit_app.py
git commit -m "feat: add Download Full Report as PDF button to Streamlit app"
```

---

## Task 5: Deploy to HuggingFace Spaces

- [ ] **Step 1: Push to GitHub**

```bash
git push origin main
```

- [ ] **Step 2: Push to HuggingFace Spaces**

```bash
python -c "
from huggingface_hub import HfApi
api = HfApi()
api.upload_folder(
    folder_path='.',
    repo_id='trextrader/esis-demo',
    repo_type='space',
    token='<YOUR_HF_WRITE_TOKEN>',
    ignore_patterns=['node_modules/**','.git/**','mobile/**','*.zip','venv/**','__pycache__/**']
)
print('Done')
"
```

- [ ] **Step 3: Verify on HuggingFace Spaces**

1. Open https://huggingface.co/spaces/trextrader/esis-demo
2. Wait for the Space to rebuild (check Logs tab — look for `packages.txt` deps installing)
3. Run a scenario and scroll to the bottom
4. Confirm the **⬇️ Download Full Report as PDF** button appears and downloads a valid PDF
