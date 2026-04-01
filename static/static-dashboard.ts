export const projects = [
	{
		id: 'p_1',
		name: 'Admin Site',
		description: 'Internal management portal for product inventory and order fulfillment.',
		status: 'active',
		links: [
			{ title: 'Production', url: 'https://admin.example.com', type: 'primary', icon: 'i-lucide-external-link' },
			{ title: 'Staging', url: 'https://staging-admin.example.com', type: 'secondary', icon: 'i-lucide-monitor-dot' },
		]
	},
	{
		id: 'p_2',
		name: 'Retail Shopify',
		description: 'The public-facing e-commerce storefront for retail customers.',
		status: 'in_progress',
		links: [
			{ title: 'Live Store', url: 'https://store.example.com', type: 'primary', icon: 'i-lucide-shopping-cart' },
			{ title: 'Theme Preview (v2.1)', url: 'https://store.example.com/?preview_theme_id=123', type: 'secondary', icon: 'i-lucide-eye' },
			{ title: 'Theme Preview (v2.2 Beta)', url: 'https://store.example.com/?preview_theme_id=456', type: 'secondary', icon: 'i-lucide-eye' },
		]
	}
]

export const updates = [
	{
		id: 'u_1',
		date: 'Today, 2:30 PM',
		title: 'Shopify v2.2 Beta preview link available',
		description: 'Added the new preview link for you to check the updated cart drawer interactions.',
		author: 'parsehex',
		type: 'feature'
	},
	{
		id: 'u_2',
		date: 'Yesterday',
		title: 'Admin Site Staging deployed',
		description: 'Deployed the latest fixes to the routing table. Feel free to smoke test the order fulfillment page when you have time.',
		author: 'parsehex',
		type: 'deployment'
	},
	{
		id: 'u_3',
		date: 'Last Week',
		title: 'Project Kickoff',
		description: 'Began tracking updates via this portal. All future environment links will be maintained here.',
		author: 'parsehex',
		type: 'note'
	}
]
