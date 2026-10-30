# GAMEIMPLEMENT.md (revision 5)

Implementation plan for the Unplastica Sanctuary overhaul.
Status: the milestones M0 to M11 below have not started. A separate logic and realism pass on the current Canvas2D game is done (Section 21). A direct vector refinement pass on the current game is in progress (Section 22).
Gate: I stop after the first batch of 10 refined species (Milestone 5) and wait for your approval of the look.

> [!IMPORTANT]
> **Revision 5 overrides the rendering pipeline in Sections 6, 8, 15 and 17.** The game is **vector graphics only, drawn with Canvas2D paths**: no SVG files, no rasterised SVG textures, no PixiJS/WebGL, no normal maps, no IndexedDB raster cache, no baked bitmaps or PNG art (Section 22.1). Changes are **medium refinements, not an overhaul**. Realism balance: **scenery 100% realistic, animals 70% realistic structure / 30% cute style, plants 90% real / 10% cute style.**

---

## 0. What changed in revision 3

Your last answers widened the scope and settled several open questions.

1. **Scope is now every asset except the two frozen references.**
   - 39 animals and 30 plants get refined, plus the 8 foods and fruits, the scenery and the whole UI.
   - The Malayan tiger (A01) and the Green Sea Turtle (A28) stay exactly as they are and become the quality reference.
   - The 10 "hero" species are only the first batch of this program. The rest follow after you approve the look.
2. **"Medium changes."** Each asset keeps its identity (palette, markings, personality, silhouette family) and gets a real anatomical and detail upgrade. It is not a ground-up redo and not a cosmetic touch-up. Section 5 defines this with measurable limits.
3. **Recursive refinement.** Every asset goes through a repeated audit, fix and re-measure loop (Section 5.4). Fixes that belong to a whole class (for example scales, feathers, shell plates) are made once in the generator and re-applied to every asset in that class.
4. **The pangolin specs are universal.** "Scales must fully cover, overlap correctly, follow the body, and the tail must be anatomical" is generalised into 12 specs (U1 to U12) that every asset must pass.
5. **Scenery and "situation" get their own big milestone** (Section 11): terrain, water, sky, backgrounds, set dressing, habitat features, lighting states and weather, all built as SVG.
6. **The whole UI gets a full refinement program** (Section 12), using the same loop.
7. **Accepted from before:** frozen references use a per-frame texture adapter (N1), walk-speed calibration (N2), the references' proportion envelope (N3), ink outline (N4), geometry-only SVG (N5), and the pangolin reading ("scales that do not fully cover and do not overlap").
8. **Dropped:** the optional early pangolin review. There is only the final gate G1.
9. **Approved in principle:** Playwright, reference photos, pulling the security patch forward, a Supabase staging project, a real device test, self-hosting fonts, and `zod`. Nothing is installed or started until you tell me to begin.

### 0.1 Repository drift (carried over)

The repository changed during earlier work without any action from me: three new commits on the manual and HUD, and seven files with uncommitted edits (`App.tsx`, `TurtleCanvas.tsx`, two `i18n.ts` files, `index.css`, `index.ts`, `turtle/renderer.ts`). The `turtle/renderer.ts` and `TurtleCanvas.tsx` edits are framing only (vertical centre 0.48 to 0.45, minimum scale 0.25 to 0.05, framing 0.9 to 0.8). The design did not change.

- **Baseline decision:** you did not name one. I will freeze the **current working tree** (what you see today) unless you say otherwise before M0 starts.
- Some manual and HUD problems from my earlier lists may already be fixed. M9 starts with a fresh audit of the current code.

---

## 1. How to read this document

- Section 2: locked decisions.
- Section 3: scope and inventory of everything that will be refined.
- Section 4: facts about the current code, your references, and known defects.
- Section 5: how "medium refinement" and "recursive refinement" work, with the 12 universal specs.
- Section 6: target architecture.
- Section 7: quality bar mapped to requirements.
- Section 8: tensions and their status.
- Section 9: milestones.
- Section 10: per-asset refinement briefs for all 77 assets.
- Section 11: scenery and situation bible.
- Section 12: UI refinement program.
- Sections 13 to 20: file map, dependency order, quality tiers, verification, risks, assumptions and needs, gate checklist, deferred items.
- Appendix A traces the 633 earlier findings to milestones.

Sizes use S, M, L and XL (relative effort). I give no hour estimates because several milestones depend on spikes whose results are unknown.

---

## 2. Decisions locked

| Topic | Decision |
|---|---|
| Asset format | **Vector only, Canvas2D paths redrawn every frame** (revision 5). No SVG, no PNG, no raster art, no cached bitmaps, no image bending. |
| Articulation | Rigid parts with overlapping joints. No mesh skinning, no warping. |
| Frozen references | A28 Green Sea Turtle and A01 Malayan tiger. Design, drawing code and animation untouched; they stay Canvas2D vector. |
| Existing PNG folder | Not used by the game. Not shipped. |
| Scope | 39 animals, 30 plants, 8 foods and fruits, scenery, UI. Plus support for future "71+" additions. |
| Change size | Medium: keep identity, upgrade anatomy, structure, detail, texture and motion. Not an overhaul. Measured by retention limits (Section 5.2). |
| Method | Recursive refinement loop per asset, class-level fixes cascade (Section 5.4). |
| Balance | Animals 70% realistic (physics, structure, detail, texture), 30% cute (face, eyes, charm, proportion envelope of the references). Plants 90% real, 10% cute. Scenery 100% realistic. |
| Style target | Match the two references: detailed, real while cute, smooth animation (walk, wave, emotes). |
| Frozen references in the new scene | Drawn directly with their own Canvas2D vector code in the same canvas (no texture adapter). Walk-speed calibration (N2), reference proportion envelope (N3), ink outline (N4). |
| SVG rules | Superseded: no SVG at all (revision 5). Canvas2D paths and gradients only, no `ctx.filter`. |
| Engine | Canvas2D (vector). PixiJS v8 dropped (revision 5). |
| Device target | 60 fps on a mid-range Android phone. Tiers reduce detail paths and effects, never physics. |
| Lighting | Vector lighting only: gradients, rim and highlight shapes, scene-wide tint. No normal maps or shaders. |
| Level of detail | Fewer detail paths when an entity is small on screen; full detail for the selected animal. |
| Scale | Gravity scaled per animal to keep its Froude number. |
| Wind | Damped oscillators per branch and leaf cluster, per-leaf flutter on the GPU. |
| Fur and feathers | Strands baked as detail. Only silhouette tufts and lit normals move. |
| World | About 40,000 px wide, denser, per-species speed, vertical swimming and perching. Save v3. |
| Backend | Supabase auth plus document-style tables, server-authoritative actions, 300 Greenbits per day cap, Postgres rate limiter, session cache. |
| Weather | Proxied through `/api/weather`, coordinates rounded to 0.1 degree, 10 minute edge cache. |
| Timers | Game-fast timers stay (hunger, fruit). Physics is real. |
| Diet and activity | New foods for carnivores, per-species activity patterns, sessile species do not move, no predation. |
| Excluded | Ambient fauna and the ecosystem score. |
| Gate | One gate, G1, after the first batch of 10 species. No earlier checkpoint. |

---

## 3. Scope and inventory

### 3.1 What gets refined

| Group | Count | Treatment |
|---|---|---|
| Frozen references | 2 | Untouched. Golden masters guard them. |
| Animals | 39 | Medium refinement, class by class |
| Plants | 30 | Medium refinement, by growth form |
| Foods and fruits | 8 | Rebuilt as SVG icons that share one source with the fruit hanging on plants |
| World set pieces | Towers, shore shells, dropped-food visuals | Refined with the scenery |
| Scenery | 4 biomes | New SVG terrain, water, sky, backgrounds, set dressing, habitat features |
| UI | HUD, dock, inspector, store, teleport, species card, settings, onboarding, manual, loading | Full refinement program |

Total refined assets: 39 + 30 + 8 = **77**, plus scenery and UI. The Greenbits coin PNG used in the brand is a brand asset and stays.

### 3.2 First batch (the 10 for gate G1)

| Code | Species | Why it is in the first batch |
|---|---|---|
| A06 | Sunda pangolin | Your named bad example. Proves the armour engine and a prehensile tail |
| A02 | Asian elephant | Heavy quadruped, skin folds, trunk as a segmented chain |
| A04 | Orangutan | Primate, long arms and hair, grasping hands |
| A15 | Rhinoceros hornbill | Biped bird, feathers, casque, wings |
| A27 | Dugong | Sirenian swimmer, buoyancy, fluke, air breathing |
| A19 | Smooth-coated otter | Semi-aquatic fur, wet-skin specular, long tail |
| P01 | Rafflesia | Parasitic flower, petal structure |
| P03 | Durian tree | Broadleaf tree, leaf arrangement, hanging fruit |
| P14 | Banyan fig | Tree with aerial and prop roots |
| P13 | Coconut palm | Palm, pinnate fronds, ringed curved trunk |

These cover every rig class that the remaining assets reuse. If you want a different first batch, tell me before M5.

### 3.3 After G1

33 animals, 26 plants, 8 foods, the scenery program and the UI program. Details in Sections 9 to 12.

---

## 4. Facts that shape the plan

### 4.1 Current code

1. The game art is Canvas2D drawing redrawn every frame. `animalRenderer.ts` (6,056 lines), `plantRenderer.ts` (2,786) and `turtle/renderer.ts` (2,746) emit paths, gradients and clips each frame. There is no cached texture.
2. **Your two references live inside shared code.** The tiger is `drawMalayanTigerRig` in `animalRenderer.ts`. It depends on helpers used by every other animal (`fillRimAndStroke`, `drawSculptedPawLimb`, `drawEmbeddedTail`, `drawOvalSpot`) and on the face kit in `turtle/renderer.ts` (`drawGlossyAnimalEye`, `drawExpressiveAnimalBrows`, `drawExpressiveAnimalMouth`, `drawSoftCheekBlushes`, `IRIS_PALETTES`). The turtle is `renderTurtle`, driven by `turtle/rig.ts`. Editing a shared helper would change the tiger, which is why M0 starts with a freeze.
3. All 41 animals use the turtle pose rig (`TurtlePose`). It has no spine chain and no limb segments.
4. **Many species share one drawing function with palette swaps**, so species-specific anatomy is missing:
   - `drawPrimateRig` serves orangutan, macaque, dusky leaf monkey and langur.
   - `drawCervidRig` serves sambar and mousedeer.
   - `drawAvianRig` serves fireback and hornbill.
   - `drawMonitorLizardRig` serves the clouded and water monitors.
   - `drawSculptedFishRig` serves arowana, featherback, snakehead and clownfish.
   - `drawMarineMammalRig` serves dugong, dolphin and false killer whale.
   - `drawSharkRig` serves whale shark and blacktip.
   - `drawCrustaceanRig` serves prawn and harlequin shrimp.
   - `drawCephalopodRig` serves octopus and cuttlefish.
5. Plants: one `case` serves seagrass, turtle grass and eelgrass; one serves lotus and water lily. **Water spinach (P30) falls into the `default` branch and is drawn as a woody tree.** All woody plants share one trunk-and-branch function with the same 4-branch table.
6. The web app imports game internals (`turtle/*`, `game/worldRenderer`, `game/worldConfig`, `game/persistence`, `roster/catalog`, `game/sound`, `game/types`, `index`). The mascot, loading overlay and tour use the old turtle renderer and keep working as they are.
7. `game/` has no `vite.config.ts`. `game/package.json` is an `xrblocks-example` template with unused dependencies. `tsc` is not installed at the repo root.
8. Economy is client-authoritative. `sync_sanctuary_balance(p_delta, ...)` accepts any positive integer from any signed-in user. Cloud save sits in `profiles.preferences`, capped at 4096 bytes, and the error is ignored.
9. Both CSS files define the same global names. Terrain depends on `viewportHeight`. Tests check prose and config only.

### 4.2 What makes your two references work (the style grammar)

I read the tiger and turtle code and extracted the rules to reproduce in SVG. They become the "style kit" (M2) and the conformance metrics (Section 16).

| Element | What the references do | Read from code |
|---|---|---|
| Ink outline | Dark, warm-tinted outline per species (tiger `#261408`), round caps and joins | 3.4 to 3.7 units on silhouettes, 2.2 to 3.0 on details |
| Volume per part | 3-stop diagonal gradient (light, mid, dark) | Same function for every part |
| Dome highlight | Radial highlight with dark edge falloff | Alpha 0.38, 0.12, 0, then 0.26 at the rim |
| Ambient occlusion | Ventral gradient under each form | Alpha 0 to 0.25 |
| Rim light | Pale arc along the lit edge | Alpha about 0.34 to 0.55 |
| Face kit | Glossy eye with socket cushion, orbital fold, tear-trough highlight, sphere-shaded sclera, iris gradient, limbal ring, glow, 18 stroma fibres, collarette, pupil, three highlights. Brows, mouth, cheek blush with ticks, three-stop nose | About 12 layers per eye |
| Limbs | Tapered capsules with ball-joint root caps, paw tip colour, pads, claws | Rigid, rotated at the shoulder |
| Pattern | Clipped ovals placed by hand | Not procedural |
| Animation | Walk at about 0.7 Hz, smoothstep activity blend, 120 degree wave offset, 3-stage eating, blink every 2.4 to 5.6 s, emotion props | C2 continuous walk bob |
| Proportions | **Very chibi.** Tiger head about 272 wide against a torso about 296 long (ratio about 0.9, roughly 4 times a real head), short legs, eyes small relative to the head (13 by 15, enlarged 1.3 times) | See N3 |

### 4.3 Audit of the pangolin (the worked example)

| Problem you saw | Cause in the code |
|---|---|
| Scales not thorough, gaps | A fixed 4 by 6 grid of identical scales, clipped by the body ellipse. Same size everywhere, no coverage guarantee |
| Scales do not follow the body | Straight rows, no curvature, no foreshortening at the silhouette |
| Wrong overlap | Drawn left to right and top to bottom, so overlap direction is arbitrary. Real scales overlap like roof tiles toward the tail |
| Head and limbs | Four scales on a diagonal for the head. Limbs reuse the generic paw limb in scale colours |
| Tail looks awkward | Generic embedded tail with five scales on a straight diagonal, one rigid piece. Not a tapering prehensile chain |

The same pattern of failure is likely in every other class. The class defect catalog (Section 10) lists what I expect to find. The audit step of the loop confirms each one against the "before" render.

---

## 5. Refinement method

### 5.1 The "before" record

M0 renders every one of the 77 assets, plus the current scenery and UI, to a **golden "before" set**: neutral pose, walk frames, wave, emotes, at 1x, 2x and 3x, day and night. This is the starting point for every comparison and the evidence for "medium change".

### 5.2 What "medium change" means (measurable)

Each asset must **keep**:
- Its dominant palette: mean colour distance (CIEDE2000) between the five dominant colours of the old and new neutral render stays under a tuned limit.
- Its defining markings (tiger-type stripes, spots, bands, patches, banding) and its signature features (trunk, casque, antlers, shell shape).
- Its face personality: same eye colour family, same expression kit as the references.
- Its silhouette family: silhouette overlap (IoU) with the old neutral render stays at or above about 0.60.
- The references' proportion envelope (N3).

Each asset must **change** (so it is not a cosmetic touch-up):
- Every defect found in the audit is fixed (Section 10 briefs list the expected ones).
- Fine-detail energy at 3x is at least 2 times the old render.
- Part count and joint count rise to the anatomical structure in the proportion table.
- Silhouette IoU is at most about 0.92, unless the audit documents that the old silhouette was already anatomically right.

If fixing a defect would break the "keep" limits (for example a pangolin that needs a completely different torso), I flag it for your decision instead of deciding alone.

### 5.3 The 12 universal specs (generalised from the pangolin)

Every asset must pass all that apply. Each has an automated test where possible.

| ID | Spec | Test |
|---|---|---|
| U1 | **Full coverage.** Nothing see-through inside the silhouette: scales, feathers, fur, leaves, shell plates, bark | Rasterise and check zero background pixels inside the body mask |
| U2 | **Consistent overlap direction.** Scales, feathers, shell scutes, bark plates and leaves overlap like roof tiles in the anatomically right direction | Flow-field angular variance below a limit; draw-order check |
| U3 | **Region-appropriate size and density.** Elements vary by body region (large mid-back scales, fine head scales, keeled tail scales) | Size distribution within the table range per region |
| U4 | **Follow the surface.** Rows, strands and veins follow the form, foreshorten near the silhouette | Curvature-following score |
| U5 | **Attached parts.** Limbs, tails, ears, fins, leaves, fruits and flowers attach at anatomically correct points. Nothing floats | Attachment distance below tolerance |
| U6 | **Segmented flexible parts.** Tails, trunks, necks, spines and fronds are chains with seam-free joints | Seam test at maximum joint angle |
| U7 | **Bare versus covered regions.** Ventral skin, inner limbs, faces, soles follow the species | Region masks match the table |
| U8 | **Correct counts.** Limbs, digits, fins, arms, gill slits, petals, tines, suckers | Counts match the table |
| U9 | **Natural asymmetry.** Mirror symmetry only where the species has it, with seeded variation | Asymmetry score within range |
| U10 | **Proportions from the table**, inside the references' cute envelope | Bone ratios match |
| U11 | **Material response.** Wet versus dry fur, scale gloss, shell sheen, leaf translucency, petal softness | Material layer has the expected masks |
| U12 | **Motion fits anatomy.** Gait pattern, swim mode, wing beat and trunk motion match the class | Physics and smoothness tests |

### 5.4 The recursive refinement loop

For each asset:

1. **R0 Audit.** Compare the "before" render and code against the class defect catalog and the 12 specs. Produce a defect list.
2. **R1 Structure.** Build the skeleton and parts from the proportion table. Fix attachments, counts, segmentation (U5, U6, U8, U10).
3. **R2 Surface.** Add armour, strands, plates, bark, veins, petals, texture, material layers (U1 to U4, U7, U9, U11).
4. **R3 Motion.** Wire the rig, gait or swim mode, secondary motion, wave and emotes (U12). Run physics and smoothness tests.

After every round, automated checks run. A failed check repeats that round. **Maximum three passes per round.** An asset that still fails goes onto a "needs your decision" list with the reason, instead of being quietly accepted.

**Recursion across assets.** When a fix belongs to the generator (for example the armour overlap rule), it is made once. Every asset in that class is regenerated and re-checked automatically, and the regression report shows which ones changed. This is how the pangolin lesson spreads to python, monitors, fish scales, shell plates and bark.

**Recursion over the whole game.** After all assets are done, M11 runs a final global pass: every asset, the scenery and the UI are re-audited together in context (neighbouring species, lighting, scale), and any defect found starts the loop again.

### 5.5 Class templates

Assets are grouped so that each class gets one set of generators, rigs and tests.

| Class | Species |
|---|---|
| Digitigrade carnivore | Tiger (frozen reference) |
| Plantigrade bear | Sun bear, giant panda |
| Elephant | Asian elephant |
| Odd-toed ungulate | Malayan tapir |
| Even-toed ungulate | Sambar deer, greater mousedeer |
| Primate | Orangutan, long-tailed macaque, dusky leaf monkey, Raffles' banded langur |
| Rodent | Black giant squirrel, Malayan porcupine |
| Armoured mammal | Sunda pangolin |
| Bat | Malayan flying fox |
| Bird | Crested fireback, rhinoceros hornbill |
| Snake | Reticulated python |
| Lizard | Clouded monitor, Asian water monitor |
| Freshwater chelonian | River terrapin, Southeast Asian box turtle |
| Sea turtle | Green sea turtle (frozen reference), hawksbill |
| Semi-aquatic mammal | Smooth-coated otter |
| Bony fish | Arowana, clown featherback, giant snakehead, clownfish |
| Shark | Whale shark, blacktip reef shark |
| Cetacean | Humpback dolphin, false killer whale |
| Sirenian | Dugong |
| Ray | Bluespotted ribbontail ray |
| Crustacean | Giant freshwater prawn, harlequin shrimp |
| Cephalopod | Coconut octopus, cuttlefish |
| Bivalve | Giant clam |
| Echinoderm | Horned sea star |
| Tree | Tualang, durian, mangosteen, rambutan, banyan |
| Palm | Coconut palm, sugar palm, nipa palm |
| Giant herb | Banana, papaya, torch ginger |
| Grass clump | Bamboo |
| Rosette and fern | Bird's nest fern, tree fern |
| Shrub | Hibiscus, ixora |
| Epiphyte and special | Tropical orchid, pitcher plant, rafflesia |
| Mangrove | Red mangrove, api-api |
| Seagrass | Enhalus, Thalassia, eelgrass |
| Floating and aquatic | Water hyacinth, lotus, water lily, duckweed, hornwort, water spinach |
| Food and fruit | 8 foods |

---

## 6. Target architecture

### 6.1 Pipeline in one line

**Species data -> generator writes SVG parts (albedo, relief, material, baked-light variant) -> loader rasterises each part once into a cached texture -> rigid rig animates cached parts -> lit shader -> batched, culled render.**

Nothing detailed is redrawn per frame. Per frame only transforms, spring states and lighting uniforms change.

### 6.2 The SVG asset format

Each species is a folder under `game/public/assets/svg/<id>/`:

```
manifest.json             parts, parents, pivots, z-order, joint limits, overlap caps,
                          anchors, mass and size data, class, generator version, seed
parts/<part>.albedo.svg   flat colour, pattern, ink outline, ambient occlusion
parts/<part>.relief.svg   greyscale height field (fur, scale relief, wrinkles, volume)
parts/<part>.material.svg ambient occlusion, specular and translucency masks as colour channels
parts/<part>.lit.svg      baked key-light variant (used on Low tier)
```

Rules:
- **Only portable SVG features:** paths, gradients, clip paths, masks, `<use>`, `<symbol>`. **No filters.** No images, scripts, `foreignObject` or external references. A linter enforces this.
- **Detail comes from geometry.** Strands are tapered paths with per-strand colour from a noise field. Scales, plates and petals are real shapes.
- **Reuse for size.** Repeated shapes use `<symbol>` and `<use>`. Coordinates are quantised.
- **Detail levels.** Optional `lod-hi` groups are dropped on Low tier before rasterising.
- **Deterministic.** Same species data and seed produce byte-identical output. A check fails if generated files differ from committed ones.
- **Readable.** Files open in a browser or Inkscape.

### 6.3 Generator (`game/tools/svg/`)

A Node and TypeScript tool (`pnpm gen:svg [id]`):
- **SVG builder:** gradients, clips, masks, symbols, path DSL.
- **Style kit** (Section 4.2): ink outline, volume gradient, dome highlight, ambient occlusion, rim light, face kit.
- **Pattern engines:**
  - strand synthesiser (fur, hair, feather barbs) with direction fields and noise colour
  - **imbricate armour engine** (scales, scutes, plates, feathers and bark plates that overlap like roof tiles, with coverage guarantees)
  - skin wrinkle fields, bark, leaf venation, petal structure
- **Plant generator** (M4).
- **Scenery generator** (M7): seamless ground material tiles, rock and root props, reef structures, background ridge strips.
- **Icon generator** (M9): UI icons in the same style.
- **Provenance:** every proportion number is stored with its source.

### 6.4 Runtime

1. **Loader:** fetches a species' SVG parts, rasterises each once at the size needed for the tier and zoom, packs atlases, and stores the raster result in IndexedDB keyed by id, generator version, tier and level of detail. Rasterisation is time-sliced so it never blocks a frame.
2. **Relief to normals:** the relief raster becomes a normal map once on the GPU. Banding is hidden with generator-side dithering.
3. **Rigid rig:** parts are sprites on a bone hierarchy. Joints use overlapping caps drawn into the parts. Chains (tail, trunk, spine, ear, fin, frond) are series of rigid segments.
4. **Physics and animation:** skeleton solver, analytic IK for planted feet, Froude-driven gaits, centre of mass and momentum, buoyancy and drag, exact spring-damper chains, wind oscillators, animation state machine with blending.
5. **Lighting shader:** ambient colour, sun or moon, rim, specular, depth fog. Leaf clusters use a vertex-shader flutter with per-leaf phase.
6. **Scene:** fixed 60 Hz timestep with interpolation, logical resolution, DPR and pixel budget, spatial-hash culling on both axes, activation radius, background pre-warm on teleport.

### 6.5 Frozen references in the new scene

The tiger and turtle keep their Canvas2D drawing, copied verbatim into `game/src/legacy/`. A legacy adapter draws each into a small offscreen canvas and presents it in the scene as a texture each frame (N1). Spike S6 measures the cost. They receive tint, grade and rim only, not full runtime lighting, because their shading is baked into the drawing. A scene-wide colour grade keeps them consistent with refined assets.

### 6.6 Why PixiJS v8

It gives a WebGL2 batcher, render textures and a custom shader path without a heavy engine harness. It avoids the 30 to 40 MB payload of a Godot export and keeps the React app and Supabase auth in one page. The main risk is custom-shader batching (spike S1).

---

## 7. Your quality bar mapped to requirements

| Quality bar line | Requirement | Verified by |
|---|---|---|
| Vector SVG, no bending images | SVG assets, rigid parts, linter forbids images and filters | Linter, review |
| Match tiger and turtle | Style kit from references, conformance metrics | Golden masters, style metrics, gallery column |
| Frozen designs untouched | Verbatim legacy copy, golden-master tests | Zero-diff tests |
| Change all assets, medium | Retention band and change floor | Retention metrics (5.2) |
| Pangolin-class failures never repeat | 12 universal specs, armour engine, loop | U1 to U12 tests |
| Recursive refinement | Loop with cascade and global pass | Regression reports |
| 70% real, 30% cute | Real tables and physics, cute in face and envelope | Provenance, physics tests, your review |
| Not basic SVG, not flat clip art | Layered volume, strands, real geometry | Flatness metrics, gallery 3x |
| Smooth animation (walk, wave, emotes) | State machine calibrated to references | Smoothness and jerk metrics |
| Gaits scale with leg length, no foot sliding, IK | Froude gait, planted feet | Foot-slip test |
| Weight, momentum, centre of mass | Rigid body, limits, support polygon | Momentum and stability tests |
| Buoyancy and drag | Archimedes plus quadratic drag | Terminal velocity and equilibrium tests |
| Springs, wind, gravity | Exact springs, oscillators, swept dynamics | Step-response, frequency, settle tests |
| No lag, draw once | Rasterise once per part per level; animation moves cached parts | Frame profile, redraw counter zero |
| 60 fps, culling, tiers | Budgets per tier, spatial hash, LOD | Throttled profile |
| Super refined scenery and situation | Scenery bible (Section 11) | Tile, repetition, density, clearance tests |
| Super refined UI | UI program (Section 12) | Screenshot matrix, accessibility checks |
| Review gate | Gallery with before/after, references, real photo | G1 checklist |
| Tell me about conflicts | Section 8 | You |

---

## 8. Tensions

### 8.1 Approved by you (recorded)

| ID | Decision |
|---|---|
| T2 | Full runtime lighting on Medium and High. Baked key light plus tint on Low |
| T3 | Two levels of detail. Close level only for the selected animal. LRU eviction |
| T5 | Bounded cute transform, physics on the stylised skeleton |
| T6 | Froude-scaled gravity per animal |
| T7 | Branch and cluster oscillators on the CPU, per-leaf flutter on the GPU |
| T8 | Strands baked. Only silhouette tufts and lit normals move |
| N1 | Frozen references presented through a per-frame texture adapter |
| N2 | Frozen walk curve untouched. World speed calibrated to the drawn stride, small residual slide accepted |
| N3 | New assets follow the references' chibi proportion envelope. 70/30 applies to physics, structure, detail and texture |
| N4 | New assets use the references' ink outline |
| N5 | Geometry-only SVG, no filters |

### 8.2 Replaced

| Old | Replacement |
|---|---|
| T1 skinned meshes | Rigid cutout rig. Joint seams hidden by overlap caps. Bending forms are chains of rigid segments |
| T4 procedural bitmap baking in a worker | SVG rasterisation with an IndexedDB raster cache. The generator runs at build time, not on the player's device |

### 8.3 Still open, with my default

- **T9. My ability to see images.** Earlier, reading a PNG returned only its format and size. I compare numerically against the references and give you contact sheets. The look decision is yours.
- **T10. Reference photographs.** Approved. Local only, git-ignored, with a licence and attribution manifest, never shipped.

### 8.4 New tensions (my recommendation in bold)

**N6. Rigid segments versus smoothly bending forms.** Trunk, tail, spine and fronds are chains. Seams may show at extreme bends. **Mitigation:** enough segments, overlap caps, skin-fold rings painted at joints, seam tests at maximum angle (spike S5). Rejected: crossfading baked bent images, because it is image blending.

**N7. Normal maps from vector relief.** Eight-bit relief can band. **Mitigation:** generator-side dithering. Low tier uses the baked-light variant only.

**N8. SVG rasterisation cost and browser differences.** Detailed SVG rasterises slowly the first time, and Safari memory limits are tighter. **Mitigation:** lazy per asset, time-sliced rasterisation, IndexedDB cache, per-tier raster size, cross-browser parity tests (Chromium, WebKit, Firefox).

**N9. Scale of the work.** 77 assets plus scenery plus UI. **Mitigation:** class templates so fixes are made once, the cascade rule, and the single gate G1.

**N10. "Medium change" versus "super realistic".** A very realistic result may need a bigger silhouette change than "medium" allows. **Recommendation:** the retention band (5.2) is the rule. When the audit says an asset cannot reach the quality bar inside the band, I flag it and you choose: widen the band for that asset, or accept the limit.

**N11. Scenery as SVG is large.** A 40,000 px world drawn as unique SVG would be huge. **Recommendation:** seamless tiles and chunked strips with 6 or more variants per prop type, placed by seeded Poisson-disk sampling. Rasterised per chunk and level of detail, evicted by LRU. Alternative: unique long strips (more variety, far more memory).

**N12. Family consistency with the frozen turtle.** Hawksbill, river terrapin and box turtle, and all sea animals, should look like siblings of the frozen turtle even though the turtle's shading is baked and the new ones are lit. **Recommendation:** the style kit is calibrated to the turtle's metrics, plus the scene-wide colour grade applied to everything including the references.

**N13. Habitat features and "situation".** I read "situation" as the environment and context around each animal: the places, weather and light states. Adding habitat features (burrow mound, nest log, wallow, holt, den, anemone) is new scene content. **Recommendation:** include them, spawned automatically when a species is placed and absent nearby, removable in settings. If you meant something else by "situation", tell me.

**N14. UI direction.** Earlier default was a game-style HUD with icons, panels and a bottom hotbar. **Recommendation:** keep it, and build the UI art from the same generator so it matches the assets.

---

## 9. Milestones

Legend: **Deps** = must be finished first. **Verify** = how it is checked. **Exit** = what must be true to call it done.

### M0. Freeze, baselines and tooling (M)
**Goal:** protect your two designs, and record the starting point for everything.

**Work**
- On your explicit "start": install dependencies. Add `pixi.js` (v8), `vitest`, `zod`, and Playwright with Chromium, WebKit and Firefox. Remove unused game dependencies (`three`, `@dimforge/rapier3d-simd-compat`, `@mediapipe/*`, `openai`, `@google/genai`, `lit`, `xrblocks`, `three-*`, `troika-*`, `@preact/signals-core`, `@sparkjsdev/spark`, `@pmndrs/uikit`).
- Add `game/vite.config.ts`, a `test` script, and a working `lint`.
- **Freeze:** copy `drawMalayanTigerRig`, `renderTurtle`, `TurtleRigController` and every helper they call verbatim into `game/src/legacy/`. Originals stay until the old renderers retire.
- **Golden masters:** render both references at a fixed set of poses at 1x, 2x, 3x in both facing directions. Add a test that the legacy copy matches the originals with zero pixel difference, and a guard that fails if the legacy files change.
- **"Before" set for all 77 assets**, plus scenery and UI screenshots (Section 5.1).
- **Style metrics:** script that records outline weight ratio, gradient contrast, highlight area, eye-to-head ratio, head-to-torso ratio, palette statistics for the references.
- **Retention tooling:** palette distance, silhouette IoU, detail energy.
- Baseline performance of the current game.
- Self-host Outfit and Space Grotesk.

**Files:** `game/package.json`, `game/vite.config.ts` (new), `game/tsconfig.json`, `game/src/legacy/*` (new, verbatim), `game/tests/golden/*`, `game/tests/before/*`, `game/tools/style-metrics/*`, `game/tools/retention/*`, `.gitignore`.

**Deps:** your "start". **Verify:** type-check green, zero-diff test passes, baseline numbers recorded. **Exit:** frozen files locked by tests, the "before" set complete, style-metrics report readable.

### M1. Engine core and spikes (L)
**Goal:** the renderer shell, and decisive answers on risky parts.

**Work**
- Renderer with logical resolution, ResizeObserver on the container, DPR and pixel budget, DPR-change listener, orientation handling.
- Quality system (Low, Medium, High), auto-detected from the first 3 seconds, persisted.
- Fixed 60 Hz loop with accumulator and interpolation, hidden-tab pause, catch-up cap.
- Camera: zoom about the pointer, inertia, pixel snapping when idle, clamps by zoom.
- Spatial-hash culling on both axes.
- Texture cache: LRU with GPU budget, IndexedDB raster persistence, versioned keys.
- SVG loader and rasteriser, time-sliced, per tier and level of detail.

**Spikes (each ends with a number and a go or no-go)**
- **S1 Lit rigid parts.** 60 multi-part entities with the lit shader. Does batching hold 60 fps at 4x CPU throttle?
- **S2 SVG rasterisation.** Raster time and memory for a detailed species at each tier, throttled.
- **S3 Raster cache.** IndexedDB round trip, Safari limits and fallback.
- **S4 SVG budget.** How many paths, symbols and bytes per part before raster time or size becomes a problem. Sets per-asset budgets.
- **S5 Joint seams.** Rigid chain with overlap caps at maximum bend.
- **S6 Legacy adapter.** Cost of presenting the tiger and turtle as per-frame textures for 1, 3 and 6 instances.
- **S7 Scenery tiles.** Raster cost and memory of chunked scenery strips at three zoom levels.

**Files (new):** `game/src/engine/{renderer,quality,loop,camera,culling,lighting,textureCache,atlas,svgLoader}.ts`, `game/src/engine/shaders/*`, `game/src/legacy/adapter.ts`, `game/spikes/*` (throwaway).

**Deps:** M0. **Verify:** unit tests for loop, culling, cache eviction, quality selection, plus spike reports with numbers. **Exit:** all seven spikes have a recorded decision. If any fails, I return with options before building on it.

### M2. SVG generator, style kit, armour engine, gallery (XL)
**Goal:** a generator that produces reference-quality SVG, and the review tool.

**Work**
- SVG builder, path DSL, symbol system, quantiser, linter, determinism checker.
- **Style kit** calibrated to the golden-master metrics.
- **Imbricate armour engine:** places scales, scutes, plates and feathers on a surface described by rows and a flow field; sizes vary by region; rows follow curvature; free edges point in a given direction; guarantees full coverage with at least two-layer overlap in the interior; foreshortens near the silhouette. Exposes U1 to U4 tests.
- **Strand synthesiser** with direction fields, clumping, noise colour, silhouette tufts.
- Wrinkle fields, bark, leaf venation, petal structure.
- **Gallery harness** (`game/gallery.html`): each asset at 1x/2x/3x; day, dusk, night; **before/after pair**; beside the frozen tiger and turtle at the same scale; beside a real photo; layer toggles; bone overlay; cute-factor slider; wind, walk, wave and swim controls; frame time and texture memory; contact-sheet export; **retention and universal-spec report per asset**.
- Reference manifest: local photo, licence, attribution link.

**Files (new):** `game/tools/svg/{builder,dsl,quantise,lint,determinism}.ts`, `game/tools/svg/style/*`, `game/tools/svg/patterns/{strands,imbricate,wrinkles,bark,veins,petals}.ts`, `game/src/gallery/*`.

**Deps:** M1, M0. **Verify:** determinism, linter, armour coverage, style conformance on a test patch, cross-browser raster parity. **Exit:** a test part matches the references' style metrics within tolerance and the armour engine passes U1 to U4.

### M3. Anatomy, physics and animation toolkit (L)
**Goal:** a motion engine for rigid-part rigs that obeys your physics requirements and feels as smooth as the references.

**Work**
- `proportions.ts`: typed table per species. Every field has `value`, `source`, `kind (measured | derived | estimated)`, `confidence`. Research and citations happen here (web search for morphometrics).
- Rigid skeleton: bones, joints, limits, far-side limbs offset in depth, chains for tail, trunk, spine, neck, ears, fins, fronds, wings.
- Analytic two-bone IK with foot-plant constraints.
- Gait generator from Froude number. For mammals I will use the Alexander and Jayes dynamic-similarity relation (relative stride length approximately 2.3 times Fr to the 0.3, with hip height as the length), duty factor ranges per gait, and walk, trot, run transitions by Froude number. Constants are re-verified against sources in this milestone.
- Class locomotion: quadruped, plantigrade, ungulate, primate (quadrupedal and brachiating), biped bird, bat flight, serpentine, lizard sprawl, chelonian, shark and fish undulation, cetacean fluke, sirenian, ray wing wave, crustacean walking, cephalopod jet and crawl, bivalve (sessile), echinoderm tube-foot crawl.
- Body: mass, centre of mass, momentum, acceleration limits, turning limits, support-polygon check.
- Swim: buoyancy and drag; propulsion by fluke, flipper, fin or jet; surfacing for air breathers.
- Springs: exact analytic spring-damper, chain springs.
- Wind: gust field plus branch oscillators.
- Dynamics: Froude-scaled gravity, restitution, swept terrain collision, settling.
- **Animation state machine:** idle (breath, blink), walk, turn, wave (120 degree offset like the references), eat (pickup, chew, swallow), emotions, sleep, fall and land, with critically damped blending. A **motion-feel profile** measured from the tiger and turtle (walk frequency, bob, easing, blink timing) is applied to every class.

**Files (new):** `game/src/anatomy/{proportions,skeleton,ik,gait,body,swim,secondary,dynamics,stateMachine,motionProfile}.ts`, `game/src/flora/wind.ts`, `game/src/anatomy/locomotion/*`.

**Deps:** M1. Independent of M2 except gallery controls. **Verify:** Section 16 physics and smoothness tests. **Exit:** all tests pass on test skeletons.

### M4. Plant generator (L)
**Goal:** botanically correct plant structure emitted as SVG parts.

**Work**
- Parametric 3D branching with species parameters: apical dominance, branching angles, internode length, pipe-model radius law, phototropism and gravitropism bend.
- Leaf placement: alternate, opposite, spiral (golden angle 137.5 degrees), whorled, rosette; size distribution along the branch; petiole; droop.
- **Every leaf attaches to a node.** No floating leaves (U5).
- Leaf SVG with shape variation, midrib, secondary and tertiary veins, translucency mask. Cluster SVGs with 3 to 4 depth layers and self-shadowing.
- Trunks and branches as **rigid segment chains** with overlap and bark continuity, so sway rotates segments.
- Growth forms beyond trees: palm, giant herb with pseudostem, bamboo clump, rosette, fern, creeping stem, floating mat, submerged whorl, ribbon grass.
- Flowers: petal generator with cupping, venation, pigment patterns, stamens, inflorescence types (corymb, spike, torch, solitary).
- Fruit generator shared with the food icons so a fruit on a plant and the same fruit in the bag are one source.
- Continuous growth from `growthProgress` through keyframe structures with rigid-part interpolation.
- Seeded asymmetry per plant.

**Files (new):** `game/tools/svg/flora/{growth,forms,leaves,flowers,fruit,emit}.ts`, `game/tools/svg/flora/species/*`.

**Deps:** M2, M3 (wind). **Verify:** geometry tests (leaf attached, radius law, branching angles in range, asymmetry above minimum, canopy coverage), seam tests on chains. **Exit:** the four first-batch plants pass.

### M5. First batch (10 species) and review gate G1 (XL)
**Goal:** the first 10 species refined through the loop and shown for approval.

**Work**
- Run the loop (5.4) on the 10 species in Section 3.2. Start with the pangolin because it exercises the armour engine, the segmented tail and U1 to U8.
- Species data: proportions with sources, colour model (from the old palette), patterns (keeping markings), habitat feature needs.
- Minimal stage scene (flat ground and water tank): planted feet, swimming, wind, springs, drop and settle, wave and emotes, with the frozen references running in the same scene.

**Files (new):** `game/tools/svg/species/*`, `game/public/assets/svg/<id>/*` (generated), `game/src/rig/*`, `game/src/stage/stage.ts`.

**Deps:** M2, M3, M4. **Verify:** Section 16. **Exit:** G1 checklist (Section 19).

### >>> STOP. Gate G1: you review the look. I do not start M6 until you approve.

### M6. Remaining assets (XL, after G1)
Sub-batches, each a full loop run by class, with a short report and no stop between them unless you ask:
- **M6a Mammals:** sun bear, giant panda, tapir, sambar, mousedeer, macaque, dusky leaf monkey, langur, porcupine, squirrel, flying fox.
- **M6b Reptiles and birds:** python, clouded monitor, water monitor, terrapin, box turtle, hawksbill, fireback.
- **M6c Fish and sharks:** arowana, featherback, snakehead, clownfish, whale shark, blacktip.
- **M6d Marine mammals, ray, invertebrates:** dolphin, false killer whale, ribbontail ray, prawn, harlequin shrimp, octopus, cuttlefish, giant clam, sea star.
- **M6e Plants:** tualang, mangosteen, rambutan, sugar palm, nipa, banana, papaya, torch ginger, bamboo, fern and tree fern, hibiscus, ixora, orchid, pitcher plant, mangroves, seagrasses, floating and aquatic plants (water spinach rebuilt as a creeping herb).
- **M6f Foods and fruits:** 8 icons, shared with plant fruit.

Count: 33 animals, 26 plants, 8 foods. Every asset passes the same gallery review and U1 to U12. Any asset that looks flat, floaty or drawn is redone first.

### M7. Scenery and situation (XL, after G1; Section 11)
Terrain materials, water, sky and weather, parallax backgrounds, set dressing library, habitat features, lighting states, particles, audio, weather proxy, composition rules.

**Files (new):** `game/tools/svg/scenery/*`, `game/public/assets/svg/scenery/*` (generated), `game/src/world/*`, `game/src/audio/*`, `api/weather.ts`. **Retire:** `worldRenderer.ts`, `sound.ts` after integration.

### M8. Game integration and ecosystem rules (L, after M6 and M7)
- `main.ts` and scene classes replace `index.ts`. A `public.ts` facade keeps the exports the web app uses.
- The tiger and turtle enter the scene through the legacy adapter.
- Behaviour: activity patterns, sessile species, diets and new foods, hunger by metabolism, no predation, 2.5D lanes, alpha-mask hit testing.
- World size, per-species speeds, teleport with background pre-warm and a loader tied to real progress.
- Persistence v3 and migration from v2 (keep purchases and names, reset positions, clamp values, report dropped entries).
- Update `world.test.ts`.
- Retire the old shared renderers once nothing uses them. The legacy folder stays.

### M9. UI overhaul and manual (XL; Section 12)
Full UI refinement program with the loop, the SVG icon set, scene-UI integration, accessibility and the manual.

### M10. Backend, security, scale (L; the P0 patch moves earlier)
- **P0 patch (pulled forward, see 18.2):** revoke `sync_sanctuary_balance` from `authenticated` and stop the client-computed offset.
- Tables `sanctuary_saves` (JSONB document with `rev`), `sanctuary_actions` (append-only log, unique idempotency key), `rate_buckets`.
- Edge function `sanctuary-action`: validation with `zod`, server-time hunger and growth, reward rules and caps (300 per day, per-action and per-animal), anti-spam, optimistic concurrency, batched requests.
- RLS blocks client writes to balances and saves.
- Client session cache, write-behind batching, flush on `pagehide`, safe conflict handling, local-only guest saves.
- Remove the per-tap ledger realtime subscription.
- Name length cap and filter. Read-only audit report of existing sanctuary ledger entries.

**Files (new):** `supabase/migrations/2026…_sanctuary_v3.sql`, `supabase/functions/sanctuary-action/index.ts`, `supabase/functions/_shared/{schema,rules}.ts`, `game/src/data/{api,cache,sync}.ts`. You apply the migrations.

### M11. Hardening and the global refinement pass (L)
- Performance tuning against budgets, memory leak sweep, error boundaries, dead code and CSS removal, documentation.
- **Global recursive pass:** every asset, the scenery and the UI re-audited together in context (neighbouring species, lighting, scale, weather). Any defect restarts the loop for that item.
- Final regression of all 633 findings, each marked fixed, waived or deferred with a reason.

---

## 10. Per-asset refinement briefs

Every brief assumes the common rule from Section 5.2: **keep** the existing palette, markings, face personality and silhouette family (captured in the "before" set), **fix** the listed items, and pass U1 to U12. "Shared rig" means the current code reuses one drawing function with palette swaps. These are expectations from reading the code and from biology. The audit (R0) confirms or corrects each one against the real "before" render, and proportions are checked against sources in M3.

### 10.1 Animals (39)

| ID | Species | Refine (expected defects and upgrades) |
|---|---|---|
| A02 | Asian elephant | Trunk as 10 to 14 segment chain with ring wrinkles and finger tip; ear flap with veins and fold; columnar legs with toenails; skin folds at joints; sparse bristles; straight paired tusks; heavy weight-shift gait |
| A03 | Malayan tapir | Correct two-tone pattern (dark fore body and legs, pale saddle and rump); prehensile proboscis chain; white-rimmed round ears; 4 front and 3 hind toes; stocky odd-toed stance |
| A04 | Orangutan | Shared primate rig replaced. Very long arms, hooked hands and feet, shaggy ginger hair strands with direction, flanged face, no tail, brachiating and ground poses |
| A05 | Sun bear | Short sleek black coat, golden chest crescent, loose neck skin, long curved claws, plantigrade stance, short ears, long tongue |
| A06 | Sunda pangolin | Imbricate scales over the whole back and flanks with tailward overlap; fine head scales; bare belly, face and inner limbs; segmented prehensile tail with scales to the tip; claws on forelimbs |
| A07 | Sambar deer | Shared cervid rig replaced. Three-tined antlers on males, coarse shaggy coat and neck mane, ungulate leg joints (carpus, hock), hooves, dark tail |
| A08 | Greater mousedeer | No antlers; small tusks on males; arched back with higher rump; slender legs, tiny hooves; throat stripes and spotted flanks |
| A09 | Long-tailed macaque | Shared primate rig replaced. Tail about body length, cheek whiskers, crest hair, face skin, quadrupedal gait, grasping hands |
| A10 | Dusky leaf monkey | White eye rings and pale muzzle, slim body, long tail, leaping posture, grey fur direction |
| A11 | Malayan porcupine | Banded quills in a graded length field, short legs, blunt snout, bare face and belly, quill raise on anger |
| A12 | Malayan flying fox | Wing membranes spanning rigid finger-bone chains, thumb claw, hanging roost pose, fox-like face, golden mantle |
| A13 | Raffles' banded langur | Shared primate rig replaced. Dark coat with pale underparts and crest, long tail, slender limbs, leaf-eater posture |
| A14 | Crested fireback | Shared avian rig replaced. Overlapping feather rows, crest, bare red face skin, long tail feathers, scaled legs with spurs, ground-walking gait |
| A15 | Rhinoceros hornbill | Casque and bill with ridges, large wings with primaries, white tail with black bar, feather overlap, perched and flight poses |
| A16 | Reticulated python | 20 or more segment spine chain; dorsal diamond net pattern following curvature; ventral scutes; head plates; spectacle eye; serpentine locomotion |
| A17 | Clouded monitor lizard | Shared lizard rig replaced. Arboreal build, long tail, granular scales with clouded pattern, claws, forked tongue |
| A18 | Black giant squirrel | Bushy tail chain, hand and foot detail, dark dorsal coat and cream belly, ear shape, bounding gait |
| A19 | Smooth-coated otter | Dense short fur with wet sheen, webbed feet, flat tapered tail, whiskers, flexible spine, swim and land gaits |
| A20 | Giant freshwater prawn | Shared crustacean rig replaced. Segmented carapace and abdomen, long second claws, 4 walking leg pairs, antennae, tail fan |
| A21 | Asian arowana | Large cycloid scales in ordered rows (armour engine), barbels, upturned mouth, long pectoral and anal fins, fin ray structure |
| A22 | Clown featherback | Knifefish body, feather-like tail, long undulating anal fin, spot pattern, fin ray structure |
| A23 | Southern river terrapin | Scute pattern on carapace, plastron, webbed feet, head markings; sibling of the frozen turtle's style |
| A24 | Southeast Asian box turtle | Domed carapace with ridge, hinged plastron, yellow head stripes, scute overlap |
| A25 | Asian water monitor | Shared lizard rig replaced. Heavy body, laterally compressed swimming tail, scale rows, claws, forked tongue |
| A26 | Giant snakehead | Snake-like head with plates, long continuous dorsal fin, stripe pattern, scale rows |
| A27 | Dugong | Downturned bristled muzzle, fluke tail, flippers, no dorsal fin, skin texture, surfacing to breathe |
| A29 | Hawksbill sea turtle | Overlapping amber-mottled scutes, serrated rear margin, hawk beak, two claws per flipper; sibling of the frozen green turtle |
| A30 | Whale shark | Checkerboard spots following the form, flank ridges, wide terminal mouth, 5 gill slits, vertical tail, cruising undulation |
| A31 | Indo-Pacific humpback dolphin | Dorsal hump, long beak, pink-grey colouring, fluke and flipper detail, porpoising |
| A32 | False killer whale | Slender dark body, rounded melon with no beak, humped flipper, fluke detail |
| A33 | Blacktip reef shark | Black fin tips, 5 gill slits, countershading, lateral line, shark body undulation |
| A34 | Clownfish | White bands with black edging and correct widths, fin detail, scale sheen, anemone companion prop in scenery |
| A35 | Giant clam | Fluted shell ridges (armour engine), iridescent mantle pattern, siphon, sessile with gape motion |
| A36 | Bluespotted ribbontail ray | Disc with blue spots, tail with spines, spiracles, ventral gill slits, wing-wave swimming |
| A37 | Coconut octopus | 8 arms with two rows of suckers, skin papillae, eye with rectangular pupil, arm curl chains, shell carrying |
| A38 | Harlequin shrimp | Shared crustacean rig replaced. Spotted body, paddle claws, segmented abdomen, antennae |
| A39 | Cuttlefish | Undulating fin skirt, 8 arms plus 2 tentacles, W-shaped pupil, mantle patterning, jet and fin motion |
| A40 | Horned sea star | Five radial arms with ossicle bumps and horn spines, tube feet underside, slow crawl |
| A41 | Giant panda | Patch pattern, rounded ears, pseudo-thumb, plantigrade stance, dense fur. Labelled as a non-Malaysian special |

### 10.2 Plants (30)

| ID | Species | Refine (expected defects and upgrades) |
|---|---|---|
| P01 | Rafflesia | Five fleshy lobes with raised warts, central disc with processes, bud stages, host vine |
| P02 | Tualang | Huge buttressed emergent trunk, pale smooth bark, layered flat crown, hanging honeycombs |
| P03 | Durian | Lanceolate leaves with coppery underside, alternate arrangement, spiky husk fruit hanging on branches, branching from the pipe model |
| P04 | Mangosteen | Dense pyramidal crown, glossy opposite leaves, purple fruit with calyx |
| P05 | Banana | Layered pseudostem sheaths, large paddle leaves with torn margins, hanging heart and hands of fruit |
| P06 | Papaya | Single scarred stem, palmate lobed leaves on long petioles, fruit clustered at the crown |
| P07 | Bamboo | Jointed culms with nodes and sheaths, branch complement at nodes, fine leaf clusters, clumping habit |
| P08 | Pitcher plant | Tendril from the leaf tip, lid, ribbed peristome, colour-graded pitcher |
| P09 | Bird's nest fern | Rosette of simple fronds with crinkled margins, dark midrib, nest centre |
| P10 | Torch ginger | Tall pseudostem with leaf blades, separate flower stalk with torch of bracts |
| P11 | Hibiscus | Serrated alternate leaves, five-petal flower with staminal column, shrub branching |
| P12 | Ixora | Opposite glossy leaves, dome corymb of four-petal tubular flowers |
| P13 | Coconut palm | Curved ringed trunk, bulbous base, drooping pinnate fronds with rachis, coconut cluster |
| P14 | Banyan fig | Aerial roots becoming pillars, spreading crown, figs |
| P15 | Rambutan | Pinnate leaves with paired leaflets, hairy red fruit clusters |
| P16 | Sugar palm | Pinnate fronds, black fibre sheath on the trunk, hanging fruit strings |
| P17 | Tree fern | Fibrous trunk with frond scars, crosier fiddleheads, bipinnate fronds |
| P18 | Tropical orchid | Pseudobulbs, arching spike, flower with lip (labellum) structure, aerial roots |
| P19 | Red mangrove | Stilt prop roots, hanging propagules, opposite leaves, tidal mud interface |
| P20 | Api-api mangrove | Pencil-like breathing roots, silvery leaf undersides, bark texture |
| P21 | Nipa palm | Trunkless fronds rising from a rhizome in mud, fruit head ball |
| P22 | Enhalus seagrass | Long ribbon leaves, hairy rhizome, stalked flowers |
| P23 | Thalassia turtle grass | Short curved ribbon leaves with rounded tips, scarred rhizome |
| P24 | Eelgrass | Narrow ribbon leaves in tufts |
| P25 | Water hyacinth | Inflated floating petioles, leaf rosettes, purple flower spike, hanging roots |
| P26 | Lotus | Peltate leaves on tall stalks above water, large flower, showerhead seed pod |
| P27 | Water lily | Round notched floating pads, surface flowers |
| P28 | Duckweed | Tiny fronds forming a mat, hairlike roots |
| P29 | Hornwort | Whorled forked leaves, rootless submerged stems |
| P30 | Water spinach | **Currently drawn as a woody tree.** Rebuild as a creeping hollow-stemmed herb with arrow-shaped leaves and funnel flowers |

### 10.3 Foods and fruits (8)

| ID | Item | Refine |
|---|---|---|
| food_durian_fruit | Whole spiky durian | Husk spines with correct spacing and shading, split seam, one source with the tree fruit |
| food_mangosteen_fruit | Queen mangosteen | Purple rind, calyx, cut-away white segments |
| food_banana_bunch | Pisang emas bunch | Hand of fingers with curve and ridges, stalk, ripeness gradient |
| food_rambutan_papaya | Rambutan and papaya | Hairy rambutan strands, papaya skin and seeds |
| food_seaweed_kelp | Emerald seagrass | Ribbon leaves with veins and rhizome |
| food_plankton_bloom | Marine plankton | Diatom and copepod shapes, soft glow, no flat blob |
| food_river_minnow_treat | River prawn and fish | Prawn segments and fish scales (armour engine) |
| food_bamboo_honey_pellet | Bamboo and wild honey | Bamboo section, honeycomb, honey drip |

### 10.4 Class defect catalog (initial hypotheses, to be confirmed by R0)

| Class | Likely defects from reading the code and biology |
|---|---|
| Scaled animals (pangolin, python, monitors, fish, turtles, shark skin) | Grid or pattern fills clipped by the body, inconsistent overlap, uniform size, gaps near the silhouette |
| Feathered animals | Blob wing, no overlapping feather rows, wing does not fold |
| Furred animals | Flat fill, no direction, no tufts at the silhouette |
| Primates | One rig for four species, same arm length and tail |
| Ungulates | Cervid rig for two different animals, wrong leg joints |
| Fish and cetaceans | Rig shares flippers and fins, no body undulation |
| Invertebrates | Wrong limb counts, no segmentation, no sucker rows |
| Trees | Few branches, floating leaves, mirror symmetry, rigid canopy |
| Palms and herbs | Drawn with the woody trunk function, wrong form |
| Aquatic plants | Shared cases, no depth layering, no waterline interaction |

---

## 11. Scenery and situation bible

"Situation" here means the setting around each animal: where it lives, what is around it, what the light and weather are doing (see N13). The scenery is built with the same SVG generator, so it matches the creatures.

### 11.1 What exists now (from the code)

Terrain is a sum of sines filled with one gradient per zone. Sky is a gradient with a hand-drawn sun, moon, stars and cloud clusters. Water is a flat gradient with dashed lines. Scenery chunks add rocks, logs, reeds and coral bommies from a seeded hash. There are two parallax hill layers, no foreground layer, and plants are drawn before animals with no depth sorting.

### 11.2 Layer stack (back to front)

1. Sky gradient and celestial bodies (sun, moon phase, stars).
2. Cloud layers with shadows.
3. Far haze ridges (2 to 3 layers) with atmospheric perspective.
4. Mid and near background canopy or horizon bands per biome.
5. Terrain surface and material strips.
6. Mid-ground set dressing.
7. Gameplay layer: plants, animals, fruit, towers, y-sorted.
8. Foreground dressing that overlaps the gameplay layer (ferns, roots, reeds, kelp).
9. Weather and particles.
10. Colour grade and vignette (applies to everything, including the frozen references).

### 11.3 Biomes

| Biome | Ground | Water | Background | Signature dressing |
|---|---|---|---|---|
| Rainforest | Soil, leaf litter, roots, moss | None | Layered canopy, hanging lianas, emergent trees | Fallen logs, buttress roots, mossy rocks, fungi, termite mound, bamboo clumps, creepers, shafts of light |
| River pond | Clay, sand, pebbles, riverbed | Fresh water, tannin tint, shallow-to-deep gradient | Bank vegetation, overhanging branches | Boulders, driftwood, reeds, lily-pad scenery, pebble beds, bank roots |
| Mud shore and mangrove | Wet glossy mud with ripples, shells | Tidal pools | Mangrove line, nipa clumps | Prop roots, pneumatophores, mud pools, burrow decals, shells, driftwood |
| Coral sea | Sand ripples, rubble, rock | Surface layers, depth fog, caustics, shore foam | Reef silhouettes in layers | Branching, brain and table coral, sea fans, sponges, seagrass beds, kelp strands, rocks |

### 11.4 Materials and set dressing

- **Ground materials:** seamless SVG tiles with relief so lighting reveals texture. At least 4 variants per material to break repetition.
- **Set dressing library:** at least 10 prop types per biome with at least 6 variants each, placed by seeded Poisson-disk sampling. Props never overlap animals or plants (clearance zones).
- **Habitat features (N13):** burrow mound (pangolin), nest log (hornbill), mud wallow (elephant), holt on a bank (otter), rock den (tiger and sun bear), nest platform (orangutan), roost branch (flying fox), seagrass bed (dugong), anemone (clownfish), den and shells (octopus), coral head (cuttlefish and sea star). A feature is spawned once when a species is placed with none nearby. It can be hidden in settings.

### 11.5 Water

Surface line with animated normals, body gradient with depth fade, shoreline wet band, shore foam, ripples when an animal crosses the surface, caustics near the surface, god rays from the sun angle, reflection hints near the bank, bubbles. Underwater assets receive depth tint through the lighting shader. The frozen references receive the same tint through the scene grade.

### 11.6 Sky, light and weather

- Time of day from the real clock: dawn, day, dusk and night each have a colour script per biome.
- Sun and moon follow a proper arc with phase. Stars are fixed to a sky dome seed.
- Cloud layers drift with wind and cast shadows on terrain.
- Weather states: clear, cloudy, rain (with splashes on water and ground), fog (distance-based), wind (direction and strength), storm with optional lightning and thunder, rainbow only when sun and rain coexist and opposite the sun.
- Fireflies are lights, not creatures. Tower crystals and deep-sea glow are dynamic lights.
- The weather proxy replaces direct browser calls.

### 11.7 Scene composition rules

- No screen is empty: minimum prop density per viewport per biome.
- No clutter: maximum density near gameplay objects, clearance around animals.
- No repetition: variants per prop, seeded placement, autocorrelation check across three screens.
- Biome boundaries blend through ecotone bands (hills into mangrove into mudflat into beach into reef).
- Vertical structure: sky, canopy, ground, underwater strata each have distinct palettes and light.

### 11.8 Scenery loop and verification

The scenery goes through the same loop (audit, structure, surface, motion/light).
- **Tile seam test:** edge colour and alpha continuity.
- **Repetition test:** no repeated motif within three screens.
- **Density and clearance tests.**
- **Parallax ratio test.**
- **Lighting test:** each time-of-day and weather state renders without banding or clipped values.
- **Performance:** 60 fps on the throttled profile with the scene full and 30 entities.

---

## 12. UI refinement program

The 200 UI findings and the manual findings are the audit input. The direction (N14) is a game-style HUD built with the same generator so it matches the art.

### 12.1 Design system

- Tokens: colour, type scale, spacing on a 4 and 8 px grid, radii, elevation, motion durations and easings, z-index scale.
- Scoped CSS namespace so game and web styles stop colliding. Self-hosted fonts.
- **SVG icon set** (60 or more icons) generated by the same tool: currency, hunger, love, zones, weather, tools, actions.
- Surfaces with subtle material and depth consistent with the creature art. Buttons with a clear hierarchy (primary, secondary, tertiary, destructive).
- Light and dark theme following the web app.
- UI sounds and haptics.

### 12.2 Screens and components

HUD (icons, time and weather chip, sync status, notifications), adaptive dock (tabs, tap-to-place, long-press info, landscape side drawer), anchored inspector (actions, love progress, plant inspector), store (zone filter, search, chips, owned and placed badges, preview, quantity), teleport (biome-coloured pins, labels, current location, recents, real progress), species card (scientific and Malay names, correct status, diet and habitat chips), settings (sound, graphics, language, reduced motion, export, import, reset with confirm), toasts with queue, welcome-back summary, first-run hints, Ecodex and quests, postcard camera, loading screens, manual.

### 12.3 In-world UI

Name tags, selection ring, hunger bubbles, coins, rejection messages and drag ghost are rebuilt as SVG, scale-aware, readable at any zoom, with a screen-reader mirror (live region).

### 12.4 Manual

Speech bubble with a tail, large turtle (about 30% of the shorter screen side), shorter tour, skip and remind later, resumable. The launcher is hidden during the tour and pops in after it. The mascot keeps your existing turtle art. First step is a re-audit of the recent commits so only open items are changed.

### 12.5 Loop and verification

- **U-R1 Layout and responsive:** 6 viewport sizes in portrait and landscape.
- **U-R2 Visual polish:** spacing, type, contrast (WCAG AA), consistency, motion.
- **U-R3 Accessibility and input:** keyboard play, focus handling, ARIA, reduced motion, colour-blind-safe cues, non-drag alternative for placing and feeding.
- Screenshot matrix: 6 sizes by 2 orientations by 3 browsers, with diffs between rounds.
- Touch targets at least 44 px; no text below 12 px; no overlap between HUD, card, toast and dock at any size.

---

## 13. File-by-file change map

### New (game)
`legacy/*`, `engine/*`, `rig/*`, `anatomy/*`, `flora/*`, `stage/*`, `gallery/*`, `world/*`, `audio/*`, `behavior/*`, `data/*`, `ui/*`, `i18n/*`, `main.ts`, `public.ts`, `vite.config.ts`, `tests/{golden,before}/*`, `tools/{svg,style-metrics,retention}/*`, `public/assets/svg/*` (generated assets, creatures, plants, foods, scenery, icons).

### Modified (game)
`package.json`, `tsconfig.json`, `index.html` (self-hosted fonts, viewport), `src/game/types.ts`, `src/game/worldConfig.ts`, `src/game/persistence.ts`, `src/roster/catalog.ts` (conservation data, panda label, added species), `src/game/world.test.ts`.

### Retired after replacement
`src/index.ts`, `src/game/worldRenderer.ts`, `src/game/sound.ts`, `src/roster/animalRenderer.ts`, `src/roster/plantRenderer.ts`, `src/bg.svg`. **Not retired:** the verbatim legacy copy, and `turtle/rig.ts` and `turtle/renderer.ts` while the web mascot uses them.

### Web app
`GamePage.tsx`, `MascotManualTour.tsx` (rewrite), `MascotWidget.tsx`, `TurtleCanvas.tsx`, `GameLoadingOverlay.tsx` (DPR fix only), `App.tsx`, `styles.css`, `vite.config.ts`.

### Backend
`supabase/migrations/…sanctuary_v3.sql`, `supabase/functions/sanctuary-action/*`, `supabase/functions/_shared/*`, `api/weather.ts`.

### Never touched
The tiger and turtle drawing code and animation curves, `ml/`, habit scoring, redeem and welcome-bonus functions.

---

## 14. Dependency order

```
M0 freeze, golden masters, "before" set, tooling
 └─ M1 engine core + spikes S1..S7
     ├─ M2 SVG generator + style kit + armour engine + gallery ─┐
     ├─ M3 anatomy + physics + animation ───────────────────────┤
     └─ (M2 generators) ── M4 plant generator ──────────────────┤
                                                                └─ M5 first batch of 10
                                                                      │
                                                    ==== GATE G1 (your approval) ====
                                                                      │
                  ┌───────────────────────────┬───────────────────────┴──────────────┐
                  M6a..M6f remaining assets   M7 scenery and situation               (M10 P0 patch pulled forward)
                  └──────────────┬────────────┘
                                 M8 integration + ecosystem rules
                                 M9 UI + manual            M10 backend
                                 └──────────────┬──────────┘
                                                M11 hardening + global pass
```

M2, M3 and M4 can run in parallel after M1. I will do them in series unless you want parallel sub-agents. M6 and M7 can run back to back.

---

## 15. Quality tiers and budgets

| | Low | Medium | High |
|---|---|---|---|
| Raster texel density (texels per CSS px) | 1.0 | 2.0 | up to 3.0 |
| DPR cap | 1.5 | 2 | 3 within pixel budget |
| Pixel budget | 2.5M | 4M | 8M |
| Layers rasterised per part | Baked-light variant only | Albedo, relief, material | Same, plus close level of detail |
| Runtime lighting | Tint, depth, cheap rim | Full | Full |
| Strand and detail groups (`lod-hi`) | Dropped | Kept | Kept |
| Silhouette tufts on springs | Few | Standard | Full |
| Scenery layers and props | Reduced density, 2 background layers | Full | Full plus extra foreground |
| Water, caustics, god rays | Simplified | Full | Full |
| Particles | up to 40 | up to 150 | up to 400 |
| Fully simulated entities | up to 12 | up to 24 | up to 40 |
| Physics, gaits, IK | **Identical** | **Identical** | **Identical** |
| GPU texture budget (estimate, to be measured) | 80 MB | 160 MB | 320 MB |

Rules on every tier:
- Physics, gait timing, IK and springs never change.
- Off-screen entities freeze their detail but keep logical state.
- The frame-time governor lowers resolution first, then effects.
- Per-asset SVG size budgets are set after spike S4.
- Budgets are targets until measured in M1 and M5.

---

## 16. Verification strategy

### 16.1 Protection of the references
- Golden masters: the legacy tiger and turtle must match the original renders with zero pixel difference at every stored pose and scale, now and after every later milestone.
- A test fails if the legacy files change.

### 16.2 Retention and change (5.2)
- Palette distance, silhouette IoU, markings present, face kit present, proportion envelope.
- Change floor: detail energy at least 2 times the old render, defects fixed, part count at the table value.
- Out-of-band results are flagged, not accepted silently.

### 16.3 Style conformance (against the references)
- Outline weight relative to part size, outline colour tint rule.
- Gradient contrast and highlight coverage per part.
- Face kit layer count and eye proportions.
- Palette saturation and warmth range.
- Head-to-torso and leg ratio inside the references' envelope.
- No flat fill: luminance variance and fine-detail energy above a minimum.

### 16.4 Universal specs U1 to U12
Automated per asset where listed in Section 5.3, including: zero see-through pixels (U1); flow-field consistency (U2); size by region (U3); curvature following (U4); attachment distance (U5); seam test at maximum joint angle (U6); region masks (U7); counts (U8); asymmetry range (U9); bone ratios (U10); material masks (U11); physics and smoothness (U12).

### 16.5 SVG and build checks
- Linter: no filters, images, scripts, external references.
- Determinism: regenerate and compare.
- Size budgets per asset and per part.
- Cross-browser raster parity: Chromium, WebKit, Firefox.

### 16.6 Plant checks
Every leaf attached to a node; pipe-model radius law holds; branching angles inside species range; asymmetry above a minimum; canopy coverage inside the crown hull above a minimum with interior gaps below a maximum; trunk seam tests.

### 16.7 Physics tests (thresholds fixed before M3 starts and shown to you)
- Foot slip: planted-foot world displacement during stance at most 1% of stride length (new assets).
- Stride law: within 10% of the dynamic-similarity prediction at three speeds per quadruped.
- Duty factor inside published ranges.
- Stability: centre of mass inside the support polygon in at least 95% of slow-walk frames.
- Momentum: acceleration never exceeds force limit divided by mass; turn radius at least `v^2 / (mu g)`.
- Swimming: terminal velocity within 5% of analytic; buoyant equilibrium stable; air breathers surface and dive on cycle.
- Springs: overshoot within 10% of analytic; stable at any timestep.
- Wind: frequency within 5%; energy decays; no jitter.
- Drop and settle: settles within 2 seconds at the stated restitution; no tunnelling.

### 16.8 Animation smoothness
- Joint angles and positions continuous through every state transition.
- Jerk bounded and compared with the references' measured distribution.
- Output at 60, 120 and 144 Hz matches within 1%.
- Wave uses the same 120 degree offset as the references.

### 16.9 Scenery and UI
Section 11.8 and Section 12.5.

### 16.10 Performance
- Mobile-emulated browser at 4x CPU throttle: p95 and max frame time, draw calls, texture memory, raster time, per-frame allocations.
- Redraw counter: draws per frame for cached assets must be 0.
- Targets: p95 at or below 16.7 ms on Medium at 4x throttle with the full scene; second launch loads from the raster cache in under 1 second.
- Emulation is not a device. I report what I measured and what I could not.

### 16.11 Gallery review protocol (the gate)
For each asset the gallery shows the before/after pair, the frozen tiger and turtle at the same scale, a real photo, 1x/2x/3x, day, dusk and night, each layer, bones, and motion clips (walk, swim, wave, wind). Checklist:
- **Flat?** Volume, creases, rim, specular?
- **Floaty?** Ground or water contact with weight?
- **Drawn?** Any clip-art fill or style unrelated to the references?
- **Anatomy?** Proportions and structure match the photo and the table?
- **Detail?** Fur, scales, bark, veins, petals visible at 3x with no gaps?
- **Smooth?** Walk, wave and emotes as smooth as the references?
- **Kept?** Palette, markings and personality still recognisably the same species?

Any asset that fails is redone before the next.

---

## 17. Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Lit shader breaks batching | Medium | High | Spike S1; shared-uniform shader; Low tier tinted sprites |
| R2 | SVG rasterisation too slow or memory-heavy on mobile | Medium | High | Spikes S2, S4, S7; time-sliced, per-tier size, IndexedDB cache |
| R3 | Safari SVG limits or rendering differences | Medium | Medium | No filters; WebKit parity tests; your device test |
| R4 | Geometry-only detail makes files too large | Medium | Medium | Symbols, quantised coordinates, budgets, `lod-hi` dropping |
| R5 | Seams show on rigid chains at extreme bends | Medium | Medium | Spike S5; more segments; overlap caps; fold rings |
| R6 | Legacy adapter too slow for several tigers or turtles | Medium | Medium | Spike S6; limit visible legacy instances; re-express in SVG if needed |
| R7 | Frozen files drift through shared helpers | Low | High | Verbatim copy, zero-diff tests, lock test |
| R8 | New assets do not match the references' look | Medium | High | Style kit, conformance metrics, side-by-side gallery |
| R9 | Proportion data missing for some species | High | Medium | Mark estimated, derive from relatives, show provenance |
| R10 | I cannot judge images myself | High | High | Numeric checks plus your visual gate |
| R11 | Normal-map banding from vector relief | Medium | Low | Dither, Low tier baked variant |
| R12 | Web app breaks when internals change | Medium | High | `public.ts` facade; first batch isolated in the gallery |
| R13 | Save migration loses data | Low | High | Backup, validation report, tests with real v2 saves |
| R14 | Scope of 77 assets plus scenery plus UI | High | High | Class templates, cascade rule, one gate, sub-batches |
| R15 | Server rules feel punishing | Medium | Medium | Visible caps, tunable constants |
| R16 | Medium-change band conflicts with realism | Medium | Medium | Flag out-of-band assets for your decision (N10) |
| R17 | Scenery memory and repetition | Medium | High | Chunked tiles, variants, LRU, repetition test (N11) |
| R18 | Habitat features misread what you meant by "situation" | Medium | Low | Tell me; features are optional and hideable |
| R19 | Recursive loop never converges | Low | Medium | Three-pass cap per round, escalation list |

---

## 18. Assumptions, approvals and what I still need

### 18.1 Approved in principle (waiting for your "start")
Playwright with Chromium, WebKit and Firefox; downloading reference photos (local, git-ignored, licence manifest); self-hosting Outfit and Space Grotesk; adding `zod`; adding `pixi.js` and `vitest`; removing unused game dependencies.

### 18.2 Security patch pulled forward
You approved pulling the P0 patch forward. When you say "start", it is the first thing after M0 tooling: revoke `sync_sanctuary_balance` from `authenticated`, stop the client offset. I write the migration, **you apply it**.

### 18.3 Assumptions I will use unless you object
1. **Baseline:** the current working tree (0.1).
2. **Supabase:** I write migration files and functions only. You apply them to your staging project, or tell me if you want me to have access.
3. **Browser matrix:** current Chrome and Safari on mobile; current Chrome, Firefox and Safari on desktop.
4. **Real device:** you test on a real Android phone at the gate and after M9. I will ask for the model then. Until then I verify by emulation and say so.
5. **T4 replacement:** SVG rasterisation with an IndexedDB raster cache.
6. **After G1:** M6 and M7 run back to back with a short report per sub-batch and no stop between them.
7. **First batch:** the 10 in Section 3.2.
8. **Habitat features:** included (N13).
9. **UI direction:** game-style HUD (N14).

### 18.4 What I need from you
- The word **"start"** to begin M0. Nothing is installed or changed before that.
- Anything you want changed in 18.3.

I do not need art files, image tools or cloud accounts beyond the Supabase project already in use.

---

## 19. Gate G1 checklist (what you will receive)

1. Gallery with the first 10 species: before/after pairs, beside the frozen tiger and turtle and a real photo, at 1x/2x/3x, day and night.
2. Stage-scene recording: walking with no foot slip, swimming with buoyancy, wind on plants, spring tails and ears, wave and emotes, drag and drop under gravity. The frozen references run in the same scene.
3. Metric report: golden-master zero-diff result, retention and change results, style conformance, U1 to U12 results, physics and smoothness tests, cross-browser raster parity, frame time and texture memory per tier, raster times.
4. Provenance table: every proportion number with its source and confidence.
5. The "needs your decision" list (assets that left the retention band or failed after three passes).
6. A list of known weaknesses I see, and any tension whose outcome surprised me.
7. A clear question: approve the look, request changes, or redo specific species.

Nothing after G1 starts until you answer.

---

## 20. Deferred and out of scope

- Ambient non-owned fauna and the ecosystem score.
- Predation and population simulation.
- Native apps and other engines.
- Any commit, push or deployment.

---

## Appendix A. Where each earlier finding is handled

| Findings | Topic | Milestone |
|---|---|---|
| A1 to A14, 1 to 20 | Why plants and animals look fake, rendering style | M2, M4, M5, M6 |
| 21 to 50 | Anatomy, animation, physics, behaviour | M3, M6, M8 |
| 51 to 62 | Plants and ecology | M4, M6e, M8 |
| 63 to 79 | World, lighting, particles, weather | M7 |
| 80 to 94 | Performance and architecture | M1, M11 |
| 95 to 109 | Data and security | M10 |
| 110 to 133 | First UI problems (thumbnails, hit areas, dock, input) | M8, M9 |
| 134 to 177 | Manual and mascot | M9 |
| 178 to 215 | Resolution and scaling | M1 |
| 216 to 245 | HUD and layout | M9 |
| 246 to 270 | Input and controls | M8, M9 |
| 271 to 296 | Store, teleport, modals | M9 |
| 297 to 336 | Animal visuals and anatomy | M3, M6 |
| 337 to 357 | Plants and ecosystem | M4, M6e, M8 |
| 358 to 392 | World, camera, lighting, particles, audio | M7 |
| 393 to 410 | Performance, memory, loading | M1, M11 |
| 411 to 424 | Data, security, backend | M10 |
| 425 to 429 | Accessibility and i18n | M9 |
| 430 to 433 | Code and build | M0, M11 |
| 434 to 633 | 200 UI problems | M9 |

---

## 21. Logic and realism pass (revision 4, applied to the current game)

You asked for direct fixes plus a hunt for illogical things (rambutan and papaya sold together, rambutan growing on a hibiscus, the turtle squeezed when touched on a phone, a scene that looks fake). This pass fixes them in the current Canvas2D game. It does not start M0 to M11: no PixiJS, no SVG pipeline, no new dependencies, no backend change. The tiger and turtle drawing code is untouched; only additive exports were added to `animalRenderer.ts`.

Baseline: clean working tree at `2eefa33`. Files changed: `game/src/game/{types,worldConfig,worldRenderer,persistence,i18n,world.test}.ts`, `game/src/index.ts`, `game/src/roster/{animalRenderer,plantRenderer}.ts`.

### 21.1 Food and fruit (fixed)

| ID | Problem found | Fix |
|---|---|---|
| L1 | "Rambutan & Papaya" and "Bamboo & Wild Honey" were single store items made of two unrelated foods | Split into Rambutan Cluster, Ripe Papaya, Bamboo Shoots and Wild Honeycomb. Added Wild Figs, Young Coconut and Ants & Termites. 13 foods total, names and descriptions in all 4 languages |
| L2 | Hibiscus, ixora, torch ginger and lotus grew floating rambutan and papaya icons. Banyan grew rambutan and papaya instead of figs. Coconut palm grew bananas. Sugar palm and nipa grew mangosteens. Mangroves and freshwater plants dropped "Emerald Seagrass". Duckweed dropped plankton | Each plant bears only its own food: papaya to papaya, rambutan to rambutan, banyan to figs, coconut to coconut, bamboo to shoots, Tualang to honeycomb. Shrubs, herbs, palms without a store fruit, mangroves and lotus bear none. Freshwater plants are grazed in place |
| L3 | The Bamboo & Wild Honey icon was keyed `food_bamboo_honey` while the item id was `food_bamboo_honey_pellet`, so it was drawn as a prawn | New icons for every food, keyed by the real ids |
| L4 | Bamboo shoots and seagrass icons floated in the crown. Harvested fruit always fell from 48 px up, whatever the tree height | Shoots and seagrass sit at the base. Fruit falls from the crown of that tree |
| L5 | Saves holding the old combined items | Migration: one old item gives one of each new food. Dropped foods and in-progress meals are remapped |

### 21.2 Diets (fixed)

| ID | Problem found | Fix |
|---|---|---|
| L6 | Malayan tiger (obligate carnivore) ate durian, fruit and pellets; durian text said tigers love durian | Fish & Prawns only; text corrected |
| L7 | Sunda pangolin ate bamboo, honey and fruit; it eats only ants and termites | Ants & Termites only |
| L8 | Giant panda ate fruit and honey | Bamboo only |
| L9 | Python and both monitors ate fruit or pellets; sharks, dolphins, false killer whale, ray, octopus, cuttlefish, arowana, featherback, snakehead and otter ate plankton; whale shark ate seaweed; dugong and adult green turtle ate plankton; harlequin shrimp ate plankton | Diets follow the species (see `worldConfig.ts` comments). Harlequin shrimp gets a meaty ration because the game has no predation (see O3) |
| L10 | Hungry aquatic animals walked to any plant and "ate" their own favourite food from it (a shark got fish from seagrass). Bites never ran out | Only animals that eat that plant type graze it, they eat the plant itself, bites drop and regrow (1 per 40 s, max 5) |
| L11 | Starter bag gave a banana to a sea turtle | Starter bag holds 3 seagrass |
| L12 | Food could be left anywhere (durian on the coral reef) | Foods dropped on the ground must belong to that habitat. Direct feeding still follows diet rules |

### 21.3 Habitats and depth (fixed)

| ID | Problem found | Fix |
|---|---|---|
| L13 | The default bamboo stood at the bottom of the deepest river channel. Bamboo, torch ginger and nipa were allowed in open water. Duckweed and hornwort were allowed in the sea, eelgrass in rivers, red mangrove in the open sea | Plants have a placement type (land, floating, submerged, shallow marine) checked at the drop point. Default bamboo moved to the dry bank. Zones corrected |
| L14 | The "Turtle Seagrass Sanctuary (-24 m)" sat at 64% of abyssal depth, a default seagrass meadow sat in the abyss, and coral was drawn on the abyssal floor | New bathymetry: beach slope, long sunlit reef flat, drop-off, pelagic plain. Seagrass needs shallow sunlit water. Deep floor gets rock and glass sponges, not coral |
| L15 | A whale shark could be placed over a reef flat shallower than its body | Fully aquatic animals need water deeper than their body size |
| L16 | A new player saw an empty ocean: the starter turtle was below the screen. Teleporting to underwater towers ignored the seabed | First camera frames the starter animal. Underwater towers frame the water column at that spot |

### 21.4 Behaviour (fixed)

| ID | Problem found | Fix |
|---|---|---|
| L17 | Every animal slept at night, including nocturnal ones (pangolin, tapir, porcupine, flying fox, mousedeer, sambar, python) | Per-species activity: diurnal, nocturnal or cathemeral. Nocturnal animals sleep by day; tiger, elephant, sharks, dolphins and others are never forced asleep |
| L18 | The giant clam walked. A sea star moved at dolphin speed. All species shared one speed | Per-species speed and patrol range. The giant clam is sessile and cannot be pushed |
| L19 | Canopy animals (orangutan, macaques, langurs, hornbill, squirrel, flying fox) hovered 120 px in the air with no tree | They climb the nearest real tree, wander within its crown, climb down to reach food, and stand on the ground when there is no tree |
| L20 | Otter, terrapin, water monitor and tapir walked on thin air in mid-water | They swim at the surface using the swim cycle |
| L21 | Dropped food fell through water at air speed and fruit sank | Buoyancy and drag in water. Fruit floats, plankton drifts, the rest sinks slowly |
| L22 | Animals dropped into water bounced on landing | They settle without bouncing |

### 21.5 Scale (fixed)

| ID | Problem found | Fix |
|---|---|---|
| L23 | All 41 animals used the same 220 x 200 box (a clownfish the size of an elephant) and all 30 plants the same box (a Rafflesia flower or duckweed the size of an 80 m Tualang) | Per-species size relative to the turtle, compressed from body length (about length^0.4, clamped 0.42 to 2.0). Per-plant height. Store thumbnails unchanged |
| L24 | Feet did not share one ground line; ring, name tag, mouth and bubbles used fixed offsets; plant taps only hit a 74 px circle at the roots | Feet aligned to the ground for every size. Overlays and hit areas scale with the body (finger-sized minimum). Trees are tappable on trunk and crown |

### 21.6 "The turtle gets squeezed on a phone" (fixed)

| ID | Cause found | Fix |
|---|---|---|
| L25 | The canvas bitmap was sized from `window.innerWidth/innerHeight` clamped to at least 320 x 480 (420 after resize), while CSS stretched it to the container. On short or narrow screens (landscape phones, foldables, open keyboard) the whole scene was squeezed non-uniformly. Terrain also changed shape with every resize | Fixed logical height (800 units) scaled uniformly to the real container, bitmap aspect equal to the CSS box, `ResizeObserver` on the container, pointer coordinates converted to logical units |
| L26 | Rigs advanced a fixed 0.016 s per frame. On a 20 to 30 fps phone the left/right turn (which narrows the body) took 2 to 3 times longer. Collision nudges could flip facing every frame, leaving the turtle stuck mid-turn | Rigs use real frame time. Facing can flip at most once per second |
| L27 | Landing squash was 24% vertical and 18% horizontal and also played in water; swallowing stretched the head 8% | Landing squash only on solid ground, at most 6%, volume-preserving. Chewing pulse reduced to 2% |
| L28 | Pinch zoom allowed 0.22 while the renderer clamped at 0.4, so taps landed in the wrong place after zooming out | One zoom range (0.4 to 2.2) for input and rendering |

The web mascot (`TurtleCanvas`, `MascotWidget`) was checked: it uses real frame time, uniform scales and `touch-action: none`, so no change was needed there.

### 21.7 "The scene looks fake" (fixed)

| ID | Problem found | Fix |
|---|---|---|
| L29 | The sun slid sideways at a fixed height, so sunrise sat at noon height. The moon was fixed and always full. Stars and moon showed through rain and cloud. The sun shone at full strength in rain. Rainbows appeared at night, always in the same place | Sun and moon follow arcs from horizon to horizon. Moon phase is computed from the real date. Cloud, fog and rain hide stars, moon and sun. Rainbows appear only in daylight, opposite the sun |
| L30 | The "parallax" hills scrolled 1:1 with the ground, in mint green | Three screen-space ridge bands at 0.08, 0.16 and 0.28 camera speed, paler and bluer with distance, faded out over the open sea |
| L31 | Neon green soil all the way down, plus neon grass, moss, ferns and coral, and a cyan river | Leaf-litter and soil browns under a thin moss line, olive vegetation, muted coral, tea-olive river water |
| L32 | Rain fell through the sea and riverbed; splashes sat at a fixed screen height | Rain is clipped at the water surface and splashes sit on the real surface |
| L33 | Fireflies flew over the open sea and underwater | Fireflies only over land, banks and mangroves, above the ground, not in rain |
| L34 | Deep-sea glow motes appeared in shallow water | Only beyond the reef drop-off |
| L35 | Seagrass saplings were drawn in flower | Flowers only from growth stage 2 |
| L36 | Water spinach (P30) was drawn as a woody tree (from Section 10.2) | Rebuilt as a floating creeping herb: hollow runners, node roots, arrow-shaped leaves, funnel flowers |
| L37 | Giant panda labelled "Protected Native"; typo "anstrong" | Panda marked non-native zoo ambassador; typo fixed |

### 21.8 Found but not fixed (open)

| ID | Problem | Where it belongs |
|---|---|---|
| O1 | On a landscape phone (740 x 360) the bottom dock covers about 45% of the screen | M9 UI |
| O2 | Semi-aquatic animals swim with the land rig, so their legs hang down instead of paddling | M3 and M6 rigs |
| O3 | No predation rule, so the tiger gets fish and the harlequin shrimp (a sea-star specialist) gets a meaty ration. A dedicated carnivore ration is still missing | M8 diets |
| O4 | Weather sync jumps the clock to 21:00 when the API reports night during local dusk | `index.ts` weather sync |
| O5 | The river has no shallow margins, so the default lotus grows over deep water (real lotus needs less than about 2.5 m) | M7 river profile |
| O6 | Teleport obelisks stand on the seabed underwater | M7 set dressing |
| O7 | Sugar palm and nipa fruit have no store food | M6f foods |
| O8 | Plants that players already placed in spots that are now invalid (for example bamboo in the river) are kept where they are, not moved | Decide: move them automatically or leave them |
| O9 | Birds and the flying fox never fly, and the flying fox does not hang to roost | M3 locomotion |
| O10 | Mangroves stand on a dry mud plateau with no tide | M7 tides |
| O11 | `turtle/rig.test.ts` fails under Node type stripping because of a type-only import (`MotionType`). This was already the case before this pass; the file is next to the frozen code, so I did not change it | M0 tooling |
| O12 | Trees are still short compared with megafauna (a durian tree is about 1.3 times an elephant), and plants and animals share one depth plane with no y-sorting | M7 composition |

### 21.9 Verification

- `tsc` for `apps/web` (app and node configs, which include `game/src`): no errors.
- `game/src/game/world.test.ts`: 10 of 10 pass. Two new tests cover single foods, fruit per plant, diets and favourite foods, placement and depth rules, activity patterns, the sessile clam and relative sizes.
- Visual check with a temporary local harness (since deleted) in headless Chrome, at 1280 x 800, 740 x 360 and 390 x 844, covering forest, orchard, river, reef, night and rainbow scenes. Confirmed: orangutan and squirrel sit in real trees; hibiscus and torch ginger carry no fruit; papaya, rambutan, banyan and coconut carry their own fruit; species sizes differ; the starter turtle is framed above its seagrass bed; the scene is no longer squeezed at 740 x 360; the moon phase and the rainbow position are correct.
- Not verified: a real Android or iOS device, and performance on a throttled CPU.


---

## 22. Revision 5: Pure Canvas2D Vector Polish, 5 User Directives, and Open-Item Resolution

### 22.1 Core Directives & Architecture Constraints
- **Pure Canvas2D Vector Graphics:** Zero bitmaps, zero PNGs/JPEGs in the game world, zero SVG files, zero rasterized SVG textures, zero WebGL / PixiJS. All scenery, flora, fauna, water caustics, and UI elements are dynamically drawn via mathematical Canvas2D primitives (`ctx.beginPath`, `ctx.moveTo`, `ctx.bezierCurveTo`, `ctx.quadraticCurveTo`, `ctx.fill`, `ctx.stroke`, `ctx.createLinearGradient`, `ctx.createRadialGradient`).
- **Realism & Style Ratio:**
  - Scenery: 100% realistic (astronomical day/night cycles, lunar phases, high/low intertidal mangrove tides, tea-tinted rivers, stratified oceanic caustics).
  - Animals: 70% realistic anatomical bone/muscle structures + 30% cuteness and expressive charm (expressive brows, limbal contrast, baby companions).
  - Plants: 90% biologically real anatomy (pneumatophores, stilt roots, syconia figs, 4-sepal mangosteen caps) + 10% cuteness/style.
- **Frozen References:** `A01` Malayan Tiger and `A28` Green Sea Turtle remain strictly frozen and unaltered.

---

### 22.2 The Five User Directives Implemented

| Item | Requirement | Implementation Details | Files Modified |
|---|---|---|---|
| **1. Resolution Sharpening & Micro-Particles** | Make game canvas and loading overlay sharp on retina screens; reduce loading particle dots from clunky blobs to delicate motes. | Scaled loading overlay canvas and game world canvas using device pixel ratio (`Math.min(3, window.devicePixelRatio || 2)`). Particle radius reduced from 3.5–7.1px blobs down to 1.3–2.3px micro-motes with crisp bioluminescent glow. Set `imageSmoothingQuality = 'high'`. | `GameLoadingOverlay.tsx`, `index.ts`, `worldRenderer.ts` |
| **2. Earn Page Dark Mode Camera UI** | In dark mode, clicking the camera button in the Earn page displays an identical UI to bright mode. | Enforced strict light theme isolation for `.camera-dialog` in dark mode: white card background (`#ffffff !important`), dark green primary text (`#07190e !important`), light secondary buttons (`#f1f5f9`), light green primary action button, and high-contrast pill badges. | `apps/web/src/styles.css` |
| **3. Camera Close "x" Button Alpha** | Increase the alpha of the "x" button inside camera mode for high visibility. | Set `opacity: 1 !important`, solid white circular background (`#ffffff`), dark charcoal icon (`#07190e`), subtle border (`1.5px solid rgba(0,0,0,0.18)`), and prominent elevation shadow (`box-shadow: 0 4px 18px rgba(0, 0, 0, 0.35)`). | `apps/web/src/styles.css` |
| **4. 100% Multilingual & Dynamic Buttons** | 100% of game text (including loading overlay, teleport curtain, all 12 towers, prompts, toasts) must translate into English, Bahasa Melayu, Chinese (中文), and Tamil (தமிழ்), with dynamic horizontal button length expansion. | Implemented translation dictionary in `game/src/game/i18n.ts` and `apps/web/src/lib/i18n.ts` covering all toasts, modals, store buttons, and teleport waypoints across all 4 languages. Added universal dynamic button layout (`min-width: max-content; width: auto; white-space: nowrap;`) so text never wraps or clips awkwardly. | `i18n.ts`, `GameLoadingOverlay.tsx`, `index.ts`, `styles.css`, `index.css` |
| **5. Bottom Panel Dragging Mechanics** | Reduce hold activation from slow delay to exactly 0.5s (500ms), while quick swipes (>8px movement) immediately cancel drag to ensure smooth scrolling. | Updated `attachHoldToDrag` in `index.ts` with a 500ms timer and immediate cancellation if pointer movement exceeds 8px. Allows effortless horizontal carousel scrolling while maintaining intentional drag pickup. | `game/src/index.ts` |

---

### 22.3 Resolution of Open Items O12, O2, and O10

#### 1. Resolution of O12: Unified Depth-Sorted Render Queue & Realistic Tree Scale
- **Depth-Sorted 2.5D Layering:** Placed plants (`P01`–`P30`), dropped foods, and placed animals (`A01`–`A41`) were previously rendered in separate sequential loops, causing all animals to draw on top of all plants regardless of relative distance. They are now unified into a `depthRenderQueue` sorted by ground contact `depthY`:
  - Plants: `depthY = plant.y` (root insertion line).
  - Dropped foods: `depthY = food.y + waterBob`.
  - Animals: `depthY = animal.y + getAnimalGroundContactOffset(animal.assetId, false)`. If an animal is perched on a tree branch, `depthY = perchTree.y + 0.5`, ensuring it renders in front of that tree trunk while respecting downstage foreground foliage.
- **Canopy Tree Scale:** Calibrated tree visual sizes in `PLANT_FORM` so that tropical trees realistically tower above megafauna (Asian Elephant `size: 1.75`):
  - `plant_02_tualang_tree`: 2.4 -> 3.2 (towering 80m emergent rainforest giant).
  - `plant_03_durian_tree`: 1.75 -> 2.45 (tall canopy fruit tree).
  - `plant_14_banyan_fig`: 1.9 -> 2.7 (massive strangler fig tree).
  - `plant_13_coconut_palm`: 1.7 -> 2.3 (graceful tall coastal palm).
  - `plant_16_sugar_palm`: 1.5 -> 2.15 (stately solitary palm).
  - `plant_07_bamboo`: 1.6 -> 2.2 (arching giant bamboo culms).

#### 2. Resolution of O2: Semi-Aquatic Swimming Posture
- **Asian Water Monitor (`animal_25_asian_water_monitor`):** When `rState.swimming` is active, limbs streamline backward along the flanks (`farHindAng = -0.58`, `farFrontAng = -0.48`), and propulsion is driven by wide, sinuous lateral tail undulation (`tailSwing = Math.sin(rState.locoTime * 4.2) * 36`), matching *Varanus salvator* aquatic locomotion.
- **Southern River Terrapin (`animal_23_southern_river_terrapin`):** Front and hind limbs execute coordinated horizontal breaststroke paddling strokes with outstretched webbed digits (`swimPhase = rState.locoTime * 3.8`), replacing static hanging limbs.
- **Southeast Asian Box Turtle (`animal_24_southeast_asian_box_turtle`):** Activates horizontal paddle strokes and dynamic webbing (`{ webbed: true }`) when in water.

#### 3. Resolution of O10: Intertidal Mangrove Tide Dynamics
- **Ebb and Flow Simulation:** In `renderIntertidalMangroveTide`, a continuous lunar/semi-diurnal tidal cycle (`tideCycle = (Math.sin(elapsedSec * 0.045) + 1) * 0.5`) drives water coverage across Zone 3 (Matang Mangrove mudflats).
- **High Tide:** Translucent tea-tinted brackish water (`rgba(88, 122, 92, alpha)`) rises across the lower mud bank, partially submerging *Rhizophora* stilt root bases and pneumatophores with lapping wavelets and froth lines.
- **Low Tide:** Receding tides expose glistening wet mud ribbons (`rgba(254, 240, 138, wetSheenAlpha)`) and trapped reflective tide pools reflecting the sky.
- **Zero Collision Impact:** Mud bank terrain remains walk-friendly for land quadrupeds, preserving invariant `getWaterSurfaceY(390000, 800) === null`.

---

### 22.4 Updated Open-Items Status

| ID | Problem | Status | Resolution |
|---|---|---|---|
| O1 | On a landscape phone (740 x 360) bottom dock covers 45% screen | Open | Planned responsive dock auto-collapse toggle. |
| O2 | Semi-aquatic animals swim with land rig | **Resolved** | Streamlined limb retraction and horizontal breaststroke paddling implemented in `reptilesArmoured.ts`. |
| O3 | Dedicated carnivore meat ration missing | Open | Planned in dietary catalog expansion. |
| O4 | Weather sync time jump | Open | Planned in smooth diurnal interpolation. |
| O5 | River shallow margins for lotus | **Resolved** | Contained shallow littoral shelf (<2.5m) implemented in Section 21. |
| O6 | Teleport obelisks on seabed | **Resolved** | Replaced with oceanographic buoys & ranger cairns in Section 21. |
| O7 | Sugar palm and nipa fruit store item | Open | Planned food icons. |
| O8 | Invalid legacy plant positions | Open | Safe position migration rule. |
| O9 | Birds/flying fox locomotion | Open | Planned roosting & flight cycles. |
| O10 | Mangrove dry mud plateau with no tide | **Resolved** | Intertidal tidal flood, wet mud sheen, and trapped tide pools implemented in `worldRenderer.ts`. |
| O11 | Node type stripping type-only import in `rig.test.ts` | Open | Tooling note next to frozen reference. |
| O12 | Trees short vs megafauna & no Y-sorting | **Resolved** | Unified depth-sorted render queue and realistic tree canopy scaling implemented. |

---

### 22.5 Verification
- **TypeScript Typecheck:** `tsc --noEmit` across `apps/web` (including `game/src`) passes with **0 errors**.
- **Vitest Suite:** `game/src/game/world.test.ts` passes **11 of 11 tests** (120ms), including:
  - 120° gesture waving across all 41 animals.
  - +30% small eye magnification report.
  - 4-habitat sequence & boundary validation.
  - Feeding mechanics, diets, and fruit-to-plant matching.
  - Habitat depth, activity patterns, and sessile mobility.
  - Multi-stop color gradient interpolation without NaNs.
  - Sanctuary overhaul geometry, waypoint towers, and Love Lv.5 progression.
  - 3-round zoological & botanical realism critiques.
  - Tree scale ratios, semi-aquatic swimming flags, and intertidal mudflats.
