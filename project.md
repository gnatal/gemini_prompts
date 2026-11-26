# Asset Prompt Builder

## Overview

A small React app for writing consistent image generation prompts for game assets. The user fills in a form split into three blocks (Style, Character, Asset), and the app builds a ready-to-paste prompt for tools like Gemini.

Style and Character are saved as reusable profiles, so the character stays identical across every asset. Only the Asset block changes per request.

## Goals

- The same character looks the same across every generated asset.
- Fast workflow: pick a saved style and character, describe the action, copy the prompt.
- Bake the prompt-writing rules into the tool so the user doesn't have to remember them.

## Non-goals (v1)

- No direct calls to image generation APIs.
- No backend, accounts or cloud sync.
- No image editing or background removal.

## Tech stack

- Vite + React + TypeScript (strict mode)
- react-hook-form + zod for form state and validation
- Tailwind CSS for styling
- Vitest + React Testing Library for tests
- localStorage for persistence

Getting started:

```bash
npm create vite@latest asset-prompt-builder -- --template react-ts
cd asset-prompt-builder
npm i react-hook-form zod @hookform/resolvers
npm i -D tailwindcss @tailwindcss/vite vitest @testing-library/react @testing-library/jest-dom jsdom
```

## Data model

```ts
type ArtStyle = 'pixel-art' | 'cel-shaded-2d' | 'hand-painted-2d' | 'low-poly-3d' | 'custom';

interface PaletteColor {
  name: string;   // "Royal blue"
  hex: string;    // "#1E4FD8"
  usage: string;  // "helmet, boots"
}

interface StyleProfile {
  id: string;
  name: string;              // preset name, e.g. "Main game style"
  artStyle: ArtStyle;
  customStyle?: string;      // used only when artStyle is 'custom'
  pixelResolution?: string;  // e.g. "64x64", only for pixel-art
  setting?: string;          // genre and world, filled by the genre presets
  palette: PaletteColor[];   // 3 to 6 entries recommended
  linesAndShading: string;   // "thick dark outlines, 2-tone cel shading, no gradients"
}

interface CharacterProfile {
  id: string;
  name: string;
  proportions: string;        // "4 heads tall, small torso, oversized boots"
  head: string;
  torso: string;
  armsAndHands: string;
  legsAndFeet: string;
  signatureDetails: string[]; // the 2 or 3 features that make him unmistakable
  hasReferenceImage: boolean; // user will attach an approved reference sheet
}

type AssetType = 'sprite' | 'sprite-strip' | 'portrait' | 'item-icon' | 'background' | 'tile';
type View = 'side-right' | 'side-left' | 'three-quarter-front' | 'front' | 'top-down' | 'isometric';
type AspectRatio = '1:1' | '4:3' | '16:9' | '9:16' | 'custom';

interface AssetRequest {
  type: AssetType;
  includeCharacter: boolean;  // default false for background, tile, item-icon
  subject?: string;           // what to draw when there's no character (item, scene, tile)
  action: string;             // one clear action
  heldItems?: string;         // which hand holds what, from the character's perspective
  view: View;
  frameCount?: number;        // sprite-strip only, 2 to 12
  framing: string;
  backgroundColor: string;    // hex, default "#00FF00"
  lighting: string;           // default "even and neutral, from upper left"
  aspectRatio: AspectRatio;
  customAspectRatio?: string;
  exclusions: string[];       // default: no text, no logos, no watermark, no extra characters
}
```

## Asset type presets

Changing the asset type applies these defaults. The user can override any of them, and the `action` field is never wiped.

| Type | Character | View | Aspect ratio | Framing | Background |
|---|---|---|---|---|---|
| sprite | yes | side-right | 1:1 | full body, centered, nothing cropped, small margin on all sides | chroma key |
| sprite-strip | yes | side-right | N:1 (from frameCount) | N frames in one row, equal spacing, same scale and baseline in every frame | chroma key |
| portrait | yes | three-quarter-front | 1:1 | head and shoulders, centered | chroma key |
| item-icon | no | three-quarter-front | 1:1 | single object, centered, small margin | chroma key |
| background | no | side-right | 16:9 | full scene, edge to edge | none (scene fills frame) |
| tile | no | top-down | 1:1 | seamless and tileable on all four edges | none |

For `background` and `tile`, hide the background color field and use `subject` as the scene or tile description.

## Prompt output

Plain text, fixed field order, empty fields omitted. Example:

```
[STYLE]
Art style: Pixel art, 64x64 sprite resolution
Palette: Royal blue #1E4FD8 (helmet, boots); Sky blue #7EC8F2 (bodysuit); Brass #C9A13B (buckle, spurs)
Lines and shading: thick dark outlines, 2-tone cel shading, no gradients

[CHARACTER]
Name: <name>
Proportions: 4 heads tall, small torso, oversized boots
Head: ...
Torso: ...
Arms and hands: ...
Legs and feet: ...
Signature details: ...; ...; ...

[ASSET]
Type: Sprite
Action: running
Held items: revolver in his right hand
View: Side view, facing right
Framing: full body, centered, nothing cropped, small margin on all sides
Background: solid flat #00FF00, no shadows or texture
Lighting: even and neutral, from upper left
Aspect ratio: 1:1
Exclude: no text, no logos, no watermark, no extra characters
```

Rules:

- When `includeCharacter` is false, omit the whole `[CHARACTER]` block.
- When `hasReferenceImage` is true and the character is included, start the prompt with: `Use the attached reference image as the exact design of the character. Keep every detail identical.`
- For `sprite-strip`, add `Frames: N, in one horizontal row` after `Type`.
- When any character field or `heldItems` says "left" or "right", end the `[CHARACTER]` block with `Sides: left and right always mean the character's own left and right, not the viewer's`. Without it, the model read the hands from the character's side but the star, scar and pants hole from the viewer's side, in the same image. Fill from prompt ignores this line.

## Batch mode

- A textarea takes one action per line. The app generates one prompt per line, each with its own Copy button, plus a "Copy all" button (prompts separated by a line with `---`).
- The Style and Character blocks must be byte-identical across all prompts in a batch.
- Include one-click action lists, for example "Platformer basics": idle, run, jump, fall, shoot, hurt, death.

## Animations tab

A third output tab that generates one sprite strip prompt per animation, for building a full set of animation sprite sheets.

- Presets (`src/config/animations.ts`): Idle 4 (loop), Walk 8 (loop), Run 8 (loop), Dash 12, Jump 6, Fall 4 (loop), Land 4, Crouch 3, Attack 6, Hurt 3, Death 8, Climb 6 (loop).
- Each row has an on/off toggle, a frame count (2 to 12), a loop toggle, and an expandable motion and frame-poses editor. Custom animations can be added and removed. The list is saved under `apb:animations`.
- Sheet layout, shared by all animations and saved with them: **Grid** (default) or **One row**. The grid uses equal square cells, near square (4 → 2×2, 6 → 3×2, 8 → 4×2, 12 → 4×3), so the sheet can be cut into equal cells and stays within the aspect ratios image models support. One row is `N:1`.
- Each prompt forces type `sprite-strip` (shown as `Sprite sheet` in grid layout), the character on, `Frames: N` with the layout, matching framing and aspect ratio (`columns:rows` reduced, or `N:1`). View, held items, background, lighting and exclusions come from the Asset section. The Style and Character blocks are byte-identical to every other prompt.
- An `[ANIMATION]` block follows `[ASSET]`: name, loop, layout, a `View lock:` line, a `Limbs:` legend when poses use near/far (and which side is near, for side views), a `Props:` line when there are held items, one `Frame N:` line per pose (with `(row R, column C)` in grid layout, only when the pose count equals the frame count), a no-motion-blur line and a consistency line.
- Walk, run and climb poses name limbs **near** (closer to the camera) and **far**, never left and right. The model loses track of left and right, which made the same leg lead in every frame. The second half of each cycle is the first half with near and far swapped, every frame has an arm position, and both run flight frames require a visible gap under the feet.
- `View lock:` repeats the view for every frame, including the first and last, and for side views adds that the character never turns toward the camera. Poses with no direction in them ("neutral standing pose", "body leans back") came out facing the camera.
- The `Limbs:` legend also asks for the far arm and leg to be drawn darker, in shadow. With identical boots and sleeves the model had nothing to tell the legs apart by, and drew one stride in every frame.
- `Props:` repeats the held items "in every frame; nothing appears, disappears or changes hands". Weapons popped in and out and switched hands between frames.
- Preset wording avoids "the second half repeats the first half", which the model drew as a literal copy, and uses "the second half of the cycle is not a copy of the first half: the opposite leg leads". The walk passing pose is described by its silhouette (legs together under the hips). Standing poses say "facing the same way as the other frames".
- When the view is not a side view, the tab shows a warning with a one-click switch to side view.
- Stored lists carry a presets version. Presets saved by an older version get the new motion and poses, and keep their on/off, frame count and loop settings.
- Copying is blocked when no animation is on, when an enabled animation has an invalid frame count, or by the usual form rules.

## Fill from prompt

A header button opens a panel where a prompt can be pasted and read back into the form (`src/lib/parsePrompt.ts`, pure, the inverse of `buildPrompt`).

- Fields are matched by their label, case-insensitive, with or without the `[STYLE]` / `[CHARACTER]` / `[ASSET]` headers. A line that isn't a known label continues the previous field's value.
- Each block found in the text replaces that whole section (fields missing from the text become empty). Blocks not found keep their current values. The style name is kept, since it isn't in the prompt.
- The reference image line sets `hasReferenceImage`. A prompt with Style and Asset blocks but no Character block turns the character off.
- `Sprite sheet` and `Frames: N, in a grid…` set `frameLayout: 'grid'`. A ratio not in the list becomes a custom ratio. Unknown art styles become a custom style.
- Other blocks such as `[ANIMATION]` are skipped. With `---`-separated batch output, only the first prompt is used. Skipped blocks, unknown values and unrecognized lines are listed in the notice after filling.
- Building, parsing and building again gives back the exact same text.

Sprite strips also have a **Layout** select (One row / Grid) next to Frames. Framing and aspect ratio follow it, unless they were customized.

## Lint rules

These are warnings, not blockers. Show each one inline next to its field and in a summary above the preview.

1. **Metaphors.** Flag "like a", "looks like", "as if", "resembles", "similar to" and words ending in "-shaped". Message: "Describe the shape in plain geometry instead. Comparisons get exaggerated."
2. **Existing IP.** Flag phrases from a configurable blocklist (`src/config/ipBlocklist.ts`), seeded with names like Mega Man, Rockman, Mario, Sonic, Zelda, Pokemon, Kirby, Samus. Message: "Names an existing character or franchise. The model will drift toward it, and the asset may not be yours to ship."
3. **Signature details.** Fewer than 2 entries gets a warning.
4. **Palette size.** Fewer than 3 or more than 6 colors gets a warning.
5. **Chroma key clash.** Warn if the background color is within an RGB distance of 100 of any palette color, and suggest magenta `#FF00FF` as an alternative.
6. **Missing "no text".** Warn if `exclusions` has no entry containing "text".
7. **Ambiguous hands.** If `heldItems` is filled in but has neither "left" nor "right", hint: "Say which hand, from the character's perspective."
8. **Palette name vs hex.** Warn when a color word in the name (red, blue, indigo, gold, teal...) doesn't match the hex's hue, and say what color the hex really is. Grays and names without a color word are skipped. "Indigo #D2452D" and "Torii red #264478" made the model mix both colors everywhere.
9. **Text while excluding text.** Warn when a character field, held items or subject asks for writing (a quoted phrase, or words like kanji, lettering, inscription) and Exclude has "no text".
10. **Mood lighting on a sprite.** Warn when a sprite, strip, portrait or icon has moonlight, sunset, dramatic, rim light, neon or night lighting. It gets baked into the asset and looks wrong in other scenes.
11. **Warm vs cold lighting.** Warn when Lines and shading and Lighting pull in opposite directions (warm/sunny vs cold/moonlight). A warm and cold split inside one field is allowed. Skipped when rule 10 already fired.
12. **Same gear held and worn.** Warn when held items and an outfit field both name a gun, or both name a blade, unless the outfit clause says "empty". "A gun in the right side" plus "a pistol in the right hand" got drawn as two pistols.
13. **Proportions in heads.** Warn when Proportions has no "N heads tall". "1 head" came out as realistic adult proportions.

## Validation

These rules block the Copy button:

- Style: `artStyle` set, at least 1 palette color, every hex valid.
- Character (when included): `name` and `proportions` required.
- Asset: `action` or `subject` required. `frameCount` must be 2 to 12 for sprite strips, and `customAspectRatio` must match `W:H` when the aspect ratio is custom.

## Persistence

- Style and character profiles live in localStorage under `apb:styles` and `apb:characters`, with a schema version in `apb:version`.
- Restore the last-used selections on load.
- Export and import all profiles as one JSON file. Validate imports with zod and reject invalid files with a readable error.
- Wrap all storage access in try/catch, so the app still works when storage is unavailable or corrupted.

## UI layout

- **Desktop:** two columns. The left column is the form, with three collapsible sections (Style, Character, Asset). Each section has a profile bar with a selector plus Save, Save as new and Delete. The right column holds the sticky live preview, the lint summary and a Copy button.
- **Mobile:** single column, with the preview below the form and a sticky Copy button.
- Copying shows a short "Copied" toast.
- **Palette editor:** one row per color with name, color picker, hex input and usage. Rows can be added and removed, up to 6.
- Signature details and exclusions use tag-style list inputs.

## Project structure

```
src/
  main.tsx
  App.tsx
  types.ts
  schemas.ts              zod schemas mirroring types.ts
  config/
    assetPresets.ts
    actionLists.ts
    ipBlocklist.ts
    defaults.ts
  lib/
    buildPrompt.ts        pure: (style, character, asset) => string
    buildBatch.ts         pure: (style, character, asset, actions[]) => string[]
    lint.ts               pure: returns { field, message }[]
    color.ts              hex parsing, RGB distance
    storage.ts            load, save, import, export
  components/
    StyleSection.tsx
    CharacterSection.tsx
    AssetSection.tsx
    PaletteEditor.tsx
    TagListInput.tsx
    ProfileBar.tsx
    PromptPreview.tsx
    LintSummary.tsx
    BatchPanel.tsx
```

Keep all prompt logic in pure functions under `lib/`, so it's easy to test and to reuse later from a CLI or an API integration.

## Tests

- `buildPrompt`: omits empty fields; omits the character block when `includeCharacter` is false; adds the reference image line; formats sprite strip frames and aspect ratio; keeps field order stable (snapshot).
- `buildBatch`: Style and Character blocks are identical across all outputs.
- `lint`: each rule fires on a bad input and stays quiet on a clean one.
- `storage`: corrupted JSON in localStorage falls back to an empty state without crashing.
- Import: an invalid file is rejected with a message.

## Acceptance criteria

- [ ] Filling in the form updates the preview live.
- [ ] Copy puts the exact preview text on the clipboard.
- [ ] Switching the asset type applies its presets without wiping the action.
- [ ] Saved style and character profiles survive a page reload.
- [ ] Export, then import in a fresh browser, restores everything.
- [ ] Each lint rule shows the right warning on the right field.
- [ ] Batch mode with 5 actions produces 5 prompts with identical Style and Character blocks.
- [ ] `npm run build`, `npm run test` and `npm run lint` pass with no errors.

## Future ideas (not v1)

- Send the prompt straight to the Gemini API and show the results in a gallery.
- Store a reference image per character and attach it automatically.
- Track which prompts produced approved assets.
