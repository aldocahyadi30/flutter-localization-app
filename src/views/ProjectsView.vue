<script setup lang="ts">
import Button from 'primevue/button'
import Card from 'primevue/card'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import Tag from 'primevue/tag'
import Toolbar from 'primevue/toolbar'
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

function removeProject(project: Project) {
  appStore.removeProject(project)
}
</script>

<template>
  <div class="flex flex-col h-full">

    <!-- Toolbar -->
    <Toolbar
      :pt="{
        root: { class: 'rounded-none border-0 border-b border-surface-200 px-6 py-2 shrink-0 bg-surface-0' },
      }"
    >
      <template #start>
        <div>
          <h1 class="text-base font-semibold text-surface-900">Projects</h1>
          <p class="text-xs text-surface-400 mt-0.5">Manage your Flutter localization projects</p>
        </div>
      </template>
      <template #end>
        <Button
          label="Open Project"
          icon="pi pi-folder-open"
          size="small"
          :loading="scanning"
          @click="openProject"
        />
      </template>
    </Toolbar>

    <div class="flex-1 overflow-y-auto p-6">

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
        class="flex items-center gap-4 mb-4 px-5 py-4 rounded-xl border border-surface-200 bg-surface-50"
      >
        <ProgressSpinner style="width: 28px; height: 28px" strokeWidth="5" />
        <span class="text-sm text-surface-600">Scanning project…</span>
      </div>

      <!-- Empty state -->
      <div
        v-if="appStore.recentProjects.length === 0"
        class="flex flex-col items-center justify-center py-20 text-center"
      >
        <div class="w-16 h-16 rounded-full bg-surface-100 flex items-center justify-center mb-4">
          <i class="pi pi-folder text-3xl text-surface-300" />
        </div>
        <p class="text-surface-700 font-medium mb-1">No projects yet</p>
        <p class="text-surface-400 text-sm mb-5">Open a Flutter project folder to get started.</p>
        <Button
          label="Open Flutter Project"
          icon="pi pi-folder-open"
          :loading="scanning"
          @click="openProject"
        />
      </div>

      <!-- Project list -->
      <div v-else class="grid grid-cols-1 gap-3 max-w-3xl">
        <Card
          v-for="project in appStore.recentProjects"
          :key="project.path"
          class="cursor-pointer hover:shadow-sm transition-shadow duration-150"
          :pt="{ body: { class: 'py-3 px-5' }, content: { class: 'p-0' } }"
          @click="openRecentProject(project)"
        >
          <template #content>
            <div class="flex items-start gap-4 group">

              <!-- Icon -->
              <div class="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center shrink-0 mt-0.5">
                <i class="pi pi-folder-open text-primary" />
              </div>

              <!-- Info -->
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-surface-900">{{ project.name }}</p>
                <p class="text-xs text-surface-400 font-mono truncate mt-0.5">{{ project.path }}</p>

                <!-- Locale tags -->
                <div class="flex flex-wrap gap-1 mt-2">
                  <Tag
                    v-for="arb in project.arbFiles"
                    :key="arb.locale"
                    :value="`${arb.locale} · ${arb.entryCount}`"
                    severity="secondary"
                    class="font-mono text-xs"
                  />
                </div>
              </div>

              <!-- Actions -->
              <div class="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  v-tooltip.top="'Open in Translations'"
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
          </template>
        </Card>
      </div>

    </div>
  </div>
</template>
