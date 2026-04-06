# Shipping Desktop Reminder (macOS and Windows)

## Prerequisites

- Node.js LTS and npm
- Apple Developer Program membership for signed macOS builds (optional but recommended)
- Windows code signing certificate for SmartScreen-friendly Windows builds (optional)

## Build artifacts

From the project root:

```bash
npm install
npm run build
```

Outputs:

- `release/` contains installers produced by electron-builder (`.dmg`, `.zip`, NSIS `.exe`, portable `.exe`, depending on the host OS and config).

Building Windows installers on macOS (or the reverse) may require cross-build tooling; the common approach is CI that runs `npm run build` on each target OS.

## macOS: signing and notarization

1. Set environment variables for signing, for example `CSC_LINK` (path to certificate) and `CSC_KEY_PASSWORD`, or use a keychain-based setup documented by electron-builder.
2. For notarization, configure `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`, and enable `notarize: true` under `build.mac` when you are ready (not enabled in the default scaffold).
3. Users on unsigned builds must use right-click Open or System Settings to allow the app the first time.

## Windows: Authenticode

1. Obtain a code signing certificate and export it as a PFX or use a hardware token supported by your toolchain.
2. Set `CSC_LINK` and `CSC_KEY_PASSWORD` (or the variables your signing tool expects) before `npm run build`.
3. Without signing, SmartScreen may warn until reputation builds.

## CI suggestion

Use a matrix workflow (GitHub Actions, etc.) with `runs-on: macos-latest` and `runs-on: windows-latest`, each running `npm ci` and `npm run build`, uploading `release/` as artifacts.

## Auto-updates

Not included in v1. Adding `electron-updater` requires a published update URL and signed builds for a smooth experience.
