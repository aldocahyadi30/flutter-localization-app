<script setup lang="ts">
import Button from 'primevue/button'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { pickProjectFolder, scanProject } from '../services/projectService'
import { useAppStore } from '../stores/appStore'
import type { Project } from '../types'

const appStore = useAppStore()
const router = useRouter()

const scanning = ref(false)
const scanError = ref<string | null>(null)

const features = [
  {
    icon: 'pi-search',
    title: 'Scan Projects',
    description: 'Automatically detect .arb localization files in your Flutter project directory.',
    colorClass: 'text-blue-500',
    bgClass: 'bg-blue-50',
  },
  {
    icon: 'pi-chart-bar',
    title: 'Compare Locales',
    description: 'Visualize missing or outdated translations across all locales side by side.',
    colorClass: 'text-violet-500',
    bgClass: 'bg-violet-50',
  },
  {
    icon: 'pi-pencil',
    title: 'Edit & Save',
    description: 'Edit translation strings inline and save changes directly back to .arb files.',
    colorClass: 'text-emerald-500',
    bgClass: 'bg-emerald-50',
  },
]

async function openProject() {
  scanError.value = null
  const folder = await pickProjectFolder()
  if (!folder) return

  scanning.value = true
  try {
    const project = await scanProject(folder)
    appStore.openProject(project)
    router.push('/translations')
  } catch (err) {
    scanError.value = err instanceof Error ? err.message : String(err)
  } finally {
    scanning.value = false
  }
}

async function openRecentProject(project: Project) {
  scanError.value = null
  scanning.value = true
  try {
    const refreshed = await scanProject(project.path)
    appStore.openProject(refreshed)
    router.push('/translations')
  } catch (err) {
    scanError.value = err instanceof Error ? err.message : String(err)
  } finally {
    scanning.value = false
  }
}
</script>

<template>
  <div class="min-h-full p-8">
    <div class="max-w-4xl mx-auto">

      <!-- Hero -->
      <div class="mb-10">
        <div class="inline-flex items-center gap-2 text-xs font-semibold text-primary bg-primary-100 px-3 py-1.5 rounded-full mb-5">
          <i class="pi pi-language text-xs" />
          Flutter ARB Localization Manager
        </div>

        <h1 class="text-4xl font-bold text-surface-900 mb-3 leading-tight">
          Manage your Flutter<br />translations with ease
        </h1>
        <p class="text-surface-500 text-base max-w-lg leading-relaxed">
          Open a Flutter project to scan, compare, and edit
          <code class="text-primary font-mono text-sm">.arb</code> localization
          files visually — all from a single desktop tool.
        </p>

        <div class="flex items-center gap-3 mt-7">
          <Button
            label="Open Flutter Project"
            icon="pi pi-folder-open"
            size="large"
            :loading="scanning"
            @click="openProject"
          />
          <Button
            label="Browse Projects"
            icon="pi pi-list"
            severity="secondary"
            outlined
            size="large"
            :disabled="scanning"
            @click="$router.push('/projects')"
          />
        </div>

        <!-- Scan error -->
        <div
          v-if="scanError"
          class="mt-4 flex items-start gap-2.5 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 max-w-lg"
        >
          <i class="pi pi-exclamation-triangle mt-0.5 shrink-0" />
          <span>{{ scanError }}</span>
        </div>
      </div>

      <!-- Scanning overlay card -->
      <div
        v-if="scanning"
        class="mb-10 flex items-center gap-3 px-5 py-4 rounded-xl border border-surface-200 bg-surface-50 text-sm text-surface-600"
      >
        <i class="pi pi-spin pi-spinner text-primary text-base" />
        <span>Scanning project for <code class="font-mono text-primary">.arb</code> files…</span>
      </div>

      <!-- Feature Cards -->
      <div v-else class="grid grid-cols-3 gap-4 mb-10">
        <div
          v-for="feature in features"
          :key="feature.title"
          class="p-5 rounded-xl border border-surface-200 bg-surface-0 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
        >
          <div
            :class="`w-10 h-10 rounded-xl ${feature.bgClass} flex items-center justify-center mb-4`"
          >
            <i :class="`pi ${feature.icon} ${feature.colorClass} text-lg`" />
          </div>
          <h3 class="font-semibold text-surface-900 mb-1.5 text-sm">{{ feature.title }}</h3>
          <p class="text-sm text-surface-400 leading-relaxed">{{ feature.description }}</p>
        </div>
      </div>

      <!-- Recent Projects -->
      <div>
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-base font-semibold text-surface-900">Recent Projects</h2>
          <Button
            v-if="appStore.recentProjects.length > 0"
            label="View All"
            severity="secondary"
            text
            size="small"
            @click="$router.push('/projects')"
          />
        </div>

        <!-- Empty State -->
        <div
          v-if="appStore.recentProjects.length === 0"
          class="flex flex-col items-center justify-center py-14 px-8 rounded-xl border-2 border-dashed border-surface-200 text-center"
        >
          <div class="w-14 h-14 rounded-full bg-surface-100 flex items-center justify-center mb-3">
            <i class="pi pi-folder text-2xl text-surface-300" />
          </div>
          <p class="text-surface-500 text-sm font-medium">No recent projects</p>
          <p class="text-surface-400 text-xs mt-1">Open a Flutter project to get started.</p>
          <Button
            label="Open Project"
            icon="pi pi-folder-open"
            severity="secondary"
            outlined
            size="small"
            class="mt-4"
            :loading="scanning"
            @click="openProject"
          />
        </div>

        <!-- Recent List -->
        <div v-else class="space-y-2">
          <div
            v-for="project in appStore.recentProjects"
            :key="project.path"
            class="flex items-center gap-4 p-4 rounded-xl border border-surface-200 bg-surface-0 hover:bg-surface-50 cursor-pointer transition-colors duration-150 group"
            @click="openRecentProject(project)"
          >
            <div class="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
              <i class="pi pi-folder-open text-primary text-sm" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-surface-900 truncate">{{ project.name }}</p>
              <p class="text-xs text-surface-400 truncate font-mono">{{ project.path }}</p>
            </div>
            <div class="flex items-center gap-3 shrink-0">
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="arb in project.arbFiles.slice(0, 4)"
                  :key="arb.locale"
                  class="text-xs font-mono bg-surface-100 text-surface-600 px-1.5 py-0.5 rounded"
                >
                  {{ arb.locale }}
                </span>
                <span
                  v-if="project.arbFiles.length > 4"
                  class="text-xs text-surface-400 px-1"
                >
                  +{{ project.arbFiles.length - 4 }}
                </span>
              </div>
              <Button
                icon="pi pi-arrow-right"
                text
                rounded
                size="small"
                class="opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
