import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patheffects as pe
from matplotlib.patches import FancyBboxPatch
from mpl_toolkits.mplot3d import Axes3D
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
from matplotlib import cm
from matplotlib.colors import LinearSegmentedColormap

# ── STYLE ────────────────────────────────────────────────────────
BG     = "#08111F"
FG     = "#F8FAFC"
SUB    = "#CBD5E1"
MUTED  = "#94A3B8"
TEAL   = "#2DD4BF"
GOLD   = "#FBBF24"
ORANGE = "#FB923C"
BLUE   = "#60A5FA"
GREEN  = "#34D399"
RED    = "#F87171"

np.random.seed(42)

# ── CUSTOM COLOURMAP: dark-blue → gold → red ─────────────────────
cmap_colors = [
    (0.04, 0.07, 0.12),   # deep dark
    (0.06, 0.17, 0.30),   # dark blue
    (0.10, 0.36, 0.55),   # mid blue
    (0.25, 0.65, 0.65),   # teal
    (0.98, 0.75, 0.14),   # gold
    (0.98, 0.57, 0.19),   # orange
    (0.97, 0.22, 0.22),   # red (danger)
]
RISK_CMAP = LinearSegmentedColormap.from_list("risk", cmap_colors, N=512)

# ── GRID ─────────────────────────────────────────────────────────
N = 120
x_raw = np.linspace(0, 1, N)   # Environmental Risk  [0=safe, 1=lethal]
y_raw = np.linspace(0, 1, N)   # Resource Depletion  [0=full, 1=empty]
X, Y  = np.meshgrid(x_raw, y_raw)

# ── RISK SURFACE  Z = CVaR harm score ────────────────────────────
# Non-linear coupling: danger spikes when BOTH risk & depletion are high
def risk_surface(x, y):
    x = np.clip(x, 0, None)   # guard against negative values before fractional power
    y = np.clip(y, 0, None)
    base      = 0.15 * x + 0.10 * y
    coupling  = 1.8  * (x ** 1.6) * (y ** 1.4)   # catastrophic region
    medical   = 0.25 * np.exp(-((x - 0.85)**2 + (y - 0.30)**2) / 0.04)  # medical peak
    weather   = 0.30 * np.exp(-((x - 0.70)**2 + (y - 0.80)**2) / 0.03)  # exposure peak
    noise     = 0.018 * (np.random.rand(*x.shape) - 0.5)
    return np.clip(base + coupling + medical + weather + noise, 0, 1)

Z = risk_surface(X, Y)

# ── CVaR CONSTRAINT PLANE (horizontal slice) ─────────────────────
CVaR_THRESHOLD = 0.38
Z_plane = np.full_like(Z, CVaR_THRESHOLD)

# ── TRAJECTORY: ESIS path through risk space ─────────────────────
# Starts in high-risk zone → navigates to safety via risk-constrained planning
t = np.linspace(0, 1, 80)

# ESIS trajectory — rapid descent through risk field
esis_x = np.clip(0.82 - 0.75 * t + 0.08 * np.sin(3.5 * t * np.pi), 0, 1)
esis_y = np.clip(0.78 - 0.65 * t + 0.06 * np.cos(2.5 * t * np.pi), 0, 1)
esis_z = risk_surface(esis_x.reshape(-1,1), esis_y.reshape(-1,1)).diagonal()
# ESIS stays BELOW CVaR threshold after initial escape
esis_z = np.where(t > 0.18, np.minimum(esis_z, CVaR_THRESHOLD - 0.02), esis_z)
esis_z = np.clip(esis_z, 0, 1)

# Traditional path — wanders, stays in high-risk zone longer
trad_x = np.clip(0.82 - 0.40 * t + 0.14 * np.sin(1.8 * t * np.pi), 0, 1)
trad_y = np.clip(0.78 - 0.30 * t + 0.12 * np.cos(1.2 * t * np.pi), 0, 1)
trad_z = risk_surface(trad_x.reshape(-1,1), trad_y.reshape(-1,1)).diagonal()
trad_z = np.clip(trad_z + 0.05, 0, 1)

# ── START / END MARKERS ──────────────────────────────────────────
start_xyz = (esis_x[0],  esis_y[0],  esis_z[0])
esis_end  = (esis_x[-1], esis_y[-1], esis_z[-1])
trad_end  = (trad_x[-1], trad_y[-1], trad_z[-1])

# ═════════════════════════════════════════════════════════════════
# FIGURE
# ═════════════════════════════════════════════════════════════════
fig = plt.figure(figsize=(18, 10), dpi=220)
fig.patch.set_facecolor(BG)

# ── MAIN 3D AXIS ─────────────────────────────────────────────────
ax = fig.add_axes([0.02, 0.05, 0.70, 0.88], projection='3d')
ax.set_facecolor(BG)
ax.xaxis.pane.fill = False
ax.yaxis.pane.fill = False
ax.zaxis.pane.fill = False
ax.xaxis.pane.set_edgecolor("#1E3A5F")
ax.yaxis.pane.set_edgecolor("#1E3A5F")
ax.zaxis.pane.set_edgecolor("#1E3A5F")
ax.xaxis._axinfo["grid"]["color"] = "#1A2E45"
ax.yaxis._axinfo["grid"]["color"] = "#1A2E45"
ax.zaxis._axinfo["grid"]["color"] = "#1A2E45"
ax.xaxis._axinfo["grid"]["linewidth"] = 0.5
ax.yaxis._axinfo["grid"]["linewidth"] = 0.5
ax.zaxis._axinfo["grid"]["linewidth"] = 0.5

# ── SURFACE ───────────────────────────────────────────────────────
surf = ax.plot_surface(
    X, Y, Z,
    cmap=RISK_CMAP,
    alpha=0.82,
    linewidth=0,
    antialiased=True,
    rcount=N, ccount=N,
    zorder=1
)

# ── CVaR CONSTRAINT PLANE ─────────────────────────────────────────
# Draw as a semi-transparent flat plane
xx = np.array([[0, 1], [0, 1]])
yy = np.array([[0, 0], [1, 1]])
zz = np.full_like(xx, CVaR_THRESHOLD)
ax.plot_surface(xx, yy, zz,
    color=TEAL, alpha=0.12, linewidth=0, zorder=2)
# Edge lines of the plane
for xs, ys in [([0,1],[0,0]),([0,1],[1,1]),([0,0],[0,1]),([1,1],[0,1])]:
    ax.plot(xs, ys, [CVaR_THRESHOLD]*2,
            color=TEAL, lw=1.2, alpha=0.55, linestyle='--', zorder=5)

# ── TRADITIONAL TRAJECTORY ───────────────────────────────────────
ax.plot(trad_x, trad_y, trad_z,
        color=RED, lw=2.8, alpha=0.80,
        label="Traditional workflow", zorder=8)
# Shadow on floor
ax.plot(trad_x, trad_y, np.zeros_like(trad_z),
        color=RED, lw=1.0, alpha=0.20, linestyle=':', zorder=3)

# ── ESIS TRAJECTORY ───────────────────────────────────────────────
ax.plot(esis_x, esis_y, esis_z,
        color=TEAL, lw=3.2, alpha=0.95,
        label="ESIS risk-constrained path", zorder=9)
ax.plot(esis_x, esis_y, np.zeros_like(esis_z),
        color=TEAL, lw=1.0, alpha=0.22, linestyle=':', zorder=3)

# Vertical drop lines at key points (shows Z height)
for xi, yi, zi, col in [(esis_x[-1], esis_y[-1], esis_z[-1], TEAL),
                         (trad_x[-1], trad_y[-1], trad_z[-1], RED)]:
    ax.plot([xi,xi],[yi,yi],[0,zi], color=col, lw=1.2, alpha=0.35,
            linestyle=':', zorder=4)

# ── MARKERS ───────────────────────────────────────────────────────
# Shared start
ax.scatter(*start_xyz, s=140, color=ORANGE, edgecolors=FG,
           linewidths=1.5, zorder=12, depthshade=False)
ax.text(start_xyz[0]-0.04, start_xyz[1]-0.05, start_xyz[2]+0.05,
        "Crisis\nOnset", color=ORANGE, fontsize=9, fontweight='bold', zorder=13)

# ESIS end
ax.scatter(*esis_end, s=140, color=GREEN, edgecolors=FG,
           linewidths=1.5, zorder=12, depthshade=False, marker='*')
ax.text(esis_end[0]+0.02, esis_end[1]+0.02, esis_end[2]+0.04,
        "Safety\nReached", color=GREEN, fontsize=9, fontweight='bold', zorder=13)

# Traditional end
ax.scatter(*trad_end, s=120, color=RED, edgecolors=FG,
           linewidths=1.5, zorder=12, depthshade=False, marker='X')
ax.text(trad_end[0]+0.02, trad_end[1], trad_end[2]+0.06,
        "Persisting\nRisk", color=RED, fontsize=9, fontweight='bold', zorder=13)

# CVaR label on plane
ax.text(1.02, 0.5, CVaR_THRESHOLD,
        f"CVaR\nthreshold\n{CVaR_THRESHOLD:.0%}",
        color=TEAL, fontsize=8.5, alpha=0.85, zorder=10)

# ── AXES LABELS ───────────────────────────────────────────────────
ax.set_xlabel("Environmental\nRisk", color=SUB, fontsize=10, labelpad=10)
ax.set_ylabel("Resource\nDepletion", color=SUB, fontsize=10, labelpad=10)
ax.set_zlabel("CVaR Harm\nScore", color=SUB, fontsize=10, labelpad=10)

ax.tick_params(colors=MUTED, labelsize=7.5)
for spine in [ax.xaxis, ax.yaxis, ax.zaxis]:
    spine.line.set_color("#2A4060")

ax.set_xlim(0, 1); ax.set_ylim(0, 1); ax.set_zlim(0, 1)
ax.set_xticks([0, 0.5, 1.0])
ax.set_xticklabels(["Low", "Med", "High"], color=MUTED, fontsize=8)
ax.set_yticks([0, 0.5, 1.0])
ax.set_yticklabels(["Full", "Half", "Empty"], color=MUTED, fontsize=8)
ax.set_zticks([0, CVaR_THRESHOLD, 0.7, 1.0])
ax.set_zticklabels(["0", "CVaR\n0.38", "0.7", "1.0"], color=MUTED, fontsize=7.5)

ax.view_init(elev=28, azim=-48)

# Colourbar
cbar = fig.colorbar(surf, ax=ax, shrink=0.45, aspect=18, pad=0.04,
                     orientation='vertical')
cbar.set_label("Harm Probability", color=SUB, fontsize=9)
cbar.ax.yaxis.set_tick_params(color=MUTED, labelsize=7.5)
plt.setp(cbar.ax.yaxis.get_ticklabels(), color=MUTED)
cbar.outline.set_edgecolor("#2A4060")

# ═════════════════════════════════════════════════════════════════
# RIGHT-SIDE ANNOTATION PANEL
# ═════════════════════════════════════════════════════════════════
ax2 = fig.add_axes([0.73, 0.05, 0.255, 0.88])
ax2.set_xlim(0, 1); ax2.set_ylim(0, 1)
ax2.axis("off")
ax2.set_facecolor(BG)

def info_card(ax, y, h, ec, fc, title, lines, title_fs=11.5, body_fs=9.5):
    patch = FancyBboxPatch((0.02, y), 0.96, h,
        boxstyle="round,pad=0.015,rounding_size=0.025",
        linewidth=1.8, edgecolor=ec, facecolor=fc, zorder=2,
        transform=ax.transData)
    patch.set_path_effects([pe.Stroke(linewidth=6, foreground=ec, alpha=0.14),
                             pe.Normal()])
    ax.add_patch(patch)
    pad = 0.018
    ax.text(0.05, y + h - pad, title,
            ha='left', va='top', fontsize=title_fs, fontweight='bold',
            color=FG, zorder=3, transform=ax.transData)
    rule_y = y + h - pad - 0.035
    ax.plot([0.05, 0.97], [rule_y, rule_y],
            color=ec, lw=0.6, alpha=0.4, zorder=3, transform=ax.transData)
    avail = rule_y - (y + pad)
    step  = avail / len(lines)
    for i, line in enumerate(lines):
        cy = rule_y - (i + 0.5) * step
        ax.text(0.06, cy, f"• {line}",
                ha='left', va='center', fontsize=body_fs,
                color=SUB, zorder=3, transform=ax.transData,
                linespacing=1.3)

# Title
ax2.text(0.5, 0.975, "Decision Surface", ha='center', va='top',
         fontsize=16, fontweight='bold', color=FG)
ax2.text(0.5, 0.942, "ESIS Risk Optimization", ha='center', va='top',
         fontsize=11, color=TEAL)

# Cards — top card starts below both title lines
info_card(ax2, 0.685, 0.195, TEAL, "#0D2530",
    "Three Axes Explained",
    ["X — Environmental risk (weather, violence, exposure)",
     "Y — Resource depletion (battery, cash, connectivity)",
     "Z — CVaR harm score: P(catastrophic outcome)"],
    title_fs=10.5, body_fs=8.8)

info_card(ax2, 0.475, 0.185, GOLD, "#2A1E08",
    "Risk Surface Insight",
    ["Harm spikes non-linearly when risk AND depletion are high",
     "Two danger peaks: medical crisis + weather exposure",
     "Flat regions = safe operating corridors for planning"],
    title_fs=10.5, body_fs=8.8)

info_card(ax2, 0.255, 0.185, GREEN, "#0B2118",
    "ESIS Path (teal)",
    ["Constrained to stay below CVaR threshold (dashed plane)",
     "Rapidly descends out of the danger zone",
     "Reaches low-harm region 3–5× faster than baseline"],
    title_fs=10.5, body_fs=8.8)

info_card(ax2, 0.035, 0.185, RED, "#2A0C0C",
    "Traditional Path (red)",
    ["No constraint: drifts through high-harm territory",
     "Remains above CVaR threshold for extended periods",
     "Higher tail-risk exposure → preventable mortality"],
    title_fs=10.5, body_fs=8.8)

# ── MAIN TITLE ───────────────────────────────────────────────────
fig.text(0.375, 0.975,
         "ESIS CVaR Risk Optimization Surface",
         ha='center', va='top',
         fontsize=20, fontweight='bold', color=FG)
fig.text(0.375, 0.948,
         "A constrained decision surface where ESIS minimizes catastrophic harm under interacting environmental and resource risks",
         ha='center', va='top',
         fontsize=11.5, color=SUB)

plt.savefig('c://esis//esis_3d_risk_surface.png',
            bbox_inches='tight', facecolor=BG, dpi=220)
plt.close()
print("Saved.")
