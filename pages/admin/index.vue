<script setup lang="ts">
  import type { Database } from '~/supabase/database.types';
  import { BaseError } from '~/composables/use-error-handler';

  definePageMeta({
    layout: 'admin',
    middleware: 'admin'
  })

  useSeoMeta({
    title: 'Admin Dashboard - parsehex Client Portal',
  })

  const supabase = useSupabaseClient<Database>()
  const { errorHandler } = useErrorHandler()

  interface InquiryItem {
    id: string
    name: string
    email: string
    company: string | null
    website: string | null
    message: string
    source_path: string | null
    status: 'new' | 'reviewed' | 'archived'
    created_at: string
  }

  const pendingApprovals = ref<any[]>([])
  const needsAttention = ref<any[]>([])
  const recentActivity = ref<any[]>([])
  const inquiries = ref<InquiryItem[]>([])
  const inquiryUpdating = ref<string | null>(null)
  const isLoading = ref(true)

  const fetchData = async () => {
    try {
      isLoading.value = true
      
      // 1. Fetch all pending client approvals
      const { data: pendingData, error: pendingError } = await supabase
        .from('project_updates')
        .select('*, projects(name, clients(name))')
        .eq('requires_approval', true)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (pendingError) throw pendingError
      pendingApprovals.value = pendingData || []

      // 2. Fetch updates that need attention (Follow-ups)
      const { data: attentionData, error: attentionError } = await supabase
        .from('project_updates')
        .select('*, projects(name, clients(name)), comments:update_comments(content, action_type, created_at)')
        .eq('status', 'follow_up')
        .order('created_at', { ascending: false })

      if (attentionError) throw attentionError
      needsAttention.value = attentionData || []

      // 3. Fetch recent client activity (Approved/Rejected)
      const { data: activityData, error: activityError } = await supabase
        .from('project_updates')
        .select(`
          *,
          projects(name, clients(name)),
          approved_by_user:users!project_updates_approved_by_fkey(full_name),
          comments:update_comments(content, action_type, created_at)
        `)
        .eq('requires_approval', true)
        .neq('status', 'pending')
        .order('approved_at', { ascending: false })
        .limit(10)

      if (activityError) throw activityError
      recentActivity.value = activityData || []

    // 4. Fetch newest public inquiries for quick review
    const inquiryResponse = await $fetch<{ inquiries: InquiryItem[] }>('/api/admin/inquiries?status=new&limit=20')
    inquiries.value = inquiryResponse.inquiries || []

    } catch (e: any) {
        errorHandler(new BaseError(e.code, e.message))
    } finally {
        isLoading.value = false
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'emerald'
      case 'rejected': return 'red'
      case 'follow_up': return 'blue'
      case 'expired': return 'gray'
      case 'pending': return 'orange'
      default: return 'primary'
    }
  }

  const latestActionContent = (item: any) => {
    if (item.comments && item.comments.length > 0) {
      const actionComments = item.comments.filter((c: any) => c.action_type)
      if (actionComments.length > 0) {
        actionComments.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        return actionComments[0].content
      }
    }
    return item.client_feedback
  }

  const markInquiryReviewed = async (inquiryId: string) => {
    if (inquiryUpdating.value) {
      return
    }

    inquiryUpdating.value = inquiryId
    try {
      await $fetch(`/api/admin/inquiries/${inquiryId}`, {
        method: 'PATCH',
        body: {
          status: 'reviewed',
        },
      })

      inquiries.value = inquiries.value.filter((item) => item.id !== inquiryId)
    } catch (e: any) {
      errorHandler(new BaseError(e?.statusCode || 500, e?.statusMessage || e?.message || 'Unable to update inquiry'))
    } finally {
      inquiryUpdating.value = null
    }
  }



  onMounted(() => {
    fetchData()
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

    <!-- Live Activity Sections -->
    <div v-if="!isLoading" class="mt-8 space-y-8">

      <!-- Public Inquiries -->
      <section v-if="inquiries.length > 0" class="space-y-4">
        <h2 class="text-xl font-bold flex items-center gap-2">
          <UIcon name="i-lucide-inbox" class="w-5 h-5 text-emerald-500" />
          New Inquiries
          <UBadge color="emerald" variant="solid" size="xs" class="ml-2">{{ inquiries.length }}</UBadge>
        </h2>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <UCard
            v-for="inquiry in inquiries"
            :key="inquiry.id"
            class="border-emerald-100 dark:border-emerald-900"
            :ui="{ body: { padding: 'p-4' } }"
          >
            <div class="space-y-3">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-sm font-bold text-gray-900 dark:text-white">{{ inquiry.name }}</p>
                  <p class="text-xs text-gray-500">{{ inquiry.email }}</p>
                </div>
                <p class="text-[11px] text-gray-400">{{ new Date(inquiry.created_at).toLocaleString() }}</p>
              </div>

              <div class="text-xs text-gray-500 space-y-1">
                <p v-if="inquiry.company">Company: {{ inquiry.company }}</p>
                <p v-if="inquiry.website">Website: {{ inquiry.website }}</p>
                <p v-if="inquiry.source_path">Source: {{ inquiry.source_path }}</p>
              </div>

              <p class="text-sm leading-relaxed text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{{ inquiry.message }}</p>

              <div class="flex items-center justify-between gap-2">
                <UButton
                  size="xs"
                  color="gray"
                  variant="soft"
                  icon="i-lucide-mail"
                  :to="`mailto:${inquiry.email}`"
                >
                  Reply
                </UButton>

                <UButton
                  size="xs"
                  color="emerald"
                  icon="i-lucide-check"
                  :loading="inquiryUpdating === inquiry.id"
                  :disabled="inquiryUpdating === inquiry.id"
                  @click="markInquiryReviewed(inquiry.id)"
                >
                  Mark reviewed
                </UButton>
              </div>
            </div>
          </UCard>
        </div>
      </section>

      <!-- 0. Needs Attention (Follow-ups) -->
      <section v-if="needsAttention.length > 0" class="space-y-4">
        <h2 class="text-xl font-bold flex items-center gap-2">
          <UIcon name="i-lucide-message-square-more" class="w-5 h-5 text-blue-500" />
          Needs Attention
          <UBadge color="blue" variant="solid" size="xs" class="ml-2">{{ needsAttention.length }}</UBadge>
        </h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <UCard v-for="item in needsAttention" :key="item.id" class="border-blue-100 dark:border-blue-950 bg-blue-50/30 dark:bg-blue-900/10" :ui="{ body: { padding: 'p-4' } }">
            <div class="flex items-start gap-4">
              <UIcon name="i-lucide-help-circle" class="w-5 h-5 flex-shrink-0 text-blue-500" />
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-[10px] font-bold uppercase tracking-wider text-gray-500">{{ item.projects?.clients?.name }}</span>
                  <UBadge color="blue" variant="subtle" size="xs">QUESTION</UBadge>
                </div>
                <p class="text-sm font-bold text-gray-900 dark:text-white truncate">{{ item.title }}</p>
                <div v-if="latestActionContent(item)" class="mt-2 text-[11px] p-2 bg-blue-100/50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800 line-clamp-2">
                  "{{ latestActionContent(item) }}"
                </div>
                <p v-else class="text-xs text-gray-500 mt-1 italic">Waiting for your response...</p>
                <div class="mt-3">
                  <UButton size="xs" color="blue" variant="soft" icon="i-lucide-reply" :to="`/admin/projects/${item.project_id}`" block>
                    Respond
                  </UButton>
                </div>
              </div>
            </div>
          </UCard>
        </div>
      </section>

      <!-- 1. Pending Approvals -->
      <section v-if="pendingApprovals.length > 0" class="space-y-4">
        <h2 class="text-xl font-bold flex items-center gap-2">
          <UIcon name="i-lucide-clock" class="w-5 h-5 text-orange-500" />
          Pending Client Sign-offs
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <UCard v-for="item in pendingApprovals" :key="item.id" class="border-orange-100 dark:border-orange-950" :ui="{ body: { padding: 'p-4' } }">
            <div class="flex items-start gap-3">
              <UIcon :name="item.is_blocker ? 'i-lucide-octagon-alert' : 'i-lucide-clipboard-check'" class="w-5 h-5 flex-shrink-0" :class="item.is_blocker ? 'text-red-500' : 'text-orange-500'" />
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-[10px] font-bold uppercase tracking-wider text-gray-500">{{ item.projects?.clients?.name }}</span>
                  <UBadge v-if="item.is_blocker" color="red" variant="subtle" size="xs">BLOCKER</UBadge>
                </div>
                <p class="text-sm font-bold text-gray-900 dark:text-white truncate">{{ item.title }}</p>
                <p class="text-xs text-gray-400 mt-1">Requested {{ new Date(item.created_at).toLocaleString() }}</p>
                <div class="mt-3">
                  <UButton size="xs" color="gray" variant="ghost" icon="i-lucide-arrow-right" :to="`/admin/projects/${item.project_id}`" block>
                    View Project
                  </UButton>
                </div>
              </div>
            </div>
          </UCard>
        </div>
      </section>

      <!-- 2. Recent Activity -->
      <section class="space-y-4">
        <h2 class="text-xl font-bold flex items-center gap-2">
          <UIcon name="i-lucide-activity" class="w-5 h-5 text-primary" />
          Recent Activity
        </h2>

        <UCard v-if="recentActivity.length === 0" class="border border-dashed text-center p-8">
          <p class="text-gray-500 italic">No recent client activity found.</p>
        </UCard>

        <ul v-else class="space-y-3">
          <li v-for="activity in recentActivity" :key="activity.id">
            <UCard class="hover:border-primary-500/50 transition-colors">
              <div class="flex items-center justify-between gap-4">
                <div class="flex items-center gap-4 flex-1">
                  <UIcon
                    :name="activity.status === 'approved' ? 'i-lucide-check-circle' : activity.status === 'rejected' ? 'i-lucide-x-circle' : 'i-lucide-help-circle'"
                    class="w-6 h-6"
                    :class="activity.status === 'approved' ? 'text-emerald-500' : activity.status === 'rejected' ? 'text-red-500' : 'text-blue-500'"
                  />
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium">
                      <span class="font-bold">{{ activity.approved_by_user?.full_name || 'System' }}</span>
                      <span class="text-gray-500"> {{ activity.status }} </span>
                      <span class="font-bold">"{{ activity.title }}"</span>
                    </p>
                    <p class="text-xs text-gray-400">
                      {{ activity.projects?.clients?.name }} • {{ activity.projects?.name }}
                    </p>
                    <p v-if="latestActionContent(activity)" class="mt-2 text-xs p-2 rounded" :class="activity.status === 'rejected' ? 'text-red-500 bg-red-50 dark:bg-red-950' : activity.status === 'approved' ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950' : 'text-blue-500 bg-blue-50 dark:bg-blue-950'">
                      "{{ latestActionContent(activity) }}"
                    </p>
                  </div>
                </div>
                <div class="text-right flex-shrink-0">
                  <p class="text-xs text-gray-500">{{ new Date(activity.approved_at || activity.created_at).toLocaleString() }}</p>
                  <UButton size="xs" variant="link" color="gray" :to="`/admin/projects/${activity.project_id}`">view project</UButton>
                </div>
              </div>
            </UCard>
          </li>
        </ul>
      </section>

    </div>
  </div>
</template>
