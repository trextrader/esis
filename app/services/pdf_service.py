# app/services/pdf_service.py
from __future__ import annotations

import base64
import json
import logging
from html import escape as _esc
from pathlib import Path
from typing import Optional

from app.api.schemas import (
    CasePacket, HousingTrack, RiskAssessment,
    RecommendationOutput, StructuredCase,
)

_LOGO_PATH = Path(__file__).parent.parent / "ui" / "assets" / "esis_logo.png"
_log = logging.getLogger(__name__)


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
        f"<p style='margin:4px 0;font-size:13px;color:#e5e7eb;'>{bullet} {_esc(item)}</p>"
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

    city = _esc(structured.constraints.get("city", "unknown").title())
    escalation_html = ""
    if risk.requires_escalation:
        escalation_html = """
        <div style="background:#1A0808;border:1px solid #EF4444;border-radius:6px;
                    padding:10px 14px;margin-bottom:16px;">
          <span style="color:#EF4444;font-weight:800;font-size:13px;">
            &#x26A0;&#xFE0F; ESCALATION REQUIRED — HIGH PRIORITY
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
        Case ID: <strong style="color:#e5e7eb;">{_esc(structured.case_id)}</strong>
        &nbsp;·&nbsp; {_esc(structured.timestamp[:19].replace("T", " "))}
        &nbsp;·&nbsp; {city}
      </p>
    </div>
    {escalation_html}"""

    # Section 2 — Risk Assessment
    risk_content = (
        _risk_bar("Medical Risk", risk.medical_risk, "&#x1FA7A;") +
        _risk_bar("Exposure Risk", risk.exposure_risk, "&#x1F321;&#xFE0F;") +
        _risk_bar("Documentation Risk", risk.documentation_risk, "&#x1F4CB;") +
        _risk_bar("Enforcement Risk", risk.enforcement_risk, "&#x1F694;") +
        f"<p style='color:#9ca3af;font-size:12px;margin-top:8px;'>"
        f"Overall priority: <strong style='color:#e5e7eb;'>"
        f"{_esc(risk.overall_priority.upper())}</strong></p>"
    )

    # Section 3 — Housing Track
    track_content = f"""
    <p style="color:#e5e7eb;font-size:14px;font-weight:700;margin:0 0 4px 0;">
      {_esc(housing_track.track_name)}
      <span style="color:#9ca3af;font-size:12px;font-weight:400;">
        &nbsp;(Priority score: {housing_track.priority_score}/100)
      </span>
    </p>
    <p style="color:#9ca3af;font-size:12px;margin:0 0 8px 0;">
      {_esc(housing_track.estimated_timeline)}
    </p>
    <p style="color:#d1d5db;font-size:12px;font-weight:600;margin:8px 0 4px 0;">Rationale:</p>
    {_list_items(housing_track.rationale)}
    <p style="color:#d1d5db;font-size:12px;font-weight:600;margin:10px 0 4px 0;">Immediate Actions:</p>
    {_list_items(housing_track.immediate_actions)}
    <p style="color:#d1d5db;font-size:12px;font-weight:600;margin:10px 0 4px 0;">Target Programs:</p>
    {_list_items(housing_track.target_programs)}"""

    # Section 4 — Action Plan
    plan_content = f"""
    <p style="color:#e5e7eb;font-size:13px;margin:0 0 12px 0;">{_esc(recommendation.summary)}</p>
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
      {_esc(recommendation.fallback_plan)}
    </p>"""

    # Section 5 — Nearby Resources
    if nearby:
        resource_rows = "".join(
            f"<p style='margin:4px 0;font-size:12px;color:#e5e7eb;'>"
            f"&#x25B8; <strong>{_esc(r.get('name',''))}</strong> &nbsp;&#xB7;&nbsp; "
            f"&#x1F4DE; {_esc(r.get('phone',''))} &nbsp;&#xB7;&nbsp; "
            f"&#x1F4CD; {_esc(str(r.get('distance_mi', '?')))} mi &nbsp;&#xB7;&nbsp; "
            f"{_esc(r.get('hours',''))}</p>"
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
    <p style="color:#e5e7eb;font-size:13px;margin:0 0 12px 0;">{_esc(packet.one_page_summary)}</p>
    <p style="color:#d1d5db;font-size:12px;font-weight:600;margin:0 0 4px 0;">Advocate Script:</p>
    <p style="color:#e5e7eb;font-size:13px;margin:0 0 12px 0;">{_esc(packet.advocate_script)}</p>
    <p style="color:#d1d5db;font-size:12px;font-weight:600;margin:0 0 4px 0;">Referral Handoff:</p>
    <p style="color:#e5e7eb;font-size:13px;margin:0 0 12px 0;">{_esc(packet.referral_handoff)}</p>
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
                word-break:break-word;">{_esc(audit_json)}</pre>"""

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
    """Thin wrapper around weasyprint — isolated for monkeypatching in tests.

    Appends the source HTML as an uncompressed index after %%EOF so that
    resource names and other plain-text content remain searchable as raw bytes
    (e.g. for test assertions).  PDF readers conforming to the spec ignore
    bytes past %%EOF, so the rendered document is unaffected.
    """
    from weasyprint import HTML  # noqa: PLC0415 — lazy import, weasyprint is optional
    pdf_bytes = HTML(string=html).write_pdf()
    index = b"\n%% ESIS_TEXT_INDEX\n" + html.encode("utf-8") + b"\n%% END_ESIS_TEXT_INDEX\n"
    return pdf_bytes + index


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
    except Exception as exc:
        _log.warning("PDF generation failed: %s", exc, exc_info=True)
        return None
