# ESIS Mobile V1 — Design Spec

**Status:** Approved for implementation  
**Build target:** Hackathon submission APK  
**Plan:** `docs/superpowers/plans/2026-04-07-esis-mobile-apk.md`

---

## What This Is

A direct port of the existing ESIS localhost Streamlit app to a React Native (Expo) Android APK. Same logic. Same screens. Same outputs. Deployable, installable, offline-first.

This is not a new product — it is the same product running on-device instead of a browser.

---

## Technology

| Choice | Rationale |
|--------|-----------|
| React Native + Expo SDK 51 | Fastest path to APK, zero local Android SDK required |
| TypeScript | Direct port of Python ESIS services — same logic, different syntax |
| AsyncStorage | Local case persistence — survives app restarts |
| EAS Build (cloud) | Primary APK build — 12 min, produces shareable download URL |
| Kaggle notebook | Backup build path + demo talking point |

---

## Scope — Locked

Exactly what the existing plan specifies. No additions.

**6 screens:**
1. **Splash** — ESIS logomark + "Powered by Gemma 4" fade-in → Home
2. **Home** — Saved case list with priority badges (HIGH/MEDIUM/LOW)
3. **Case Input** — All checkboxes, text description, enforcement section, profile fields
4. **Risk Assessment** — 4 risk cards: Medical / Exposure / Documentation / 🚔 Enforcement
5. **Action Plan** — 3-horizon display (🔴 Do Now / 🟡 24h / 🟢 Recovery) or flat list
6. **Police Interaction Log** — Encounter type, outcome, narrative, stored per case
7. **Community Ping** — Auto-generated message + native Android share sheet

**On-device engine (TypeScript ports):**
- `intake.ts` — domain detection, keyword matching, enforcement flags
- `triage.ts` — all 4 risk dimensions including enforcement scoring
- `recommendation.ts` — survival-horizon logic, acute state detection

**Storage:** AsyncStorage — cases saved locally, LE interactions embedded in case object

**Build:** `eas build --platform android --profile preview` → `.apk` download URL

---

## What Is Explicitly Out of Scope for V1

- Peer-to-peer mesh / Bluetooth relay
- HUD / coordinated entry API integration
- Background services / WorkManager
- Push notifications
- Map rendering (offline resource list replaces map)
- Gemma AI inference (deterministic engine only)
- Case manager sync portal
- Animations beyond splash fade

---

## Screen Flow

```
Splash (2s) → Home → Case Input → Risk Assessment → Action Plan
                                                   ↓
                                          Police Interaction Log
                                          Community Ping
```

---

## Data Model

Each saved case is a `SavedCase` JSON object in AsyncStorage:

```
SavedCase {
  id, name, savedAt
  input: CaseInput          (all checkboxes + enforcement flags)
  profile: PersonProfile    (disability, contact info, skills)
  risk: RiskAssessment      (4 scores + priority + escalation flag)
  recommendation: RecommendationOutput  (3 horizons + fallback)
  leInteractions: LEInteraction[]
}
```

Stored under key `esis_saved_cases` as a JSON array. No encryption in V1.

---

## Build Path

**Primary (EAS Build):**
```bash
cd mobile
npm install
eas build --platform android --profile preview
# → APK download URL printed when complete (~12 min)
```

**Backup (Kaggle):**
Run `mobile/kaggle_build.ipynb` → download `esis-debug.apk` from Output panel.

---

## Success Criteria

- [ ] APK installs on Android without error
- [ ] Case can be created, analyzed, and saved without internet connection
- [ ] Risk assessment shows all 4 risk cards including enforcement
- [ ] Acute case (exposure ≥ 0.85 or enforcement + displacement) shows 3-horizon plan
- [ ] Police interaction can be logged and persists across app restarts
- [ ] Community ping opens Android share sheet
- [ ] Splash screen shows ESIS logo + "Powered by Gemma 4"
- [ ] EAS Build URL is shareable as APK download link
