# ESIS — Mobile User Manual

**Edge Survival Intelligence System** · Gemma 4 · Android App

---

## Requirements

- Android phone or tablet
- **Settings → Apps → Install unknown apps** enabled for your browser or Files app
- A Kaggle account (for the Kaggle build path)
- A free HuggingFace account and API token (`hf_...`) — [get one here](https://huggingface.co/settings/tokens)

---

## Quick Start — Build via Kaggle (15 min)

> Builds the APK directly in a Kaggle notebook. No local tools required.

### 1. Open the Kaggle notebook

https://www.kaggle.com/code/zapperman/esis-gemma4-mobile-app-demo

### 2. Run All

Click **Run All** in the notebook toolbar. The build takes approximately 10–15 minutes.

Cells complete in this order:
| Cell | What it does | Expected output |
|---|---|---|
| 1 | Installs Node 20 + Java 17 | `v20.x.x` / `openjdk 17` |
| 2 | Installs Android SDK | `Android SDK ready.` |
| 3 | Clones repo + npm install | `npm install done` |
| 4 | TypeScript check | `TypeScript check complete (exit 0)` |
| 5 | Expo prebuild | `Prebuild complete` |
| 6 | Gradle build | `BUILD SUCCESSFUL` |
| 7 | Copies APK to output | `APK ready: ... (142.5 MB)` |

### 3. Download the APK

When Cell 7 completes, the APK appears in the **Output** panel on the right side of the notebook. Click the download icon next to `esis-v2-debug.apk`.

Alternatively, use the Kaggle API:
```bash
kaggle kernels output <your-notebook-slug> -p ./
```

### 4. Install on Android

1. Transfer the APK to your phone (email, USB, or Google Drive)
2. Open the file on your phone
3. If prompted, enable **Install unknown apps** for your file manager or browser
4. Tap **Install**

---

## Fallback — Direct APK Download (2 min)

> Pre-built APK hosted on Expo. No Kaggle account needed.

1. Open this URL **on your Android phone**:
   ```
   https://expo.dev/artifacts/eas/joTp1Suad8RXoqf8MikY8Y.apk
   ```
2. The APK downloads automatically
3. Open the downloaded file and tap **Install**
4. If prompted, enable **Install unknown apps** for your browser

---

## First Launch — Token Setup

On first open, ESIS shows the **Token Setup** screen:

1. Go to [https://huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. Create a token with **Read** permission
3. Copy the token (starts with `hf_`)
4. Paste it into the token field on the setup screen
5. Tap **Verify & Continue**

> Your token is stored only on your device in encrypted local storage. You only need to do this once.

To update your token later: **Settings → API Token → Change Token**

---

## Troubleshooting

**Kaggle Cell 6 fails with Gradle error**
Re-run from Cell 3. The `/tmp/` directory from a previous session may still exist — Cell 3 clears it automatically on re-run.

**"Install unknown apps" option not visible**
Go to **Settings → Apps → Special app access → Install unknown apps** and enable it for your browser or file manager.

**APK installs but app crashes on launch**
You may be on Android 6 or below. ESIS requires **Android 8.0 (API 26)** or higher.

**Token rejected on first launch**
Make sure the token starts with `hf_` and has **Read** permission. Tokens with no permissions or Write-only tokens will be rejected.
