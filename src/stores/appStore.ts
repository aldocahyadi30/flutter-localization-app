import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Project } from '../types'

const STORAGE_KEY = 'arb-manager:recent-projects'

function loadRecent(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Project[]) : []
  } catch {
    return []
  }
}

function saveRecent(projects: Project[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
}

export const useAppStore = defineStore('app', () => {
  const currentProject = ref<Project | null>(null)
  const recentProjects = ref<Project[]>(loadRecent())

  function openProject(project: Project) {
    currentProject.value = project
    const existing = recentProjects.value.findIndex(p => p.path === project.path)
    if (existing !== -1) {
      recentProjects.value.splice(existing, 1)
    }
    recentProjects.value.unshift(project)
    if (recentProjects.value.length > 10) {
      recentProjects.value.pop()
    }
    saveRecent(recentProjects.value)
  }

  function clearCurrentProject() {
    currentProject.value = null
  }

  function removeProject(project: Project) {
    const idx = recentProjects.value.findIndex(p => p.path === project.path)
    if (idx !== -1) {
      recentProjects.value.splice(idx, 1)
      saveRecent(recentProjects.value)
      if (currentProject.value?.path === project.path) {
        currentProject.value = null
      }
    }
  }

  return { currentProject, recentProjects, openProject, clearCurrentProject, removeProject }
})
