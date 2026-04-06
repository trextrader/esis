# import numpy as np
import numpy as np
import matplotlib.pyplot as plt

BG = "#08111F"
FG = "#F8FAFC"
GRID = "#334155"
SUB = "#CBD5E1"
NOTE = "#94A3B8"

def build_chance_constraint_chart(output_path="esis_chance_constraint_feasibility.png"):
    # -----------------------------------
    # Grid definition
    # -----------------------------------
    x = np.linspace(0, 1, 220)   # intervention intensity
    y = np.linspace(0, 1, 220)   # resource feasibility
    X, Y = np.meshgrid(x, y)

    # -----------------------------------
    # Synthetic but meaningful risk field
    # Higher intensity can reduce harm up to a point,
    # but poor feasibility raises failure risk sharply.
    # -----------------------------------
    risk = (
        0.65 * (1 - Y)**1.7 +
        0.25 * (X - 0.55)**2 +
        0.08 * np.sin(5 * X) * np.cos(4 * Y)
    )

    # Normalize to [0,1]
    risk = risk - risk.min()
    risk = risk / risk.max()

    # allowable safety threshold
    epsilon = 0.35

    # -----------------------------------
    # Figure (updated to match other charts)
    # -----------------------------------
    fig, ax = plt.subplots(figsize=(12, 7), dpi=200)
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(BG)

    # Heatmap
    im = ax.contourf(
        X, Y, risk,
        levels=30,
        cmap="viridis"
    )

    # Feasibility boundary
    cs = ax.contour(
        X, Y, risk,
        levels=[epsilon],
        colors=["#F8FAFC"],
        linewidths=2.2
    )
    ax.clabel(
        cs,
        inline=True,
        fmt={epsilon: r"$P(\mathrm{Harm}_{0:72h}>\tau)=\epsilon$"},
        fontsize=11,
        colors="#F8FAFC"
    )

    # Region labels
    ax.text(
        0.72, 0.83,
        "Safe / Feasible Region",
        color="#34D399",
        fontsize=13,
        fontweight="bold",
        bbox=dict(boxstyle="round,pad=0.3", fc="#0E3B2E", ec="#34D399", alpha=0.9)
    )

    ax.text(
        0.16, 0.18,
        "Rejected / Unsafe Region",
        color="#FB923C",
        fontsize=13,
        fontweight="bold",
        bbox=dict(boxstyle="round,pad=0.3", fc="#4A1F0D", ec="#FB923C", alpha=0.9)
    )

    # Example candidate plans
    candidate_points = {
        "Plan A": (0.25, 0.35),
        "Plan B": (0.48, 0.72),
        "Plan C": (0.72, 0.80),
        "Plan D": (0.88, 0.30),
    }

    for name, (px, py) in candidate_points.items():
        ax.scatter(
            px, py,
            s=90,
            edgecolor="#F8FAFC",
            facecolor="#08111F",
            linewidth=1.5,
            zorder=5
        )
        ax.text(px + 0.015, py + 0.015, name, color="#F8FAFC", fontsize=10)

    # Titles
    ax.set_title(
        "Chance-Constrained Feasibility Region for ESIS Action Selection",
        fontsize=21,
        color=FG,
        pad=18,
        fontweight="bold"
    )

    ax.text(
        0.5, 1.02,
        "Candidate interventions are rejected when estimated 72-hour severe-harm probability exceeds the safety threshold",
        transform=ax.transAxes,
        ha="center",
        va="bottom",
        fontsize=11,
        color=SUB
    )

    # Axes
    ax.set_xlabel("Intervention Intensity / Action Aggressiveness", fontsize=13, color=FG)
    ax.set_ylabel("Resource Feasibility / Access Probability", fontsize=13, color=FG)
    ax.tick_params(axis="x", colors=SUB, labelsize=11)
    ax.tick_params(axis="y", colors=SUB, labelsize=11)

    for spine in ax.spines.values():
        spine.set_color(GRID)

    # Colorbar (reduced footprint)
    cbar = fig.colorbar(im, ax=ax, fraction=0.035, pad=0.03)
    cbar.set_label(r"Estimated $P(\mathrm{Harm}_{0:72h}>\tau)$", color=FG, fontsize=12)
    cbar.ax.yaxis.set_tick_params(color=SUB)
    plt.setp(cbar.ax.get_yticklabels(), color=SUB)

    # Footer
    fig.text(
        0.5, 0.02,
        "Illustrative decision surface for submission storytelling: ESIS converts safety from a soft preference into a hard operational constraint.",
        ha="center",
        fontsize=10,
        color=NOTE
    )

    # Layout tightened to match the other ESIS charts
    plt.tight_layout(rect=[0.02, 0.06, 0.98, 0.93])
    plt.savefig(output_path, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)

    print(f"Saved: {output_path}")


if __name__ == "__main__":
    build_chance_constraint_chart()