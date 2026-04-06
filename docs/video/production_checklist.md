# ESIS Video — Production Checklist

## Assets: Ready vs. Needs Capture

| Scene | Asset needed | Status | File / Source |
|-------|-------------|--------|---------------|
| 1 | Scenario panel | ✅ Ready | `docs/figures/esis_scenario_panel_v2.png` |
| 2 | Decision loop diagram | ✅ Ready | `docs/figures/esis_decision_loop.png` |
| 3 | Architecture diagram (hi-res) | ✅ Ready | `docs/figures/esis_detail_hires.png` |
| 4 | GitHub repo + file browser | 📹 Screen capture | github.com/trextrader/esis |
| 4 | Triage service code | 📹 Screen capture | `app/services/triage_service.py` |
| 4 | Policy YAML | 📹 Screen capture | `models/policies/escalation_rules.yaml` |
| 5 | Evaluation table | ✅ Ready | Run `scripts/visuals/evaltable.py` |
| 5 | Time-to-safety chart | ✅ Ready | `docs/figures/esis_time_to_safety_chart.png` |
| 6 | Impact summary panel | ✅ Ready | `docs/figures/esis_impact_summary_panel.png` |
| 6 | ESIS logo (fade-out) | ✅ Ready | `esis_logo.png` |

## Recording Order (most efficient)

1. **Record voice first** — read full script in one take, then cut
2. **Screen captures (static)** — open each image full-screen, record 8–10s hold per image
3. **Screen capture (GitHub)** — browser at 1920×1080, zoom 110%, dark mode if possible
   - Show repo root (1:20–1:25)
   - Click into `app/services/` (1:25–1:35)
   - Open `triage_service.py` (1:35–1:55)
   - Open `models/policies/escalation_rules.yaml` (1:55–2:05)
4. **Edit** — sync voice to visuals using the timestamp map

## Recommended Tools

| Task | Free option | Pro option |
|------|-------------|------------|
| Screen recording | OBS Studio | Camtasia |
| Voice recording | Audacity | Adobe Audition |
| Editing / sync | DaVinci Resolve (free) | Premiere Pro |
| Final export | DaVinci Resolve | Premiere Pro |

## Export Settings
- Resolution: 1920×1080
- Frame rate: 30fps
- Format: MP4 H.264
- Target length: 2:55–3:00
- Upload: YouTube (unlisted → paste link in Kaggle submission)

## GitHub Scene Prep (do before recording)

```
1. Open github.com/trextrader/esis in Chrome
2. Set zoom to 110% (Ctrl++)
3. Enable dark mode (GitHub Settings → Appearance → Dark)
4. Pre-navigate to app/services/ — leave tab ready
5. Have triage_service.py and escalation_rules.yaml open in separate tabs
```

## Voice Delivery Tips
- Record in a quiet room, mic 6–8 inches from face
- Speak at 85% of natural pace — slightly slower reads better on video
- The 0.5s pause at 0:11–0:14 is critical — let it breathe
- "kills people" (0:46–0:50): drop volume slightly, don't shout it
- "as close to zero as possible" (2:48–2:55): slowest delivery of the video
