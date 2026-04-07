# Enforcement Interaction Layer — Implementation Record

**Goal:** Model police/law-enforcement contact as a first-class risk dimension in ESIS, with structured triage scoring, audit flags, response differentiation, and packet-level advocacy context.

**Status:** Implemented and tested — 17/17 tests passing.

---

## What Was Built

### Core insight

Police/enforcement contact is not an external event — it is a state-transition shock that can escalate or reduce survival risk depending on the interaction type. ESIS now models it as a fourth risk dimension alongside medical, exposure, and documentation risk.

### Files changed

| File | Change |
|------|--------|
| `app/api/schemas.py` | Added `has_police_contact`, `was_displaced`, `was_threatened_with_arrest`, `lost_belongings_due_to_interaction` to `CaseInput`; added `enforcement_risk: float` to `RiskAssessment` (clamped, included in priority/escalation logic) |
| `app/services/intake_service.py` | Enforcement flags → `enforcement` risk domain; enforcement keywords in free-text detection; enforcement constraints passed through to `StructuredCase` |
| `app/services/triage_service.py` | `_score_enforcement()` — scores displacement (0.25), criminalization threat (0.20), lost belongings (0.20), base domain (0.40), no shelter (0.10); wired into `score_risk()` return |
| `app/services/audit_service.py` | Three enforcement-specific audit flags; `enforcement_risk` threshold flag; enforcement score in `risk_scores` dict |
| `app/services/recommendation_service.py` | Fallback actions: when `enforcement_risk >= 0.8`, inserts "Relocate immediately — location compromised" as first action and appends documentation action |
| `app/services/packet_service.py` | When `enforcement_risk >= 0.5`, prepends enforcement note to one-page summary — turns packet into advocacy/legal continuity artifact |
| `app/ui/streamlit_app.py` | Four checkboxes under "Authority Interaction"; fourth risk card (🚔 Enforcement Risk) in Step 2; enforcement flags saved/loaded with case snapshot; save-location bug fixed |
| `models/policies/enforcement_rules.yaml` | Policy file: interaction types, harm model formula, welfare-first protocol, documentation fields, transparency policy |
| `data/demo_cases/case_enforcement_displacement.json` | Demo scenario: displacement order, trespass threat, freezing temps, no shelter |

---

## Triage Scoring Logic

```python
def _score_enforcement(case: StructuredCase) -> float:
    score = 0.0
    if "enforcement" in case.risk_domains:  score += 0.40
    if case.constraints.get("was_displaced"):  score += 0.25
    if case.constraints.get("was_threatened_with_arrest"):  score += 0.20
    if case.constraints.get("lost_belongings_due_to_interaction"):  score += 0.20
    if not case.constraints.get("has_shelter"):  score += 0.10
    return min(score, 1.0)
```

Displacement + threat + no shelter = **0.95 enforcement risk** → HIGH priority, escalation required.

---

## Demo Scenario Output (verified)

Input: `was_displaced=True`, `was_threatened_with_arrest=True`, `has_exposure_risk=True`, `has_shelter=False`

```
Risk domains: ['exposure', 'enforcement']
Enforcement risk: 0.95
Overall priority: HIGH
Requires escalation: True

Triggered flags:
 - Exposure risk threshold exceeded (0.70 >= 0.70)
 - Enforcement-driven harm risk elevated (0.95 >= 0.50)
 - Escalation required — at least one risk dimension >= 0.80
 - Enforcement-driven displacement event detected
 - Criminalization pressure detected during survival state

Top actions:
 - Relocate immediately to a safer area — current location has been compromised by enforcement contact
 - Find indoor shelter or warming center now
 - Document police interaction details — date, location, officer description, what was said — for advocate or case manager

Packet summary:
⚠️ Enforcement interaction contributed to current instability.
Displacement or criminalization risk observed. [HIGH PRIORITY]...
```

---

## Policy Principle

> A homelessness response system that cannot detect and document enforcement-driven harm is incomplete.

**Welfare-first protocol ESIS advocates:**
> "Are you going to be okay? Do you need anything right now — food, water, blankets, clothing, a sleeping bag, medical help, a phone charge, transport, or resource assistance?"
