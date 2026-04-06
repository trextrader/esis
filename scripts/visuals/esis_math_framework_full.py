import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
import matplotlib.patheffects as pe

# ===============================
# STYLE
# ===============================
BG         = "#08111F"
FG         = "#F8FAFC"
SUB        = "#CBD5E1"
MUTED      = "#94A3B8"

BLUE       = "#60A5FA";  BLUE_FILL  = "#102B4C"
GOLD       = "#FBBF24";  GOLD_FILL  = "#4A3410"
TEAL       = "#2DD4BF";  TEAL_FILL  = "#0E2E36"
GREEN      = "#34D399";  GREEN_FILL = "#103226"
ORANGE     = "#FB923C";  ORANGE_FILL= "#3A1E08"

# ===============================
# HELPERS
# ===============================
def glow_box(ax, x, y, w, h, fc, ec, lw=2.0):
    patch = FancyBboxPatch(
        (x, y), w, h,
        boxstyle="round,pad=0.018,rounding_size=0.025",
        linewidth=lw, edgecolor=ec, facecolor=fc, zorder=2
    )
    patch.set_path_effects([
        pe.Stroke(linewidth=9, foreground=ec, alpha=0.13),
        pe.Normal()
    ])
    ax.add_patch(patch)

def eq_box(ax, x, y, w, h, fc, ec, title, eq, eq_fs=14):
    glow_box(ax, x, y, w, h, fc, ec)
    pad = 0.018

    # Title — top-anchored with fixed pad
    ax.text(x + pad*1.5, y + h - pad,
            title,
            color=FG, fontsize=12, fontweight="bold", va="top", zorder=3)

    # Thin rule
    rule_y = y + h - pad - 0.038
    ax.plot([x + pad, x + w - pad], [rule_y, rule_y],
            color=ec, lw=0.7, alpha=0.45, zorder=3)

    # Equation — centred in space below the rule
    eq_cy = y + (rule_y - y) * 0.50
    ax.text(x + w / 2, eq_cy,
            eq,
            color=ec, fontsize=eq_fs, ha="center", va="center",
            zorder=3)

# ===============================
# BUILD
# ===============================
def build(output="c://esis//esis_math_framework_full.png"):
    fig, ax = plt.subplots(figsize=(18, 10), dpi=220)
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(BG)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")

    # ── TITLE ────────────────────────────────────────────────────
    ax.text(0.5, 0.970, "ESIS Mathematical Framework",
            ha="center", va="top",
            fontsize=27, fontweight="bold", color=FG, zorder=3)
    ax.text(0.5, 0.928, "Unified formulation of uncertainty-aware, risk-constrained decision-making under real-world constraints",
            ha="center", va="top",
            fontsize=12.5, color=SUB, zorder=3)

    # ── LEFT COLUMN: 4 EQUATION BOXES ───────────────────────────
    # Evenly fill vertical space from y=0.07 to y=0.895
    LX, LW   = 0.03, 0.54        # left column x, width
    BOX_H    = 0.178              # box height
    GAP      = 0.022              # gap between boxes
    BOTTOM   = 0.07
    # 4 boxes + 3 gaps
    total_h  = 4 * BOX_H + 3 * GAP   # = 0.712 + 0.066 = 0.778
    top_y    = BOTTOM + total_h       # = 0.848

    y4 = BOTTOM + 3 * (BOX_H + GAP)  # topmost box
    y3 = BOTTOM + 2 * (BOX_H + GAP)
    y2 = BOTTOM + 1 * (BOX_H + GAP)
    y1 = BOTTOM

    eq_box(ax, LX, y4, LW, BOX_H, BLUE_FILL, BLUE,
           "1.  Belief State Update  (POMDP)",
           r"$b_t(s) \;=\; P\!\left(s_t \mid o_{1:t},\, a_{1:t-1}\right)$"
           "\n"
           r"$s_{t+1} \sim P(s_{t+1} \mid s_t, a_t)$",
           eq_fs=14)

    eq_box(ax, LX, y3, LW, BOX_H, GOLD_FILL, GOLD,
           "2.  Risk Functional  (CVaR)",
           r"$\mathrm{CVaR}_\alpha(L) \;=\; \mathbb{E}\!\left[\,L \;\middle|\; L \geq \mathrm{VaR}_\alpha(L)\,\right]$",
           eq_fs=14)

    eq_box(ax, LX, y2, LW, BOX_H, TEAL_FILL, TEAL,
           "3.  Constrained Policy Optimization",
           r"$\pi^* \;=\; \arg\min_{\pi}\; \mathbb{E}[L \mid \pi]$"
           "\n"
           r"$\text{subject to}\;\; P(L > \tau \mid \pi) \;\leq\; \varepsilon"
           r"\;\;\text{(safety constraint)}$",
           eq_fs=13)

    eq_box(ax, LX, y1, LW, BOX_H, GREEN_FILL, GREEN,
           "4.  Monte Carlo Harm Estimation",
           r"$\hat{P} \;=\; \dfrac{1}{N} \sum_{i=1}^{N} \mathbf{1}\!\left\{L_i > \tau\right\}$",
           eq_fs=14)

    # ── RIGHT COLUMN: SYMBOL DEFINITIONS ────────────────────────
    RX   = LX + LW + 0.020        # right col x
    RW   = 1.0 - RX - 0.028       # right col width
    RY   = BOTTOM                  # bottom
    # Cap top at 0.865 so there is clear space above the box border
    # before the figure subtitle at y=0.928
    BOX_TOP = 0.865
    RH   = BOX_TOP - RY

    glow_box(ax, RX, RY, RW, RH, "#0D1F35", TEAL, lw=1.8)

    # Panel title
    T_PAD = 0.030
    ax.text(RX + T_PAD, RY + RH - T_PAD,
            "Symbol Definitions",
            color=FG, fontsize=13, fontweight="bold", va="top", zorder=3)

    # Rule under title
    rule_y = RY + RH - T_PAD - 0.042
    ax.plot([RX + T_PAD, RX + RW - T_PAD], [rule_y, rule_y],
            color=TEAL, lw=0.8, alpha=0.45, zorder=3)

    definitions = [
        (r"$s_t$",                  "latent system state\n     (health, environment, resources)"),
        (r"$o_t$",                  "observations\n     (user input, sensors, context)"),
        (r"$a_t$",                  r"action taken at time  $t$"),
        (r"$b_t(s)$",               r"belief distribution over states"),
        (r"$\pi$",                  "policy\n     (decision strategy)"),
        (r"$L$",                    "loss / harm metric\n     (objective being minimized)"),
        (r"$\tau$",                 r"severe-harm threshold"),
        (r"$\varepsilon$",          r"acceptable risk tolerance"),
        (r"$\alpha$",               "tail probability level\n     (CVaR confidence)"),
        (r"$\mathrm{VaR}_\alpha$",  r"value-at-risk cutoff at level $\alpha$"),
        (r"$\mathrm{CVaR}_\alpha$", r"expected loss in the worst tail"),
        (r"$N$",                    r"number of Monte Carlo simulations"),
    ]

    avail   = rule_y - (RY + T_PAD)
    n       = len(definitions)
    step    = avail / n
    sym_x   = RX + T_PAD + 0.005
    def_x   = sym_x + 0.095

    for i, (sym, defn) in enumerate(definitions):
        cy = rule_y - (i + 0.52) * step
        ax.text(sym_x, cy, sym,
                color=TEAL, fontsize=10.5, va="center",
                ha="left", zorder=3)
        ax.text(def_x, cy, "—  " + defn,
                color=SUB, fontsize=10, va="center",
                ha="left", zorder=3)

    # ── FOOTER ───────────────────────────────────────────────────
    ax.text(0.5, 0.033,
            "ESIS integrates probabilistic state estimation, tail-risk minimization, "
            "and constrained optimization into a unified safety-critical decision framework.",
            ha="center", va="center",
            fontsize=11, color=MUTED, zorder=3)

    plt.savefig(output, bbox_inches="tight",
                facecolor=fig.get_facecolor(), dpi=220)
    plt.close()
    print("Saved:", output)

if __name__ == "__main__":
    build()
