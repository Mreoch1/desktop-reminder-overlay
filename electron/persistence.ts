import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import type { AppData } from '../src/shared/types'
import { DATA_VERSION, defaultSettings } from '../src/shared/types'
import { emptyDoc } from '../src/shared/defaultDoc'
import { parseAndValidateAppData } from './validateData'

const DATA_FILE = 'reminders-data.json'
const MAX_SAVE_BYTES = 20 * 1024 * 1024

export type SaveResult = { ok: true } | { ok: false; error: string }

export function getDataFilePath(userDataDir: string): string {
  if (!existsSync(userDataDir)) {
    mkdirSync(userDataDir, { recursive: true })
  }
  return join(userDataDir, DATA_FILE)
}

export function saveAppDataFile(filePath: string, data: AppData): SaveResult {
  const json = JSON.stringify(data, null, 2)
  if (Buffer.byteLength(json, 'utf8') > MAX_SAVE_BYTES) {
    return { ok: false, error: 'Data exceeds the maximum allowed size.' }
  }

  const tmpPath = `${filePath}.tmp`
  const bakPath = `${filePath}.bak`

  try {
    writeFileSync(tmpPath, json, 'utf8')
    if (existsSync(filePath)) {
      copyFileSync(filePath, bakPath)
    }
    if (existsSync(filePath)) {
      unlinkSync(filePath)
    }
    renameSync(tmpPath, filePath)
    return { ok: true }
  } catch (err) {
    try {
      if (existsSync(tmpPath)) unlinkSync(tmpPath)
    } catch {
      /* ignore cleanup errors */
    }
    const message = err instanceof Error ? err.message : 'Unknown write error'
    return { ok: false, error: message }
  }
}

function tryParseFileContent(raw: string): AppData | null {
  try {
    const parsed = JSON.parse(raw) as unknown
    return parseAndValidateAppData(parsed)
  } catch {
    return null
  }
}

export function loadAppDataFile(filePath: string): AppData {
  const fallback: AppData = {
    version: DATA_VERSION,
    doc: emptyDoc(),
    settings: defaultSettings(),
  }

  if (!existsSync(filePath)) {
    return fallback
  }

  try {
    const raw = readFileSync(filePath, 'utf8')
    const primary = tryParseFileContent(raw)
    if (primary) {
      return primary
    }
  } catch {
    /* try backup */
  }

  const bakPath = `${filePath}.bak`
  if (existsSync(bakPath)) {
    try {
      const raw = readFileSync(bakPath, 'utf8')
      const fromBak = tryParseFileContent(raw)
      if (fromBak) {
        return fromBak
      }
    } catch {
      /* use fallback */
    }
  }

  return fallback
}
