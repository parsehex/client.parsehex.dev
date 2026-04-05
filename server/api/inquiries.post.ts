import { serverSupabaseServiceRole } from '#supabase/server'
import { Resend } from 'resend'
import type { Database } from '~/supabase/database.types'

interface InquiryBody {
  name?: string
  email?: string
  company?: string
  website?: string
  message?: string
  captchaToken?: string
  sourcePath?: string
}

interface TurnstileVerificationResponse {
  success: boolean
  'error-codes'?: string[]
}

const isValidEmail = (value: string) => /[^\s@]+@[^\s@]+\.[^\s@]+/.test(value)

export default defineEventHandler(async (event) => {
  const body = await readBody<InquiryBody>(event)
  const runtimeConfig = useRuntimeConfig(event)

  const name = body.name?.trim() || ''
  const email = body.email?.trim() || ''
  const company = body.company?.trim() || null
  const website = body.website?.trim() || null
  const message = body.message?.trim() || ''
  const captchaToken = body.captchaToken?.trim() || ''
  const sourcePath = body.sourcePath?.trim() || null

  if (!name || name.length < 2 || name.length > 120) {
    throw createError({ statusCode: 400, statusMessage: 'Please provide a valid name.' })
  }

  if (!email || !isValidEmail(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Please provide a valid email address.' })
  }

  if (!message || message.length < 20 || message.length > 4000) {
    throw createError({ statusCode: 400, statusMessage: 'Please provide a message with at least 20 characters.' })
  }

  if (!captchaToken) {
    throw createError({ statusCode: 400, statusMessage: 'Captcha validation is required.' })
  }

  if (!runtimeConfig.TURNSTILE_SECRET_KEY) {
    throw createError({ statusCode: 503, statusMessage: 'Captcha is not configured on the server.' })
  }

  const ipAddress =
    getRequestHeader(event, 'cf-connecting-ip') ||
    getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim() ||
    null

  const userAgent = getRequestHeader(event, 'user-agent') || null

  const turnstilePayload = new URLSearchParams({
    secret: runtimeConfig.TURNSTILE_SECRET_KEY,
    response: captchaToken,
  })

  if (ipAddress) {
    turnstilePayload.set('remoteip', ipAddress)
  }

  const verification = await $fetch<TurnstileVerificationResponse>(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {
      method: 'POST',
      body: turnstilePayload,
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
    }
  )

  if (!verification.success) {
    throw createError({ statusCode: 400, statusMessage: 'Captcha verification failed. Please try again.' })
  }

  const supabase = await serverSupabaseServiceRole<Database>(event)

  if (ipAddress) {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
    const { count: recentCount, error: throttleError } = await supabase
      .from('inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('ip_address', ipAddress)
      .gte('created_at', twoMinutesAgo)

    if (throttleError) {
      throw createError({ statusCode: 500, statusMessage: 'Unable to process inquiry at the moment.' })
    }

    if ((recentCount || 0) >= 3) {
      throw createError({ statusCode: 429, statusMessage: 'Too many attempts. Please wait a moment and try again.' })
    }
  }

  const { data: insertedInquiry, error: insertError } = await supabase
    .from('inquiries')
    .insert({
      name,
      email,
      company,
      website,
      message,
      source_path: sourcePath,
      ip_address: ipAddress,
      user_agent: userAgent,
    })
    .select('id, created_at')
    .single()

  if (insertError) {
    throw createError({ statusCode: 500, statusMessage: 'Unable to save inquiry.' })
  }

  let emailSent = false

  if (
    runtimeConfig.RESEND_API_KEY &&
    runtimeConfig.RESEND_FROM_EMAIL &&
    runtimeConfig.INQUIRY_NOTIFICATION_EMAIL
  ) {
    try {
      const resend = new Resend(runtimeConfig.RESEND_API_KEY)
      await resend.emails.send({
        from: runtimeConfig.RESEND_FROM_EMAIL,
        to: [runtimeConfig.INQUIRY_NOTIFICATION_EMAIL],
        subject: `New inquiry from ${name}`,
        replyTo: email,
        text: [
          `Name: ${name}`,
          `Email: ${email}`,
          `Company: ${company || 'N/A'}`,
          `Website: ${website || 'N/A'}`,
          `Source: ${sourcePath || 'N/A'}`,
          '',
          'Message:',
          message,
          '',
          `Inquiry ID: ${insertedInquiry?.id || 'unknown'}`,
        ].join('\n'),
      })
      emailSent = true
    } catch (error) {
      console.error('Failed to send inquiry notification email.', error)
    }
  }

  return {
    success: true,
    inquiryId: insertedInquiry?.id || null,
    emailSent,
  }
})
