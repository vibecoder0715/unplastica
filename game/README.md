# Unplastica Wild Malaysia Sanctuary — Game Assets & Engine

Complete standalone game assets, vector graphics generators, procedural animation rigs, scene renderer, and biological ecosystem mechanics for the **Unplastica Wild Malaysia Sanctuary**.

---

## What's Included

### 1. Vector Graphics Assets (`game_assets/` & `src/game/worldRenderer.ts`)
- **41 Native Animals (`A01`–`A41`)**: Malayan Tiger, Asian Elephant, Malayan Tapir, Orangutan, Sun Bear, Sunda Pangolin, Sambar Deer, Greater Mousedeer, Green Sea Turtle, Dugong, Whale Shark, Blacktip Reef Shark, Clownfish, Giant Clam, and 27 more. Pure Canvas2D vector graphics with biological accuracy and stylized charm.
- **30 Native Flora (`P01`–`P30`)**: Rafflesia, Tualang Tree, Durian Tree, Mangosteen, Pitcher Plant, Hibiscus, Coconut Palm, Banyan Fig, Tree Fern, Seagrass, Kelp, Mangrove Rhizophora, and 18 more across 3 growth stages (leaves, flowers, ripe harvestable fruits).
- **25 Native Food Items (`game_assets/food.ts`)**: Handcrafted vector graphics matching native flora and real-world diets.
- **Interactive Scenery & Biomes**: Multi-stratum continuous landscape spanning Rainforest Canopy, River Pond, Mangrove Mudflats, and Deep Coral Sea with dynamic weather (rain, cloud shadows, sun rays, drifting wind leaves) and day/night lighting.

### 2. Procedural Animation Rig (`src/turtle/`)
- 2D/2.5D kinematic animation controller featuring natural buoyancy, flipper paddling, swimming sway, head arcs, and auto/manual blinking.
- 10 expressive continuous emotions: `idle`, `waving`, `laugh`, `crying`, `angry`, `sleepy`, `blush`, `wondered`, `describing`, and `congratulate`.

### 3. Simulation & Gameplay Mechanics (`src/game/` & `src/index.ts`)
- **60 FPS Simulation Loop**: Physics-based buoyant sinking, smooth camera pan/zoom, and boundary clamping.
- **Locomotion & Responsive Steering**: Instant turning without debounce lag, natural wander waypoints, and pairwise collision avoidance.
- **Biological 6-Hour Hunger Decay**: Hunger mechanics with real-life diets (`src/game/diets.ts`), autonomous foraging for dropped foods, and grazer feeding on living aquatic plants.
- **Web Audio Synthesizer Engine (`src/game/sound.ts`)**: Pure programmatic audio generation (coin chimes, water splashes, wave chirps, button clicks) with zero external audio file dependencies.
- **State Persistence & Economy (`src/game/persistence.ts`)**: Save state serialization, offline passive earnings, and paced Greenbit rewards.
- **Full Multilingual Localization (`src/game/i18n.ts`)**: 100% localized in English, Bahasa Melayu, Chinese (中文), and Tamil (தமிழ்) across all 71 species, items, towers, and HUD dialogues.

### 4. Roster Assets & Contact Sheets (`public/assets/`)
- Individual PNG reference renders and contact sheets for freshwater river, land, and marine animals and plants.

---

## Running Standalone

To run the sanctuary game standalone:

```bash
# Install dependencies
npm install

# Start local dev server
npm run dev
```

Open `http://localhost:3000` to interact with the sanctuary ecosystem directly.
