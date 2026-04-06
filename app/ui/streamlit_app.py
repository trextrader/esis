from __future__ import annotations
# app/ui/streamlit_app.py
import streamlit as st
import json
import os
import sys
from pathlib import Path

# Anchor repo root from this file's location — works on HuggingFace Spaces and local
REPO_ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(REPO_ROOT))

from app.api.schemas import CaseInput
from app.services.intake_service import normalize_case
from app.services.triage_service import score_risk
from app.services.recommendation_service import generate_recommendation
from app.services.packet_service import generate_packet
from app.services.audit_service import generate_audit
from app.services.routing_service import select_pathway

CASES_DIR = REPO_ROOT / "data" / "demo_cases"
HF_TOKEN = os.environ.get("HF_TOKEN", "")

CASE_FILES = {
    "Post-Discharge Instability": "case_post_discharge.json",
    "Exposure / Cold Night Risk": "case_cold_night.json",
    "Administrative Pathway Collapse": "case_lost_documents.json",
    "Multi-Domain Failure": "case_mixed_failure.json",
    "Custom — enter your own": None,
}


def load_case(filename: str) -> dict:
    with open(CASES_DIR / filename) as f:
        return json.load(f)


def risk_bar_color(score: float) -> str:
    if score >= 0.8:
        return "#EF4444"
    if score >= 0.5:
        return "#F59E0B"
    return "#10B981"


# ── PAGE CONFIG ──────────────────────────────────────────────────────
st.set_page_config(
    page_title="ESIS — Edge Survival Intelligence System",
    page_icon="🛟",
    layout="wide",
)

# ── HEADER ───────────────────────────────────────────────────────────
st.markdown(
    """
    <div style='background:#08111F;padding:1.5rem 2rem;border-radius:8px;
                margin-bottom:1.2rem;border:1px solid #1E3A5F'>
        <h1 style='color:#F8FAFC;margin:0;font-size:2rem'>🛟 ESIS</h1>
        <p style='color:#94A3B8;margin:0.3rem 0 0'>
            Edge Survival Intelligence System —
            Offline-first crisis navigation powered by Gemma 4
        </p>
    </div>
    """,
    unsafe_allow_html=True,
)

# ── SCREEN 1: INPUT ──────────────────────────────────────────────────
st.subheader("1  Describe the Situation")

col_left, col_right = st.columns([2, 1])

with col_left:
    selected_label = st.selectbox(
        "Load a demo scenario or enter your own:",
        list(CASE_FILES.keys()),
    )
    case_data: dict = {}
    if CASE_FILES[selected_label]:
        case_data = load_case(CASE_FILES[selected_label])

    raw_text = st.text_area(
        "Situation description",
        value=case_data.get("raw_text", ""),
        height=140,
        placeholder="e.g. Just discharged from hospital, severe pain, no shelter, phone at 10%...",
        key="raw_text_input",
    )

with col_right:
    st.markdown("**Active conditions:**")
    has_pain = st.checkbox("Medical pain / instability", value=case_data.get("has_pain", False))
    has_exposure = st.checkbox("Exposure / cold / heat risk", value=case_data.get("has_exposure_risk", False))
    has_shelter = st.checkbox("Has shelter tonight", value=case_data.get("has_shelter", False))
    lost_docs = st.checkbox("Lost ID / documents", value=case_data.get("has_lost_documents", False))
    low_battery = st.checkbox("Phone battery < 20%", value=case_data.get("low_battery", False))
    low_funds = st.checkbox("No cash / limited funds", value=case_data.get("low_funds", False))
    no_transport = st.checkbox("No transportation", value=case_data.get("no_transport", False))
    recent_discharge = st.checkbox(
        "Recent hospital discharge", value=case_data.get("recent_discharge", False)
    )

analyze_btn = st.button("🔍  Analyze with ESIS", type="primary", use_container_width=True)

if analyze_btn:
    inp = CaseInput(
        raw_text=raw_text,
        has_pain=has_pain,
        has_exposure_risk=has_exposure,
        has_shelter=has_shelter,
        has_lost_documents=lost_docs,
        low_battery=low_battery,
        low_funds=low_funds,
        no_transport=no_transport,
        recent_discharge=recent_discharge,
    )

    with st.spinner("ESIS analyzing case..."):
        structured = normalize_case(inp)
        risk = score_risk(structured)
        recommendation = generate_recommendation(structured, risk, hf_token=HF_TOKEN or None)
        packet = generate_packet(structured, risk, recommendation)
        audit = generate_audit(structured, risk, recommendation)
        routing = select_pathway(structured, risk)

    st.divider()

    # ── SCREEN 2: RISK ASSESSMENT ─────────────────────────────────
    st.subheader("2  Risk Assessment")

    if risk.requires_escalation:
        st.error(f"⚠️  ESCALATION REQUIRED — {risk.overall_priority.upper()} PRIORITY")
    elif risk.overall_priority == "medium":
        st.warning(f"Priority: {risk.overall_priority.upper()}")
    else:
        st.info(f"Priority: {risk.overall_priority.upper()}")

    r1, r2, r3 = st.columns(3)
    with r1:
        c = risk_bar_color(risk.medical_risk)
        st.markdown("**Medical Risk**")
        st.progress(risk.medical_risk)
        st.markdown(f"<span style='color:{c};font-weight:bold'>{risk.medical_risk:.0%}</span>",
                    unsafe_allow_html=True)
    with r2:
        c = risk_bar_color(risk.exposure_risk)
        st.markdown("**Exposure Risk**")
        st.progress(risk.exposure_risk)
        st.markdown(f"<span style='color:{c};font-weight:bold'>{risk.exposure_risk:.0%}</span>",
                    unsafe_allow_html=True)
    with r3:
        c = risk_bar_color(risk.documentation_risk)
        st.markdown("**Documentation Risk**")
        st.progress(risk.documentation_risk)
        st.markdown(f"<span style='color:{c};font-weight:bold'>{risk.documentation_risk:.0%}</span>",
                    unsafe_allow_html=True)

    st.markdown(f"**Primary pathway:** `{routing['primary_pathway']}`")
    st.markdown(f"**First contact:** {routing['contacts']['first_contact']}")
    if routing.get("battery_mode"):
        st.warning("Battery conservation mode active — route optimized for minimal steps")

    st.divider()

    # ── SCREEN 3: ACTION PLAN + PACKET ────────────────────────────
    st.subheader("3  ESIS Action Plan  *(Gemma 4 generated)*")

    st.markdown(f"**Summary:** {recommendation.summary}")
    st.markdown("**Top 3 Actions:**")
    for i, action in enumerate(recommendation.top_actions, 1):
        st.markdown(f"{i}. {action}")
    st.markdown(f"**Fallback:** {recommendation.fallback_plan}")

    with st.expander("📄  Full Advocacy Packet"):
        st.text_area("One-page summary", value=packet.one_page_summary, height=100)
        st.text_area("Advocate call script", value=packet.advocate_script, height=100)
        st.text_area("Referral handoff note", value=packet.referral_handoff, height=120)

        packet_text = (
            f"ESIS CASE PACKET\n"
            f"Case ID: {packet.case_id}\n"
            f"Generated: {packet.created_at}\n\n"
            f"SUMMARY:\n{packet.one_page_summary}\n\n"
            f"ADVOCATE SCRIPT:\n{packet.advocate_script}\n\n"
            f"REFERRAL HANDOFF:\n{packet.referral_handoff}\n\n"
            f"ACTION TIMELINE:\n"
            + "\n".join(f"{i + 1}. {a}" for i, a in enumerate(packet.action_timeline))
            + f"\n\nPRESERVATION CHECKLIST:\n"
            + "\n".join(f"- {p}" for p in packet.preservation_checklist)
        )
        st.download_button(
            "⬇️  Download Packet (.txt)",
            packet_text,
            file_name=f"esis_packet_{packet.case_id}.txt",
            mime="text/plain",
        )

    with st.expander("🔍  Audit Trail — Why this plan was selected"):
        st.json(audit)

    st.caption(
        "ESIS — Edge Survival Intelligence System | Gemma 4 Good Hackathon 2026 | "
        "Built with lived experience."
    )
