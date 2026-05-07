<script setup lang="ts">
import AppSidebar from '../components/layout/AppSidebar.vue';
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-surface-50">
    <AppSidebar />
    <main class="flex-1 overflow-y-auto bg-surface-0">
      <RouterView />
    </main>
  </div>
</template>
