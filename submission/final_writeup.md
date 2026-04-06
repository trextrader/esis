# ESIS — Final Hackathon Write-up

*Gemma 4 Good Hackathon | Google/Kaggle | May 2026*

## Project Description

ESIS (Edge Survival Intelligence System) is an offline-first, risk-constrained decision support system for people experiencing homelessness. Built on Gemma 4, it converts fragmented crisis inputs into structured intervention pathways, advocacy packets, and explainable audit trails.

## How Gemma 4 Is Used

Gemma 4 serves as the reasoning layer. After the deterministic triage engine scores risk across three domains (medical, exposure, documentation), the structured case is passed to Gemma 4 with a constrained prompt template. The model is required to respond in a strict JSON schema containing:

- A 2-3 sentence situation summary
- Three specific, prioritized actions
- A fallback plan for when primary options fail
- A list of documents and information to preserve

Gemma 4's on-device capability is central to the system architecture — ESIS is designed to run offline, where cloud AI fails.

## Architecture

See `README.md` and `docs/figures/esisdiagram.png` for full architecture.

## Reproducibility

```bash
git clone https://github.com/YOUR_USERNAME/esis
cd esis
pip install -r requirements.txt
streamlit run app/ui/streamlit_app.py
```

Gemma 4 notebook: see `notebooks/esis_gemma4_demo.ipynb` (Kaggle)

## Impact

- Reduces time-to-safety from 24-72+ hours to minutes-hours
- Addresses three proven lethal failure modes in the homelessness system
- Built by someone with direct lived experience of the problem
