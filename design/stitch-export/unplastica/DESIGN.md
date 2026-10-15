---
name: Unplastica
colors:
  surface: '#fafaed'
  surface-dim: '#dadbce'
  surface-bright: '#fafaed'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f4e7'
  surface-container: '#efefe2'
  surface-container-high: '#e9e9dc'
  surface-container-highest: '#e3e3d7'
  on-surface: '#1a1c15'
  on-surface-variant: '#414942'
  inverse-surface: '#2f3129'
  inverse-on-surface: '#f1f2e5'
  outline: '#717972'
  outline-variant: '#c1c9c0'
  surface-tint: '#3b684c'
  primary: '#002c17'
  on-primary: '#ffffff'
  primary-container: '#15432a'
  on-primary-container: '#80b08f'
  inverse-primary: '#a1d2b0'
  secondary: '#2e6c02'
  on-secondary: '#ffffff'
  secondary-container: '#aef682'
  on-secondary-container: '#34720a'
  tertiary: '#262525'
  on-tertiary: '#ffffff'
  tertiary-container: '#3b3b3b'
  on-tertiary-container: '#a7a5a4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#bceecb'
  primary-fixed-dim: '#a1d2b0'
  on-primary-fixed: '#002110'
  on-primary-fixed-variant: '#224f35'
  secondary-fixed: '#aef682'
  secondary-fixed-dim: '#93d969'
  on-secondary-fixed: '#092100'
  on-secondary-fixed-variant: '#215100'
  tertiary-fixed: '#e5e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1c1b1b'
  on-tertiary-fixed-variant: '#474646'
  background: '#fafaed'
  on-background: '#1a1c15'
  surface-variant: '#e3e3d7'
typography:
  display:
    fontFamily: Outfit
    fontSize: 56px
    fontWeight: '800'
    lineHeight: 64px
    letterSpacing: -0.03em
  display-mobile:
    fontFamily: Outfit
    fontSize: 38px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Outfit
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Outfit
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Outfit
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Outfit
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: 0em
  title-lg:
    fontFamily: Outfit
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: 0em
  title-md:
    fontFamily: Outfit
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: 0.01em
  body-lg:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Space Grotesk
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-sm:
    fontFamily: Space Grotesk
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Outfit
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 18px
    letterSpacing: 0.06em
  label-md:
    fontFamily: Outfit
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.08em
  label-sm:
    fontFamily: Outfit
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.1em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 3rem
  margin-tablet: 2rem
  margin-mobile: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

The design system embodies an eco-activist yet remarkably grounded and modern aesthetic: purpose-driven, optimistic, and radically clear. Drawing inspiration from modern fintech and consumer impact brands (such as Wise), it merges playful, conservation-forward storytelling ("PLAYING SAVES THE TURTLES") with rigorous, confident product architecture. 

The visual style is **Flat Playful & High-Contrast Minimalist**:
- **Zero Skew/Gradients:** Every surface, button, and card relies on unapologetic flat, solid color blocks with distinct separation.
- **Graphic Directness:** Thick, punchy typographic hierarchy paired with organic yet mathematically clean geometry.
- **Tactile Weight Without Skeuomorphism:** Weight is achieved through solid contrast, clean boundary lines, and assertive spatial proportions rather than shadows or blurs.
- **Iconography over Emojis:** Strictly crafted, geometric line-and-fill SVG iconography conveying precision, avoiding standard generic emojis to preserve digital credibility.

## Colors

The palette balances environmental gravitas with lively gamified energy through three primary tonal pillars:

- **Deep Forest Green (`#15432A`):** The primary anchor. Used for high-emphasis typography, prominent navigation headers, primary interaction elements, and high-impact structural blocks. An ultra-deep tone (`#0E301F`) provides additional pressed and hover states.
- **Vibrant Leaf Green (`#5FA038`):** The catalytic accent. Inspires optimism and momentum; applied to interactive badges, callout cards, active tabs, toggle switches, and positive metrics. A secondary variant (`#4D8C2C`) supports hovered button states.
- **Warm Cream Surface (`#FBFBEE`):** The foundational canvas. Replaces cold, clinical pure white with an earthy, unbleached warm background that feels organic and paper-like. An adjacent soft tint (`#F1F3E8`) serves as card backing and inset container fill.
- **Solid Black Ink (`#111111`):** High-contrast accent color for crisp text, structural border strokes, and sharp iconography.
- **Functional States:** Error states use a crisp brick terracotta (`#D9381E`), warning uses bright goldenrod (`#F5A623`), and info uses soft aquatic sage (`#388E8E`). No gradients are permitted under any circumstance.

## Typography

Typography delivers a high-impact, geometric, modern look:
- **Headlines & Labels (`Outfit`):** Characterized by clean circular geometry, wide proportions, and robust heavy weights (`700` and `800`). All capital-cased labels (like brand taglines and metadata chips) leverage generous tracking (`0.06em` to `0.1em`) to replicate modern structural editorial design.
- **Body & Numerical Readouts (`Space Grotesk`):** Provides a clean, slightly idiosyncratic, tech-forward touch with high legibility. It handles dense stats, impact figures, and descriptive copy without losing playful character.
- **Rhythm & Line Heights:** Set strictly proportional to font sizes to maintain compact, solid content modules that don't float adrift on the warm paper background.

## Layout & Spacing

The layout is built upon an 8px base rhythm paired with a structured, confident grid:
- **Grid Architecture:** 12-column responsive fluid grid on desktop (`>1024px`) with `1.5rem` gutters and max-width container capped at `1280px`; 8-column layout on tablet (`768px-1023px`); and a 4-column layout on mobile (`<768px`) with `1rem` gutters.
- **Content Blocks:** Layouts group metrics and callouts into modular tile grids. Tiles snap cleanly edge-to-edge or across consistent `space-md` gaps.
- **Density:** Medium-compact. While section margins provide breathing space, component internals remain tightly organized with crisp, non-padded borders to reinforce the flat graphic style.

## Elevation & Depth

True to the flat graphic discipline, visual hierarchy is created entirely without drop shadows, glows, or translucent blurs:
- **Zero Diffusion:** Soft blurred drop shadows are strictly forbidden. 
- **Tonal Layering:** Depth is communicated through high-contrast solid surface layering. The primary viewport canvas sits on Warm Cream (`#FBFBEE`), primary cards and containers sit on crisp solid white (`#FFFFFF`) or pale sage-cream (`#F1F3E8`), and active highlights sit on solid Leaf Green (`#5FA038`).
- **Solid Contrast Outlines & Offsets:** Where emphasis or interactive separation is needed, elements utilize a sharp `1.5px` or `2px` solid ink border (`#111111` or `#15432A`). For tactile focus or pressed states, an intentional 3px solid hard offset shadow (`box-shadow: 3px 3px 0px #111111`) may be used to deliver physical, retro-modern punch.

## Shapes

The shape philosophy pairs geometric confidence with organic approachability:
- **Base Components:** Standard inputs, buttons, and content cards utilize `0.5rem` (8px) corner radii (`roundedness: 2`), giving them a tailored, contemporary feel.
- **Large Containers & Hero Modules:** Use `1rem` to `1.5rem` (`rounded-lg` and `rounded-xl`) to soften massive color blocks against the background.
- **Badges, Tags, & Action Pills:** Full circle/pill rounding (`9999px`) is reserved specifically for status chips, numeric counters, and floating micro-actions to introduce playful contrast against rectangular cards.

## Components

### Buttons
- **Primary:** Solid Forest Green (`#15432A`) fill with crisp off-white (`#FBFBEE`) text in `Outfit` Bold. No gradient. Hover shifts to `#0E301F`. Active/pressed state indents with an optional 2px solid `#111111` stroke.
- **Secondary (Vibrant):** Solid Leaf Green (`#5FA038`) fill with Deep Forest Green (`#15432A`) text. High energy, reserved for key conversion steps like "Start Playing" or "Save a Turtle". Hover shifts to `#4D8C2C`.
- **Tertiary / Ghost:** Transparent background with a 1.5px solid Forest Green or Black border, text in Forest Green.

### Chips & Badges
- Pill-shaped (`rounded-full`), padding `0.25rem 0.75rem`.
- Backgrounds are solid tinted fills (e.g., `#E8F2DF` with `#15432A` text).
- Always set in uppercase `label-md` with `0.08em` tracking.

### Cards & Tiles
- Solid flat fill in `#FFFFFF` with either a 1.5px border in `#15432A` (or `#111111`), or borderless on `#F1F3E8` backing.
- No box-shadows. Internal padding relies on `space-lg` (`1.5rem`).
- Header tiles can invert colors: solid Forest Green background with crisp warm cream text.

### Inputs & Form Fields
- Solid Warm Cream (`#FBFBEE`) or pure white background with a 1.5px `#111111` boundary stroke.
- Placeholder text in a 50% opacity neutral tint.
- Focus state: Replaces border with a 2.5px solid Forest Green (`#15432A`) outline with zero glow.

### Checkboxes & Radios
- Box/Circle with 2px solid `#111111` border.
- Checked state fills with solid Leaf Green (`#5FA038`) housing a bold white or deep green SVG checkmark.

### Progress & Stat Trackers
- Solid, flat bar tracks with zero gradient: unfilled track in `#E5E8DC`, filled segment in vibrant `#5FA038`.
- Metric numbers rendered in heavy `Outfit` typography with accompanying micro-labels.

### Iconography Rules
- Modern, geometric, single-weight vector SVG icons (24px grid, 2px stroke).
- Strictly vector paths only: emojis are completely prohibited in core UI elements to uphold intentional, branded aesthetics.