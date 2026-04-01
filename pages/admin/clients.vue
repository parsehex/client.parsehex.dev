<script setup lang="ts">
  import type { Database } from '~/supabase/database.types';

  definePageMeta({
    layout: 'admin',
    middleware: 'admin'
  })

  // We don't need isSystemAdmin check in template anymore because middleware protects it
  const supabase = useSupabaseClient<Database>()
  const { errorHandler } = useErrorHandler()

  const isCreateOpen = ref(false)
  const isCreating = ref(false)
  
  const form = reactive({
    name: ''
  })

  // Table Data
  const columns = [{
    key: 'id',
    label: 'Client ID'
  }, {
    key: 'name',
    label: 'Client Name'
  }, {
    key: 'created_at',
    label: 'Date Created'
  }]

  const clients = ref<Database['public']['Tables']['clients']['Row'][]>([])
  const isLoading = ref(true)

  const fetchClients = async () => {
    isLoading.value = true
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })
      
    if (data) clients.value = data
    isLoading.value = false
  }

  const createClient = async () => {
    try {
      isCreating.value = true
      
      const { error } = await supabase
        .from('clients')
        .insert({
            name: form.name
        })

      if (error) throw error

      form.name = ''
      isCreateOpen.value = false
      await fetchClients()
    } catch (e: any) {
        errorHandler(e)
    } finally {
        isCreating.value = false
    }
  }

  onMounted(() => {
    fetchClients()
  })
</script>

<template>
  <div class="h-full flex flex-col pt-5">
    <div class="flex items-center justify-between px-2 py-4">
      <div>
        <h1 class="text-2xl font-bold">Clients</h1>
        <p class="text-gray-500 text-sm">Manage organizations that can access your portal.</p>
      </div>

      <UButton icon="i-lucide-plus" label="New Client" @click="isCreateOpen = true" />
    </div>

    <UCard class="flex-1 mt-4" :ui="{ body: { padding: '' } }">
      <UTable :columns="columns" :rows="clients" :loading="isLoading">
        <template #created_at-data="{ row }">
          {{ new Date(row.created_at).toLocaleDateString() }}
        </template>
      </UTable>
    </UCard>

    <UModal v-model="isCreateOpen">
      <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
              Create New Client
            </h3>
            <UButton color="gray" variant="ghost" icon="i-lucide-x" class="-my-1" @click="isCreateOpen = false" />
          </div>
        </template>

        <form @submit.prevent="createClient" class="space-y-4">
          <UFormGroup label="Client Name">
            <UInput v-model="form.name" required placeholder="Acme Corp" />
          </UFormGroup>
          
          <div class="pt-4 flex justify-end gap-2">
            <UButton color="gray" variant="soft" @click="isCreateOpen = false">Cancel</UButton>
            <UButton type="submit" :loading="isCreating">Save Client</UButton>
          </div>
        </form>
      </UCard>
    </UModal>
  </div>
</template>
