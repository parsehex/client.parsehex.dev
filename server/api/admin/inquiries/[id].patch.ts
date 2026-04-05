import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import type { Database } from '~/supabase/database.types'

interface UpdateInquiryBody {
  status?: 'new' | 'reviewed' | 'archived'
}

const allowedStatuses = new Set(['new', 'reviewed', 'archived'])

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseServiceRole<Database>(event)
  const currentUser = await serverSupabaseUser(event)

  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const { data: adminCheck, error: adminError } = await supabase
    .from('users')
    .select('is_system_admin')
    .eq('id', currentUser.id)
    .single()

  if (adminError || !adminCheck?.is_system_admin) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Inquiry id is required.' })
  }

  const body = await readBody<UpdateInquiryBody>(event)
  if (!body.status || !allowedStatuses.has(body.status)) {
    throw createError({ statusCode: 400, statusMessage: 'A valid status is required.' })
  }

  const updatePayload: Database['public']['Tables']['inquiries']['Update'] = {
    status: body.status,
  }

  if (body.status === 'reviewed' || body.status === 'archived') {
    updatePayload.reviewed_at = new Date().toISOString()
    updatePayload.reviewed_by = currentUser.id
  }

  if (body.status === 'new') {
    updatePayload.reviewed_at = null
    updatePayload.reviewed_by = null
  }

  const { error: updateError } = await supabase
    .from('inquiries')
    .update(updatePayload)
    .eq('id', id)

  if (updateError) {
    throw createError({ statusCode: 500, statusMessage: 'Unable to update inquiry.' })
  }

  return {
    success: true,
  }
})
