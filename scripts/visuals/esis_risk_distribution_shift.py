import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patheffects as pe

# =========================================
# STYLE
# =========================================
BG = "#08111F"
FG = "#F8FAFC"
SUB = "#CBD5E1"
MUTED = "#94A3B8"
GRID = "#334155"

TRAD = "#FB923C"
ESIS = "#2DD4BF"
WHITE = "#E5E7EB"
RED = "#F87171"

# =========================================
# PDF HELPERS
# =========================================
def gaussian(x, mu, sigma):
    return (1.0 / (sigma * np.sqrt(2 * np.pi))) * np.exp(-0.5 * ((x - mu) / sigma) ** 2)

def build_risk_distribution(output_path="esis_risk_distribution_shift.png"):
    x = np.linspace(0, 100, 1200)

    # Traditional: broader distribution with heavier catastrophic tail
    trad_main = 0.78 * gaussian(x, 38, 13)
    trad_tail = 0.22 * gaussian(x, 76, 12)
    y_trad = trad_main + trad_tail

    # ESIS: compressed, left-shifted, thinner tail
    esis_main = 0.92 * gaussian(x, 25, 8.5)
    esis_tail = 0.08 * gaussian(x, 52, 8)
    y_esis = esis_main + esis_tail

    threshold = 68
    trad_tail_area = np.where(x >= threshold, y_trad, 0.0)
    esis_tail_area = np.where(x >= threshold, y_esis, 0.0)

    fig, ax = plt.subplots(figsize=(15.5, 8.8), dpi=220)
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(BG)

    # Grid
    ax.grid(True, linestyle="--", linewidth=1.0, alpha=0.25, color=GRID)
    ax.set_axisbelow(True)

    # Filled curves
    ax.fill_between(x, y_trad, 0, color=TRAD, alpha=0.12)
    ax.fill_between(x, y_esis, 0, color=ESIS, alpha=0.14)

    # Tail highlight
    ax.fill_between(x, trad_tail_area, 0, color=RED, alpha=0.22)
    ax.fill_between(x, esis_tail_area, 0, color=ESIS, alpha=0.20)

    # Lines
    trad_line, = ax.plot(x, y_trad, color=TRAD, linewidth=3.2, label="Traditional Workflow")
    esis_line, = ax.plot(x, y_esis, color=ESIS, linewidth=3.2, label="ESIS")

    trad_line.set_path_effects([
        pe.Stroke(linewidth=8, foreground=TRAD, alpha=0.12),
        pe.Normal()
    ])
    esis_line.set_path_effects([
        pe.Stroke(linewidth=8, foreground=ESIS, alpha=0.14),
        pe.Normal()
    ])

    # CVaR threshold
    vline = ax.axvline(threshold, color=WHITE, linewidth=2.6, linestyle="--")
    vline.set_path_effects([
        pe.Stroke(linewidth=7, foreground=WHITE, alpha=0.08),
        pe.Normal()
    ])

    # Titles
    ax.set_title(
        "ESIS Risk Distribution Shift",
        fontsize=28, fontweight="bold", color=FG, pad=20
    )
    ax.text(
        0.5, 1.01,
        "ESIS does not merely improve the average case — it compresses catastrophic tail risk through CVaR-constrained action selection",
        transform=ax.transAxes,
        ha="center", va="bottom",
        fontsize=14, color=SUB
    )

    # Axis labels
    ax.set_xlabel("Outcome Loss Severity / Harm Magnitude  →", fontsize=17, color=FG, labelpad=14)
    ax.set_ylabel("Estimated Probability Density", fontsize=17, color=FG, labelpad=14)

    # Ticks / spines
    ax.tick_params(axis="x", colors=SUB, labelsize=13)
    ax.tick_params(axis="y", colors=SUB, labelsize=13)
    for s in ax.spines.values():
        s.set_color(GRID)
        s.set_linewidth(1.2)

    # Labels on curves
    ax.text(
        46, y_trad[np.argmin(np.abs(x - 46))] + 0.004,
        "Traditional\nwider + heavier tail",
        color=TRAD, fontsize=14, fontweight="bold",
        ha="center"
    )

    ax.text(
        21, y_esis[np.argmin(np.abs(x - 21))] + 0.004,
        "ESIS\ncompressed risk profile",
        color=ESIS, fontsize=14, fontweight="bold",
        ha="center"
    )

    # Threshold annotation
    ax.annotate(
        "CVaR / severe-harm threshold",
        xy=(threshold, max(y_trad) * 0.76),
        xytext=(79, max(y_trad) * 0.96),
        color=FG,
        fontsize=13.2,
        arrowprops=dict(arrowstyle="->", color=WHITE, lw=2.0),
        bbox=dict(boxstyle="round,pad=0.35", fc="#1A2740", ec="#64748B", lw=1.5)
    )

    # Tail annotations
    ax.annotate(
        "Traditional workflow leaves\nsubstantial catastrophic tail exposure",
        xy=(84, trad_tail_area[np.argmin(np.abs(x - 84))]),
        xytext=(72, max(y_trad) * 0.48),
        color=FG,
        fontsize=13.0,
        arrowprops=dict(arrowstyle="->", color=TRAD, lw=2.0),
        bbox=dict(boxstyle="round,pad=0.35", fc="#3A1F15", ec=TRAD, lw=1.4)
    )

    ax.annotate(
        "ESIS sharply reduces the\nmass of extreme bad outcomes",
        xy=(73, esis_tail_area[np.argmin(np.abs(x - 73))] + 0.0003),
        xytext=(44, max(y_trad) * 0.23),
        color=FG,
        fontsize=13.0,
        arrowprops=dict(arrowstyle="->", color=ESIS, lw=2.0),
        bbox=dict(boxstyle="round,pad=0.35", fc="#103129", ec=ESIS, lw=1.4)
    )

    # Legend
    leg = ax.legend(
        loc="upper right",
        frameon=True,
        fontsize=13,
        facecolor="#0F1A2D",
        edgecolor="#475569"
    )
    for t in leg.get_texts():
        t.set_color(FG)

    # Footer
    fig.text(
        0.5, 0.03,
        "Interpretation: ESIS is explicitly designed to suppress worst-case human outcomes, not just improve expected performance.",
        ha="center", color=MUTED, fontsize=12
    )

    plt.tight_layout(rect=[0.03, 0.06, 0.98, 0.95])
    plt.savefig(output_path, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)
    print(f"Saved: {output_path}")

if __name__ == "__main__":
    build_risk_distribution()