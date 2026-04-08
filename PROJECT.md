# Desktop Reminder Overlay (SSOT)

## Purpose

Local-first Electron app: floating, always-on-top checklist and rich-text notes. Checked task lines stay in the document (strikethrough styling) until the user deletes them. macOS and Windows builds via electron-builder.

## Stack

- Electron + Vite + React + TypeScript
- TipTap (task list, bold, color, highlight, urgent attrs on task items). No auto-delete on check (removed `RemoveCheckedItems` ProseMirror plugin).
- **Urgent** rows: `urgent` uses `keepOnSplit: false` so pressing Enter on an urgent line does not copy urgency to the new row (same pattern as `createdAt`). After any document change, `TaskItemTimestamps` also reorders each `taskList` so all urgent items are at the top, preserving relative order within urgent and non-urgent groups.
- Each task row has `createdAt` (ms). Attribute uses `keepOnSplit: false` so Enter adds a new line with a fresh timestamp; `TaskItemTimestamps` extension fills nulls and breaks duplicate ms. The node view renders a `<time class="task-item__stamp">` with locale date/time on the right of the row.
- **Plain line** clears bold, highlight, and text color for the whole current task row (`clearTaskLineFormatting` + `unsetAllMarks` on the task item content range). Toolbar button, bubble **Plain**, and `Mod-Shift-C`.
- Document schema is `doc` with only `taskList` as direct child, so Enter always splits `taskItem` rows (checkboxes). Stored JSON is normalized via `normalizeChecklistDoc` on load/import. StarterKit uses `document: false` plus `ChecklistDocument`; `trailingNode` and default `listItem`/`listKeymap` are off to avoid orphan paragraphs.
- Zustand for UI state
- JSON file in `app.getPath('userData')` / `reminders-data.json`

## Decisions

- Frameless window with custom title bar; `-webkit-app-region` drag on the title area.
- Auto-updates: main process uses `electron-updater` with GitHub Releases publish provider. On startup (production only), app checks for updates, prompts user to download if available, and prompts restart after download (`quitAndInstall`).
- macOS: `setVisibleOnAllWorkspaces` uses `skipTransformProcessType: true` so Electron does not flip the app into `UIElement` process mode (which omits the app from the standard Force Quit dialog). `app.setActivationPolicy('regular')` on startup reinforces a normal foreground app.
- No click-through: the window always receives mouse events (removed for usability). Main calls `setIgnoreMouseEvents(false)` on create and ready-to-show so a stale `dist-electron` build that still honored old `clickThrough` in JSON cannot leave the window non-interactive after `npm run build`.
- Task list rows use CSS on `li[data-type="taskItem"]` so the checkbox stays beside the text (TipTap does not always add `.task-item` alone). Row DOM: checkbox `label`, **`.task-item__content`** (TipTap `contentDOM`), **`.task-item__end`** (timestamp + delete). Delete is last so it sits away from the checkbox. Strikethrough targets **`.task-item__content`** only (not the end cluster), including urgent rows and inline marks. Deleting the **last** row clears it to an empty task line so `taskList` always has at least one `taskItem`.
- Theme: `theme-light` / `theme-dark` on `documentElement` from settings (light, dark, system). Accent, font, line height, and panel opacity tokens are set on `document.documentElement` so `var(--dro-accent)` resolves app-wide (not only on a nested wrapper).
- Visual intent: **glass on the desktop**, not a solid Notes-style panel. Surfaces and borders stay light; default **panel fill** (`bgOpacity`) is moderate so the wallpaper shows through; **backdrop blur** and **theme-specific `text-shadow`** (`--dro-text-legibility`) keep task text readable on bright or busy backgrounds. Toolbar chrome is intentionally more transparent than the main shell so the checklist reads as the focus.
- Optional **chrome dim until hover/focus**: uses a stabilized renderer state (`app-shell--chrome-active` / `app-shell--chrome-idle`) driven by native Electron window hover events (`BrowserWindow` `mouseenter`/`mouseleave`) plus settings-open override. This removes renderer/header hit-testing edge cases and keeps fade transitions stable across the frameless drag region.
- In notes-only idle mode, text legibility styling now switches to an idle-specific profile (reduced shadow, crisper text color) to avoid the heavy outlined/shaded text look on desktop wallpapers.
- Import bumps `docVersion` so the editor reloads document from store without feeding every keystroke back as props.
- **Density** (`app-shell--compact` vs `--comfortable`) sets `--dro-density-*` tokens on `.app-shell` (main padding, title bar, toolbar, editor, task row spacing). Previously only `--pad` on `main` plus a fixed `padding-top` made the setting nearly invisible.

## End-user install (summary)

- Users download built artifacts only (no Node). macOS: open `.dmg`, drag app to Applications. Windows: run NSIS **Setup .exe** (wizard) or use portable `.exe`. README documents first-launch Gatekeeper behavior for unsigned Mac builds.

## Build

- CSS: `backdrop-filter` is paired with `-webkit-backdrop-filter` for WebKit. `color-mix` usage lives in `@supports` blocks so compat tooling treats it as guarded; fallbacks use solid `var()` colors. `.hintrc` ignores `-webkit-app-region` (Electron frameless drag only; not a general web property).
- Auto-update releases: publish non-draft GitHub Releases that include generated updater artifacts (`latest*.yml` and platform files). `build.publish` points to this repo.
- Local builds use `npm run build` (`electron-builder --publish never`) so packaging works without `GH_TOKEN`. Release upload uses `npm run build:publish` with `GH_TOKEN` set.
- `npm run dev` starts Vite and Electron (vite-plugin-electron).
- `npm run build` runs `tsc`, Vite (renderer + main + preload), and electron-builder. Artifacts under `release/`.
- `npm run build:renderer` runs `tsc` and Vite only (CI, fast check).

## Production hardening (recent)

- Main process bundle: **`electron-log` must stay external** in `vite.config.ts`. Bundling it breaks packaged apps (Rolldown ESM + `require('electron')` inside electron-log). Import **`electron-log/main.js`** (with extension) so Node ESM finds the file inside `app.asar`.
- Single instance: second launch focuses the existing window.
- Atomic save to `reminders-data.json` with `.bak` rotation; load falls back to `.bak` if the primary file is invalid JSON.
- Main-process logging via `electron-log`.
- Import confirms before file picker; save and export surfaces errors in the UI (toast).
- Native **Edit** menu (clipboard) and **Help → About**; macOS app menu uses the product name.
- Windows: `app.setAppUserModelId` for taskbar grouping.
- React **ErrorBoundary** around the tree.

## Open issues

- CI lint guard: avoid direct `setState` calls in effect bodies under `react-hooks/set-state-in-effect`; state updates must come from subscribed callbacks/events.

## Paths

- Remote: https://github.com/Mreoch1/desktop-reminder-overlay
- Releases (installers): https://github.com/Mreoch1/desktop-reminder-overlay/releases — tags follow **semver** (`v1.0.0`); `package.json` `version` must match the release you publish.
- Main: `electron/main.ts`
- Preload: `electron/preload.ts`
- Renderer: `src/App.tsx`, `src/features/notes/*`
