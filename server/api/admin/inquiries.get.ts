import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import type { Database } from '~/supabase/database.types'

const ensureSystemAdmin = async (event: any) => {
  const supabase = await serverSupabaseServiceRole<Database>(event)
  const currentUser = await serverSupabaseUser(event)

  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const { data: adminCheck, error: adminError } = await supabase
    .from('users')
    .select('id, is_system_admin')
    .eq('id', currentUser.id)
    .single()

  if (adminError || !adminCheck?.is_system_admin) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  return { supabase, currentUser }
}

export default defineEventHandler(async (event) => {
  const { supabase } = await ensureSystemAdmin(event)
  const query = getQuery(event)

  const requestedStatus =
    typeof query.status === 'string' && ['new', 'reviewed', 'archived'].includes(query.status)
      ? query.status
      : null

  const limit =
    typeof query.limit === 'string' && Number.isFinite(Number(query.limit))
      ? Math.min(Math.max(Number(query.limit), 1), 100)
      : 25

  let request = supabase
    .from('inquiries')
    .select('id, name, email, company, website, message, source_path, status, reviewed_at, reviewed_by, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (requestedStatus) {
    request = request.eq('status', requestedStatus)
  }

  const { data, error } = await request

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Unable to fetch inquiries.' })
  }

  return {
    inquiries: data ?? [],
  }
})
