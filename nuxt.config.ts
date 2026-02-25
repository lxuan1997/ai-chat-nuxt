export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  
  app: {
    head: {
      title: 'AI Chat',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' }
      ]
    }
  },

  runtimeConfig: {
    zhipuApiKey: process.env.ZHIPU_API_KEY || '',
    zhipuBaseUrl: process.env.ZHIPU_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4',
    public: {
      apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3001'
    }
  },

  css: ['~/assets/styles/variables.css', '~/assets/styles/animations.css'],

  nitro: {
    preset: 'vercel'
  },

  routeRules: {
    '/': { prerender: true }
  }
})
