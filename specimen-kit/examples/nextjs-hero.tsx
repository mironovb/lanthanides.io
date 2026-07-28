"use client";

// Example: Next.js App Router page/section.
// - next/image + next/link are injected into SpecimenShowcase for optimized
//   delivery (the 700KB PNG sources ship as ~90KB AVIF at hero sizes).
// - The atom uses three.js/WebGL, so it must be client-only: import it with
//   next/dynamic({ ssr: false }) FROM A CLIENT COMPONENT (note the "use client"
//   at the top of this file).
// - Import the stylesheet once, globally (e.g. in app/layout.tsx:
//   import "@/styles/specimen-showcase.css").

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import SpecimenShowcase from "@/components/SpecimenShowcase";

const LanthanumBohrScroll = dynamic(
  () => import("@/components/LanthanumBohrScroll"),
  { ssr: false, loading: () => <div style={{ width: "100%", height: 400 }} /> }
);

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
    <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr]">
      <div>
        <h1 className="text-4xl font-bold">Your headline</h1>
        <p className="mt-4 text-gray-600">Your copy.</p>
      </div>

      <SpecimenShowcase
        items={SPECIMENS}
        style={{ height: 460 }}
        ImageComponent={Image}
        LinkComponent={Link}
        imageProps={{ priority: true, sizes: "(max-width: 1024px) 48vw, 350px" }}
      />

      {/* Elsewhere on the page (client-only): */}
      <LanthanumBohrScroll height={400} />
    </section>
  );
}
