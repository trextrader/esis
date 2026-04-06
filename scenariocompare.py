import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Rectangle, Circle
import matplotlib.patheffects as pe
import textwrap
import numpy as np

# -------------------------------------------------
# COLORS
# -------------------------------------------------
BG = "#08111F"
FG = "#F8FAFC"
SUB = "#CBD5E1"
MUTED = "#94A3B8"
GRID = "#334155"

BLUE_FILL, BLUE_EDGE = "#102B4C", "#60A5FA"
GOLD_FILL, GOLD_EDGE = "#4A3410", "#FBBF24"
TEAL_FILL, TEAL_EDGE = "#0E2E36", "#2DD4BF"

# -------------------------------------------------
# TEXT FIT HELPERS
# -------------------------------------------------
def wrap_and_fit(lines, max_width=42, max_lines=7, max_bullets=3):
    wrapped = []
    for line in lines[:max_bullets]:
        parts = textwrap.wrap(line, width=max_width)
        if not parts:
            continue
        wrapped.append("• " + parts[0])
        for p in parts[1:]:
            wrapped.append("  " + p)
    wrapped = wrapped[:max_lines]
    return "\n".join(wrapped)

def auto_font_size(text, base=9.4):
    line_count = text.count("\n") + 1
    if line_count <= 4:
        return base
    elif line_count <= 6:
        return base - 0.5
    else:
        return base - 1.0

# -------------------------------------------------
# ICONS
# -------------------------------------------------
def draw_medical_icon(ax, cx, cy, s=0.022, c="#60A5FA"):
    ax.add_patch(Circle((cx, cy), s * 1.25, fill=False, edgecolor=c, linewidth=1.5))
    ax.add_patch(Rectangle((cx - s * 0.22, cy - s * 0.72), s * 0.44, s * 1.44, color=c))
    ax.add_patch(Rectangle((cx - s * 0.72, cy - s * 0.22), s * 1.44, s * 0.44, color=c))

def draw_snow_icon(ax, cx, cy, s=0.028, c="#60A5FA"):
    for a in [0, np.pi/3, 2*np.pi/3]:
        dx, dy = np.cos(a) * s, np.sin(a) * s
        ax.plot([cx - dx, cx + dx], [cy - dy, cy + dy], color=c, lw=1.5)

def draw_id_icon(ax, cx, cy, s=0.040, c="#60A5FA"):
    w, h = s * 1.7, s * 1.05
    ax.add_patch(FancyBboxPatch(
        (cx - w/2, cy - h/2), w, h,
        boxstyle="round,pad=0.01,rounding_size=0.01",
        edgecolor=c, facecolor="none", linewidth=1.5
    ))
    ax.add_patch(Circle((cx - w * 0.23, cy + h * 0.05), h * 0.18, fill=False, edgecolor=c, linewidth=1.0))
    ax.plot([cx - w * 0.02, cx + w * 0.28], [cy + h * 0.14, cy + h * 0.14], color=c, lw=1.0)
    ax.plot([cx - w * 0.02, cx + w * 0.28], [cy - h * 0.02, cy - h * 0.02], color=c, lw=1.0)

# -------------------------------------------------
# DRAW A SINGLE LANDSCAPE BOX
# -------------------------------------------------
def rounded_box(ax, xy, w, h, fc, ec, title, bullets, icon):
    x, y = xy

    box = FancyBboxPatch(
        (x, y), w, h,
        boxstyle="round,pad=0.02,rounding_size=0.03",
        edgecolor=ec,
        facecolor=fc,
        linewidth=2.0
    )
    box.set_path_effects([
        pe.Stroke(linewidth=7, foreground=ec, alpha=0.12),
        pe.Normal()
    ])
    ax.add_patch(box)

    # icon
    ix = x + 0.045
    iy = y + h - 0.06
    if icon == "medical":
        draw_medical_icon(ax, ix, iy, c=ec)
    elif icon == "snow":
        draw_snow_icon(ax, ix, iy, c=ec)
    elif icon == "id":
        draw_id_icon(ax, ix, iy, c=ec)

    # title
    ax.text(
        x + 0.082,
        y + h - 0.045,
        title,
        ha="left",
        va="top",
        color=FG,
        fontsize=10.5,
        fontweight="bold",
        path_effects=[pe.withStroke(linewidth=3, foreground=ec, alpha=0.12)]
    )

    # bullets
    text = wrap_and_fit(bullets, max_width=42, max_lines=7, max_bullets=3)
    fs = auto_font_size(text, base=9.4)

    ax.text(
        x + 0.035,
        y + h - 0.11,
        text,
        ha="left",
        va="top",
        color=FG,
        fontsize=fs,
        linespacing=1.20
    )

# -------------------------------------------------
# ARROW
# -------------------------------------------------
def arrow(ax, p1, p2):
    arr = FancyArrowPatch(
        p1, p2,
        arrowstyle="->",
        mutation_scale=15,
        linewidth=2.2,
        color="#CBD5E1",
        connectionstyle="arc3,rad=0.0"
    )
    arr.set_path_effects([
        pe.Stroke(linewidth=6, foreground="#CBD5E1", alpha=0.14),
        pe.Normal()
    ])
    ax.add_patch(arr)

# -------------------------------------------------
# PANEL (THREE BOXES STACKED TOP TO BOTTOM)
# -------------------------------------------------
def panel(ax, title, subtitle, l_title, l_bullets, m_title, m_bullets, r_title, r_bullets, icon):
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")
    ax.set_facecolor(BG)

    outer = FancyBboxPatch(
        (0.02, 0.05), 0.96, 0.88,
        boxstyle="round,pad=0.02,rounding_size=0.03",
        edgecolor=GRID,
        facecolor=BG,
        linewidth=1.5
    )
    ax.add_patch(outer)

    ax.text(0.05, 0.92, title, color=FG, fontsize=13.5, fontweight="bold", ha="left", va="top")
    ax.text(0.05, 0.85, subtitle, color=SUB, fontsize=10, ha="left", va="top")

    # landscape boxes stacked vertically
    box_x = 0.08
    box_w = 0.84
    box_h = 0.16

    y1 = 0.60
    y2 = 0.38
    y3 = 0.16

    rounded_box(ax, (box_x, y1), box_w, box_h, BLUE_FILL, BLUE_EDGE, l_title, l_bullets, icon)
    rounded_box(ax, (box_x, y2), box_w, box_h, GOLD_FILL, GOLD_EDGE, m_title, m_bullets, icon)
    rounded_box(ax, (box_x, y3), box_w, box_h, TEAL_FILL, TEAL_EDGE, r_title, r_bullets, icon)

    # vertical arrows
    arrow(ax, (0.50, y1), (0.50, y2 + box_h))
    arrow(ax, (0.50, y2), (0.50, y3 + box_h))

# -------------------------------------------------
# MAIN
# -------------------------------------------------
def build_scenario_panel(output_path="esis_scenario_panel_verticalflow.png"):
    fig, axes = plt.subplots(1, 3, figsize=(18.5, 8.4), dpi=200)
    fig.patch.set_facecolor(BG)

    panel(
        axes[0],
        "Post-Discharge Instability",
        "Failure Mode: discharge without recovery support",
        "Input State",
        [
            "Severe pain or declining condition",
            "Recent discharge or failed discharge plan",
            "No shelter or recovery location"
        ],
        "ESIS Reasoning",
        [
            "Estimate near-term severe-harm probability",
            "Prioritize medical + shelter pathway",
            "Escalate if risk thresholds are exceeded"
        ],
        "Action Path",
        [
            "Call and advocate with structured context",
            "Route to the safest viable option",
            "Replan based on response outcomes"
        ],
        "medical"
    )

    panel(
        axes[1],
        "Exposure-Driven Survival Risk",
        "Failure Mode: environmental survivability collapse",
        "Input State",
        [
            "Freezing night or heat exposure",
            "Low battery and limited cash",
            "No immediate indoor safe location"
        ],
        "ESIS Reasoning",
        [
            "Model exposure tail risk under uncertainty",
            "Conserve scarce resources",
            "Reject unsafe paths above threshold"
        ],
        "Action Path",
        [
            "Use offline routing and waypoint guidance",
            "Find shelter or warming resources",
            "Trigger immediate stabilization workflow"
        ],
        "snow"
    )

    panel(
        axes[2],
        "Administrative Pathway Collapse",
        "Failure Mode: document and referral breakdown",
        "Input State",
        [
            "Lost ID or disrupted paperwork",
            "Missed contact attempts and unstable phone access",
            "Broken referral chain"
        ],
        "ESIS Reasoning",
        [
            "Infer pathway failure probability",
            "Sequence recovery steps efficiently",
            "Minimize friction and repeated disclosure"
        ],
        "Action Path",
        [
            "Switch to paper-first workflow if needed",
            "Generate referral-ready packet",
            "Initiate partner handoff and tracking"
        ],
        "id"
    )

    fig.suptitle(
        "Real-World ESIS Intervention Scenarios",
        color=FG,
        fontsize=22,
        fontweight="bold",
        y=0.98
    )

    fig.text(
        0.5,
        0.02,
        "Representative failure modes showing how ESIS converts fragmented, high-risk conditions into structured intervention pathways.",
        ha="center",
        color=MUTED,
        fontsize=11
    )

    plt.tight_layout(rect=[0.02, 0.05, 0.98, 0.94])
    plt.savefig(output_path, bbox_inches="tight", facecolor=BG)
    plt.close()

    print(f"Saved → {output_path}")

if __name__ == "__main__":
    build_scenario_panel()