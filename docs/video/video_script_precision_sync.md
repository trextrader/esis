# ESIS VIDEO — PRECISION SYNC MAP

## Format
| Column | Content |
|--------|---------|
| Timestamp | When it happens |
| Visual | What's on screen |
| Voice | Exact line spoken |
| Direction | Pause / emphasis / motion |

---

## 🟦 SCENE 1 — HOOK (0:00–0:20)

**Visual:** Scenario Panel (`esis_scenario_panel_v2.png`)

| Time | Visual | Voice | Direction |
|------|--------|-------|-----------|
| 0:00–0:04 | Black → fade in | "In 2025, I was discharged from a hospital…" | Slow fade |
| 0:04–0:08 | Scenario panel fully visible | "…after cardiac arrest and a spinal infection — back into homelessness." | Hold |
| 0:08–0:11 | Very slow zoom toward center panel | "I'm a physicist and software engineer." | Zoom in slowly |
| 0:11–0:14 | Continue zoom | "And I could not navigate the system." | Hold |
| — | — | *(pause 0.5s)* | — |
| 0:14–0:17 | — | "That's when it became clear:" | — |
| 0:17–0:20 | — | "The problem isn't resources. It's decision architecture." | **Emphasize "architecture"** |

🎯 **Cut immediately on "architecture"**

---

## 🟧 SCENE 2 — DECISION MODEL (0:20–0:50)

**Visual:** Decision Loop Diagram (`esis_decision_loop.png`)

| Time | Visual | Voice | Direction |
|------|--------|-------|-----------|
| 0:20–0:24 | Hard cut to Decision Loop | "ESIS is a real-time decision system — not a chatbot." | Cursor circle around loop |
| 0:24–0:30 | — | "It models crisis situations as a partially observable system…" | — |
| 0:30–0:36 | Slow pan across diagram nodes | "…where health, exposure, documents, and resources are uncertain and constantly changing." | Pan slowly |
| 0:36–0:42 | — | "ESIS maintains a belief over that state…" | — |
| 0:42–0:46 | — | "…and rejects any plan where the probability of severe harm exceeds a threshold." | — |
| 0:46–0:50 | — | "We optimize for worst-case outcomes… because the tail risk is what kills people." | **Emphasize "kills people"** |

🎯 **Cut immediately after "kills people"**

---

## 🟩 SCENE 3 — ARCHITECTURE (0:50–1:20)

**Visual:** Architecture Diagram (`esis_detail_final.png` or `esis_detail_hires.png`)

| Time | Visual | Voice | Direction |
|------|--------|-------|-----------|
| 0:50–0:55 | Cut to Architecture Diagram | "The system is structured in layers." | — |
| 0:55–1:00 | Highlight top layer | "Field inputs feed into a local Gemma 4 intelligence layer…" | Mouse highlight top |
| 1:00–1:05 | — | "Running fully on-device, with zero cloud dependency." | — |
| 1:05–1:10 | Zoom slightly into Gemma box | "Gemma generates structured decisions — not free-form text." | Slow zoom |
| 1:10–1:15 | — | "Below that is the mathematical decision core…" | — |
| 1:15–1:20 | — | "Monte Carlo simulation, risk optimization, and plan selection." | — |

🎯 **Clean cut**

---

## 🟨 SCENE 4 — IMPLEMENTATION (1:20–2:05)

**Visual:** GitHub repo → scroll to `/app/services` → open triage file → YAML

| Time | Visual | Voice | Direction |
|------|--------|-------|-----------|
| 1:20–1:25 | GitHub repo top | "The implementation is modular and fully auditable." | Start slow scroll |
| 1:25–1:35 | Scroll to `/app/services` | "The system separates intake, scoring, decision generation, routing, and audit tracking." | Scroll |
| 1:35–1:45 | Briefly open triage file | "Triage is deterministic in version one — with independent risk models…" | Click open |
| 1:45–1:55 | Triage file visible | "…for medical instability, exposure risk, and documentation failure." | Hold |
| 1:55–2:05 | Scroll YAML briefly | "The policy layer is fully declarative — transparent, modifiable, and safe to govern." | Slow scroll |

🎯 **Cut**

---

## 🟥 SCENE 5 — RESULTS (2:05–2:30)

**Visual:** Evaluation Table (`evaltable.py` output) + Time-to-Safety Chart (`esis_time_to_safety_chart.png`)

| Time | Visual | Voice | Direction |
|------|--------|-------|-----------|
| 2:05–2:10 | Evaluation table | "ESIS reduces time-to-safety from days… to minutes." | — |
| 2:10–2:18 | Time-to-housing chart | "Housing pathways shift from months… to same-day activation." | — |
| 2:18–2:24 | — | "And decisions become consistent — not dependent on who answers the phone." | — |
| 2:24–2:30 | — | "It operates fully offline. No connectivity required." | — |

🎯 **Cut**

---

## 🟪 SCENE 6 — CLOSE (2:30–3:00)

**Visual:** Impact Summary Panel (`esis_impact_summary_panel.png`) → hold → ESIS logo

| Time | Visual | Voice | Direction |
|------|--------|-------|-----------|
| 2:30–2:36 | Impact panel | "ESIS is a safety-critical decision system — not a chatbot." | — |
| 2:36–2:42 | — | "It makes structured, risk-aware decisions under uncertainty." | — |
| 2:42–2:48 | — | "It operates offline. It preserves privacy." | — |
| 2:48–2:55 | — | "Reduce the time between crisis and safety — to as close to zero as possible." | **Slow, final emphasis** |
| 2:55–3:00 | ESIS logo fade in | "The system is real. The need is real. And it's ready." | Hold 1s → END |

---

## 🏁 EXECUTION NOTES

### Camera / Screen Behavior
- No fast movements
- Only: slow zoom · slight pan · controlled scroll

### Cuts
- Hard cuts (no transitions)
- Always cut on strong words

### Audio
- Slight pause between sections
- Never overlap speech with cuts

---

## 🧠 Judge Psychology
| Scene | Purpose |
|-------|---------|
| 1 | Emotional anchor |
| 2–3 | Technical credibility |
| 4 | Real implementation proof |
| 5 | Measurable impact |
| 6 | Memorable close |
