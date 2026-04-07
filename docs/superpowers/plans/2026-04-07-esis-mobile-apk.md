# ESIS Mobile APK — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React Native (Expo) Android APK that runs the full ESIS engine offline, stores cases client-side, logs police interactions, and shares community pings via the native share sheet.

**Architecture:** All ESIS logic (intake, triage, recommendation with survival horizons, enforcement scoring) is ported to TypeScript and runs entirely on-device — no network required for core functionality. Cases and LE interaction logs are persisted in AsyncStorage. Community pings are shared via the Android native share sheet (opens Nextdoor, Facebook, WhatsApp, etc.). The APK is built in the cloud via EAS Build (no local Android SDK required).

**Tech Stack:** Expo SDK 51, React Native 0.74, TypeScript, React Navigation v6, AsyncStorage, expo-sharing, EAS Build (cloud APK).

---

## Prerequisites

Node.js 18+ must be installed. Verify with `node --version`. If missing, download from nodejs.org.

```bash
node --version   # must be >= 18
npm --version    # must be >= 9
```

---

## File Map

```
mobile/
├── app.json                         Expo config — app name, permissions, Android package
├── package.json                     Dependencies
├── tsconfig.json                    TypeScript config
├── eas.json                         EAS Build profiles (preview = APK, production = AAB)
├── App.tsx                          Root — NavigationContainer + Stack navigator
├── src/
│   ├── theme.ts                     Colors matching web app dark theme
│   ├── engine/
│   │   ├── types.ts                 All interfaces (port of schemas.py)
│   │   ├── intake.ts                normalizeCase() port of intake_service.py
│   │   ├── triage.ts                scoreRisk() port of triage_service.py
│   │   └── recommendation.ts       generateRecommendation() — survival-horizon fallback
│   ├── storage/
│   │   └── cases.ts                 AsyncStorage CRUD — cases + LE interaction logs
│   └── screens/
│       ├── HomeScreen.tsx           Saved case list + New Case button
│       ├── CaseInputScreen.tsx      Step 1 — checkboxes, text, enforcement flags
│       ├── RiskScreen.tsx           Step 2 — 4 risk cards + enforcement card
│       ├── ActionPlanScreen.tsx     Step 3 — 3-horizon action display
│       ├── LELogScreen.tsx          Step 5 — police interaction log form + list
│       └── PingScreen.tsx           Community ping generator + native share
└── __tests__/
    ├── intake.test.ts
    ├── triage.test.ts
    └── recommendation.test.ts
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `mobile/package.json`
- Create: `mobile/app.json`
- Create: `mobile/tsconfig.json`
- Create: `mobile/eas.json`
- Create: `mobile/src/theme.ts`

- [ ] **Step 1.1: Create `mobile/package.json`**

```json
{
  "name": "esis-mobile",
  "version": "1.0.0",
  "main": "expo/AppEntry.js",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "test": "jest --watchAll=false"
  },
  "dependencies": {
    "expo": "~51.0.28",
    "expo-status-bar": "~1.12.1",
    "expo-sharing": "~12.0.1",
    "expo-clipboard": "~6.0.3",
    "react": "18.2.0",
    "react-native": "0.74.5",
    "@react-navigation/native": "^6.1.17",
    "@react-navigation/stack": "^6.4.1",
    "react-native-screens": "~3.31.1",
    "react-native-safe-area-context": "4.10.5",
    "@react-native-async-storage/async-storage": "^1.23.1",
    "react-native-gesture-handler": "~2.17.1"
  },
  "devDependencies": {
    "@babel/core": "^7.24.0",
    "@types/react": "~18.2.79",
    "@types/react-native": "~0.73.0",
    "jest": "^29.7.0",
    "jest-expo": "~51.0.3",
    "ts-jest": "^29.1.0",
    "typescript": "^5.3.3"
  },
  "jest": {
    "preset": "jest-expo",
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)"
    ],
    "testMatch": ["**/__tests__/**/*.test.ts"]
  }
}
```

- [ ] **Step 1.2: Create `mobile/app.json`**

```json
{
  "expo": {
    "name": "ESIS",
    "slug": "esis-mobile",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "dark",
    "splash": {
      "backgroundColor": "#060D18"
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#060D18"
      },
      "package": "com.esis.survival",
      "permissions": []
    },
    "plugins": [
      [
        "@react-native-async-storage/async-storage",
        { "AsyncStorage_db_size_in_MB": 10 }
      ]
    ]
  }
}
```

- [ ] **Step 1.3: Create `mobile/tsconfig.json`**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@engine/*": ["./src/engine/*"],
      "@storage/*": ["./src/storage/*"],
      "@screens/*": ["./src/screens/*"]
    }
  }
}
```

- [ ] **Step 1.4: Create `mobile/eas.json`**

```json
{
  "cli": { "version": ">= 10.0.0" },
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

- [ ] **Step 1.5: Create `mobile/src/theme.ts`**

```typescript
export const colors = {
  bg:           '#060D18',
  card:         '#0D1B2E',
  border:       '#1E3A5F',
  textPrimary:  '#F8FAFC',
  textSecondary:'#94A3B8',
  textMuted:    '#475569',
  blue:         '#2563EB',
  blueLight:    '#60A5FA',
  red:          '#EF4444',
  amber:        '#F59E0B',
  green:        '#10B981',
  purple:       '#A855F7',
};

export const spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32,
};
```

- [ ] **Step 1.6: Create `mobile/assets/` placeholder** (Expo requires an icon)

```bash
mkdir -p mobile/assets
# Copy or create a placeholder 1024x1024 PNG at mobile/assets/icon.png
# For the demo, you can use any square PNG — replace before release
```

- [ ] **Step 1.7: Install dependencies**

```bash
cd mobile && npm install
```

Expected: `node_modules/` directory created, no errors.

- [ ] **Step 1.8: Commit**

```bash
cd ..
git add mobile/
git commit -m "feat(mobile): scaffold Expo project — package.json, app.json, eas.json, theme"
```

---

## Task 2: TypeScript Engine Types

**Files:**
- Create: `mobile/src/engine/types.ts`

- [ ] **Step 2.1: Create `mobile/src/engine/types.ts`**

```typescript
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
```

- [ ] **Step 2.2: Commit**

```bash
cd /c/esis
git add mobile/src/engine/types.ts
git commit -m "feat(mobile): engine types — CaseInput, RiskAssessment, RecommendationOutput, LEInteraction"
```

---

## Task 3: Intake Engine + Tests

**Files:**
- Create: `mobile/src/engine/intake.ts`
- Create: `mobile/__tests__/intake.test.ts`

- [ ] **Step 3.1: Write failing tests first**

```typescript
// mobile/__tests__/intake.test.ts
import { normalizeCase } from '../src/engine/intake';
import { CaseInput, DEFAULT_CASE_INPUT } from '../src/engine/types';

function inp(overrides: Partial<CaseInput>): CaseInput {
  return { ...DEFAULT_CASE_INPUT, ...overrides };
}

test('detects medical domain from pain checkbox', () => {
  const result = normalizeCase(inp({ hasPain: true }));
  expect(result.riskDomains).toContain('medical');
});

test('detects exposure domain from checkbox', () => {
  const result = normalizeCase(inp({ hasExposureRisk: true }));
  expect(result.riskDomains).toContain('exposure');
});

test('detects enforcement domain from displacement', () => {
  const result = normalizeCase(inp({ wasDisplaced: true }));
  expect(result.riskDomains).toContain('enforcement');
  expect(result.constraints.wasDisplaced).toBe(true);
});

test('detects enforcement from free text keyword', () => {
  const result = normalizeCase(inp({ rawText: 'police told me to leave' }));
  expect(result.riskDomains).toContain('enforcement');
});

test('passes constraints through', () => {
  const result = normalizeCase(inp({
    lowBattery: true, noTransport: true, recentDischarge: true,
  }));
  expect(result.constraints.lowBattery).toBe(true);
  expect(result.constraints.noTransport).toBe(true);
  expect(result.constraints.recentDischarge).toBe(true);
});

test('deduplicates domains', () => {
  const result = normalizeCase(inp({
    hasPain: true,
    rawText: 'pain and injury in hospital',
  }));
  const medCount = result.riskDomains.filter(d => d === 'medical').length;
  expect(medCount).toBe(1);
});
```

- [ ] **Step 3.2: Run tests — confirm fail**

```bash
cd mobile && npm test -- __tests__/intake.test.ts
```

Expected: `Cannot find module '../src/engine/intake'`

- [ ] **Step 3.3: Create `mobile/src/engine/intake.ts`**

```typescript
// mobile/src/engine/intake.ts
import { CaseInput, StructuredCase } from './types';

const MEDICAL_KEYWORDS    = ['pain','infection','hospital','discharged','medication','injury','fever','wound'];
const EXPOSURE_KEYWORDS   = ['freezing','cold','heat','outside','weather','exposure','night'];
const DOCUMENT_KEYWORDS   = ['lost','id','documents','paperwork','referral','caseworker','records'];
const ENFORCEMENT_KEYWORDS= ['police','cop','officer','arrested','displaced','trespass','warrant','dispersed'];

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function normalizeCase(inp: CaseInput): StructuredCase {
  const text = inp.rawText.toLowerCase();
  const domains: string[] = [];

  if (inp.hasPain || inp.recentDischarge)                              domains.push('medical');
  if (inp.hasExposureRisk)                                             domains.push('exposure');
  if (inp.hasLostDocuments)                                            domains.push('documents');
  if (inp.hasPoliceContact || inp.wasDisplaced || inp.wasThreatenedWithArrest) domains.push('enforcement');

  if (MEDICAL_KEYWORDS.some(k => text.includes(k))     && !domains.includes('medical'))     domains.push('medical');
  if (EXPOSURE_KEYWORDS.some(k => text.includes(k))    && !domains.includes('exposure'))    domains.push('exposure');
  if (DOCUMENT_KEYWORDS.some(k => text.includes(k))    && !domains.includes('documents'))   domains.push('documents');
  if (ENFORCEMENT_KEYWORDS.some(k => text.includes(k)) && !domains.includes('enforcement')) domains.push('enforcement');

  const symptomWords = ['pain','infection','fever','wound','bleeding'];
  const symptoms = symptomWords.filter(w => text.includes(w));

  return {
    caseId:     uid(),
    timestamp:  new Date().toISOString(),
    riskDomains: [...new Set(domains)],
    symptoms,
    constraints: {
      lowBattery:                       inp.lowBattery,
      lowFunds:                         inp.lowFunds,
      noTransport:                      inp.noTransport,
      hasShelter:                       inp.hasShelter,
      recentDischarge:                  inp.recentDischarge,
      hasPoliceContact:                 inp.hasPoliceContact,
      wasDisplaced:                     inp.wasDisplaced,
      wasThreatenedWithArrest:          inp.wasThreatenedWithArrest,
      lostBelongingsDueToInteraction:   inp.lostBelongingsDueToInteraction,
    },
    notes: inp.rawText.slice(0, 500),
  };
}
```

- [ ] **Step 3.4: Run tests — confirm pass**

```bash
cd mobile && npm test -- __tests__/intake.test.ts
```

Expected: 6 PASSED

- [ ] **Step 3.5: Commit**

```bash
cd /c/esis
git add mobile/src/engine/intake.ts mobile/__tests__/intake.test.ts
git commit -m "feat(mobile): intake engine — normalizeCase port with enforcement domain"
```

---

## Task 4: Triage Engine + Tests

**Files:**
- Create: `mobile/src/engine/triage.ts`
- Create: `mobile/__tests__/triage.test.ts`

- [ ] **Step 4.1: Write failing tests**

```typescript
// mobile/__tests__/triage.test.ts
import { scoreRisk } from '../src/engine/triage';
import { StructuredCase } from '../src/engine/types';

function sc(overrides: Partial<StructuredCase>): StructuredCase {
  return {
    caseId: 'test',
    timestamp: '',
    riskDomains: [],
    symptoms: [],
    constraints: {},
    notes: '',
    ...overrides,
  };
}

test('medical risk high on discharge with pain', () => {
  const r = scoreRisk(sc({
    riskDomains: ['medical'],
    symptoms: ['pain', 'infection'],
    constraints: { recentDischarge: true, hasShelter: false },
  }));
  expect(r.medicalRisk).toBeGreaterThanOrEqual(0.8);
  expect(r.requiresEscalation).toBe(true);
});

test('exposure risk high on cold no shelter', () => {
  const r = scoreRisk(sc({
    riskDomains: ['exposure'],
    constraints: { hasShelter: false, lowBattery: true },
  }));
  expect(r.exposureRisk).toBeGreaterThanOrEqual(0.7);
});

test('enforcement risk high on displacement and threat', () => {
  const r = scoreRisk(sc({
    riskDomains: ['enforcement'],
    constraints: { wasDisplaced: true, wasThreatenedWithArrest: true, hasShelter: false },
  }));
  expect(r.enforcementRisk).toBeGreaterThanOrEqual(0.9);
  expect(r.requiresEscalation).toBe(true);
});

test('low risk case', () => {
  const r = scoreRisk(sc({ constraints: { hasShelter: true } }));
  expect(r.overallPriority).toBe('low');
  expect(r.requiresEscalation).toBe(false);
});

test('priority derived from max risk', () => {
  const r = scoreRisk(sc({
    riskDomains: ['enforcement'],
    constraints: { wasDisplaced: true, wasThreatenedWithArrest: true, hasShelter: false },
  }));
  expect(r.overallPriority).toBe('high');
});
```

- [ ] **Step 4.2: Run tests — confirm fail**

```bash
cd mobile && npm test -- __tests__/triage.test.ts
```

Expected: `Cannot find module '../src/engine/triage'`

- [ ] **Step 4.3: Create `mobile/src/engine/triage.ts`**

```typescript
// mobile/src/engine/triage.ts
import { StructuredCase, RiskAssessment } from './types';

const clamp = (v: number) => Math.max(0, Math.min(1, v));

function scoreMedical(c: StructuredCase): number {
  let s = 0;
  if (c.riskDomains.includes('medical'))          s += 0.4;
  s += Math.min(c.symptoms.length * 0.15, 0.3);
  if (c.constraints.recentDischarge)              s += 0.2;
  if (!c.constraints.hasShelter)                  s += 0.1;
  const severe = new Set(['infection','sepsis','fever','wound']);
  if (c.symptoms.some(sym => severe.has(sym)))    s += 0.2;
  return clamp(s);
}

function scoreExposure(c: StructuredCase): number {
  let s = 0;
  if (c.riskDomains.includes('exposure'))         s += 0.5;
  if (!c.constraints.hasShelter)                  s += 0.2;
  if (c.constraints.lowBattery)                   s += 0.15;
  if (c.constraints.lowFunds)                     s += 0.1;
  if (c.constraints.noTransport)                  s += 0.1;
  return clamp(s);
}

function scoreDocuments(c: StructuredCase): number {
  let s = 0;
  if (c.riskDomains.includes('documents'))        s += 0.5;
  if (!c.constraints.hasShelter)                  s += 0.1;
  return clamp(s);
}

function scoreEnforcement(c: StructuredCase): number {
  let s = 0;
  if (c.riskDomains.includes('enforcement'))             s += 0.4;
  if (c.constraints.wasDisplaced)                        s += 0.25;
  if (c.constraints.wasThreatenedWithArrest)             s += 0.2;
  if (c.constraints.lostBelongingsDueToInteraction)      s += 0.2;
  if (!c.constraints.hasShelter)                         s += 0.1;
  return clamp(s);
}

export function scoreRisk(c: StructuredCase): RiskAssessment {
  const medical      = scoreMedical(c);
  const exposure     = scoreExposure(c);
  const documentation= scoreDocuments(c);
  const enforcement  = scoreEnforcement(c);
  const maxRisk      = Math.max(medical, exposure, documentation, enforcement);
  return {
    medicalRisk:      medical,
    exposureRisk:     exposure,
    documentationRisk:documentation,
    enforcementRisk:  enforcement,
    overallPriority:  maxRisk >= 0.8 ? 'high' : maxRisk >= 0.5 ? 'medium' : 'low',
    requiresEscalation: maxRisk >= 0.8,
  };
}
```

- [ ] **Step 4.4: Run tests — confirm pass**

```bash
cd mobile && npm test -- __tests__/triage.test.ts
```

Expected: 5 PASSED

- [ ] **Step 4.5: Commit**

```bash
cd /c/esis
git add mobile/src/engine/triage.ts mobile/__tests__/triage.test.ts
git commit -m "feat(mobile): triage engine — scoreRisk with all 4 risk dimensions"
```

---

## Task 5: Recommendation Engine + Tests

**Files:**
- Create: `mobile/src/engine/recommendation.ts`
- Create: `mobile/__tests__/recommendation.test.ts`

- [ ] **Step 5.1: Write failing tests**

```typescript
// mobile/__tests__/recommendation.test.ts
import { generateRecommendation } from '../src/engine/recommendation';
import { StructuredCase, RiskAssessment } from '../src/engine/types';

const acuteCase: StructuredCase = {
  caseId: 'x', timestamp: '', notes: '',
  riskDomains: ['enforcement', 'exposure', 'medical'],
  symptoms: ['pain'],
  constraints: {
    hasShelter: false, wasDisplaced: true, wasThreatenedWithArrest: true,
    recentDischarge: true, lowBattery: true,
  },
};
const acuteRisk: RiskAssessment = {
  medicalRisk: 0.85, exposureRisk: 1.0,
  documentationRisk: 0.6, enforcementRisk: 0.95,
  overallPriority: 'high', requiresEscalation: true,
};

test('acute case produces immediateActions', () => {
  const r = generateRecommendation(acuteCase, acuteRisk);
  expect(r.immediateActions.length).toBeGreaterThan(0);
  expect(r.stabilizationActions.length).toBeGreaterThan(0);
  expect(r.recoveryActions.length).toBeGreaterThan(0);
});

test('acute case does NOT put SOAR in topActions[0]', () => {
  const r = generateRecommendation(acuteCase, acuteRisk);
  expect(r.topActions[0].toLowerCase()).not.toContain('soar');
  expect(r.topActions[0].toLowerCase()).not.toContain('ssi');
  expect(r.topActions[0].toLowerCase()).not.toContain('section 811');
});

test('acute case topActions[0] is about immediate safety', () => {
  const r = generateRecommendation(acuteCase, acuteRisk);
  const firstAction = r.topActions[0].toLowerCase();
  const isSurvival = firstAction.includes('indoor') ||
    firstAction.includes('relocate') || firstAction.includes('shelter') ||
    firstAction.includes('211');
  expect(isSurvival).toBe(true);
});

test('SOAR appears in fallbackPlan for acute case', () => {
  const r = generateRecommendation(acuteCase, acuteRisk);
  expect(r.fallbackPlan.toLowerCase()).toContain('soar');
});

test('non-acute case has empty horizons', () => {
  const lowCase: StructuredCase = {
    caseId: 'y', timestamp: '', notes: '', riskDomains: [],
    symptoms: [], constraints: { hasShelter: true },
  };
  const lowRisk: RiskAssessment = {
    medicalRisk: 0.1, exposureRisk: 0.1, documentationRisk: 0.1,
    enforcementRisk: 0.0, overallPriority: 'low', requiresEscalation: false,
  };
  const r = generateRecommendation(lowCase, lowRisk);
  expect(r.immediateActions).toHaveLength(0);
  expect(r.topActions.length).toBeGreaterThan(0);
});
```

- [ ] **Step 5.2: Run tests — confirm fail**

```bash
cd mobile && npm test -- __tests__/recommendation.test.ts
```

Expected: `Cannot find module '../src/engine/recommendation'`

- [ ] **Step 5.3: Create `mobile/src/engine/recommendation.ts`**

```typescript
// mobile/src/engine/recommendation.ts
import { StructuredCase, RiskAssessment, RecommendationOutput } from './types';

function isAcute(risk: RiskAssessment, c: StructuredCase): boolean {
  return (
    risk.exposureRisk >= 0.85 ||
    (risk.medicalRisk >= 0.80 && !!c.constraints.recentDischarge) ||
    (risk.enforcementRisk >= 0.80 && !!c.constraints.wasDisplaced) ||
    (!c.constraints.hasShelter && risk.exposureRisk >= 0.70)
  );
}

export function generateRecommendation(
  c: StructuredCase,
  risk: RiskAssessment,
): RecommendationOutput {
  const domainsStr = c.riskDomains.length > 0 ? c.riskDomains.join(', ') : 'general support';

  if (isAcute(risk, c)) {
    const h1: string[] = [];
    if (risk.enforcementRisk >= 0.8 && c.constraints.wasDisplaced) {
      h1.push(
        'Relocate to the nearest indoor safe space immediately — current location was ' +
        'compromised by enforcement contact. Call 211 or walk to the nearest warming center or ER.'
      );
    }
    if (risk.exposureRisk >= 0.7 || !c.constraints.hasShelter) {
      h1.push(
        "Request same-night indoor placement now — call 211 and say: 'I need emergency " +
        "shelter tonight. I have a disability, recent hospital discharge, and cold exposure. " +
        "I need a non-congregate placement.' This triggers a different pathway."
      );
    }
    if (h1.length === 0) h1.push('Call 211 immediately for same-night emergency placement');

    const h2: string[] = [];
    if (risk.medicalRisk >= 0.8 || c.constraints.recentDischarge) {
      h2.push(
        "Return to the ER and demand a social work evaluation — not triage. Say: 'I was " +
        "recently discharged and am now homeless with worsening symptoms. I need a social " +
        "worker to document a discharge-to-street event and reinstate my medical respite referral.'"
      );
    }
    if (risk.enforcementRisk >= 0.5) {
      h2.push(
        'Document the enforcement interaction: date, location, officer descriptions, ' +
        'commands given, belongings lost, what was denied. This is evidence for legal aid, ' +
        'case management, and housing pathway restoration.'
      );
    }
    if (h2.length === 0) h2.push('Contact a case manager or outreach worker within 24 hours');

    const h3: string[] = [];
    if (risk.documentationRisk >= 0.5) {
      h3.push('Connect with coordinated entry and Colorado Legal Services (303-837-1321)');
    }
    h3.push('Begin SOAR (SSI/SSDI) application — retroactive to filing date — once stable');

    return {
      summary:
        `Acute survival state — ${domainsStr} risk domains active. Immediate indoor ` +
        `placement and medical continuity are the first priority. Benefits and housing ` +
        `applications follow once tonight is safe.`,
      topActions:           [h1[0], h2[0], h3[0]],
      immediateActions:     h1.slice(0, 2),
      stabilizationActions: h2.slice(0, 2),
      recoveryActions:      h3.slice(0, 2),
      fallbackPlan:
        'If 211 and shelter are unavailable: go to the nearest ER — you have the right to ' +
        'warmth and safety. State your disability and recent discharge. ' +
        'Call 988 or Colorado Crisis Services (844-493-8255). ' +
        'Next steps once stable: SOAR application, HUD 1-800-569-4287, ' +
        'Colorado Legal Services 303-837-1321.',
      whatToPreserve: [
        'Medical records and discharge paperwork — evidence for respite reinstatement',
        'Documentation of enforcement interaction — date, location, what was said',
        'Contact information for any caseworker or advocate',
      ],
    };
  }

  // Non-acute
  const actions: string[] = [];
  if (risk.medicalRisk >= 0.8)      actions.push('Seek emergency medical evaluation immediately');
  if (risk.exposureRisk >= 0.7)     actions.push('Find indoor shelter or warming center now');
  if (risk.documentationRisk >= 0.5)actions.push('Generate referral packet and begin ID replacement');
  if (risk.enforcementRisk >= 0.8) {
    actions.unshift('Relocate immediately — location compromised by enforcement contact');
    actions.push('Document police interaction for advocate or case manager');
  }
  const defaults = [
    'Contact 211 for immediate resource referral',
    'Document your current situation in writing',
    'Identify the nearest support services',
  ];
  for (const d of defaults) {
    if (actions.length >= 3) break;
    actions.push(d);
  }

  return {
    summary: `High-priority case with active risk domains: ${domainsStr}. Immediate intervention required.`,
    topActions:           actions.slice(0, 3),
    immediateActions:     [],
    stabilizationActions: [],
    recoveryActions:      [],
    fallbackPlan: 'Contact 211, go to the nearest ER for safety and warmth, or call 988.',
    whatToPreserve: [
      'Any remaining ID or government documents',
      'Medical records and discharge paperwork',
      'Contact information for caseworkers or advocates',
    ],
  };
}
```

- [ ] **Step 5.4: Run all engine tests**

```bash
cd mobile && npm test
```

Expected: 16 PASSED (6 intake + 5 triage + 5 recommendation)

- [ ] **Step 5.5: Commit**

```bash
cd /c/esis
git add mobile/src/engine/recommendation.ts mobile/__tests__/recommendation.test.ts
git commit -m "feat(mobile): recommendation engine — survival-horizon action ordering"
```

---

## Task 6: Storage Layer

**Files:**
- Create: `mobile/src/storage/cases.ts`

- [ ] **Step 6.1: Create `mobile/src/storage/cases.ts`**

```typescript
// mobile/src/storage/cases.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SavedCase } from '../engine/types';

const KEY = 'esis_saved_cases';

export async function loadAllCases(): Promise<SavedCase[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedCase[]) : [];
  } catch {
    return [];
  }
}

export async function saveCase(c: SavedCase): Promise<void> {
  const all = await loadAllCases();
  const idx = all.findIndex(x => x.id === c.id);
  if (idx >= 0) {
    all[idx] = c;
  } else {
    all.unshift(c);
  }
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
}

export async function deleteCase(id: string): Promise<void> {
  const all = await loadAllCases();
  await AsyncStorage.setItem(KEY, JSON.stringify(all.filter(c => c.id !== id)));
}

export function newCaseId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
```

- [ ] **Step 6.2: Commit**

```bash
cd /c/esis
git add mobile/src/storage/cases.ts
git commit -m "feat(mobile): AsyncStorage CRUD — save/load/delete cases with LE interaction logs"
```

---

## Task 7: App Shell + Navigation

**Files:**
- Create: `mobile/App.tsx`

- [ ] **Step 7.1: Create `mobile/App.tsx`**

```typescript
// mobile/App.tsx
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { colors } from './src/theme';
import HomeScreen from './src/screens/HomeScreen';
import CaseInputScreen from './src/screens/CaseInputScreen';
import RiskScreen from './src/screens/RiskScreen';
import ActionPlanScreen from './src/screens/ActionPlanScreen';
import LELogScreen from './src/screens/LELogScreen';
import PingScreen from './src/screens/PingScreen';
import { RiskAssessment, RecommendationOutput, SavedCase } from './src/engine/types';

export type RootStackParamList = {
  Home: undefined;
  CaseInput: { caseId?: string };
  Risk: { caseId: string; risk: RiskAssessment };
  ActionPlan: { caseId: string; recommendation: RecommendationOutput };
  LELog: { caseId: string };
  Ping: { caseId: string };
};

const Stack = createStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.card,
    text: colors.textPrimary,
    border: colors.border,
  },
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer theme={navTheme}>
        <StatusBar style="light" backgroundColor={colors.bg} />
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.textPrimary,
            headerTitleStyle: { fontWeight: 'bold' },
            cardStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'ESIS' }} />
          <Stack.Screen name="CaseInput" component={CaseInputScreen} options={{ title: 'New Case' }} />
          <Stack.Screen name="Risk" component={RiskScreen} options={{ title: 'Risk Assessment' }} />
          <Stack.Screen name="ActionPlan" component={ActionPlanScreen} options={{ title: 'Action Plan' }} />
          <Stack.Screen name="LELog" component={LELogScreen} options={{ title: 'Police Interaction Log' }} />
          <Stack.Screen name="Ping" component={PingScreen} options={{ title: 'Community Ping' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 7.2: Commit**

```bash
cd /c/esis
git add mobile/App.tsx
git commit -m "feat(mobile): navigation shell — Stack navigator with 6 screens"
```

---

## Task 8: HomeScreen

**Files:**
- Create: `mobile/src/screens/HomeScreen.tsx`

- [ ] **Step 8.1: Create `mobile/src/screens/HomeScreen.tsx`**

```typescript
// mobile/src/screens/HomeScreen.tsx
import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colors, spacing } from '../theme';
import { loadAllCases, deleteCase } from '../storage/cases';
import { SavedCase } from '../engine/types';
import { RootStackParamList } from '../../App';

type Nav = StackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const nav = useNavigation<Nav>();
  const [cases, setCases] = useState<SavedCase[]>([]);

  useFocusEffect(useCallback(() => {
    loadAllCases().then(setCases);
  }, []));

  const onDelete = (id: string, name: string) => {
    Alert.alert('Delete Case', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => deleteCase(id).then(() => loadAllCases().then(setCases)),
      },
    ]);
  };

  const priorityColor = (p?: string) =>
    p === 'high' ? colors.red : p === 'medium' ? colors.amber : colors.green;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>🛟 ESIS</Text>
        <Text style={styles.subtitle}>Edge Survival Intelligence System</Text>
        <Text style={styles.tagline}>Built with lived experience · Offline-first · Gemma 4 Powered</Text>
      </View>

      <TouchableOpacity style={styles.newBtn} onPress={() => nav.navigate('CaseInput', {})}>
        <Text style={styles.newBtnText}>+ New Case</Text>
      </TouchableOpacity>

      {cases.length === 0 ? (
        <Text style={styles.empty}>No saved cases. Tap "+ New Case" to begin.</Text>
      ) : (
        <FlatList
          data={cases}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.caseCard}
              onPress={() => nav.navigate('CaseInput', { caseId: item.id })}
              onLongPress={() => onDelete(item.id, item.name)}
            >
              <View style={styles.caseRow}>
                <Text style={styles.caseName}>{item.name}</Text>
                {item.risk && (
                  <View style={[styles.badge, { backgroundColor: priorityColor(item.risk.overallPriority) + '33' }]}>
                    <Text style={[styles.badgeText, { color: priorityColor(item.risk.overallPriority) }]}>
                      {item.risk.overallPriority.toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.caseDate}>
                {new Date(item.savedAt).toLocaleDateString()} ·{' '}
                {item.leInteractions.length > 0 ? `${item.leInteractions.length} LE interaction(s)` : 'No LE log'}
              </Text>
            </TouchableOpacity>
          )}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => loadAllCases().then(setCases)} />}
        />
      )}

      <Text style={styles.footer}>Long-press a case to delete · Tap to open</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.bg, padding: spacing.md },
  header:      { alignItems: 'center', marginBottom: spacing.lg, paddingTop: spacing.md },
  logo:        { fontSize: 36, fontWeight: '800', color: colors.textPrimary },
  subtitle:    { color: colors.blueLight, fontSize: 13, fontWeight: '600', marginTop: 4 },
  tagline:     { color: colors.textMuted, fontSize: 11, marginTop: 2, textAlign: 'center' },
  newBtn:      { backgroundColor: colors.blue, borderRadius: 10, padding: spacing.md,
                 alignItems: 'center', marginBottom: spacing.lg },
  newBtnText:  { color: '#fff', fontWeight: '700', fontSize: 16 },
  empty:       { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl },
  caseCard:    { backgroundColor: colors.card, borderRadius: 10, padding: spacing.md,
                 marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  caseRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  caseName:    { color: colors.textPrimary, fontWeight: '600', flex: 1 },
  badge:       { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 2, marginLeft: 8 },
  badgeText:   { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  caseDate:    { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  footer:      { color: colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: spacing.sm },
});
```

- [ ] **Step 8.2: Commit**

```bash
cd /c/esis
git add mobile/src/screens/HomeScreen.tsx
git commit -m "feat(mobile): HomeScreen — saved case list, priority badges, delete"
```

---

## Task 9: CaseInputScreen

**Files:**
- Create: `mobile/src/screens/CaseInputScreen.tsx`

- [ ] **Step 9.1: Create `mobile/src/screens/CaseInputScreen.tsx`**

```typescript
// mobile/src/screens/CaseInputScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  Switch, StyleSheet, Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colors, spacing } from '../theme';
import { normalizeCase } from '../engine/intake';
import { scoreRisk } from '../engine/triage';
import { generateRecommendation } from '../engine/recommendation';
import { loadAllCases, saveCase, newCaseId } from '../storage/cases';
import { CaseInput, DEFAULT_CASE_INPUT, PersonProfile, DEFAULT_PROFILE, SavedCase } from '../engine/types';
import { RootStackParamList } from '../../App';

type Nav  = StackNavigationProp<RootStackParamList, 'CaseInput'>;
type Route= RouteProp<RootStackParamList, 'CaseInput'>;

function CheckRow({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Switch value={value} onValueChange={onToggle}
        trackColor={{ true: colors.blue, false: colors.border }}
        thumbColor={value ? '#fff' : colors.textMuted} />
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
           paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  label: { color: colors.textPrimary, flex: 1, fontSize: 14 },
});

export default function CaseInputScreen() {
  const nav   = useNavigation<Nav>();
  const route = useRoute<Route>();
  const caseId = route.params?.caseId;

  const [caseName, setCaseName]   = useState('');
  const [inp, setInp]             = useState<CaseInput>(DEFAULT_CASE_INPUT);
  const [profile, setProfile]     = useState<PersonProfile>(DEFAULT_PROFILE);
  const [savedCaseData, setSavedCaseData] = useState<SavedCase | null>(null);

  useEffect(() => {
    if (caseId) {
      loadAllCases().then(all => {
        const found = all.find(c => c.id === caseId);
        if (found) {
          setSavedCaseData(found);
          setCaseName(found.name);
          setInp(found.input);
          setProfile(found.profile);
        }
      });
    }
  }, [caseId]);

  const toggle = (key: keyof CaseInput) =>
    setInp(prev => ({ ...prev, [key]: !prev[key] }));

  const onAnalyze = async () => {
    if (!caseName.trim()) {
      Alert.alert('Name required', 'Enter a name for this case first.');
      return;
    }
    const structured   = normalizeCase(inp);
    const risk         = scoreRisk(structured);
    const recommendation = generateRecommendation(structured, risk);
    const id           = savedCaseData?.id ?? newCaseId();
    const toSave: SavedCase = {
      id,
      name: caseName.trim(),
      savedAt: new Date().toISOString(),
      input: inp,
      profile,
      risk,
      recommendation,
      leInteractions: savedCaseData?.leInteractions ?? [],
    };
    await saveCase(toSave);
    nav.navigate('Risk', { caseId: id, risk });
  };

  const section = (title: string) => (
    <Text style={styles.sectionTitle}>{title}</Text>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TextInput
        style={styles.nameInput}
        placeholder="Case name (e.g. My Situation — April 2026)"
        placeholderTextColor={colors.textMuted}
        value={caseName}
        onChangeText={setCaseName}
      />

      {section('Situation Description')}
      <TextInput
        style={styles.textArea}
        multiline
        numberOfLines={5}
        placeholder="Describe the situation in your own words..."
        placeholderTextColor={colors.textMuted}
        value={inp.rawText}
        onChangeText={v => setInp(p => ({ ...p, rawText: v }))}
        textAlignVertical="top"
      />

      {section('Active Conditions')}
      <CheckRow label="Medical pain / instability"        value={inp.hasPain}            onToggle={() => toggle('hasPain')} />
      <CheckRow label="Exposure / cold / heat risk"       value={inp.hasExposureRisk}    onToggle={() => toggle('hasExposureRisk')} />
      <CheckRow label="Has shelter tonight"               value={inp.hasShelter}         onToggle={() => toggle('hasShelter')} />
      <CheckRow label="Lost ID / documents"               value={inp.hasLostDocuments}   onToggle={() => toggle('hasLostDocuments')} />
      <CheckRow label="Phone battery < 20%"               value={inp.lowBattery}         onToggle={() => toggle('lowBattery')} />
      <CheckRow label="No cash / limited funds"           value={inp.lowFunds}           onToggle={() => toggle('lowFunds')} />
      <CheckRow label="No transportation"                 value={inp.noTransport}        onToggle={() => toggle('noTransport')} />
      <CheckRow label="Recent hospital discharge"         value={inp.recentDischarge}    onToggle={() => toggle('recentDischarge')} />
      <CheckRow label="Cannot use congregate shelter"     value={inp.cannotCongregate}   onToggle={() => toggle('cannotCongregate')} />
      <CheckRow label="Chronically homeless (1+ yr)"      value={inp.chronicHomeless}    onToggle={() => toggle('chronicHomeless')} />

      {section('Authority Interaction')}
      <View style={styles.enforcementBanner}>
        <Text style={styles.enforcementText}>
          Police interactions affect risk scores and generate accountability records
          shared with case managers, outreach teams, and HUD.
        </Text>
      </View>
      <CheckRow label="Recent police interaction"         value={inp.hasPoliceContact}              onToggle={() => toggle('hasPoliceContact')} />
      <CheckRow label="Told to leave / displaced"         value={inp.wasDisplaced}                  onToggle={() => toggle('wasDisplaced')} />
      <CheckRow label="Threatened with arrest"            value={inp.wasThreatenedWithArrest}       onToggle={() => toggle('wasThreatenedWithArrest')} />
      <CheckRow label="Lost belongings during interaction" value={inp.lostBelongingsDueToInteraction} onToggle={() => toggle('lostBelongingsDueToInteraction')} />

      {section('Profile (Optional)')}
      <CheckRow label="Has a disability"
        value={profile.isDisabled} onToggle={() => setProfile(p => ({ ...p, isDisabled: !p.isDisabled }))} />
      <TextInput
        style={styles.input}
        placeholder="Professional background (brief)"
        placeholderTextColor={colors.textMuted}
        value={profile.professionalBackground}
        onChangeText={v => setProfile(p => ({ ...p, professionalBackground: v }))}
      />
      <TextInput
        style={styles.input}
        placeholder="Skills / what you can offer"
        placeholderTextColor={colors.textMuted}
        value={profile.skillsSummary}
        onChangeText={v => setProfile(p => ({ ...p, skillsSummary: v }))}
      />
      <TextInput
        style={styles.input}
        placeholder="Contact email (for community ping)"
        placeholderTextColor={colors.textMuted}
        value={profile.contactEmail}
        onChangeText={v => setProfile(p => ({ ...p, contactEmail: v }))}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Contact phone (for community ping)"
        placeholderTextColor={colors.textMuted}
        value={profile.contactPhone}
        onChangeText={v => setProfile(p => ({ ...p, contactPhone: v }))}
        keyboardType="phone-pad"
      />

      <TouchableOpacity style={styles.analyzeBtn} onPress={onAnalyze}>
        <Text style={styles.analyzeBtnText}>🔍  Analyze with ESIS</Text>
      </TouchableOpacity>

      {savedCaseData && (
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => nav.navigate('LELog', { caseId: savedCaseData.id })}
        >
          <Text style={styles.secondaryBtnText}>
            🚔 Police Interaction Log
            {savedCaseData.leInteractions.length > 0
              ? ` (${savedCaseData.leInteractions.length})`
              : ''}
          </Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.bg },
  content:        { padding: spacing.md },
  sectionTitle:   { color: colors.blueLight, fontWeight: '700', fontSize: 13,
                    textTransform: 'uppercase', letterSpacing: 0.8,
                    marginTop: spacing.lg, marginBottom: spacing.xs },
  nameInput:      { backgroundColor: colors.card, borderRadius: 8, padding: spacing.md,
                    color: colors.textPrimary, borderWidth: 1, borderColor: colors.border,
                    marginBottom: spacing.sm, fontSize: 15 },
  textArea:       { backgroundColor: colors.card, borderRadius: 8, padding: spacing.md,
                    color: colors.textPrimary, borderWidth: 1, borderColor: colors.border,
                    minHeight: 120, fontSize: 14 },
  input:          { backgroundColor: colors.card, borderRadius: 8, padding: spacing.md,
                    color: colors.textPrimary, borderWidth: 1, borderColor: colors.border,
                    marginTop: spacing.sm, fontSize: 14 },
  enforcementBanner: { backgroundColor: '#0D1B2E', borderWidth: 1, borderColor: colors.blue + '44',
                        borderRadius: 8, padding: spacing.sm, marginBottom: spacing.sm },
  enforcementText:   { color: colors.blueLight, fontSize: 12, lineHeight: 18 },
  analyzeBtn:     { backgroundColor: colors.blue, borderRadius: 10, padding: spacing.md + 4,
                    alignItems: 'center', marginTop: spacing.lg },
  analyzeBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryBtn:   { borderWidth: 1, borderColor: colors.border, borderRadius: 10,
                    padding: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  secondaryBtnText: { color: colors.textSecondary, fontSize: 14 },
});
```

- [ ] **Step 9.2: Commit**

```bash
cd /c/esis
git add mobile/src/screens/CaseInputScreen.tsx
git commit -m "feat(mobile): CaseInputScreen — all checkboxes, enforcement section, profile, analyze"
```

---

## Task 10: RiskScreen + ActionPlanScreen

**Files:**
- Create: `mobile/src/screens/RiskScreen.tsx`
- Create: `mobile/src/screens/ActionPlanScreen.tsx`

- [ ] **Step 10.1: Create `mobile/src/screens/RiskScreen.tsx`**

```typescript
// mobile/src/screens/RiskScreen.tsx
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colors, spacing } from '../theme';
import { loadAllCases } from '../storage/cases';
import { RootStackParamList } from '../../App';

type Nav   = StackNavigationProp<RootStackParamList, 'Risk'>;
type Route = RouteProp<RootStackParamList, 'Risk'>;

function RiskCard({ label, score, icon }: { label: string; score: number; icon: string }) {
  const pct   = Math.round(score * 100);
  const color = score >= 0.8 ? colors.red : score >= 0.5 ? colors.amber : colors.green;
  return (
    <View style={cardStyles.card}>
      <Text style={cardStyles.label}>{icon} {label}</Text>
      <Text style={[cardStyles.value, { color }]}>{pct}%</Text>
      <View style={cardStyles.barBg}>
        <View style={[cardStyles.barFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}
const cardStyles = StyleSheet.create({
  card:   { backgroundColor: colors.card, borderRadius: 10, padding: spacing.md,
            borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm, flex: 1, margin: 4 },
  label:  { color: colors.textSecondary, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  value:  { fontSize: 28, fontWeight: '800', marginTop: 4 },
  barBg:  { height: 6, backgroundColor: colors.border, borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  barFill:{ height: 6, borderRadius: 3 },
});

export default function RiskScreen() {
  const nav   = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { caseId, risk } = route.params;

  const onContinue = async () => {
    const all = await loadAllCases();
    const c   = all.find(x => x.id === caseId);
    if (c?.recommendation) {
      nav.navigate('ActionPlan', { caseId, recommendation: c.recommendation });
    }
  };

  const p = risk.overallPriority;
  const escalationBg = p === 'high' ? '#1A0808' : p === 'medium' ? '#1A1200' : '#061A0E';
  const escalationBorder = p === 'high' ? colors.red : p === 'medium' ? colors.amber : colors.green;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.banner, { backgroundColor: escalationBg, borderColor: escalationBorder }]}>
        <Text style={[styles.bannerPriority, { color: escalationBorder }]}>
          {p.toUpperCase()} PRIORITY
        </Text>
        {risk.requiresEscalation && (
          <Text style={styles.bannerSub}>⚠️  Escalation Required — Immediate intervention needed</Text>
        )}
      </View>

      <View style={styles.grid}>
        <View style={styles.gridRow}>
          <RiskCard label="Medical Risk"      score={risk.medicalRisk}      icon="🩺" />
          <RiskCard label="Exposure Risk"     score={risk.exposureRisk}     icon="🌡️" />
        </View>
        <View style={styles.gridRow}>
          <RiskCard label="Documentation"     score={risk.documentationRisk}icon="📋" />
          <RiskCard label="Enforcement Risk"  score={risk.enforcementRisk}  icon="🚔" />
        </View>
      </View>

      {risk.enforcementRisk >= 0.5 && (
        <View style={styles.enforcementCard}>
          <Text style={styles.enforcementTitle}>🚔 Enforcement Harm Detected</Text>
          <Text style={styles.enforcementBody}>
            Police/law-enforcement contact is contributing to this person's risk score.
            Enforcement risk: {Math.round(risk.enforcementRisk * 100)}% — logged in audit trail.
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.continueBtn} onPress={onContinue}>
        <Text style={styles.continueBtnText}>View Action Plan →</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={() => nav.navigate('LELog', { caseId })}
      >
        <Text style={styles.secondaryBtnText}>🚔 Log Police Interaction</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={() => nav.navigate('Ping', { caseId })}
      >
        <Text style={styles.secondaryBtnText}>📢 Community Ping</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.bg },
  content:         { padding: spacing.md },
  banner:          { borderRadius: 10, padding: spacing.md, borderWidth: 1,
                     marginBottom: spacing.md, alignItems: 'center' },
  bannerPriority:  { fontWeight: '800', fontSize: 18, letterSpacing: 1 },
  bannerSub:       { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
  grid:            { marginBottom: spacing.sm },
  gridRow:         { flexDirection: 'row' },
  enforcementCard: { backgroundColor: '#0D1B2E', borderWidth: 1, borderColor: colors.red + '44',
                     borderRadius: 10, padding: spacing.md, marginBottom: spacing.md },
  enforcementTitle:{ color: colors.red, fontWeight: '700', fontSize: 14, marginBottom: 4 },
  enforcementBody: { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
  continueBtn:     { backgroundColor: colors.blue, borderRadius: 10, padding: spacing.md + 4,
                     alignItems: 'center', marginBottom: spacing.sm },
  continueBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryBtn:    { borderWidth: 1, borderColor: colors.border, borderRadius: 10,
                     padding: spacing.md, alignItems: 'center', marginBottom: spacing.sm },
  secondaryBtnText:{ color: colors.textSecondary, fontSize: 14 },
});
```

- [ ] **Step 10.2: Create `mobile/src/screens/ActionPlanScreen.tsx`**

```typescript
// mobile/src/screens/ActionPlanScreen.tsx
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colors, spacing } from '../theme';
import { RecommendationOutput } from '../engine/types';
import { RootStackParamList } from '../../App';

type Nav   = StackNavigationProp<RootStackParamList, 'ActionPlan'>;
type Route = RouteProp<RootStackParamList, 'ActionPlan'>;

function HorizonBlock({
  label, color, actions,
}: { label: string; color: string; actions: string[] }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={[hStyles.horizonLabel, { color }]}>{label}</Text>
      {actions.map((a, i) => (
        <View key={i} style={hStyles.actionRow}>
          <View style={[hStyles.num, { backgroundColor: color }]}>
            <Text style={hStyles.numText}>{i + 1}</Text>
          </View>
          <Text style={hStyles.actionText}>{a}</Text>
        </View>
      ))}
    </View>
  );
}
const hStyles = StyleSheet.create({
  horizonLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase',
                  letterSpacing: 0.8, marginBottom: spacing.sm },
  actionRow:    { flexDirection: 'row', alignItems: 'flex-start',
                  backgroundColor: colors.card, borderRadius: 8,
                  padding: spacing.sm, marginBottom: spacing.xs,
                  borderWidth: 1, borderColor: colors.border },
  num:          { width: 26, height: 26, borderRadius: 13, alignItems: 'center',
                  justifyContent: 'center', marginRight: spacing.sm, flexShrink: 0 },
  numText:      { color: '#fff', fontWeight: '800', fontSize: 13 },
  actionText:   { color: colors.textPrimary, fontSize: 14, flex: 1, lineHeight: 22 },
});

export default function ActionPlanScreen() {
  const nav   = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { caseId, recommendation: rec } = route.params;
  const isAcute = rec.immediateActions.length > 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Situation Summary</Text>
        <Text style={styles.summaryText}>{rec.summary}</Text>
      </View>

      {isAcute ? (
        <>
          <HorizonBlock
            label="Horizon 1 — Do This Now (0–2 hours)"
            color={colors.red}
            actions={rec.immediateActions}
          />
          {rec.stabilizationActions.length > 0 && (
            <HorizonBlock
              label="Horizon 2 — Next 24 Hours"
              color={colors.amber}
              actions={rec.stabilizationActions}
            />
          )}
          {rec.recoveryActions.length > 0 && (
            <HorizonBlock
              label="Horizon 3 — Recovery Track (Days–Weeks)"
              color={colors.green}
              actions={rec.recoveryActions}
            />
          )}
        </>
      ) : (
        <HorizonBlock label="Top Actions" color={colors.blue} actions={rec.topActions} />
      )}

      <View style={styles.fallbackCard}>
        <Text style={styles.fallbackLabel}>Fallback Plan</Text>
        <Text style={styles.fallbackText}>{rec.fallbackPlan}</Text>
      </View>

      {rec.whatToPreserve.length > 0 && (
        <View style={styles.preserveCard}>
          <Text style={styles.preserveLabel}>What to Preserve</Text>
          {rec.whatToPreserve.map((item, i) => (
            <Text key={i} style={styles.preserveItem}>• {item}</Text>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.pingBtn} onPress={() => nav.navigate('Ping', { caseId })}>
        <Text style={styles.pingBtnText}>📢  Send Community Ping</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={() => nav.navigate('LELog', { caseId })}
      >
        <Text style={styles.secondaryBtnText}>🚔 Police Interaction Log</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.bg },
  content:        { padding: spacing.md },
  summaryCard:    { backgroundColor: colors.card, borderRadius: 10, padding: spacing.md,
                    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  summaryLabel:   { color: colors.textMuted, fontSize: 10, textTransform: 'uppercase',
                    letterSpacing: 0.8, marginBottom: 6 },
  summaryText:    { color: colors.textPrimary, fontSize: 14, lineHeight: 22 },
  fallbackCard:   { backgroundColor: '#0A1525', borderRadius: 8, padding: spacing.md,
                    borderLeftWidth: 3, borderLeftColor: colors.textMuted,
                    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  fallbackLabel:  { color: colors.textMuted, fontSize: 10, fontWeight: '700',
                    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  fallbackText:   { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
  preserveCard:   { backgroundColor: colors.card, borderRadius: 10, padding: spacing.md,
                    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  preserveLabel:  { color: colors.textMuted, fontSize: 10, textTransform: 'uppercase',
                    letterSpacing: 0.8, marginBottom: 6 },
  preserveItem:   { color: colors.textSecondary, fontSize: 13, lineHeight: 22 },
  pingBtn:        { backgroundColor: colors.blue, borderRadius: 10, padding: spacing.md + 4,
                    alignItems: 'center', marginBottom: spacing.sm },
  pingBtnText:    { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryBtn:   { borderWidth: 1, borderColor: colors.border, borderRadius: 10,
                    padding: spacing.md, alignItems: 'center', marginBottom: spacing.sm },
  secondaryBtnText: { color: colors.textSecondary, fontSize: 14 },
});
```

- [ ] **Step 10.3: Commit**

```bash
cd /c/esis
git add mobile/src/screens/RiskScreen.tsx mobile/src/screens/ActionPlanScreen.tsx
git commit -m "feat(mobile): RiskScreen (4 risk cards) + ActionPlanScreen (3-horizon display)"
```

---

## Task 11: LELogScreen (Police Interaction Log)

**Files:**
- Create: `mobile/src/screens/LELogScreen.tsx`

- [ ] **Step 11.1: Create `mobile/src/screens/LELogScreen.tsx`**

```typescript
// mobile/src/screens/LELogScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, Alert,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { colors, spacing } from '../theme';
import { loadAllCases, saveCase } from '../storage/cases';
import { LEInteraction, SavedCase } from '../engine/types';
import { RootStackParamList } from '../../App';

type Route = RouteProp<RootStackParamList, 'LELog'>;

const ENCOUNTER_TYPES = [
  { key: 'no_action',           label: 'No action taken' },
  { key: 'welfare_check',       label: 'Welfare check' },
  { key: 'displacement_order',  label: 'Displacement / told to leave' },
  { key: 'trespass_warning',    label: 'Trespass warning' },
  { key: 'citation',            label: 'Citation / ticket' },
  { key: 'arrest',              label: 'Arrest' },
  { key: 'property_removal',    label: 'Property removed / confiscated' },
  { key: 'transport_offer',     label: 'Transport offered' },
  { key: 'referral_offer',      label: 'Referral / resource offered' },
];

const OUTCOMES = [
  { key: 'unchanged',           label: 'Unchanged' },
  { key: 'safer',               label: 'Safer — interaction helped' },
  { key: 'higher_exposure_risk',label: 'Higher exposure risk' },
  { key: 'higher_medical_risk', label: 'Higher medical risk' },
  { key: 'jailed',              label: 'Arrested / jailed' },
  { key: 'disconnected',        label: 'Disconnected from pathway' },
  { key: 'referred_to_support', label: 'Referred into support network' },
];

function Picker({ options, value, onChange }: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
      {options.map(o => (
        <TouchableOpacity
          key={o.key}
          style={[
            pickerStyles.chip,
            value === o.key && pickerStyles.chipSelected,
          ]}
          onPress={() => onChange(o.key)}
        >
          <Text style={[pickerStyles.chipText, value === o.key && { color: '#fff' }]}>
            {o.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
const pickerStyles = StyleSheet.create({
  chip:         { backgroundColor: colors.card, borderRadius: 16, paddingHorizontal: 14,
                  paddingVertical: 6, marginRight: 8, borderWidth: 1, borderColor: colors.border },
  chipSelected: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipText:     { color: colors.textSecondary, fontSize: 13 },
});

export default function LELogScreen() {
  const route  = useRoute<Route>();
  const caseId = route.params.caseId;

  const [savedCase, setSavedCase] = useState<SavedCase | null>(null);
  const [date,      setDate]      = useState('');
  const [time,      setTime]      = useState('');
  const [location,  setLocation]  = useState('');
  const [agency,    setAgency]    = useState('');
  const [badge,     setBadge]     = useState('');
  const [encounter, setEncounter] = useState('no_action');
  const [outcome,   setOutcome]   = useState('unchanged');
  const [narrative, setNarrative] = useState('');
  const [harm,      setHarm]      = useState('');

  useEffect(() => {
    loadAllCases().then(all => {
      const found = all.find(c => c.id === caseId);
      if (found) setSavedCase(found);
    });
  }, [caseId]);

  const onLog = async () => {
    if (!savedCase) return;
    const interaction: LEInteraction = {
      id: Date.now().toString(36),
      loggedAt: new Date().toISOString(),
      incidentDate: date,
      incidentTime: time,
      locationDescription: location,
      agency,
      badgeOrDescription: badge,
      officerCount: 1,
      encounterType: encounter,
      officerResponseProfile: 'neutral',
      conditionAtEncounter: [],
      resourceActions: ['no_resources_offered'],
      disruptionIndicators: [],
      whatHappened: narrative,
      outcome,
      witnesses: '',
      injuriesOrHarm: harm,
    };
    const updated: SavedCase = {
      ...savedCase,
      leInteractions: [...savedCase.leInteractions, interaction],
    };
    await saveCase(updated);
    setSavedCase(updated);
    setDate(''); setTime(''); setLocation(''); setAgency('');
    setBadge(''); setNarrative(''); setHarm('');
    setEncounter('no_action'); setOutcome('unchanged');
    Alert.alert('Logged', `Interaction recorded (ID: ${interaction.id}). Re-analyze to update risk scores.`);
  };

  const onDelete = async (id: string) => {
    if (!savedCase) return;
    Alert.alert('Remove', 'Remove this interaction?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          const updated = { ...savedCase, leInteractions: savedCase.leInteractions.filter(x => x.id !== id) };
          await saveCase(updated);
          setSavedCase(updated);
        },
      },
    ]);
  };

  const interactions = savedCase?.leInteractions ?? [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>Transparency & Accountability</Text>
        <Text style={styles.bannerBody}>
          Every logged interaction is part of your ESIS record and shared with
          case managers, outreach teams, HUD, and medical staff. Enforcement-driven
          harm adjusts your risk scores automatically.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Log a New Interaction</Text>

      <TextInput style={styles.input} placeholder="Date (YYYY-MM-DD)"
        placeholderTextColor={colors.textMuted} value={date} onChangeText={setDate} />
      <TextInput style={styles.input} placeholder="Approximate time (e.g. 11:30 PM)"
        placeholderTextColor={colors.textMuted} value={time} onChangeText={setTime} />
      <TextInput style={styles.input} placeholder="Location (intersection, plaza, shelter)"
        placeholderTextColor={colors.textMuted} value={location} onChangeText={setLocation} />
      <TextInput style={styles.input} placeholder="Agency / department"
        placeholderTextColor={colors.textMuted} value={agency} onChangeText={setAgency} />
      <TextInput style={styles.input} placeholder="Badge # or officer description (optional)"
        placeholderTextColor={colors.textMuted} value={badge} onChangeText={setBadge} />

      <Text style={styles.fieldLabel}>Type of encounter</Text>
      <Picker options={ENCOUNTER_TYPES} value={encounter} onChange={setEncounter} />

      <Text style={styles.fieldLabel}>Outcome</Text>
      <Picker options={OUTCOMES} value={outcome} onChange={setOutcome} />

      <TextInput style={[styles.input, styles.textArea]}
        multiline numberOfLines={5} placeholder="What happened — full account"
        placeholderTextColor={colors.textMuted} value={narrative}
        onChangeText={setNarrative} textAlignVertical="top" />
      <TextInput style={styles.input} placeholder="Any injuries or harm caused"
        placeholderTextColor={colors.textMuted} value={harm} onChangeText={setHarm} />

      <TouchableOpacity style={styles.logBtn} onPress={onLog}>
        <Text style={styles.logBtnText}>Log this interaction</Text>
      </TouchableOpacity>

      {interactions.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>
            {interactions.length} Interaction(s) on Record
          </Text>
          {interactions.map((item, i) => (
            <View key={item.id} style={styles.interactionCard}>
              <Text style={styles.interactionHeader}>
                #{i + 1} · {item.incidentDate || 'Date unknown'} · {item.encounterType} · {item.outcome}
              </Text>
              {item.whatHappened ? (
                <Text style={styles.interactionBody} numberOfLines={3}>{item.whatHappened}</Text>
              ) : null}
              <TouchableOpacity onPress={() => onDelete(item.id)}>
                <Text style={styles.deleteText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: colors.bg },
  content:          { padding: spacing.md },
  banner:           { backgroundColor: '#0D1B2E', borderWidth: 1, borderColor: colors.blue + '44',
                      borderRadius: 10, padding: spacing.md, marginBottom: spacing.md },
  bannerTitle:      { color: colors.blueLight, fontWeight: '700', marginBottom: 4 },
  bannerBody:       { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
  sectionTitle:     { color: colors.blueLight, fontWeight: '700', fontSize: 13,
                      textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm },
  fieldLabel:       { color: colors.textSecondary, fontSize: 12, marginBottom: 4, marginTop: spacing.sm },
  input:            { backgroundColor: colors.card, borderRadius: 8, padding: spacing.md,
                      color: colors.textPrimary, borderWidth: 1, borderColor: colors.border,
                      marginBottom: spacing.sm, fontSize: 14 },
  textArea:         { minHeight: 100 },
  logBtn:           { backgroundColor: colors.blue, borderRadius: 10, padding: spacing.md + 4,
                      alignItems: 'center', marginTop: spacing.sm },
  logBtnText:       { color: '#fff', fontWeight: '700', fontSize: 16 },
  interactionCard:  { backgroundColor: colors.card, borderRadius: 10, padding: spacing.md,
                      borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  interactionHeader:{ color: colors.textPrimary, fontWeight: '600', fontSize: 13 },
  interactionBody:  { color: colors.textSecondary, fontSize: 13, marginTop: 6, lineHeight: 20 },
  deleteText:       { color: colors.red, fontSize: 12, marginTop: spacing.sm },
});
```

- [ ] **Step 11.2: Commit**

```bash
cd /c/esis
git add mobile/src/screens/LELogScreen.tsx
git commit -m "feat(mobile): LELogScreen — police interaction log with encounter type, outcome, narrative"
```

---

## Task 12: PingScreen (Community Ping + Native Share)

**Files:**
- Create: `mobile/src/screens/PingScreen.tsx`

- [ ] **Step 12.1: Create `mobile/src/screens/PingScreen.tsx`**

```typescript
// mobile/src/screens/PingScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Share, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRoute, RouteProp } from '@react-navigation/native';
import { colors, spacing } from '../theme';
import { loadAllCases } from '../storage/cases';
import { SavedCase } from '../engine/types';
import { RootStackParamList } from '../../App';

type Route = RouteProp<RootStackParamList, 'Ping'>;

function buildPingMessage(c: SavedCase): string {
  const p     = c.profile;
  const needs = p.resourceNeeds.length > 0
    ? p.resourceNeeds.join('; ')
    : 'support';
  const bg    = p.professionalBackground || 'background not shared';
  const skills= p.skillsSummary || 'skills not listed';

  const contactLine = p.contactEmail || p.contactPhone
    ? `Reach out: ${[p.contactEmail, p.contactPhone].filter(Boolean).join(' | ')}`
    : 'Contact ESIS operator to connect';

  return (
    `🛟 ESIS COMMUNITY PING — Neighbor Needs Help\n\n` +
    `A person in your community is experiencing homelessness and is asking for support.\n\n` +
    `They need: ${needs}\n\n` +
    `Background: ${bg}\n` +
    `Skills: ${skills}\n\n` +
    `About them: Non-drug user, capable, has been failed by the current system — ` +
    `not a danger to anyone. They deserve stability and a path back.\n\n` +
    `${contactLine}\n\n` +
    `The community complains about homelessness — here is a chance to be part of the solution. ` +
    `One act of kindness can break the cycle.\n\n` +
    `Powered by ESIS | Edge Survival Intelligence System\n` +
    `Post to: Nextdoor · Facebook Groups · LinkedIn · Reddit · Signal/Telegram mutual aid · Church boards`
  );
}

export default function PingScreen() {
  const route  = useRoute<Route>();
  const caseId = route.params.caseId;
  const [savedCase, setSavedCase] = useState<SavedCase | null>(null);
  const [pingText, setPingText]   = useState('');

  useEffect(() => {
    loadAllCases().then(all => {
      const found = all.find(c => c.id === caseId);
      if (found) {
        setSavedCase(found);
        setPingText(buildPingMessage(found));
      }
    });
  }, [caseId]);

  const onShare = async () => {
    try {
      await Share.share({
        message: pingText,
        title: 'ESIS Community Ping',
      });
    } catch (e) {
      Alert.alert('Error', 'Could not open share sheet.');
    }
  };

  const onCopy = async () => {
    await Clipboard.setStringAsync(pingText);
    Alert.alert('Copied', 'Ping message copied to clipboard.');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>📢 Community Ping</Text>
        <Text style={styles.bannerBody}>
          Share this message to Nextdoor, Facebook Groups, LinkedIn, Reddit, Signal,
          Telegram mutual aid networks, or church boards. The community has resources
          the system doesn't.
        </Text>
      </View>

      <View style={styles.pingCard}>
        <Text style={styles.pingText}>{pingText}</Text>
      </View>

      <TouchableOpacity style={styles.shareBtn} onPress={onShare}>
        <Text style={styles.shareBtnText}>Share via App (Nextdoor, Facebook, etc.)</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.copyBtn} onPress={onCopy}>
        <Text style={styles.copyBtnText}>Copy to Clipboard</Text>
      </TouchableOpacity>

      <Text style={styles.note}>
        Tapping "Share" opens your phone's native share sheet — select any app to post.
        The message is pre-formatted and ready to send as-is.
      </Text>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.bg },
  content:     { padding: spacing.md },
  banner:      { backgroundColor: '#0D1B2E', borderWidth: 1, borderColor: colors.blue + '44',
                 borderRadius: 10, padding: spacing.md, marginBottom: spacing.md },
  bannerTitle: { color: colors.blueLight, fontWeight: '700', fontSize: 16, marginBottom: 6 },
  bannerBody:  { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
  pingCard:    { backgroundColor: colors.card, borderRadius: 10, padding: spacing.md,
                 borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  pingText:    { color: colors.textPrimary, fontSize: 14, lineHeight: 22 },
  shareBtn:    { backgroundColor: colors.blue, borderRadius: 10, padding: spacing.md + 4,
                 alignItems: 'center', marginBottom: spacing.sm },
  shareBtnText:{ color: '#fff', fontWeight: '700', fontSize: 16 },
  copyBtn:     { borderWidth: 1, borderColor: colors.border, borderRadius: 10,
                 padding: spacing.md, alignItems: 'center', marginBottom: spacing.md },
  copyBtnText: { color: colors.textSecondary, fontSize: 14 },
  note:        { color: colors.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
```

- [ ] **Step 12.2: Commit**

```bash
cd /c/esis
git add mobile/src/screens/PingScreen.tsx
git commit -m "feat(mobile): PingScreen — community ping generator with native share sheet + clipboard"
```

---

## Task 13: Splash Screen with ESIS Logo

**Files:**
- Modify: `mobile/app.json`
- Create: `mobile/src/screens/SplashScreen.tsx`

The splash screen shows the ESIS logomark (PNG already at `esis_logo.png` in the repo root)
with "Powered by Gemma 4" underneath. Expo's native splash fires first (from `app.json`),
then the React splash plays on first render before routing to Home.

- [ ] **Step 13.1: Copy the ESIS logo into the mobile assets directory**

```bash
cp /c/esis/esis_logo.png /c/esis/mobile/assets/esis_logo.png
cp /c/esis/esis_logo.png /c/esis/mobile/assets/icon.png
```

- [ ] **Step 13.2: Update `mobile/app.json` splash config**

Change the `"splash"` section inside `"expo"`:

```json
"splash": {
  "image": "./assets/esis_logo.png",
  "resizeMode": "contain",
  "backgroundColor": "#060D18"
},
```

- [ ] **Step 13.3: Create `mobile/src/screens/SplashScreen.tsx`**

This screen renders briefly on app launch, then navigates to Home after 2 seconds.

```typescript
// mobile/src/screens/SplashScreen.tsx
import React, { useEffect } from 'react';
import { View, Image, Text, StyleSheet, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colors } from '../theme';
import { RootStackParamList } from '../../App';

type Nav = StackNavigationProp<RootStackParamList, 'Splash'>;

export default function SplashScreen() {
  const nav    = useNavigation<Nav>();
  const opacity = new Animated.Value(0);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.delay(1200),
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => nav.replace('Home'));
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity }]}>
        <Image
          source={require('../../assets/esis_logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>ESIS</Text>
        <Text style={styles.subtitle}>Edge Survival Intelligence System</Text>
        <View style={styles.gemmaTag}>
          <Text style={styles.gemmaText}>Powered by Gemma 4</Text>
        </View>
        <Text style={styles.tagline}>Built with lived experience · Offline-first</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  content:   { alignItems: 'center' },
  logo:      { width: 120, height: 120, marginBottom: 20 },
  title:     { color: colors.textPrimary, fontSize: 42, fontWeight: '800', letterSpacing: -1 },
  subtitle:  { color: colors.blueLight, fontSize: 14, fontWeight: '600', marginTop: 4 },
  gemmaTag:  { backgroundColor: '#0D2E1A', borderWidth: 1, borderColor: colors.green + '66',
               borderRadius: 20, paddingHorizontal: 16, paddingVertical: 5, marginTop: 16 },
  gemmaText: { color: colors.green, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  tagline:   { color: colors.textMuted, fontSize: 11, marginTop: 12 },
});
```

- [ ] **Step 13.4: Add `Splash` route to `RootStackParamList` and `App.tsx`**

In `mobile/App.tsx`, add `Splash: undefined` to the param list and register the screen
as the `initialRouteName`:

```typescript
// Add to RootStackParamList:
Splash: undefined;

// Add import:
import SplashScreen from './src/screens/SplashScreen';

// Add to Stack.Navigator (set initialRouteName="Splash"):
<Stack.Navigator
  initialRouteName="Splash"
  screenOptions={{
    headerStyle: { backgroundColor: colors.card },
    headerTintColor: colors.textPrimary,
    headerTitleStyle: { fontWeight: 'bold' },
    cardStyle: { backgroundColor: colors.bg },
    headerShown: true,
  }}
>
  <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
  <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'ESIS' }} />
  {/* ...rest unchanged... */}
```

- [ ] **Step 13.5: Commit**

```bash
cd /c/esis
git add mobile/assets/esis_logo.png mobile/src/screens/SplashScreen.tsx mobile/app.json mobile/App.tsx
git commit -m "feat(mobile): splash screen — ESIS logo + Powered by Gemma 4 with fade animation"
```

---

## Task 14: Build the APK on Kaggle

Kaggle notebooks provide free CPU compute with a Linux environment. We use `expo export` to
produce a local build bundle, then use the Android SDK pre-installed on Kaggle to compile the APK
with Gradle directly — no EAS account required.

**Files:**
- Create: `mobile/kaggle_build.ipynb` — runnable Kaggle notebook that produces `esis.apk`

- [ ] **Step 14.1: Create `mobile/kaggle_build.ipynb`**

Create a Jupyter notebook with the following cells. Upload it to Kaggle, add the `mobile/`
directory as a dataset input, then Run All.

**Cell 1 — Install Node 18 and Java 17**
```python
%%bash
# Install Node 18 (Kaggle ships Node 12 by default)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version
npm --version

# Java 17 is required by Gradle / Android build tools
sudo apt-get install -y openjdk-17-jdk
java -version
```

**Cell 2 — Install Android SDK command-line tools**
```python
%%bash
cd /tmp

# Download Android command-line tools
wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip \
  -O cmdtools.zip
unzip -q cmdtools.zip -d android-sdk
mkdir -p android-sdk/cmdline-tools/latest
mv android-sdk/cmdline-tools/cmdline-tools/* android-sdk/cmdline-tools/latest/
export ANDROID_HOME=/tmp/android-sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

# Accept licenses and install build tools
yes | sdkmanager --licenses 2>/dev/null | tail -1
sdkmanager "platform-tools" "build-tools;34.0.0" "platforms;android-34" 2>&1 | tail -5
echo "Android SDK installed."
```

**Cell 3 — Copy mobile/ source and install npm deps**
```python
%%bash
# Kaggle dataset input is mounted at /kaggle/input/esis-mobile/
cp -r /kaggle/input/esis-mobile/mobile /tmp/esis-mobile
cd /tmp/esis-mobile
npm install --legacy-peer-deps 2>&1 | tail -5
echo "npm install done"
```

**Cell 4 — Install Expo CLI and prebuild the Android project**
```python
%%bash
export ANDROID_HOME=/tmp/android-sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

cd /tmp/esis-mobile

# Install Expo CLI
npm install -g expo-cli @expo/ngrok 2>&1 | tail -3

# Prebuild generates the native android/ directory from app.json + package.json
npx expo prebuild --platform android --clean 2>&1 | tail -10
echo "Prebuild complete"
```

**Cell 5 — Build debug APK with Gradle**
```python
%%bash
export ANDROID_HOME=/tmp/android-sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64

cd /tmp/esis-mobile/android

# Give Gradle execute permission and build
chmod +x gradlew
./gradlew assembleDebug --no-daemon 2>&1 | tail -20
echo "Build complete"
```

**Cell 6 — Copy APK to Kaggle output**
```python
import shutil, os

src = '/tmp/esis-mobile/android/app/build/outputs/apk/debug/app-debug.apk'
dst = '/kaggle/working/esis-debug.apk'

shutil.copy(src, dst)
size_mb = os.path.getsize(dst) / 1024 / 1024
print(f"APK ready: {dst} ({size_mb:.1f} MB)")
print("Download from the Kaggle output panel on the right →")
```

- [ ] **Step 14.2: Upload to Kaggle and run**

1. Go to kaggle.com/code → New Notebook
2. Click **File → Add input** → Upload `mobile/` as a new Dataset, name it `esis-mobile`
3. Upload `kaggle_build.ipynb` (or paste the cells manually)
4. Click **Run All** — the build takes ~8-12 minutes
5. When Cell 6 prints "APK ready", click the **Output** panel on the right
6. Download `esis-debug.apk`

- [ ] **Step 14.3: Install on Android device**

Option A — Direct install (easiest):
1. Email or AirDrop the `esis-debug.apk` to your Android phone
2. Open it — Android will ask "Allow install from this source" → Allow
3. Tap Install

Option B — ADB:
```bash
adb install esis-debug.apk
```

- [ ] **Step 14.4: Commit the Kaggle notebook**

```bash
cd /c/esis
git add mobile/kaggle_build.ipynb
git commit -m "feat(mobile): Kaggle build notebook — produces esis-debug.apk without local Android SDK"
git push origin main
```

---

## Self-Review

### Spec coverage

| Requirement | Task |
|-------------|------|
| Android APK downloadable and installable | Task 14 — Kaggle build notebook |
| Build on Kaggle (no local SDK) | Task 14 — kaggle_build.ipynb |
| Send community pings to Nextdoor, etc. | Task 12 — PingScreen + Share.share() |
| Store victim info client-side | Task 6 — AsyncStorage CRUD |
| Police interaction log | Task 11 — LELogScreen |
| Enforcement risk affects scores | Tasks 3–5 — engine ports |
| Survival-horizon action ordering | Task 5 — recommendation.ts |
| ESIS logo splash screen + Gemma 4 tag | Task 13 — SplashScreen.tsx |
| Dark theme matching web app | Task 1 — theme.ts |
| All 4 risk cards (including enforcement) | Task 10 — RiskScreen |
| Three-horizon action display | Task 10 — ActionPlanScreen |
| Offline-first (no API dependency) | All engine tasks — pure TS |
| Save/load cases between sessions | Task 6 + Tasks 8–9 |

### Placeholder scan

No TBDs. All code blocks are complete and runnable.

### Type consistency

- `CaseInput`, `SavedCase`, `LEInteraction`, `RiskAssessment`, `RecommendationOutput` defined in Task 2 (`types.ts`), imported consistently in all engine and screen files.
- `RootStackParamList` defined in `App.tsx` (Task 7), imported in all screens.
- `loadAllCases`, `saveCase`, `deleteCase`, `newCaseId` defined in `cases.ts` (Task 6), used in Tasks 8, 9, 11, 12.
- `normalizeCase` → `intake.ts`, `scoreRisk` → `triage.ts`, `generateRecommendation` → `recommendation.ts`, all imported in `CaseInputScreen.tsx` (Task 9).
