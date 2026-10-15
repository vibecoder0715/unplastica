---
name: Luminous Canopy
colors:
  surface: '#01170b'
  surface-dim: '#01170b'
  surface-bright: '#263e30'
  surface-container-lowest: '#001207'
  surface-container-low: '#082013'
  surface-container: '#0c2417'
  surface-container-high: '#172f21'
  surface-container-highest: '#223a2b'
  on-surface: '#cde9d4'
  on-surface-variant: '#bccabb'
  inverse-surface: '#cde9d4'
  inverse-on-surface: '#1e3527'
  outline: '#869486'
  outline-variant: '#3d4a3e'
  surface-tint: '#4de082'
  primary: '#6bfb9a'
  on-primary: '#003919'
  primary-container: '#4ade80'
  on-primary-container: '#005e2d'
  inverse-primary: '#006d36'
  secondary: '#8ada66'
  on-secondary: '#0f3900'
  secondary-container: '#247000'
  on-secondary-container: '#9ff179'
  tertiary: '#c7e7d4'
  on-tertiary: '#1a3629'
  tertiary-container: '#accbb9'
  on-tertiary-container: '#3b5748'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6dfe9c'
  primary-fixed-dim: '#4de082'
  on-primary-fixed: '#00210c'
  on-primary-fixed-variant: '#005227'
  secondary-fixed: '#a4f87f'
  secondary-fixed-dim: '#8ada66'
  on-secondary-fixed: '#062100'
  on-secondary-fixed-variant: '#195200'
  tertiary-fixed: '#caead7'
  tertiary-fixed-dim: '#aecebb'
  on-tertiary-fixed: '#042015'
  on-tertiary-fixed-variant: '#314c3f'
  background: '#01170b'
  on-background: '#cde9d4'
  surface-variant: '#223a2b'
typography:
  headline-xl:
    fontFamily: Epilogue
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Epilogue
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Epilogue
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Epilogue
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Epilogue
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Epilogue
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  margin: 2rem
  margin-sm: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system delivers an ecological, modern aesthetic built for sustainability-focused tech, circular commerce, and environmental intelligence. The visual philosophy departs from washed-out, sterile kraft-paper tropes, adopting instead an authoritative, immersion-first nocturnal botanical world. 

The aesthetic is flat, minimal, and hyper-legible. It pairs deep, low-luminance forest greens with vibrant botanical accents to communicate vitality, rigor, and technical precision.

### Key Characteristics
- **Deep Bio-Immersion:** Grounds the interface in deep forest tones rather than generic charcoal or OLED blacks, lending rich organic character without sacrificing contrast.
- **Flat Clarity & Zero Gradients:** Strictly flat surfaces. No pseudo-skeuomorphic lighting, shiny overlays, or multi-stop gradients. Depth is established purely through disciplined tonal layering.
- **High-Acuity Accents:** Luminous sprout and lime tones act as biological signals—guiding eye paths, denoting positive sustainability metrics, and clarifying key user journeys.
- **Modern Soft Geometry:** Calibrated `rounded-2xl` structural geometry creates a warm, tactile, yet engineered silhouette.

## Colors

The palette establishes an organic dark-mode foundation with high contrast and clinical clarity.

### Primary Palette & Tonal System
- **Canvas / Root Background (`#0b2316`):** The deepest nocturnal forest green. Serves as the primary viewport background.
- **Sub-surface / Structural Base (`#123321`):** Applied to structural containers, sidebars, navigation bars, and recessed canvas areas.
- **Surface Elevation 1 (`#163d28`):** The primary card and panel surface. Provides distinct edge separation against the base canvas.
- **Surface Elevation 2 (`#1b4730`):** Elevated modals, popovers, dropdown lists, and active interactive target states.

### Accent & Utility Hierarchy
- **Luminous Sprout (`#4ade80`):** High-energy primary interactive accent. Reserved for primary action buttons, active toggles, progress highlights, and critical affirmative data.
- **Vibrant Lime (`#65b344`):** Secondary accent. Applied to supportive badges, interactive hover states, secondary indicators, and brand touchpoints.
- **Muted Sage (`#a3c2b0`):** Semantic secondary text, inactive icons, subtle dividers, and contextual meta-labels.
- **Crisp High-Contrast Text (`#ffffff`):** Uncompromising white for primary headlines, card titles, table readouts, and primary button labels.
- **Ghost Border Tint (`#245c3e`):** Hairline edge boundary for surface definition without harsh visual friction.

## Typography

The type system blends structural authority with humane, ergonomic readability. 

- **Display & Headlines (`Epilogue`):** A contemporary sans-serif with architectural proportions and subtle quirky details. Epilogue gives headlines editorial distinction, environmental gravity, and high-impact framing.
- **Body & Controls (`Plus Jakarta Sans`):** Clean, open letterforms with geometric touches optimize clarity across screens. Its tall x-height maintains effortless legibility against dark green surfaces.

### Rules of Application
- Use pure white (`#ffffff`) for all display headlines, section headings, and primary body leads to ensure maximum contrast.
- Reserve muted sage (`#a3c2b0`) for secondary body paragraphs, footnotes, timestamps, and captions.
- Avoid font weights below `400`. Fine hairline text dissolves into deep green backgrounds.

## Layout & Spacing

The layout model utilizes a responsive 12-column grid system paired with strict 8-point compositional rhythms.

### Grid & Breakpoints
- **Desktop (1200px+):** 12-column fluid grid, max-width container 1440px. 32px (`margin`) outer boundaries and 24px (`gutter`) column gaps.
- **Tablet (768px – 1199px):** 8-column layout with 24px canvas margins and 16px column gutters.
- **Mobile (<768px):** 4-column layout, edge margins reduce to 16px (`margin-sm`), gutters reduce to 16px (`gutter-sm`).

### Layout Philosophy
Surfaces require breathing room to prevent deep colors from feeling claustrophobic. Apply `space-xl` (40px) between stacked major section groups, `space-lg` (24px) for inner card padding, and `space-md` (16px) for item clusters and inputs. Keep inline control gaps tight (`space-xs` to `space-sm`) to maintain cohesive actionable components.

## Elevation & Depth

This design system avoids dropped drop-shadows and blurred glass textures. Flat structural minimalism requires depth to be achieved entirely via **tonal step-ladder layering** and **crisp 1px ghost borders**.

### Elevation Stack
- **Level 0 (Canvas):** Pure `#0b2316`. No borders. The foundational void.
- **Level 1 (Structural Canvas):** `#123321`. Encloses persistent panels, toolbars, and content shells.
- **Level 2 (Interactive Cards & Panels):** Solid `#163d28` background with a precise 1px solid `#245c3e` perimeter border. 
- **Level 3 (Overlays, Flyouts & Modals):** Solid `#1b4730` background with a 1px solid border in `#2e744e`. No drop shadows; the stark lightness step against `#0b2316` creates unmistakable elevation.

### Interaction States
- Hovering an interactive Level 2 card transitions its surface background from `#163d28` to `#1b4730`, and intensifies its border to `#4ade80` (primary green) at 40% opacity.

## Shapes

The design system uses a pronounced `rounded-2xl` geometric aesthetic (16px base radius on large structural components). This curved vocabulary balances the technical authority of the dark green palette with organic softness.

### Corner Radius Standards
- **Cards, Panels & Modals (`rounded-2xl`):** `1rem` (16px) to `1.5rem` (24px). Creates friendly, self-contained surfaces.
- **Form Controls & Buttons:** Consistent `0.75rem` (12px) to `1rem` (16px) curvature. Matches card contours while remaining compact.
- **Badges, Tags & Avatars:** Fully circular pill shapes (`9999px`) to distinguish discrete status metadata from actionable cards.

## Components

### Buttons
- **Primary:** High-impact solid sprout fill (`#4ade80`), bold deep-green text (`#0b2316`), 12px corner radius. On hover: solid lime fill (`#65b344`). Zero shadows.
- **Secondary / Ghost:** Transparent background with 1px border in `#245c3e`, crisp white text (`#ffffff`). On hover: background `#163d28` and border `#4ade80`.
- **Tertiary:** Borderless, muted sage text (`#a3c2b0`). On hover: text transitions to `#ffffff`.

### Input Fields
- **Container:** Solid `#123321` fill with 1px solid border (`#245c3e`), 12px corner radius, internal padding `12px 16px`.
- **States:** Text entry is crisp `#ffffff`. Placeholder text is muted `#a3c2b0` at 60% opacity. Active focus state creates a sharp 1px border in `#4ade80` with zero outer blur rings.

### Cards
- **Base Cards:** Solid `#163d28` surface, 16px radius (`rounded-2xl`), 1px solid outline `#245c3e`, `24px` internal padding. 
- **Actionable Cards:** Surface shifts to `#1b4730` on pointer hover, with the border brightening to `#4ade80` (40% opacity).

### Chips & Badges
- **Status Badges:** Compact pill geometry (`9999px`). Background is `#1b4730` with a 1px border in `#245c3e`. Text is `#4ade80` or `#ffffff` in `label-sm`.
- **Filter Chips:** 12px radius, `#123321` fill. When active, fill switches to `#4ade80` with `#0b2316` text.

### Checkboxes & Radio Controls
- **Inactive:** 20px box/circle, `#123321` surface, 1.5px solid border in `#245c3e`.
- **Checked:** Solid `#4ade80` fill with an inset deep-green `#0b2316` icon tick.

### Metric Readouts & Progress Indicators
- **Metric Cards:** Large tabular numerical figures rendered in `headline-xl` white (`#ffffff`), accompanied by an inline directional delta chip (`#4ade80` text over `#123321`).
- **Progress Bars:** Base track is `#123321` with a flat fill in `#4ade80`. No gradients or animations beyond steady linear fill transitions.