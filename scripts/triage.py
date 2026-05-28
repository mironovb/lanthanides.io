#!/usr/bin/env python3
"""Rule-based regulatory-significance scorer.

Replaces the manual triage step (paste-into-an-external-tool) with a
deterministic heuristic so that only material announcements fire alerts.
No external API calls. The intent is a v1 that surfaces the obvious
critical events (new MOFCOM announcement, court ruling on tariff
authority, suspension lift, new GL holder) and filters out routine
noise (quarterly statistics, ministerial speeches, conferences).

Sensitivity is 1-10, deliberately **biased low** when uncertain:

  1-3  noise / tangential   (statistics, speeches, conferences, fluff)
  4-5  routine              (known suspension extended, minor exclusion)
  6-7  material             (new controlled element, tariff change, GL holder)
  8-9  significant          (major announcement, court ruling, regime shift)
  10   critical             (novel mechanism, unexpected high-court ruling)

A false-positive alert erodes trust in the channel faster than a false
negative (which the quarterly verification round catches).

Usage:
    from scripts.triage import appraise
    result = appraise(title, body)
    if result.sensitivity >= 7:
        ...  # fire critical alert
"""
from __future__ import annotations

import re
from dataclasses import asdict, dataclass, field
from typing import Iterable


# ---------------------------------------------------------------
# Element vocabulary
# ---------------------------------------------------------------
# Each tuple: (symbol, Chinese, English full name).
TIER_3 = [
    ("Sm", "钐",  "samarium"),
    ("Gd", "钆",  "gadolinium"),
    ("Tb", "铽",  "terbium"),
    ("Dy", "镝",  "dysprosium"),
    ("Lu", "镥",  "lutetium"),
    ("Sc", "钪",  "scandium"),
    ("Y",  "钇",  "yttrium"),
]
OTHER_RE = [
    ("La", "镧",  "lanthanum"),
    ("Ce", "铈",  "cerium"),
    ("Pr", "镨",  "praseodymium"),
    ("Nd", "钕",  "neodymium"),
    ("Eu", "铕",  "europium"),
    ("Ho", "钬",  "holmium"),
    ("Er", "铒",  "erbium"),
    ("Tm", "铥",  "thulium"),
    ("Yb", "镱",  "ytterbium"),
]


def _element_present(text: str, sym: str, zh: str, en_name: str) -> bool:
    """Robust element detection across EN symbol / Chinese / English full name.

    For single-letter symbols (Y), the bare symbol is only counted when it
    appears next to a chemistry marker — to avoid 'Y' false-positives in
    unrelated prose."""
    if zh and zh in text:
        return True
    if en_name and re.search(rf"\b{en_name}\b", text, re.IGNORECASE):
        return True
    if len(sym) >= 2:
        return bool(re.search(rf"\b{re.escape(sym)}\b", text))
    # Single-letter symbol: require chemistry context within ~20 chars.
    return bool(re.search(
        rf"\b{re.escape(sym)}\b[\s\w]{{0,20}}(?:oxide|metal|alloy|2O3|compound)",
        text, re.IGNORECASE,
    ))


# ---------------------------------------------------------------
# Result type
# ---------------------------------------------------------------

@dataclass
class Appraisal:
    sensitivity: int
    category: str
    elements_affected: list[str] = field(default_factory=list)
    instruments_mentioned: list[str] = field(default_factory=list)
    headline: str = ""
    reasoning: str = ""

    def to_dict(self) -> dict:
        return asdict(self)


# ---------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------

# Strong instrument matches (+3 each)
_STRONG_INSTRUMENTS = [
    (r"MOFCOM\s+(?:Announcement|Annc)\.?\s*(?:No\.?\s*)?\d+(?:\s*[/\-]\s*\d{4})?", "MOFCOM Annc"),
    (r"商务部公告\s*\d+\s*年", "商务部公告"),
    (r"Proclamation\s+\d+",            "Presidential Proclamation"),
    (r"Executive\s+Order\s+\d+",       "Executive Order"),
    (r"USTR\s+(?:Modification|determination|notice|finding)", "USTR action"),
    (r"BIS\s+(?:adds?|lists?|determination)", "BIS action"),
]

# Medium instrument matches (weighted)
_MEDIUM_INSTRUMENTS = [
    (r"Section\s*301",              3, "Section 301"),
    (r"Section\s*232",              3, "Section 232"),
    (r"Section\s*122",              2, "Section 122"),
    (r"\bIEEPA\b",                  3, "IEEPA"),
    (r"Federal\s+Register",         1, "Federal Register"),
    (r"\bCBP\s+CSMS\b|\bCSMS\s+#?\d+", 2, "CBP CSMS"),
    (r"\bEU\s+CRMA\b|Critical\s+Raw\s+Materials\s+Act", 2, "EU CRMA"),
    # General licence / Dec-2025 cohort signals — material when they appear.
    (r"general\s+licen[sc]e\b|\bGL\s+(?:holder|coverage|cohort|cover)", 2, "general licence"),
    (r"\bJL\s+MAG\b|Yunsheng|Sanhuan|Jintian", 1, "GL-cohort holder name"),
]

# Action / regulatory-behaviour signals
_ACTION_SIGNALS = [
    (r"出口管制|export\s+control",                          2, "export-control"),
    (r"许可证|export\s+licen[sc]e",                         1, "export-licence"),
    (r"暂停|suspend(?:ed|s)?\b|suspension",                 2, "suspension"),
    (r"恢复|reinstat|reactivat",                            2, "reactivation"),
    (r"管控名单|control\s+list|controlled\s+items",         2, "control-list"),
    (r"end[-\s]?user\s+certificate\b|\bEUC\b",              1, "EUC"),
]

# Judicial signals — tiered so SCOTUS + "struck down" stack independently
# (a SCOTUS-strikes-down-tariff event is meaningfully bigger than either
# signal alone). Capped at +5 in aggregate to avoid runaway.
_JUDICIAL_HIGH = [r"Supreme\s+Court|SCOTUS"]                        # +3
_JUDICIAL_ACTION = [r"struck\s+down|invalidat(?:e|ed|ion)?"]        # +2
_JUDICIAL_OTHER = [
    r"Federal\s+Circuit|Court\s+of\s+International\s+Trade|\bCIT\b",
    r"\bcourt\s+rul(?:es|ed|ing)\b",
    r"\bv\.\s+[A-Z]\w+",                                            # case names "Foo v. Bar"
]                                                                   # +1 if any match

# Noise patterns (downweight)
_NOISE_PATTERNS = [
    r"quarterly\s+statistics?",
    r"annual\s+report\b",
    r"产量同比|出口额同比",
    r"年第\s*\d+\s*季度",
    r"industry\s+conference|trade\s+show",
    r"minister\s+visits?|访问",
    r"speech\s+at|address\s+at|spoke\s+at|讲话",
]


def appraise(title: str, body: str = "") -> Appraisal:
    """Score an article and extract structured signals."""
    text = f"{title}\n{body}"
    score: float = 1.0
    instruments: list[str] = []
    elements: list[str] = []
    reasoning: list[str] = []

    # --- instruments ---
    for pat, label in _STRONG_INSTRUMENTS:
        if re.search(pat, text, re.IGNORECASE):
            score += 3
            instruments.append(label)
    for pat, weight, label in _MEDIUM_INSTRUMENTS:
        if re.search(pat, text, re.IGNORECASE):
            score += weight
            instruments.append(label)

    # --- action / behaviour signals ---
    for pat, weight, label in _ACTION_SIGNALS:
        if re.search(pat, text, re.IGNORECASE):
            score += weight
            reasoning.append(label)

    # --- elements ---
    tier3_hits = [s for s, zh, en in TIER_3 if _element_present(text, s, zh, en)]
    other_hits = [s for s, zh, en in OTHER_RE if _element_present(text, s, zh, en)]
    score += min(len(tier3_hits), 3)                # cap +3 from Tier 3
    score += min(len(other_hits) * 0.5, 1.0)        # cap +1 from other REE
    elements.extend(tier3_hits)
    elements.extend(other_hits)

    # --- judicial (tiered, capped at +5) ---
    judicial_score = 0
    if any(re.search(p, text, re.IGNORECASE) for p in _JUDICIAL_HIGH):
        judicial_score += 3
        reasoning.append("high-court (SCOTUS)")
    if any(re.search(p, text, re.IGNORECASE) for p in _JUDICIAL_ACTION):
        judicial_score += 2
        reasoning.append("judicial action (struck down/invalidated)")
    if any(re.search(p, text, re.IGNORECASE) for p in _JUDICIAL_OTHER):
        judicial_score += 1
        reasoning.append("court signal")
    score += min(judicial_score, 5)
    is_judicial = judicial_score > 0

    # --- noise (downweight once, irrespective of how many noise patterns hit) ---
    noise_hits = sum(1 for p in _NOISE_PATTERNS if re.search(p, text, re.IGNORECASE))
    if noise_hits:
        score -= 3
        reasoning.append(f"noise-pattern match ({noise_hits})")

    # --- multi-instrument bonus ---
    if len(instruments) >= 2:
        score += 1
        reasoning.append("multiple instruments")

    sensitivity = max(1, min(10, int(round(score))))
    category = _categorize(text, instruments, is_judicial, sensitivity)

    if not reasoning:
        if instruments or elements:
            reasoning.append(f"matched: {', '.join(instruments + elements[:5]) or 'none'}")
        else:
            reasoning.append("no significant signals")

    return Appraisal(
        sensitivity=sensitivity,
        category=category,
        elements_affected=_dedupe(elements),
        instruments_mentioned=_dedupe(instruments),
        headline=title.strip()[:120],
        reasoning="; ".join(reasoning),
    )


def _categorize(text: str, instruments: list[str], is_judicial: bool, sens: int) -> str:
    t = text.lower()
    if is_judicial:
        return "court_ruling"
    if any("Section" in i or "Proclamation" in i or "Executive Order" in i
           or "USTR" in i for i in instruments):
        return "tariff"
    if "暂停" in text or re.search(r"suspend(?:ed|s)?", t):
        return "regulatory_suspension"
    if re.search(r"reinstat|reactivat|恢复", t):
        return "regulatory_new"
    if any("MOFCOM" in i or "公告" in i for i in instruments):
        return "regulatory_amendment"
    if instruments:
        return "regulatory_amendment"
    if sens >= 4:
        return "market"
    return "noise"


def _dedupe(items: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for x in items:
        if x not in seen:
            seen.add(x)
            out.append(x)
    return out
