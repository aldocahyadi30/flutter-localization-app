import { computed, ref, watch } from 'vue'
import type { LoadedArbFile, TranslationRow } from '../services/projectService'
import { loadArbFiles, mergeArbFiles, saveArbFile } from '../services/projectService'
import { useAppStore } from '../stores/appStore'

export function useTranslations() {
  const appStore = useAppStore()

  const loading = ref(false)
  const error = ref<string | null>(null)
  const loadedFiles = ref<LoadedArbFile[]>([])
  const rows = ref<TranslationRow[]>([])
  const filterQuery = ref('')

  // pendingEdits[locale][key] = newValue
  const pendingEdits = ref<Record<string, Record<string, string>>>({})
  const saving = ref(false)
  const saveError = ref<string | null>(null)

  const locales = computed(() => loadedFiles.value.map(f => f.locale))

  const filteredRows = computed(() => {
    const q = filterQuery.value.trim().toLowerCase()
    if (!q) return rows.value
    return rows.value.filter(row =>
      row.key.toLowerCase().includes(q) ||
      Object.values(row.translations).some(v => v?.toLowerCase().includes(q)) ||
      Object.entries(pendingEdits.value).some(([, edits]) =>
        edits[row.key]?.toLowerCase().includes(q),
      ),
    )
  })

  const missingCount = computed(() => {
    const localeList = locales.value
    return rows.value.filter(row =>
      localeList.some(locale => getCellValue(row.key, locale) === undefined),
    ).length
  })

  const isDirty = computed(() =>
    Object.values(pendingEdits.value).some(edits => Object.keys(edits).length > 0),
  )

  const pendingCount = computed(() =>
    Object.values(pendingEdits.value).reduce((sum, edits) => sum + Object.keys(edits).length, 0),
  )

  /** Returns the pending-edit value if one exists, otherwise the original loaded value. */
  function getCellValue(key: string, locale: string): string | undefined {
    const pending = pendingEdits.value[locale]?.[key]
    if (pending !== undefined) return pending
    return rows.value.find(r => r.key === key)?.translations[locale]
  }

  function isCellDirty(key: string, locale: string): boolean {
    return pendingEdits.value[locale]?.[key] !== undefined
  }

  /** Commit an edit for a single cell. Pass empty string to explicitly set to ''. */
  function setCellValue(key: string, locale: string, newValue: string) {
    const original = rows.value.find(r => r.key === key)?.translations[locale]
    if (!pendingEdits.value[locale]) {
      pendingEdits.value[locale] = {}
    }
    if (newValue === original) {
      // No change — remove from pending
      delete pendingEdits.value[locale][key]
    } else {
      pendingEdits.value[locale][key] = newValue
    }
  }

  function discardEdits() {
    pendingEdits.value = {}
    saveError.value = null
  }

  function clearSaveError() {
    saveError.value = null
  }

  async function saveAll() {
    saving.value = true
    saveError.value = null
    try {
      for (const [locale, edits] of Object.entries(pendingEdits.value)) {
        if (Object.keys(edits).length === 0) continue
        const file = loadedFiles.value.find(f => f.locale === locale)
        if (!file) continue
        await saveArbFile(file.path, edits)
      }
      pendingEdits.value = {}
      await load()
    } catch (err) {
      saveError.value = err instanceof Error ? err.message : String(err)
    } finally {
      saving.value = false
    }
  }

  async function load() {
    const project = appStore.currentProject
    if (!project || project.arbFiles.length === 0) return

    loading.value = true
    error.value = null
    try {
      const paths = project.arbFiles.map(f => f.path)
      loadedFiles.value = await loadArbFiles(paths)
      rows.value = mergeArbFiles(loadedFiles.value)
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
    } finally {
      loading.value = false
    }
  }

  // Reload whenever the current project changes
  watch(() => appStore.currentProject, () => { load() }, { immediate: true })

  return {
    loading, error,
    rows, filteredRows, locales, filterQuery,
    missingCount,
    pendingEdits, isDirty, pendingCount,
    saving, saveError,
    getCellValue, isCellDirty, setCellValue,
    saveAll, discardEdits, clearSaveError,
    load,
  }
}
