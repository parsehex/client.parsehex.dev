<script setup lang="ts">
  const props = defineProps<{
    note: any
  }>()

  const emit = defineEmits(['reply', 'toggle-share', 'edit-public', 'delete'])

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString([], { hour: '2-digit', minute: '2-digit' })
  }
</script>

<template>
  <div class="group relative bg-white dark:bg-gray-950 p-4 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm transition-all hover:shadow-md">
    <!-- Tag & Timestamp -->
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-2">
        <UBadge v-if="note.tag" color="gray" variant="soft" size="xs" class="uppercase text-[9px]">{{ note.tag }}</UBadge>
        <span class="text-[10px] text-gray-400 font-medium">{{ formatDate(note.created_at) }}</span>
      </div>

      <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <UButton size="2xs" icon="i-lucide-reply" variant="ghost" color="gray" @click="emit('reply', note.id)" />
        <UButton
            size="2xs"
            :icon="note.is_shareable ? 'i-lucide-eye' : 'i-lucide-eye-off'"
            variant="ghost"
            :color="note.is_shareable ? 'primary' : 'gray'"
            @click="emit('toggle-share', note)"
        />
        <UButton size="2xs" icon="i-lucide-edit-3" variant="ghost" color="gray" @click="emit('edit-public', note)" />
        <UButton size="2xs" icon="i-lucide-trash" variant="ghost" color="red" @click="emit('delete', note.id)" />
      </div>
    </div>

    <!-- Content -->
    <div class="text-sm prose prose-sm dark:prose-invert max-w-none">
      <p class="whitespace-pre-line">{{ note.content }}</p>
    </div>

    <!-- Curated View Preview -->
    <div v-if="note.is_shareable" class="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
      <div class="flex items-center gap-2 mb-1">
        <UIcon name="i-lucide-sparkles" class="text-primary w-3 h-3" />
        <span class="text-[10px] font-bold text-primary uppercase">Public Curated View</span>
      </div>
      <p class="text-xs italic text-gray-500 line-clamp-2">
        {{ note.public_content || note.content }}
      </p>
    </div>
  </div>
</template>
