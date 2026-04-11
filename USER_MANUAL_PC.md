# ESIS — PC Desktop User Manual

**Edge Survival Intelligence System** · Gemma 4 · Crisis Navigation for People Experiencing Homelessness

---

## Requirements

- Python 3.11+
- pip
- A free HuggingFace account and API token (`hf_...`) — [get one here](https://huggingface.co/settings/tokens)

---

## Quick Start — HuggingFace Spaces (2 min)

> No installation required. Runs entirely in the browser.

1. Open the live demo: https://huggingface.co/spaces/trextrader/esis-demo
2. In the left sidebar, locate the **HF_TOKEN** field
3. Paste your HuggingFace token (`hf_...`)
4. The app loads with **Gemma 4 · Live inference** shown in the status bar
5. Select a demo case from the dropdown to see a full run

---

## Full Install — Run Locally (10 min)

### 1. Clone the repo

```bash
git clone https://github.com/trextrader/esis.git
cd esis
```

### 2. Create a virtual environment (recommended)

```bash
python -m venv venv
# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

> Note: `torch` is included and may take a few minutes to download on first install.

### 4. Set your HuggingFace token

Create a `.env` file in the repo root:

```
HF_TOKEN=hf_your_token_here
```

Or set it as an environment variable:

```bash
# Windows
set HF_TOKEN=hf_your_token_here

# macOS / Linux
export HF_TOKEN=hf_your_token_here
```

### 5. Launch the app

```bash
streamlit run app/ui/streamlit_app.py
```

### 6. Open in browser

```
http://localhost:8501
```

The status bar at the top will show **Gemma 4 · Live inference** when the token is active.

---

## API Token Setup

| Where to get it | [https://huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) |
|---|---|
| Token type | Read permission |
| Format | Starts with `hf_` |
| Where to set it (local) | `.env` file or environment variable `HF_TOKEN` |
| Where to set it (HuggingFace Spaces) | Left sidebar token field |

> Without a token the app runs in **Deterministic fallback** mode — all features work except live Gemma 4 inference.

---

## Troubleshooting

**`ModuleNotFoundError` on launch**
Run `pip install -r requirements.txt` again. Make sure your virtual environment is activated.

**Status bar shows "Deterministic fallback · Add HF_TOKEN for AI"**
Your token is missing or not loaded. Check the `.env` file is in the repo root and contains `HF_TOKEN=hf_...`.

**`torch` install hangs or fails**
Install PyTorch separately first: `pip install torch --index-url https://download.pytorch.org/whl/cpu` then re-run `pip install -r requirements.txt`.

**Port 8501 already in use**
Run on a different port: `streamlit run app/ui/streamlit_app.py --server.port 8502`
