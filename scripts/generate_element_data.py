#!/usr/bin/env python3
"""Generate individual _data/elements/*.yml files from existing data sources.

Reads element_catalog data (embedded), price_records.json, and regulatory/supply
intelligence to produce one YAML file per element with a consistent schema.

This is a one-time generation script. Prices are derived ONLY from existing
price_records.json — nothing is invented.
"""

import json
import statistics
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
PRICE_RECORDS = PROJECT_ROOT / "_data" / "price_records.json"
OUTPUT_DIR = PROJECT_ROOT / "_data" / "elements"

# ── Element catalog (from element_catalog.yml) ────────────────────────────

ELEMENTS = {
    "La": {"name": "Lanthanum", "atomic_number": 57, "category": "rare_earth_light",
            "notes": "Used in catalysts, optics, and battery electrodes."},
    "Ce": {"name": "Cerium", "atomic_number": 58, "category": "rare_earth_light",
            "notes": "Most abundant REE. Used in catalytic converters, polishing powders, and glass."},
    "Pr": {"name": "Praseodymium", "atomic_number": 59, "category": "rare_earth_light",
            "notes": "Co-produced with neodymium; used in magnets and ceramics."},
    "Nd": {"name": "Neodymium", "atomic_number": 60, "category": "rare_earth_light",
            "notes": "Critical for NdFeB permanent magnets."},
    "Sm": {"name": "Samarium", "atomic_number": 62, "category": "rare_earth_light",
            "notes": "Key component of SmCo permanent magnets."},
    "Y":  {"name": "Yttrium", "atomic_number": 39, "category": "rare_earth_light",
            "notes": "Used in ceramics, phosphors, and superconductors."},
    "Sc": {"name": "Scandium", "atomic_number": 21, "category": "rare_earth_light",
            "notes": "Used in aluminum-scandium alloys for aerospace."},
    "Eu": {"name": "Europium", "atomic_number": 63, "category": "rare_earth_heavy",
            "notes": "Used in phosphors for displays and lighting."},
    "Gd": {"name": "Gadolinium", "atomic_number": 64, "category": "rare_earth_heavy",
            "notes": "Used in MRI contrast agents and nuclear reactor shielding."},
    "Tb": {"name": "Terbium", "atomic_number": 65, "category": "rare_earth_heavy",
            "notes": "Critical for NdFeB magnet coercivity at high temperatures."},
    "Dy": {"name": "Dysprosium", "atomic_number": 66, "category": "rare_earth_heavy",
            "notes": "Essential additive for high-temperature NdFeB magnets."},
    "Ho": {"name": "Holmium", "atomic_number": 67, "category": "rare_earth_heavy",
            "notes": "Highest magnetic moment of any element. Critical for medical lasers; emerged as Dy/Tb substitute in permanent magnets."},
    "Er": {"name": "Erbium", "atomic_number": 68, "category": "rare_earth_heavy",
            "notes": "Used in fiber optic amplifiers and glass colorant."},
    "Tm": {"name": "Thulium", "atomic_number": 69, "category": "rare_earth_heavy",
            "notes": "Surgical lasers, S-band telecom amplifiers, portable X-ray sources."},
    "Yb": {"name": "Ytterbium", "atomic_number": 70, "category": "rare_earth_heavy",
            "notes": "Used in fiber lasers, metallurgy, and atomic clocks."},
    "Lu": {"name": "Lutetium", "atomic_number": 71, "category": "rare_earth_heavy",
            "notes": "Rarest naturally occurring lanthanide. Underpins Lu-177 radiopharmaceuticals and PET scanner crystals (LYSO/LSO)."},
    "Te": {"name": "Tellurium", "atomic_number": 52, "category": "strategic_metal",
            "notes": "Critical for CdTe thin-film solar cells and thermoelectrics. Byproduct of copper refining; supply cannot scale independently."},
    "V":  {"name": "Vanadium", "atomic_number": 23, "category": "strategic_metal",
            "notes": "HSLA steel strengthener, Ti-6Al-4V aerospace alloy, and VRFB grid-scale energy storage."},
    "Sb": {"name": "Antimony", "atomic_number": 51, "category": "strategic_metal",
            "notes": "Used in flame retardants, lead-acid batteries, and ammunition."},
    "W":  {"name": "Tungsten", "atomic_number": 74, "category": "strategic_metal",
            "notes": "Highest melting point of all metals; used in cutting tools and armor."},
    "Bi": {"name": "Bismuth", "atomic_number": 83, "category": "strategic_metal",
            "notes": "Lead-free solder alternative; used in pharmaceuticals and cosmetics."},
    "Mo": {"name": "Molybdenum", "atomic_number": 42, "category": "strategic_metal",
            "notes": "Key alloying element in high-strength steels and superalloys."},
    "Zr": {"name": "Zirconium", "atomic_number": 40, "category": "strategic_metal",
            "notes": "Used in nuclear fuel cladding, ceramics, and chemical processing."},
    "Ta": {"name": "Tantalum", "atomic_number": 73, "category": "strategic_metal",
            "notes": "Critical for capacitors in microelectronics and superalloy components. Conflict mineral under Dodd-Frank Section 1502."},
    "Nb": {"name": "Niobium", "atomic_number": 41, "category": "strategic_metal",
            "notes": "~90% goes into HSLA steel. Also used in superconducting magnets and aerospace alloys. Brazil (CBMM) controls ~90% of supply."},
    "Co": {"name": "Cobalt", "atomic_number": 27, "category": "strategic_metal",
            "notes": "Essential for Li-ion battery cathodes (NMC, NCA). ~74% mined in DRC; ~80% refined in China."},
    "Li": {"name": "Lithium", "atomic_number": 3, "category": "strategic_metal",
            "notes": "Underpins EV and grid storage — Li-ion batteries ~80% of demand. Price collapsed ~80% from 2022 peak."},
    "Ga": {"name": "Gallium", "atomic_number": 31, "category": "semiconductor_metal",
            "notes": "Essential for GaAs and GaN semiconductors."},
    "Ge": {"name": "Germanium", "atomic_number": 32, "category": "semiconductor_metal",
            "notes": "Used in fiber optics, infrared optics, and semiconductors."},
    "Se": {"name": "Selenium", "atomic_number": 34, "category": "semiconductor_metal",
            "notes": "Used in glass manufacturing, electronics, and solar cells."},
    "In": {"name": "Indium", "atomic_number": 49, "category": "semiconductor_metal",
            "notes": "Critical for ITO coatings in displays and touchscreens."},
}

# ── Regulatory mappings ───────────────────────────────────────────────────

REGULATORY = {
    # MOFCOM/GAC No. 18/2025 — active (Apr 2025)
    "Sm": {"status_code": "active", "notices": ["MOFCOM/GAC No. 18/2025"], "last_updated": "2025-04-04"},
    "Gd": {"status_code": "active", "notices": ["MOFCOM/GAC No. 18/2025"], "last_updated": "2025-04-04"},
    "Tb": {"status_code": "active", "notices": ["MOFCOM/GAC No. 18/2025"], "last_updated": "2025-04-04"},
    "Dy": {"status_code": "active", "notices": ["MOFCOM/GAC No. 18/2025"], "last_updated": "2025-04-04"},
    "Lu": {"status_code": "active", "notices": ["MOFCOM/GAC No. 18/2025"], "last_updated": "2025-04-04"},
    "Sc": {"status_code": "active", "notices": ["MOFCOM/GAC No. 18/2025"], "last_updated": "2025-04-04"},
    "Y":  {"status_code": "active", "notices": ["MOFCOM/GAC No. 18/2025"], "last_updated": "2025-04-04"},
    # MOFCOM/GAC No. 10/2025 — active (Feb 2025)
    "Te": {"status_code": "active", "notices": ["MOFCOM/GAC No. 10/2025"], "last_updated": "2025-02-04"},
    "W":  {"status_code": "active", "notices": ["MOFCOM/GAC No. 10/2025"], "last_updated": "2025-02-04"},
    "Bi": {"status_code": "active", "notices": ["MOFCOM/GAC No. 10/2025"], "last_updated": "2025-02-04"},
    "Mo": {"status_code": "active", "notices": ["MOFCOM/GAC No. 10/2025"], "last_updated": "2025-02-04"},
    "In": {"status_code": "active", "notices": ["MOFCOM/GAC No. 10/2025"], "last_updated": "2025-02-04"},
    # MOFCOM No. 46/2024 — active (presumptive denial for US military end-use)
    "Ga": {"status_code": "active", "notices": ["MOFCOM No. 46/2024", "MOFCOM/GAC No. 23/2023"], "last_updated": "2024-12-03"},
    "Ge": {"status_code": "active", "notices": ["MOFCOM No. 46/2024", "MOFCOM/GAC No. 23/2023"], "last_updated": "2024-12-03"},
    "Sb": {"status_code": "active", "notices": ["MOFCOM No. 46/2024", "MOFCOM/GAC No. 33/2024"], "last_updated": "2024-12-03"},
    # MOFCOM Nos. 55-62/2025 — suspended until Nov 2026
    "Ho": {"status_code": "suspended", "notices": ["MOFCOM Nos. 55-62/2025 (suspended by Nos. 70, 72/2025)"], "last_updated": "2025-11-09"},
    "Er": {"status_code": "suspended", "notices": ["MOFCOM Nos. 55-62/2025 (suspended by Nos. 70, 72/2025)"], "last_updated": "2025-11-09"},
    "Tm": {"status_code": "suspended", "notices": ["MOFCOM Nos. 55-62/2025 (suspended by Nos. 70, 72/2025)"], "last_updated": "2025-11-09"},
    "Eu": {"status_code": "suspended", "notices": ["MOFCOM Nos. 55-62/2025 (suspended by Nos. 70, 72/2025)"], "last_updated": "2025-11-09"},
    "Yb": {"status_code": "suspended", "notices": ["MOFCOM Nos. 55-62/2025 (suspended by Nos. 70, 72/2025)"], "last_updated": "2025-11-09"},
}

# ── Supply chain notes (from alternative_supply.yml) ─────────────────────

SUPPLY_NOTES = {
    "Nd": "Non-China supply <15% of global. Lynas (AU, ~10kt/yr REO), MP Materials (US, restarting). No NdFeB substitute. Ferrite magnets offer inferior performance.",
    "Dy": "Myanmar supplies ~40% of China's ionic clay feedstock (disrupted since late 2025). Northern Minerals (AU) pre-commercial. Grain boundary diffusion reduces Dy content by 30-50%.",
    "Ga": "Japan (Dowa, Mitsubishi Chemical) ~10% of global via zinc recovery. South Korea emerging. Si can replace GaAs in some RF; no GaN substitute. China controls ~80% primary production.",
    "Ge": "Umicore (Belgium) significant recycling capacity. Teck Resources (Canada) zinc by-product. Recycling provides ~30% of refined supply. Si replacing Ge in some IR optics.",
    "W":  "Vietnam (Masan, Nui Phao) ~5,000 t/yr. Rwanda artisanal mining (conflict mineral concerns). Mo substitutes in some steel alloys; no cemented carbide substitute. China controls ~80%.",
}

# ── YAML generation ───────────────────────────────────────────────────────

def yaml_str(value):
    """Format a Python value as a YAML string."""
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, str):
        if any(c in value for c in ":{}[]&*?|>!%@`,'\"#"):
            escaped = value.replace('"', '\\"')
            return f'"{escaped}"'
        return value
    return str(value)


def yaml_list(items, indent=4):
    """Format a list as YAML."""
    if not items:
        return "[]"
    prefix = " " * indent
    lines = [f"\n{prefix}- {yaml_str(item)}" for item in items]
    return "".join(lines)


def compute_retail_reference(records):
    """Compute retail reference from existing price records."""
    retail = [
        r for r in records
        if r.get("normalized_usd_per_kg") is not None
        and r.get("market_tier") == "retail"
    ]
    if not retail:
        return None

    prices = [r["normalized_usd_per_kg"] for r in retail]
    median_price = round(statistics.median(prices), 2)
    sources = sorted(set(r.get("seller_name", "Unknown") for r in retail))
    dates = sorted(set(r.get("quote_date", "") for r in retail if r.get("quote_date")))
    forms = sorted(set(r.get("form", "unknown") for r in retail))

    source_str = ", ".join(sources[:4])
    if len(sources) > 4:
        source_str += f" + {len(sources) - 4} more"

    return {
        "price_per_kg": median_price,
        "source": f"Median of {len(retail)} retail offers ({source_str})",
        "date": dates[-1] if dates else None,
        "form": forms[0] if len(forms) == 1 else ", ".join(forms),
        "quantity_basis": "1 kg MOQ, retail",
    }


def compute_bulk_benchmark(records):
    """Compute bulk benchmark from existing price records."""
    bulk = [
        r for r in records
        if r.get("normalized_usd_per_kg") is not None
        and r.get("market_tier") == "bulk"
    ]
    if not bulk:
        return None

    prices = [r["normalized_usd_per_kg"] for r in bulk]
    median_price = round(statistics.median(prices), 2)
    sources = sorted(set(r.get("seller_name", "Unknown") for r in bulk))
    dates = sorted(set(r.get("quote_date", "") for r in bulk if r.get("quote_date")))

    return {
        "price_per_kg": median_price,
        "source": f"Median of {len(bulk)} bulk offers ({', '.join(sources[:3])})",
        "date": dates[-1] if dates else None,
        "terms": bulk[0].get("incoterm", "FOB"),
    }


def generate_yaml(sym, info, retail_ref, bulk_ref, reg, supply_note):
    """Generate YAML content for a single element."""
    lines = [
        f"# {info['name']} ({sym}) — Element Data",
        f"# Auto-generated from existing price records and catalog data",
        "",
        f"symbol: {sym}",
        f"name: {info['name']}",
        f"atomic_number: {info['atomic_number']}",
        f"category: {info['category']}",
        "",
    ]

    # retail_reference
    if retail_ref:
        lines.append("retail_reference:")
        lines.append(f"  price_per_kg: {retail_ref['price_per_kg']}")
        lines.append(f"  source: {yaml_str(retail_ref['source'])}")
        lines.append(f"  date: {yaml_str(retail_ref['date'])}")
        lines.append(f"  form: {yaml_str(retail_ref['form'])}")
        lines.append(f"  quantity_basis: {yaml_str(retail_ref['quantity_basis'])}")
    else:
        lines.append("retail_reference: null")
    lines.append("")

    # bulk_benchmark
    if bulk_ref:
        lines.append("bulk_benchmark:")
        lines.append(f"  price_per_kg: {bulk_ref['price_per_kg']}")
        lines.append(f"  source: {yaml_str(bulk_ref['source'])}")
        lines.append(f"  date: {yaml_str(bulk_ref['date'])}")
        lines.append(f"  terms: {yaml_str(bulk_ref['terms'])}")
    else:
        lines.append("bulk_benchmark: null")
    lines.append("")

    # retail_premium_ratio
    if retail_ref and bulk_ref and bulk_ref["price_per_kg"] > 0:
        ratio = round(retail_ref["price_per_kg"] / bulk_ref["price_per_kg"], 2)
        lines.append(f"retail_premium_ratio: {ratio}")
    else:
        lines.append("retail_premium_ratio: null")
    lines.append("")

    # regulatory_status
    lines.append("regulatory_status:")
    lines.append(f"  status_code: {reg['status_code']}")
    notices = reg.get("notices", [])
    lines.append(f"  active_notices: {yaml_list(notices) if notices else '[]'}")
    lines.append(f"  last_updated: {yaml_str(reg.get('last_updated'))}")
    lines.append("")

    # applications_summary
    lines.append(f"applications_summary: {yaml_str(info['notes'])}")
    lines.append("")

    # supply_chain_notes
    if supply_note:
        lines.append(f"supply_chain_notes: {yaml_str(supply_note)}")
    else:
        lines.append("supply_chain_notes: null")
    lines.append("")

    return "\n".join(lines)


def main():
    # Load price records
    with open(PRICE_RECORDS, "r", encoding="utf-8") as f:
        all_records = json.load(f)

    # Group by element symbol
    by_element = {}
    for r in all_records:
        sym = r.get("element_symbol")
        if sym:
            by_element.setdefault(sym, []).append(r)

    # Generate YAML for each element
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    count = 0

    for sym in sorted(ELEMENTS.keys()):
        info = ELEMENTS[sym]
        records = by_element.get(sym, [])

        retail_ref = compute_retail_reference(records)
        bulk_ref = compute_bulk_benchmark(records)
        reg = REGULATORY.get(sym, {"status_code": "none", "notices": [], "last_updated": None})
        supply_note = SUPPLY_NOTES.get(sym)

        yaml_content = generate_yaml(sym, info, retail_ref, bulk_ref, reg, supply_note)
        output_path = OUTPUT_DIR / f"{sym}.yml"
        output_path.write_text(yaml_content, encoding="utf-8")
        count += 1

        n_records = len(records)
        price_str = f"${retail_ref['price_per_kg']}/kg" if retail_ref else "no price data"
        print(f"  {sym:3s} ({info['name']:15s}) — {n_records:3d} records, {price_str}, reg: {reg['status_code']}")

    print(f"\nGenerated {count} element YAML files in {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
