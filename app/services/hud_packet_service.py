from __future__ import annotations
# app/services/hud_packet_service.py
"""
Generates a HUD Chronic Homelessness Documentation Packet as a PDF.

HUD defines "chronically homeless" as:
  - 1+ year continuous homelessness, OR
  - 4+ episodes totaling 12 months in the past 3 years
  AND a disabling condition (physical, mental health, substance use disorder)

The packet includes:
  1. Qualification summary (auto-filled from case data)
  2. Self-attestation letter (ready to sign and submit)
  3. Homelessness history timeline
  4. Disability documentation checklist
  5. Application instructions (HUD direct + local coordinated entry)
  6. Rights and protections

HUD accepts self-attestation when third-party records are unavailable.
"""

import base64
import logging
from datetime import date, timedelta
from html import escape as _esc
from pathlib import Path
from typing import Optional

from app.api.schemas import PersonProfile, HousingTrack, StructuredCase

_LOGO_PATH = Path(__file__).parent.parent / "ui" / "assets" / "esis_logo.png"
_log = logging.getLogger(__name__)


def _logo_b64() -> str:
    if _LOGO_PATH.exists():
        return base64.b64encode(_LOGO_PATH.read_bytes()).decode()
    return ""


def _section(title: str, color: str, content: str) -> str:
    return f"""
    <div style="margin-bottom:28px;border-left:4px solid {color};padding-left:16px;">
      <h2 style="color:{color};font-size:14px;font-weight:700;
                 text-transform:uppercase;letter-spacing:0.08em;margin:0 0 12px 0;">
        {title}
      </h2>
      {content}
    </div>"""


def _checklist(items: list[tuple[str, bool, str]]) -> str:
    """items = [(label, checked, note)]"""
    rows = ""
    for label, checked, note in items:
        mark = "&#x2611;" if checked else "&#x2610;"
        color = "#22C55E" if checked else "#9ca3af"
        rows += f"""
        <div style="margin-bottom:8px;">
          <span style="color:{color};font-size:16px;">{mark}</span>
          <span style="color:#e5e7eb;font-size:13px;margin-left:8px;">{_esc(label)}</span>
          {f'<div style="color:#9ca3af;font-size:11px;margin-left:26px;margin-top:2px;">{_esc(note)}</div>' if note else ''}
        </div>"""
    return rows


def _build_hud_html(
    profile: PersonProfile,
    housing_track: HousingTrack,
    structured: StructuredCase,
) -> str:
    logo_b64 = _logo_b64()
    logo_html = (
        f'<img src="data:image/png;base64,{logo_b64}" style="height:40px;margin-bottom:8px;" /><br>'
        if logo_b64 else ""
    )

    today = date.today()
    months = profile.months_homeless
    yrs, mos = divmod(months, 12)
    duration_str = (
        f"{yrs} year{'s' if yrs != 1 else ''}" +
        (f" {mos} month{'s' if mos != 1 else ''}" if mos else "")
        if yrs else f"{mos} month{'s' if mos != 1 else ''}"
    )
    est_start = today - timedelta(days=months * 30)

    # Qualification check
    meets_duration = months >= 12
    meets_disability = profile.is_disabled or profile.has_life_threatening_condition
    qualifies = meets_duration and meets_disability
    qual_color = "#22C55E" if qualifies else "#F97316"
    qual_label = "QUALIFIES — HUD Chronic Homeless Priority" if qualifies else (
        "LIKELY QUALIFIES — Gather supporting documentation" if meets_duration else
        "PARTIAL — Duration or disability documentation may be needed"
    )

    city = structured.constraints.get("city", "").title() or "your city"

    # ── Section 1: Qualification Banner ──────────────────────────────────
    qual_html = f"""
    <div style="background:#0A1F0A;border:2px solid {qual_color};border-radius:8px;
                padding:14px 18px;margin-bottom:20px;">
      <div style="color:{qual_color};font-size:15px;font-weight:800;">{qual_label}</div>
      <div style="color:#9ca3af;font-size:12px;margin-top:6px;">
        Duration: <strong style="color:#e5e7eb;">{duration_str}</strong>
        &nbsp;·&nbsp; Disability documented: <strong style="color:#e5e7eb;">
          {'Yes' if meets_disability else 'Not yet on file'}
        </strong>
        &nbsp;·&nbsp; Months homeless: <strong style="color:#e5e7eb;">{months}</strong>
      </div>
    </div>"""

    # ── Section 2: Self-Attestation Letter ───────────────────────────────
    attestation = f"""
    <div style="background:#111827;border:1px solid #374151;border-radius:6px;
                padding:18px;font-size:13px;color:#e5e7eb;line-height:1.8;">
      <p style="margin:0 0 12px 0;">Date: {today.strftime('%B %d, %Y')}</p>
      <p style="margin:0 0 12px 0;">To: HUD / Local Coordinated Entry Program / Housing Authority</p>
      <p style="margin:0 0 12px 0;">
        I, the undersigned, hereby attest under penalty of perjury that I have been
        experiencing homelessness for approximately <strong>{duration_str}</strong>,
        beginning on or around <strong>{est_start.strftime('%B %Y')}</strong>.
        During this time I have been living outdoors, in emergency shelters, in motels
        paid for by emergency assistance programs, or in other places not meant for
        human habitation.
      </p>
      {'<p style="margin:0 0 12px 0;">I have a disabling condition as defined by HUD ' +
       '(physical health condition, mental health disorder, or substance use disorder) ' +
       'that substantially limits one or more major life activities.</p>'
       if meets_disability else
       '<p style="margin:0 0 12px 0;">[ATTACH: documentation of disabling condition from ' +
       'any healthcare provider, social worker, or case manager]</p>'}
      <p style="margin:0 0 12px 0;">
        I understand that HUD's definition of "chronically homeless" includes individuals
        who have been continuously homeless for one year or more, or who have experienced
        at least four episodes of homelessness in the last three years totaling at least
        twelve months, and who have a disabling condition.
      </p>
      <p style="margin:0 0 12px 0;">
        I am submitting this attestation to access priority permanent housing assistance
        under HUD's Continuum of Care program. I understand that I may be asked to
        provide additional documentation and I will cooperate fully.
      </p>
      <p style="margin:0 0 4px 0;">Signature: ___________________________</p>
      <p style="margin:0 0 4px 0;">Print Name: __________________________</p>
      <p style="margin:0 0 4px 0;">Date: ________________________________</p>
      <p style="margin:0;">Phone / Contact: ______________________</p>
    </div>"""

    # ── Section 3: Timeline ──────────────────────────────────────────────
    timeline_rows = ""
    if months >= 12:
        for i, label in enumerate([
            ("Start of homelessness (estimated)", est_start.strftime("%B %Y")),
            ("12-month threshold reached", (est_start + timedelta(days=365)).strftime("%B %Y")),
            ("Today (documentation date)", today.strftime("%B %d, %Y")),
        ]):
            timeline_rows += f"""
            <div style="display:flex;align-items:flex-start;margin-bottom:10px;">
              <div style="min-width:24px;height:24px;border-radius:50%;
                          background:#1d4ed8;color:#fff;font-size:11px;
                          display:flex;align-items:center;justify-content:center;
                          margin-right:12px;margin-top:1px;">{i+1}</div>
              <div>
                <div style="color:#e5e7eb;font-size:13px;">{_esc(label[0])}</div>
                <div style="color:#60a5fa;font-size:12px;">{_esc(label[1])}</div>
              </div>
            </div>"""
    else:
        timeline_rows = f"""
        <p style="color:#F97316;font-size:13px;">
          Current duration: {duration_str}.
          {12 - months} more month(s) needed to reach the 1-year continuous threshold.
          ESIS will update this packet automatically as duration increases.
        </p>"""

    # ── Section 4: Disability Checklist ──────────────────────────────────
    disability_items = [
        ("Has a disabling physical health condition", profile.has_life_threatening_condition, "e.g. chronic illness, mobility impairment"),
        ("Disability status on file (SSI/SSDI or medical record)", profile.is_disabled, "Any healthcare provider record counts"),
        ("Mental health condition documented", False, "ER visit record, social worker note, or self-attestation"),
        ("Substance use disorder — treatment record or SUD diagnosis", profile.is_known_substance_user, "Detox records, treatment program enrollment"),
    ]
    disability_html = _checklist(disability_items)
    disability_html += """
    <p style="color:#9ca3af;font-size:11px;margin-top:12px;">
      HUD accepts documentation from: any healthcare provider, social worker, case manager,
      outreach worker, or signed self-attestation when records are unavailable.
      ER visit records count. You do NOT need a formal diagnosis letter.
    </p>"""

    # ── Section 5: Application Instructions ──────────────────────────────
    programs = "\n".join(
        f'<p style="margin:3px 0;font-size:13px;color:#e5e7eb;">&#x25B8; {_esc(p)}</p>'
        for p in (housing_track.target_programs[:5] if housing_track else [
            "HUD Housing Choice Voucher (Section 8) — chronic homeless priority queue",
            "HUD Permanent Supportive Housing (PSH)",
            "Local Continuum of Care (CoC) program",
        ])
    )
    app_html = f"""
    <div style="margin-bottom:14px;">
      <p style="color:#FBBF24;font-size:13px;font-weight:700;margin:0 0 6px 0;">
        Option 1 — Call HUD Directly (No Local Agency Required)
      </p>
      <p style="color:#e5e7eb;font-size:13px;margin:0 0 4px 0;">
        📞 <strong>1-800-569-4287</strong> &nbsp;·&nbsp; Mon–Fri 8am–8pm ET
      </p>
      <p style="color:#9ca3af;font-size:12px;margin:0 0 12px 0;">
        Say: <em>"I meet HUD's definition of chronically homeless. I have been homeless
        for {duration_str}. I am requesting priority placement under the Permanent
        Supportive Housing program."</em>
      </p>
      <p style="color:#FBBF24;font-size:13px;font-weight:700;margin:0 0 6px 0;">
        Option 2 — Coordinated Entry ({_esc(city)})
      </p>
      <p style="color:#e5e7eb;font-size:13px;margin:0 0 4px 0;">
        Call 211 and say: <em>"I need a VI-SPDAT vulnerability assessment.
        I qualify as chronically homeless under HUD's definition."</em>
      </p>
      <p style="color:#e5e7eb;font-size:12px;font-weight:600;margin:12px 0 4px 0;">
        Target Programs:
      </p>
      {programs}
    </div>"""

    # ── Section 6: Rights ────────────────────────────────────────────────
    rights_html = """
    <ul style="margin:0;padding:0 0 0 18px;color:#e5e7eb;font-size:13px;line-height:1.9;">
      <li><strong>Priority queue:</strong> Chronically homeless individuals get priority
          placement — you go to the front of the PSH waitlist.</li>
      <li><strong>No local agency required:</strong> You can apply directly to HUD without
          going through a shelter or local agency first.</li>
      <li><strong>Self-attestation is valid:</strong> HUD accepts a signed statement when
          third-party records are not available.</li>
      <li><strong>ADA reasonable accommodation:</strong> Any housing program must accommodate
          a disabling condition in writing — request this in every application.</li>
      <li><strong>No sobriety requirement:</strong> HUD's Housing First policy prohibits
          programs from requiring sobriety as a condition of entry.</li>
    </ul>"""

    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  @page {{ size: A4; margin: 18mm 16mm; }}
  body {{
    font-family: -apple-system, Arial, sans-serif;
    background: #111827;
    color: #e5e7eb;
    margin: 0; padding: 0;
    font-size: 13px;
    line-height: 1.5;
  }}
  h1, h2, h3, p {{ margin: 0; padding: 0; }}
</style>
</head>
<body>
  <div style="text-align:center;margin-bottom:28px;
              border-bottom:1px solid #374151;padding-bottom:20px;">
    {logo_html}
    <h1 style="color:#FBBF24;font-size:20px;font-weight:900;
               letter-spacing:0.06em;margin:0;">
      HUD CHRONIC HOMELESSNESS DOCUMENTATION PACKET
    </h1>
    <p style="color:#9ca3af;font-size:12px;margin:6px 0 0 0;">
      Generated by ESIS · Case {_esc(structured.case_id)} · {today.strftime('%B %d, %Y')}
    </p>
    <p style="color:#6b7280;font-size:11px;margin:4px 0 0 0;">
      This packet is for submission to HUD, local housing authorities,
      coordinated entry programs, and legal aid organizations.
    </p>
  </div>

  {qual_html}

  {_section("Self-Attestation Letter", "#FBBF24", attestation)}
  {_section("Homelessness Timeline", "#60A5FA", timeline_rows)}
  {_section("Disability Documentation Checklist", "#A78BFA", disability_html)}
  {_section("Application Instructions", "#34D399", app_html)}
  {_section("Your Rights", "#F87171", rights_html)}

  <div style="text-align:center;margin-top:28px;color:#4b5563;font-size:10px;
              border-top:1px solid #1f2937;padding-top:14px;">
    ESIS — Edge Survival Intelligence System · Gemma 4 Good Hackathon 2026 ·
    Built with lived experience. · This packet does not constitute legal advice.
    Consult a housing attorney or legal aid organization for case-specific guidance.
  </div>
</body>
</html>"""


def generate_hud_packet_pdf(
    profile: PersonProfile,
    housing_track: HousingTrack,
    structured: StructuredCase,
) -> Optional[bytes]:
    """Return PDF bytes of the HUD chronic homelessness packet, or None on failure."""
    try:
        from app.services.pdf_service import _html_to_pdf
        html = _build_hud_html(profile, housing_track, structured)
        return _html_to_pdf(html)
    except Exception as exc:
        _log.warning("HUD packet PDF generation failed: %s", exc, exc_info=True)
        return None
