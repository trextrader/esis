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

from app.api.schemas import CaseInput, PersonProfile
from app.services.intake_service import normalize_case
from app.services.triage_service import score_risk
from app.services.recommendation_service import generate_recommendation
from app.services.packet_service import generate_packet
from app.services.audit_service import generate_audit
from app.services.routing_service import select_pathway
from app.services.location_service import zip_to_coords, priority_resources_for_risk
from app.services.housing_track_service import (
    assign_housing_track, get_resource_programs, EDU_LABELS, RESOURCE_PROGRAMS
)

CASES_DIR = REPO_ROOT / "data" / "demo_cases"
LOGO_PATH = Path(__file__).parent / "assets" / "esis_logo.png"
HF_TOKEN = os.environ.get("HF_TOKEN", "")

CASE_FILES = {
    "Post-Discharge Instability": "case_post_discharge.json",
    "Exposure / Cold Night Risk": "case_cold_night.json",
    "Administrative Pathway Collapse": "case_lost_documents.json",
    "Multi-Domain Failure": "case_mixed_failure.json",
    "Custom — enter your own": None,
}

# Resource type display config
RESOURCE_ICONS = {
    "emergency_room": "🏥",
    "medical": "🩺",
    "shelter": "🏠",
    "warming_center": "🔥",
    "crisis_line": "📞",
    "document": "📋",
    "legal": "⚖️",
    "transportation": "🚗",
    "emergency_lodging": "🛏️",
    "housing": "🏛️",
}
RESOURCE_COLORS = {
    "emergency_room": [239, 68, 68, 220],      # red
    "medical": [249, 115, 22, 220],             # orange
    "shelter": [34, 197, 94, 220],              # green
    "warming_center": [251, 191, 36, 220],      # amber
    "crisis_line": [99, 102, 241, 220],         # indigo
    "document": [20, 184, 166, 220],            # teal
    "legal": [168, 85, 247, 220],              # purple
    "transportation": [14, 165, 233, 220],      # sky blue
    "emergency_lodging": [236, 72, 153, 220],   # pink
    "housing": [132, 204, 22, 220],             # lime
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


def render_resource_map(person_lat: float, person_lng: float, resources: list[dict]) -> None:
    """Render a pydeck map with person location + nearby resources."""
    try:
        import pydeck as pdk

        # Person marker data
        person_data = [{
            "lat": person_lat,
            "lng": person_lng,
            "name": "Your Location",
            "type": "person",
            "color": [255, 255, 255, 255],
            "radius": 120,
        }]

        # Resource markers
        resource_data = []
        for r in resources:
            resource_data.append({
                "lat": r["lat"],
                "lng": r["lng"],
                "name": r["name"],
                "type": r["type"],
                "phone": r["phone"],
                "distance_mi": r.get("distance_mi", "?"),
                "hours": r.get("hours", ""),
                "color": RESOURCE_COLORS.get(r["type"], [100, 149, 237, 200]),
                "radius": 80,
            })

        person_layer = pdk.Layer(
            "ScatterplotLayer",
            data=person_data,
            get_position="[lng, lat]",
            get_radius="radius",
            get_fill_color="color",
            get_line_color=[255, 255, 255],
            line_width_min_pixels=2,
            stroked=True,
            pickable=True,
        )

        resource_layer = pdk.Layer(
            "ScatterplotLayer",
            data=resource_data,
            get_position="[lng, lat]",
            get_radius="radius",
            get_fill_color="color",
            pickable=True,
        )

        tooltip = {
            "html": "<b>{name}</b><br/>📞 {phone}<br/>🕐 {hours}<br/>📍 {distance_mi} mi away",
            "style": {"backgroundColor": "#0F172A", "color": "#F8FAFC", "fontSize": "12px"},
        }

        view_state = pdk.ViewState(
            latitude=person_lat,
            longitude=person_lng,
            zoom=10,
            pitch=30,
        )

        deck = pdk.Deck(
            layers=[resource_layer, person_layer],
            initial_view_state=view_state,
            tooltip=tooltip,
            map_style="mapbox://styles/mapbox/dark-v10",
        )

        st.pydeck_chart(deck)

    except Exception as e:
        st.warning(f"Map unavailable: {e}")
        # Fallback: table view
        for r in resources[:8]:
            icon = RESOURCE_ICONS.get(r["type"], "📍")
            st.markdown(
                f"{icon} **{r['name']}** — {r['phone']} "
                f"({r.get('distance_mi', '?')} mi) — {r.get('hours', '')}"
            )


# ── PAGE CONFIG ──────────────────────────────────────────────────────
st.set_page_config(
    page_title="ESIS — Edge Survival Intelligence System",
    page_icon="🛟",
    layout="wide",
)

# ── HEADER ───────────────────────────────────────────────────────────
hdr_left, hdr_right = st.columns([1, 5])
with hdr_left:
    if LOGO_PATH.exists():
        st.image(str(LOGO_PATH), width=110)
with hdr_right:
    st.markdown(
        """
        <div style='background:#08111F;padding:1.5rem 2rem;border-radius:8px;
                    margin-bottom:1.2rem;border:1px solid #1E3A5F'>
            <h1 style='color:#F8FAFC;margin:0;font-size:2rem'>ESIS</h1>
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
    cannot_congregate = st.checkbox(
        "Cannot use congregate shelter",
        value=case_data.get("cannot_congregate", False),
        help="Medical/PTSD/infectious condition requiring private room",
    )
    chronic_homeless = st.checkbox(
        "Chronically homeless (1+ yr or 4+ episodes)",
        value=case_data.get("chronic_homeless", False),
        help="HUD priority — direct housing voucher pathway available",
    )

# ── LOCATION INPUT ───────────────────────────────────────────────────
st.subheader("📍  Location (optional — improves resource matching)")

loc_col1, loc_col2 = st.columns([1, 2])

with loc_col1:
    zip_input = st.text_input(
        "ZIP code",
        max_chars=5,
        placeholder="e.g. 80202",
        help="Enter a Colorado ZIP code to find nearby resources",
    )

with loc_col2:
    st.markdown(
        """
        <small style='color:#94A3B8'>
        For GPS location, paste coordinates below (or use the GPS button on mobile):<br/>
        Format: <code>lat, lng</code> — e.g. <code>39.7392, -104.9903</code>
        </small>
        """,
        unsafe_allow_html=True,
    )
    gps_input = st.text_input(
        "GPS coordinates (lat, lng)",
        placeholder="39.7392, -104.9903",
        help="GPS is more accurate than ZIP code. Paste from your phone's maps app.",
    )

# Resolve location: GPS takes precedence over ZIP
person_lat: float | None = None
person_lng: float | None = None
location_source = ""

if gps_input.strip():
    try:
        parts = gps_input.strip().split(",")
        person_lat = float(parts[0].strip())
        person_lng = float(parts[1].strip())
        location_source = "GPS coordinates"
    except Exception:
        st.warning("Could not parse GPS coordinates — check format: `lat, lng`")

if person_lat is None and zip_input.strip():
    coords = zip_to_coords(zip_input.strip())
    if coords:
        person_lat, person_lng = coords
        location_source = f"ZIP {zip_input.strip()}"
    else:
        st.warning(f"ZIP code {zip_input.strip()} not found in Colorado database")

if person_lat is not None:
    st.success(f"Location resolved via {location_source}: {person_lat:.4f}, {person_lng:.4f}")

# ── PERSON PROFILE — Housing Track & Community Ping ──────────────────
with st.expander("👤  Person Profile — Housing Track Assignment & Community Ping (optional but powerful)", expanded=False):
    st.caption(
        "These answers determine which housing track ESIS assigns — different paths exist for "
        "different situations. All fields are optional and stored only for this session."
    )

    pro_col1, pro_col2, pro_col3 = st.columns(3)

    with pro_col1:
        st.markdown("**Medical / Legal Status**")
        is_disabled = st.checkbox("Has a disability", key="is_disabled",
            help="Physical, mental, or cognitive — qualifies for Section 811, SOAR/SSI")
        has_life_threatening = st.checkbox("Life-threatening condition if unsheltered", key="has_ltc",
            help="Triggers medical respite voucher — overrides waitlists")
        is_woman_children = st.checkbox("Woman with children under 18", key="is_wmc",
            help="Child welfare laws mandate priority family placement")
        disability_app_started = st.checkbox("Disability application already started", key="dis_app")

    with pro_col2:
        st.markdown("**Personal Situation**")
        has_employment = st.checkbox("Has current employment", key="has_job",
            help="Income accelerates Rapid Re-Housing approval")
        is_known_substance = st.checkbox("Known substance use disorder", key="is_sud",
            help="Routes to treatment + recovery housing, not standard shelter")
        is_elderly = st.checkbox("Age 50 or older", key="is_elderly",
            help="Senior housing programs, Area Agency on Aging priority")
        months_homeless = st.number_input(
            "Months homeless (0 = unknown)", min_value=0, max_value=360, value=0,
            key="months_homeless", step=1,
            help="12+ months = chronic homeless = federal housing priority"
        )

    with pro_col3:
        st.markdown("**Background & Skills**")
        education_level = st.selectbox(
            "Education level",
            ["", "none", "hs", "trade", "associates", "bachelors", "masters", "phd", "professional"],
            format_func=lambda x: EDU_LABELS.get(x, "— select —") if x else "— select —",
            key="edu_level",
        )
        professional_background = st.text_input(
            "Professional background (brief)",
            placeholder="e.g. Software engineer, 27 years CEO/Chairman",
            key="pro_bg",
        )
        skills_summary = st.text_input(
            "Skills / what you can offer",
            placeholder="e.g. Python, ML, technical writing, public speaking",
            key="skills",
        )

    st.markdown("**What do you need right now?**")
    resource_options = {
        "sleeping_bag": "Sleeping bag / blanket",
        "tent": "Tent",
        "food": "Food",
        "clothing": "Clothing",
        "phone": "Phone",
        "phone_service": "Free phone service",
        "laptop": "Laptop / PC",
        "cooler": "Cooler",
        "disability_application": "Disability application assistance",
    }
    need_cols = st.columns(3)
    selected_needs: list[str] = []
    for i, (key, label) in enumerate(resource_options.items()):
        if need_cols[i % 3].checkbox(label, key=f"need_{key}"):
            selected_needs.append(key)

    st.markdown("**Community Ping — Let your neighborhood help**")
    st.caption(
        "ESIS can broadcast an anonymized profile to local community networks (Nextdoor, neighborhood apps) "
        "describing your skills and needs. The community often has resources the system doesn't."
    )
    consent_ping = st.checkbox(
        "I consent to ESIS generating a community ping message I can share", key="consent_ping"
    )
    if consent_ping:
        ping_contact_cols = st.columns(3)
        with ping_contact_cols[0]:
            contact_email = st.text_input("Contact email (for ping)", key="ping_email", placeholder="you@email.com")
        with ping_contact_cols[1]:
            contact_phone = st.text_input("Contact phone (for ping)", key="ping_phone", placeholder="303-555-0100")
        with ping_contact_cols[2]:
            contact_apps = st.multiselect(
                "Messaging apps",
                ["Signal", "Telegram", "Discord", "WhatsApp", "Facebook Messenger",
                 "Instagram DM", "Twitter/X DM", "Skype", "LinkedIn"],
                key="ping_apps",
            )
    else:
        contact_email = contact_phone = ""
        contact_apps = []

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
        cannot_congregate=cannot_congregate,
        chronic_homeless=chronic_homeless,
    )

    # Build person profile from profile section
    profile = PersonProfile(
        is_disabled=st.session_state.get("is_disabled", False),
        is_woman_with_minor_children=st.session_state.get("is_wmc", False),
        has_life_threatening_condition=st.session_state.get("has_ltc", False),
        has_employment=st.session_state.get("has_job", False),
        is_known_substance_user=st.session_state.get("is_sud", False),
        is_elderly=st.session_state.get("is_elderly", False),
        months_homeless=int(st.session_state.get("months_homeless", 0)),
        education_level=st.session_state.get("edu_level", ""),
        professional_background=st.session_state.get("pro_bg", ""),
        skills_summary=st.session_state.get("skills", ""),
        resource_needs=selected_needs,
        consent_community_ping=st.session_state.get("consent_ping", False),
        contact_email=st.session_state.get("ping_email", ""),
        contact_phone=st.session_state.get("ping_phone", ""),
        contact_apps=[a.lower().replace(" ", "_") for a in st.session_state.get("ping_apps", [])],
        disability_application_started=st.session_state.get("dis_app", False),
    )

    with st.spinner("ESIS analyzing case..."):
        structured = normalize_case(inp)
        risk = score_risk(structured)
        housing_track = assign_housing_track(profile)
        recommendation = generate_recommendation(
            structured, risk,
            hf_token=HF_TOKEN or None,
            profile=profile,
            housing_track=housing_track,
        )
        packet = generate_packet(structured, risk, recommendation)
        routing = select_pathway(structured, risk)
        audit = generate_audit(structured, risk, recommendation,
                               primary_pathway=routing["primary_pathway"])

        # Location-aware resource matching
        nearby: list[dict] = []
        if person_lat is not None and person_lng is not None:
            nearby = priority_resources_for_risk(
                person_lat, person_lng,
                medical_risk=risk.medical_risk,
                exposure_risk=risk.exposure_risk,
                documentation_risk=risk.documentation_risk,
                cannot_congregate=cannot_congregate,
                chronic_homeless=chronic_homeless,
                no_transport=no_transport,
            )

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

    # ── SCREEN 2b: HOUSING TRACK ──────────────────────────────────
    has_profile_data = any([
        profile.is_disabled, profile.is_woman_with_minor_children,
        profile.has_life_threatening_condition, profile.has_employment,
        profile.is_known_substance_user, profile.is_elderly,
        profile.months_homeless > 0, profile.education_level,
        profile.resource_needs,
    ])

    if has_profile_data:
        st.subheader("2b  Housing Track Assignment")

        # Priority score badge
        score = housing_track.priority_score
        score_color = "#EF4444" if score >= 70 else "#F59E0B" if score >= 40 else "#10B981"
        st.markdown(
            f"""
            <div style='background:#0F172A;border:1px solid {score_color};border-radius:8px;
                        padding:1rem 1.5rem;margin-bottom:1rem'>
                <span style='color:{score_color};font-size:1.4rem;font-weight:bold'>
                    Priority Score: {score}/100
                </span>
                &nbsp;&nbsp;
                <span style='color:#F8FAFC;font-size:1.1rem'>
                    Track: {housing_track.track_name}
                </span>
            </div>
            """,
            unsafe_allow_html=True,
        )

        # Why this track
        if housing_track.rationale:
            st.markdown("**Why this track was assigned:**")
            for r in housing_track.rationale:
                st.markdown(f"- {r}")

        # Immediate actions for this track
        with st.expander(f"🎯  Immediate Actions — {housing_track.track_name}", expanded=True):
            for i, action in enumerate(housing_track.immediate_actions, 1):
                st.markdown(f"**{i}.** {action}")

        # Target programs
        with st.expander("🏛️  Target Housing Programs"):
            for prog in housing_track.target_programs:
                st.markdown(f"- {prog}")
            st.caption(f"Estimated timeline: {housing_track.estimated_timeline}")

        # Physical resource needs
        if profile.resource_needs:
            with st.expander("🎒  Physical Resource Needs — Where to Get Them"):
                resource_info = get_resource_programs(profile.resource_needs)
                for need_key, info in resource_info.items():
                    st.markdown(f"**{info['name']}**")
                    for src in info["sources"]:
                        st.markdown(f"  - {src}")

        # Disability application
        if profile.is_disabled and not profile.disability_application_started:
            st.error(
                "⚠️  **SSI/SSDI Application Not Started** — Every day without an application "
                "is a day of lost retroactive income. SOAR-trained workers can get you approved "
                "in 60–90 days vs. the standard 18-month process. Call 211 today and ask for "
                "a SOAR case manager."
            )

        # Community ping
        if profile.consent_community_ping and housing_track.community_ping_message:
            st.divider()
            st.subheader("📡  Community Ping — Ready to Share")
            st.caption(
                "Copy and post this to Nextdoor, your neighborhood Facebook group, LinkedIn, "
                "or any local community network. Real community members often have exactly what you need."
            )
            ping_text = housing_track.community_ping_message
            st.text_area("Community ping message", value=ping_text, height=200)
            st.download_button(
                "⬇️  Download Community Ping (.txt)",
                ping_text,
                file_name=f"esis_community_ping_{structured.case_id}.txt",
                mime="text/plain",
            )
            st.info(
                "💡 **Where to post:** Nextdoor (neighborhood tab) • Facebook neighborhood groups • "
                "LinkedIn (with privacy settings) • Reddit r/Denver or r/Colorado • "
                "Local mutual aid groups on Signal/Telegram • Church/community center bulletin boards"
            )

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

    # ── SCREEN 4: LOCATION-AWARE RESOURCE MAP ────────────────────
    if nearby:
        st.divider()
        st.subheader("4  Nearby Resources Map")
        st.caption(
            f"Showing {len(nearby)} resources near your location ({location_source}). "
            "White dot = you. Hover markers for details."
        )

        # Legend
        legend_cols = st.columns(len(RESOURCE_ICONS))
        for col, (rtype, icon) in zip(legend_cols, RESOURCE_ICONS.items()):
            col.markdown(f"{icon} {rtype.replace('_', ' ').title()}")

        render_resource_map(person_lat, person_lng, nearby)

        # Emergency contacts panel
        st.subheader("📞  Emergency Contacts — Act Now")

        emerg_cols = st.columns(3)
        emergency_numbers = [
            ("🚨 Emergency", "911", "Life-threatening emergency"),
            ("📞 211 Colorado", "211", "Resource hotline — 24/7"),
            ("🧠 988 Crisis", "988", "Mental health crisis line"),
            ("🏠 Warmline", "1-844-493-8255", "Colorado Crisis Services"),
            ("🆔 ID Recovery", "720-944-3666", "Denver ID Hub"),
            ("⚖️ Legal Aid", "303-837-1321", "Colorado Legal Services"),
        ]
        for i, (label, number, desc) in enumerate(emergency_numbers):
            with emerg_cols[i % 3]:
                st.markdown(
                    f"""
                    <div style='background:#0F172A;border:1px solid #1E3A5F;
                                border-radius:6px;padding:0.75rem;margin-bottom:0.5rem'>
                        <div style='color:#F8FAFC;font-weight:bold'>{label}</div>
                        <div style='color:#60A5FA;font-size:1.1rem;font-weight:bold'>{number}</div>
                        <div style='color:#94A3B8;font-size:0.8rem'>{desc}</div>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )

        # Split resources by category for focused display
        physical_resources = [r for r in nearby if r["type"] not in ("transportation", "emergency_lodging", "housing")]
        transport_resources = [r for r in nearby if r["type"] == "transportation"]
        lodging_resources = [r for r in nearby if r["type"] in ("emergency_lodging", "housing")]

        # Closest physical resources table
        st.markdown("**Closest resources by distance:**")
        for r in physical_resources[:8]:
            icon = RESOURCE_ICONS.get(r["type"], "📍")
            dist = r.get("distance_mi", "?")
            hours = r.get("hours", "")
            services_str = ", ".join(r.get("services", [])[:3])
            notes = r.get("notes", "")
            st.markdown(
                f"{icon} **{r['name']}** &nbsp;|&nbsp; 📞 `{r['phone']}` &nbsp;|&nbsp; "
                f"📍 {dist} mi &nbsp;|&nbsp; 🕐 {hours}  \n"
                f"<small style='color:#94A3B8'>{services_str}</small>",
                unsafe_allow_html=True,
            )
            if notes:
                with st.expander(f"ℹ️  How to use — {r['name']}", expanded=False):
                    st.markdown(notes)

        # Transportation panel
        if transport_resources or no_transport:
            st.markdown("---")
            st.markdown("### 🚗  Transportation Options")
            st.caption("Getting there is step one — here's every available path:")
            transport_all = transport_resources if transport_resources else []
            if not transport_all:
                # Fallback: show statewide transport options always
                from app.services.location_service import _load as _load_db
                db = _load_db()
                transport_all = [r for r in db["resources"] if r["type"] == "transportation"]

            t_cols = st.columns(2)
            for i, r in enumerate(transport_all):
                icon = "🚗"
                with t_cols[i % 2]:
                    st.markdown(
                        f"""
                        <div style='background:#0F172A;border:1px solid #1E3A5F;
                                    border-radius:6px;padding:0.75rem;margin-bottom:0.5rem'>
                            <div style='color:#F8FAFC;font-weight:bold'>{icon} {r['name']}</div>
                            <div style='color:#60A5FA'>📞 {r['phone']}</div>
                            <div style='color:#94A3B8;font-size:0.8rem'>🕐 {r.get('hours','')}</div>
                        </div>
                        """,
                        unsafe_allow_html=True,
                    )
                    notes = r.get("notes", "")
                    if notes:
                        with st.expander("How to get a free/subsidized ride"):
                            st.markdown(notes)

        # Lodging / Non-congregate / HUD panel
        if lodging_resources or cannot_congregate or chronic_homeless:
            st.markdown("---")
            st.markdown("### 🛏️  Lodging, Vouchers & Housing")

            if cannot_congregate:
                st.error(
                    "⚠️  **Non-congregate accommodation required** — "
                    "Congregate shelter is not a safe option. "
                    "Say exactly: *\"I cannot safely use congregate shelter due to [your condition] "
                    "— I am requesting a non-congregate accommodation or hotel voucher.\"* "
                    "This is protected under the ADA and HUD guidelines."
                )

            if chronic_homeless:
                st.warning(
                    "📋  **Chronic Homelessness Priority** — "
                    "You qualify for HUD's priority permanent housing track. "
                    "You do NOT need a local agency to apply — call HUD directly: "
                    "**1-800-569-4287** or visit hud.gov. "
                    "ESIS can generate your chronic homelessness documentation packet."
                )

            lodging_all = lodging_resources if lodging_resources else []
            if not lodging_all:
                from app.services.location_service import _load as _load_db
                db = _load_db()
                lodging_all = [r for r in db["resources"] if r["type"] in ("emergency_lodging", "housing")]

            for r in lodging_all:
                icon = RESOURCE_ICONS.get(r["type"], "🏠")
                notes = r.get("notes", "")
                st.markdown(
                    f"{icon} **{r['name']}** &nbsp;|&nbsp; 📞 `{r['phone']}` &nbsp;|&nbsp; 🕐 {r.get('hours','')}",
                    unsafe_allow_html=True,
                )
                if notes:
                    with st.expander(f"How to access — {r['name']}"):
                        st.markdown(notes)

        # Mesh/offline SOS note
        with st.expander("📡  Offline SOS — When Cell Service Is Gone"):
            st.markdown(
                """
                **ESIS V2 — Mesh Relay Network** *(architecture preview)*

                When cell/WiFi is unavailable, ESIS V2 will use device-to-device
                Bluetooth and LoRa mesh relaying to forward SOS packets
                through nearby ESIS-equipped phones — even without internet.

                **How it works:**
                1. Your phone broadcasts an encrypted SOS beacon via Bluetooth
                2. Nearby ESIS users relay it hop-by-hop toward cell coverage
                3. First node with signal uploads to emergency dispatch
                4. No internet required at origin — only one relay node needs connectivity

                **Compatible hardware:** Meshtastic LoRa devices, Android 12+ BLE mesh
                **Range per hop:** ~100m Bluetooth, ~3km LoRa
                **Status:** Architecture designed, implementation in V2 roadmap

                *This feature is life-critical infrastructure — implementation will follow
                rigorous security audit and field testing before release.*
                """
            )
    elif person_lat is None:
        st.divider()
        st.info(
            "💡 Enter a ZIP code or GPS coordinates above to see nearby shelters, "
            "warming centers, medical clinics, and emergency contacts on a map."
        )

    with st.expander("🔍  Audit Trail — Why this plan was selected"):
        st.json(audit)

    st.caption(
        "ESIS — Edge Survival Intelligence System | Gemma 4 Good Hackathon 2026 | "
        "Built with lived experience."
    )
