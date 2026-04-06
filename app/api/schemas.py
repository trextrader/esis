from __future__ import annotations
# app/api/schemas.py
from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List, Dict
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
    risk_domains: List[str] = []
    symptoms: List[str] = []
    constraints: Dict = {}
    resources: Dict = {}
    notes: str = ""


class RiskAssessment(BaseModel):
    medical_risk: float = 0.0
    exposure_risk: float = 0.0
    documentation_risk: float = 0.0
    overall_priority: str = "low"
    requires_escalation: bool = False

    @field_validator("medical_risk", "exposure_risk", "documentation_risk", mode="before")
    @classmethod
    def clamp(cls, v: float) -> float:
        return max(0.0, min(1.0, float(v)))

    @model_validator(mode="after")
    def compute_priority(self) -> RiskAssessment:
        max_risk = max(self.medical_risk, self.exposure_risk, self.documentation_risk)
        priority = "high" if max_risk >= 0.8 else "medium" if max_risk >= 0.5 else "low"
        # Use object.__setattr__ to avoid triggering recursive validation
        object.__setattr__(self, "overall_priority", priority)
        object.__setattr__(self, "requires_escalation", max_risk >= 0.8)
        return self


class RecommendationOutput(BaseModel):
    summary: str = ""
    top_actions: List[str] = []
    fallback_plan: str = ""
    what_to_preserve: List[str] = []


class CasePacket(BaseModel):
    case_id: str = ""
    created_at: str = ""
    one_page_summary: str = ""
    advocate_script: str = ""
    referral_handoff: str = ""
    action_timeline: List[str] = []
    preservation_checklist: List[str] = []
