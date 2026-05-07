import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import type { Project } from '../types'

export interface ScannedProject {
  path: string
  name: string
  arbFiles: Array<{ locale: string; path: string; entryCount: number }>
}

export interface ArbEntry {
  key: string
  value: string
  description?: string
}

export interface LoadedArbFile {
  locale: string
  path: string
  entries: ArbEntry[]
}

/**
 * A merged row for the translation table.
 * translations[locale] = value string, or undefined if the key is missing in that locale.
 */
export interface TranslationRow {
  key: string
  description?: string
  translations: Record<string, string | undefined>
}

/**
 * Open a native folder picker and return the selected path, or null if cancelled.
 */
export async function pickProjectFolder(): Promise<string | null> {
  const selected = await open({
    directory: true,
    multiple: false,
    title: 'Select Flutter Project Folder',
  })
  if (!selected || Array.isArray(selected)) return null
  return selected
}

/**
 * Ask Rust to scan the given directory for .arb files.
 */
export async function scanProject(folderPath: string): Promise<Project> {
  const result = await invoke<ScannedProject>('scan_flutter_project', { path: folderPath })
  return {
    path: result.path,
    name: result.name,
    lastOpened: new Date().toISOString(),
    arbFiles: result.arbFiles,
  }
}

/**
 * Ask Rust to read and parse all given .arb file paths.
 */
export async function loadArbFiles(paths: string[]): Promise<LoadedArbFile[]> {
  return invoke<LoadedArbFile[]>('load_arb_files', { paths })
}

/**
 * Write edited values back to a single .arb file on disk.
 * `edits` maps translation key → new string value.
 */
export async function saveArbFile(path: string, edits: Record<string, string>): Promise<void> {
  return invoke<void>('save_arb_file', { path, edits })
}

/**
 * Merge multiple loaded ARB files into a flat table of rows keyed by translation key.
 */
export function mergeArbFiles(files: LoadedArbFile[]): TranslationRow[] {
  const rowMap = new Map<string, TranslationRow>()

  for (const file of files) {
    for (const entry of file.entries) {
      if (!rowMap.has(entry.key)) {
        rowMap.set(entry.key, {
          key: entry.key,
          description: entry.description,
          translations: {},
        })
      }
      const row = rowMap.get(entry.key)!
      row.translations[file.locale] = entry.value
      if (!row.description && entry.description) {
        row.description = entry.description
      }
    }
  }

  return Array.from(rowMap.values()).sort((a, b) => a.key.localeCompare(b.key))
}
