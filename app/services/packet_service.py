from __future__ import annotations
# app/services/packet_service.py
from datetime import datetime
from app.api.schemas import StructuredCase, RiskAssessment, RecommendationOutput, CasePacket


def generate_packet(
    case: StructuredCase,
    risk: RiskAssessment,
    recommendation: RecommendationOutput,
) -> CasePacket:
    priority_label = risk.overall_priority.upper()
    domains_str = ", ".join(case.risk_domains) if case.risk_domains else "general"
    first_action = recommendation.top_actions[0] if recommendation.top_actions else "immediate triage"

    enforcement_note = ""
    if risk.enforcement_risk >= 0.5:
        enforcement_note = (
            "⚠️ Enforcement interaction contributed to current instability. "
            "Displacement or criminalization risk observed. "
        )

    summary = (
        f"{enforcement_note}"
        f"[{priority_label} PRIORITY] Individual presenting with {domains_str} risk. "
        f"Medical risk: {risk.medical_risk:.0%}. "
        f"Exposure risk: {risk.exposure_risk:.0%}. "
        f"{recommendation.summary}"
    )

    advocate_script = (
        f"Hello, I am calling on behalf of an individual in crisis who needs immediate assistance. "
        f"This person has been assessed with {priority_label} priority needs in: {domains_str}. "
        f"The recommended next step is: {first_action}. "
        f"This person {'requires escalation' if risk.requires_escalation else 'needs prompt support'}. "
        f"Can you please confirm availability and next steps?"
    )

    referral_lines = [
        f"ESIS Referral — {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
        f"Case ID: {case.case_id}",
        f"Priority: {priority_label}",
        f"Active Domains: {domains_str}",
        "",
        "Recommended Actions:",
    ] + [f"  {i + 1}. {a}" for i, a in enumerate(recommendation.top_actions)]

    return CasePacket(
        case_id=case.case_id,
        created_at=datetime.utcnow().isoformat(),
        one_page_summary=summary,
        advocate_script=advocate_script,
        referral_handoff="\n".join(referral_lines),
        action_timeline=recommendation.top_actions,
        preservation_checklist=recommendation.what_to_preserve,
    )
