import { stream } from 'undici'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const ZHIPU_API_KEY = config.zhipuApiKey as string
  const ZHIPU_BASE_URL = config.zhipuBaseUrl as string

  if (!ZHIPU_API_KEY || ZHIPU_API_KEY === 'your_api_key_here') {
    throw createError({
      statusCode: 500,
      message: 'API Key not configured. Please set ZHIPU_API_KEY in .env'
    })
  }

  const body = await readBody(event)
  const { messages, model = 'glm-4-flash' } = body

  if (!messages || !Array.isArray(messages)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid messages format'
    })
  }

  setHeader(event, 'Content-Type', 'text/event-stream')
  setHeader(event, 'Cache-Control', 'no-cache')
  setHeader(event, 'Connection', 'keep-alive')
  setHeader(event, 'Access-Control-Allow-Origin', '*')
  setHeader(event, 'Access-Control-Allow-Methods', '*')
  setHeader(event, 'Access-Control-Allow-Headers', '*')

  const response = await $fetch(ZHIPU_BASE_URL + '/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ZHIPU_API_KEY}`
    },
    body: {
      model,
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 2048
    },
    responseType: 'stream'
  })

  const bodyStream = response as ReadableStream
  const reader = bodyStream.getReader()
  const decoder = new TextDecoder()

  return new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          controller.enqueue(value)
        }
      } catch (error) {
        controller.error(error)
      } finally {
        reader.releaseLock()
        controller.close()
      }
    }
  })
})
