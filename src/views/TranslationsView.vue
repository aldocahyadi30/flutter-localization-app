<script setup lang="ts">
import Button from 'primevue/button'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Panel from 'primevue/panel'
import ProgressSpinner from 'primevue/progressspinner'
import Toolbar from 'primevue/toolbar'
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
  saveAll, discardEdits, clearSaveError,
  load,
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

// Convert a locale code to a flag emoji (e.g. "en" → "🇬🇧", "id" → "🇮🇩")
function localeFlag(locale: string): string {
  const cc = locale.slice(0, 2).toUpperCase()
  return [...cc]
    .map(c => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('')
}
</script>

<template>
  <div class="flex flex-col h-full" @keydown.escape="cancelEdit">

    <!-- Toolbar -->
    <Toolbar
      :pt="{
        root: { class: 'rounded-none border-0 border-b border-surface-100 px-6 py-3 shrink-0 bg-white' },
      }"
    >
      <template #start>
        <div class="flex flex-col leading-tight min-w-0 mr-4">
          <span class="text-sm font-semibold text-surface-900 truncate">
            {{ appStore.currentProject?.name ?? 'Translations' }}
          </span>
          <span class="text-xs text-surface-400 font-mono truncate max-w-xs mt-0.5">
            {{ appStore.currentProject?.path }}
          </span>
        </div>
      </template>

      <template #end>
        <div class="flex items-center gap-3 flex-wrap">

          <!-- Stats -->
          <template v-if="!loading && locales.length">
            <span class="text-xs text-surface-500">
              <span class="font-semibold text-surface-700 tabular-nums">{{ locales.length }}</span> locales
            </span>
            <span class="text-surface-200 text-sm">·</span>
            <span class="text-xs text-surface-500">
              <span class="font-semibold text-surface-700 tabular-nums">{{ filteredRows.length }}</span> keys
            </span>
            <span class="text-surface-200 text-sm">·</span>
            <span v-if="missingCount > 0" class="text-xs font-semibold text-red-500 tabular-nums">{{ missingCount }} missing</span>
            <span v-else class="text-xs font-semibold text-green-600">All complete ✓</span>
          </template>

          <div v-if="isDirty" class="h-4 w-px bg-surface-200" />

          <!-- Dirty indicator + save/discard -->
          <template v-if="isDirty">
            <span class="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
              <span class="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
              {{ pendingCount }} unsaved
            </span>
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

          <div v-if="!loading && locales.length" class="h-4 w-px bg-surface-200" />

          <!-- Search -->
          <IconField v-if="!loading && locales.length">
            <InputIcon class="pi pi-search" />
            <InputText
              v-model="filterQuery"
              placeholder="Search keys or values…"
              size="small"
              class="w-48"
            />
          </IconField>

          <Button
            v-tooltip.bottom="'Reload project'"
            icon="pi pi-refresh"
            severity="secondary"
            text
            rounded
            size="small"
            :loading="loading"
            @click="load"
          />
          <Button
            v-tooltip.bottom="'Open another project'"
            icon="pi pi-folder-open"
            severity="secondary"
            text
            rounded
            size="small"
            @click="router.push('/')"
          />
        </div>
      </template>
    </Toolbar>

    <!-- Save error banner -->
    <Message
      v-if="saveError"
      severity="error"
      closable
      class="rounded-none border-0 border-b shrink-0 mx-0"
      @close="clearSaveError"
    >
      {{ saveError }}
    </Message>

    <!-- ── No project state ──────────────────────────────────────────────── -->
    <div
      v-if="!appStore.currentProject"
      class="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center"
    >
      <div class="w-16 h-16 rounded-full bg-surface-100 flex items-center justify-center">
        <i class="pi pi-folder-open text-3xl text-surface-300" />
      </div>
      <div>
        <p class="text-surface-700 font-medium mb-1">No project open</p>
        <p class="text-surface-400 text-sm">Open a Flutter project to view its translations.</p>
      </div>
      <Button label="Open Flutter Project" icon="pi pi-folder-open" @click="router.push('/')" />
    </div>

    <!-- ── Loading state ─────────────────────────────────────────────────── -->
    <div
      v-else-if="loading"
      class="flex-1 flex flex-col items-center justify-center gap-3 text-surface-500"
    >
      <ProgressSpinner style="width: 44px; height: 44px" strokeWidth="4" />
      <span class="text-sm">Loading ARB files…</span>
    </div>

    <!-- ── Error state ───────────────────────────────────────────────────── -->
    <div
      v-else-if="error"
      class="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center"
    >
      <Message severity="error" :closable="false" class="max-w-lg">{{ error }}</Message>
      <Button label="Go Back" severity="secondary" icon="pi pi-arrow-left" @click="router.push('/')" />
    </div>

    <!-- Panel list -->
    <div v-else class="flex-1 overflow-y-auto bg-surface-50/60">
      <div class="p-5">

        <!-- Empty search state -->
        <div v-if="filteredRows.length === 0" class="text-center py-20 text-surface-400 text-sm">
          <i class="pi pi-search text-3xl text-surface-200 block mb-4" />
          No keys match <span class="font-mono text-surface-600">"{{ filterQuery }}"</span>
        </div>

        <div v-else class="flex flex-col gap-2 max-w-3xl mx-auto">
          <Panel
            v-for="row in filteredRows"
            :key="row.key"
            toggleable
            :collapsed="true"
            :pt="{
              root: { class: 'bg-white rounded-xl border border-surface-100 shadow-sm overflow-hidden' },
              header: { class: 'px-5 py-3 hover:bg-surface-50/80 transition-colors cursor-pointer select-none' },
              content: { class: 'p-0 border-t border-surface-100' },
            }"
          >
            <template #header>
              <div class="flex items-center gap-3 flex-1 min-w-0">

                <!-- Status dot -->
                <span
                  class="w-2 h-2 rounded-full shrink-0 transition-colors"
                  :class="locales.some(l => isCellDirty(row.key, l))
                    ? 'bg-amber-400'
                    : locales.every(l => getCellValue(row.key, l) !== undefined)
                      ? 'bg-green-400'
                      : 'bg-red-400'"
                />

                <!-- Key name -->
                <span class="font-mono text-xs font-semibold text-surface-800 truncate">{{ row.key }}</span>

                <!-- Description -->
                <span
                  v-if="row.description"
                  class="text-xs text-surface-400 truncate hidden sm:block"
                >
                  {{ row.description }}
                </span>

                <!-- Progress -->
                <div v-if="locales.length" class="flex items-center gap-2 ml-auto shrink-0">
                  <span
                    class="text-xs tabular-nums"
                    :class="locales.every(l => getCellValue(row.key, l) !== undefined)
                      ? 'text-green-600 font-semibold'
                      : 'text-surface-400'"
                  >
                    {{ locales.filter(l => getCellValue(row.key, l) !== undefined).length }}/{{ locales.length }}
                  </span>
                  <div class="w-14 h-1 rounded-full bg-surface-100 overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all duration-300"
                      :class="locales.every(l => getCellValue(row.key, l) !== undefined)
                        ? 'bg-green-400'
                        : 'bg-red-400'"
                      :style="{
                        width: `${(locales.filter(l => getCellValue(row.key, l) !== undefined).length / locales.length) * 100}%`
                      }"
                    />
                  </div>
                </div>
              </div>
            </template>

            <!-- Locale rows -->
            <div>
              <div
                v-for="locale in locales"
                :key="locale"
                class="flex items-start gap-4 px-5 py-2.5 group border-b border-surface-50 last:border-b-0 hover:bg-surface-50/50 transition-colors"
              >
                <!-- Locale label -->
                <div class="flex items-center gap-2 w-24 shrink-0 pt-1">
                  <span class="text-base leading-none select-none">{{ localeFlag(locale) }}</span>
                  <span class="text-xs font-mono text-surface-400">{{ locale }}</span>
                </div>

                <!-- Translation cell -->
                <div
                  class="flex-1 rounded-lg min-h-[30px] cursor-text transition-all"
                  :class="{
                    'bg-red-50': getCellValue(row.key, locale) === undefined && !isActive(row.key, locale),
                    'bg-amber-50': isCellDirty(row.key, locale) && !isActive(row.key, locale),
                    'ring-2 ring-primary bg-white shadow-sm': isActive(row.key, locale),
                  }"
                  @click="!isActive(row.key, locale) && startEdit(row as TranslationRow, locale)"
                >
                  <!-- Editing textarea -->
                  <textarea
                    v-if="isActive(row.key, locale)"
                    v-focus
                    v-model="activeEdit!.value"
                    rows="1"
                    class="w-full px-3 py-1.5 text-xs text-surface-900 leading-snug bg-transparent border-0 outline-none resize-none overflow-hidden block rounded-lg"
                    @blur="commitEdit"
                    @keydown.enter.exact.prevent="commitEdit"
                    @keydown.escape.prevent="cancelEdit"
                    @click.stop
                    @input="autoResize"
                  />

                  <!-- Display value -->
                  <div v-else class="px-3 py-1.5 flex items-start gap-2">
                    <div class="flex-1 min-w-0">
                      <span
                        v-if="getCellValue(row.key, locale) !== undefined"
                        class="text-xs leading-snug break-words block"
                        :class="isCellDirty(row.key, locale) ? 'text-amber-700 font-medium' : 'text-surface-600'"
                      >
                        {{ getCellValue(row.key, locale) }}
                      </span>
                      <span v-else class="text-xs text-red-400/80 italic">Missing translation</span>
                    </div>
                    <i
                      class="pi pi-pencil text-[10px] text-surface-300 opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0"
                    />
                    <span
                      v-if="isCellDirty(row.key, locale)"
                      class="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5"
                    />
                  </div>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>

  </div>
</template>
