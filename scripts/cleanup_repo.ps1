# scripts/cleanup_repo.ps1
# Run from C:/esis — organizes root-level files into proper folders

Set-Location C:/esis

# Create missing directories
New-Item -ItemType Directory -Force -Path docs/diagrams | Out-Null
New-Item -ItemType Directory -Force -Path docs/writeup  | Out-Null

# ── PNGs → docs/figures/ ─────────────────────────────────────
git mv esis_3d_risk_surface.png              docs/figures/
git mv esis_banner_560x280_full.png          docs/figures/
git mv esis_chance_constraint_feasibility.png docs/figures/
git mv esis_decision_loop.png                docs/figures/
git mv esis_impact_summary_panel.png         docs/figures/
git mv esis_math_framework_full.png          docs/figures/
git mv esis_risk_distribution_shift.png      docs/figures/
git mv esis_scenario_panel_v2.png            docs/figures/
git mv esis_time_to_housing_pathway_chart.png docs/figures/
git mv esis_time_to_safety_chart.png         docs/figures/
git mv esisdiagram.png                       docs/figures/
git mv "ESIS logo.png"                       docs/figures/

# diagrams/ PNGs → docs/figures/
git mv diagrams/esis_detail_final.png        docs/figures/
git mv diagrams/esis_detail_hires.png        docs/figures/
git mv diagrams/esis_operational_600dpi.png  docs/figures/

# ── .dot files → docs/diagrams/ ──────────────────────────────
git mv esisdiagram.dot                       docs/diagrams/
git mv esisdiagram_linebyline_curved.dot     docs/diagrams/
git mv esisdiagram_patched.dot               docs/diagrams/
git mv diagrams/esis_detail_final.dot        docs/diagrams/
git mv diagrams/esis_detail_final_v2.dot     docs/diagrams/
git mv diagrams/esis_detail_final_v3.dot     docs/diagrams/
git mv diagrams/esis_operational_final.dot   docs/diagrams/

# ── Python visual scripts → scripts/visuals/ ─────────────────
git mv chanceconstrainedfeasibility.py       scripts/visuals/
git mv esis_3d_risk_surface.py               scripts/visuals/
git mv esis_decision_loop.py                 scripts/visuals/
git mv esis_impact_summary_panel.py          scripts/visuals/
git mv esis_math_framework_full.py           scripts/visuals/
git mv esis_risk_distribution_shift.py       scripts/visuals/
git mv esis_scenario_panel_v2.py             scripts/visuals/
git mv evaltable.py                          scripts/visuals/
git mv resize.py                             scripts/visuals/
git mv scenariocompare.py                    scripts/visuals/
git mv timetosafety.py                       scripts/visuals/

# ── Documents → docs/writeup/ ────────────────────────────────
git mv "1 - ESIS - Edge Survival Intelligence System.docx"                      docs/writeup/
git mv "1 - ESIS - Edge Survival Intelligence System.pdf"                       docs/writeup/
git mv "2 - ESIS Research Proposal Deep Analysis and Enhancement Report.docx"   docs/writeup/
git mv "2 - ESIS Research Proposal Deep Analysis and Enhancement Report.pdf"    docs/writeup/
git mv "ESIS Opening Statement.docx"                                            docs/writeup/
git mv "ESIS Opening Statement.pdf"                                             docs/writeup/
git mv "What complelled me to start this project.docx"                         docs/writeup/

# ── Commit and push ───────────────────────────────────────────
git commit -m "chore: organize repo — visuals to docs/figures, diagrams to docs/diagrams, scripts to scripts/visuals, docs to docs/writeup"
git push
