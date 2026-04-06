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
SAVED_DIR = REPO_ROOT / "data" / "saved_cases"
SAVED_DIR.mkdir(parents=True, exist_ok=True)
LOGO_PATH = Path(__file__).parent / "assets" / "esis_logo.png"
HF_TOKEN = os.environ.get("HF_TOKEN", "")

DEMO_CASES = {
    "Post-Discharge Instability": ("demo", "case_post_discharge.json"),
    "Exposure / Cold Night Risk": ("demo", "case_cold_night.json"),
    "Administrative Pathway Collapse": ("demo", "case_lost_documents.json"),
    "Multi-Domain Failure": ("demo", "case_mixed_failure.json"),
}


def _build_case_list() -> dict[str, tuple[str, str] | None]:
    """Build dropdown options: demo cases + any saved cases + custom."""
    options: dict[str, tuple[str, str] | None] = {}
    options.update(DEMO_CASES)
    saved = sorted(SAVED_DIR.glob("*.json"))
    for p in saved:
        label = f"💾 {p.stem.replace('_', ' ').title()}"
        options[label] = ("saved", p.name)
    options["Custom — enter your own"] = None
    return options

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


def load_case(source: str, filename: str) -> dict:
    base = CASES_DIR if source == "demo" else SAVED_DIR
    with open(base / filename) as f:
        return json.load(f)


def save_case(name: str, data: dict) -> Path:
    slug = name.strip().lower().replace(" ", "_").replace("/", "-")
    slug = "".join(c for c in slug if c.isalnum() or c in "_-")[:40]
    path = SAVED_DIR / f"{slug}.json"
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
    return path


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

# ── GLOBAL CSS THEME ─────────────────────────────────────────────────
st.markdown("""
<style>
/* ── Base app background ── */
.stApp {
    background: #060D18;
}

/* ── Hide Streamlit chrome ── */
#MainMenu, footer, header { visibility: hidden; }
.block-container {
    padding-top: 1rem;
    padding-bottom: 3rem;
    max-width: 1280px;
}

/* ── Typography ── */
html, body, [class*="css"] {
    font-family: 'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont,
                 'Segoe UI', Roboto, sans-serif;
}

/* ── Subheaders ── */
h2, h3 { color: #F1F5F9 !important; letter-spacing: -0.01em; }

/* ── Section label pill ── */
.esis-section-label {
    display: inline-block;
    background: linear-gradient(135deg, #1E3A5F 0%, #0F2744 100%);
    color: #60A5FA;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    padding: 3px 10px;
    border-radius: 20px;
    border: 1px solid #2563EB33;
    margin-bottom: 0.4rem;
}

/* ── Card component ── */
.esis-card {
    background: #0D1B2E;
    border: 1px solid #1E3A5F;
    border-radius: 10px;
    padding: 1.1rem 1.4rem;
    margin-bottom: 0.8rem;
    transition: border-color 0.2s;
}
.esis-card:hover { border-color: #2563EB; }

/* ── Risk metric card ── */
.risk-card {
    background: #0D1B2E;
    border: 1px solid #1E3A5F;
    border-radius: 10px;
    padding: 1rem 1.2rem;
    text-align: center;
}
.risk-card .risk-label {
    color: #94A3B8;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 0.5rem;
}
.risk-card .risk-value {
    font-size: 2.2rem;
    font-weight: 800;
    line-height: 1;
    margin-bottom: 0.3rem;
}
.risk-card .risk-bar-bg {
    background: #1E293B;
    border-radius: 4px;
    height: 6px;
    margin-top: 0.5rem;
    overflow: hidden;
}
.risk-card .risk-bar-fill {
    height: 6px;
    border-radius: 4px;
    transition: width 0.6s ease;
}

/* ── Priority badge ── */
.priority-badge {
    display: inline-block;
    padding: 4px 14px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}
.priority-high   { background:#EF444422; color:#EF4444; border:1px solid #EF444466; }
.priority-medium { background:#F59E0B22; color:#F59E0B; border:1px solid #F59E0B66; }
.priority-low    { background:#10B98122; color:#10B981; border:1px solid #10B98166; }

/* ── Track score ring ── */
.track-ring {
    width: 80px; height: 80px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.4rem; font-weight: 800;
    margin: 0 auto 0.6rem;
}

/* ── Action item ── */
.action-item {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
    padding: 0.65rem 0.9rem;
    background: #0A1628;
    border-left: 3px solid #3B82F6;
    border-radius: 0 6px 6px 0;
    margin-bottom: 0.5rem;
}
.action-num {
    background: #3B82F6;
    color: white;
    font-weight: 700;
    font-size: 0.8rem;
    min-width: 22px; height: 22px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;
}
.action-text { color: #E2E8F0; font-size: 0.9rem; line-height: 1.5; }

/* ── Contact badge ── */
.contact-badge {
    background: #0F172A;
    border: 1px solid #1E3A5F;
    border-radius: 8px;
    padding: 0.8rem 1rem;
    margin-bottom: 0.5rem;
    text-align: center;
}
.contact-badge .cb-label { color: #64748B; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; }
.contact-badge .cb-number { color: #60A5FA; font-size: 1.15rem; font-weight: 700; margin: 2px 0; }
.contact-badge .cb-desc { color: #94A3B8; font-size: 0.75rem; }

/* ── Inputs ── */
.stTextInput input, .stTextArea textarea, .stNumberInput input {
    background: #0D1B2E !important;
    border: 1px solid #1E3A5F !important;
    color: #F1F5F9 !important;
    border-radius: 8px !important;
}
.stTextInput input:focus, .stTextArea textarea:focus {
    border-color: #3B82F6 !important;
    box-shadow: 0 0 0 2px #3B82F633 !important;
}

/* ── Selectbox ── */
.stSelectbox > div > div {
    background: #0D1B2E !important;
    border: 1px solid #1E3A5F !important;
    color: #F1F5F9 !important;
}

/* ── Primary button ── */
.stButton > button[kind="primary"] {
    background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%) !important;
    border: none !important;
    color: white !important;
    font-weight: 700 !important;
    font-size: 1rem !important;
    padding: 0.7rem 2rem !important;
    border-radius: 8px !important;
    letter-spacing: 0.02em !important;
    box-shadow: 0 4px 14px #2563EB44 !important;
    transition: all 0.2s !important;
}
.stButton > button[kind="primary"]:hover {
    transform: translateY(-1px) !important;
    box-shadow: 0 6px 20px #2563EB66 !important;
}

/* ── Checkboxes ── */
.stCheckbox label { color: #CBD5E1 !important; }

/* ── Expander ── */
.streamlit-expanderHeader {
    background: #0D1B2E !important;
    border: 1px solid #1E3A5F !important;
    border-radius: 8px !important;
    color: #94A3B8 !important;
}
.streamlit-expanderContent {
    background: #0A1525 !important;
    border: 1px solid #1E3A5F !important;
    border-top: none !important;
}

/* ── Progress bar ── */
.stProgress > div > div > div { background: #1E3A5F !important; }
.stProgress > div > div > div > div { border-radius: 4px !important; }

/* ── Divider ── */
hr { border-color: #1E3A5F !important; }

/* ── Alert boxes ── */
.stAlert { border-radius: 8px !important; }

/* ── Caption / small text ── */
.stCaption { color: #475569 !important; }

/* ── Scrollbar ── */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: #0D1B2E; }
::-webkit-scrollbar-thumb { background: #1E3A5F; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #2563EB; }
</style>
""", unsafe_allow_html=True)

# ── HEADER ───────────────────────────────────────────────────────────
logo_b64 = ""
if LOGO_PATH.exists():
    import base64
    with open(LOGO_PATH, "rb") as _f:
        logo_b64 = base64.b64encode(_f.read()).decode()

st.markdown(f"""
<div style='
    display: flex;
    align-items: center;
    gap: 1.5rem;
    background: linear-gradient(135deg, #060D18 0%, #0D1B2E 50%, #060D18 100%);
    border: 1px solid #1E3A5F;
    border-radius: 12px;
    padding: 1.2rem 2rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 4px 24px #00000066, inset 0 1px 0 #ffffff08;
'>
    {'<img src="data:image/png;base64,' + logo_b64 + '" style="height:64px;width:auto;border-radius:8px;flex-shrink:0;" />' if logo_b64 else '<span style="font-size:2.5rem">🛟</span>'}
    <div style="flex:1">
        <div style="display:flex;align-items:center;gap:0.8rem;flex-wrap:wrap">
            <span style="color:#F8FAFC;font-size:1.9rem;font-weight:800;letter-spacing:-0.02em">ESIS</span>
            <span style="
                background:#1E3A5F;color:#60A5FA;
                font-size:0.65rem;font-weight:700;letter-spacing:0.12em;
                text-transform:uppercase;padding:3px 10px;border-radius:20px;
                border:1px solid #2563EB44
            ">Gemma 4 Powered</span>
            <span style="
                background:#0D2E1A;color:#10B981;
                font-size:0.65rem;font-weight:700;letter-spacing:0.12em;
                text-transform:uppercase;padding:3px 10px;border-radius:20px;
                border:1px solid #10B98144
            ">Offline-First</span>
        </div>
        <div style="color:#64748B;font-size:0.9rem;margin-top:0.25rem">
            Edge Survival Intelligence System &nbsp;·&nbsp; Risk-constrained crisis navigation
            &nbsp;·&nbsp; Built with lived experience
        </div>
    </div>
    <div style="text-align:right;flex-shrink:0">
        <div style="color:#1E3A5F;font-size:0.65rem;text-transform:uppercase;letter-spacing:0.1em">Hackathon</div>
        <div style="color:#3B82F6;font-weight:700;font-size:0.85rem">Gemma 4 Good 2026</div>
    </div>
</div>
""", unsafe_allow_html=True)

# ── SCREEN 1: INPUT ──────────────────────────────────────────────────
st.markdown('<div class="esis-section-label">Step 1</div>', unsafe_allow_html=True)
st.subheader("Describe the Situation")

col_left, col_right = st.columns([2, 1])

with col_left:
    case_list = _build_case_list()
    selected_label = st.selectbox(
        "Load a demo scenario or enter your own:",
        list(case_list.keys()),
    )
    case_data: dict = {}
    if case_list[selected_label]:
        source, filename = case_list[selected_label]
        case_data = load_case(source, filename)
        # Restore ALL profile session_state keys from saved cases.
        # Always set every key (defaulting to empty/False/0) so stale
        # state from a previous session never bleeds into a loaded case.
        if source == "saved":
            _profile_map = {
                "is_disabled":    ("is_disabled",                  False),
                "has_ltc":        ("has_life_threatening_condition", False),
                "is_wmc":         ("is_woman_with_minor_children",  False),
                "has_job":        ("has_employment",                False),
                "is_sud":         ("is_known_substance_user",       False),
                "is_elderly":     ("is_elderly",                    False),
                "months_homeless":("months_homeless",               0),
                "edu_level":      ("education_level",               ""),
                "pro_bg":         ("professional_background",       ""),
                "skills":         ("skills_summary",                ""),
            }
            for sk, (ck, default) in _profile_map.items():
                st.session_state[sk] = case_data.get(ck, default)
            # Restore resource need checkboxes
            saved_needs = case_data.get("resource_needs", [])
            for need_key in ["sleeping_bag", "tent", "food", "clothing", "phone",
                             "phone_service", "laptop", "cooler", "disability_application"]:
                st.session_state[f"need_{need_key}"] = need_key in saved_needs

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

# selected_needs is populated inside the profile expander below;
# initialize here so save panel can reference it before that block renders
selected_needs: list[str] = [
    key for key in ["sleeping_bag", "tent", "food", "clothing", "phone",
                    "phone_service", "laptop", "cooler", "disability_application"]
    if st.session_state.get(f"need_{key}", False)
]

# ── SAVE SCENARIO ────────────────────────────────────────────────────
with st.expander("💾  Save this scenario for later", expanded=False):
    save_col1, save_col2 = st.columns([3, 1])
    with save_col1:
        save_name = st.text_input(
            "Scenario name",
            placeholder="e.g. My Situation — April 2026",
            key="save_name",
            label_visibility="collapsed",
        )
    with save_col2:
        save_btn = st.button("Save", key="save_btn", use_container_width=True)

    if save_btn:
        if not save_name.strip():
            st.warning("Enter a name first.")
        else:
            snapshot = {
                "raw_text": raw_text,
                "has_pain": has_pain,
                "has_exposure_risk": has_exposure,
                "has_shelter": has_shelter,
                "has_lost_documents": lost_docs,
                "low_battery": low_battery,
                "low_funds": low_funds,
                "no_transport": no_transport,
                "recent_discharge": recent_discharge,
                "cannot_congregate": cannot_congregate,
                "chronic_homeless": chronic_homeless,
                # Location
                "saved_zip": zip_input.strip() if zip_input.strip() else "",
                "saved_gps": gps_input.strip() if gps_input.strip() else "",
                # Profile fields
                "is_disabled": st.session_state.get("is_disabled", False),
                "is_woman_with_minor_children": st.session_state.get("is_wmc", False),
                "has_life_threatening_condition": st.session_state.get("has_ltc", False),
                "has_employment": st.session_state.get("has_job", False),
                "is_known_substance_user": st.session_state.get("is_sud", False),
                "is_elderly": st.session_state.get("is_elderly", False),
                "months_homeless": int(st.session_state.get("months_homeless", 0)),
                "education_level": st.session_state.get("edu_level", ""),
                "professional_background": st.session_state.get("pro_bg", ""),
                "skills_summary": st.session_state.get("skills", ""),
                "resource_needs": selected_needs,
            }
            path = save_case(save_name, snapshot)
            st.success(f"Saved as **{path.stem}** — it will appear in the dropdown on next load.")

# ── LOCATION INPUT ───────────────────────────────────────────────────
st.markdown('<div class="esis-section-label" style="margin-top:0.8rem">Location</div>', unsafe_allow_html=True)
st.subheader("📍 Where are you? *(optional — enables resource map)*")

loc_col1, loc_col2 = st.columns([1, 2])

with loc_col1:
    zip_input = st.text_input(
        "ZIP code",
        value=case_data.get("saved_zip", ""),
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
        value=case_data.get("saved_gps", ""),
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
    selected_needs = []
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
    st.markdown('<div class="esis-section-label">Step 2</div>', unsafe_allow_html=True)
    st.subheader("Risk Assessment")

    # Priority banner
    p = risk.overall_priority
    if risk.requires_escalation:
        st.markdown("""
        <div style='background:#1A0808;border:1px solid #EF4444;border-radius:8px;
                    padding:0.9rem 1.2rem;display:flex;align-items:center;gap:0.8rem'>
            <span style='font-size:1.4rem'>⚠️</span>
            <div>
                <span style='color:#EF4444;font-weight:800;font-size:1rem;
                             text-transform:uppercase;letter-spacing:0.05em'>
                    Escalation Required
                </span>
                <span style='color:#FCA5A5;font-size:0.85rem;margin-left:0.5rem'>
                    HIGH PRIORITY — Immediate intervention needed
                </span>
            </div>
        </div>""", unsafe_allow_html=True)
    else:
        badge_class = "priority-medium" if p == "medium" else "priority-low"
        st.markdown(f"""
        <div style='background:#0D1B2E;border:1px solid #1E3A5F;border-radius:8px;
                    padding:0.7rem 1.2rem;display:inline-flex;align-items:center;gap:0.6rem'>
            <span class="priority-badge {badge_class}">{p.upper()}</span>
            <span style='color:#94A3B8;font-size:0.85rem'>overall priority</span>
        </div>""", unsafe_allow_html=True)

    st.markdown("<div style='height:0.8rem'></div>", unsafe_allow_html=True)

    # Risk metric cards
    def _risk_card(label: str, score: float, icon: str) -> str:
        c = risk_bar_color(score)
        pct = int(score * 100)
        return f"""
        <div class="risk-card">
            <div class="risk-label">{icon} {label}</div>
            <div class="risk-value" style="color:{c}">{pct}%</div>
            <div class="risk-bar-bg">
                <div class="risk-bar-fill" style="width:{pct}%;background:{c}"></div>
            </div>
        </div>"""

    r1, r2, r3 = st.columns(3)
    with r1:
        st.markdown(_risk_card("Medical Risk", risk.medical_risk, "🩺"), unsafe_allow_html=True)
    with r2:
        st.markdown(_risk_card("Exposure Risk", risk.exposure_risk, "🌡️"), unsafe_allow_html=True)
    with r3:
        st.markdown(_risk_card("Documentation Risk", risk.documentation_risk, "📋"), unsafe_allow_html=True)

    st.markdown("<div style='height:0.5rem'></div>", unsafe_allow_html=True)

    pathway_col, contact_col = st.columns([1, 2])
    with pathway_col:
        st.markdown(f"""
        <div class="esis-card" style="padding:0.7rem 1rem">
            <div style="color:#64748B;font-size:0.7rem;text-transform:uppercase;
                        letter-spacing:0.1em;margin-bottom:0.2rem">Primary Pathway</div>
            <div style="color:#60A5FA;font-weight:700;font-size:0.95rem">
                {routing['primary_pathway']}
            </div>
        </div>""", unsafe_allow_html=True)
    with contact_col:
        st.markdown(f"""
        <div class="esis-card" style="padding:0.7rem 1rem">
            <div style="color:#64748B;font-size:0.7rem;text-transform:uppercase;
                        letter-spacing:0.1em;margin-bottom:0.2rem">First Contact</div>
            <div style="color:#E2E8F0;font-size:0.9rem">
                {routing['contacts']['first_contact']}
            </div>
        </div>""", unsafe_allow_html=True)

    if routing.get("battery_mode"):
        st.warning("🔋 Battery conservation mode — route optimized for minimal steps")

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
        st.markdown('<div class="esis-section-label">Step 2b</div>', unsafe_allow_html=True)
        st.subheader("Housing Track Assignment")

        score = housing_track.priority_score
        score_color = "#EF4444" if score >= 70 else "#F59E0B" if score >= 40 else "#10B981"
        score_bg = "#1A0808" if score >= 70 else "#1A1200" if score >= 40 else "#061A0E"

        # Track header card
        st.markdown(f"""
        <div style='background:{score_bg};border:1px solid {score_color}44;border-radius:10px;
                    padding:1.2rem 1.5rem;margin-bottom:1rem;
                    display:flex;align-items:center;gap:1.5rem'>
            <div style='
                width:72px;height:72px;border-radius:50%;flex-shrink:0;
                background:conic-gradient({score_color} {score * 3.6}deg, #1E293B 0deg);
                display:flex;align-items:center;justify-content:center;
                box-shadow:0 0 20px {score_color}44
            '>
                <div style='width:54px;height:54px;border-radius:50%;background:{score_bg};
                            display:flex;align-items:center;justify-content:center;
                            color:{score_color};font-size:1.1rem;font-weight:800'>
                    {score}
                </div>
            </div>
            <div>
                <div style='color:#94A3B8;font-size:0.7rem;text-transform:uppercase;
                            letter-spacing:0.1em'>Housing Track</div>
                <div style='color:#F1F5F9;font-size:1.1rem;font-weight:700;margin-top:0.15rem'>
                    {housing_track.track_name}
                </div>
                <div style='color:{score_color};font-size:0.8rem;margin-top:0.2rem'>
                    Priority score {score}/100
                </div>
            </div>
        </div>""", unsafe_allow_html=True)

        # Rationale pills
        if housing_track.rationale:
            pills_html = "".join(
                f"<span style='display:inline-block;background:#0D1B2E;color:#94A3B8;"
                f"border:1px solid #1E3A5F;border-radius:20px;font-size:0.75rem;"
                f"padding:3px 12px;margin:3px 3px 3px 0'>{r}</span>"
                for r in housing_track.rationale
            )
            st.markdown(f"<div style='margin-bottom:0.8rem'>{pills_html}</div>", unsafe_allow_html=True)

        # Immediate actions
        with st.expander(f"🎯  Immediate Actions — {housing_track.track_name}", expanded=True):
            actions_html = "".join(
                f"<div class='action-item'>"
                f"<div class='action-num'>{i}</div>"
                f"<div class='action-text'>{action}</div>"
                f"</div>"
                for i, action in enumerate(housing_track.immediate_actions, 1)
            )
            st.markdown(actions_html, unsafe_allow_html=True)

        # Target programs
        with st.expander("🏛️  Target Housing Programs"):
            for prog in housing_track.target_programs:
                st.markdown(f"- {prog}")
            st.markdown(
                f"<div style='color:#64748B;font-size:0.8rem;margin-top:0.5rem'>"
                f"⏱️ {housing_track.estimated_timeline}</div>",
                unsafe_allow_html=True,
            )

        # Physical resource needs
        if profile.resource_needs:
            with st.expander("🎒  Physical Resources — Where to Get Them Now"):
                resource_info = get_resource_programs(profile.resource_needs)
                for need_key, info in resource_info.items():
                    st.markdown(f"""
                    <div class="esis-card" style="margin-bottom:0.6rem">
                        <div style="color:#60A5FA;font-weight:600;margin-bottom:0.4rem">
                            {info['name']}
                        </div>
                        {''.join(f"<div style='color:#94A3B8;font-size:0.82rem;margin:2px 0'>→ {src}</div>" for src in info['sources'])}
                    </div>""", unsafe_allow_html=True)

        # Disability application alert
        if profile.is_disabled and not profile.disability_application_started:
            st.markdown("""
            <div style='background:#1A0808;border:1px solid #EF4444;border-radius:8px;
                        padding:0.9rem 1.2rem;margin:0.5rem 0'>
                <div style='color:#EF4444;font-weight:700;margin-bottom:0.3rem'>
                    ⚠️ SSI/SSDI Application Not Started
                </div>
                <div style='color:#FCA5A5;font-size:0.85rem'>
                    Every day without an application is a day of lost retroactive income.
                    SOAR-trained workers can get you approved in 60–90 days vs. 18 months standard.
                    <strong>Call 211 today and ask for a SOAR case manager.</strong>
                </div>
            </div>""", unsafe_allow_html=True)

        # Community ping
        if profile.consent_community_ping and housing_track.community_ping_message:
            st.markdown('<div style="height:0.5rem"></div>', unsafe_allow_html=True)
            st.markdown("""
            <div style='display:flex;align-items:center;gap:0.6rem;margin-bottom:0.6rem'>
                <span style='font-size:1.1rem'>📡</span>
                <span style='color:#F1F5F9;font-size:1rem;font-weight:700'>Community Ping — Ready to Share</span>
            </div>
            <div style='color:#64748B;font-size:0.82rem;margin-bottom:0.5rem'>
                Post to Nextdoor, neighborhood Facebook groups, LinkedIn, or local mutual aid networks.
                The community has resources that the system doesn't.
            </div>""", unsafe_allow_html=True)
            ping_text = housing_track.community_ping_message
            st.text_area("", value=ping_text, height=180, key="ping_display",
                         label_visibility="collapsed")
            dl_col, tip_col = st.columns([1, 3])
            with dl_col:
                st.download_button(
                    "⬇️  Download Ping (.txt)",
                    ping_text,
                    file_name=f"esis_ping_{structured.case_id}.txt",
                    mime="text/plain",
                )
            with tip_col:
                st.markdown(
                    "<small style='color:#475569'>Post to: Nextdoor · Facebook Groups · LinkedIn · "
                    "Reddit r/Denver · Signal/Telegram mutual aid · Church boards</small>",
                    unsafe_allow_html=True,
                )

        st.divider()

    # ── SCREEN 3: ACTION PLAN + PACKET ────────────────────────────
    st.markdown('<div class="esis-section-label">Step 3</div>', unsafe_allow_html=True)
    st.subheader("ESIS Action Plan")
    gemma_active = bool(HF_TOKEN)
    mode_color = "#10B981" if gemma_active else "#F59E0B"
    mode_label = "Gemma 4 · Live inference" if gemma_active else "Deterministic fallback · Add HF_TOKEN for AI"
    st.markdown(
        f"<div style='color:{mode_color};font-size:0.8rem;margin-bottom:1rem'>"
        f"● {mode_label} &nbsp;·&nbsp; "
        "<span style='color:#475569'>Risk-constrained · Explainable</span></div>",
        unsafe_allow_html=True,
    )

    # Summary card
    st.markdown(f"""
    <div class="esis-card">
        <div style="color:#64748B;font-size:0.7rem;text-transform:uppercase;
                    letter-spacing:0.1em;margin-bottom:0.4rem">Situation Summary</div>
        <div style="color:#E2E8F0;font-size:0.95rem;line-height:1.6">
            {recommendation.summary}
        </div>
    </div>""", unsafe_allow_html=True)

    # Top 3 actions
    st.markdown("<div style='color:#94A3B8;font-size:0.8rem;margin:0.8rem 0 0.4rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em'>Top 3 Actions</div>", unsafe_allow_html=True)
    actions_html = "".join(
        f"<div class='action-item'>"
        f"<div class='action-num'>{i}</div>"
        f"<div class='action-text'>{action}</div>"
        f"</div>"
        for i, action in enumerate(recommendation.top_actions, 1)
    )
    st.markdown(actions_html, unsafe_allow_html=True)

    # Fallback plan
    st.markdown(f"""
    <div style='background:#0A1525;border:1px solid #1E3A5F;border-radius:8px;
                padding:0.7rem 1rem;margin-top:0.8rem;
                border-left:3px solid #64748B'>
        <span style='color:#64748B;font-size:0.75rem;text-transform:uppercase;
                     letter-spacing:0.08em;font-weight:600'>Fallback Plan · </span>
        <span style='color:#94A3B8;font-size:0.85rem'>{recommendation.fallback_plan}</span>
    </div>""", unsafe_allow_html=True)

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
        st.markdown('<div class="esis-section-label">Step 4</div>', unsafe_allow_html=True)
        st.subheader("Nearby Resources Map")
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
        st.markdown('<div class="esis-section-label" style="margin-top:0.5rem">Emergency</div>', unsafe_allow_html=True)
        st.subheader("Contacts — Act Now")

        emergency_numbers = [
            ("🚨", "911", "Emergency", "Life-threatening"),
            ("📞", "211", "Colorado Hotline", "Resources 24/7"),
            ("🧠", "988", "Crisis Line", "Mental health"),
            ("🏠", "844-493-8255", "CO Crisis Services", "Warmline/walk-in"),
            ("🆔", "720-944-3666", "Denver ID Hub", "Document recovery"),
            ("⚖️", "303-837-1321", "Legal Aid", "Colorado Legal Svc"),
        ]
        emerg_cols = st.columns(3)
        for i, (icon, number, label, desc) in enumerate(emergency_numbers):
            with emerg_cols[i % 3]:
                st.markdown(f"""
                <div class="contact-badge">
                    <div class="cb-label">{icon} {label}</div>
                    <div class="cb-number">{number}</div>
                    <div class="cb-desc">{desc}</div>
                </div>""", unsafe_allow_html=True)

        # Split resources by category for focused display
        physical_resources = [r for r in nearby if r["type"] not in ("transportation", "emergency_lodging", "housing")]
        transport_resources = [r for r in nearby if r["type"] == "transportation"]
        lodging_resources = [r for r in nearby if r["type"] in ("emergency_lodging", "housing")]

        # Closest physical resources table
        st.markdown("**Closest resources by distance:**")
        for r in physical_resources[:8]:
            icon = RESOURCE_ICONS.get(r["type"], "📍")
            dist_mi = r.get("distance_mi", 0)
            dist_label = "Statewide" if dist_mi == 0 else f"{dist_mi} mi"
            hours = r.get("hours", "")
            services_str = ", ".join(r.get("services", [])[:3])
            notes = r.get("notes", "")
            st.markdown(
                f"{icon} **{r['name']}** &nbsp;|&nbsp; 📞 `{r['phone']}` &nbsp;|&nbsp; "
                f"📍 {dist_label} &nbsp;|&nbsp; 🕐 {hours}  \n"
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
