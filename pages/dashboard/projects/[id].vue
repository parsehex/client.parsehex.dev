<script setup lang="ts">
  import type { Database } from '~/supabase/database.types';
  import { BaseError } from '~/composables/use-error-handler';

  const route = useRoute()
  const projectId = route.params.id as string

  useSeoMeta({
    title: 'Project Details - parsehex Client Portal'
  })

  const supabase = useSupabaseClient<Database>()
  const { errorHandler } = useErrorHandler()

  const user = useSupabaseUser()
  const project = ref<any>(null)
  const updates = ref<any[]>([])
  const isLoading = ref(true)

  const feedbackForm = reactive({
    activeUpdateId: null as string | null,
    actionType: null as 'approved' | 'rejected' | 'follow_up' | null,
    comment: '',
    isSubmitting: false
  })

  // Computed for sidebar action items
  const actionItems = computed(() => {
    // Show items that are pending action from the client
    return updates.value.filter(u => u.requires_approval && u.status === 'pending')
  })

  const fetchProjectDetails = async () => {
    isLoading.value = true

    // Fetch project
    const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

    if (projectError) {
        errorHandler(new BaseError(projectError.code, projectError.message))
        return
    }

    project.value = projectData

    // Fetch updates with comments
    const { data: updatesData } = await supabase
        .from('project_updates')
        .select(`
            *,
            comments:update_comments(
                *,
                author:users(full_name)
            )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

    if (updatesData) {
        // Sort comments by date
        updates.value = updatesData.map(u => ({
            ...u,
            comments: (u.comments || []).sort((a: any, b: any) => 
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )
        }))
    }

    isLoading.value = false
  }

  const toggleFeedbackForm = (updateId: string, type: 'approved' | 'rejected' | 'follow_up') => {
    if (feedbackForm.activeUpdateId === updateId && feedbackForm.actionType === type) {
      feedbackForm.activeUpdateId = null
      feedbackForm.actionType = null
      feedbackForm.comment = ''
    } else {
      feedbackForm.activeUpdateId = updateId
      feedbackForm.actionType = type
      feedbackForm.comment = ''
    }
  }

  const submitAction = async () => {
    if (!feedbackForm.activeUpdateId || !feedbackForm.actionType || !user.value?.id) return

    try {
        feedbackForm.isSubmitting = true
        
        // 1. Update status and official feedback
        const updateData: any = {
            status: feedbackForm.actionType,
            client_feedback: feedbackForm.comment
        }

        if (feedbackForm.actionType === 'approved') {
            updateData.approved_at = new Date().toISOString()
            updateData.approved_by = user.value.id
        }

        const { error: updateError } = await supabase
            .from('project_updates')
            .update(updateData)
            .eq('id', feedbackForm.activeUpdateId)

        if (updateError) throw updateError

        // 2. Clear and refresh
        feedbackForm.comment = ''
        feedbackForm.activeUpdateId = null
        feedbackForm.actionType = null
        await fetchProjectDetails()
    } catch (e: any) {
        errorHandler(new BaseError(e.code, e.message))
    } finally {
        feedbackForm.isSubmitting = false
    }
  }

  const postComment = async (updateId: string) => {
    if (!feedbackForm.comment.trim() || !user.value?.id) return

    try {
        feedbackForm.isSubmitting = true
        const { error: commentError } = await supabase
            .from('update_comments')
            .insert({
                update_id: updateId,
                author_id: user.value.id as string,
                content: feedbackForm.comment
            })
        
        if (commentError) throw commentError
        
        feedbackForm.comment = ''
        feedbackForm.activeUpdateId = null
        await fetchProjectDetails()
    } catch (e: any) {
        errorHandler(new BaseError(e.code, e.message))
    } finally {
        feedbackForm.isSubmitting = false
    }
  }

  onMounted(() => {
    fetchProjectDetails()
  })
</script>

<template>
  <div class="w-full mx-auto my-10 max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col h-full">

    <div class="mb-4">
        <UButton variant="ghost" color="gray" icon="i-lucide-arrow-left" to="/dashboard/projects" size="sm">Back to Projects</UButton>
    </div>

    <div v-if="isLoading" class="flex justify-center p-10">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-gray-500" />
    </div>

    <div v-else-if="project" class="flex-1">

        <div class="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-800 mb-6">
            <div>
                <h1 class="text-3xl font-bold">{{ project.name }}</h1>
            </div>
            <UBadge color="gray" variant="soft">ID: {{ project.id.split('-')[0] }}</UBadge>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Updates Feed Column -->
            <div class="lg:col-span-2">
                <h2 class="text-xl font-semibold mb-6 flex items-center gap-2">
                    <UIcon name="i-lucide-activity" class="w-5 h-5 text-primary" />
                    Project Updates
                </h2>

                <div v-if="updates.length === 0" class="text-center p-10 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                    <p class="text-gray-500">No updates have been posted for this project yet.</p>
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
                                    <div class="flex items-center gap-2">
                                        <h4 class="text-base font-semibold dark:text-gray-200">{{ update.title }}</h4>
                                        <UBadge v-if="update.requires_approval" :color="update.status === 'pending' ? 'orange' : update.status === 'approved' ? 'emerald' : update.status === 'rejected' ? 'red' : 'blue'" variant="soft" size="xs">
                                            {{ update.status?.toUpperCase()?.replace('_', ' ') }}
                                        </UBadge>
                                        <UIcon v-if="update.is_blocker" name="i-lucide-octagon-alert" class="w-4 h-4 text-red-500" />
                                    </div>
                                    <span class="text-xs text-primary font-medium mt-0.5 block">{{ update.created_at ? new Date(update.created_at).toLocaleString() : 'Unknown Date' }}</span>

                                    <!-- Official Record Box (The status note) -->
                                    <div v-if="update.client_feedback" class="mt-3 p-3 rounded-lg border text-sm" :class="update.status === 'rejected' ? 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900 text-red-700 dark:text-red-400' : update.status === 'approved' ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400' : 'bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900 text-blue-700 dark:text-blue-400'">
                                        <div class="flex items-center gap-2 mb-1">
                                            <UIcon :name="update.status === 'approved' ? 'i-lucide-check-circle' : update.status === 'rejected' ? 'i-lucide-x-circle' : 'i-lucide-help-circle'" class="w-4 h-4" />
                                            <span class="font-bold uppercase tracking-wider text-[10px]">Official {{ update.status === 'pending' ? 'Feedback' : update.status }} note</span>
                                        </div>
                                        <p>{{ update.client_feedback }}</p>
                                    </div>

                                    <p class="mt-3 text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line border-b border-gray-100 dark:border-gray-800 pb-4">
                                        {{ update.description }}
                                    </p>

                                    <!-- Conversation Thread (The discussion around the update) -->
                                    <div class="mt-4 space-y-4">
                                        
                                        <!-- Message history -->
                                        <div v-if="update.comments && update.comments.length > 0" class="space-y-3">
                                            <div v-for="comment in update.comments" :key="comment.id" class="flex gap-3 text-xs">
                                                <div class="flex-1 bg-gray-50 dark:bg-gray-900/50 p-2 rounded border border-gray-100 dark:border-gray-800">
                                                    <div class="flex items-center justify-between mb-1">
                                                        <span class="font-bold text-gray-700 dark:text-gray-300">{{ comment.author?.full_name || 'System' }}</span>
                                                        <span class="text-[10px] text-gray-400">{{ new Date(comment.created_at).toLocaleString() }}</span>
                                                    </div>
                                                    <p class="dark:text-gray-400 whitespace-pre-wrap">{{ comment.content }}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Approval Actions (Only when pending) -->
                                        <div v-if="update.requires_approval && update.status === 'pending'" class="pt-2">
                                            <div class="flex gap-2 mb-3">
                                                <UButton
                                                    size="xs"
                                                    :color="feedbackForm.activeUpdateId === update.id && feedbackForm.actionType === 'approved' ? 'emerald' : 'gray'"
                                                    :variant="feedbackForm.activeUpdateId === update.id && feedbackForm.actionType === 'approved' ? 'solid' : 'soft'"
                                                    icon="i-lucide-check"
                                                    @click="toggleFeedbackForm(update.id, 'approved')"
                                                >
                                                    Approve
                                                </UButton>
                                                <UButton
                                                    size="xs"
                                                    :color="feedbackForm.activeUpdateId === update.id && feedbackForm.actionType === 'follow_up' ? 'blue' : 'gray'"
                                                    :variant="feedbackForm.activeUpdateId === update.id && feedbackForm.actionType === 'follow_up' ? 'solid' : 'soft'"
                                                    icon="i-lucide-help-circle"
                                                    @click="toggleFeedbackForm(update.id, 'follow_up')"
                                                >
                                                    Need Info
                                                </UButton>
                                                <UButton
                                                    size="xs"
                                                    :color="feedbackForm.activeUpdateId === update.id && feedbackForm.actionType === 'rejected' ? 'gray' : 'gray'"
                                                    :variant="feedbackForm.activeUpdateId === update.id && feedbackForm.actionType === 'rejected' ? 'solid' : 'soft'"
                                                    icon="i-lucide-x"
                                                    @click="toggleFeedbackForm(update.id, 'rejected')"
                                                >
                                                    Reject
                                                </UButton>
                                            </div>

                                            <!-- Inline Feedback Form -->
                                            <div v-if="feedbackForm.activeUpdateId === update.id" class="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-800 space-y-3 shadow-inner">
                                                <UFormGroup :label="feedbackForm.actionType === 'approved' ? 'Approval Note (Optional)' : feedbackForm.actionType === 'follow_up' ? 'What do you need clarified?' : 'Rejection Reason'">
                                                    <UTextarea
                                                        v-model="feedbackForm.comment"
                                                        :placeholder="feedbackForm.actionType === 'approved' ? 'e.g. Looks great, proceed!' : 'e.g. Which colors were used here?'"
                                                        :rows="3"
                                                        autofocus
                                                    />
                                                </UFormGroup>
                                                <div class="flex justify-end gap-2">
                                                    <UButton size="xs" color="gray" variant="ghost" @click="feedbackForm.activeUpdateId = null">Cancel</UButton>
                                                    <UButton
                                                        size="sm"
                                                        :color="feedbackForm.activeUpdateId === update.id && feedbackForm.actionType === 'approved' ? 'emerald' : feedbackForm.actionType === 'follow_up' ? 'blue' : 'gray'"
                                                        :loading="feedbackForm.isSubmitting"
                                                        :disabled="(feedbackForm.actionType === 'rejected' || feedbackForm.actionType === 'follow_up') && !feedbackForm.comment"
                                                        @click="submitAction"
                                                    >
                                                        Send
                                                    </UButton>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- General Reply (When not pending but requires approval) -->
                                        <div v-else-if="update.requires_approval" class="pt-2">
                                            <div class="flex gap-2">
                                                <UInput 
                                                    v-model="feedbackForm.comment" 
                                                    placeholder="Write a reply..." 
                                                    size="xs" 
                                                    class="flex-1"
                                                    @keyup.enter="postComment(update.id)"
                                                />
                                                <UButton 
                                                    size="xs" 
                                                    color="primary" 
                                                    icon="i-lucide-send" 
                                                    :loading="feedbackForm.isSubmitting" 
                                                    @click="postComment(update.id)"
                                                >
                                                    Reply
                                                </UButton>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </UCard>
                    </li>
                </ul>
            </div>

            <!-- Sidebar / Action Items Placeholder -->
            <div class="lg:col-span-1 space-y-6">
                <!-- Action Items Placeholder -->
                <UCard class="w-full">
                    <template #header>
                        <h2 class="text-lg font-semibold flex items-center gap-2">
                            <UIcon name="i-lucide-list-todo" class="w-5 h-5 text-emerald-500" />
                            Action Items
                        </h2>
                    </template>
                    <div class="flex flex-col gap-3 p-1">
                        <div v-if="actionItems.length === 0" class="flex flex-col items-center justify-center p-4 text-center">
                            <p class="text-sm text-gray-500 italic mb-2">No pending action items for this project.</p>
                            <p class="text-xs text-gray-400">(All caught up!)</p>
                        </div>
                        <div v-else v-for="item in actionItems" :key="item.id" class="p-3 border rounded-lg bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800 flex items-start gap-3">
                            <UIcon :name="item.is_blocker ? 'i-lucide-octagon-alert' : 'i-lucide-clipboard-check'" class="w-5 h-5 flex-shrink-0" :class="item.is_blocker ? 'text-red-500' : 'text-orange-500'" />
                            <div class="flex-1 overflow-hidden">
                                <p class="text-sm font-bold truncate">{{ item.title }}</p>
                                <p v-if="item.is_blocker" class="text-[10px] text-red-500 font-bold uppercase tracking-wider">Required Blocker</p>
                                <div class="mt-2 flex items-center gap-1">
                                    <UButton size="2xs" color="emerald" @click="toggleFeedbackForm(item.id, 'approved')">Approve</UButton>
                                    <UButton size="2xs" color="blue" variant="soft" @click="toggleFeedbackForm(item.id, 'follow_up')">Info</UButton>
                                    <UButton size="2xs" color="gray" variant="ghost" @click="toggleFeedbackForm(item.id, 'rejected')">Reject</UButton>
                                </div>
                            </div>
                        </div>
                    </div>
                </UCard>

                <!-- Documents / Files Placeholder (Hidden for now) -->
                <UCard class="w-full hidden">
                    <template #header>
                        <div class="flex items-center justify-between">
                            <h2 class="text-lg font-semibold flex items-center gap-2">
                                <UIcon name="i-lucide-file-text" class="w-5 h-5 text-primary" />
                                Recent Files
                            </h2>
                            <UButton size="2xs" variant="ghost" color="gray" to="/dashboard/files">View All</UButton>
                        </div>
                    </template>
                    <div class="flex flex-col items-center justify-center p-2 text-center">
                        <p class="text-sm text-gray-500 italic">No files attached to this project.</p>
                    </div>
                </UCard>
            </div>
        </div>
    </div>
  </div>
</template>
