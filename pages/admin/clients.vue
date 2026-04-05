<script setup lang="ts">
  import type { Database } from '~/supabase/database.types';

  definePageMeta({
    layout: 'admin',
    middleware: 'admin'
  })

  const supabase = useSupabaseClient<Database>()
  const { errorHandler } = useErrorHandler()

  const isCreateOpen = ref(false)
  const isCreating = ref(false)

  const form = reactive({
    name: '',
    is_speculative: false,
    contact_email: '',
    contact_name: '',
    website: '',
    source: '',
    deal_value: ''
  })

  // Tabs
  const items = [{
    slot: 'active',
    label: 'Active Clients',
    icon: 'i-lucide-users'
  }, {
    slot: 'prospects',
    label: 'Prospects',
    icon: 'i-lucide-briefcase'
  }]

  const selectedTab = ref(0)

  // Table Data
  const activeColumns = [{
    key: 'name',
    label: 'Client Name'
  }, {
    key: 'contact_email',
    label: 'Contact'
  }, {
    key: 'created_at',
    label: 'Date Created'
  }, {
    key: 'actions',
    label: ''
  }]

  const prospectColumns = [{
    key: 'name',
    label: 'Prospect'
  }, {
    key: 'contact_name',
    label: 'Contact'
  }, {
    key: 'source',
    label: 'Source'
  }, {
    key: 'deal_value',
    label: 'Value'
  }, {
    key: 'created_at',
    label: 'Created'
  }, {
    key: 'actions',
    label: ''
  }]

  const clients = ref<any[]>([])
  const isLoading = ref(true)

  const activeClients = computed(() => clients.value.filter(c => !c.is_speculative))
  const prospectClients = computed(() => clients.value.filter(c => c.is_speculative))

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
            name: form.name,
            is_speculative: form.is_speculative,
            contact_email: form.contact_email,
            contact_name: form.contact_name,
            website: form.website,
            source: form.source,
            deal_value: form.deal_value
        })

      if (error) throw error

      // Reset form
      Object.assign(form, {
        name: '',
        is_speculative: false,
        contact_email: '',
        contact_name: '',
        website: '',
        source: '',
        deal_value: ''
      })

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
        <h1 class="text-2xl font-bold">Client Pipeline</h1>
        <p class="text-gray-500 text-sm">Manage active organizations and potential prospects.</p>
      </div>

      <UButton icon="i-lucide-plus" label="New Client / Prospect" @click="isCreateOpen = true" />
    </div>

    <UTabs :items="items" v-model="selectedTab" class="w-full mt-4">
      <template #active>
        <UCard :ui="{ body: { padding: '' } }">
          <UTable :columns="activeColumns" :rows="activeClients" :loading="isLoading">
            <template #created_at-data="{ row }">
              {{ new Date(row.created_at).toLocaleDateString() }}
            </template>
              <template #actions-data="{ row }">
                <div class="flex items-center gap-1">
                  <UButton color="gray" variant="ghost" icon="i-lucide-external-link" :to="`/admin/clients/${row.id}`" />
                  <UButton color="red" variant="ghost" size="xs" icon="i-lucide-trash" @click="deleteClient(row.id)" />
                </div>
              </template>
          </UTable>
        </UCard>
      </template>

      <template #prospects>
        <UCard :ui="{ body: { padding: '' } }">
          <UTable :columns="prospectColumns" :rows="prospectClients" :loading="isLoading">
            <template #created_at-data="{ row }">
              {{ new Date(row.created_at).toLocaleDateString() }}
            </template>
              <template #actions-data="{ row }">
                <div class="flex items-center gap-1">
                  <UButton color="primary" variant="soft" size="xs" icon="i-lucide-layout-dashboard" :to="`/admin/prospects/${row.id}`" />
                  <UButton color="red" variant="ghost" size="xs" icon="i-lucide-trash" @click="deleteClient(row.id)" />
                </div>
              </template>
          </UTable>
        </UCard>
      </template>
    </UTabs>

    <UModal v-model="isCreateOpen" :ui="{ width: 'sm:max-w-xl' }">
      <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
              {{ form.is_speculative ? 'New Prospect' : 'Add Active Client' }}
            </h3>
            <UButton color="gray" variant="ghost" icon="i-lucide-x" class="-my-1" @click="isCreateOpen = false" />
          </div>
        </template>

        <form @submit.prevent="createClient" class="space-y-4 py-2">
          <UFormGroup label="Type">
            <URadioGroup v-model="form.is_speculative" :options="[{ label: 'Active Client', value: false }, { label: 'Speculative Prospect', value: true }]" />
          </UFormGroup>

          <div class="grid grid-cols-2 gap-4">
            <UFormGroup label="Organization / Name" class="col-span-2">
              <UInput v-model="form.name" required placeholder="Acme Corp" />
            </UFormGroup>

            <UFormGroup label="Contact Name">
              <UInput v-model="form.contact_name" placeholder="John Doe" />
            </UFormGroup>

            <UFormGroup label="Contact Email">
              <UInput v-model="form.contact_email" placeholder="john@example.com" />
            </UFormGroup>

            <UFormGroup label="Website">
              <UInput v-model="form.website" placeholder="https://..." />
            </UFormGroup>

            <UFormGroup label="Source">
              <UInput v-model="form.source" placeholder="Referral, LinkedIn, etc." />
            </UFormGroup>

            <UFormGroup label="Deal Value / Notes" class="col-span-2">
              <UInput v-model="form.deal_value" placeholder="e.g. $5k project, $1k/mo retainer" />
            </UFormGroup>
          </div>

          <div class="pt-4 flex justify-end gap-2">
            <UButton color="gray" variant="soft" @click="isCreateOpen = false">Cancel</UButton>
            <UButton type="submit" :loading="isCreating">Save {{ form.is_speculative ? 'Prospect' : 'Client' }}</UButton>
          </div>
        </form>
      </UCard>
    </UModal>
  </div>
</template>
