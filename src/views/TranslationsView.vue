<script setup lang="ts">
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import Tag from 'primevue/tag'
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

    <!-- ── Toolbar ──────────────────────────────────────────────────────── -->
    <Toolbar
      :pt="{
        root: { class: 'rounded-none border-0 border-b border-surface-200 px-6 py-2 shrink-0 bg-surface-0' },
      }"
    >
      <template #start>
        <div class="flex flex-col leading-tight min-w-0 mr-4">
          <span class="text-sm font-semibold text-surface-900 truncate">
            {{ appStore.currentProject?.name ?? 'Translations' }}
          </span>
          <span class="text-xs text-surface-400 font-mono truncate max-w-xs">
            {{ appStore.currentProject?.path }}
          </span>
        </div>
      </template>

      <template #end>
        <div class="flex items-center gap-2 flex-wrap">

          <!-- Stats -->
          <template v-if="!loading && locales.length">
            <Tag :value="`${locales.length} locales`" severity="secondary" />
            <Tag :value="`${filteredRows.length} keys`" severity="secondary" />
            <Tag
              v-if="missingCount > 0"
              :value="`${missingCount} missing`"
              severity="danger"
            />
            <Tag v-else value="Complete ✓" severity="success" />
          </template>

          <!-- Dirty indicator + save/discard -->
          <template v-if="isDirty">
            <span class="flex items-center gap-1.5 text-xs text-surface-500">
              <span class="w-2 h-2 rounded-full bg-amber-400 inline-block" />
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

          <!-- Search -->
          <IconField v-if="!loading && locales.length">
            <InputIcon class="pi pi-search" />
            <InputText
              v-model="filterQuery"
              placeholder="Search keys or values…"
              size="small"
              class="w-52"
            />
          </IconField>

          <Button
            label="Open Another"
            icon="pi pi-folder-open"
            severity="secondary"
            outlined
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

    <!-- ── DataTable ─────────────────────────────────────────────────────── -->
    <div v-else class="flex-1 overflow-hidden">
      <DataTable
        :value="filteredRows"
        data-key="key"
        size="small"
        scrollable
        scroll-height="flex"
        class="h-full"
        :pt="{
          table: { class: 'border-collapse' },
          bodyRow: { class: 'border-b border-surface-100 hover:bg-surface-50/40 group transition-colors' },
        }"
      >
        <!-- Key column (frozen) -->
        <Column
          header="Key"
          frozen
          :style="{ width: '16rem', minWidth: '16rem' }"
          :pt="{
            headerCell: { class: 'border-r border-surface-200 bg-surface-50 px-4 py-2.5' },
            bodyCell: { class: 'border-r border-surface-100 px-4 py-2.5 align-top select-none' },
          }"
        >
          <template #body="{ data }">
            <div class="font-mono text-xs font-medium text-surface-800 leading-snug break-all">
              {{ data.key }}
            </div>
            <div v-if="data.description" class="text-xs text-surface-400 mt-0.5 leading-snug">
              {{ data.description }}
            </div>
          </template>
        </Column>

        <!-- Dynamic locale columns -->
        <Column
          v-for="locale in locales"
          :key="locale"
          :style="{ minWidth: '14rem' }"
          :pt="{
            headerCell: { class: 'border-r border-surface-200 last:border-r-0 bg-surface-50 px-4 py-2.5' },
            bodyCell: { class: 'border-r border-surface-100 last:border-r-0 p-0 align-top' },
          }"
        >
          <template #header>
            <div class="flex items-center gap-2">
              <Tag
                :value="locale.slice(0, 2).toUpperCase()"
                severity="secondary"
                class="font-bold"
              />
              <span class="text-xs font-medium text-surface-600">{{ locale }}</span>
            </div>
          </template>

          <template #body="{ data }">
            <div
              class="w-full min-h-[38px] cursor-text"
              :class="{
                'bg-red-50/60': getCellValue(data.key, locale) === undefined && !isActive(data.key, locale),
                'bg-amber-50': isCellDirty(data.key, locale) && !isActive(data.key, locale),
                'ring-2 ring-inset ring-primary': isActive(data.key, locale),
              }"
              @click="!isActive(data.key, locale) && startEdit(data as TranslationRow, locale)"
            >
              <!-- Editing textarea -->
              <textarea
                v-if="isActive(data.key, locale)"
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

              <!-- Display value -->
              <div v-else class="px-4 py-2.5 flex items-start gap-2 group/cell">
                <div class="flex-1 min-w-0">
                  <span
                    v-if="getCellValue(data.key, locale) !== undefined"
                    class="text-xs leading-snug break-words block"
                    :class="isCellDirty(data.key, locale)
                      ? 'text-amber-700 font-medium'
                      : 'text-surface-700'"
                  >
                    {{ getCellValue(data.key, locale) }}
                  </span>
                  <span v-else class="inline-flex items-center gap-1 text-xs text-red-400 italic">
                    <i class="pi pi-plus-circle text-xs" />
                    Add translation
                  </span>
                </div>
                <i
                  class="pi pi-pencil text-xs text-surface-300 opacity-0 group-hover/cell:opacity-100 transition-opacity mt-0.5 shrink-0"
                />
                <span
                  v-if="isCellDirty(data.key, locale)"
                  class="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1"
                />
              </div>
            </div>
          </template>
        </Column>

        <!-- Empty search state -->
        <template #empty>
          <div class="text-center py-16 text-surface-400 text-sm">
            <i class="pi pi-search text-2xl text-surface-200 block mb-3" />
            No keys match
            <span class="font-mono text-surface-500">"{{ filterQuery }}"</span>
          </div>
        </template>
      </DataTable>
    </div>

  </div>
</template>
