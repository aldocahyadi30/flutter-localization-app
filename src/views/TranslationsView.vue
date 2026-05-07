<script setup lang="ts">
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import { nextTick, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTranslations } from '../composables/useTranslations'
import type { TranslationRow } from '../services/projectService'
import { useAppStore } from '../stores/appStore'

const appStore = useAppStore()
const router = useRouter()

const {
  loading, error,
  filteredRows, locales, filterQuery, missingCount,
  isDirty, pendingCount, saving, saveError,
  getCellValue, isCellDirty, setCellValue,
  saveAll, discardEdits,
} = useTranslations()

// ── Inline edit state ──────────────────────────────────────────────────────────

interface ActiveEdit {
  key: string
  locale: string
  value: string
}

const activeEdit = ref<ActiveEdit | null>(null)

// Directive: auto-focus + select textarea content on mount
const vFocus = {
  mounted: (el: HTMLElement) => {
    el.focus()
    if (el instanceof HTMLTextAreaElement) {
      el.select()
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
    }
  },
}

function startEdit(row: TranslationRow, locale: string) {
  if (activeEdit.value) commitEdit()
  const current = getCellValue(row.key, locale)
  activeEdit.value = { key: row.key, locale, value: current ?? '' }
}

function commitEdit() {
  if (!activeEdit.value) return
  const { key, locale, value } = activeEdit.value
  setCellValue(key, locale, value)
  activeEdit.value = null
}

function cancelEdit() {
  activeEdit.value = null
}

function isActive(key: string, locale: string) {
  return activeEdit.value?.key === key && activeEdit.value?.locale === locale
}

function autoResize(e: Event) {
  const t = e.target as HTMLTextAreaElement
  t.style.height = 'auto'
  t.style.height = t.scrollHeight + 'px'
}

async function handleSaveAll() {
  if (activeEdit.value) commitEdit()
  await nextTick()
  await saveAll()
}
</script>

<template>
  <div class="flex flex-col h-full" @keydown.escape="cancelEdit">

    <!-- ── Header ──────────────────────────────────────────────────────── -->
    <div class="flex items-center gap-3 px-6 py-3 border-b border-surface-200 bg-surface-0 shrink-0 flex-wrap">

      <div class="flex-1 min-w-0">
        <h1 class="text-sm font-semibold text-surface-900 truncate">
          {{ appStore.currentProject?.name ?? 'Translations' }}
        </h1>
        <p class="text-xs text-surface-400 truncate font-mono mt-0.5">
          {{ appStore.currentProject?.path }}
        </p>
      </div>

      <!-- Stats -->
      <div v-if="!loading && locales.length" class="flex items-center gap-3 shrink-0 text-center">
        <div>
          <div class="text-sm font-semibold text-surface-900">{{ locales.length }}</div>
          <div class="text-xs text-surface-400">Locales</div>
        </div>
        <div>
          <div class="text-sm font-semibold text-surface-900">{{ filteredRows.length }}</div>
          <div class="text-xs text-surface-400">Keys</div>
        </div>
        <div v-if="missingCount > 0">
          <div class="text-sm font-semibold text-red-500">{{ missingCount }}</div>
          <div class="text-xs text-surface-400">Missing</div>
        </div>
        <div v-else>
          <div class="text-sm font-semibold text-emerald-500">100%</div>
          <div class="text-xs text-surface-400">Complete</div>
        </div>
      </div>

      <!-- Unsaved changes indicator + save/discard -->
      <template v-if="isDirty">
        <div class="flex items-center gap-1.5 shrink-0">
          <span class="w-2 h-2 rounded-full bg-amber-400 inline-block" />
          <span class="text-xs text-surface-500">
            {{ pendingCount }} unsaved change{{ pendingCount !== 1 ? 's' : '' }}
          </span>
        </div>
        <Button
          label="Discard"
          icon="pi pi-times"
          severity="secondary"
          outlined
          size="small"
          :disabled="saving"
          @click="discardEdits"
        />
        <Button
          label="Save All"
          icon="pi pi-save"
          size="small"
          :loading="saving"
          @click="handleSaveAll"
        />
      </template>

      <!-- Search -->
      <div v-if="!loading && locales.length" class="relative shrink-0">
        <i class="pi pi-search absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-400 text-xs pointer-events-none" />
        <InputText
          v-model="filterQuery"
          placeholder="Search keys or values…"
          class="pl-8 text-sm w-52"
          size="small"
        />
      </div>

      <Button
        label="Open Another"
        icon="pi pi-folder-open"
        severity="secondary"
        outlined
        size="small"
        @click="router.push('/')"
      />
    </div>

    <!-- Save error banner -->
    <div
      v-if="saveError"
      class="flex items-start gap-2.5 px-6 py-2.5 bg-red-50 border-b border-red-200 text-sm text-red-700 shrink-0"
    >
      <i class="pi pi-exclamation-triangle mt-0.5 shrink-0" />
      <span class="flex-1">{{ saveError }}</span>
      <button class="text-red-400 hover:text-red-600 ml-2" @click="saveError = null">
        <i class="pi pi-times text-xs" />
      </button>
    </div>

    <!-- ── States ──────────────────────────────────────────────────────── -->
    <div
      v-if="!appStore.currentProject"
      class="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8"
    >
      <div class="w-16 h-16 rounded-full bg-surface-100 flex items-center justify-center">
        <i class="pi pi-folder-open text-3xl text-surface-300" />
      </div>
      <p class="text-surface-500 text-sm font-medium">No project open</p>
      <Button label="Open Flutter Project" icon="pi pi-folder-open" size="small" @click="router.push('/')" />
    </div>

    <div v-else-if="loading" class="flex-1 flex items-center justify-center gap-3 text-surface-500 text-sm">
      <i class="pi pi-spin pi-spinner text-primary text-lg" />
      Loading ARB files…
    </div>

    <div v-else-if="error" class="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
      <i class="pi pi-exclamation-circle text-3xl text-red-400" />
      <p class="text-sm text-red-600 max-w-md">{{ error }}</p>
      <Button label="Try Again" severity="secondary" size="small" @click="router.push('/')" />
    </div>

    <!-- ── Translation Table ───────────────────────────────────────────── -->
    <div v-else class="flex-1 overflow-auto">
      <table class="w-full text-sm border-collapse">

        <thead class="sticky top-0 z-10">
          <tr class="bg-surface-50 border-b border-surface-200">
            <th class="text-left px-4 py-2.5 font-medium text-surface-600 text-xs w-60 min-w-60 border-r border-surface-200 select-none">
              Key
            </th>
            <th
              v-for="locale in locales"
              :key="locale"
              class="text-left px-4 py-2.5 font-medium text-surface-600 text-xs min-w-56 border-r border-surface-200 last:border-r-0 select-none"
            >
              <div class="flex items-center gap-2">
                <span class="inline-flex w-5 h-5 rounded bg-primary-100 text-primary font-bold items-center justify-center text-xs uppercase">
                  {{ locale.slice(0, 2) }}
                </span>
                {{ locale }}
              </div>
            </th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="row in filteredRows"
            :key="row.key"
            class="border-b border-surface-100 hover:bg-surface-50/50 group"
          >
            <!-- Key column (read-only) -->
            <td class="px-4 py-2.5 border-r border-surface-100 align-top select-none">
              <div class="font-mono text-xs text-surface-800 font-medium leading-snug">{{ row.key }}</div>
              <div v-if="row.description" class="text-xs text-surface-400 mt-0.5 leading-snug">
                {{ row.description }}
              </div>
            </td>

            <!-- Locale cells (editable) -->
            <td
              v-for="locale in locales"
              :key="locale"
              class="px-0 py-0 border-r border-surface-100 last:border-r-0 align-top relative cursor-text"
              :class="{
                'bg-red-50/60': getCellValue(row.key, locale) === undefined && !isActive(row.key, locale),
                'bg-amber-50': isCellDirty(row.key, locale) && !isActive(row.key, locale),
                'ring-2 ring-inset ring-primary bg-primary-50/30': isActive(row.key, locale),
              }"
              @click="!isActive(row.key, locale) && startEdit(row, locale)"
            >
              <!-- Editing textarea (shown when cell is active) -->
              <textarea
                v-if="isActive(row.key, locale)"
                v-focus
                v-model="activeEdit!.value"
                rows="1"
                class="w-full px-4 py-2.5 text-xs text-surface-900 leading-snug bg-transparent border-0 outline-none resize-none overflow-hidden block"
                @blur="commitEdit"
                @keydown.enter.exact.prevent="commitEdit"
                @keydown.escape.prevent="cancelEdit"
                @click.stop
                @input="autoResize"
              />

              <!-- Display value (shown when cell is not active) -->
              <div v-else class="px-4 py-2.5 min-h-[38px] flex items-start gap-2 group/cell">
                <div class="flex-1 min-w-0">
                  <span
                    v-if="getCellValue(row.key, locale) !== undefined"
                    class="text-xs leading-snug break-words block"
                    :class="isCellDirty(row.key, locale) ? 'text-amber-700 font-medium' : 'text-surface-700'"
                  >
                    {{ getCellValue(row.key, locale) }}
                  </span>
                  <span v-else class="inline-flex items-center gap-1 text-xs text-red-400">
                    <i class="pi pi-plus-circle text-xs" />
                    Add translation
                  </span>
                </div>
                <i class="pi pi-pencil text-xs text-surface-300 opacity-0 group-hover/cell:opacity-100 transition-opacity mt-0.5 shrink-0" />
                <span
                  v-if="isCellDirty(row.key, locale)"
                  class="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1"
                />
              </div>
            </td>
          </tr>

          <!-- Empty search state -->
          <tr v-if="filteredRows.length === 0">
            <td :colspan="locales.length + 1" class="text-center py-16 text-surface-400 text-sm">
              No keys match <span class="font-mono text-surface-500">"{{ filterQuery }}"</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>
</template>
