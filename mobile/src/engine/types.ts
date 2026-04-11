// mobile/src/engine/types.ts

export interface CaseInput {
  rawText: string;
  city: string;
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
  city: 'denver',
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
  constraints: Record<string, string | boolean | number>;
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
  usedGemma?: boolean;
}

export interface HousingTrack {
  trackId: string;
  trackName: string;
  priorityScore: number;
  rationale: string[];
  immediateActions: string[];
  targetPrograms: string[];
  estimatedTimeline: string;
  communityPingMessage: string;
}

export interface CasePacket {
  caseId: string;
  createdAt: string;
  onePageSummary: string;
  advocateScript: string;
  referralHandoff: string;
  actionTimeline: string[];
  preservationChecklist: string[];
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
  isWomanWithMinorChildren: boolean;
  hasLifeThreateningCondition: boolean;
  hasEmployment: boolean;
  isKnownSubstanceUser: boolean;
  isElderly: boolean;
  monthsHomeless: number;
  educationLevel: string;
  professionalBackground: string;
  skillsSummary: string;
  resourceNeeds: string[];
  consentCommunityPing: boolean;
  contactEmail: string;
  contactPhone: string;
  contactApps: string[];
  disabilityApplicationStarted: boolean;
}

export const DEFAULT_PROFILE: PersonProfile = {
  isDisabled: false,
  isWomanWithMinorChildren: false,
  hasLifeThreateningCondition: false,
  hasEmployment: false,
  isKnownSubstanceUser: false,
  isElderly: false,
  monthsHomeless: 0,
  educationLevel: '',
  professionalBackground: '',
  skillsSummary: '',
  resourceNeeds: [],
  consentCommunityPing: false,
  contactEmail: '',
  contactPhone: '',
  contactApps: [],
  disabilityApplicationStarted: false,
};

export interface SavedCase {
  id: string;
  name: string;
  savedAt: string;
  input: CaseInput;
  profile: PersonProfile;
  risk?: RiskAssessment;
  recommendation?: RecommendationOutput;
  housingTrack?: HousingTrack;
  packet?: CasePacket;
  leInteractions: LEInteraction[];
}
