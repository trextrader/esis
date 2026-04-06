import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
import matplotlib.patheffects as pe

# =========================================
# STYLE
# =========================================
BG = "#08111F"
FG = "#F8FAFC"
SUB = "#CBD5E1"
MUTED = "#94A3B8"
GRID = "#334155"

BLUE   = "#60A5FA";  BLUE_FILL  = "#102B4C"
GOLD   = "#FBBF24";  GOLD_FILL  = "#4A3410"
TEAL   = "#2DD4BF";  TEAL_FILL  = "#0E2E36"
ORANGE = "#FB923C"
GREEN  = "#34D399"
SLATE_FILL = "#14233B"

# =========================================
# HELPERS
# =========================================
def rounded_panel(ax, x, y, w, h, fc, ec, lw=2.0, glow_alpha=0.14, rounding=0.03):
    patch = FancyBboxPatch(
        (x, y), w, h,
        boxstyle=f"round,pad=0.018,rounding_size={rounding}",
        linewidth=lw,
        edgecolor=ec,
        facecolor=fc,
        zorder=2
    )
    patch.set_path_effects([
        pe.Stroke(linewidth=8, foreground=ec, alpha=glow_alpha),
        pe.Normal()
    ])
    ax.add_patch(patch)
    return patch


def metric_card(ax, x, y, w, h, accent, fill, big_text, title, subtitle):
    """
    Layout (top → bottom, all within box):
      ┌──────────────────────────┐
      │  [big metric]            │  top quarter
      │  ────────────────────    │  thin rule
      │  [title bold]            │  middle
      │  [subtitle muted]        │  lower quarter
      └──────────────────────────┘
    """
    rounded_panel(ax, x, y, w, h, fill, accent, lw=2.1, glow_alpha=0.16)

    pad   = 0.022          # inner padding from each edge
    inner = h - 2 * pad

    # Big metric — top third
    big_y = y + h - pad
    ax.text(
        x + w / 2, big_y, big_text,
        ha="center", va="top",
        fontsize=26, fontweight="bold", color=accent,
        zorder=3,
        path_effects=[pe.withStroke(linewidth=4, foreground=accent, alpha=0.10)]
    )

    # Thin rule below metric number
    rule_y = y + h * 0.52
    ax.plot([x + pad * 2, x + w - pad * 2], [rule_y, rule_y],
            color=accent, lw=0.7, alpha=0.35, zorder=3)

    # Title — just below rule
    ax.text(
        x + w / 2, rule_y - 0.012,
        title,
        ha="center", va="top",
        fontsize=13, fontweight="bold", color=FG,
        zorder=3
    )

    # Subtitle — anchored to bottom
    ax.text(
        x + w / 2, y + pad,
        subtitle,
        ha="center", va="bottom",
        fontsize=10, color=SUB,
        zorder=3
    )


def bullet_box(ax, x, y, w, h, title, bullets, accent=TEAL, fill=SLATE_FILL):
    """
    Layout:
      title (bold, top with pad)
      rule line
      bullets — evenly spaced in remaining height, all within box
    """
    rounded_panel(ax, x, y, w, h, fill, accent, lw=1.8, glow_alpha=0.12)

    pad_x  = 0.030
    pad_top = 0.022

    title_y = y + h - pad_top
    ax.text(
        x + pad_x, title_y,
        title,
        ha="left", va="top",
        fontsize=12.5, fontweight="bold", color=FG,
        zorder=3
    )

    # thin rule
    rule_y = title_y - 0.042
    ax.plot([x + pad_x, x + w - pad_x], [rule_y, rule_y],
            color=accent, lw=0.7, alpha=0.40, zorder=3)

    # Remaining vertical space for bullets
    bottom_pad = 0.025
    available  = rule_y - (y + bottom_pad)
    n          = len(bullets)
    step       = available / n        # divide evenly

    for i, b in enumerate(bullets):
        # Centre of each bullet slot, top to bottom
        slot_top = rule_y - (i * step)
        slot_cy  = slot_top - step * 0.5
        ax.text(
            x + pad_x + 0.010, slot_cy,
            f"• {b}",
            ha="left", va="center",
            fontsize=10.5, color=FG,
            zorder=3
        )


# =========================================
# BUILD
# =========================================
def build_impact_summary(output_path="esis_impact_summary_panel.png"):
    fig, ax = plt.subplots(figsize=(16, 9), dpi=220)
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(BG)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")

    # ── TITLE ────────────────────────────────────────────────────
    ax.text(
        0.5, 0.965,
        "ESIS Impact Summary",
        ha="center", va="top",
        fontsize=30, fontweight="bold", color=FG, zorder=3
    )
    ax.text(
        0.5, 0.918,
        "A one-glance summary of why ESIS materially outperforms fragmented traditional workflows",
        ha="center", va="top",
        fontsize=13.5, color=SUB, zorder=3
    )

    # ── TOP ROW CARDS ────────────────────────────────────────────
    card_w = 0.275
    card_h = 0.215      # taller card so metric + title + subtitle all fit
    gap    = 0.025
    x1, x2, x3 = 0.052, 0.052 + card_w + gap, 0.052 + 2 * (card_w + gap)
    y1 = 0.665

    metric_card(ax, x1, y1, card_w, card_h, TEAL,   TEAL_FILL,
                "↓ 96%", "Time to Safety",
                "From 24–72+ hours to minutes–hours")

    metric_card(ax, x2, y1, card_w, card_h, GOLD,   GOLD_FILL,
                "↓ 99%", "Housing Pathway Start",
                "From months–years to same day–72 hours")

    metric_card(ax, x3, y1, card_w, card_h, GREEN,  "#103226",
                "↓ Tail Risk", "Severe-Harm Exposure",
                "CVaR-constrained selection rejects unsafe plans")

    # ── MIDDLE ROW CARDS ─────────────────────────────────────────
    y2 = y1 - card_h - gap

    metric_card(ax, x1, y2, card_w, card_h, BLUE,   BLUE_FILL,
                "↑ High", "Decision Consistency",
                "Structured, repeatable intervention logic")

    metric_card(ax, x2, y2, card_w, card_h, ORANGE, "#3A2412",
                "↑ Native", "Offline Usability",
                "Local-first operation under real field constraints")

    metric_card(ax, x3, y2, card_w, card_h, TEAL,   "#12343C",
                "↑ Better", "Execution Success",
                "Reduced friction, fewer administrative failure points")

    # ── BOTTOM BULLET BOXES ──────────────────────────────────────
    # y2 bottom = y2; boxes sit below with a gap
    bullet_y   = 0.075                    # bottom of bullet boxes
    bullet_top = y2 - gap                 # top of bullet boxes
    bullet_h   = bullet_top - bullet_y    # height fills gap to metric row

    bullet_box(
        ax, 0.052, bullet_y, 0.455, bullet_h,
        "Why the improvement matters",
        [
            "ESIS is optimized for real-world failure modes, not ideal workflows",
            "It minimizes catastrophic outcomes rather than chasing average-case performance",
            "It compresses delay, uncertainty, and pathway collapse into structured action"
        ],
        accent=BLUE, fill="#12253E"
    )

    bullet_box(
        ax, 0.052 + 0.455 + gap, bullet_y, 0.455, bullet_h,
        "Key take away points",
        [
            "This is not just a chatbot — it is a constrained intervention system",
            "Gemma 4 provides on-device reasoning under unstable, low-connectivity conditions",
            "ESIS links mathematical safety controls directly to human survival outcomes"
        ],
        accent=TEAL, fill="#102B34"
    )

    # ── FOOTER ───────────────────────────────────────────────────
    ax.text(
        0.5, 0.030,
        "Submission framing: ESIS converts safety from a soft preference into a hard operational objective under uncertainty.",
        ha="center", va="center",
        fontsize=11.5, color=MUTED, zorder=3
    )

    plt.tight_layout()
    plt.savefig(output_path, bbox_inches="tight", facecolor=fig.get_facecolor(), dpi=220)
    plt.close(fig)
    print(f"Saved: {output_path}")


if __name__ == "__main__":
    build_impact_summary()
