# Desktop Reminder

A **local-first** desktop overlay for checklists and short notes on **macOS** and **Windows**. The window stays on top of other apps (optional), supports transparency, and keeps all data on your machine.

## Installing (for people using the app)

**End users do not install Node.js or run any commands.** They only download the file you publish (for example from your website or GitHub Releases) and follow the steps below.

### macOS

1. Download **`Desktop Reminder-x.x.x-arm64.dmg`** (Apple Silicon) or the **x64** build if you offer it for Intel Macs.
2. Open the `.dmg` file.
3. Drag **Desktop Reminder** into the **Applications** folder (this is the standard one-step “install” for Mac apps).
4. Open the app from **Applications**.  
   If macOS says the app cannot be opened because it is from an unidentified developer, **Control-click** the app, choose **Open**, then **Open** again. After that, it opens normally.  
   **Code signing and notarization** remove this extra step for users. See [docs/RELEASE.md](docs/RELEASE.md).

### Windows

1. Download the **installer** file, usually named like **`Desktop Reminder Setup x.x.x.exe`** (NSIS build from `npm run build` on Windows).
2. Double-click it and follow the installer (**Next** / **Install**). That is the closest to a **one-click** flow on Windows: one download, one installer run, shortcuts optional.
3. Alternatively, if you distribute the **portable** `.exe`, there is no install step: put the file somewhere and double-click to run.

### What you ship as the developer

After `npm run build` on each platform, upload the artifacts from the **`release/`** folder:

| Platform | Typical files users download |
| -------- | ------------------------------ |
| macOS    | `.dmg` (recommended) or `.zip` |
| Windows  | NSIS **Setup `.exe`** for a normal installer, or **portable `.exe`** for no installer |

Host those files on a **single download page** or **GitHub Releases** so users have one link and one file to grab. Optional: use **GitHub Releases** “Latest” so the download button is always obvious.

## Features

- Rich checklist with **bold**, **highlight**, **colors**, and **urgent** lines; each line shows an automatic **date/time stamp** (new lines get a new time when you press Enter)
- Checking an item **keeps** the line and strikes it through; remove lines with Backspace or by editing like normal text (use **Edit → Undo** for typing edits)
- **Sort** modes: manual, urgent first, alphabetical, created date
- **Themes** (light, dark, system), accent color, typography, density
- **Window**: opacity, always on top; optional **dim the frame** until you hover or focus the window so the desktop shows through while reminder text stays sharp
- **Tray** menu and optional **global shortcut** to show or hide
- **Export** and **import** JSON backups
- **Atomic saves** with automatic `.bak` recovery if the main file is damaged

## Requirements (developers only)

- **Node.js** LTS
- **npm** 9+

## Quitting the app (macOS)

Closing the window with the red button **does not quit** the app; it keeps running so the menu bar icon (tray) can show or hide the window again. To exit completely: click the tray icon and choose **Quit**, or use the menu **Desktop Reminder → Quit Desktop Reminder** (when the app is focused). If you need to stop a stuck process, use **Activity Monitor** and search for **Desktop Reminder** (or **Electron** while running `npm run dev`).

## Development

```bash
npm install
npm run dev
```

This starts Vite and Electron with hot reload for the renderer.

## Production build

```bash
npm run build
```

Installers and archives are written to `release/` (for example `.dmg` / `.zip` on macOS, NSIS or portable on Windows when built on that OS).

For CI or quick verification without packaging:

```bash
npm run build:renderer
```

## Where data is stored

The app saves `reminders-data.json` (and `reminders-data.json.bak` after successful writes) under the OS user data directory. In the app, open **Settings** to see the exact path for your machine.

Logs from the main process are written by [electron-log](https://github.com/megahertz/electron-log) to a file under user data (see electron-log documentation for locations).

## Scripts

| Script              | Description                                      |
| ------------------- | ------------------------------------------------ |
| `npm run dev`       | Development with Electron                        |
| `npm run build`     | Typecheck, Vite build, electron-builder pack (no publish) |
| `npm run build:publish` | Typecheck, Vite build, electron-builder publish |
| `npm run build:renderer` | Typecheck + Vite only (no installer)        |
| `npm run lint`      | ESLint                                           |
| `npm run typecheck` | `tsc -b`                                         |

## Distribution

See [docs/RELEASE.md](docs/RELEASE.md) for code signing, notarization (macOS), and CI notes.

### Windows signing (SmartScreen)

To reduce Windows SmartScreen warnings, configure these GitHub repository secrets for the release workflow:

- `WIN_CSC_LINK` - Base64 `.pfx` certificate or secure URL to the cert file
- `WIN_CSC_KEY_PASSWORD` - Certificate password

If secrets are not set, builds still publish but remain unsigned.

## License

MIT. See [LICENSE](LICENSE).
