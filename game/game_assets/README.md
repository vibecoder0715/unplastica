# Unplastica Game Assets & Vector Graphics Architecture

This directory houses the foundational vector graphics specifications and generator pipelines for all 71 sanctuary species (41 Animals `A01`–`A41`, 30 Plants `P01`–`P30`) and all 25 native food items.

## Vector Design Principles
1. **100% Pure Canvas2D Vector Graphics**: No raster PNGs, WebGL textures, or normal maps. Every animal, plant, and food item is rendered strictly using Canvas2D vector paths (`Path2D`, `bezierCurveTo`, `radialGradient`, `linearGradient`, `ellipse`, `stroke`, `fill`).
2. **Proportions**:
   - Scenery & Plants: 90% biologically realistic morphology, 10% cute stylized vibrancy.
   - Animals: 70% real biological anatomy (scale counts, scutes, digit counts, accurate ear/snout shapes), 30% cute anime-gloss charm.
   - Food: 100% matches plant and natural sources in color palette and vector silhouette.
3. **High-DPI Razor Sharp Buffers**: DPR-aware transforms render at native 2x/3x retina resolutions without pixelation or blur.
4. **Artistic Integrity**: The references for `A01` (Malayan Tiger) and `A28` (Green Sea Turtle) remain permanently frozen.

## Contents
- `animals.ts`: Species parameters, wave configurations, eye scaling, and biological diet rules for all 41 animals (`A01`–`A41`).
- `plants.ts`: Botanical morphology specifications, branch welding architecture, and fruit/flower lifecycle stages for all 30 plants (`P01`–`P30`).
- `food.ts`: Handcrafted vector icon definitions for all 25 consumable foods and treats matching sanctuary flora.
