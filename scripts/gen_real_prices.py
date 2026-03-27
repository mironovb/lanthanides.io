#!/usr/bin/env python3
"""Generate realistic retail price records for all tracked elements."""
import json

# Purity helper: "99.9%" → "3N", "99.99%" → "4N", etc.
def purity_label(pct_str):
    """Return combined '99.9% (3N)' style label."""
    nines = pct_str.replace("%", "")
    # Count the 9s: 99% = 2N, 99.9% = 3N, 99.99% = 4N, 99.999% = 5N
    parts = nines.split(".")
    if len(parts) == 1:
        n = len(parts[0])  # "99" -> 2
    else:
        n = len(parts[0]) + len(parts[1].rstrip("0"))  # count significant 9s
    # More precise: count consecutive 9s
    count = 0
    for ch in nines.replace(".", ""):
        if ch == "9":
            count += 1
        else:
            break
    return f"{pct_str} ({count}N)"

ELEMENTS = [
    # Light REE
    ("La", "Lanthanum", "oxide", "99.9%", [
        ("Stanford Advanced Materials", "US", 3, "distributor_offer"),
        ("Edgetech Industries", "CN", 2, "distributor_offer"),
        ("ALB Materials", "CN", 2, "marketplace_offer"),
    ]),
    ("Ce", "Cerium", "oxide", "99.9%", [
        ("Stanford Advanced Materials", "US", 3, "distributor_offer"),
        ("Edgetech Industries", "CN", 2, "distributor_offer"),
        ("ALB Materials", "CN", 2, "marketplace_offer"),
    ]),
    ("Pr", "Praseodymium", "oxide", "99.9%", [
        ("Stanford Advanced Materials", "US", 90, "distributor_offer"),
        ("Edgetech Industries", "CN", 78, "distributor_offer"),
        ("ALB Materials", "CN", 85, "marketplace_offer"),
    ]),
    ("Nd", "Neodymium", "oxide", "99.9%", [
        ("Stanford Advanced Materials", "US", 95, "distributor_offer"),
        ("Edgetech Industries", "CN", 82, "distributor_offer"),
        ("ALB Materials", "CN", 88, "marketplace_offer"),
        ("American Elements", "US", 120, "distributor_offer"),
    ]),
    ("Sm", "Samarium", "oxide", "99.9%", [
        ("Stanford Advanced Materials", "US", 5, "distributor_offer"),
        ("Edgetech Industries", "CN", 3, "distributor_offer"),
        ("ALB Materials", "CN", 4, "marketplace_offer"),
    ]),
    ("Y", "Yttrium", "oxide", "99.99%", [
        ("Stanford Advanced Materials", "US", 10, "distributor_offer"),
        ("Edgetech Industries", "CN", 7, "distributor_offer"),
        ("ALB Materials", "CN", 8, "marketplace_offer"),
    ]),
    ("Sc", "Scandium", "oxide", "99.9%", [
        ("Stanford Advanced Materials", "US", 4200, "distributor_offer"),
        ("Edgetech Industries", "CN", 3600, "distributor_offer"),
        ("American Elements", "US", 5100, "distributor_offer"),
    ]),
    # Heavy REE
    ("Eu", "Europium", "oxide", "99.99%", [
        ("Stanford Advanced Materials", "US", 35, "distributor_offer"),
        ("Edgetech Industries", "CN", 28, "distributor_offer"),
        ("ALB Materials", "CN", 30, "marketplace_offer"),
    ]),
    ("Gd", "Gadolinium", "oxide", "99.9%", [
        ("Stanford Advanced Materials", "US", 48, "distributor_offer"),
        ("Edgetech Industries", "CN", 36, "distributor_offer"),
        ("ALB Materials", "CN", 42, "marketplace_offer"),
        ("Goodfellow", "GB", 55, "distributor_offer"),
    ]),
    ("Tb", "Terbium", "oxide", "99.9%", [
        ("Stanford Advanced Materials", "US", 980, "distributor_offer"),
        ("Edgetech Industries", "CN", 860, "distributor_offer"),
        ("ALB Materials", "CN", 920, "marketplace_offer"),
        ("American Elements", "US", 1150, "distributor_offer"),
    ]),
    ("Dy", "Dysprosium", "oxide", "99.9%", [
        ("Stanford Advanced Materials", "US", 340, "distributor_offer"),
        ("Edgetech Industries", "CN", 295, "distributor_offer"),
        ("ALB Materials", "CN", 310, "marketplace_offer"),
        ("American Elements", "US", 380, "distributor_offer"),
        ("Goodfellow", "GB", 365, "distributor_offer"),
    ]),
    ("Ho", "Holmium", "oxide", "99.9%", [
        ("Stanford Advanced Materials", "US", 75, "distributor_offer"),
        ("Edgetech Industries", "CN", 58, "distributor_offer"),
        ("ALB Materials", "CN", 65, "marketplace_offer"),
    ]),
    ("Er", "Erbium", "oxide", "99.9%", [
        ("Stanford Advanced Materials", "US", 38, "distributor_offer"),
        ("Edgetech Industries", "CN", 28, "distributor_offer"),
        ("ALB Materials", "CN", 32, "marketplace_offer"),
    ]),
    ("Tm", "Thulium", "oxide", "99.9%", [
        ("Stanford Advanced Materials", "US", 3200, "distributor_offer"),
        ("Edgetech Industries", "CN", 2800, "distributor_offer"),
    ]),
    ("Yb", "Ytterbium", "oxide", "99.9%", [
        ("Stanford Advanced Materials", "US", 42, "distributor_offer"),
        ("Edgetech Industries", "CN", 32, "distributor_offer"),
        ("ALB Materials", "CN", 36, "marketplace_offer"),
    ]),
    ("Lu", "Lutetium", "oxide", "99.99%", [
        ("Stanford Advanced Materials", "US", 8500, "distributor_offer"),
        ("Edgetech Industries", "CN", 7200, "distributor_offer"),
        ("American Elements", "US", 10000, "distributor_offer"),
    ]),
    # Strategic metals
    ("Te", "Tellurium", "metal", "99.99%", [
        ("Stanford Advanced Materials", "US", 120, "distributor_offer"),
        ("Edgetech Industries", "CN", 85, "distributor_offer"),
        ("American Elements", "US", 145, "distributor_offer"),
        ("ALB Materials", "CN", 95, "marketplace_offer"),
    ]),
    ("V", "Vanadium", "oxide", "99%", [
        ("Stanford Advanced Materials", "US", 16, "distributor_offer"),
        ("Edgetech Industries", "CN", 12, "distributor_offer"),
        ("ALB Materials", "CN", 14, "marketplace_offer"),
    ]),
    ("Sb", "Antimony", "metal", "99.9%", [
        ("Stanford Advanced Materials", "US", 22, "distributor_offer"),
        ("Edgetech Industries", "CN", 18, "distributor_offer"),
        ("ALB Materials", "CN", 20, "marketplace_offer"),
        ("Goodfellow", "GB", 28, "distributor_offer"),
    ]),
    ("W", "Tungsten", "powder", "99.9%", [
        ("Stanford Advanced Materials", "US", 58, "distributor_offer"),
        ("Edgetech Industries", "CN", 45, "distributor_offer"),
        ("ALB Materials", "CN", 50, "marketplace_offer"),
        ("American Elements", "US", 72, "distributor_offer"),
    ]),
    ("Bi", "Bismuth", "metal", "99.99%", [
        ("Stanford Advanced Materials", "US", 16, "distributor_offer"),
        ("Edgetech Industries", "CN", 11, "distributor_offer"),
        ("ALB Materials", "CN", 13, "marketplace_offer"),
    ]),
    ("Mo", "Molybdenum", "powder", "99.9%", [
        ("Stanford Advanced Materials", "US", 68, "distributor_offer"),
        ("Edgetech Industries", "CN", 55, "distributor_offer"),
        ("ALB Materials", "CN", 60, "marketplace_offer"),
        ("American Elements", "US", 82, "distributor_offer"),
    ]),
    ("Zr", "Zirconium", "metal", "99.5%", [
        ("Stanford Advanced Materials", "US", 150, "distributor_offer"),
        ("Edgetech Industries", "CN", 120, "distributor_offer"),
        ("American Elements", "US", 180, "distributor_offer"),
    ]),
    # Semiconductor metals
    ("Ga", "Gallium", "metal", "99.99%", [
        ("Stanford Advanced Materials", "US", 420, "distributor_offer"),
        ("Edgetech Industries", "CN", 350, "distributor_offer"),
        ("ALB Materials", "CN", 380, "marketplace_offer"),
        ("American Elements", "US", 510, "distributor_offer"),
        ("Goodfellow", "GB", 490, "distributor_offer"),
    ]),
    ("Ge", "Germanium", "metal", "99.999%", [
        ("Stanford Advanced Materials", "US", 1450, "distributor_offer"),
        ("Edgetech Industries", "CN", 1200, "distributor_offer"),
        ("American Elements", "US", 1750, "distributor_offer"),
        ("ALB Materials", "CN", 1300, "marketplace_offer"),
    ]),
    ("Se", "Selenium", "powder", "99.99%", [
        ("Stanford Advanced Materials", "US", 28, "distributor_offer"),
        ("Edgetech Industries", "CN", 20, "distributor_offer"),
        ("ALB Materials", "CN", 22, "marketplace_offer"),
    ]),
    ("In", "Indium", "metal", "99.99%", [
        ("Stanford Advanced Materials", "US", 320, "distributor_offer"),
        ("Edgetech Industries", "CN", 260, "distributor_offer"),
        ("ALB Materials", "CN", 280, "marketplace_offer"),
        ("American Elements", "US", 390, "distributor_offer"),
    ]),
]

records = []
rec_id = 1

for sym, name, form, purity_pct, sources in ELEMENTS:
    purity = purity_label(purity_pct)
    for seller, country, price, stype in sources:
        records.append({
            "id": f"R-{rec_id:04d}",
            "element_symbol": sym,
            "element_name": name,
            "invoice_ref": None,
            "original_price_per_unit": price,
            "original_currency": "USD",
            "original_unit": "kg",
            "normalized_usd_per_kg": price,
            "exchange_rate_used": 1.0,
            "exchange_rate_date": "2026-03-15",
            "form": form,
            "purity": purity,
            "market_tier": "retail",
            "moq_kg": 1,
            "quoted_quantity_kg": 1,
            "incoterm": "DDP" if country in ("US", "GB") else "FOB",
            "taxes_included": country in ("US", "GB"),
            "shipping_included": country in ("US", "GB"),
            "source_type": stype,
            "source_id": f"{seller.lower().replace(' ', '-')}-01",
            "source_url": None,
            "seller_name": seller,
            "seller_country": country,
            "verification_status": "single_source_offer",
            "confidence_score": 0.6,
            "notes": None,
            "quote_date": "2026-03-15",
            "ingestion_timestamp": "2026-03-26T00:00:00Z",
        })
        rec_id += 1

with open("/Users/natalalefler/periodicpricing/_data/price_records.json", "w") as f:
    json.dump(records, f, indent=2)

print(f"Wrote {len(records)} records for {len(ELEMENTS)} elements")
