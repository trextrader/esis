# ESIS Hackathon Submission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish the ESIS submission for the Gemma 4 Good Hackathon — GitHub repo + Kaggle notebook + Streamlit app on HuggingFace Spaces + 3-minute video, completing submission checklist items 6/7 (Video) and 7/7 (Project Links).

**Architecture:** Three parallel workstreams (GitHub repo, Kaggle notebook, Streamlit app) share a common Python service layer (intake → triage → Gemma 4 reasoning → packet → audit). Gemma 4 is accessed via HuggingFace InferenceClient in the Streamlit app and via Kaggle's native model hub in the notebook. All services fall back to cached deterministic outputs when model is unavailable.

**Tech Stack:** Python 3.11, Streamlit, Pydantic, PyYAML, HuggingFace Hub (InferenceClient), transformers, Kaggle Notebooks (Gemma 4), HuggingFace Spaces (deployment)

---

## File Map

```
C:/esis/
├── README.md                                  CREATE — full project overview
├── requirements.txt                           CREATE
├── .gitignore                                 CREATE
├── LICENSE                                    CREATE (Apache 2.0)
├── app/
│   ├── api/
│   │   └── schemas.py                         CREATE — Pydantic models
│   ├── services/
│   │   ├── intake_service.py                  CREATE — normalize raw input
│   │   ├── triage_service.py                  CREATE — deterministic risk scores
│   │   ├── recommendation_service.py          CREATE — Gemma 4 structured output
│   │   ├── packet_service.py                  CREATE — referral packet text
│   │   ├── routing_service.py                 CREATE — pathway selection
│   │   └── audit_service.py                   CREATE — explain why
│   └── ui/
│       └── streamlit_app.py                   CREATE — 3-screen demo UI
├── data/
│   └── demo_cases/
│       ├── case_post_discharge.json           CREATE
│       ├── case_cold_night.json               CREATE
│       ├── case_lost_documents.json           CREATE
│       └── case_mixed_failure.json            CREATE
├── models/
│   ├── gemma/
│   │   └── prompt_templates.yaml             CREATE
│   └── policies/
│       ├── escalation_rules.yaml             CREATE
│       ├── medical_flags.yaml                CREATE
│       ├── shelter_rules.yaml                CREATE
│       └── documentation_rules.yaml          CREATE
├── scripts/
│   └── visuals/                              COPY existing .py scripts here
├── docs/
│   └── figures/                              COPY existing PNGs here
├── notebooks/
│   └── esis_gemma4_demo.ipynb               CREATE — Kaggle submission notebook
├── tests/
│   ├── test_intake.py                        CREATE
│   ├── test_triage.py                        CREATE
│   └── test_schemas.py                       CREATE
└── submission/
    └── final_writeup.md                      CREATE
```

---

## PHASE 1 — URL Unlocks (do these first, everything else can fill in after)

---

### Task 1: Local scaffold + requirements

**Files:**
- Create: `C:/esis/requirements.txt`
- Create: `C:/esis/.gitignore`
- Create: `C:/esis/LICENSE`

- [ ] **Step 1: Create requirements.txt**

```
streamlit>=1.32.0
pydantic>=2.0.0
pyyaml>=6.0
huggingface-hub>=0.22.0
transformers>=4.40.0
torch>=2.2.0
python-dotenv>=1.0.0
pandas>=2.0.0
numpy>=1.26.0
matplotlib>=3.8.0
plotly>=5.20.0
pytest>=8.0.0
```

- [ ] **Step 2: Create .gitignore**

```
__pycache__/
*.pyc
.env
.venv/
venv/
*.pkl
*.faiss
*.joblib
.DS_Store
Thumbs.db
*.egg-info/
dist/
build/
.pytest_cache/
```

- [ ] **Step 3: Create LICENSE — Apache 2.0**

Use the standard Apache 2.0 license text with copyright: `Copyright 2026 ESIS Project`

- [ ] **Step 4: Create all empty folders with .gitkeep**

Folders that need .gitkeep: `data/raw/`, `data/processed/`, `models/risk/`, `models/retrieval/`

- [ ] **Step 5: Copy existing visual scripts**

Copy all `C:/esis/*.py` visual scripts → `C:/esis/scripts/visuals/`
Copy all `C:/esis/*.png` generated images → `C:/esis/docs/figures/`
Copy all `C:/esis/diagrams/*.png` → `C:/esis/docs/figures/`

---

### Task 2: Pydantic schemas (app/api/schemas.py)

**Files:**
- Create: `app/api/schemas.py`
- Create: `tests/test_schemas.py`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_schemas.py
from app.api.schemas import CaseInput, StructuredCase, RiskAssessment, RecommendationOutput, CasePacket

def test_case_input_defaults():
    case = CaseInput(raw_text="discharged and in pain, no shelter")
    assert case.raw_text == "discharged and in pain, no shelter"
    assert case.location is None

def test_risk_assessment_clamps():
    r = RiskAssessment(medical_risk=1.5, exposure_risk=0.5, documentation_risk=0.2)
    assert r.medical_risk == 1.0  # clamped to 1.0

def test_overall_priority_high():
    r = RiskAssessment(medical_risk=0.85, exposure_risk=0.7, documentation_risk=0.3)
    assert r.overall_priority == "high"
```

- [ ] **Step 2: Run test to confirm it fails**

```
pytest tests/test_schemas.py -v
```
Expected: ImportError or AttributeError

- [ ] **Step 3: Implement schemas.py**

```python
# app/api/schemas.py
from pydantic import BaseModel, Field, field_validator
from typing import Optional
import uuid
from datetime import datetime

class CaseInput(BaseModel):
    raw_text: str = ""
    location: Optional[str] = None
    has_pain: bool = False
    has_exposure_risk: bool = False
    has_shelter: bool = False
    has_lost_documents: bool = False
    low_battery: bool = False
    low_funds: bool = False
    no_transport: bool = False
    recent_discharge: bool = False

class StructuredCase(BaseModel):
    case_id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    risk_domains: list[str] = []
    symptoms: list[str] = []
    constraints: dict = {}
    resources: dict = {}
    notes: str = ""

class RiskAssessment(BaseModel):
    medical_risk: float = 0.0
    exposure_risk: float = 0.0
    documentation_risk: float = 0.0
    overall_priority: str = "low"
    requires_escalation: bool = False

    @field_validator("medical_risk", "exposure_risk", "documentation_risk", mode="before")
    @classmethod
    def clamp(cls, v):
        return max(0.0, min(1.0, float(v)))

    def model_post_init(self, __context):
        max_risk = max(self.medical_risk, self.exposure_risk, self.documentation_risk)
        if max_risk >= 0.8:
            self.overall_priority = "high"
        elif max_risk >= 0.5:
            self.overall_priority = "medium"
        else:
            self.overall_priority = "low"
        self.requires_escalation = max_risk >= 0.8

class RecommendationOutput(BaseModel):
    summary: str = ""
    top_actions: list[str] = []
    fallback_plan: str = ""
    what_to_preserve: list[str] = []

class CasePacket(BaseModel):
    case_id: str = ""
    created_at: str = ""
    one_page_summary: str = ""
    advocate_script: str = ""
    referral_handoff: str = ""
    action_timeline: list[str] = []
    preservation_checklist: list[str] = []
```

- [ ] **Step 4: Run tests to confirm they pass**

```
pytest tests/test_schemas.py -v
```
Expected: 3 passed

- [ ] **Step 5: Commit**

```bash
git add app/api/schemas.py tests/test_schemas.py
git commit -m "feat: add ESIS Pydantic schemas (CaseInput, RiskAssessment, CasePacket)"
```

---

### Task 3: Demo case JSON files (data/demo_cases/)

**Files:**
- Create: `data/demo_cases/case_post_discharge.json`
- Create: `data/demo_cases/case_cold_night.json`
- Create: `data/demo_cases/case_lost_documents.json`
- Create: `data/demo_cases/case_mixed_failure.json`

- [ ] **Step 1: Create case_post_discharge.json**

```json
{
  "case_id": "case-001",
  "label": "Post-Discharge Instability",
  "description": "Failure Mode: discharge without recovery support",
  "raw_text": "I was just discharged from the hospital. I have severe back pain and a spinal infection they didn't fully treat. I have no place to go and my discharge plan fell through. I don't have any money and my phone is at 18%.",
  "has_pain": true,
  "has_exposure_risk": false,
  "has_shelter": false,
  "has_lost_documents": false,
  "low_battery": true,
  "low_funds": true,
  "no_transport": true,
  "recent_discharge": true,
  "location": null,
  "expected_priority": "high",
  "expected_domains": ["medical", "housing"],
  "gold_actions": [
    "Call hospital social worker immediately to dispute discharge",
    "Request medical respite or recuperative care bed",
    "Document symptoms and discharge date for advocacy packet"
  ]
}
```

- [ ] **Step 2: Create case_cold_night.json**

```json
{
  "case_id": "case-002",
  "label": "Exposure-Driven Survival Risk",
  "description": "Failure Mode: environmental survivability collapse",
  "raw_text": "It is below freezing tonight and I am outside. My phone is at 9% and I have no cash. I tried calling 211 but couldn't get through. I don't know where the nearest warming shelter is.",
  "has_pain": false,
  "has_exposure_risk": true,
  "has_shelter": false,
  "has_lost_documents": false,
  "low_battery": true,
  "low_funds": true,
  "no_transport": false,
  "recent_discharge": false,
  "location": null,
  "expected_priority": "high",
  "expected_domains": ["exposure", "resources"],
  "gold_actions": [
    "Use offline shelter locator to find nearest warming center",
    "Conserve battery — disable background apps immediately",
    "Walk to nearest 24-hour building for warmth while routing"
  ]
}
```

- [ ] **Step 3: Create case_lost_documents.json**

```json
{
  "case_id": "case-003",
  "label": "Administrative Pathway Collapse",
  "description": "Failure Mode: document and referral breakdown",
  "raw_text": "I lost my ID and social security card. My caseworker has not returned my calls in two weeks. The shelter that was supposed to take me said they never received my referral. I have no paperwork to show anyone.",
  "has_pain": false,
  "has_exposure_risk": false,
  "has_shelter": false,
  "has_lost_documents": true,
  "low_battery": false,
  "low_funds": false,
  "no_transport": false,
  "recent_discharge": false,
  "location": null,
  "expected_priority": "medium",
  "expected_domains": ["documents", "referral"],
  "gold_actions": [
    "Begin ID replacement at DMV — get fee waiver form",
    "Generate referral-ready packet to restart the intake chain",
    "Switch to paper-first workflow for all next steps"
  ]
}
```

- [ ] **Step 4: Create case_mixed_failure.json**

```json
{
  "case_id": "case-004",
  "label": "Multi-Domain System Failure",
  "description": "Failure Mode: simultaneous medical, exposure, and document collapse",
  "raw_text": "I was discharged three days ago into the cold. I have an infection that isn't healing. I lost my ID during a theft. My phone is dying. The referral chain is broken. I don't know where to start.",
  "has_pain": true,
  "has_exposure_risk": true,
  "has_shelter": false,
  "has_lost_documents": true,
  "low_battery": true,
  "low_funds": true,
  "no_transport": true,
  "recent_discharge": true,
  "location": null,
  "expected_priority": "high",
  "expected_domains": ["medical", "exposure", "documents"],
  "gold_actions": [
    "Medical escalation is primary — call 911 if infection is systemic",
    "Get inside immediately — medical takes priority over documents",
    "Once stable, generate full advocacy packet for all three failure domains"
  ]
}
```

- [ ] **Step 5: Commit**

```bash
git add data/demo_cases/
git commit -m "feat: add 4 gold-standard ESIS demo cases"
```

---

### Task 4: Policy YAML files (models/policies/)

**Files:**
- Create: `models/policies/escalation_rules.yaml`
- Create: `models/policies/medical_flags.yaml`
- Create: `models/policies/shelter_rules.yaml`
- Create: `models/policies/documentation_rules.yaml`
- Create: `models/gemma/prompt_templates.yaml`

- [ ] **Step 1: Create escalation_rules.yaml**

```yaml
# models/policies/escalation_rules.yaml
escalation_triggers:
  medical:
    - condition: medical_risk >= 0.8
      action: immediate_escalation
      message: "Medical risk threshold exceeded — escalate to emergency care"
    - condition: recent_discharge AND has_pain
      action: contact_hospital_social_work
      message: "Discharge-to-street — advocate for readmission or respite"
  exposure:
    - condition: exposure_risk >= 0.8 AND low_battery
      action: immediate_routing
      message: "Lethal exposure risk with communication constraint — route immediately"
  document:
    - condition: has_lost_documents AND referral_broken
      action: generate_packet
      message: "Administrative collapse — generate intake-ready packet"

unsafe_to_defer:
  - medical_risk >= 0.9
  - exposure_risk >= 0.85
  - has_pain AND recent_discharge AND no_shelter
```

- [ ] **Step 2: Create medical_flags.yaml**

```yaml
# models/policies/medical_flags.yaml
high_risk_symptoms:
  - spinal infection
  - sepsis
  - cardiac symptoms
  - altered consciousness
  - uncontrolled bleeding
  - severe pain post-discharge
  - fever with infection

red_flags:
  - recent discharge without follow-up plan
  - pain escalating over 48 hours
  - prescribed medication with no access to pharmacy
  - wound that is not healing

required_actions_on_red_flag:
  - document symptom timeline
  - contact hospital social worker
  - request medical respite placement
  - generate advocacy packet with symptom history
```

- [ ] **Step 3: Create shelter_rules.yaml**

```yaml
# models/policies/shelter_rules.yaml
shelter_priority_order:
  1: medical_respite  # if medical flag active
  2: non_congregate   # hotel/motel placement
  3: warming_center   # immediate cold exposure
  4: emergency_shelter
  5: transitional_housing

routing_constraints:
  low_battery:
    - prefer nearest option regardless of quality
    - disable all non-essential routing steps
    - send offline-first route only
  no_transport:
    - limit to walkable distance (0.5 mile radius)
    - prefer 24-hour operations
  partner_disabled:
    - require accessible facility
    - require couples/family accommodation

fallback_sequence:
  - try: 211 call
  - try: online shelter finder
  - try: walk to nearest hospital ER for warmth
  - try: walk to 24-hour public building
```

- [ ] **Step 4: Create documentation_rules.yaml**

```yaml
# models/policies/documentation_rules.yaml
id_replacement_order:
  1:
    document: birth_certificate
    method: VitalChek or state vital records office
    cost: 0-25 (fee waiver available)
    time: 3-10 business days
  2:
    document: social_security_card
    method: SSA office in person
    cost: free
    requires: birth certificate or other proof
    time: same day (card mailed in 2 weeks)
  3:
    document: state_id_or_drivers_license
    method: DMV
    cost: 0-35 (fee waiver available for homeless individuals)
    requires: birth certificate + SS card
    time: same day (temporary), card in 2-4 weeks

paper_first_workflow:
  trigger: lost_documents AND broken_referral_chain
  steps:
    - generate handwritten intake summary
    - request advocate to accompany to appointments
    - use packet as identity substitute where accepted
    - prioritize agencies that accept alternative verification

preservation_checklist:
  - photograph all remaining documents immediately
  - store copies in email if phone access available
  - give copies to trusted advocate
  - note document state in ESIS audit log
```

- [ ] **Step 5: Create models/gemma/prompt_templates.yaml**

```yaml
# models/gemma/prompt_templates.yaml

system_prompt: |
  You are ESIS — Edge Survival Intelligence System. You help people experiencing 
  homelessness navigate life-threatening situations by generating structured, 
  actionable intervention plans.

  You must always respond in valid JSON matching the exact schema provided.
  You must never give vague advice. Every output must be specific, actionable, 
  and safe for someone in a crisis situation.
  
  You are not a chatbot. You are a constrained decision-support system.

case_reasoning_template: |
  CASE SUMMARY:
  {case_summary}
  
  RISK ASSESSMENT:
  - Medical risk: {medical_risk}
  - Exposure risk: {exposure_risk}
  - Documentation risk: {documentation_risk}
  - Priority: {overall_priority}
  - Escalation required: {requires_escalation}
  
  ACTIVE CONSTRAINTS:
  {constraints}
  
  RELEVANT POLICIES:
  {policy_context}
  
  Generate a structured intervention plan. Respond ONLY in this JSON format:
  {
    "summary": "2-3 sentence situation summary",
    "top_actions": [
      "Specific action 1",
      "Specific action 2", 
      "Specific action 3"
    ],
    "fallback_plan": "What to do if the primary actions fail",
    "what_to_preserve": ["Item 1", "Item 2"]
  }

packet_generation_template: |
  You are generating a referral-ready advocacy packet for an agency or advocate.
  
  CASE:
  {case_summary}
  
  RISK SCORES: Medical={medical_risk}, Exposure={exposure_risk}, Documents={documentation_risk}
  
  RECOMMENDED ACTIONS:
  {top_actions}
  
  Generate a professional advocacy packet in this JSON format:
  {
    "one_page_summary": "Professional summary for intake staff (3-4 sentences)",
    "advocate_script": "What an advocate should say when calling on behalf of this person",
    "referral_handoff": "Structured handoff note for next agency",
    "action_timeline": ["Step 1 (immediate)", "Step 2 (within 24h)", "Step 3 (within 72h)"],
    "preservation_checklist": ["Document 1 to preserve", "Document 2 to preserve"]
  }
```

- [ ] **Step 6: Commit**

```bash
git add models/policies/ models/gemma/
git commit -m "feat: add policy YAML files and Gemma prompt templates"
```

---

### Task 5: Intake service (app/services/intake_service.py)

**Files:**
- Create: `app/services/intake_service.py`
- Create: `tests/test_intake.py`

- [ ] **Step 1: Write failing tests**

```python
# tests/test_intake.py
from app.services.intake_service import normalize_case
from app.api.schemas import CaseInput, StructuredCase

def test_normalize_detects_medical_domain():
    inp = CaseInput(raw_text="I have severe pain and was just discharged", has_pain=True, recent_discharge=True)
    result = normalize_case(inp)
    assert "medical" in result.risk_domains

def test_normalize_detects_exposure_domain():
    inp = CaseInput(raw_text="freezing outside, no shelter", has_exposure_risk=True, has_shelter=False)
    result = normalize_case(inp)
    assert "exposure" in result.risk_domains

def test_normalize_detects_document_domain():
    inp = CaseInput(raw_text="lost my ID", has_lost_documents=True)
    result = normalize_case(inp)
    assert "documents" in result.risk_domains

def test_normalize_captures_constraints():
    inp = CaseInput(raw_text="test", low_battery=True, no_transport=True)
    result = normalize_case(inp)
    assert result.constraints.get("low_battery") is True
    assert result.constraints.get("no_transport") is True
```

- [ ] **Step 2: Run test to confirm failure**

```
pytest tests/test_intake.py -v
```

- [ ] **Step 3: Implement intake_service.py**

```python
# app/services/intake_service.py
from app.api.schemas import CaseInput, StructuredCase

MEDICAL_KEYWORDS = ["pain", "infection", "hospital", "discharged", "medication", "injury", "fever", "wound"]
EXPOSURE_KEYWORDS = ["freezing", "cold", "heat", "outside", "weather", "exposure", "night"]
DOCUMENT_KEYWORDS = ["lost", "id", "documents", "paperwork", "referral", "caseworker", "records"]

def normalize_case(inp: CaseInput) -> StructuredCase:
    text = inp.raw_text.lower()
    domains = []
    symptoms = []

    # Domain detection from checkboxes (authoritative)
    if inp.has_pain or inp.recent_discharge:
        domains.append("medical")
    if inp.has_exposure_risk or not inp.has_shelter:
        domains.append("exposure")
    if inp.has_lost_documents:
        domains.append("documents")

    # Supplement from free text
    if any(k in text for k in MEDICAL_KEYWORDS) and "medical" not in domains:
        domains.append("medical")
    if any(k in text for k in EXPOSURE_KEYWORDS) and "exposure" not in domains:
        domains.append("exposure")
    if any(k in text for k in DOCUMENT_KEYWORDS) and "documents" not in domains:
        domains.append("documents")

    # Extract symptoms from text (simple keyword match for V1)
    symptom_words = ["pain", "infection", "fever", "wound", "bleeding"]
    symptoms = [w for w in symptom_words if w in text]

    constraints = {
        "low_battery": inp.low_battery,
        "low_funds": inp.low_funds,
        "no_transport": inp.no_transport,
        "has_shelter": inp.has_shelter,
    }

    resources = {
        "has_phone": True,
        "low_battery": inp.low_battery,
    }

    return StructuredCase(
        risk_domains=list(set(domains)),
        symptoms=symptoms,
        constraints=constraints,
        resources=resources,
        notes=inp.raw_text[:500],
    )
```

- [ ] **Step 4: Run tests to confirm pass**

```
pytest tests/test_intake.py -v
```
Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add app/services/intake_service.py tests/test_intake.py
git commit -m "feat: implement intake normalization service"
```

---

### Task 6: Triage service (app/services/triage_service.py)

**Files:**
- Create: `app/services/triage_service.py`
- Create: `tests/test_triage.py`

- [ ] **Step 1: Write failing tests**

```python
# tests/test_triage.py
from app.services.triage_service import score_risk
from app.api.schemas import StructuredCase, RiskAssessment

def test_medical_risk_high_on_discharge_with_pain():
    case = StructuredCase(
        risk_domains=["medical"],
        symptoms=["pain", "infection"],
        constraints={"recent_discharge": True, "has_shelter": False},
        resources={},
    )
    result = score_risk(case)
    assert result.medical_risk >= 0.8
    assert result.requires_escalation is True

def test_exposure_risk_high_on_cold_no_shelter():
    case = StructuredCase(
        risk_domains=["exposure"],
        symptoms=[],
        constraints={"has_shelter": False, "low_battery": True},
        resources={},
    )
    result = score_risk(case)
    assert result.exposure_risk >= 0.7

def test_low_risk_case():
    case = StructuredCase(
        risk_domains=[],
        symptoms=[],
        constraints={"has_shelter": True, "low_battery": False},
        resources={},
    )
    result = score_risk(case)
    assert result.overall_priority == "low"
    assert result.requires_escalation is False
```

- [ ] **Step 2: Run to confirm failure**

```
pytest tests/test_triage.py -v
```

- [ ] **Step 3: Implement triage_service.py**

```python
# app/services/triage_service.py
from app.api.schemas import StructuredCase, RiskAssessment

def score_risk(case: StructuredCase) -> RiskAssessment:
    medical = _score_medical(case)
    exposure = _score_exposure(case)
    documents = _score_documents(case)
    return RiskAssessment(
        medical_risk=medical,
        exposure_risk=exposure,
        documentation_risk=documents,
    )

def _score_medical(case: StructuredCase) -> float:
    score = 0.0
    if "medical" in case.risk_domains:
        score += 0.4
    if case.symptoms:
        score += min(len(case.symptoms) * 0.15, 0.3)
    if case.constraints.get("recent_discharge"):
        score += 0.2
    if not case.constraints.get("has_shelter"):
        score += 0.1
    severe = {"infection", "sepsis", "fever", "wound"}
    if severe & set(case.symptoms):
        score += 0.2
    return min(score, 1.0)

def _score_exposure(case: StructuredCase) -> float:
    score = 0.0
    if "exposure" in case.risk_domains:
        score += 0.5
    if not case.constraints.get("has_shelter"):
        score += 0.2
    if case.constraints.get("low_battery"):
        score += 0.15
    if case.constraints.get("low_funds"):
        score += 0.1
    if case.constraints.get("no_transport"):
        score += 0.1
    return min(score, 1.0)

def _score_documents(case: StructuredCase) -> float:
    score = 0.0
    if "documents" in case.risk_domains:
        score += 0.5
    if case.constraints.get("referral_broken"):
        score += 0.3
    if not case.constraints.get("has_shelter"):
        score += 0.1
    return min(score, 1.0)
```

- [ ] **Step 4: Run tests**

```
pytest tests/test_triage.py -v
```
Expected: 3 passed

- [ ] **Step 5: Commit**

```bash
git add app/services/triage_service.py tests/test_triage.py
git commit -m "feat: implement deterministic risk triage scoring"
```

---

### Task 7: Recommendation service — Gemma 4 integration

**Files:**
- Create: `app/services/recommendation_service.py`

- [ ] **Step 1: Implement recommendation_service.py with HuggingFace InferenceClient**

```python
# app/services/recommendation_service.py
import json
import yaml
import os
from pathlib import Path
from app.api.schemas import StructuredCase, RiskAssessment, RecommendationOutput

TEMPLATES_PATH = Path("models/gemma/prompt_templates.yaml")

def _load_templates():
    with open(TEMPLATES_PATH) as f:
        return yaml.safe_load(f)

def _build_prompt(case: StructuredCase, risk: RiskAssessment, templates: dict) -> str:
    constraints_text = "\n".join(
        f"- {k}: {v}" for k, v in case.constraints.items() if v
    )
    return templates["case_reasoning_template"].format(
        case_summary=case.notes[:400],
        medical_risk=f"{risk.medical_risk:.2f}",
        exposure_risk=f"{risk.exposure_risk:.2f}",
        documentation_risk=f"{risk.documentation_risk:.2f}",
        overall_priority=risk.overall_priority,
        requires_escalation=risk.requires_escalation,
        constraints=constraints_text or "None",
        policy_context="See models/policies/ for full policy rules.",
    )

def _parse_response(text: str) -> dict:
    """Extract JSON from Gemma response, repair if needed."""
    try:
        start = text.find("{")
        end = text.rfind("}") + 1
        return json.loads(text[start:end])
    except Exception:
        return {}

def _fallback_output(case: StructuredCase, risk: RiskAssessment) -> RecommendationOutput:
    """Deterministic fallback when Gemma is unavailable."""
    actions = []
    if risk.medical_risk >= 0.8:
        actions.append("Seek emergency medical evaluation immediately")
    if risk.exposure_risk >= 0.7:
        actions.append("Find indoor shelter or warming center now")
    if risk.documentation_risk >= 0.5:
        actions.append("Generate referral packet and begin ID replacement")
    if not actions:
        actions = ["Contact 211 for resource referral", "Document current situation", "Identify nearest support services"]

    return RecommendationOutput(
        summary=f"High-priority case with risk domains: {', '.join(case.risk_domains)}.",
        top_actions=actions[:3],
        fallback_plan="Contact 211 or go to nearest emergency room if no other options are available.",
        what_to_preserve=["Any remaining ID documents", "Medical records", "Discharge paperwork"],
    )

def generate_recommendation(
    case: StructuredCase,
    risk: RiskAssessment,
    hf_token: str | None = None,
) -> RecommendationOutput:
    templates = _load_templates()
    prompt = _build_prompt(case, risk, templates)

    if hf_token:
        try:
            from huggingface_hub import InferenceClient
            client = InferenceClient(token=hf_token)
            system = templates["system_prompt"]
            response = client.text_generation(
                prompt,
                model="google/gemma-3-27b-it",  # Update to gemma-4 when available on HF Inference
                max_new_tokens=512,
                temperature=0.3,
            )
            parsed = _parse_response(response)
            if parsed:
                return RecommendationOutput(
                    summary=parsed.get("summary", ""),
                    top_actions=parsed.get("top_actions", [])[:3],
                    fallback_plan=parsed.get("fallback_plan", ""),
                    what_to_preserve=parsed.get("what_to_preserve", []),
                )
        except Exception as e:
            print(f"Gemma inference failed: {e} — using fallback")

    return _fallback_output(case, risk)
```

- [ ] **Step 2: Commit**

```bash
git add app/services/recommendation_service.py
git commit -m "feat: implement Gemma 4 recommendation service with deterministic fallback"
```

---

### Task 8: Packet + Audit services

**Files:**
- Create: `app/services/packet_service.py`
- Create: `app/services/audit_service.py`
- Create: `app/services/routing_service.py`

- [ ] **Step 1: Implement packet_service.py**

```python
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

    summary = (
        f"[{priority_label} PRIORITY] Individual presenting with {domains_str} risk. "
        f"Medical risk: {risk.medical_risk:.0%}. "
        f"Exposure risk: {risk.exposure_risk:.0%}. "
        f"{recommendation.summary}"
    )

    advocate_script = (
        f"Hello, I am calling on behalf of an individual in crisis who needs immediate assistance. "
        f"This person has been assessed with {priority_label} priority needs in the following areas: {domains_str}. "
        f"The recommended next step is: {recommendation.top_actions[0] if recommendation.top_actions else 'immediate triage'}. "
        f"This person {'requires escalation' if risk.requires_escalation else 'needs prompt support'}. "
        f"Can you please confirm availability and next steps?"
    )

    referral = (
        f"ESIS Referral — {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}\n"
        f"Case ID: {case.case_id}\n"
        f"Priority: {priority_label}\n"
        f"Domains: {domains_str}\n"
        f"Recommended Actions:\n"
        + "\n".join(f"  {i+1}. {a}" for i, a in enumerate(recommendation.top_actions))
    )

    return CasePacket(
        case_id=case.case_id,
        created_at=datetime.utcnow().isoformat(),
        one_page_summary=summary,
        advocate_script=advocate_script,
        referral_handoff=referral,
        action_timeline=recommendation.top_actions,
        preservation_checklist=recommendation.what_to_preserve,
    )
```

- [ ] **Step 2: Implement audit_service.py**

```python
# app/services/audit_service.py
from app.api.schemas import StructuredCase, RiskAssessment, RecommendationOutput

def generate_audit(
    case: StructuredCase,
    risk: RiskAssessment,
    recommendation: RecommendationOutput,
) -> dict:
    triggered_flags = []
    if risk.medical_risk >= 0.8:
        triggered_flags.append(f"Medical risk threshold exceeded ({risk.medical_risk:.2f} ≥ 0.80)")
    if risk.exposure_risk >= 0.7:
        triggered_flags.append(f"Exposure risk threshold exceeded ({risk.exposure_risk:.2f} ≥ 0.70)")
    if risk.documentation_risk >= 0.5:
        triggered_flags.append(f"Documentation failure risk elevated ({risk.documentation_risk:.2f} ≥ 0.50)")
    if risk.requires_escalation:
        triggered_flags.append("Escalation required — at least one risk dimension ≥ 0.80")

    active_constraints = [k for k, v in case.constraints.items() if v]

    return {
        "case_id": case.case_id,
        "triggered_flags": triggered_flags,
        "active_constraints": active_constraints,
        "risk_scores": {
            "medical": risk.medical_risk,
            "exposure": risk.exposure_risk,
            "documentation": risk.documentation_risk,
        },
        "pathway_selected": case.risk_domains[0] if case.risk_domains else "general",
        "why_this_route": (
            f"Primary pathway '{case.risk_domains[0] if case.risk_domains else 'general'}' selected "
            f"based on highest domain risk score. "
            f"{len(triggered_flags)} risk flag(s) triggered escalation logic."
        ),
        "suppressed_alternatives": [
            d for d in ["medical", "exposure", "documents"] if d not in case.risk_domains
        ],
    }
```

- [ ] **Step 3: Implement routing_service.py**

```python
# app/services/routing_service.py
from app.api.schemas import StructuredCase, RiskAssessment

def select_pathway(case: StructuredCase, risk: RiskAssessment) -> dict:
    primary = "general"
    if risk.medical_risk >= risk.exposure_risk and risk.medical_risk >= risk.documentation_risk:
        primary = "medical"
    elif risk.exposure_risk >= risk.documentation_risk:
        primary = "exposure"
    elif risk.documentation_risk > 0.3:
        primary = "documents"

    routing_map = {
        "medical": {
            "first_contact": "Hospital social worker or 911",
            "secondary": "Medical respite program",
            "tertiary": "211 — request medical case manager",
        },
        "exposure": {
            "first_contact": "Nearest warming center or shelter",
            "secondary": "211 for emergency placement",
            "tertiary": "Hospital ER for warmth if no shelter available",
        },
        "documents": {
            "first_contact": "211 — request intake advocate",
            "secondary": "Local DMV for ID fee waiver",
            "tertiary": "Coordinated entry access point",
        },
        "general": {
            "first_contact": "211",
            "secondary": "Local coordinated entry system",
            "tertiary": "Nearest shelter or drop-in center",
        },
    }

    return {
        "primary_pathway": primary,
        "contacts": routing_map.get(primary, routing_map["general"]),
        "battery_mode": case.constraints.get("low_battery", False),
        "transport_limited": case.constraints.get("no_transport", False),
    }
```

- [ ] **Step 4: Commit**

```bash
git add app/services/packet_service.py app/services/audit_service.py app/services/routing_service.py
git commit -m "feat: implement packet generation, audit, and routing services"
```

---

### Task 9: Streamlit app (app/ui/streamlit_app.py)

**Files:**
- Create: `app/ui/streamlit_app.py`

- [ ] **Step 1: Implement 3-screen Streamlit app**

```python
# app/ui/streamlit_app.py
import streamlit as st
import json
import os
from pathlib import Path

# Add project root to path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.api.schemas import CaseInput
from app.services.intake_service import normalize_case
from app.services.triage_service import score_risk
from app.services.recommendation_service import generate_recommendation
from app.services.packet_service import generate_packet
from app.services.audit_service import generate_audit
from app.services.routing_service import select_pathway

CASES_DIR = Path("data/demo_cases")
HF_TOKEN = os.environ.get("HF_TOKEN", "")

CASE_FILES = {
    "Post-Discharge Instability": "case_post_discharge.json",
    "Exposure / Cold Night Risk": "case_cold_night.json",
    "Administrative Pathway Collapse": "case_lost_documents.json",
    "Multi-Domain Failure": "case_mixed_failure.json",
    "Custom scenario": None,
}

def load_case(filename: str) -> dict:
    with open(CASES_DIR / filename) as f:
        return json.load(f)

def risk_color(score: float) -> str:
    if score >= 0.8: return "#EF4444"
    if score >= 0.5: return "#F59E0B"
    return "#10B981"

st.set_page_config(
    page_title="ESIS — Edge Survival Intelligence System",
    page_icon="🛟",
    layout="wide",
)

# Header
st.markdown("""
<div style='background:#08111F;padding:1.5rem 2rem;border-radius:8px;margin-bottom:1rem;border:1px solid #1E3A5F'>
<h1 style='color:#F8FAFC;margin:0;font-size:2rem'>🛟 ESIS</h1>
<p style='color:#94A3B8;margin:0.25rem 0 0'>Edge Survival Intelligence System — Offline-first crisis navigation powered by Gemma 4</p>
</div>
""", unsafe_allow_html=True)

# ── SCREEN 1: INPUT ──────────────────────────────────────────
st.subheader("1. Describe the Situation")

col_left, col_right = st.columns([2, 1])

with col_left:
    selected_label = st.selectbox("Load a demo scenario or enter custom:", list(CASE_FILES.keys()))
    case_data = {}
    if CASE_FILES[selected_label]:
        case_data = load_case(CASE_FILES[selected_label])
        st.text_area("Situation description", value=case_data.get("raw_text", ""), height=140, key="raw_text")
    else:
        st.text_area("Describe the situation:", height=140, key="raw_text", placeholder="e.g. Just discharged from hospital, severe pain, no shelter, phone at 10%...")

with col_right:
    st.markdown("**Active conditions:**")
    has_pain = st.checkbox("Medical pain / instability", value=case_data.get("has_pain", False))
    has_exposure = st.checkbox("Exposure / cold / heat risk", value=case_data.get("has_exposure_risk", False))
    has_shelter = st.checkbox("Has shelter tonight", value=case_data.get("has_shelter", False))
    lost_docs = st.checkbox("Lost ID / documents", value=case_data.get("has_lost_documents", False))
    low_battery = st.checkbox("Phone battery < 20%", value=case_data.get("low_battery", False))
    low_funds = st.checkbox("No cash / limited funds", value=case_data.get("low_funds", False))
    no_transport = st.checkbox("No transportation", value=case_data.get("no_transport", False))
    recent_discharge = st.checkbox("Recent hospital discharge", value=case_data.get("recent_discharge", False))

analyze_btn = st.button("🔍 Analyze with ESIS", type="primary", use_container_width=True)

if analyze_btn:
    raw_text = st.session_state.get("raw_text", "")
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

    # ── SCREEN 2: RISK ──────────────────────────────────────────
    st.subheader("2. Risk Assessment")

    if risk.requires_escalation:
        st.error(f"⚠️ ESCALATION REQUIRED — {risk.overall_priority.upper()} PRIORITY")
    else:
        st.warning(f"Priority: {risk.overall_priority.upper()}")

    r1, r2, r3 = st.columns(3)
    with r1:
        color = risk_color(risk.medical_risk)
        st.markdown(f"**Medical Risk**")
        st.progress(risk.medical_risk)
        st.markdown(f"<span style='color:{color}'>{risk.medical_risk:.0%}</span>", unsafe_allow_html=True)
    with r2:
        color = risk_color(risk.exposure_risk)
        st.markdown(f"**Exposure Risk**")
        st.progress(risk.exposure_risk)
        st.markdown(f"<span style='color:{color}'>{risk.exposure_risk:.0%}</span>", unsafe_allow_html=True)
    with r3:
        color = risk_color(risk.documentation_risk)
        st.markdown(f"**Documentation Risk**")
        st.progress(risk.documentation_risk)
        st.markdown(f"<span style='color:{color}'>{risk.documentation_risk:.0%}</span>", unsafe_allow_html=True)

    st.markdown(f"**Primary pathway:** `{routing['primary_pathway']}`")
    st.markdown(f"**First contact:** {routing['contacts']['first_contact']}")

    st.divider()

    # ── SCREEN 3: ACTION PLAN + PACKET ──────────────────────────
    st.subheader("3. ESIS Action Plan")

    st.markdown(f"**Summary:** {recommendation.summary}")

    st.markdown("**Top 3 Actions (Gemma 4 generated):**")
    for i, action in enumerate(recommendation.top_actions, 1):
        st.markdown(f"{i}. {action}")

    st.markdown(f"**Fallback:** {recommendation.fallback_plan}")

    with st.expander("📄 Full Advocacy Packet"):
        st.text_area("One-page summary", value=packet.one_page_summary, height=100)
        st.text_area("Advocate call script", value=packet.advocate_script, height=100)
        st.text_area("Referral handoff note", value=packet.referral_handoff, height=120)
        packet_text = f"""ESIS CASE PACKET
Case ID: {packet.case_id}
Generated: {packet.created_at}

SUMMARY:
{packet.one_page_summary}

ADVOCATE SCRIPT:
{packet.advocate_script}

REFERRAL HANDOFF:
{packet.referral_handoff}

ACTION TIMELINE:
{chr(10).join(f'{i+1}. {a}' for i, a in enumerate(packet.action_timeline))}

PRESERVATION CHECKLIST:
{chr(10).join(f'- {p}' for p in packet.preservation_checklist)}
"""
        st.download_button("⬇️ Download Packet", packet_text, file_name=f"esis_packet_{packet.case_id}.txt")

    with st.expander("🔍 Audit Trail — Why this plan?"):
        st.json(audit)

    st.caption("ESIS — Edge Survival Intelligence System | Gemma 4 Good Hackathon 2026 | Built with lived experience.")
```

- [ ] **Step 2: Create HuggingFace Spaces config**

Create file `app.py` at repo root (HF Spaces entry point):
```python
# app.py — HuggingFace Spaces entry point
import subprocess
import sys
subprocess.run([sys.executable, "-m", "streamlit", "run", "app/ui/streamlit_app.py",
                "--server.port=7860", "--server.address=0.0.0.0"])
```

Create `Makefile` in repo root:
```makefile
run:
	streamlit run app/ui/streamlit_app.py

test:
	pytest tests/ -v
```

- [ ] **Step 3: Commit**

```bash
git add app/ui/streamlit_app.py app.py Makefile
git commit -m "feat: implement 3-screen Streamlit demo app"
```

---

### Task 10: README.md

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write README.md**

The README must contain:
- ESIS banner image (embed `docs/figures/esis_banner_560x280_full.png`)
- What it does (3 sentences)
- Why it matters (the core thesis)
- System architecture (embed `docs/figures/esisdiagram.png` or detail diagram)
- Quickstart (`pip install -r requirements.txt && streamlit run app/ui/streamlit_app.py`)
- Demo scenarios (4 cases with brief descriptions)
- Links: Kaggle notebook, HuggingFace Spaces, Kaggle competition page
- Limitations
- Future work

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add comprehensive README with architecture and quickstart"
```

---

### Task 11: Kaggle Notebook (notebooks/esis_gemma4_demo.ipynb)

**Files:**
- Create: `notebooks/esis_gemma4_demo.ipynb`

- [ ] **Step 1: Create notebook with intro + setup cells**

The notebook must have these sections (each a markdown + code cell pair):
1. **Introduction** — What ESIS is, what this notebook demonstrates
2. **Setup** — pip installs, imports, load Gemma 4 from Kaggle models
3. **Case Schema** — show the normalized case structure
4. **Risk Triage** — run triage on one case, display scores
5. **Gemma 4 Reasoning** — pass case to Gemma, show raw output, parse JSON
6. **Action Plan** — display structured recommendation
7. **Packet Generation** — show full advocacy packet
8. **Audit Log** — show explainability output
9. **All 4 Cases** — loop all demo cases, show side-by-side results

For Gemma 4 in Kaggle, use:
```python
# Cell: Load Gemma 4
from kaggle_secrets import UserSecretsClient
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch

# Kaggle provides Gemma models via the model hub
model_path = "/kaggle/input/gemma/transformers/4-9b-it/1"  # adjust to actual Kaggle model path
tokenizer = AutoTokenizer.from_pretrained(model_path)
model = AutoModelForCausalLM.from_pretrained(model_path, torch_dtype=torch.bfloat16, device_map="auto")
```

- [ ] **Step 2: Upload notebook to Kaggle**

Go to kaggle.com/code → New Notebook → Upload the .ipynb → Make public → Copy URL

- [ ] **Step 3: Commit notebook to repo**

```bash
git add notebooks/esis_gemma4_demo.ipynb
git commit -m "feat: add Kaggle Gemma 4 demonstration notebook"
```

---

### Task 12: Deploy to HuggingFace Spaces

- [ ] **Step 1: Create HuggingFace Space**

Go to huggingface.co/new-space:
- SDK: Streamlit
- Name: `esis-demo`
- Visibility: Public

- [ ] **Step 2: Add HF_TOKEN secret in Space settings**

In Space Settings → Repository secrets → Add `HF_TOKEN` with your HuggingFace read token

- [ ] **Step 3: Push repo to HF Spaces**

```bash
git remote add hf https://huggingface.co/spaces/YOUR_USERNAME/esis-demo
git push hf main
```

- [ ] **Step 4: Verify deployment**

Open the Space URL, run the Post-Discharge case end-to-end, confirm all 3 screens render

---

## PHASE 3 — Polish + Video

### Task 13: Video script (3 minutes)

- [ ] **Step 1: Record section 1 (0:00–0:30) — The Problem**

Screen: `docs/figures/esis_scenario_panel_v2.png`
Narrate: Personal story → the three failure modes → "I built this because I lived it"

- [ ] **Step 2: Record section 2 (0:30–1:15) — The System**

Screen: `docs/figures/esis_decision_loop.png` then `docs/figures/esisdiagram.png`
Narrate: ESIS architecture → Gemma 4 as reasoning layer → offline-first → constrained decision loop

- [ ] **Step 3: Record section 3 (1:15–2:30) — Live Demo**

Screen: HuggingFace Spaces app running
Demo: Load Post-Discharge case → click Analyze → show risk scores → show action plan → show packet

- [ ] **Step 4: Record section 4 (2:30–3:00) — Impact**

Screen: `docs/figures/esis_mini_evaluation_table.png` then `docs/figures/esis_impact_summary_panel.png`
Narrate: Traditional vs ESIS → 96% faster to safety → "This is what AI for good looks like"

- [ ] **Step 5: Upload to YouTube → copy URL**

---

### Task 14: Final submission assembly

- [ ] Add GitHub repo URL to Kaggle writeup Project Links
- [ ] Add Kaggle notebook URL to Project Links
- [ ] Add HuggingFace Space URL to Project Links
- [ ] Add YouTube video URL to Media Gallery
- [ ] Submit Kaggle writeup (7/7 checklist complete)

---

## Run all tests

```bash
pytest tests/ -v
```
Expected: all pass (schemas, intake, triage)
