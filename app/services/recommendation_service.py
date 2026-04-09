from __future__ import annotations
# app/services/recommendation_service.py
import json
import re
import yaml
from pathlib import Path
from typing import Optional
from app.api.schemas import StructuredCase, RiskAssessment, RecommendationOutput, PersonProfile, HousingTrack

# Absolute path relative to this file — works on HuggingFace Spaces and local
TEMPLATES_PATH = Path(__file__).parent.parent.parent / "models" / "gemma" / "prompt_templates.yaml"


def _load_templates() -> dict:
    with open(TEMPLATES_PATH) as f:
        return yaml.safe_load(f)


def _is_acute_survival_state(risk: RiskAssessment, case: StructuredCase) -> bool:
    """True when immediate survival-horizon ordering is mandatory."""
    return (
        risk.exposure_risk >= 0.85
        or (risk.medical_risk >= 0.80 and case.constraints.get("recent_discharge"))
        or (risk.enforcement_risk >= 0.80 and case.constraints.get("was_displaced"))
        or (not case.constraints.get("has_shelter") and risk.exposure_risk >= 0.70)
    )


def _build_prompt(case: StructuredCase, risk: RiskAssessment, templates: dict) -> str:
    constraints_text = "\n".join(
        f"- {k}: {v}" for k, v in case.constraints.items() if v
    )
    return templates["case_reasoning_template"].format(
        case_summary=case.notes[:400],
        medical_risk=f"{risk.medical_risk:.2f}",
        exposure_risk=f"{risk.exposure_risk:.2f}",
        documentation_risk=f"{risk.documentation_risk:.2f}",
        enforcement_risk=f"{risk.enforcement_risk:.2f}",
        overall_priority=risk.overall_priority,
        requires_escalation=risk.requires_escalation,
        constraints=constraints_text or "None",
        policy_context="See models/policies/ for full policy rules.",
    )


def _parse_response(text: str) -> dict:
    """Extract JSON from Gemma response. Handles markdown code fences."""
    # Strip markdown fences if present
    text = re.sub(r"```(?:json)?\s*", "", text).strip()
    try:
        start = text.find("{")
        end = text.rfind("}") + 1
        if start == -1 or end == 0:
            return {}
        return json.loads(text[start:end])
    except Exception:
        return {}


def _fallback_output(case: StructuredCase, risk: RiskAssessment) -> RecommendationOutput:
    """Deterministic fallback when Gemma is unavailable."""
    domains_str = ", ".join(case.risk_domains) if case.risk_domains else "general support"
    acute = _is_acute_survival_state(risk, case)

    if acute:
        # ── HORIZON 1: Immediate survival (0–2 hours) ──────────────────
        h1 = []
        if risk.enforcement_risk >= 0.8 and case.constraints.get("was_displaced"):
            h1.append(
                "Relocate to the nearest indoor safe space immediately — "
                "current location was compromised by enforcement contact. "
                "Call 211 or walk to the nearest warming center / ER for safety."
            )
        if risk.exposure_risk >= 0.7 or not case.constraints.get("has_shelter"):
            h1.append(
                "Request same-night indoor placement now — call 211 and say: "
                "'I need emergency shelter tonight. I have a disability, recent hospital "
                "discharge, and cold exposure. I need a non-congregate placement.' "
                "This triggers a different pathway than a standard shelter request."
            )
        if not h1:
            h1.append("Call 211 immediately for same-night emergency placement")

        # ── HORIZON 2: Medical and continuity (next 24 hours) ──────────
        h2 = []
        if risk.medical_risk >= 0.8 or case.constraints.get("recent_discharge"):
            h2.append(
                "Treat this as a post-discharge medical continuity failure. "
                "Return to the ER and demand a social work evaluation — not triage. "
                "Say: 'I was recently discharged and am now homeless with worsening symptoms. "
                "I need a social worker to document a discharge-to-street event and reinstate "
                "my medical respite referral.' This is a documented patient safety failure."
            )
        if risk.enforcement_risk >= 0.5:
            h2.append(
                "Document the enforcement interaction: date, location, officer descriptions, "
                "commands given, belongings lost, what was denied. "
                "This record is evidence for legal aid, case management re-entry, "
                "and housing pathway restoration."
            )
        if not h2:
            h2.append("Contact a case manager or outreach worker within 24 hours")

        # ── HORIZON 3: Recovery track (days to weeks) ──────────────────
        h3 = []
        if risk.documentation_risk >= 0.5:
            h3.append("Generate ESIS advocacy packet and connect with coordinated entry / Colorado Legal Services (303-837-1321)")
        h3.append("Begin SOAR (SSI/SSDI) application — retroactive to filing date — once stable")

        top_actions = [h1[0], h2[0], h3[0]]

        return RecommendationOutput(
            summary=(
                f"Acute survival state — {domains_str} risk domains active. "
                f"Immediate indoor placement and medical continuity are the first priority. "
                f"Benefits and housing applications follow once tonight is safe."
            ),
            top_actions=top_actions,
            immediate_actions=h1[:2],
            stabilization_actions=h2[:2],
            recovery_actions=h3[:2],
            fallback_plan=(
                "If 211 and shelter are unavailable: go to the nearest ER — you have the right "
                "to warmth and safety. State your disability and recent discharge. "
                "Call 988 (crisis line) or Colorado Crisis Services (844-493-8255). "
                "Next steps once stable: SOAR application, HUD chronic homelessness voucher "
                "(1-800-569-4287), Colorado Legal Services (303-837-1321)."
            ),
            what_to_preserve=[
                "Medical records and discharge paperwork — evidence for respite reinstatement",
                "Any documentation of enforcement interaction — date, location, what was said",
                "Contact information for any caseworker or advocate you have spoken with",
            ],
        )

    # ── Non-acute fallback ──────────────────────────────────────────────
    actions = []
    if risk.medical_risk >= 0.8:
        actions.append("Seek emergency medical evaluation immediately — do not delay")
    if risk.exposure_risk >= 0.7:
        actions.append("Find indoor shelter or warming center now")
    if risk.documentation_risk >= 0.5:
        actions.append("Generate referral packet and begin ID replacement process")
    if risk.enforcement_risk >= 0.8:
        actions.insert(0, "Relocate immediately — location compromised by enforcement contact")
        actions.append("Document police interaction details for advocate or case manager")
    if risk.medical_risk >= 0.5 and not any("medical" in a.lower() for a in actions):
        actions.append("Contact hospital social worker to document misdiagnosis and request escalation")

    defaults = [
        "Contact 211 for immediate resource referral",
        "Document your current situation in writing",
        "Identify the nearest support services and walk there now",
    ]
    for d in defaults:
        if len(actions) >= 3:
            break
        actions.append(d)

    return RecommendationOutput(
        summary=(
            f"High-priority case with active risk domains: {domains_str}. "
            f"Immediate structured intervention required."
        ),
        top_actions=actions[:3],
        fallback_plan=(
            "If primary actions are not possible: contact 211, go to the nearest "
            "emergency room for safety and warmth, or call 988 (crisis line)."
        ),
        what_to_preserve=[
            "Any remaining ID or government documents",
            "Medical records and discharge paperwork",
            "Contact information for caseworkers or advocates",
        ],
    )


def generate_recommendation(
    case: StructuredCase,
    risk: RiskAssessment,
    hf_token: Optional[str] = None,
    profile: Optional[PersonProfile] = None,
    housing_track: Optional[HousingTrack] = None,
) -> RecommendationOutput:
    templates = _load_templates()
    prompt = _build_prompt(case, risk, templates)

    # Enrich prompt with profile and housing track context if available
    if profile or housing_track:
        profile_context = _build_profile_context(profile, housing_track)
        prompt = prompt + "\n\n" + profile_context

    if hf_token:
        try:
            from huggingface_hub import InferenceClient
            client = InferenceClient(token=hf_token)
            # Use chat_completion so the system prompt is passed correctly to -it models
            response = client.chat_completion(
                model="google/gemma-4-27b-it",
                messages=[
                    {"role": "system", "content": templates["system_prompt"]},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=768,
                temperature=0.3,
            )
            content = response.choices[0].message.content
            parsed = _parse_response(content)
            if parsed:
                return RecommendationOutput(
                    summary=parsed.get("summary", ""),
                    top_actions=parsed.get("top_actions", [])[:3],
                    fallback_plan=parsed.get("fallback_plan", ""),
                    what_to_preserve=parsed.get("what_to_preserve", []),
                )
        except Exception as e:
            print(f"Gemma inference failed: {e} — using deterministic fallback")

    return _fallback_output(case, risk)


def _build_profile_context(
    profile: Optional[PersonProfile],
    housing_track: Optional[HousingTrack],
) -> str:
    """Build additional context block from profile and housing track for Gemma prompt."""
    lines = ["PERSON PROFILE:"]
    if profile:
        if profile.is_disabled:
            lines.append("- Has a disability (SSI/SSDI pathway applicable)")
        if profile.is_woman_with_minor_children:
            lines.append("- Woman with minor children (family placement priority)")
        if profile.has_life_threatening_condition:
            lines.append("- Has life-threatening medical condition (respite voucher required)")
        if profile.has_employment:
            lines.append("- Has current employment (Rapid Re-Housing expedited)")
        if profile.is_known_substance_user:
            lines.append("- Substance use disorder (treatment + recovery housing track)")
        if profile.is_elderly:
            lines.append("- Age 50+ (senior housing programs applicable)")
        if profile.months_homeless >= 12:
            lines.append(f"- Chronically homeless: {profile.months_homeless} months (federal priority status)")
        if profile.education_level:
            from app.services.housing_track_service import EDU_LABELS
            lines.append(f"- Education: {EDU_LABELS.get(profile.education_level, profile.education_level)}")
        if profile.professional_background:
            lines.append(f"- Professional background: {profile.professional_background}")
        if profile.resource_needs:
            lines.append(f"- Resource needs: {', '.join(profile.resource_needs)}")
        if not profile.is_known_substance_user:
            lines.append("- Non-substance-user (sobriety not a barrier to any housing program)")

    if housing_track:
        lines.append(f"\nHOUSING TRACK ASSIGNED: {housing_track.track_name}")
        lines.append(f"Priority score: {housing_track.priority_score}/100")
        lines.append("Target programs:")
        for prog in housing_track.target_programs[:3]:
            lines.append(f"  - {prog}")

    lines.append(
        "\nIMPORTANT: Tailor your action plan specifically to this person's track. "
        "Do not recommend congregate shelter if cannot_congregate is true. "
        "Lead with the highest-leverage action for their specific situation."
    )

    # Survival-horizon override — injected when acute conditions are present
    if profile and housing_track:
        # We don't have risk/case here, but the system prompt already carries the rule.
        # Add a reminder so it is impossible to miss.
        lines.append(
            "\nSURVIVAL HORIZON OVERRIDE: If exposure_risk >= 0.85 or medical_risk >= 0.80 "
            "with recent_discharge or enforcement_risk >= 0.80 with displacement, then "
            "top_actions[0] MUST be immediate indoor placement or emergency transport. "
            "top_actions[1] MUST be medical continuity or enforcement documentation. "
            "top_actions[2] MUST be advocacy packet / coordinated entry. "
            "SOAR, SSI, Section 811, and complaint filing belong in fallback_plan ONLY."
        )

    return "\n".join(lines)
