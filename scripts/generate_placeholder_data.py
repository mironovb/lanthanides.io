#!/usr/bin/env python3
"""Generate clearly-labeled placeholder price records for UI development."""
import json
from datetime import datetime

ELEMENTS = {
    "Nd": {"name": "Neodymium", "form": "oxide", "purity": "99.5%",
            "retail": [115, 120, 125, 130, 140], "bulk": [80, 85, 90, 95, 100]},
    "Pr": {"name": "Praseodymium", "form": "oxide", "purity": "99.5%",
            "retail": [105, 110, 115, 120, 125], "bulk": [70, 75, 78, 85, 90]},
    "Dy": {"name": "Dysprosium", "form": "oxide", "purity": "99.9%",
            "retail": [320, 340, 355, 370, 400], "bulk": [260, 275, 290, 310, 330]},
    "Tb": {"name": "Terbium", "form": "oxide", "purity": "99.9%",
            "retail": [1200, 1300, 1380, 1450, 1550], "bulk": [950, 1050, 1100, 1200, 1300]},
    "Sm": {"name": "Samarium", "form": "oxide", "purity": "99%",
            "retail": [14, 14, 15, 15, 16], "bulk": [7, 7, 8, 8, 9]},
    "Gd": {"name": "Gadolinium", "form": "oxide", "purity": "99.99%",
            "retail": [50, 52, 53, 53, 55], "bulk": [32, 34, 34, 35, 36]},
    "Y":  {"name": "Yttrium", "form": "oxide", "purity": "99.99%",
            "retail": [32, 33, 34, 35, 36], "bulk": [18, 19, 19, 20, 21]},
    "Sc": {"name": "Scandium", "form": "oxide", "purity": "99.9%",
            "retail": [4200, 4400, 4550, 4700, 5000], "bulk": [3200, 3400, 3600, 3800, 4000]},
    "Te": {"name": "Tellurium", "form": "metal", "purity": "99.99%",
            "retail": [85, 83, 81, 80, 78], "bulk": [65, 62, 60, 58, 56]},
    "V":  {"name": "Vanadium", "form": "oxide", "purity": "99%",
            "retail": [38, 37, 36, 34, 33], "bulk": [28, 26, 25, 24, 23]},
    "Ga": {"name": "Gallium", "form": "metal", "purity": "99.99%",
            "retail": [320, 340, 360, 380, 400], "bulk": [250, 270, 290, 310, 330]},
    "Ge": {"name": "Germanium", "form": "metal", "purity": "99.999%",
            "retail": [1600, 1700, 1780, 1850, 1950], "bulk": [1250, 1350, 1450, 1500, 1600]},
    "Sb": {"name": "Antimony", "form": "metal", "purity": "99.65%",
            "retail": [22, 24, 26, 27, 30], "bulk": [14, 16, 17, 20, 22]},
    "W":  {"name": "Tungsten", "form": "powder", "purity": "99.9%",
            "retail": [50, 52, 54, 56, 60], "bulk": [32, 35, 37, 40, 43]},
    "In": {"name": "Indium", "form": "metal", "purity": "99.99%",
            "retail": [340, 345, 348, 350, 355], "bulk": [240, 245, 246, 250, 255]},
    "Bi": {"name": "Bismuth", "form": "metal", "purity": "99.99%",
            "retail": [14, 13, 13, 12, 12], "bulk": [9, 8, 8, 7, 7]},
    "Mo": {"name": "Molybdenum", "form": "oxide", "purity": "99.95%",
            "retail": [65, 63, 60, 58, 56], "bulk": [45, 42, 40, 38, 36]},
}

DATES = ["2025-08-15", "2025-10-01", "2025-12-01", "2026-01-15", "2026-03-10"]

SELLER_NAMES = [
    "Pacific Rare Materials Co.", "European Strategic Metals GmbH",
    "Global Elements Supply Inc.", "Asia Minor Metals Trading",
    "Southern Cross Resources Ltd."
]
SELLER_COUNTRIES = ["CN", "DE", "US", "CN", "AU"]

records = []
rec_id = 1

for symbol, info in ELEMENTS.items():
    for i, date in enumerate(DATES):
        # Retail record
        retail_price = info["retail"][i]
        records.append({
            "id": f"PH-{rec_id:04d}",
            "element_symbol": symbol,
            "element_name": info["name"],
            "invoice_ref": None,
            "original_price_per_unit": retail_price,
            "original_currency": "USD",
            "original_unit": "kg",
            "normalized_usd_per_kg": retail_price,
            "exchange_rate_used": 1.0,
            "exchange_rate_date": date,
            "form": info["form"],
            "purity": info["purity"],
            "market_tier": "retail",
            "moq_kg": 1,
            "quoted_quantity_kg": 1,
            "incoterm": "DDP",
            "taxes_included": True,
            "shipping_included": True,
            "source_type": "placeholder",
            "source_id": "placeholder-ui-dev",
            "source_url": None,
            "seller_name": SELLER_NAMES[i % len(SELLER_NAMES)],
            "seller_country": SELLER_COUNTRIES[i % len(SELLER_COUNTRIES)],
            "verification_status": "placeholder",
            "confidence_score": 0.0,
            "notes": "PLACEHOLDER — rounded illustrative price for UI development. Will be replaced with real invoice-backed or curated public-offer data.",
            "quote_date": date,
            "ingestion_timestamp": "2026-03-26T00:00:00Z"
        })
        rec_id += 1

        # Bulk record
        bulk_price = info["bulk"][i]
        records.append({
            "id": f"PH-{rec_id:04d}",
            "element_symbol": symbol,
            "element_name": info["name"],
            "invoice_ref": None,
            "original_price_per_unit": bulk_price,
            "original_currency": "USD",
            "original_unit": "kg",
            "normalized_usd_per_kg": bulk_price,
            "exchange_rate_used": 1.0,
            "exchange_rate_date": date,
            "form": info["form"],
            "purity": info["purity"],
            "market_tier": "bulk",
            "moq_kg": 100,
            "quoted_quantity_kg": 500,
            "incoterm": "FOB",
            "taxes_included": False,
            "shipping_included": False,
            "source_type": "placeholder",
            "source_id": "placeholder-ui-dev",
            "source_url": None,
            "seller_name": SELLER_NAMES[(i + 2) % len(SELLER_NAMES)],
            "seller_country": SELLER_COUNTRIES[(i + 2) % len(SELLER_COUNTRIES)],
            "verification_status": "placeholder",
            "confidence_score": 0.0,
            "notes": "PLACEHOLDER — rounded illustrative price for UI development. Will be replaced with real invoice-backed or curated public-offer data.",
            "quote_date": date,
            "ingestion_timestamp": "2026-03-26T00:00:00Z"
        })
        rec_id += 1

# Sort by quote_date then element symbol
records.sort(key=lambda r: (r["quote_date"], r["element_symbol"]))

with open("_data/price_records.json", "w") as f:
    json.dump(records, f, indent=2, ensure_ascii=False)

print(f"Generated {len(records)} placeholder price records for {len(ELEMENTS)} elements.")
