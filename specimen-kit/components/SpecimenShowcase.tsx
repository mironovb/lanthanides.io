"use client";

// SpecimenShowcase: three floating specimen cutouts with hover-revealed element
// chips. Framework-agnostic React: renders plain <img>/<a> by default; inject
// framework primitives (next/image, next/link) via props when available.
//
// Requires: styles/specimen-showcase.css imported once, globally.
// Layout: items[0] top-left, items[1] top-right, items[2] bottom-center.

import React from "react";

export interface SpecimenItem {
  /** Public URL of the transparent PNG (e.g. /images/hero/scandium.png). */
  src: string;
  alt: string;
  /** Intrinsic pixel dimensions of the image file (prevents layout shift). */
  width: number;
  height: number;
  /** Element symbol shown in the chip, e.g. "Sc". */
  symbol: string;
  /** Element name shown in the chip, e.g. "Scandium". */
  name: string;
  /** Optional link target (e.g. the product page). Renders a plain div if omitted. */
  href?: string;
}

export interface SpecimenShowcaseProps {
  /** Exactly three items are displayed; extras are ignored. */
  items: SpecimenItem[];
  className?: string;
  style?: React.CSSProperties;
  /** Swap in a framework image, e.g. next/image's Image. Default: "img". */
  ImageComponent?: React.ElementType;
  /** Swap in a framework link, e.g. next/link's Link. Default: "a". */
  LinkComponent?: React.ElementType;
  /** Extra props forwarded to every image (e.g. { priority: true, sizes: "40vw" }). */
  imageProps?: Record<string, unknown>;
}

const SLOT_CLASSES = ["specimen-slot-1", "specimen-slot-2", "specimen-slot-3"];
const FLOAT_CLASSES = ["", "specimen-float-2", "specimen-float-3"];

// Injected components (next/image, next/link, plain "img"/"a") have incompatible
// prop types, so they are normalized to a loosely-typed component for rendering.
// The runtime values pass through unchanged.
type LooseProps = Record<string, unknown> & { children?: React.ReactNode };
type LooseComponent = React.ComponentType<LooseProps>;

export default function SpecimenShowcase({
  items,
  className = "",
  style,
  ImageComponent = "img",
  LinkComponent = "a",
  imageProps = {},
}: SpecimenShowcaseProps) {
  const Img = ImageComponent as unknown as LooseComponent;
  return (
    <div className={`specimen-showcase ${className}`.trim()} style={style}>
      {items.slice(0, 3).map((item, i) => {
        const Wrapper = (item.href ? LinkComponent : "div") as unknown as LooseComponent;
        const wrapperProps = item.href ? { href: item.href, title: item.name } : {};
        return (
          <Wrapper
            key={item.symbol}
            {...wrapperProps}
            className={`specimen-link ${SLOT_CLASSES[i]} specimen-float ${FLOAT_CLASSES[i]}`.trim()}
          >
            <Img
              src={item.src}
              alt={item.alt}
              width={item.width}
              height={item.height}
              className="specimen-img specimen-shadow"
              {...imageProps}
            />
            <span className={`specimen-chip specimen-chip-${i + 1}`}>
              <span className="specimen-chip-symbol">{item.symbol}</span> {item.name}
            </span>
          </Wrapper>
        );
      })}
    </div>
  );
}
