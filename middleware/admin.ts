import type { Database } from '~/supabase/database.types';

export default defineNuxtRouteMiddleware(async (to, from) => {
  const user = useSupabaseUser()
  const supabase = useSupabaseClient<Database>()
  
  if (!user.value) {
    return navigateTo('/sign-in')
  }

  const { data } = await supabase
    .from('users')
    .select('is_system_admin')
    .eq('id', user.value.id)
    .single()

  if (!data?.is_system_admin) {
    return navigateTo('/dashboard')
  }
})
