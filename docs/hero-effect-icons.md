# Hero aura effect icons

Created on 2026-10-09 using the built-in `image_gen.imagegen` tool through the [imagegen skill](C:/Users/user/.codex/skills/.system/imagegen/SKILL.md). Each of the three distinct assets used a separate generation call with `transparent_background: true`. No CLI fallback was used.

Style was informed by visual inspection of `public/assets/dungeon/heroes-level-1-v1.png`: chunky stone and crystal forms, strong outlines, and warm gold highlights. The generated icons use a common stone and gold medallion frame with distinct center symbols and colors. Each was visually checked for a single contained symbol, no text, and transparent cutout edges.

| Effect | Project asset | Generated source |
| --- | --- | --- |
| Haste | `public/assets/dungeon/hero-effect-haste-v1.png` | `C:/Users/user/.codex/generated_images/01a11e99-f695-7ed1-9fe0-613b14cdfa09/exec-19963b5b-0a3a-4142-8484-da9fe946c65a.png` |
| Brood | `public/assets/dungeon/hero-effect-brood-v1.png` | `C:/Users/user/.codex/generated_images/01a11e99-f695-7ed1-9fe0-613b14cdfa09/exec-09a3e439-922b-42b8-b9ec-e9cd65f0a9e5.png` |
| Steadfast | `public/assets/dungeon/hero-effect-steadfast-v1.png` | `C:/Users/user/.codex/generated_images/01a11e99-f695-7ed1-9fe0-613b14cdfa09/exec-79dc7020-4ebf-455f-a680-b6f60708f8ac.png` |

The original generated PNGs are copied into the project. Runtime derivatives may be produced by the project's standard asset optimization pipeline without changing the illustration or removing alpha.

## Runtime integration and validation

The game displays the cyan wing on living units inside a same-owner haste hero's actual radius, the violet egg on soldiers spawned alongside a brood hero, and the frost shield on steadfast heroes themselves. Brood and steadfast do not create additional nearby-unit buffs. Hovering over an icon explains its meaning. Icons follow each unit, combine when applicable, and haste disappears on range exit or leader removal. At the top edge, the icon row moves below the sprite to preserve the face and player header.

The three optimized WebP assets total 20,656 bytes. Their width is 96 px, with lossless alpha preserved; generated PNG originals remain in the project. Optimization uses the existing content-hashed asset pipeline.

| Effect | Saved original | Runtime bytes |
| --- | --- | ---: |
| Haste | [hero-effect-haste-v1.png](C:/Users/user/myproject/sosoo/game/public/assets/dungeon/hero-effect-haste-v1.png) | 6,232 |
| Brood | [hero-effect-brood-v1.png](C:/Users/user/myproject/sosoo/game/public/assets/dungeon/hero-effect-brood-v1.png) | 7,042 |
| Steadfast | [hero-effect-steadfast-v1.png](C:/Users/user/myproject/sosoo/game/public/assets/dungeon/hero-effect-steadfast-v1.png) | 7,382 |

The `tools/duel-hero-effect-preview.html` fixture renders the real DuelScene and exposes static controls for range exit, hero removal, restored effects, participant view, and the upper map bend. The model regression suite covers exact aura bounds, allies versus opponents, simultaneous effects, both brood spawning paths, and legacy states without source metadata.

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
