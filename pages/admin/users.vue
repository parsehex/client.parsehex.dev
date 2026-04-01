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
    email: '',
    password: '',
    full_name: '',
    client_id: undefined,
    role: undefined
  })

  // Table Data
  const columns = [{
    key: 'email',
    label: 'Email'
  }, {
    key: 'full_name',
    label: 'Name'
  }, {
    key: 'client_id',
    label: 'Client ID'
  }, {
    key: 'role',
    label: 'Role'
  }, {
    key: 'is_system_admin',
    label: 'Is Admin'
  }, {
    key: 'created_at',
    label: 'Date Created'
  }]

  const users = ref<Database['public']['Tables']['users']['Row'][]>([])
  const clients = ref<Database['public']['Tables']['clients']['Row'][]>([])
  const isLoading = ref(true)

  const fetchUsersAndClients = async () => {
    isLoading.value = true
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      
    if (userData) users.value = userData

    const { data: clientData } = await supabase
      .from('clients')
      .select('*')

    if (clientData) clients.value = clientData

    isLoading.value = false
  }

  const createUser = async () => {
    try {
      isCreating.value = true
      const reqStatus = await $fetch('/api/admin/create-user', {
        method: 'POST',
        body: {
            email: form.email,
            password: form.password,
            full_name: form.full_name,
            client_id: form.client_id,
            role: form.role
        }
      })
      
      form.email = ''
      form.password = ''
      form.full_name = ''
      form.client_id = undefined
      form.role = undefined
      isCreateOpen.value = false
      await fetchUsersAndClients()
    } catch (e: any) {
        errorHandler(e)
    } finally {
        isCreating.value = false
    }
  }

  onMounted(() => {
    fetchUsersAndClients()
  })
</script>

<template>
  <div class="h-full flex flex-col pt-5">
    <div class="flex items-center justify-between px-2 py-4">
      <div>
        <h1 class="text-2xl font-bold">System Users</h1>
        <p class="text-gray-500 text-sm">Manage all users across the client portal.</p>
      </div>

      <UButton icon="i-lucide-plus" label="Add User" @click="isCreateOpen = true" />
    </div>

    <UCard class="flex-1 mt-4" :ui="{ body: { padding: '' } }">
      <UTable :columns="columns" :rows="users" :loading="isLoading">
        <template #is_system_admin-data="{ row }">
          <UBadge :color="row.is_system_admin ? 'red' : 'gray'" variant="soft">
            {{ row.is_system_admin ? 'Admin' : 'User' }}
          </UBadge>
        </template>
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
              Create New User
            </h3>
            <UButton color="gray" variant="ghost" icon="i-lucide-x" class="-my-1" @click="isCreateOpen = false" />
          </div>
        </template>

        <form @submit.prevent="createUser" class="space-y-4">
          <UFormGroup label="Email Address">
            <UInput v-model="form.email" type="email" required placeholder="user@example.com" />
          </UFormGroup>
          <UFormGroup label="Temporary Password">
            <UInput v-model="form.password" type="password" required />
          </UFormGroup>
          <UFormGroup label="Full Name">
            <UInput v-model="form.full_name" placeholder="John Doe" />
          </UFormGroup>
          
          <UDivider label="Assignment" class="my-4" />

          <UFormGroup label="Client Organization">
            <USelect 
                v-model="form.client_id"
                :options="clients.map(c => ({ label: c.name, value: c.id }))" 
                placeholder="No Client" 
            />
          </UFormGroup>

          <UFormGroup label="Client Role">
            <USelect 
                v-model="form.role"
                :options="[{ label: 'Owner', value: 'owner' }, { label: 'Member', value: 'member' }]"
                placeholder="No Role"
            />
          </UFormGroup>

          <div class="pt-4 flex justify-end gap-2">
            <UButton color="gray" variant="soft" @click="isCreateOpen = false">Cancel</UButton>
            <UButton type="submit" :loading="isCreating">Create Account</UButton>
          </div>
        </form>
      </UCard>
    </UModal>
  </div>
</template>
