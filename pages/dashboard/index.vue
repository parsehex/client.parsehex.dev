<script setup lang="ts">
  import { projects, updates } from '~/static/static-dashboard'

  useSeoMeta({
    title: 'Dashboard - parsehex Client Portal',
  })
</script>

<template>
  <div class="w-full mx-auto my-10 space-y-8 max-w-7xl px-4 sm:px-6 lg:px-8">
    
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
        Dashboard Overview
      </h1>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Review your projects, environment links, and recent development updates.
      </p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      <!-- /* ------------------------------- Projects Column ------------------------------ */ -->
      <div class="lg:col-span-2 space-y-6">
        <h2 class="text-xl font-semibold dark:text-gray-200 flex items-center gap-2">
          <UIcon name="i-lucide-folder-kanban" class="w-5 h-5 text-primary" />
          Active Projects
        </h2>

        <div class="space-y-4">
          <UCard v-for="project in projects" :key="project.id" class="overflow-hidden">
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-bold">{{ project.name }}</h3>
                <UBadge 
                  :color="project.status === 'active' ? 'emerald' : 'blue'" 
                  variant="subtle">
                  {{ project.status === 'active' ? 'Live / Active' : 'In Progress' }}
                </UBadge>
              </div>
            </template>
            
            <p class="text-gray-600 dark:text-gray-300 mb-6 text-sm">
              {{ project.description }}
            </p>

            <div class="flex flex-wrap gap-3">
              <UButton 
                v-for="link in project.links" 
                :key="link.title"
                :to="link.url"
                target="_blank"
                :variant="link.type === 'primary' ? 'solid' : 'soft'"
                :color="link.type === 'primary' ? 'primary' : 'gray'"
                :icon="link.icon"
                size="sm"
              >
                {{ link.title }}
              </UButton>
            </div>
          </UCard>
        </div>
      </div>

      <!-- /* ------------------------------- Updates Column ------------------------------ */ -->
      <div class="lg:col-span-1 space-y-6">
        <h2 class="text-xl font-semibold dark:text-gray-200 flex items-center gap-2">
          <UIcon name="i-lucide-activity" class="w-5 h-5 text-primary" />
          Recent Updates
        </h2>

        <UCard class="h-full">
          <ul class="space-y-6">
            <li v-for="update in updates" :key="update.id" class="relative">
              
              <div class="flex items-start gap-4">
                <div class="flex-shrink-0 mt-1">
                  <UIcon 
                    :name="update.type === 'feature' ? 'i-lucide-sparkles' : update.type === 'deployment' ? 'i-lucide-rocket' : 'i-lucide-message-square'" 
                    class="w-5 h-5"
                    :class="update.type === 'feature' ? 'text-blue-500' : update.type === 'deployment' ? 'text-emerald-500' : 'text-gray-400'"
                  />
                </div>
                <div>
                  <div class="flex items-center justify-between gap-4">
                    <h4 class="text-sm font-semibold dark:text-gray-200">{{ update.title }}</h4>
                  </div>
                  <span class="text-xs text-primary font-medium mt-0.5 block">{{ update.date }}</span>
                  <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {{ update.description }}
                  </p>
                </div>
              </div>

            </li>
          </ul>
        </UCard>
      </div>

    </div>
  </div>
</template>

<style scoped>

</style>
