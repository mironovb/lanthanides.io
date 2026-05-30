---
layout: data-page
title: "REE Import / Export Operational Framework"
description: "Operational reference for importing rare earth materials from China into the United States. Three-tier regulatory classification, US tariff stack, multiplicative pricing framework, four-axis landed-cost decomposition, and channel guidance — verified May 14, 2026."
keywords: "rare earth import US, China REE export licence, MOFCOM Announcement 18, Section 301 rare earth, NdFeB magnet tariff, dysprosium import cost, REE landed cost, rare earth procurement framework, general licence JL MAG"
permalink: /framework/
---

{% assign breadcrumb_current = "Framework" %}
{% include structured-data-breadcrumb.html %}

This is the operational counterpart to the [regulatory tracker]({{ '/regulatory/' | relative_url }}) and [pricing methodology]({{ '/methodology/' | relative_url }}). Where those pages catalogue the timeline and document how prices are collected, this page is for procurement decisions: how to classify a product into a regulatory tier, what tariff stack applies, what a realistic landed cost looks like, and which channel fits which buyer.

---

## Quick-start decision tree

Before any procurement decision, answer three questions in order:

**Q1 — What is the product's regulatory tier?**

| If the product is… | …it is | Action |
|---|---|---|
| NdPr / La / Ce oxide, polishing powder, mischmetal, cerium compounds | Tier 1 (uncontrolled) | Standard customs clearance |
| Sintered NdFeB magnet from JL MAG, Ningbo Yunsheng, Beijing Zhongke Sanhuan, or Ningbo Jintian Copper | Tier 2 (December 2025 general licence) | Verify GL number on invoice |
| Sm / Gd / Tb / Dy / Lu / Sc / Y oxides, metals, alloys, or HREE-containing NdFeB / SmCo | Tier 3 (case-by-case under MOFCOM Annc 18) | Budget 60–120 day lead time; ~50% approval rate |

**Q2 — What is the lot size relative to producer MOQ?**

| Lot | Realistic counterparty types |
|---|---|
| Sample / R&D (1–10 kg) | Alibaba gold-supplier; Western trader; Grirem R&D desk |
| Sub-container (100 kg – 5 t) | Western trader; mid-tier listed magnet maker; Shenghe trading |
| Container (10+ t) | Producer-direct possible; integrated magnet maker direct |
| Annual contract (100+ t/yr) | Producer-direct only |

**Q3 — Who is the buyer, from the Chinese seller's perspective?**

| Buyer signal | Effect |
|---|---|
| 10-year OEM contract holder | Baseline price (~1.0× index) |
| First-time Western buyer with documented use case | 1.3–2.0× index |
| Academic / SME / Western university | Often refused outright on Tier 3 |
| Defense / military end-use signal | Presumption of denial under MOFCOM Annc 18 |

The three answers together yield the regulatory pathway, the realistic counterparty type, and the expected realised price (see [Pricing](#pricing) below).

---

## Three-tier regulatory classification

The single most useful operational lens. Classify every SKU into Tier 1, 2, or 3 **before** picking Incoterm, mode, or counterparty.

| Tier | Products | Per-shipment doc cost | Licence processing | Rejection-risk premium |
|---|---|---|---|---|
| **1 — Uncontrolled** | NdPr / La / Ce oxide; cerium compounds; polishing powder; mischmetal | $300–$500 | None | 0% |
| **2 — General licence** | Sintered NdFeB magnets from JL MAG (broad), Yunsheng (partial), Sanhuan (partial), Jintian (incl. Ford) | $500–$1,200 | 5–10 days for declaration sign-off | 5–10% (GL revocation risk) |
| **3 — Case-by-case** | Sm/Gd/Tb/Dy/Lu/Sc/Y oxides, metals, alloys, compounds; Dy/Tb-containing NdFeB; SmCo magnets | $3,000–$10,000 | Statutory 45 working days; actual 60–120+ days | EV 25–50% of shipment value, or insurance-equivalent 1.0–3.0% of value/year |

**Tier 3 nuance:** Arnold Magnetic Technologies notes that *"a classification of 'no rejection' often just means the application is on hold indefinitely."* The 50% approval rate is an EU proxy from Reuters / Šefčovič (October–November 2025); MOFCOM publishes no official statistics.

---

## US-side tariff stack (May 14, 2026)

The post-February 2026 tariff landscape is materially different from H2 2025 because of the Supreme Court ruling on IEEPA. Verified stack:

| Product class | HTSUS | MFN | Section 301 | Section 122 | IEEPA | Section 232 | Total ad val |
|---|---|---|---|---|---|---|---|
| Rare-earth oxides (NdPr, Nd, Pr, La, Ce, Sm, Gd, Y…) | 2846.10 / 2846.90.* | 3.7% | 25% (List 3) | Exempt (Annex II) | None | None yet | **~28.7%** |
| Rare-earth metals (Nd, Pr, Sm, Gd, Tb, Dy, Y, Sc) | 2805.30.00 | ~5% | 25% (List 3) | Exempt (Annex II) | None | None yet | **~30%** |
| Sintered NdFeB magnets | 8505.11.0070 | 2.1% | 25% (new January 2026, USTR four-year review) | Exempt (Annex II) | None | None yet | **~27.1%** |

**Key facts behind the stack:**

- **IEEPA tariffs ended Feb 24, 2026** (12:00 AM ET) per CBP CSMS #67834313, following SCOTUS *Learning Resources, Inc. v. Trump* (6–3, opinion by Roberts) on February 20, 2026. EO 14389 terminated IEEPA-derived duties under nine prior EOs.
- **Section 122 surcharge** of 10% imposed by Proclamation 11012 (Feb 20, 2026). The "15%" widely reported in news exists only in a Truth Social post and has not been formally proclaimed. **Annex II enumerates HTSUS-level exemptions; all REE-relevant codes (2805.30, 2846.10, 2846.90.\*, 8505.11.0070) are exempt.** Cross-references in some commentary to "exemption per the USGS Critical Minerals list" are wrong — exemption is by HTSUS subheading only.
- **Section 122 is under active litigation:** US Court of International Trade ruled Proclamation 11012 ultra vires on May 7, 2026 (*Oregon v. Trump / Burlap & Barrel*, 2–1). Federal Circuit administrative stay on May 12, 2026 pending appeal. For REE-class HTSUS lines this is moot (already exempt); affects other Chinese imports.
- **Permanent magnets jumped 0% → 25% Section 301 on January 1, 2026** under the Biden-era USTR four-year-review final action (89 FR 76581). Independent of IEEPA litigation and survives.
- **Section 232 Critical Minerals Proclamation 11001 (Jan 14, 2026)** directs negotiations on processed critical minerals; status report due **July 13, 2026**. No tariff at signing date — but watch the date.
- **MPF:** 0.3464% capped at $651.50 (FY26, effective October 1, 2025).
- **HMF:** 0.125% (sea import only).
- **AD/CVD:** none outstanding against Chinese REE oxides, metals, or NdFeB as of May 2026.

**IEEPA refund process:** CBP CAPE Phase 1 launched April 20, 2026 (CSMS #68396594); first refunds began ~May 11, 2026. Importers who paid IEEPA duties Feb 2025 – Feb 24, 2026 can file via ACE Portal.

---

## China-side export controls

Verified active regime — see [/regulatory/]({{ '/regulatory/' | relative_url }}) for the full timeline. Operational summary:

| Instrument | Status May 17, 2026 |
|---|---|
| Regs on Export Control of Dual-Use Items (State Council, Oct 19, 2024; effective Dec 1, 2024) | In force; Article 49 extraterritorial reach |
| MOFCOM Announcement No. 46 (2024) — US military end-user firewall | Article 1 in force; Article 2 suspended through November 28, 2026 (by No. 72) |
| **MOFCOM Announcement No. 18 (2025)** — seven medium/heavy REEs | **In force — never suspended.** Load-bearing HREE control |
| MOFCOM Announcements 55–58, 61, 62 (2025) — extraterritorial + five more REEs (Ho, Er, Tm, Eu, Yb) | **Suspended through November 28, 2026** (by No. 70) |

**Annc 18 controlled list:** Sm, Gd, Tb, Dy, Lu, Sc, Y + metals + alloys + oxides + compounds + permanent-magnet materials containing them. Every non-Chinese transaction in these elements passes through case-by-case MOFCOM licensing.

> **All chemical forms of a controlled element are controlled.** Annc 18 is element-scope, not form-scope. Dysprosium oxide (Dy₂O₃), dysprosium-iron alloy (Dy-Fe), dysprosium fluoride (DyF₃), and dysprosium-bearing NdFeB strip-cast alloy are all licensed exports — the fact that the shipment is "an oxide" or "a compound" rather than "pure metal" does not exempt it. This matters because, for several Annc 18 elements, the **oxide is the dominant commercial trade form**: yttrium and scandium are almost never sold as pure metal, dysprosium and terbium move primarily as oxides bound for downstream magnet alloying, and Sm/Gd commodity flows are oxide-led. A buyer planning to procure "just Y₂O₃" or "just Dy₂O₃" is subject to the full Annc 18 licensing regime, identical to a buyer of the corresponding metal.

The US-side HTSUS classification is independent of this. HTSUS 2805.30 (rare-earth metals) and 2846.90.* (rare-earth compounds and mixtures) determine the *US tariff stack*, but the *Chinese export-control status* is determined by the underlying element, not the HS code. A shipment under HTSUS 2846.90.80 (rare-earth compound) containing Dy is still Tier 3 under Annc 18, even though the chapter is "inorganic chemicals" rather than "metals".

### Common commercial trade forms

For planning purposes — which form should you expect to be quoted by a Chinese supplier? Pure-metal trade is rarer than commodity discussion implies; oxide dominates several elements that are nominally "metals" in regulatory text.

| Element | Dominant trade form | Notes |
|---|---|---|
| La | Oxide (catalysts, polishing); metal (mischmetal feed) | Cheap, abundant |
| Ce | **Oxide** (polishing powder is the #1 use globally) | Metal is niche |
| Pr | Oxide; metal for NdFeB feed; Pr-Nd alloy | Both common |
| Nd | Oxide; metal for NdFeB feed; Pr-Nd alloy | Both common |
| Sm | **Oxide** dominates; Sm-Co alloy for magnets | Pure metal rare |
| Eu | **Oxide** (phosphors) | Pure metal essentially absent from trade |
| Gd | Oxide; Gd-Fe alloy | Oxide-led |
| Tb | **Oxide** (Tb₄O₇ most common); small metal market | Oxide >95% of flow |
| Dy | **Oxide** (Dy₂O₃) dominant; Dy-Fe alloy second | Magnet alloying consumes the oxide |
| Ho, Er, Tm, Yb | **Oxide** almost exclusively | Specialty / research |
| Lu | **Oxide** (PET-imaging crystal feedstock) | Metal essentially absent |
| Sc | **Oxide** (Sc₂O₃) dominant | Specialty alloys reduce oxide in-process |
| Y | **Oxide** (Y₂O₃) dominant — phosphors, ceramics, catalysts | Pure metal essentially absent |

For the seven Annc 18 elements (Sm, Gd, Tb, Dy, Lu, Sc, Y), the **bolded oxide-dominant cases all fall under case-by-case MOFCOM licensing** regardless of the buyer's intuition that "this is just a chemical compound, not a controlled metal."

### Licence-status reference — per element

What needs MOFCOM paperwork and what is open right now (May 17, 2026). The status reflects two layers: **Annc 18 of April 2025** (in force, never suspended) and the **Oct 9, 2025 package** (Annc 55–58, 61, 62 — currently suspended through November 28, 2026 by Annc 70).

Quick-jump to the element you care about (each symbol links to its detail page):

[La]({{ '/elements/La/' | relative_url }}) ·
[Ce]({{ '/elements/Ce/' | relative_url }}) ·
[Pr]({{ '/elements/Pr/' | relative_url }}) ·
[Nd]({{ '/elements/Nd/' | relative_url }}) ·
[Sm]({{ '/elements/Sm/' | relative_url }}) ·
[Eu]({{ '/elements/Eu/' | relative_url }}) ·
[Gd]({{ '/elements/Gd/' | relative_url }}) ·
[Tb]({{ '/elements/Tb/' | relative_url }}) ·
[Dy]({{ '/elements/Dy/' | relative_url }}) ·
[Ho]({{ '/elements/Ho/' | relative_url }}) ·
[Er]({{ '/elements/Er/' | relative_url }}) ·
[Tm]({{ '/elements/Tm/' | relative_url }}) ·
[Yb]({{ '/elements/Yb/' | relative_url }}) ·
[Lu]({{ '/elements/Lu/' | relative_url }}) ·
[Sc]({{ '/elements/Sc/' | relative_url }}) ·
[Y]({{ '/elements/Y/' | relative_url }})

| Element | Annc 18 (April 2025, in force) | Annc 57 (Oct 2025, suspended) | Status today |
|---|---|---|---|
| [La](/elements/La/) (lanthanum) | — | — | **Open** |
| [Ce](/elements/Ce/) (cerium) | — | — | **Open** |
| [Pr](/elements/Pr/) (praseodymium) | — | — | **Open** |
| [Nd](/elements/Nd/) (neodymium) | — | — | **Open** |
| Pm (promethium) | n/a | n/a | Not commercially traded |
| **[Sm](/elements/Sm/) (samarium)** | **Controlled** | — | **Tier 3 — case-by-case** |
| [Eu](/elements/Eu/) (europium) | — | Would be controlled (suspended) | Open until Nov 28, 2026 |
| **[Gd](/elements/Gd/) (gadolinium)** | **Controlled** | — | **Tier 3 — case-by-case** |
| **[Tb](/elements/Tb/) (terbium)** | **Controlled** | — | **Tier 3 — case-by-case** |
| **[Dy](/elements/Dy/) (dysprosium)** | **Controlled** | — | **Tier 3 — case-by-case** |
| [Ho](/elements/Ho/) (holmium) | — | Would be controlled (suspended) | Open until Nov 28, 2026 |
| [Er](/elements/Er/) (erbium) | — | Would be controlled (suspended) | Open until Nov 28, 2026 |
| [Tm](/elements/Tm/) (thulium) | — | Would be controlled (suspended) | Open until Nov 28, 2026 |
| [Yb](/elements/Yb/) (ytterbium) | — | Would be controlled (suspended) | Open until Nov 28, 2026 |
| **[Lu](/elements/Lu/) (lutetium)** | **Controlled** | — | **Tier 3 — case-by-case** |
| **[Sc](/elements/Sc/) (scandium)** | **Controlled** | — | **Tier 3 — case-by-case** |
| **[Y](/elements/Y/) (yttrium)** | **Controlled** | — | **Tier 3 — case-by-case** |

Five elements (Eu, Ho, Er, Tm, Yb) are open *only because* the Annc 70 suspension is in effect. If the suspension is not renewed at the November 28, 2026 sunset, they revert to Tier 3 automatically. A procurement plan that depends on these five elements should treat them as conditionally-open and budget for licensing risk after November 28, 2026.

Per-element status above is reconciled against the site's own regulatory data (`_data/regulatory/mofcom_18_2025.yml` and `_data/regulatory/mofcom_55_62_2025.yml`) and individual element pages. Where this table and an element's detail page disagree, the element page is canonical — file an issue.

### Licence-status reference — common downstream products

The Annc 18 trap is that a finished product *containing* a controlled element is itself controlled. This catches more downstream supply than buyers expect. The table below is **derived from the Annc 18 text and the related element-detail pages on this site**; entries marked *unambiguous* are directly confirmed by primary regulation language or the element pages, while entries marked *derived* follow the presence-based rule but are not separately litigated per product class. For specific products, the buyer's freight forwarder and CIQ inspection will make the final classification call.

| Product | Composition | Status | Confidence |
|---|---|---|---|
| NdFeB magnet — low-temp (N35–N52, no Dy/Tb) | Nd, Pr, Fe, B | Open under Annc 18; practically routed via Tier 2 GL holders for shipping predictability | Unambiguous (per element scope) |
| NdFeB magnet — mid-temp (N48H, ~1–4% Dy) | Nd, Pr, Fe, B, Dy | **Tier 3** (covered under Tier 2 GL if from JL MAG / Yunsheng / Sanhuan / Jintian) | Unambiguous ([Dy]({{ '/elements/Dy/' | relative_url }}) page confirms "finished NdFeB rotors containing Dy") |
| NdFeB magnet — high-temp (N42SH/UH/EH, Dy + Tb) | Nd, Pr, Fe, B, Dy, Tb | **Tier 3** (Tier 2 GL only) | Unambiguous |
| SmCo magnet (Sm₂Co₁₇, SmCo₅) | Sm, Co | **Tier 3** | Unambiguous ([Sm]({{ '/elements/Sm/' | relative_url }}) is on the Annc 18 list) |
| NdFeB strip-cast alloy | varies by grade | Open (no Dy/Tb) or **Tier 3** (with Dy/Tb) | Unambiguous |
| Dy-Fe / Tb-Fe master alloys | Dy or Tb + Fe | **Tier 3** | Unambiguous |
| Polishing powder (CeO₂-based) | Ce | **Open** | Unambiguous ([Ce]({{ '/elements/Ce/' | relative_url }}) not on any control list) |
| Mischmetal | Ce / La / Nd | **Open** | Unambiguous |
| FCC catalysts (zeolite-loaded La / Ce) | La, Ce | **Open** | Unambiguous |
| Y-based phosphors (Y₂O₃:Eu, YAG, YVO₄) | Y + host | **Tier 3** (presence-based rule) | Derived |
| Tb-doped phosphors (LaPO₄:Ce,Tb) | Tb + host | **Tier 3** (presence-based) | Derived |
| Eu-only phosphors (no Y host) | Eu | Open until Nov 28, 2026 | Derived (Eu in suspended Annc 57) |
| Optical glass / scintillators with Lu (LSO, LYSO) | Lu, Si, O | **Tier 3** (presence-based) | Derived |
| Sc-Al alloys | Sc, Al | **Tier 3** | Unambiguous (Sc is on Annc 18 list, alloys are explicitly covered) |
| Gd-based MRI contrast agents | Gd compounds | **Tier 3** (presence-based) | Derived |
| Yttrium-aluminum garnet (YAG) laser crystals / ceramics | Y, Al | **Tier 3** (presence-based) | Derived |
| LREE-based glass (La / Ce / Nd) | La / Ce / Nd | **Open** | Unambiguous |

> **Rule of thumb:** If the downstream product contains *any* of Sm, Gd, Tb, Dy, Lu, Sc, Y in any chemical form — oxide, metal, alloy, compound, doped lattice — it is Tier 3 under Annc 18 and requires the seller to hold the relevant export licence. The percentage of the controlled element does not matter; the regulation is presence-based, not concentration-based. For specific finished-product classifications (especially phosphors, scintillators, and medical imaging agents), consult Chinese export-control counsel before a shipment commitment — these specialised end-use categories occasionally receive narrower interpretations by CIQ.

Separately, **MOFCOM Annc 46 (December 2024)** controls Ga, Ge, Sb, and superhard materials to **US military end-users** specifically. Article 2 of No. 46 is suspended through November 28, 2026 (by Annc 72), but Article 1 — the blanket prohibition on exports of dual-use items to US military end-users — remains in force. This is a destination/end-use control rather than an element control; a civilian US buyer of Ga / Ge / Sb is not affected, but the end-use declaration matters.

### The Tier 2 cohort

Four magnet makers verified as holding 1-year customer-specific general licences (December 2025):

1. **JL MAG Rare-Earth** (300748.SZ / 6680.HK) — Dec 2, 2025, broad scope ("nearly all clients"). Only one of the four to verbatim-confirm GL status in formal annual disclosure (2025 AR filed March 25, 2026).
2. **Ningbo Yunsheng** (600366.SS) — Dec 2, 2025, partial scope. Media-attributed; not in own annual report.
3. **Beijing Zhongke Sanhuan** (000970.SZ) — Dec 2, 2025, partial scope. Media-attributed; spokesperson declined to confirm December 5, 2025.
4. **Ningbo Jintian Copper** — Dec 10, 2025. Customers reportedly include Ford (Caixin, December 13, 2025).

**Critical finding:** none of the four discloses a US-specific average selling price, and none cites premium pricing as a margin driver. The ex-China premium on HREE ($700–1,000/kg CIF Europe dysprosium vs $292/kg FOB China; up to 6× per IEA) is **supply-constraint-driven, not pricing-strategy-driven**. The premium is captured by traders and downstream resellers in the EU/US, not by Chinese producers.

### 2024 quota allocations

| Group | Mining quota | Smelting / separation quota |
|---|---|---|
| China Northern Rare Earth | 188,650 t | 170,001 t |
| China Rare Earth Group | 62,200 t rock + 19,150 t ion-adsorption | 83,999 t |
| **National total** | **270,000 t** | **254,000 t** |

Source: China Tungsten Industry Association (ctia.com.cn). 2025 quotas were issued mid-2025 without public disclosure.

### Export licensing — how a transaction actually moves

Under MOFCOM's Annc 18 regime, **only the Chinese exporter** can apply for an export licence. A foreign buyer cannot acquire one, cannot file directly with MOFCOM, and cannot bypass the seller's compliance team. The licensing transaction looks like this:

| Step | Who | Typical artefacts | Notes |
|---|---|---|---|
| 1. Request for quotation | Buyer | Spec sheet, intended quantity, destination | Seller may decline at this stage on end-use signal |
| 2. End-user certificate (EUC) preparation | Buyer | Signed by buyer's institution, naming end user and end use | Civilian / commercial only; defence end-use triggers presumption of denial |
| 3. Buyer registration package | Buyer | Business licence, BIS-style compliance attestation, importer-of-record details | Seller passes to MOFCOM with application |
| 4. MOFCOM application | Seller | Application form, HS classification, product specs, EUC, destination, intended quantity | Filed via MOFCOM's online dual-use portal |
| 5. Review | MOFCOM | Internal — no buyer-facing tracking | Statutory 45 working days; HREE applications routinely run 60–120+ days actual |
| 6. Issuance or denial | MOFCOM | Licence number for that specific shipment | Under the case-by-case regime, one licence per shipment; the four December 2025 GL holders are exempt from per-shipment filings within their GL scope |

**Critical operational implications:**

- A non-licensed seller cannot ship Tier 3 product to the US regardless of the buyer's diligence. The buyer's first qualification question is *"do you hold an Annc 18 export licence for this product and destination?"*
- Most Alibaba and Made-in-China traders are not registered Annc 18 exporters. Listings exist for HREE; deliverability does not.
- "Not yet approved" is the most common MOFCOM response on HREE applications. Arnold Magnetic Technologies and MERICS both report indefinite holds rather than formal denials. Plan procurement around worst-case timelines, not the statutory 45 working days.
- Re-application with a different end-use justification is possible after denial; new EUC, new attestation cycle.
- For the four Tier 2 GL holders, the licence is pre-issued for one year and customer-specific. Verify both the supplier's GL number **and** your customer category appear on the GL coverage — in writing on the commercial invoice — before payment.

---

<a id="pricing"></a>
## Pricing — the multiplicative framework

Reference index prices (SMM, Argus, Fastmarkets, ACREI, Baiinfo, Asian Metal) describe a domestic-Chinese-large-volume market. They are a *lower bound* for the price a small-to-medium foreign buyer actually pays — not a clearing price.

The single most useful operational equation:

> **Realised price for foreign buyer ≈ Reference print × Counterparty × Small-lot × Purity × Destination access**

| Factor | 1.0× baseline | Multiplier range | Note |
|---|---|---|---|
| Counterparty | 10-year OEM contract holder | 1.0 → 2.0 (first-time foreign); ∞ (refused) | Refusal is empirically common for academic/SME Western buyers on Tier 3 |
| Small-lot | 10 t+ container / contract | 1.0 → 5–10× (1–10 kg HREE) | LREE small lots: 1.5–4× |
| Purity | 3N / 4N standard | 1.0 → 1.5 (5N) | NdFeB feed stays at 3N–4N |
| Destination | EU | 1.0 EU / 1.3–2.0× US / 1.0–1.2× JP/KR | Post-Annc 18 destination-selective licensing |

**Empirical gap:** The Chinese-domestic print understates realised small-medium foreign buyer prices by **30–80% in steady state, 1.5–5× for HREEs or 5N grades, and 5–20× for Alibaba sample-sized lots**.

**No public per-kg HREE transaction prices exist** for the seven Announcement-18 controlled REEs to non-Chinese buyers in the April 2025 – May 2026 window. Argus and Fastmarkets publish *assessments* (surveys, not transaction prints); aggregate Chinese customs volumes are visible via CSIS analysis. Any survey of realised HREE prices to Western buyers is therefore generating *original* data, not validating existing data.

---

## Landed cost — four-axis decomposition

Better than "fixed vs variable" because it isolates the per-shipment costs that don't scale with weight or value — which is where most procurement decisions actually live.

### Axis 1 — Per-shipment (charged once per consignment)

| Bucket | USD range |
|---|---|
| Origin docs + customs broker + CIQ (China) | $280–$850 |
| Origin port THC + container stuffing | $380–$960 |
| **MOFCOM licence + EUC + legal (Tier 3 only)** | **$2,000–$10,500** |
| US customs broker + ISF + bond | $205–$585 |
| Destination THC + pier pass + drayage | $585–$1,175 |

Tier 1 typical fixed: ~$1,500–$3,500 per shipment.
Tier 3 typical fixed: ~$3,500–$14,000 per shipment.

### Axis 2 — Weight / volume variable

| Mode | Rate (May 2026) |
|---|---|
| Ocean FCL 20-ft Shanghai → LA | ~$2,000 |
| Ocean FCL 40-ft Shanghai → LA | $3,062 (Drewry WCI, May 7, 2026) |
| Ocean FCL 40-ft Shanghai → NY/NJ | $3,721 (Drewry WCI, May 7, 2026) |
| Ocean LCL | $60–$120/CBM |
| Air freight 500–1,000 kg | $4–$7/kg general; +50–150% if DG |
| Express courier (samples ≤ 30 kg) | $9–$18/kg + $80–$150 minimum |
| Marine cargo insurance | 0.10–0.30% of CIF value |

### Axis 3 — Value-variable (ad valorem)

See [tariff stack](#us-side-tariff-stack-may-14-2026) above. For REE products in May 2026: MFN 2.1–5% + Section 301 25% + MPF (capped $651.50) + HMF 0.125% (sea only). Section 122 zero (Annex II exempt). IEEPA zero (terminated).

### Axis 4 — Time-variable

| Driver | Cost |
|---|---|
| Working capital @ 8% during 28-day Shanghai-LA transit | ~$613 per $100,000 inventory |
| L/C tenor (at-sight) | 0.5–1.5% per annum + flat $300–800 per draft |
| FX hedging if RMB-denominated | ~0.06% for 30-day forward |
| Demurrage at LA / LB after free days | $175–$600/day depending on tier |
| **Licence processing delay (Tier 3)** | Statutory 45 working days; expect 60–120 days actual — dominant cost for samples |

### Worked-example landed costs

| Scenario | Ex-works | Landed US | Premium | Dominant driver |
|---|---|---|---|---|
| Bulk NdPr oxide, 5 t, Baotou → Houston, FCL | $670/kg | $870/kg | +30% | Section 301 25% |
| **Dy oxide sample, 1 kg**, Beijing → San Diego, air (Tier 3) | $2,000 | $7,800–$8,400 | +290–320% | MOFCOM licence overhead + tariffs + small-lot premium |
| NdFeB magnet container, 10 t, JL MAG → Detroit (Tier 2 GL) | $100/kg | $128/kg | +28% | Section 301 25% on magnets, January 2026 |

The middle row uses Dy *oxide* (Dy₂O₃) rather than Dy metal because oxide is the dominant commercial trade form for HREE. The licensing overhead and rejection-risk premium are identical regardless of form — what changes is the base ex-works number ($177/kg domestic for oxide vs $223/kg for metal at May 2026 SMM prints).

### Lot-size sensitivity matrix

Same product, same buyer profile, same destination — only lot size changes. Dysprosium oxide 99.5% to a US R&D buyer:

| Lot size | Mode | Realised ex-works ($/kg) | Landed ($/kg) | Multiple of SMM print ($177) |
|---:|:---|---:|---:|---:|
| 1 kg | Express courier | $12,375 | $28,895 | 163× |
| 10 kg | Air freight | $5,500 | $9,081 | 51× |
| 100 kg | Air freight | $2,640 | $4,488 | 25× |
| 1 t | Ocean LCL | $1,732 | $3,183 | 18× |
| 10 t | Ocean FCL | $1,283 | $2,758 | 16× |

The curve is brutal at the small end — and that is the framework's point. The reference price is not a buyable number for an academic 1-kg order. A buyer seeing $29K/kg for 1 kg of Dy can then choose to (a) batch with other buyers to share fixed costs, (b) substitute with low-Dy grain-boundary-diffused magnets where the application allows, or (c) buy from Lynas Malaysia rather than China at a non-China premium that may now be lower than the fully-loaded Chinese-origin number.

### DDP premium — counterintuitive finding

Bottom-up fair DDP premium over CIF vs the 8–15% industry rule-of-thumb:

| Tier | Bottom-up fair % | Negotiating posture |
|---|---|---|
| 1 (oxide bulk) | ~1.4% | Aggressively negotiate. The 8–15% rule is *expensive*. |
| 2 (magnet container) | ~8.2% | At the lower edge — fair given Section 232 imposition risk |
| 3 (HREE sample) | ~14.8% | At top — fair *if* seller absorbs licence risk |

---

## Buyer playbook by buyer type and lot size

| Buyer type × product | Best counterparty channel | Expected premium over reference |
|---|---|---|
| Academic / R&D, Tier 1 sample (1–10 kg) | Alibaba gold-supplier | 1.5–2.5× SMM print |
| Academic / R&D, Tier 3 sample (1–10 kg) | Western trader **only** — Alibaba is not a legal channel for HREE post-Annc 18 | 3–10× SMM print, 60–120 day lead |
| Small commercial buyer, Tier 1 (100 kg – 1 t) | Western trader (Tradium, LCM, GE Chaplin) | 1.5–2.5× |
| Small commercial buyer, Tier 2 magnet sample | Alibaba gold-supplier magnet shop | 1.2–3× |
| Mid-size OEM, Tier 2 magnet container | JL MAG / Yunsheng / Sanhuan / Jintian direct under general licence | ~1.0× Argus REPM |
| Mid-size OEM, Tier 3 magnet container | Japanese trading house or Western trader; Lynas Malaysia DyTb as non-China alternative | 1.5–3× plus licence overhead |
| Large OEM, container or contract | Producer-direct (Northern REE, CREG) or Tier-1 magnet maker direct | ~1.0× reference |

### When Alibaba / Made-in-China makes sense

- **Sample-quantity R&D buys** of Tier 1 (NdPr, La, Ce oxide; polishing powder; mischmetal). Filter to gold or diamond suppliers only — sub-$10/kg "Dy oxide" listings when SMM shows $177/kg are mislabelled mixed concentrate.
- **Magnets in piece counts** under ~10,000 — Ningbo, Hengdian, Dongguan magnet shops are the realistic channel.
- **Initial market discovery** — listing prices map the supply universe even when you ultimately buy elsewhere.

### When Alibaba is the wrong answer

- **Anything Tier 3 (Sm/Gd/Tb/Dy/Lu/Sc/Y).** Listings exist; deliverability does not — sellers don't hold Annc 18 export licences. Deposits get lost.
- **High-purity (4N+).** Quality verification on Alibaba is unreliable without third-party assay.
- **Anything you'd certify into a regulated product.** Chain-of-custody documentation is thin.
- **Container-scale or contract.** Markup over producer-direct (20–500%) exceeds the convenience benefit.

---

## Channels and counterparties

### Chinese producers and separators (Tier 1 upstream)

| Entity | Listing | Role |
|---|---|---|
| China Northern Rare Earth (Group) | 600111.SS | LREE-focused producer, Baotou; 2024 quota 188,650 t mining / 170,001 t smelting |
| China Rare Earth Group | 000831.SZ (subsidiary CMR Resource Tech) | Central SOE, post-December 2021 consolidation; HREE plus Sichuan LREE |
| Shenghe Resources | 600392.SS | Mixed ownership; trading + processing + Singapore / Vietnam subs; 7.7% MP Materials |
| Xiamen Tungsten | 600549.SS | REE assets in 51/49 JV with CREG |
| Grirem Advanced Materials | 688456.SS | Compounds, metals, magnets, phosphors; 5N output for R&D |

### Listed magnet makers

| Entity | Listing | Capacity | Status |
|---|---|---|---|
| JL MAG Rare-Earth | 300748.SZ / 6680.HK | Targeting 40,000 t/yr by end-2025 | Tier 2 GL holder (broad) |
| Ningbo Yunsheng | 600366.SS | ~25,000+ t/yr | Tier 2 GL holder (partial) |
| Beijing Zhongke Sanhuan | 000970.SZ | 30,000–35,000 t/yr | Tier 2 GL holder (partial) |
| Ningbo Jintian Copper | 601609.SS | New entrant | Tier 2 GL holder (incl. Ford) |
| Yantai Zhenghai | 300224.SZ | 18,000–22,000 t | Standard dual-use licence |
| DMEGC Magnetics | 002056.SZ | 15,000–20,000 t (NdFeB) + ferrite | Standard |
| AT&M (安泰科技) | 000969.SZ | Multi-thousand t; SmCo + bonded-NdFeB | Standard |
| Earth-Panda Advanced | 688077.SS | ~10,000 t | Standard |
| Galaxy Magnets | 300127.SZ | Bonded NdFeB + SmCo specialist | Standard |

### Western traders

Most are EU-based — German, UK, Austrian. The US has a thin trading layer.

| Trader | HQ | Notes |
|---|---|---|
| Tradium GmbH | Frankfurt, Germany | Pure REE / critical-minerals trader, founded 2009. Bilingual EN/DE/ZH sales team. |
| Less Common Metals (LCM) | Ellesmere Port, UK | Manufacturer + trader hybrid; strip-cast alloy plant. |
| GE Chaplin | UK | Old-line REE trader, multi-decade. |
| Treibacher Industrie | Althofen, Austria | Integrated producer / trader; ceria polishing powder, ferro-alloys. |
| Arnold Magnetic Technologies | Rochester NY, US | Magnet manufacturer (NdFeB, SmCo, Alnico). Owned by Compass Diversified. |
| Neo Performance Materials | Toronto, Canada | Producer + processor; separation plant in Estonia. |
| Mitsubishi / Sumitomo / Marubeni | Tokyo | Sogo shosha trading houses, REE is a slice of their portfolio. |

### Alternative non-China supply

Material non-Chinese HREE supply was minimal mid-2025 but is materialising through 2026:

- **Lynas Rare Earths** (ASX: LYC) — Mt Weld mine (AU) + Kuantan separation (MY). Q2 FY26: 26 t DyTb production (January 21, 2026). First commercial Dy May 16, 2025; first Tb June 18, 2025. Off-take primarily Japanese / Korean magnet makers.
- **MP Materials** (NYSE: MP) — Mountain Pass mine + Fort Worth Independence Facility magnet plant (first commercial NdFeB shipments December 2025).
- **USA Rare Earth** (Nasdaq: USAR) — Round Top (TX) project + Stillwater magnet plant; April 20, 2026 definitive agreement to acquire Serra Verde (Brazil) for ~$2.8B equity. $565M DFC financing. 15-year 100% US-government-backed SPV offtake.
- **Iluka Resources** (ASX: ILU) — Eneabba refinery (WA) under construction with Australian government backing.
- **Brazil:** Serra Verde Phase 1 nameplate 6,400 t TREO/yr expected end-2027; 2025 actual ~2,000 t (The Diplomat, May 2026).

---

## Decision-trigger calendar — 2026

Calendar these. They are decision windows, not predictions.

| Date | Event | Procurement implication |
|---|---|---|
| **July 13, 2026** | Section 232 Critical Minerals negotiations report due (Proclamation 11001) | If 232 tariffs imposed, Section 122 stacking exemption logic shifts. Pre-stockpile Tier 1 / 2 if signals emerge. |
| **July 24, 2026** | Section 122 150-day window expires absent extension | If not extended, the 10% surcharge ends entirely. (Already exempt for REE products; matters for other Chinese imports.) Verify via CBP CSMS. |
| **November 28, 2026** | Kuala Lumpur Arrangement suspensions end — MOFCOM Announcements 55–62 auto-reimpose unless renewed; 178 Section 301 exclusions expire | If suspensions lapse: extraterritorial Chinese export controls re-impose on overseas-produced goods containing Chinese REE inputs at >0.1% value. Decide pre-November 28 whether to qualify a non-Chinese precursor supplier. |
| **November 28, 2026** | MOFCOM Announcement No. 46 Article 2 suspension expires | US military end-user firewall snaps back fully. |

---

## Notes on sourcing and verification

- All Chinese-government source dates above are official publication dates per mofcom.gov.cn / mof.gov.cn / miit.gov.cn / customs.gov.cn / gov.cn primary sources.
- All US-government source dates are from Federal Register (federalregister.gov), White House proclamations archive (whitehouse.gov), or Supreme Court (supremecourt.gov).
- Price prints cite the original price reporting agency (SMM, ACREI, Argus, Fastmarkets, Baiinfo) with the print date — not the date of secondary commentary.
- The MOFCOM regulatory regime has moved on a 4–8 week cadence since April 2025. Any dated claim above is a snapshot; verify before transacting against it. The [regulatory tracker]({{ '/regulatory/' | relative_url }}) catalogues each announcement with primary-source links.

{% include disclaimer.html %}
