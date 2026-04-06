import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle
import matplotlib.patheffects as pe
import numpy as np

# =========================================
# STYLE
# =========================================
BG = "#08111F"
FG = "#F8FAFC"
SUB = "#CBD5E1"
MUTED = "#94A3B8"
GRID = "#334155"

BLUE   = "#60A5FA";  BLUE_FILL   = "#102B4C"
GOLD   = "#FBBF24";  GOLD_FILL   = "#4A3410"
TEAL   = "#2DD4BF";  TEAL_FILL   = "#0E2E36"
GREEN  = "#34D399";  GREEN_FILL  = "#103226"
ORANGE = "#FB923C";  ORANGE_FILL = "#3A2412"

# =========================================
# HELPERS
# =========================================
def rounded_box(ax, x, y, w, h, fc, ec, title, body, big=False):
    """Draw a box whose title + body always sit well within the border."""
    patch = FancyBboxPatch(
        (x, y), w, h,
        boxstyle="round,pad=0.02,rounding_size=0.035",
        linewidth=2.1,
        edgecolor=ec,
        facecolor=fc,
        zorder=2
    )
    patch.set_path_effects([
        pe.Stroke(linewidth=8, foreground=ec, alpha=0.13),
        pe.Normal()
    ])
    ax.add_patch(patch)

    pad  = 0.025          # inner vertical padding from edge
    top  = y + h - pad    # title baseline anchor (top-aligned)
    mid  = y + h * 0.50   # body centre

    # Title — anchored below the top border with a fixed pad
    ax.text(
        x + w / 2, top,
        title,
        ha="center", va="top",
        fontsize=15 if big else 13,
        fontweight="bold", color=FG,
        zorder=3,
        clip_on=False
    )

    # Body — centred in the lower 60 % of the box
    body_cy = y + h * 0.36
    ax.text(
        x + w / 2, body_cy,
        body,
        ha="center", va="center",
        fontsize=10.5, color=SUB,
        linespacing=1.35,
        zorder=3,
        clip_on=False
    )


def side_box(ax, x, y, w, h, fc, ec, title, body, body_fs=9.8):
    """Side panel with top-aligned title and body below a rule line."""
    patch = FancyBboxPatch(
        (x, y), w, h,
        boxstyle="round,pad=0.02,rounding_size=0.025",
        linewidth=2.0,
        edgecolor=ec,
        facecolor=fc,
        zorder=2
    )
    patch.set_path_effects([
        pe.Stroke(linewidth=7, foreground=ec, alpha=0.13),
        pe.Normal()
    ])
    ax.add_patch(patch)

    pad_x = 0.022
    pad_top = 0.022

    title_y = y + h - pad_top
    ax.text(
        x + w / 2, title_y,
        title,
        ha="center", va="top",
        fontsize=13, fontweight="bold", color=FG,
        zorder=3
    )

    # thin rule
    rule_y = title_y - 0.038
    ax.plot([x + pad_x, x + w - pad_x], [rule_y, rule_y],
            color=ec, lw=0.7, alpha=0.45, zorder=3)

    # body text centred in the space between rule and 80% up from box bottom
    # (keeps text away from the lower border)
    body_cy = y + (rule_y - y) * 0.42
    ax.text(
        x + w / 2, body_cy,
        body,
        ha="center", va="center",
        fontsize=body_fs, color=SUB,
        linespacing=1.38,
        zorder=3
    )


def curved_arrow(ax, p1, p2, rad=0.15, color="#CBD5E1", style="-|>"):
    arr = FancyArrowPatch(
        p1, p2,
        arrowstyle=style,
        connectionstyle=f"arc3,rad={rad}",
        mutation_scale=18,
        linewidth=2.0,
        color=color,
        zorder=4
    )
    arr.set_path_effects([
        pe.Stroke(linewidth=6, foreground=color, alpha=0.09),
        pe.Normal()
    ])
    ax.add_patch(arr)


def small_tag(ax, x, y, text, color, fill):
    """Tag pill — fixed 0.15 wide × 0.048 tall."""
    W, H = 0.15, 0.048
    patch = FancyBboxPatch(
        (x, y), W, H,
        boxstyle="round,pad=0.010,rounding_size=0.018",
        linewidth=1.5,
        edgecolor=color,
        facecolor=fill,
        zorder=5
    )
    patch.set_path_effects([
        pe.Stroke(linewidth=5, foreground=color, alpha=0.10),
        pe.Normal()
    ])
    ax.add_patch(patch)
    ax.text(
        x + W / 2, y + H / 2, text,
        ha="center", va="center",
        fontsize=10.2, color=FG, fontweight="bold",
        zorder=6
    )


# =========================================
# BUILD
# =========================================
def build_decision_loop(output_path="esis_decision_loop.png"):
    fig, ax = plt.subplots(figsize=(16, 9), dpi=220)
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(BG)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")

    # ── TITLE ────────────────────────────────────────────────────
    ax.text(
        0.5, 0.965,
        "ESIS Closed-Loop Decision System",
        ha="center", va="top",
        fontsize=28, fontweight="bold", color=FG, zorder=3
    )
    ax.text(
        0.5, 0.920,
        "A simplified operational loop: state → risk → action → outcome → update",
        ha="center", va="top",
        fontsize=13.5, color=SUB, zorder=3
    )

    # ── MAIN LOOP BOXES ──────────────────────────────────────────
    # (x, y, w, h)  — positions chosen so no box touches another
    #  State:   left,  mid-height
    #  Risk:    upper-centre-left
    #  Action:  upper-centre-right
    #  Outcome: right, mid-lower
    #  Update:  lower-centre

    BW, BH = 0.165, 0.135   # uniform box width / height

    rounded_box(ax, 0.09, 0.47, BW, BH, BLUE_FILL,   BLUE,
                "State",
                "User context\nresources • symptoms • exposure", big=True)

    rounded_box(ax, 0.30, 0.65, BW, BH, GOLD_FILL,   GOLD,
                "Risk",
                "POMDP belief state\nchance constraints • CVaR", big=True)

    rounded_box(ax, 0.60, 0.62, BW, BH, TEAL_FILL,   TEAL,
                "Action",
                "Safest feasible plan\nrouting • escalation • advocacy", big=True)

    rounded_box(ax, 0.68, 0.33, BW, BH, GREEN_FILL,  GREEN,
                "Outcome",
                "Observed response\nstabilized • failed • partial", big=True)

    rounded_box(ax, 0.35, 0.18, BW, BH, ORANGE_FILL, ORANGE,
                "Update",
                "Belief revision\nreplan under new evidence", big=True)

    # ── ARROWS ───────────────────────────────────────────────────
    curved_arrow(ax, (0.255, 0.565), (0.300, 0.720), rad= 0.15, color=BLUE)
    curved_arrow(ax, (0.465, 0.725), (0.600, 0.690), rad=-0.08, color=GOLD)
    curved_arrow(ax, (0.765, 0.630), (0.765, 0.465), rad=-0.05, color=TEAL)
    curved_arrow(ax, (0.680, 0.380), (0.515, 0.245), rad=-0.12, color=GREEN)
    curved_arrow(ax, (0.350, 0.232), (0.175, 0.470), rad=-0.28, color=ORANGE)

    # ── CENTRE RING + LABEL ──────────────────────────────────────
    cx, cy = 0.475, 0.49
    ring = Circle((cx, cy), 0.185,
                  fill=False, edgecolor="#475569",
                  linewidth=1.2, linestyle="--", alpha=0.5, zorder=1)
    ax.add_patch(ring)
    ax.text(cx, cy, "Adaptive\nDecision Loop",
            ha="center", va="center",
            fontsize=15, fontweight="bold", color=FG, zorder=3)

    # ── TAGS ─────────────────────────────────────────────────────
    # Each tag must be well clear of every loop box.
    # Loop box tops: State=0.605, Risk=0.785, Action=0.755, Outcome=0.465, Update=0.315
    # Loop box bottoms: State=0.47, Risk=0.65, Action=0.62, Outcome=0.33, Update=0.18

    # "Offline-first"    — top-left, above State top (0.605) → y=0.83
    small_tag(ax, 0.02, 0.83, "Offline-first",     TEAL,   "#113238")

    # "Uncertainty-aware"— above Risk top (0.785) with clear gap → y=0.83
    small_tag(ax, 0.30, 0.83, "Uncertainty-aware", GOLD,   "#4B3911")

    # "Risk-constrained" — above Action top (0.755) → y=0.80 (right of centre)
    small_tag(ax, 0.72, 0.80, "Risk-constrained",  GREEN,  "#113126")

    # ── SIDE PANELS ──────────────────────────────────────────────
    # "Why this matters" — bottom-left, well below State (bottom 0.47)
    side_box(
        ax, 0.02, 0.09, 0.235, 0.245,
        "#12253E", BLUE,
        "Why this matters",
        "ESIS is not a one-shot assistant.\nIt continuously updates state,\nre-evaluates risk, and replans\nas conditions change."
    )

    # "Judge takeaway" — bottom-right
    #   Outcome box bottom = 0.33 → Judge top must be ≤ 0.29 (0.04 gap)
    #   JUDGE_Y=0.115, JUDGE_H=0.170 → top=0.285 ✓
    #   Human-centered tag: y=0.055, top=0.103 — below box, above footer ✓
    JUDGE_Y = 0.115
    JUDGE_H = 0.170
    side_box(
        ax, 0.745, JUDGE_Y, 0.235, JUDGE_H,
        "#102B34", TEAL,
        "Judge takeaway",
        "Gemma 4 provides local reasoning,\nwhile ESIS wraps that reasoning inside\na structured safety loop suitable for\nreal-world unstable environments.",
        body_fs=9.0
    )

    # "Human-centered" tag — directly below Judge takeaway box
    small_tag(ax, 0.757, JUDGE_Y - 0.060, "Human-centered", BLUE, "#132A43")

    # ── FOOTER ───────────────────────────────────────────────────
    ax.text(
        0.5, 0.022,
        "ESIS closes the gap between reasoning and "
        "action by continuously updating decisions under uncertainty.",
        ha="center", va="center",
        fontsize=11.5, color=MUTED, zorder=3
    )

    plt.tight_layout()
    plt.savefig(output_path, bbox_inches="tight", facecolor=fig.get_facecolor(), dpi=220)
    plt.close(fig)
    print(f"Saved: {output_path}")


if __name__ == "__main__":
    build_decision_loop()