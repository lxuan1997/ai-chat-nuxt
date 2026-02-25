export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { toolName, query } = body

  if (!toolName || !query) {
    throw createError({
      statusCode: 400,
      message: 'toolName and query are required'
    })
  }

  const config = useRuntimeConfig()
  const ZHIPU_API_KEY = config.zhipuApiKey as string
  const ZHIPU_BASE_URL = config.zhipuBaseUrl as string

  try {
    let result: any

    switch (toolName) {
      case 'weather':
        result = await fetchWeather(query)
        break
      case 'stock':
        result = await fetchStock(query)
        break
      case 'gold':
        result = await fetchGold()
        break
      case 'image':
        result = await generateImage(query, ZHIPU_API_KEY, ZHIPU_BASE_URL)
        break
      case 'video':
        result = await generateVideo(query, ZHIPU_API_KEY, ZHIPU_BASE_URL)
        break
      default:
        throw createError({
          statusCode: 404,
          message: `Tool not found: ${toolName}`
        })
    }

    return {
      success: true,
      toolName,
      query,
      data: result
    }

  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Tool execution failed'
    })
  }
})

async function fetchWeather(city: string) {
  return {
    city,
    temperature: '22°C',
    weather: '晴朗',
    feelsLike: '24°C',
    humidity: '45%',
    wind: '3级'
  }
}

async function fetchStock(code: string) {
  return {
    code,
    name: code + ' Company',
    price: '156.78',
    change: '+2.34%',
    isUp: true,
    open: '154.20',
    high: '158.50',
    low: '153.80'
  }
}

async function fetchGold() {
  return {
    price: '545.80',
    unit: '元/克',
    change: '+1.23%',
    isUp: true
  }
}

async function generateImage(prompt: string, apiKey: string, baseUrl: string) {
  try {
    return { url: 'https://via.placeholder.com/512x512?text=AI+Image' }
  } catch (error: any) {
    return { error: error.message }
  }
}

async function generateVideo(prompt: string, apiKey: string, baseUrl: string) {
  try {
    return { task_id: 'video_' + Date.now(), status: 'processing' }
  } catch (error: any) {
    return { error: error.message }
  }
}
