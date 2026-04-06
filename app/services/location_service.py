from __future__ import annotations
# app/services/location_service.py
import json
import math
from pathlib import Path
from typing import Optional

_RESOURCES_PATH = Path(__file__).parent.parent.parent / "data" / "knowledge" / "colorado_resources.json"

_db: dict = {}


def _load() -> dict:
    global _db
    if not _db:
        with open(_RESOURCES_PATH) as f:
            _db = json.load(f)
    return _db


def zip_to_coords(zip_code: str) -> Optional[tuple[float, float]]:
    """Return (lat, lng) for a Colorado zip code, or None if unknown."""
    db = _load()
    coords = db["zip_to_coords"].get(str(zip_code).strip())
    if coords is None:
        return None
    # coords may be [lat, [lng]] due to JSON formatting edge cases
    lat = coords[0]
    lng = coords[1]
    if isinstance(lng, list):
        lng = lng[0]
    return float(lat), float(lng)


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance in kilometres."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def nearest_resources(
    lat: float,
    lng: float,
    max_km: float = 80.0,
    limit: int = 12,
    filter_types: Optional[list[str]] = None,
) -> list[dict]:
    """
    Return up to `limit` resources within `max_km`, sorted by distance.
    Each result dict gains 'distance_km' and 'distance_mi' keys.
    """
    db = _load()
    results = []
    for r in db["resources"]:
        rlat, rlng = r["lat"], r["lng"]
        d = haversine_km(lat, lng, rlat, rlng)
        if d <= max_km:
            if filter_types and r["type"] not in filter_types:
                continue
            entry = dict(r)
            entry["distance_km"] = round(d, 1)
            entry["distance_mi"] = round(d * 0.621371, 1)
            results.append(entry)
    results.sort(key=lambda x: x["distance_km"])
    return results[:limit]


def priority_resources_for_risk(
    lat: float,
    lng: float,
    medical_risk: float,
    exposure_risk: float,
    documentation_risk: float,
    max_km: float = 80.0,
    cannot_congregate: bool = False,
    chronic_homeless: bool = False,
    no_transport: bool = False,
) -> list[dict]:
    """
    Return resources filtered and weighted by the active risk profile.
    Higher-risk domains get their relevant resource types surfaced first.
    Non-congregate, chronic homelessness, and transport flags add dedicated resources.
    """
    type_priority: list[str] = []

    if medical_risk >= 0.5:
        type_priority += ["emergency_room", "medical"]
    if exposure_risk >= 0.5:
        type_priority += ["warming_center"]

    # Non-congregate: surface lodging/housing BEFORE shelter
    if cannot_congregate or chronic_homeless:
        type_priority += ["emergency_lodging", "housing"]

    if documentation_risk >= 0.5:
        type_priority += ["document", "legal"]

    if no_transport:
        type_priority += ["transportation"]

    # Always include crisis lines, shelter (unless congregate contraindicated), and transport
    if not cannot_congregate:
        type_priority += ["shelter"]
    type_priority += ["crisis_line", "transportation", "emergency_lodging", "housing", "shelter"]

    # Pull physical nearby resources (distance-based)
    all_nearby = nearest_resources(lat, lng, max_km=max_km, limit=20)

    # Include statewide resources (transport, HUD, vouchers) — no distance filter.
    # Only include resources whose address is explicitly "Statewide" or "App-based"
    # so physical locations far away (e.g. Pueblo walk-in center) are never force-included.
    db = _load()
    statewide = [
        r for r in db["resources"]
        if r["type"] in ("transportation", "emergency_lodging", "housing", "crisis_line")
        and r not in all_nearby
        and haversine_km(lat, lng, r["lat"], r["lng"]) > max_km
        and any(kw in r.get("address", "").lower()
                for kw in ("statewide", "app-based", "phone only", "federal"))
    ]
    for r in statewide:
        r_copy = dict(r)
        r_copy["distance_km"] = 0.0
        r_copy["distance_mi"] = 0.0
        all_nearby.append(r_copy)

    # Deduplicate while preserving priority order
    seen: set[str] = set()
    ordered: list[dict] = []
    for rtype in type_priority:
        for r in all_nearby:
            if r["id"] not in seen and r["type"] == rtype:
                seen.add(r["id"])
                ordered.append(r)

    # Add anything remaining
    for r in all_nearby:
        if r["id"] not in seen:
            ordered.append(r)

    return ordered[:20]
