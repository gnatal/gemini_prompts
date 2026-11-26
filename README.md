# Asset Prompt Builder

A small React app for writing consistent image generation prompts for game assets.
Fill in **Style**, **Character** and **Asset**, then copy a ready-to-paste prompt for tools like Gemini.
Style and Character are saved as reusable profiles, so the character stays identical across every asset.

See [`../project.md`](../project.md) for the full spec.

## Scripts

```bash
npm install
npm run dev      # start the dev server
npm run build    # typecheck + production build
npm run test     # unit and integration tests (Vitest + Testing Library)
npm run lint     # oxlint
```

## Where things live

- `src/lib/` holds all prompt logic as pure functions (`buildPrompt`, `buildBatch`, `lint`, `color`, `storage`), so it can be reused from a CLI or an API integration later.
- `src/schemas.ts` has zod schemas that mirror `src/types.ts`. Structural schemas validate localStorage and imported files. `formSchema` holds the rules that block the Copy button.
- `src/config/` has the asset type presets, the batch action lists, the IP blocklist (`ipBlocklist.ts`, editable) and the defaults.

## Storage

Profiles live in localStorage under `apb:styles` and `apb:characters`, with the schema version in `apb:version`.
The last selected profiles (`apb:selection`) and the current asset draft (`apb:asset`) are restored on load.
Use **Export profiles** and **Import profiles** to move everything to another browser.
