// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	app: {
		head: {
			title: 'parsehex Client Portal',
			htmlAttrs: {
				lang: 'en',
			},
			meta: [
				{
					hid: 'description',
					name: 'description',
					content:
						'Client portal and project management for parsehex.',
				},
				{ hid: 'og:image', name: 'og:image', content: '/og-image.png' },
			],
			link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.png' }],
		},
	},
	devtools: { enabled: true },
	// extends: '@nuxt-themes/docus',
	ui: {
		icons: ['lucide'],
	},
	supabase: {
		redirect: false,
	},
	runtimeConfig: {
		TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
		RESEND_API_KEY: process.env.RESEND_API_KEY,
		RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
		INQUIRY_NOTIFICATION_EMAIL: process.env.INQUIRY_NOTIFICATION_EMAIL,
		public: {
			APP_URL: process.env.APP_URL,
			TURNSTILE_SITE_KEY: process.env.TURNSTILE_SITE_KEY,
		},
	},
	modules: [
		'@nuxt/ui',
		'nuxt-icon',
		'@nuxtjs/color-mode',
		'@vueuse/nuxt',
		'@nuxtjs/supabase',
		'@nuxt/content',
	],
	content: {
		contentHead: true,
	},
})
