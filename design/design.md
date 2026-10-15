# Design reference notes

The source of truth is the provided Stitch HTML in `design/stitch-export/`: Home, Earn, Events, and Profile, each with light and dark variants. Three exported screenshots contain only a failed-image placeholder, so those views were interpreted from their intact HTML rather than guessed from a broken PNG. Supplied Stitch photos and the river video are used by the app.

- Light canvas: warm near-white `#fafaed`; deep forest surfaces; bright leaf green accents.
- Dark canvas and cards: deep green-black with the same layout, copy, and controls as light mode.
- Type: Outfit for display headings and Space Grotesk for interface text.
- Main container follows the reference mobile layout and expands into a centered laptop layout.
- The bottom navigation stays pinned to the viewport, with safe-area padding on iOS.
- Theme defaults to light. The Profile theme setting offers light, dark, or follow-system.
- Brand marks are placed in `apps/web/public/assets/brand/`; PWA icon crops are in `apps/web/public/icons/`.

The original Stitch export is reference-only; the app imports only its organized public assets. The source HTML remains available for comparison.
