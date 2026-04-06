import matplotlib.pyplot as plt

BG = "#08111F"
FG = "#F8FAFC"
SUB = "#CBD5E1"
MUTED = "#94A3B8"
GRID = "#334155"

HEADER_BG = "#172235"
TRAD_BG = "#4A1F0D"
ESIS_BG = "#0E3B2E"
DELTA_BG = "#102B4C"

HEADER_EDGE = "#64748B"
TRAD_EDGE = "#FB923C"
ESIS_EDGE = "#34D399"
DELTA_EDGE = "#60A5FA"


def build_mini_evaluation_table(output_path="esis_mini_evaluation_table.png"):
    rows = [
        ["Time to safety", "24–72+ hrs", "Minutes–Hours", "↓ >95%"],
        ["Housing pathway activation", "Months–Years", "Same day–72 hrs", "↓ dramatic"],
        ["Decision consistency", "Low / variable", "Structured / repeatable", "↑ high"],
        ["Tail-risk control", "Weak", "CVaR-constrained", "↑ strong"],
        ["Offline usability", "Fragmented", "Native", "↑ enabled"],
        ["Administrative drop-off", "High", "Reduced", "↓ lower"],
    ]

    fig, ax = plt.subplots(figsize=(14, 6.8), dpi=200)
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(BG)
    ax.axis("off")

    col_labels = ["Metric", "Traditional Workflow", "ESIS Workflow", "Key Delta"]
    table = ax.table(
        cellText=rows,
        colLabels=col_labels,
        cellLoc="center",
        colLoc="center",
        loc="center"
    )

    table.auto_set_font_size(False)
    table.set_fontsize(11)
    table.scale(1.1, 2.0)

    # Header styling
    for c in range(len(col_labels)):
        cell = table[(0, c)]
        cell.set_facecolor(HEADER_BG)
        cell.set_edgecolor(HEADER_EDGE)
        cell.set_linewidth(1.5)
        cell.get_text().set_color(FG)
        cell.get_text().set_fontweight("bold")

    # Body styling
    for r in range(1, len(rows) + 1):
        # Metric
        cell = table[(r, 0)]
        cell.set_facecolor(BG)
        cell.set_edgecolor(GRID)
        cell.set_linewidth(1.0)
        cell.get_text().set_color(FG)
        cell.get_text().set_fontweight("bold")

        # Traditional
        cell = table[(r, 1)]
        cell.set_facecolor(TRAD_BG)
        cell.set_edgecolor(TRAD_EDGE)
        cell.set_linewidth(1.0)
        cell.get_text().set_color(FG)

        # ESIS
        cell = table[(r, 2)]
        cell.set_facecolor(ESIS_BG)
        cell.set_edgecolor(ESIS_EDGE)
        cell.set_linewidth(1.0)
        cell.get_text().set_color(FG)

        # Delta
        cell = table[(r, 3)]
        cell.set_facecolor(DELTA_BG)
        cell.set_edgecolor(DELTA_EDGE)
        cell.set_linewidth(1.0)
        cell.get_text().set_color(FG)
        cell.get_text().set_fontweight("bold")

    ax.set_title(
        "Traditional Workflow vs ESIS Workflow: Operational Comparison",
        color=FG, fontsize=22, fontweight="bold", pad=20
    )
    fig.text(
        0.5, 0.06,
        "Compact evaluation summary comparing fragmented traditional workflows against ESIS across speed, consistency, and safety performance.",
        ha="center", color=MUTED, fontsize=11
    )

    plt.tight_layout(rect=[0.02, 0.10, 0.98, 0.92])
    plt.savefig(output_path, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)
    print(f"Saved: {output_path}")


if __name__ == "__main__":
    build_mini_evaluation_table()