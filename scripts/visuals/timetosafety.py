import matplotlib.pyplot as plt
import numpy as np

BG = "#08111F"
FG = "#F8FAFC"
GRID = "#334155"
SUB = "#CBD5E1"
NOTE = "#94A3B8"

def style_axes(ax, title, subtitle, ylabel):
    ax.set_facecolor(BG)
    ax.set_title(title, fontsize=22, color=FG, pad=18, fontweight="bold")
    ax.text(
        0.5, 1.01, subtitle,
        transform=ax.transAxes,
        ha="center", va="bottom",
        fontsize=11, color=SUB
    )
    ax.set_ylabel(ylabel, fontsize=13, color=FG)
    ax.tick_params(axis="x", colors=FG, labelsize=13)
    ax.tick_params(axis="y", colors=SUB, labelsize=11)
    for spine in ax.spines.values():
        spine.set_color(GRID)
    ax.grid(axis="y", linestyle="--", linewidth=0.8, alpha=0.35)
    ax.set_axisbelow(True)

def build_time_to_safety_chart(output_path="esis_time_to_safety_chart.png"):
    labels = ["Traditional\nSystem", "ESIS +\nGemma 4"]
    values = [48, 2]  # hours
    colors = ["#FB923C", "#34D399"]
    annotations = ["24–72+ hrs", "Minutes–Hours\n(target: <2 hrs)"]

    fig, ax = plt.subplots(figsize=(12, 7), dpi=200)
    fig.patch.set_facecolor(BG)

    x = np.arange(len(labels))
    bars = ax.bar(x, values, width=0.55, edgecolor="#E5E7EB", linewidth=1.5)
    for b, c in zip(bars, colors):
        b.set_color(c)

    style_axes(
        ax,
        "ESIS Time-to-Safety Compression",
        "Reducing stabilization delay from days to hours with offline, risk-aware Gemma 4 decision support",
        "Time to Safe Outcome (Hours)"
    )

    ax.set_xticks(x)
    ax.set_xticklabels(labels)
    ax.set_ylim(0, 55)

    for bar, txt in zip(bars, annotations):
        h = bar.get_height()
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            h + 1.2,
            txt,
            ha="center", va="bottom",
            fontsize=12, color=FG, fontweight="bold"
        )

    reduction_pct = (1 - values[1] / values[0]) * 100
    ax.annotate(
        f"{reduction_pct:.0f}% faster\npath to safety",
        xy=(1, values[1]),
        xytext=(0.72, 38),
        textcoords="data",
        arrowprops=dict(arrowstyle="->", color=FG, lw=1.8),
        fontsize=13,
        color=FG,
        ha="left",
        va="center",
        bbox=dict(boxstyle="round,pad=0.4", fc="#172235", ec="#64748B", alpha=0.95)
    )

    fig.text(
        0.5, 0.02,
        "Illustrative comparison for submission storytelling: traditional workflows often require repeated calls, fragmented referrals, and delayed triage; ESIS targets immediate, offline-first stabilization planning.",
        ha="center", fontsize=10, color=NOTE
    )

    plt.tight_layout(rect=[0.02, 0.05, 0.98, 0.95])
    plt.savefig(output_path, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)
    print(f"Saved: {output_path}")

def build_time_to_housing_pathway_chart(output_path="esis_time_to_housing_pathway_chart.png"):
    labels = ["Traditional\nSystem", "ESIS +\nGemma 4"]
    # use days for scale: traditional pathway activation can take many months to years
    # ESIS accelerates pathway activation, not final housing inventory delivery
    values = [365, 3]  # days
    colors = ["#FB923C", "#34D399"]
    annotations = ["Months–Years", "Same day–72 hrs\n(pathway activation)"]

    fig, ax = plt.subplots(figsize=(12, 7), dpi=200)
    fig.patch.set_facecolor(BG)

    x = np.arange(len(labels))
    bars = ax.bar(x, values, width=0.55, edgecolor="#E5E7EB", linewidth=1.5)
    for b, c in zip(bars, colors):
        b.set_color(c)

    style_axes(
        ax,
        "ESIS Time-to-Housing Pathway Activation",
        "Accelerating the start of the correct housing pathway from months or years to hours or days",
        "Time to Pathway Activation (Days)"
    )

    ax.set_xticks(x)
    ax.set_xticklabels(labels)
    ax.set_ylim(0, 400)

    for bar, txt in zip(bars, annotations):
        h = bar.get_height()
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            h + 8,
            txt,
            ha="center", va="bottom",
            fontsize=12, color=FG, fontweight="bold"
        )

    reduction_pct = (1 - values[1] / values[0]) * 100
    ax.annotate(
        f"{reduction_pct:.0f}% faster\npathway activation",
        xy=(1, values[1]),
        xytext=(0.72, 275),
        textcoords="data",
        arrowprops=dict(arrowstyle="->", color=FG, lw=1.8),
        fontsize=13,
        color=FG,
        ha="left",
        va="center",
        bbox=dict(boxstyle="round,pad=0.4", fc="#172235", ec="#64748B", alpha=0.95)
    )

    fig.text(
        0.5, 0.02,
        "Important: ESIS does not claim to create housing inventory instantly. It accelerates triage, documentation, partner routing, and correct pathway initiation dramatically.",
        ha="center", fontsize=10, color=NOTE
    )

    plt.tight_layout(rect=[0.02, 0.05, 0.98, 0.95])
    plt.savefig(output_path, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)
    print(f"Saved: {output_path}")

if __name__ == "__main__":
    build_time_to_safety_chart()
    build_time_to_housing_pathway_chart()