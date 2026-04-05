<script setup lang="ts">
  import {
    inquiryValidation,
    signInValidation,
    type SchemaInquiryValidation,
    type SchemaSignInValidation,
  } from '~/utils/formValidation'
  import { BaseError, useErrorHandler } from '~/composables/use-error-handler'
  import type { FormSubmitEvent } from '#ui/types'

  definePageMeta({
    middleware: 'guest'
  })

  useSeoMeta({
    title: 'Sign In',
  })

  const { auth } = useSupabaseClient()
  const { errorHandler } = useErrorHandler()
  const runtimeConfig = useRuntimeConfig()
  const route = useRoute()

  const form = reactive({
    email: undefined,
    password: undefined
  })
  const isLoading = ref(false)

  const inquiryForm = reactive({
    name: '',
    email: '',
    company: '',
    website: '',
    message: ''
  })
  const isInquiryLoading = ref(false)
  const inquirySuccessMessage = ref('')
  const inquiryErrorMessage = ref('')
  const captchaToken = ref('')
  const captchaContainer = ref<HTMLElement | null>(null)
  const captchaWidgetId = ref<string | number | null>(null)
  const isCaptchaReady = ref(false)

  useHead({
    script: [{ src: 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit', defer: true, async: true }]
  })

  const resetInquiryForm = () => {
    inquiryForm.name = ''
    inquiryForm.email = ''
    inquiryForm.company = ''
    inquiryForm.website = ''
    inquiryForm.message = ''
    captchaToken.value = ''

    if (window.turnstile && captchaWidgetId.value !== null) {
      window.turnstile.reset(captchaWidgetId.value)
    }
  }

  const initializeCaptcha = () => {
    if (!runtimeConfig.public.TURNSTILE_SITE_KEY || !captchaContainer.value) {
      return
    }

    if (!window.turnstile || captchaWidgetId.value !== null) {
      return
    }

    captchaWidgetId.value = window.turnstile.render(captchaContainer.value, {
      sitekey: runtimeConfig.public.TURNSTILE_SITE_KEY,
      callback: (token: string) => {
        captchaToken.value = token
      },
      'expired-callback': () => {
        captchaToken.value = ''
      },
      'error-callback': () => {
        captchaToken.value = ''
      },
    })

    isCaptchaReady.value = true
  }

  const waitForCaptchaScript = () => {
    if (!runtimeConfig.public.TURNSTILE_SITE_KEY) {
      return
    }

    const attempt = () => {
      if (!captchaContainer.value) {
        setTimeout(attempt, 100)
        return
      }

      if (window.turnstile) {
        initializeCaptcha()
        return
      }

      setTimeout(attempt, 150)
    }

    attempt()
  }

  onMounted(() => {
    waitForCaptchaScript()
  })

  /**
   * Sign in with credential.
   *
   * @param {FormSubmitEvent<SchemaSignInValidation>} event - The form submit event.
   * @return {Promise<void>} A promise that resolves when the sign-in process is complete.
   */
  const signInWithCredential = async (event: FormSubmitEvent<SchemaSignInValidation>) => {
    try {
      isLoading.value = true

      const signIn = await auth.signInWithPassword({
        email: form.email ?? '',
        password: form.password ?? ''
      })

      if(signIn.error) {
        throw new BaseError(signIn.error.status, signIn.error.message)
      }

      navigateTo('/dashboard')
      isLoading.value = false
    } catch (error) {
      isLoading.value = false
      errorHandler(error as BaseError)
    }
  }

  /**
   * Sign in with a provider.
   *
   * @param {string} provider - The provider to sign in with. Can be 'GITHUB' or 'GOOGLE'.
   */
  const signInWithProvider = async (provider: 'GITHUB' | 'GOOGLE') =>  {
    try {
      isLoading.value = true

      let signIn = null

      if(provider === 'GITHUB') {
        signIn = await auth.signInWithOAuth({
          provider: 'github',
          options: {
            redirectTo: `${window.location.origin}/confirm`
          }
        })
      }

      if(signIn?.error) {
        throw new BaseError(signIn.error.status, signIn.error.message)
      }

      navigateTo('/dashboard')
      isLoading.value = false
    } catch (error) {
      isLoading.value = false
      errorHandler(error as BaseError)
    }
  }

  const submitInquiry = async (event: FormSubmitEvent<SchemaInquiryValidation>) => {
    try {
      inquiryErrorMessage.value = ''
      inquirySuccessMessage.value = ''

      if (!runtimeConfig.public.TURNSTILE_SITE_KEY) {
        throw new BaseError(503, 'Turnstile is not configured. Please contact support directly by email.')
      }

      if (!captchaToken.value) {
        throw new BaseError(400, 'Please complete captcha verification before submitting your inquiry.')
      }

      isInquiryLoading.value = true

      await $fetch('/api/inquiries', {
        method: 'POST',
        body: {
          name: event.data.name,
          email: event.data.email,
          company: event.data.company || null,
          website: event.data.website || null,
          message: event.data.message,
          captchaToken: captchaToken.value,
          sourcePath: route.fullPath,
        },
      })

      inquirySuccessMessage.value = 'Thanks, your inquiry was sent. I will follow up by email soon.'
      resetInquiryForm()
    } catch (error: any) {
      inquiryErrorMessage.value = error?.data?.statusMessage || error?.message || 'Unable to submit your inquiry right now.'
    } finally {
      isInquiryLoading.value = false
    }
  }
</script>

<script lang="ts">
  declare global {
    interface Window {
      turnstile?: {
        render: (container: string | HTMLElement, options: Record<string, unknown>) => string | number
        reset: (widgetId?: string | number) => void
      }
    }
  }

  export {}
</script>

<template>
  <div class="container mx-auto px-4 py-10 min-h-screen flex items-center">
    <div class="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
      <UCard>
        <template #header>
          <div class="flex items-center gap-3">
            <img src="/favicon.png" class="h-10 w-10 rounded-lg" alt="parsehex logo">
            <div>
              <p class="text-lg font-bold">parsehex Client Portal</p>
              <p class="text-xs text-gray-500">Sign in for existing clients and team members</p>
            </div>
          </div>
        </template>

        <UForm :schema="signInValidation" :state="form" class="space-y-4" @submit="signInWithCredential">
          <UFormGroup label="Email" name="email">
            <UInput v-model="form.email" autocomplete="email" />
          </UFormGroup>

          <UFormGroup label="Password" name="password">
            <UInput v-model="form.password" type="password" autocomplete="current-password" />
          </UFormGroup>

          <UButton
            :loading="isLoading"
            :disabled="isLoading"
            type="submit"
            label="Login"
            color="gray"
            block
          />
        </UForm>
      </UCard>

      <UCard>
        <template #header>
          <div>
            <p class="text-lg font-bold">Need help or want to work together?</p>
            <p class="text-xs text-gray-500">Send an inquiry directly without an account.</p>
          </div>
        </template>

        <UForm :schema="inquiryValidation" :state="inquiryForm" class="space-y-4" @submit="submitInquiry">
          <UFormGroup label="Name" name="name">
            <UInput v-model="inquiryForm.name" placeholder="Your full name" />
          </UFormGroup>

          <UFormGroup label="Email" name="email">
            <UInput v-model="inquiryForm.email" placeholder="you@example.com" autocomplete="email" />
          </UFormGroup>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <UFormGroup label="Company (optional)" name="company">
              <UInput v-model="inquiryForm.company" placeholder="Acme Co" />
            </UFormGroup>

            <UFormGroup label="Website (optional)" name="website">
              <UInput v-model="inquiryForm.website" placeholder="https://example.com" />
            </UFormGroup>
          </div>

          <UFormGroup label="How can I help?" name="message">
            <UTextarea v-model="inquiryForm.message" :rows="5" placeholder="Share a short overview of your project, goals, or timeline." />
          </UFormGroup>

          <div>
            <div v-if="runtimeConfig.public.TURNSTILE_SITE_KEY" ref="captchaContainer" class="min-h-[65px]" />
            <p v-else class="text-xs text-red-500">Captcha is not configured yet. Set TURNSTILE_SITE_KEY to enable public inquiries.</p>
          </div>

          <UAlert
            v-if="inquirySuccessMessage"
            color="green"
            variant="soft"
            :title="inquirySuccessMessage"
          />

          <UAlert
            v-if="inquiryErrorMessage"
            color="red"
            variant="soft"
            :title="inquiryErrorMessage"
          />

          <UButton
            :loading="isInquiryLoading"
            :disabled="isInquiryLoading || !runtimeConfig.public.TURNSTILE_SITE_KEY || !isCaptchaReady"
            type="submit"
            label="Send inquiry"
            color="black"
            block
          />
        </UForm>
      </UCard>
    </div>
  </div>
</template>

<style scoped>

</style>
