<script setup lang="ts">
  definePageMeta({
    layout: 'admin',
    middleware: 'admin'
  })

  useSeoMeta({
    title: 'Admin Dashboard - parsehex Client Portal',
  })
</script>

<template>
  <div class="h-full flex flex-col pt-5">
    <div class="flex items-center justify-between px-2 py-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Admin Overview
        </h1>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Welcome to the System Admin portal. Use the sidebar to manage all clients, users, and projects globally.
        </p>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <UCard class="flex flex-col h-full hover:border-primary transition-colors cursor-pointer" @click="navigateTo('/admin/projects')">
            <div class="flex items-center gap-3 mb-4">
                <UIcon name="i-lucide-folder-kanban" class="w-8 h-8 text-primary" />
                <h3 class="text-lg font-bold">Manage Projects</h3>
            </div>
            <p class="text-gray-500 text-sm">Create new projects and post project updates across all client accounts.</p>
        </UCard>
        
        <UCard class="flex flex-col h-full hover:border-primary transition-colors cursor-pointer" @click="navigateTo('/admin/clients')">
            <div class="flex items-center gap-3 mb-4">
                <UIcon name="i-lucide-building-2" class="w-8 h-8 text-primary" />
                <h3 class="text-lg font-bold">Manage Clients</h3>
            </div>
            <p class="text-gray-500 text-sm">Add or edit the master list of client organizations.</p>
        </UCard>
        
        <UCard class="flex flex-col h-full hover:border-primary transition-colors cursor-pointer" @click="navigateTo('/admin/users')">
            <div class="flex items-center gap-3 mb-4">
                <UIcon name="i-lucide-user-cog" class="w-8 h-8 text-primary" />
                <h3 class="text-lg font-bold">Manage Users</h3>
            </div>
            <p class="text-gray-500 text-sm">Mint new user accounts and assign them to clients without logging out.</p>
        </UCard>
    </div>
  </div>
</template>
