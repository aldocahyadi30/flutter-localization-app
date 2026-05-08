<script setup lang="ts">
import { Menu } from 'primevue'
import { ref } from 'vue';


const items = ref([
  {
    label: 'Dashboard',
    icon: 'pi pi-home',
    route: '/'
  },
  {
    label: 'Projects',
    icon: 'pi pi-folder-open',
    route: '/projects'
  }
]);
</script>

<template>
  <Menu :model="items" class="w-full md:w-60">
    <template #start>
      <div class="flex items-center px-3 py-2">
        <span class="text-lg font-bold">Translatus</span>
      </div>
    </template>
    <template #item="{ item, props }">
      <router-link v-if="item.route" v-slot="{ href, navigate }" :to="item.route" custom>
        <a v-ripple :href="href" v-bind="props.action" @click="navigate">
          <span :class="item.icon" />
          <span class="ml-2">{{ item.label }}</span>
        </a>
      </router-link>
      <a v-else v-ripple :href="item.url" :target="item.target" v-bind="props.action">
        <span :class="item.icon" />
        <span class="ml-2">{{ item.label }}</span>
      </a>
    </template>
  </Menu>
</template>
