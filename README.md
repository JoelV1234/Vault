# Vault

A calm, fast, local-first **Personal Knowledge Management studio** — inspired by
Capacities. Open source (MIT), no AI, no payments, no telemetry. Your notes are
plain markdown files you own.

![Electron](https://img.shields.io/badge/Electron-23-2b2e3a) ![License](https://img.shields.io/badge/license-MIT-10b981)

## Quick start

```bash
npm install
npm run dev        # build renderer + launch the app
```

Other scripts:

```bash
npm run build      # bundle the renderer (esbuild)
npm run watch      # rebuild on change
npm test           # data-layer unit tests (plain Node)
npm run test:smoke # end-to-end smoke test in a hidden Electron window
```

## Concepts

- **Object** — the fundamental unit. Everything (notes, people, books, daily
  notes…) is an Object stored as one markdown file with YAML frontmatter.
- **Object Type** — template defining icon, color, and Properties. 11 built-in
  types; create unlimited custom ones (sidebar → *Object types* → `+`).
- **Properties** — text, multi-line, number, checkbox, date, date range,
  select, multi-select, relation, URL, email, tags.
- **Bi-directional links** — mention objects with `@` (or `Ctrl+L`) in the
  editor. The side panel shows **Backlinks** and **Unlinked mentions**
  automatically. Relation properties count as links too.
- **Daily Notes** — auto-created per day; the inbox for everything.
- **Tags** — every object has a tag row under its title; tags are searchable.
- **Collections** — named groups of objects of the same type (Capacities
  style). An object can belong to **multiple collections**; manage them from
  the *Collections* button in the object header. Collections nest under their
  type in the sidebar. Create them there, from the type's browse view, or
  inline in the popover.
- **Type switching** — the colored type pill in the object header changes an
  object's type; collection memberships are pruned to the new type
  automatically.
- **Graph** — force-directed 2D map of every object and link. Zoom, pan, drag,
  filter by type, search, export as PNG.

## Views

Every type can be browsed as **List · Table · Gallery · Calendar · Kanban**
(Kanban groups by the type's first Select property; Calendar uses its first
date property). Filter and sort on any property, then *Save view* as a
Collection.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl/⌘ K` | Command palette |
| `Ctrl/⌘ N` | New note |
| `Ctrl/⌘ D` | Today's daily note |
| `Ctrl/⌘ Shift G` | Graph |
| `Ctrl/⌘ Shift F` | Search |
| `Ctrl/⌘ L` | Insert link to object (in editor) |
| `@` | Mention an object (in editor) |
| `Ctrl/⌘ Shift O` | Turn selection into a new Object |
| `Ctrl/⌘ \` | Toggle sidebar |
| `Ctrl/⌘ .` | Toggle side panel |
| `Ctrl/⌘ ,` | Settings |
| `Ctrl/⌘ Shift E` | Export |
| `Ctrl/⌘ Shift Space` | **Global** quick capture (works outside the app) |

## Data ownership

Your vault lives at `~/Documents/Vault` (configurable via `VAULT_DIR`):

```
Vault/
  objects/<id>.md     one portable markdown file per object
  assets/             imported images/files
  versions/<id>.json  automatic version history (restore from the ⟲ button)
  trash/              deleted objects are moved, never destroyed
  types.json          object type definitions
  collections.json    saved views
```

Export everything anytime (sidebar share icon): **Markdown** (readable
filenames + assets), **JSON** (full dump), **CSV** (per type), **PDF**
(current object). Deleting the app loses nothing — the files are already
yours.

## Themes

Light / Dark, three accents (Indigo, Teal, Emerald), and a high-contrast mode —
all in Settings. Reduced-motion preferences are respected.

## Scope notes

This repository is the **desktop app** (Linux/macOS/Windows via Electron).
The spec items that require separate platforms — PWA/web build, iOS/Android
apps, browser-extension web clipper, and mobile share-sheet capture — are not
part of this codebase yet. The architecture is ready for them: all data access
goes through one IPC API backed by plain files, so a future sync/web layer can
reuse the store as-is. Desktop quick capture (global shortcut) covers the
capture workflow today.

## Privacy

No telemetry, no tracking, no network calls at runtime. External links open in
your default browser; remote embeds are deliberately blocked by CSP.
