<script setup lang="ts">
import Button from 'primevue/button'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { pickProjectFolder, scanProject } from '../services/projectService'
import { useAppStore } from '../stores/appStore'
import type { Project } from '../types'

const appStore = useAppStore()
const router = useRouter()

const scanning = ref(false)
const scanError = ref<string | null>(null)

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
  <div class="flex flex-col h-full bg-surface-50/60 overflow-y-auto">
    <div class="max-w-2xl mx-auto w-full px-6 py-8 flex flex-col gap-6">

      <!-- Header row -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-sm font-semibold text-surface-900">ARB Manager</h1>
          <p class="text-xs text-surface-400 mt-0.5 font-mono">Flutter localization tool</p>
        </div>
        <Button
          label="Open Project"
          icon="pi pi-folder-open"
          size="small"
          :loading="scanning"
          @click="openProject"
        />
      </div>

      <!-- Error -->
      <Message
        v-if="scanError"
        severity="error"
        closable
        @close="scanError = null"
      >
        {{ scanError }}
      </Message>

      <!-- Scanning -->
      <div
        v-if="scanning"
        class="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-surface-100 shadow-sm"
      >
        <ProgressSpinner style="width: 18px; height: 18px" strokeWidth="5" />
        <span class="text-xs text-surface-600 font-mono">Scanning for .arb files…</span>
      </div>

      <!-- Quick actions -->
      <div class="grid grid-cols-3 gap-2">
        <button
          class="flex flex-col items-start gap-2 bg-white rounded-xl border border-surface-100 shadow-sm px-4 py-3.5 hover:border-surface-200 hover:shadow-md transition-all text-left"
          @click="openProject"
        >
          <i class="pi pi-folder-open text-primary text-base" />
          <div>
            <p class="text-xs font-semibold text-surface-800">Open Project</p>
            <p class="text-xs text-surface-400 mt-0.5">Pick a Flutter folder</p>
          </div>
        </button>
        <button
          class="flex flex-col items-start gap-2 bg-white rounded-xl border border-surface-100 shadow-sm px-4 py-3.5 hover:border-surface-200 hover:shadow-md transition-all text-left"
          @click="router.push('/projects')"
        >
          <i class="pi pi-list text-violet-500 text-base" />
          <div>
            <p class="text-xs font-semibold text-surface-800">All Projects</p>
            <p class="text-xs text-surface-400 mt-0.5">{{ appStore.recentProjects.length }} recent</p>
          </div>
        </button>
        <button
          class="flex flex-col items-start gap-2 bg-white rounded-xl border border-surface-100 shadow-sm px-4 py-3.5 hover:border-surface-200 hover:shadow-md transition-all text-left"
          :class="appStore.currentProject ? '' : 'opacity-50 cursor-not-allowed'"
          @click="appStore.currentProject && router.push('/translations')"
        >
          <i class="pi pi-language text-emerald-500 text-base" />
          <div>
            <p class="text-xs font-semibold text-surface-800">Translations</p>
            <p class="text-xs text-surface-400 mt-0.5 truncate max-w-[120px]">
              {{ appStore.currentProject?.name ?? 'No project open' }}
            </p>
          </div>
        </button>
      </div>

      <!-- Recent Projects -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold text-surface-500 uppercase tracking-wide">Recent</span>
          <Button
            v-if="appStore.recentProjects.length > 0"
            label="View all"
            severity="secondary"
            text
            size="small"
            class="text-xs"
            @click="router.push('/projects')"
          />
        </div>

        <!-- Empty -->
        <div
          v-if="appStore.recentProjects.length === 0"
          class="flex items-center gap-3 px-4 py-4 rounded-xl border-2 border-dashed border-surface-200 text-surface-400"
        >
          <i class="pi pi-folder text-surface-200 text-lg" />
          <span class="text-xs">No recent projects. Open a Flutter folder to get started.</span>
        </div>

        <!-- List -->
        <div v-else class="flex flex-col gap-1.5">
          <div
            v-for="project in appStore.recentProjects.slice(0, 6)"
            :key="project.path"
            class="group flex items-center gap-3 bg-white rounded-xl border border-surface-100 shadow-sm px-4 py-3 cursor-pointer hover:border-surface-200 hover:shadow-md transition-all"
            @click="openRecentProject(project)"
          >
            <div class="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
              <i class="pi pi-folder-open text-primary text-xs" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-semibold text-surface-800 truncate">{{ project.name }}</p>
              <p class="text-xs text-surface-400 font-mono truncate">{{ project.path }}</p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <span class="text-xs text-surface-400 tabular-nums">
                {{ project.arbFiles.length }} locale{{ project.arbFiles.length !== 1 ? 's' : '' }}
              </span>
              <i class="pi pi-arrow-right text-xs text-surface-300 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

