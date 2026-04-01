<script setup lang="ts">
  import type { Database } from '~/supabase/database.types';

  definePageMeta({
    layout: 'admin',
    middleware: 'admin'
  })

  useSeoMeta({
    title: 'Manage Project - Admin Portal'
  })

  const route = useRoute()
  const projectId = route.params.id as string

  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const { errorHandler } = useErrorHandler()

  const project = ref<any>(null)
  const updates = ref<Database['public']['Tables']['project_updates']['Row'][]>([])
  const isLoading = ref(true)

  const isUpdateModalOpen = ref(false)
  const isPosting = ref(false)

  const updateForm = reactive({
    title: '',
    description: '',
    update_type: 'feature'
  })

  const updateTypes = [
    { label: 'Feature', value: 'feature' },
    { label: 'Deployment', value: 'deployment' },
    { label: 'Note', value: 'note' }
  ]

  const fetchProjectDetails = async () => {
    isLoading.value = true
    
    // Fetch project
    const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*, clients(name)')
        .eq('id', projectId)
        .single()
        
    if (projectError) {
        errorHandler(projectError)
        return
    }
    
    project.value = projectData

    // Fetch updates
    const { data: updatesData, error: updatesError } = await supabase
        .from('project_updates')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

    if (updatesData) {
        updates.value = updatesData
    }

    isLoading.value = false
  }

  const postUpdate = async () => {
    try {
        isPosting.value = true

        const { error } = await supabase
            .from('project_updates')
            .insert({
                project_id: projectId,
                title: updateForm.title,
                description: updateForm.description,
                update_type: updateForm.update_type,
                author_id: user.value?.id
            })

        if (error) throw error

        updateForm.title = ''
        updateForm.description = ''
        updateForm.update_type = 'feature'
        isUpdateModalOpen.value = false
        
        await fetchProjectDetails()
    } catch (e: any) {
        errorHandler(e)
    } finally {
        isPosting.value = false
    }
  }

  const deleteUpdate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this update?')) return
    
    try {
        const { error } = await supabase
            .from('project_updates')
            .delete()
            .eq('id', id)
            
        if (error) throw error
        await fetchProjectDetails()
    } catch (e: any) {
        errorHandler(e)
    }
  }

  onMounted(() => {
    fetchProjectDetails()
  })
</script>

<template>
  <div class="h-full flex flex-col pt-5">
    <div class="mb-4 px-2">
        <UButton variant="ghost" color="gray" icon="i-lucide-arrow-left" to="/admin/projects" size="sm">Back to Projects</UButton>
    </div>

    <div v-if="isLoading" class="flex justify-center p-10">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-gray-500" />
    </div>

    <div v-else-if="project" class="flex-1">
        <div class="flex items-center justify-between px-2 py-4 border-b border-gray-200 dark:border-gray-800 mb-6">
            <div>
                <h1 class="text-3xl font-bold">{{ project.name }}</h1>
                <p class="text-gray-500 flex items-center gap-2 mt-1">
                    <UIcon name="i-lucide-building-2" class="w-4 h-4"/>
                    {{ project.clients?.name }}
                </p>
            </div>
            <UButton icon="i-lucide-megaphone" label="Post Update" @click="isUpdateModalOpen = true" />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 px-2">
            <!-- Details Column -->
            <div class="col-span-1 space-y-6">
                <UCard>
                    <template #header>
                        <h3 class="font-bold">Project Info</h3>
                    </template>
                    <div class="space-y-4 text-sm">
                        <div>
                            <span class="text-gray-500 block mb-1">Project ID</span>
                            <span class="font-mono bg-gray-100 dark:bg-gray-800 p-1 rounded">{{ project.id }}</span>
                        </div>
                        <div>
                            <span class="text-gray-500 block mb-1">Created At</span>
                            <span>{{ new Date(project.created_at).toLocaleString() }}</span>
                        </div>
                    </div>
                </UCard>
            </div>

            <!-- Updates Feed Column -->
            <div class="col-span-2">
                <h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
                    <UIcon name="i-lucide-activity" class="w-5 h-5 text-primary" />
                    Latest Updates
                </h2>

                <div v-if="updates.length === 0" class="text-center p-10 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                    <p class="text-gray-500">No updates posted yet.</p>
                </div>

                <ul v-else class="space-y-6">
                    <li v-for="update in updates" :key="update.id" class="relative group">
                        <UCard>
                            <div class="flex items-start gap-4">
                                <div class="flex-shrink-0 mt-1">
                                    <UIcon 
                                        :name="update.update_type === 'feature' ? 'i-lucide-sparkles' : update.update_type === 'deployment' ? 'i-lucide-rocket' : 'i-lucide-message-square'" 
                                        class="w-5 h-5"
                                        :class="update.update_type === 'feature' ? 'text-blue-500' : update.update_type === 'deployment' ? 'text-emerald-500' : 'text-gray-400'"
                                    />
                                </div>
                                <div class="flex-1">
                                    <div class="flex items-center justify-between gap-4">
                                        <h4 class="text-base font-semibold dark:text-gray-200">{{ update.title }}</h4>
                                        <UButton color="red" variant="ghost" size="xs" icon="i-lucide-trash" class="opacity-0 group-hover:opacity-100 transition-opacity" @click="deleteUpdate(update.id)" />
                                    </div>
                                    <span class="text-xs text-primary font-medium mt-0.5 block">{{ new Date(update.created_at).toLocaleString() }}</span>
                                    <p class="mt-3 text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">
                                        {{ update.description }}
                                    </p>
                                </div>
                            </div>
                        </UCard>
                    </li>
                </ul>
            </div>
        </div>
    </div>

    <!-- Create Update Modal -->
    <UModal v-model="isUpdateModalOpen">
      <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
              Post Project Update
            </h3>
            <UButton color="gray" variant="ghost" icon="i-lucide-x" class="-my-1" @click="isUpdateModalOpen = false" />
          </div>
        </template>

        <form @submit.prevent="postUpdate" class="space-y-4">
          <UFormGroup label="Title">
            <UInput v-model="updateForm.title" required placeholder="e.g. Deployed Staging Environment" />
          </UFormGroup>
          
          <UFormGroup label="Update Type">
            <USelect 
                v-model="updateForm.update_type"
                required
                :options="updateTypes"
            />
          </UFormGroup>

          <UFormGroup label="Description (Optional)">
            <UTextarea v-model="updateForm.description" :rows="4" placeholder="Add some context or patch notes..." />
          </UFormGroup>
          
          <div class="pt-4 flex justify-end gap-2">
            <UButton color="gray" variant="soft" @click="isUpdateModalOpen = false">Cancel</UButton>
            <UButton type="submit" :loading="isPosting">Post Update</UButton>
          </div>
        </form>
      </UCard>
    </UModal>
  </div>
</template>
