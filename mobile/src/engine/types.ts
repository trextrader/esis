// mobile/src/engine/types.ts

export interface CaseInput {
  rawText: string;
  hasPain: boolean;
  hasExposureRisk: boolean;
  hasShelter: boolean;
  hasLostDocuments: boolean;
  lowBattery: boolean;
  lowFunds: boolean;
  noTransport: boolean;
  recentDischarge: boolean;
  cannotCongregate: boolean;
  chronicHomeless: boolean;
  hasPoliceContact: boolean;
  wasDisplaced: boolean;
  wasThreatenedWithArrest: boolean;
  lostBelongingsDueToInteraction: boolean;
}

export const DEFAULT_CASE_INPUT: CaseInput = {
  rawText: '',
  hasPain: false,
  hasExposureRisk: false,
  hasShelter: false,
  hasLostDocuments: false,
  lowBattery: false,
  lowFunds: false,
  noTransport: false,
  recentDischarge: false,
  cannotCongregate: false,
  chronicHomeless: false,
  hasPoliceContact: false,
  wasDisplaced: false,
  wasThreatenedWithArrest: false,
  lostBelongingsDueToInteraction: false,
};

export interface StructuredCase {
  caseId: string;
  timestamp: string;
  riskDomains: string[];
  symptoms: string[];
  constraints: Record<string, boolean | number>;
  notes: string;
}

export interface RiskAssessment {
  medicalRisk: number;
  exposureRisk: number;
  documentationRisk: number;
  enforcementRisk: number;
  overallPriority: 'low' | 'medium' | 'high';
  requiresEscalation: boolean;
}

export interface RecommendationOutput {
  summary: string;
  topActions: string[];
  fallbackPlan: string;
  whatToPreserve: string[];
  immediateActions: string[];
  stabilizationActions: string[];
  recoveryActions: string[];
}

export interface LEInteraction {
  id: string;
  loggedAt: string;
  incidentDate: string;
  incidentTime: string;
  locationDescription: string;
  agency: string;
  badgeOrDescription: string;
  officerCount: number;
  encounterType: string;
  officerResponseProfile: string;
  conditionAtEncounter: string[];
  resourceActions: string[];
  disruptionIndicators: string[];
  whatHappened: string;
  outcome: string;
  witnesses: string;
  injuriesOrHarm: string;
}

export interface PersonProfile {
  isDisabled: boolean;
  monthsHomeless: number;
  educationLevel: string;
  professionalBackground: string;
  skillsSummary: string;
  resourceNeeds: string[];
  contactEmail: string;
  contactPhone: string;
}

export const DEFAULT_PROFILE: PersonProfile = {
  isDisabled: false,
  monthsHomeless: 0,
  educationLevel: '',
  professionalBackground: '',
  skillsSummary: '',
  resourceNeeds: [],
  contactEmail: '',
  contactPhone: '',
};

export interface SavedCase {
  id: string;
  name: string;
  savedAt: string;
  input: CaseInput;
  profile: PersonProfile;
  risk?: RiskAssessment;
  recommendation?: RecommendationOutput;
  leInteractions: LEInteraction[];
}
