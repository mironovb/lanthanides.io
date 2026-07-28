/**
 * Pure validation vocabulary for the marketplace loaders: static sets, regexes,
 * and type-narrowing predicates (DESIGN §3, `validate.ts`).
 *
 * No `fs`, no state, no side effects beyond the two size assertions at module
 * load (a typo'd duplicate in a hand-written list would silently shrink a Set
 * and start rejecting valid data; asserting the exact size catches that at
 * first import instead). Everything here is shared by `load.ts` and
 * `load-listings.ts`; keep it importable from anywhere, including tests.
 */

/**
 * Listing slug / seller handle shape (DESIGN §2.4). Lowercase-only is not a
 * style rule: `Dy-metal.md` and `dy-metal.md` are the same file on macOS's
 * case-insensitive default filesystem and would clobber each other in a PR
 * while both resolving in CI on Linux. Length limits are enforced at the call
 * sites (slugs 3-80, handles 2-32).
 */
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Calendar date, 'YYYY-MM-DD'. Always a quoted string in YAML (DESIGN §2.5). */
export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Month precision, 'YYYY-MM' — permitted for provenance dates only. */
export const YEAR_MONTH_RE = /^\d{4}-\d{2}$/;

/**
 * Route segments a listing slug must never claim (DESIGN §2.4 rule 4).
 * `sellers` is the load-bearing one: `/marketplace/sellers/` is a static route
 * segment Next resolves ahead of `/marketplace/[slug]/`, so a listing slugged
 * `sellers` would be permanently unreachable.
 */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  'sellers',
  'page',
  'index',
  'api',
  'new',
  'search',
  'all',
]);

// ── Periodic table ───────────────────────────────────────────────────────────

/**
 * All 118 element symbols, H(1)..Og(118), case-sensitive canonical form.
 * The full table, not the site's 31-element catalog: the seed store sells Cd,
 * W, V, Bi, Te, … (PLAN "Schema deltas"). The catalog intersection that drives
 * `/elements/<Sym>/` cross-links is derived separately (`catalogElements`).
 */
const PERIODIC_SYMBOL_LIST = [
  // 1-10
  'H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne',
  // 11-20
  'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca',
  // 21-30
  'Sc', 'Ti', 'V', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Zn',
  // 31-40
  'Ga', 'Ge', 'As', 'Se', 'Br', 'Kr', 'Rb', 'Sr', 'Y', 'Zr',
  // 41-50
  'Nb', 'Mo', 'Tc', 'Ru', 'Rh', 'Pd', 'Ag', 'Cd', 'In', 'Sn',
  // 51-60
  'Sb', 'Te', 'I', 'Xe', 'Cs', 'Ba', 'La', 'Ce', 'Pr', 'Nd',
  // 61-70
  'Pm', 'Sm', 'Eu', 'Gd', 'Tb', 'Dy', 'Ho', 'Er', 'Tm', 'Yb',
  // 71-80
  'Lu', 'Hf', 'Ta', 'W', 'Re', 'Os', 'Ir', 'Pt', 'Au', 'Hg',
  // 81-90
  'Tl', 'Pb', 'Bi', 'Po', 'At', 'Rn', 'Fr', 'Ra', 'Ac', 'Th',
  // 91-100
  'Pa', 'U', 'Np', 'Pu', 'Am', 'Cm', 'Bk', 'Cf', 'Es', 'Fm',
  // 101-110
  'Md', 'No', 'Lr', 'Rf', 'Db', 'Sg', 'Bh', 'Hs', 'Mt', 'Ds',
  // 111-118
  'Rg', 'Cn', 'Nh', 'Fl', 'Mc', 'Lv', 'Ts', 'Og',
];

export const PERIODIC_SYMBOLS: ReadonlySet<string> = new Set(PERIODIC_SYMBOL_LIST);

const SYMBOL_BY_LOWER: ReadonlyMap<string, string> = new Map(
  PERIODIC_SYMBOL_LIST.map((s) => [s.toLowerCase(), s]),
);

/**
 * Case-insensitive lookup of the canonical element symbol ('sc' → 'Sc'), or
 * null when the value is not an element at all. Used only to sharpen the
 * error message; validation itself is case-sensitive.
 */
export function canonicalElementSymbol(value: string): string | null {
  return SYMBOL_BY_LOWER.get(value.toLowerCase()) ?? null;
}

// ── ISO-3166-1 alpha-2 ───────────────────────────────────────────────────────

/**
 * The 249 officially assigned ISO-3166-1 alpha-2 codes, uppercase. User-assigned
 * codes (XK, …) are deliberately absent: a provenance country must be a real,
 * citable jurisdiction or null ("Not stated").
 */
const ISO_COUNTRY_LIST = `
  AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ
  BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ
  CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ
  DE DJ DK DM DO DZ
  EC EE EG EH ER ES ET
  FI FJ FK FM FO FR
  GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY
  HK HM HN HR HT HU
  ID IE IL IM IN IO IQ IR IS IT
  JE JM JO JP
  KE KG KH KI KM KN KP KR KW KY KZ
  LA LB LC LI LK LR LS LT LU LV LY
  MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ
  NA NC NE NF NG NI NL NO NP NR NU NZ
  OM
  PA PE PF PG PH PK PL PM PN PR PS PT PW PY
  QA
  RE RO RS RU RW
  SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ
  TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ
  UA UG UM US UY UZ
  VA VC VE VG VI VN VU
  WF WS
  YE YT
  ZA ZM ZW
`
  .split(/\s+/)
  .filter(Boolean);

export const ISO_COUNTRIES: ReadonlySet<string> = new Set(ISO_COUNTRY_LIST);

// Guard the hand-written lists: a duplicate entry would dedupe silently and a
// dropped one would reject valid data. Fails at first import, i.e. at build.
if (PERIODIC_SYMBOLS.size !== 118) {
  throw new Error(
    `[lib/marketplace] PERIODIC_SYMBOLS must contain exactly 118 symbols (got ${PERIODIC_SYMBOLS.size})`,
  );
}
if (ISO_COUNTRIES.size !== 249) {
  throw new Error(
    `[lib/marketplace] ISO_COUNTRIES must contain exactly 249 codes (got ${ISO_COUNTRIES.size})`,
  );
}

// ── Predicates ───────────────────────────────────────────────────────────────

export function isInteger(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v);
}

export function isPositiveInteger(v: unknown): v is number {
  return isInteger(v) && v > 0;
}

export function isNonNegativeInteger(v: unknown): v is number {
  return isInteger(v) && v >= 0;
}

export function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/** Non-empty after trimming: `"  "` is as missing as `""`. */
export function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}
