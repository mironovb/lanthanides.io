# Specimen kit

Portable versions of two visual features from periodictech.com:

- **SpecimenShowcase**: three floating metal-specimen cutouts (scandium, tellurium,
  thulium) with hover-revealed element chips and reduced-motion support.
- **LanthanumBohrScroll**: a brand-colorable three.js Bohr atom with damped idle
  rotation, pointer parallax, and a scroll-driven shell morph.

## Contents

```
components/LanthanumBohrScroll.tsx   three.js atom (needs three + @react-three/fiber)
components/SpecimenShowcase.tsx      floating specimens (needs only React)
styles/specimen-showcase.css         all showcase styling, self-contained
assets/scandium.png                  717x549 transparent cutout
assets/tellurium.png                 531x463 transparent cutout
assets/thulium.png                   719x577 transparent cutout
assets/metals.png                    combined transparent image (reference/reuse)
examples/plain-react-hero.tsx        usage in any React app
examples/nextjs-hero.tsx             usage in Next.js App Router (optimized images)
package.deps.json                    exact dependency requirements + React 18 note
AGENT_INSTRUCTIONS.md                step-by-step integration playbook for an agent
```

## Quick start

Hand this folder to an agent in the target project and say:

> Integrate the components in this folder into <page> following
> AGENT_INSTRUCTIONS.md. Put the specimens in the hero and the atom on the about
> page. Run the verification checklist at the end before finishing.

Or do it manually: install deps from `package.deps.json`, copy `components/` +
`styles/` + `assets/` into the project, and start from a file in `examples/`.
