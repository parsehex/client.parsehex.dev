<script setup lang="ts">
  import type { Database } from '~/supabase/database.types';

  definePageMeta({
    layout: 'admin',
    middleware: 'admin'
  })

  const route = useRoute()
  const supabase = useSupabaseClient<Database>()
  const { errorHandler } = useErrorHandler()
  const id = route.params.id as string

  const prospect = ref<any>(null)
  const notes = ref<any[]>([])
  const links = ref<any[]>([])
  const stats = ref({ views: 0, unique: 0, recent: [] })
  const isLoading = ref(true)

  // Note Tree logic
  const noteTree = computed(() => {
    const map = new Map();
    const roots: any[] = [];
    notes.value.forEach(n => map.set(n.id, { ...n, children: [] }));
    notes.value.forEach(n => {
      if (n.parent_id && map.has(n.parent_id)) {
        map.get(n.parent_id).children.push(map.get(n.id));
      } else {
        roots.push(map.get(n.id));
      }
    });
    return roots;
  })

  const fetchData = async () => {
    isLoading.value = true
    try {
      const [pRes, nRes, lRes, sRes] = await Promise.all([
        supabase.from('clients').select('*').eq('id', id).single(),
        supabase.from('prospect_notes').select('*').eq('client_id', id).order('created_at', { ascending: true }),
        supabase.from('prospect_links').select('*').eq('client_id', id).order('sort_order', { ascending: true }),
        supabase.from('pitch_views').select('*').eq('client_id', id).order('viewed_at', { ascending: false })
      ])

      if (pRes.error) throw pRes.error
      prospect.value = pRes.data
      notes.value = nRes.data || []
      links.value = lRes.data || []

      // Calculate basic stats
      const views = sRes.data || []
      stats.value = {
        views: views.length,
        unique: new Set(views.map(v => v.ip_hash)).size,
        recent: views.slice(0, 5)
      }
    } catch (e) {
      errorHandler(e)
    } finally {
      isLoading.value = false
    }
  }

  // Note Actions
  const newNote = ref('')
  const isAddingNote = ref(false)
  const replyingTo = ref<string | null>(null)

  const addNote = async (parentId: string | null = null) => {
    if (!newNote.value.trim()) return
    isAddingNote.value = true
    try {
      const { error } = await supabase.from('prospect_notes').insert({
        client_id: id,
        parent_id: parentId,
        content: newNote.value,
        tag: 'thought'
      })
      if (error) throw error
      newNote.value = ''
      replyingTo.value = null
      await fetchData()
    } catch (e) {
      errorHandler(e)
    } finally {
      isAddingNote.value = false
    }
  }

  const toggleShareable = async (note: any) => {
    try {
      const { error } = await supabase.from('prospect_notes').update({
        is_shareable: !note.is_shareable
      }).eq('id', note.id)
      if (error) throw error
      await fetchData()
    } catch (e) {
      errorHandler(e)
    }
  }

  // Public Content Edit
  const isPublicEditOpen = ref(false)
  const editingNote = ref<any>(null)
  const publicContentBuffer = ref('')

  const openPublicEdit = (note: any) => {
    editingNote.value = note
    publicContentBuffer.value = note.public_content || note.content
    isPublicEditOpen.value = true
  }

  const savePublicContent = async () => {
    try {
      const { error } = await supabase.from('prospect_notes').update({
        public_content: publicContentBuffer.value
      }).eq('id', editingNote.value.id)
      if (error) throw error
      isPublicEditOpen.value = false
      await fetchData()
    } catch (e) {
      errorHandler(e)
    }
  }

  // Link Actions
  const isAddLinkOpen = ref(false)
  const linkForm = reactive({ url: '', label: '', description: '' })

  const addLink = async () => {
    try {
      const { error } = await supabase.from('prospect_links').insert({
        client_id: id,
        ...linkForm
      })
      if (error) throw error
      isAddLinkOpen.value = false
      Object.assign(linkForm, { url: '', label: '', description: '' })
      await fetchData()
    } catch (e) {
      errorHandler(e)
    }
  }

  // Conversion
  const isConverting = ref(false)
  const convertToActive = async () => {
    if (!confirm('Convert this prospect to an active client? The pitch link will be revoked.')) return
    isConverting.value = true
    try {
      const { error } = await supabase.from('clients').update({
        is_speculative: false,
        converted_at: new Date().toISOString(),
        share_token: null
      }).eq('id', id)
      if (error) throw error
      navigateTo('/admin/clients')
    } catch (e) {
      errorHandler(e)
    } finally {
      isConverting.value = false
    }
  }

  const deleteNote = async (id: string) => {
    if (!confirm('Delete this note permanently?')) return
    try {
      const { error } = await supabase.from('prospect_notes').delete().eq('id', id)
      if (error) throw error
      await fetchData()
    } catch (e) {
      errorHandler(e)
    }
  }

  const deleteLink = async (id: string) => {
    if (!confirm('Delete this link?')) return
    try {
      const { error } = await supabase.from('prospect_links').delete().eq('id', id)
      if (error) throw error
      await fetchData()
    } catch (e) {
      errorHandler(e)
    }
  }

  onMounted(() => fetchData())

  // Copy Pitch Link
  const copyLink = () => {
    const url = `${window.location.origin}/pitch/${prospect.value.share_token}`
    navigator.clipboard.writeText(url)
    // Would add a toast here if available
  }
</script>

<template>
  <div v-if="prospect" class="h-full flex flex-col pt-5 space-y-6">
    <!-- Header -->
    <div class="flex items-start justify-between px-2">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <UBadge color="primary" variant="subtle">PROSPECT</UBadge>
          <h1 class="text-2xl font-bold">{{ prospect.name }}</h1>
        </div>
        <p class="text-gray-500 text-sm">Created {{ new Date(prospect.created_at).toLocaleDateString() }} • Source: {{ prospect.source || 'Unknown' }}</p>
      </div>

      <div class="flex items-center gap-2">
        <UButton icon="i-lucide-share-2" color="gray" variant="soft" label="Copy Pitch Link" @click="copyLink" />
        <UButton icon="i-lucide-user-check" color="green" label="Convert to Client" :loading="isConverting" @click="convertToActive" />
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0 overflow-hidden">
      <!-- Main Workspace: Threaded Notes -->
      <div class="lg:col-span-2 flex flex-col min-h-0 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800">
        <div class="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h2 class="font-semibold flex items-center gap-2">
            <UIcon name="i-lucide-message-square" />
            Thinking Space
          </h2>
          <span class="text-xs text-gray-500">{{ notes.length }} notes total</span>
        </div>

        <div class="flex-1 overflow-y-auto p-4 space-y-4">
          <!-- Recursive Note Helper (using a component-less recursive function for speed in this one-shot) -->
          <div v-if="notes.length === 0" class="text-center py-20 opacity-50">
            <UIcon name="i-lucide-brain" class="w-12 h-12 mx-auto mb-2" />
            <p>Start iterating on your vision here.</p>
          </div>

          <div v-else class="space-y-4">
              <!-- Root notes -->
              <div v-for="note in noteTree" :key="note.id" class="space-y-3">
                <ProspectNoteItem
                    :note="note"
                    @reply="id => replyingTo = id"
                    @toggle-share="toggleShareable"
                    @edit-public="openPublicEdit"
                  @delete="deleteNote"
                />

                <!-- Simple recursion for 1-level for now, or use a component -->
                <div v-if="note.children.length > 0" class="ml-8 border-l-2 border-gray-200 dark:border-gray-800 pl-4 space-y-3">
                    <ProspectNoteItem
                        v-for="child in note.children"
                        :key="child.id"
                        :note="child"
                        @reply="id => replyingTo = id"
                        @toggle-share="toggleShareable"
                        @edit-public="openPublicEdit"
                      @delete="deleteNote"
                    />
                </div>
              </div>
          </div>
        </div>

        <!-- Add Note Input -->
        <div class="p-4 bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800">
          <div v-if="replyingTo" class="mb-2 flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded text-xs text-blue-600">
            <span>Replying to note...</span>
            <UButton size="2xs" color="blue" variant="ghost" icon="i-lucide-x" @click="replyingTo = null" />
          </div>
          <div class="flex items-center gap-2">
            <UInput v-model="newNote" placeholder="Write a note, idea, or finding..." class="flex-1" @keyup.enter="addNote(replyingTo)" />
            <UButton icon="i-lucide-send" :loading="isAddingNote" @click="addNote(replyingTo)" />
          </div>
        </div>
      </div>

      <!-- Sidebar: Info, Links, Stats -->
      <div class="space-y-6 overflow-y-auto pr-2">
        <!-- Prospect Details -->
        <UCard :ui="{ body: { padding: 'p-4' } }">
          <h3 class="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4">Prospect Info</h3>
          <div class="space-y-3 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-500">Contact</span>
              <span class="font-medium">{{ prospect.contact_name || '—' }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Email</span>
              <span class="font-medium">{{ prospect.contact_email || '—' }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Value</span>
              <span class="font-medium text-green-600">{{ prospect.deal_value || '—' }}</span>
            </div>
            <div v-if="prospect.website" class="flex justify-between">
                <span class="text-gray-500">Website</span>
                <a :href="prospect.website" target="_blank" class="text-primary hover:underline truncate max-w-[120px]">{{ prospect.website }}</a>
            </div>
          </div>
        </UCard>

        <!-- Shared Resources -->
        <UCard :ui="{ body: { padding: 'p-4' } }">
          <template #header>
            <div class="flex items-center justify-between">
               <h3 class="text-sm font-semibold uppercase tracking-wider text-gray-500">Shared Resources</h3>
               <UButton size="2xs" icon="i-lucide-plus" variant="ghost" @click="isAddLinkOpen = true" />
            </div>
          </template>

          <div v-if="links.length === 0" class="text-center py-4 opacity-50 text-xs">
            No public links added yet.
          </div>
          <div v-else class="space-y-3">
            <div v-for="link in links" :key="link.id" class="flex items-center justify-between group">
              <div>
                <p class="text-sm font-medium">{{ link.label || link.url }}</p>
                <p v-if="link.description" class="text-[10px] text-gray-500">{{ link.description }}</p>
              </div>
              <div class="flex items-center gap-1">
                <UButton v-if="link.is_public" size="2xs" icon="i-lucide-eye" color="green" variant="ghost" class="opacity-0 group-hover:opacity-100" />
                <UButton size="2xs" icon="i-lucide-trash" color="red" variant="ghost" class="opacity-0 group-hover:opacity-100" @click="deleteLink(link.id)" />
              </div>
            </div>
          </div>
        </UCard>

        <!-- Tracking Analytics -->
        <UCard :ui="{ body: { padding: 'p-4' } }">
          <h3 class="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4">Pitch Activity</h3>
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div class="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center">
              <p class="text-2xl font-bold">{{ stats.views }}</p>
              <p class="text-[10px] uppercase text-gray-500">Total Views</p>
            </div>
            <div class="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center">
              <p class="text-2xl font-bold">{{ stats.unique }}</p>
              <p class="text-[10px] uppercase text-gray-500">Unique Viewers</p>
            </div>
          </div>

          <div v-if="stats.recent.length > 0" class="space-y-2">
            <p class="text-[10px] font-semibold text-gray-400 uppercase">Recent Views</p>
            <div v-for="view in stats.recent" :key="view.id" class="text-[10px] flex justify-between py-1 border-b border-gray-100 dark:border-gray-800 last:border-0">
               <span class="text-gray-500">{{ new Date(view.viewed_at).toLocaleString() }}</span>
               <span class="truncate max-w-[80px]">{{ view.user_agent }}</span>
            </div>
          </div>
        </UCard>
      </div>
    </div>

    <!-- Modals -->
    <UModal v-model="isPublicEditOpen">
      <UCard>
        <template #header>
            <div class="flex items-center justify-between">
                <h3 class="font-bold">Public Content Override</h3>
                <UBadge color="primary" variant="soft">Curated View</UBadge>
            </div>
        </template>
        <p class="text-sm text-gray-500 mb-4">This version will be shown to the prospect on their pitch page. Leave as-is to use your raw note.</p>
        <UTextarea v-model="publicContentBuffer" :rows="6" placeholder="Write a polished version for the prospect..." />
        <template #footer>
            <div class="flex justify-end gap-2">
                <UButton variant="soft" color="gray" @click="isPublicEditOpen = false">Cancel</UButton>
                <UButton label="Save Changes" @click="savePublicContent" />
            </div>
        </template>
      </UCard>
    </UModal>

    <UModal v-model="isAddLinkOpen">
        <UCard>
            <template #header><h3 class="font-bold">Add Shared Resource</h3></template>
            <div class="space-y-4">
                <UFormGroup label="URL"><UInput v-model="linkForm.url" placeholder="https://..." /></UFormGroup>
                <UFormGroup label="Label"><UInput v-model="linkForm.label" placeholder="e.g. Project Scope Document" /></UFormGroup>
                <UFormGroup label="Description"><UInput v-model="linkForm.description" placeholder="Short blurb about why this is here..." /></UFormGroup>
            </div>
            <template #footer>
                <div class="flex justify-end gap-2">
                    <UButton variant="soft" color="gray" @click="isAddLinkOpen = false">Cancel</UButton>
                    <UButton label="Add Link" @click="addLink" />
                </div>
            </template>
        </UCard>
    </UModal>
  </div>

  <div v-else-if="isLoading" class="h-full flex items-center justify-center">
    <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-gray-500" />
  </div>
</template>

<style scoped>
/* Scoped styles for note nesting lines if needed */
</style>
