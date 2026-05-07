<script setup lang="ts">
import { useRoute } from 'vue-router'
import type { NavItem } from '../../types'

const route = useRoute()

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: 'pi-home', to: '/' },
  { label: 'Projects', icon: 'pi-folder-open', to: '/projects' },
  { label: 'Translations', icon: 'pi-table', to: '/translations' },
]

const settingsItem: NavItem = { label: 'Settings', icon: 'pi-cog', to: '/settings' }
</script>

<template>
  <aside class="flex flex-col w-60 h-screen border-r border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 shrink-0">

    <!-- Branding -->
    <div class="flex items-center gap-3 px-5 py-4 border-b border-surface-200">
      <div class="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-sm">
        <i class="pi pi-language text-primary-contrast text-base" />
      </div>
      <div class="leading-tight">
        <div class="text-sm font-semibold text-surface-900">ARB Manager</div>
        <div class="text-xs text-surface-500">Flutter Localization</div>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 px-3 py-4 space-y-0.5">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        active-class=""
        exact-active-class=""
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 no-underline"
        :class="route.path === item.to
          ? 'bg-primary text-primary-contrast shadow-sm'
          : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900'"
      >
        <i :class="`pi ${item.icon} text-sm w-4 text-center`" />
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>

    <!-- Divider + Settings -->
    <div class="px-3 pb-4 pt-3 border-t border-surface-200">
      <RouterLink
        :to="settingsItem.to"
        active-class=""
        exact-active-class=""
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 no-underline"
        :class="route.path === settingsItem.to
          ? 'bg-primary text-primary-contrast shadow-sm'
          : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900'"
      >
        <i :class="`pi ${settingsItem.icon} text-sm w-4 text-center`" />
        <span>{{ settingsItem.label }}</span>
      </RouterLink>
    </div>

  </aside>
</template>
