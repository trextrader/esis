# PDF Export — Design Spec
**Date:** 2026-04-11
**Feature:** Download entire ESIS report as a styled PDF

---

## Overview

Add a "Download Report as PDF" button at the bottom of the Streamlit app. Clicking it generates a fully styled PDF containing all 7 report sections and downloads it as `esis_report_<case_id>.pdf`. Uses WeasyPrint for HTML-to-PDF conversion to match the app's visual quality.

---

## Dependencies

**`requirements.txt`** — add:
```
weasyprint>=60.0
```

**`packages.txt`** (new file at repo root) — system packages for HuggingFace Spaces (Ubuntu):
```
libpango-1.0-0
libcairo2
libgdk-pixbuf2.0-0
libffi-dev
shared-mime-info
```

---

## New File — `app/services/pdf_service.py`

Single public function:
```python
def generate_pdf(
    structured: StructuredCase,
    risk: RiskAssessment,
    housing_track: HousingTrack,
    recommendation: RecommendationOutput,
    packet: CasePacket,
    audit: dict,
    nearby: list,
) -> bytes
```

**Implementation:**
1. Build a single HTML string with inline CSS (no external files — WeasyPrint must resolve all assets at generation time)
2. Use ESIS brand colors (`#1a1a2e` dark background, `#e94560` red accent, white text)
3. Call `weasyprint.HTML(string=html).write_pdf()` and return bytes
4. Logo: embed as base64 from `app/ui/assets/esis_logo.png` so it renders without filesystem path issues on HuggingFace Spaces

**Error handling:**
- If WeasyPrint fails (missing system deps), catch the exception and return `None`
- Caller in `streamlit_app.py` shows `st.error(...)` if `None` is returned

---

## Report Sections (in order)

| # | Section | Source object |
|---|---|---|
| 1 | Header (logo, case ID, timestamp, city) | `structured` |
| 2 | Risk Assessment (4 scores + color bars) | `risk` |
| 3 | Housing Track (name, score, rationale, programs, timeline) | `housing_track` |
| 4 | Action Plan (summary, 3 horizons, fallback) | `recommendation` |
| 5 | Nearby Resources (name, phone, distance) | `nearby` |
| 6 | Advocacy Packet (one-page summary, advocate script, referral handoff) | `packet` |
| 7 | Audit Trail (pathway, flags, risk scores JSON) | `audit` |

---

## Streamlit Integration — `streamlit_app.py`

Location: after the audit trail expander, at the very bottom of the page.

```python
if risk is not None:
    pdf_bytes = generate_pdf(structured, risk, housing_track, recommendation, packet, audit, nearby or [])
    if pdf_bytes:
        st.download_button(
            label="⬇️ Download Full Report as PDF",
            data=pdf_bytes,
            file_name=f"esis_report_{structured.caseId}.pdf",
            mime="application/pdf",
        )
    else:
        st.error("PDF generation failed — WeasyPrint system dependencies may be missing.")
```

The button only renders after a case has been run (when `risk is not None`).

---

## Styling

- Dark ESIS theme (`#1a1a2e` background, `#e94560` accents)
- Page size: A4
- Sections separated by horizontal rules
- Risk bars rendered as colored `div` elements (no SVG/canvas — WeasyPrint handles these well)
- Monospace font for audit trail JSON block

---

## Out of Scope

- Map screenshot (pydeck map is WebGL-rendered, cannot be captured by WeasyPrint)
- Physical resources section (too long; judges have the app for this)
- Transport/lodging section (same reason)
