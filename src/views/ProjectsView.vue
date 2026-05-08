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
const reloading = ref(false)
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

async function reloadAll() {
  reloading.value = true
  scanError.value = null
  const projects = [...appStore.recentProjects]
  for (const project of projects) {
    try {
      const refreshed = await scanProject(project.path)
      appStore.updateProject(refreshed)
    } catch {
      // skip projects that can no longer be scanned
    }
  }
  reloading.value = false
}

function removeProject(project: Project) {
  appStore.removeProject(project)
}
</script>

<template>
  <div class="flex flex-col h-full">

    <!-- Toolbar -->
    <div class="flex items-center justify-between px-6 py-3 border-b border-surface-100 bg-white shrink-0">
      <div>
        <h1 class="text-sm font-semibold text-surface-900">Projects</h1>
        <p class="text-xs text-surface-400 mt-0.5">Manage your Flutter localization projects</p>
      </div>
      <div class="flex items-center gap-2">
        <Button
          v-if="appStore.recentProjects.length > 0"
          v-tooltip.bottom="'Reload all projects'"
          icon="pi pi-refresh"
          severity="secondary"
          text
          rounded
          size="small"
          :loading="reloading"
          @click="reloadAll"
        />
        <Button
          label="Open Project"
          icon="pi pi-folder-open"
          size="small"
          :loading="scanning"
          @click="openProject"
        />
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto bg-surface-50/60">
      <div class="p-5 max-w-3xl mx-auto">

        <Message
          v-if="scanError"
          severity="error"
          closable
          class="mb-4"
          @close="scanError = null"
        >
          {{ scanError }}
        </Message>

        <!-- Scanning indicator -->
        <div
          v-if="scanning"
          class="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl border border-surface-100 bg-white shadow-sm"
        >
          <ProgressSpinner style="width: 20px; height: 20px" strokeWidth="5" />
          <span class="text-xs text-surface-600">Scanning project…</span>
        </div>

        <!-- Empty state -->
        <div
          v-if="appStore.recentProjects.length === 0"
          class="flex flex-col items-center justify-center py-24 text-center"
        >
          <div class="w-14 h-14 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
            <i class="pi pi-folder text-2xl text-surface-300" />
          </div>
          <p class="text-sm font-semibold text-surface-700 mb-1">No projects yet</p>
          <p class="text-xs text-surface-400 mb-5">Open a Flutter project folder to get started.</p>
          <Button
            label="Open Flutter Project"
            icon="pi pi-folder-open"
            size="small"
            :loading="scanning"
            @click="openProject"
          />
        </div>

        <!-- Project list -->
        <div v-else class="flex flex-col gap-2">
          <div
            v-for="project in appStore.recentProjects"
            :key="project.path"
            class="group flex items-start gap-4 bg-white rounded-xl border border-surface-100 shadow-sm px-5 py-4 cursor-pointer hover:border-surface-200 hover:shadow-md transition-all duration-150"
            @click="openRecentProject(project)"
          >
            <!-- Icon -->
            <div class="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center shrink-0 mt-0.5">
              <i class="pi pi-folder-open text-primary text-sm" />
            </div>

            <!-- Info -->
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-surface-900">{{ project.name }}</p>
              <p class="text-xs text-surface-400 font-mono truncate mt-0.5">{{ project.path }}</p>

              <!-- Locale chips -->
              <div class="flex flex-wrap gap-1.5 mt-2.5">
                <span
                  v-for="arb in project.arbFiles"
                  :key="arb.locale"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-100 text-surface-600 font-mono text-xs"
                >
                  {{ arb.locale }}
                  <span class="text-surface-400">·</span>
                  <span class="tabular-nums">{{ arb.entryCount }}</span>
                </span>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                v-tooltip.top="'Open translations'"
                icon="pi pi-arrow-right"
                text
                rounded
                size="small"
                @click.stop="openRecentProject(project)"
              />
              <Button
                v-tooltip.top="'Remove from list'"
                icon="pi pi-trash"
                text
                rounded
                size="small"
                severity="danger"
                @click.stop="removeProject(project)"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>
