# Hero aura effect icons

The original three icon assets were created on 2026-10-09 using the built-in `image_gen.imagegen` tool through the [imagegen skill](C:/Users/user/.codex/skills/.system/imagegen/SKILL.md). Each asset used a separate generation call with `transparent_background: true`. The original generation record below is retained for provenance; the former brood and steadfast gameplay effects have been removed.

Style was informed by visual inspection of `public/assets/dungeon/heroes-level-1-v1.png`: chunky stone and crystal forms, strong outlines, and warm gold highlights. The generated icons use a common stone and gold medallion frame with distinct center symbols and colors. Each was visually checked for a single contained symbol, no text, and transparent cutout edges.

| Effect | Project asset | Generated source |
| --- | --- | --- |
| Haste | `public/assets/dungeon/hero-effect-haste-v1.png` | `C:/Users/user/.codex/generated_images/01a11e99-f695-7ed1-9fe0-613b14cdfa09/exec-19963b5b-0a3a-4142-8484-da9fe946c65a.png` |
| Brood | `public/assets/dungeon/hero-effect-brood-v1.png` | `C:/Users/user/.codex/generated_images/01a11e99-f695-7ed1-9fe0-613b14cdfa09/exec-09a3e439-922b-42b8-b9ec-e9cd65f0a9e5.png` |
| Steadfast | `public/assets/dungeon/hero-effect-steadfast-v1.png` | `C:/Users/user/.codex/generated_images/01a11e99-f695-7ed1-9fe0-613b14cdfa09/exec-79dc7020-4ebf-455f-a680-b6f60708f8ac.png` |

The original generated PNGs are copied into the project. Runtime derivatives may be produced by the project's standard asset optimization pipeline without changing the illustration or removing alpha.

## Runtime integration and validation

Each of the 30 heroes now has exactly one of five effects, with six heroes assigned to each effect:

| Effect | Eligible target | Level scaling |
| --- | --- | --- |
| Haste | Same-owner monsters | Movement speed +10% at Lv.1, +4 percentage points per level, +46% at Lv.10 |
| Vitality | Same-owner monsters | Maximum health +10% at Lv.1, +4 percentage points per level, +46% at Lv.10 |
| Shield | Same-owner monsters | Blocks one attack at Lv.1–7 and two attacks at Lv.8–10; no automatic recharge after depletion |
| Enemy slow | Opponent towers | Attack speed −10% at Lv.1, −46% at Lv.10 |
| Tower haste | Same-owner towers | Attack speed +10% at Lv.1, +46% at Lv.10 |

All five effects use an actual two-dimensional radius of 2 cells at Lv.1–3, 3 cells at Lv.4–6, 4 cells at Lv.7–9, and 5 cells at Lv.10. Equal effects use the strongest qualifying hero and never stack additively. Effects end outside the radius or when the source hero disappears. Monster and tower icons follow their targets; depleted shield and vitality buffers hide their icons. The earlier extra-soldier spawning and personal slow resistance are removed. Collected heroes still enter once at the start of the common preparation minute, and remain frozen until combat starts.

Haste reuses the original cyan-wing WebP. The other four effects use reusable 32×32 Phaser Graphics textures with matching gold circular frames: a pink heart and cross for vitality, a blue shield for protection, a violet hourglass and downward arrow for opponent tower slowing, and a golden rune bolt and upward arrow for allied tower acceleration. These textures require no additional image downloads. The same effect queries used for gameplay determine whether each icon is visible.

The three original optimized WebP assets total 20,656 bytes. Their width is 96 px, with lossless alpha preserved; generated PNG originals remain in the project. Optimization uses the existing content-hashed asset pipeline.

| Effect | Saved original | Runtime bytes |
| --- | --- | ---: |
| Haste | [hero-effect-haste-v1.png](C:/Users/user/myproject/sosoo/game/public/assets/dungeon/hero-effect-haste-v1.png) | 6,232 |
| Brood | [hero-effect-brood-v1.png](C:/Users/user/myproject/sosoo/game/public/assets/dungeon/hero-effect-brood-v1.png) | 7,042 |
| Steadfast | [hero-effect-steadfast-v1.png](C:/Users/user/myproject/sosoo/game/public/assets/dungeon/hero-effect-steadfast-v1.png) | 7,382 |

The `tools/duel-hero-effect-preview.html` fixture renders the real DuelScene. The model regression suite covers radius boundaries, eligible allies and opponents, strongest-only overlap, health effects, attack speed changes, shield depletion, source removal, and automatic single-hero entry. Catalog tests preserve every hero ID and image row, verify the five-way distribution, and confirm displayed values match the gameplay parameters.

## Final prompt: Haste

```text
Use case: stylized-concept
Asset type: one raster status-effect icon for a cute stone-monster fantasy browser game, displayed as a tiny 24px badge above a monster's head.
Primary request: a HASTE aura effect badge: one bold turquoise wing sweeping to the right, with three strong wind strokes integrated into the wing, symbolizing faster movement.
Scene/backdrop: genuine transparent background, isolated cutout; outside the badge entirely transparent.
Style/medium: polished hand-painted 2D fantasy game art. Cute chunky stone-and-crystal world; thick black-brown outlines, faceted jewel colors, warm antique-gold trim, simple clean cel-shaded forms.
Composition/framing: square canvas, one centered circular medallion occupying 86% of canvas; thick dark stone ring with a narrow antique-gold rim, turquoise wing fills the center. Front-facing, balanced, fully contained with generous transparent safety margin.
Lighting/mood: bright turquoise jewel highlight on darker teal interior, restrained gold gleam.
Constraints: strong recognizable silhouette and two or three large simple shapes; readable at 24px; ring and symbol use bold strokes; no tiny ornaments; no text, no labels, no letters, no numbers, no watermark; no other icons; no spritesheet, no scenery, no opaque rectangle or backdrop. Preserve clean real alpha transparency.
```

## Final prompt: Brood

```text
Use case: stylized-concept
Asset type: one raster status-effect icon for a cute stone-monster fantasy browser game, displayed as a tiny 24px badge above a monster's head.
Primary request: a BROOD aura effect badge: a large glowing violet crystal egg cracked open with two simple small round stone-companion heads peeking from its lower opening, symbolizing spawned allies. The egg is the dominant bold silhouette, the two companion faces are uncomplicated circles with two bright eyes each.
Scene/backdrop: genuine transparent background, isolated cutout; outside the badge entirely transparent.
Style/medium: polished hand-painted 2D fantasy game art. Cute chunky stone-and-crystal world; thick black-brown outlines, faceted jewel colors, warm antique-gold trim, simple clean cel-shaded forms.
Composition/framing: square canvas, one centered circular medallion occupying 86% of canvas; thick dark stone ring with a narrow antique-gold rim, luminous purple egg fills the center. Front-facing, balanced, fully contained with generous transparent safety margin.
Lighting/mood: bright lavender crystal highlights against darker plum interior, restrained gold gleam.
Constraints: strong recognizable silhouette and a few large simple shapes; readable at 24px; ring and symbol use bold strokes; no tiny ornaments; no text, no labels, no letters, no numbers, no watermark; no other icons; no spritesheet, no scenery, no opaque rectangle or backdrop. Preserve clean real alpha transparency.
```

## Final prompt: Steadfast

```text
Use case: stylized-concept
Asset type: one raster status-effect icon for a cute stone-monster fantasy browser game, displayed as a tiny 24px badge above a monster's head.
Primary request: a STEADFAST aura effect badge: one broad golden shield with a large luminous icy-blue six-spoke snowflake rune carved on its center, symbolizing resistance to slowing and freezing. Use a thick simple shield silhouette and one bold frost symbol.
Scene/backdrop: genuine transparent background, isolated cutout; outside the badge entirely transparent.
Style/medium: polished hand-painted 2D fantasy game art. Cute chunky stone-and-crystal world; thick black-brown outlines, faceted jewel colors, warm antique-gold trim, simple clean cel-shaded forms.
Composition/framing: square canvas, one centered circular medallion occupying 86% of canvas; thick dark stone ring with a narrow antique-gold rim, golden shield fills the center. Front-facing, balanced, fully contained with generous transparent safety margin.
Lighting/mood: bright golden shield with a cool blue frost highlight against darker blue-grey interior, restrained gold gleam.
Constraints: strong recognizable silhouette and two or three large simple shapes; readable at 24px; ring and symbol use bold strokes; no tiny ornaments; no text, no labels, no letters, no numbers, no watermark; no other icons; no spritesheet, no scenery, no opaque rectangle or backdrop. Preserve clean real alpha transparency.
```
