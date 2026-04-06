from __future__ import annotations
# app/services/housing_track_service.py
"""
Assigns a housing track and priority score to a person based on their
profile. Tracks are ordered by urgency and mapped to real programs.

Priority scoring (additive, max 100):
  Medical respite condition    +30
  Woman with minor children    +25
  Disabled                     +20
  Chronic homeless (≥12 mo)    +20
  Life-threatening condition   +20  (overlaps respite — use max)
  Elderly (>50)                +15
  Substance use (treatment)    +10  (different track, not lower priority)
  Has employment               +10  (stability track boost)
  Education level              0–5  (community ping enrichment)
"""

from app.api.schemas import PersonProfile, HousingTrack

# ── TRACK DEFINITIONS ─────────────────────────────────────────────────

TRACKS = {
    "medical_respite": {
        "name": "Medical Respite — Immediate Safe Housing",
        "programs": [
            "Colorado Medical Respite Program (CMRP) — non-congregate medical recovery housing",
            "Stout Street Health Center respite referral",
            "UCHealth social work emergency respite request",
            "Denver Health Community Health Services respite voucher",
        ],
        "timeline": "Same day — medical necessity overrides waitlists",
        "actions": [
            "Request a MEDICAL RESPITE VOUCHER from ER social worker before discharge",
            "If already outside: call 303-293-2220 (Stout Street) and state life-threatening condition",
            "Document condition in writing — this triggers a protected pathway under ADA",
            "If denied: call 211 and say 'medical respite placement needed — life-threatening condition'",
        ],
    },
    "family_protection": {
        "name": "Family / Child Protection Track",
        "programs": [
            "Family Homelessness Prevention and Rapid Re-Housing (CO DHHS)",
            "Safe Families for Children emergency placement",
            "Catholic Charities Family Services",
            "Salvation Army Family Shelter — priority intake",
            "Section 8 Family Unification Program (FUP) — HUD priority",
        ],
        "timeline": "24–72 hours — child welfare laws trigger mandatory placement",
        "actions": [
            "Call 211 and explicitly say 'I have minor children and need emergency family shelter'",
            "Request Family Unification Program (FUP) voucher via local housing authority",
            "If children at risk of separation: call Denver Human Services 720-944-3666",
            "Document that you have custody — this accelerates placement",
        ],
    },
    "disability_housing": {
        "name": "Disability Housing Track",
        "programs": [
            "HUD Section 811 Supportive Housing for Persons with Disabilities",
            "SSI/SSDI Outreach, Access, and Recovery (SOAR) program",
            "Disability-specific rapid rehousing through Denver Human Services",
            "Colorado Division of Vocational Rehabilitation (DVR) housing support",
            "ADA reasonable accommodation — existing programs must accommodate disability",
        ],
        "timeline": "SOAR application: 60–90 days. Section 811: 3–6 months with active application",
        "actions": [
            "Start SOAR (SSI/SSDI) application immediately — retroactive payments from application date",
            "Request disability accommodation in writing from any housing program you apply to",
            "Contact Colorado Legal Services (303-837-1321) for benefits application support",
            "Document disability with any available medical records — ER records count",
            "Apply for HUD Section 811 through Colorado Division of Housing",
        ],
    },
    "treatment_recovery": {
        "name": "Treatment & Recovery Track",
        "programs": [
            "Stout Street Health Center — integrated substance use + housing",
            "Step Denver — residential recovery + transitional housing + job training",
            "Sober living homes network (Oxford Houses Colorado)",
            "ACHC SUD Detox — acute stabilization before housing placement",
            "Colorado Recovery — peer-supported recovery housing",
            "Medicaid SUD coverage — Colorado covers all levels of care",
        ],
        "timeline": "Detox: 3–7 days. Residential treatment: 30–90 days. Sober living: 6–12 months",
        "actions": [
            "Call Denver CARES (720-944-3700) for same-day substance use crisis stabilization",
            "Request Colorado Medicaid enrollment — covers full SUD treatment at no cost",
            "After stabilization: contact Stout Street (303-293-2220) for integrated housing + treatment",
            "Oxford House application (oxfordhouses.org) — peer-run sober living, low cost",
            "Recovery housing is NOT the same as shelter — ask specifically for 'recovery housing placement'",
        ],
    },
    "chronic_priority": {
        "name": "Chronic Homelessness Priority — Permanent Supportive Housing",
        "programs": [
            "HUD Permanent Supportive Housing (PSH) — highest federal priority",
            "Pathways to Home (Denver) — Housing First model, no sobriety requirement",
            "Colorado Rental Assistance Program (CRAP) emergency voucher",
            "Denver's Road Home — coordinated entry with chronic homeless priority",
            "HUD Section 8 / Housing Choice Voucher — priority waitlist for chronically homeless",
        ],
        "timeline": "Coordinated entry: 1–4 weeks. PSH placement: 30–90 days from active application",
        "actions": [
            "Request Coordinated Entry assessment at any shelter or via 211 — do this TODAY",
            "State chronic homelessness explicitly: '12+ consecutive months or 4+ episodes totaling 12 months'",
            "Apply for HUD PSH directly: hud.gov — chronic status means priority queue",
            "Pathways to Home (720-932-3023) — Housing First, no requirements, permanent placement",
            "Request a VI-SPDAT (vulnerability assessment) — your score determines placement priority",
        ],
    },
    "senior_services": {
        "name": "Senior Services Track (50+)",
        "programs": [
            "HUD Section 202 — Supportive Housing for the Elderly",
            "Denver Regional Council of Governments Area Agency on Aging",
            "Colorado State Veterans Home (if veteran)",
            "STRIDE Community Health elder care services",
            "Seniors' Resource Center emergency housing placement",
        ],
        "timeline": "Section 202: 60–180 days. Emergency elder placement: 24–72 hours",
        "actions": [
            "Call Denver Area Agency on Aging: 303-480-6700 — elder emergency housing is separate queue",
            "Request Section 202 application through Denver Housing Authority",
            "If veteran: contact Denver VA (303-399-8020) for VASH voucher — elder veterans have priority",
            "STRIDE Community Health (303-344-9355) for elder health + housing coordination",
        ],
    },
    "working_stability": {
        "name": "Working / Employment Stability Track",
        "programs": [
            "Rapid Re-Housing (RRH) — deposit + first month + case management",
            "Colorado Homeless Contribution Tax Credit program (employer partnerships)",
            "Employee Assistance Programs (EAP) — many employers offer emergency housing aid",
            "Temporary Rental Assistance through 211",
            "Colorado Works (TANF) emergency assistance",
        ],
        "timeline": "RRH placement: 1–3 weeks. Deposit assistance: 3–5 business days",
        "actions": [
            "Request Rapid Re-Housing referral via 211 — employment income speeds qualification",
            "Ask your employer HR about Employee Assistance Program (EAP) emergency housing support",
            "Apply for Colorado Works (TANF) emergency cash assistance: colorado.gov/peak",
            "Document income with pay stubs — this accelerates RRH and rental assistance approvals",
            "Target rooms for rent / shared housing over shelter — your income qualifies you",
        ],
    },
    "professional_reentry": {
        "name": "Professional Re-Entry Track",
        "programs": [
            "Non-congregate Rapid Re-Housing — private unit, no shelter",
            "Colorado Workforce Centers — resume, job placement, emergency assistance",
            "Community resource matching — ESIS community ping to local neighborhood networks",
            "Tech/professional skills matching via LinkedIn Local and Nextdoor",
            "Equipment lending: laptops, phones from community organizations",
            "Colorado Assistive Technology Program (CATP) — refurbished tech grants",
        ],
        "timeline": "Community ping: immediate. RRH referral: 1–2 weeks. Equipment: varies 1–14 days",
        "actions": [
            "ESIS community ping — broadcast your skills and needs to local neighborhood networks",
            "Request non-congregate placement — your profile qualifies for private room placement",
            "Contact Colorado Workforce Center (303-595-8600) for rapid job placement + emergency support",
            "Apply for Colorado Assistive Technology Program grant for laptop/equipment",
            "LinkedIn: mark profile as 'Open to Opportunities' — many employers have emergency hire programs",
        ],
    },
    "general": {
        "name": "General Support Track",
        "programs": [
            "211 Colorado — coordinated resource referral",
            "Local shelter coordinated entry",
            "Denver's Road Home — case management",
        ],
        "timeline": "Standard coordinated entry: 2–4 weeks",
        "actions": [
            "Call 211 for immediate resource referral and coordinated entry assessment",
            "Request a Vulnerability Index (VI-SPDAT) assessment at any shelter",
            "Document your situation in writing — start building your case file today",
        ],
    },
}

# ── RESOURCE NEED → PROGRAM MAPPING ──────────────────────────────────

RESOURCE_PROGRAMS: dict[str, dict] = {
    "sleeping_bag": {
        "name": "Sleeping Bag / Blanket",
        "sources": [
            "Denver Rescue Mission (48 E Colfax) — distributed daily",
            "Volunteers of America (2877 Lawrence St) — supply room",
            "Urban Peak (2100 Stout St) — youth under 24",
            "Mutual Aid Denver — mutual.aid.denver@gmail.com",
        ],
    },
    "tent": {
        "name": "Tent / Shelter",
        "sources": [
            "Colorado Homeless Coalition outdoor supply program — call 303-293-2217",
            "Mile High United Way emergency supply line: 303-595-9455",
            "Community Supply Drives — check 211 for current locations",
        ],
    },
    "food": {
        "name": "Food / Meals",
        "sources": [
            "Food Bank of the Rockies (10700 E 45th Ave Denver) — walk-in pantry",
            "Denver Rescue Mission — 3 meals/day, no ID required",
            "Feeding Denver's Hungry — mobile distribution, track via Twitter @FeedingDenver",
            "211 — find nearest food pantry by ZIP",
        ],
    },
    "clothing": {
        "name": "Clothing",
        "sources": [
            "Goodwill Denver (free voucher via shelter referral)",
            "Denver Rescue Mission clothing room — Mon/Wed/Fri 9am",
            "Clothing drives tracked via 211",
            "HandUp (handup.org) — vetted community giving, clothing requests",
        ],
    },
    "phone": {
        "name": "Phone",
        "sources": [
            "Assurance Wireless — Lifeline free Android phone: 1-888-321-5880",
            "SafeLink Wireless — Lifeline free phone: 1-800-723-3546",
            "Denver Rescue Mission phone bank — short-term loaner",
            "Q Link Wireless — Lifeline, free smartphone + data",
        ],
    },
    "phone_service": {
        "name": "Free Phone Service",
        "sources": [
            "Lifeline Program — FCC program, free monthly service for low-income: lifelinesupport.org",
            "Assurance Wireless — 10GB data/mo free: assurancewireless.com",
            "Emergency Connectivity Fund — school/library hotspot loans",
            "Denver Public Library — free WiFi + hotspot lending",
        ],
    },
    "laptop": {
        "name": "Laptop / Computer",
        "sources": [
            "Colorado Assistive Technology Program (CATP) — refurbished laptops: 303-315-1280",
            "PCs for People (pcspeople.org) — $30–75 refurbished laptops, income verified",
            "Human-I-T — free refurbished computers for income-qualified: human-i-t.org",
            "TechHire Colorado — workforce training + equipment",
            "Libraries: Denver Public Library computer labs (free, no time limit with card)",
            "ESIS community ping — request laptop from neighborhood network",
        ],
    },
    "cooler": {
        "name": "Cooler / Food Storage",
        "sources": [
            "Denver Rescue Mission supply room — seasonal",
            "Community mutual aid networks via 211",
            "ESIS community ping — request from neighborhood network",
        ],
    },
    "disability_application": {
        "name": "Disability Application Assistance",
        "sources": [
            "SOAR (SSI/SSDI Outreach) — free expert application help: soarworks.samhsa.gov — 303-894-2000",
            "Colorado Legal Services — free SSI/SSDI legal representation: 303-837-1321",
            "Denver Benefits Legal Center — application to appeal: 303-595-6766",
            "Disability Rights Colorado — advocacy + application: 303-722-0300",
            "Mile High United Way SOAR-trained case managers: 211",
        ],
    },
}

# ── EDUCATION LEVEL LABELS ────────────────────────────────────────────

EDU_LABELS = {
    "none": "No formal education",
    "hs": "High school diploma / GED",
    "trade": "Trade / vocational certification",
    "associates": "Associate's degree",
    "bachelors": "Bachelor's degree",
    "masters": "Master's degree",
    "phd": "Ph.D. / Doctoral degree",
    "professional": "Professional degree (JD, MD, etc.)",
}

# ── TRACK ASSIGNMENT ──────────────────────────────────────────────────


def assign_housing_track(profile: PersonProfile) -> HousingTrack:
    score = 0
    rationale: list[str] = []
    selected_track = "general"

    # ── Scoring ──────────────────────────────────────────────────
    if profile.has_life_threatening_condition:
        score += 30
        rationale.append("Life-threatening medical condition — medical respite voucher pathway")
        selected_track = "medical_respite"

    if profile.is_woman_with_minor_children:
        score += 25
        rationale.append("Woman with minor children — child welfare laws mandate priority placement")
        if score < 30:   # only override if no higher priority
            selected_track = "family_protection"

    if profile.is_disabled:
        score += 20
        rationale.append("Disability — Section 811, SOAR/SSI pathway, ADA accommodation rights")
        if selected_track == "general":
            selected_track = "disability_housing"

    chronic = profile.months_homeless >= 12
    if chronic:
        score += 20
        years = profile.months_homeless // 12
        months_rem = profile.months_homeless % 12
        duration = f"{years}yr" + (f" {months_rem}mo" if months_rem else "")
        rationale.append(
            f"Chronically homeless ({duration}) — federal priority for Permanent Supportive Housing"
        )
        if selected_track in ("general", "working_stability"):
            selected_track = "chronic_priority"

    if profile.is_elderly:
        score += 15
        rationale.append("Age 50+ — Section 202 senior housing, Area Agency on Aging priority")
        if selected_track == "general":
            selected_track = "senior_services"

    if profile.is_known_substance_user:
        score += 10
        rationale.append("Substance use — integrated treatment + recovery housing track")
        if selected_track == "general":
            selected_track = "treatment_recovery"

    if profile.has_employment:
        score += 10
        rationale.append("Active employment — Rapid Re-Housing with income verification expedited")
        if selected_track in ("general",):
            selected_track = "working_stability"

    edu = profile.education_level.lower()
    if edu in ("phd", "masters", "professional"):
        score += 5
        rationale.append(
            f"Advanced education ({EDU_LABELS.get(edu, edu)}) — professional re-entry track + community ping"
        )
        if selected_track in ("general", "working_stability"):
            selected_track = "professional_reentry"
    elif edu in ("bachelors", "associates", "trade"):
        score += 3
        rationale.append(f"Educated ({EDU_LABELS.get(edu, edu)}) — employment-linked RRH expedited")

    score = min(score, 100)

    # ── Build output ──────────────────────────────────────────────
    tdef = TRACKS[selected_track]
    community_ping = ""
    if profile.consent_community_ping:
        community_ping = _generate_community_ping(profile, selected_track)

    return HousingTrack(
        track_id=selected_track,
        track_name=tdef["name"],
        priority_score=score,
        rationale=rationale,
        immediate_actions=tdef["actions"],
        target_programs=tdef["programs"],
        estimated_timeline=tdef["timeline"],
        community_ping_message=community_ping,
    )


def _generate_community_ping(profile: PersonProfile, track_id: str) -> str:
    """
    Generates a human-readable community broadcast message.
    Used by Gemma 4 as a seed and refined at inference time.
    This deterministic version is the fallback.
    """
    parts: list[str] = []

    # Duration
    if profile.months_homeless >= 12:
        yrs = profile.months_homeless // 12
        parts.append(f"homeless for {yrs}+ year{'s' if yrs > 1 else ''}")
    elif profile.months_homeless > 0:
        parts.append(f"homeless for {profile.months_homeless} month{'s' if profile.months_homeless > 1 else ''}")

    # Who they are
    if profile.education_level and profile.education_level in EDU_LABELS:
        parts.append(EDU_LABELS[profile.education_level])
    if profile.professional_background:
        parts.append(profile.professional_background)

    # What they need
    resource_labels = {
        "laptop": "a laptop/PC to be able to work",
        "phone": "a mobile phone",
        "phone_service": "mobile phone service",
        "clothing": "clothing",
        "food": "food assistance",
        "sleeping_bag": "a sleeping bag",
        "tent": "a tent",
        "disability_application": "disability application assistance",
    }
    needs = [resource_labels.get(r, r) for r in profile.resource_needs if r in resource_labels]

    # Contact methods
    contact_parts: list[str] = []
    if profile.contact_email:
        contact_parts.append(f"Email: {profile.contact_email}")
    if profile.contact_phone:
        contact_parts.append(f"Phone/SMS: {profile.contact_phone}")
    if profile.contact_apps:
        contact_parts.append(f"Apps: {', '.join(profile.contact_apps)}")

    profile_str = ", ".join(parts) if parts else "community member in need"
    needs_str = "; ".join(needs) if needs else "general support"
    contact_str = " | ".join(contact_parts) if contact_parts else "Contact via ESIS referral"

    ping = (
        f"ESIS COMMUNITY PING — Neighbor Needs Help\n\n"
        f"A {profile_str} is located in your neighborhood and is asking for community support.\n\n"
        f"They need: {needs_str}\n\n"
        f"About them: Non-drug user, capable, has been failed by the current system — "
        f"not a danger to anyone. They deserve stability and a path back.\n\n"
        f"If you can help, reach out: {contact_str}\n\n"
        f"The community complains about homelessness — here is a chance to be part of the "
        f"solution. One act of kindness can break the cycle.\n\n"
        f"Powered by ESIS | esis.ai"
    )
    return ping


def get_resource_programs(needs: list[str]) -> dict[str, dict]:
    """Return program details for a list of resource need identifiers."""
    return {need: RESOURCE_PROGRAMS[need] for need in needs if need in RESOURCE_PROGRAMS}
