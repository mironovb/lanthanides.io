// Example: plain React (Vite, CRA, Remix, Astro islands, ...).
// Copy the components + styles + assets into your project first (see
// AGENT_INSTRUCTIONS.md), then compose a hero like this.

import React from "react";
import SpecimenShowcase from "../components/SpecimenShowcase";
import LanthanumBohrScroll from "../components/LanthanumBohrScroll";
import "../styles/specimen-showcase.css";

const SPECIMENS = [
  {
    src: "/images/hero/scandium.png",
    alt: "Crystalline scandium metal specimen",
    width: 717,
    height: 549,
    symbol: "Sc",
    name: "Scandium",
    href: "/products/scandium",
  },
  {
    src: "/images/hero/tellurium.png",
    alt: "Tellurium crystal specimen",
    width: 531,
    height: 463,
    symbol: "Te",
    name: "Tellurium",
    href: "/products/tellurium",
  },
  {
    src: "/images/hero/thulium.png",
    alt: "Thulium metal specimen",
    width: 719,
    height: 577,
    symbol: "Tm",
    name: "Thulium",
    href: "/products/thulium",
  },
];

export default function Hero() {
  return (
    <section style={{ display: "grid", gap: 48, gridTemplateColumns: "1.05fr 0.95fr", alignItems: "center" }}>
      <div>
        <h1>Your headline</h1>
        <p>Your copy.</p>
      </div>

      {/* Floating specimens (height is set by the container) */}
      <SpecimenShowcase items={SPECIMENS} style={{ height: 460 }} />

      {/* Or, anywhere else on the page: the Bohr atom */}
      <LanthanumBohrScroll height={400} />
    </section>
  );
}
