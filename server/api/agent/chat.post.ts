export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const ZHIPU_API_KEY = config.zhipuApiKey as string
  const ZHIPU_BASE_URL = config.zhipuBaseUrl as string

  if (!ZHIPU_API_KEY || ZHIPU_API_KEY === 'your_api_key_here') {
    throw createError({
      statusCode: 500,
      message: 'API Key not configured'
    })
  }

  const body = await readBody(event)
  const { message } = body

  if (!message) {
    throw createError({
      statusCode: 400,
      message: 'Message is required'
    })
  }

  setHeader(event, 'Content-Type', 'text/event-stream')
  setHeader(event, 'Cache-Control', 'no-cache')
  setHeader(event, 'Connection', 'keep-alive')
  setHeader(event, 'Access-Control-Allow-Origin', '*')

  const lowerMessage = message.toLowerCase()
  let responseContent = ''
  let toolUsed = false
  let toolName = ''
  let toolResult: any = null

  try {
    if (lowerMessage.includes('天气') || lowerMessage.includes('weather')) {
      toolUsed = true
      toolName = 'weather'
      const cityMatch = message.match(/([省市區])?([^\s市省區]+)[市省區]?(?:的)?天气/)
      const city = cityMatch ? cityMatch[2] || '北京' : '北京'
      toolResult = await fetchWeather(city)
      responseContent = generateWeatherResponse(city, toolResult)
    } else if (lowerMessage.includes('股价') || lowerMessage.includes('股票') || lowerMessage.includes('stock')) {
      toolUsed = true
      toolName = 'stock'
      const codeMatch = message.match(/[A-Za-z]+/)
      const code = codeMatch ? codeMatch[0].toUpperCase() : 'AAPL'
      toolResult = await fetchStock(code)
      responseContent = generateStockResponse(code, toolResult)
    } else if (lowerMessage.includes('金价') || lowerMessage.includes('黄金') || lowerMessage.includes('gold')) {
      toolUsed = true
      toolName = 'gold'
      toolResult = await fetchGold()
      responseContent = generateGoldResponse(toolResult)
    } else if (lowerMessage.includes('画') || lowerMessage.includes('生成图片') || lowerMessage.includes('image')) {
      toolUsed = true
      toolName = 'image'
      const imagePrompt = message.replace(/.*[画生成创建].*?(?:图片|图|image|picture).*?\s*/i, '').trim() || message
      toolResult = await generateImage(imagePrompt, ZHIPU_API_KEY, ZHIPU_BASE_URL)
      responseContent = generateImageResponse(imagePrompt, toolResult)
    } else if (lowerMessage.includes('视频') || lowerMessage.includes('video')) {
      toolUsed = true
      toolName = 'video'
      const videoPrompt = message.replace(/.*[生成创建].*?(?:视频|video).*?\s*/i, '').trim() || message
      toolResult = await generateVideo(videoPrompt, ZHIPU_API_KEY, ZHIPU_BASE_URL)
      responseContent = generateVideoResponse(videoPrompt, toolResult)
    } else {
      const messages = [
        { role: 'system', content: '你是一个智能助手，请简洁友好地回答用户问题。' },
        { role: 'user', content: message }
      ]
      
      const response = await $fetch(ZHIPU_BASE_URL + '/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ZHIPU_API_KEY}`
        },
        body: {
          model: 'glm-4-flash',
          messages,
          stream: true,
          temperature: 0.7
        },
        responseType: 'stream'
      })

      const reader = (response as ReadableStream).getReader()
      const decoder = new TextDecoder()

      const stream = new ReadableStream({
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

      return stream
    }

    const result = {
      success: true,
      message,
      response: responseContent,
      toolUsed,
      toolName,
      toolResult,
      timestamp: new Date().toISOString()
    }

    const data = `data: ${JSON.stringify(result)}\n\n`
    const encoder = new TextEncoder()
    
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(data))
        controller.close()
      }
    })

    return stream

  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error.message || 'Agent processing failed'
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

function generateWeatherResponse(city: string, data: any) {
  return `【${city}天气】\n\n🌡️ 温度：${data.temperature}\n☀️ 天气：${data.weather}\n🌡️ 体感：${data.feelsLike}\n💧 湿度：${data.humidity}\n🌬️ 风力：${data.wind}`
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

function generateStockResponse(code: string, data: any) {
  return `【${code}股票信息】\n\n💰 价格：¥${data.price}\n📈 涨跌：${data.change}\n📊 今开：${data.open}\n📈 最高：${data.high}\n📉 最低：${data.low}`
}

async function fetchGold() {
  return {
    price: '545.80',
    unit: '元/克',
    change: '+1.23%',
    isUp: true
  }
}

function generateGoldResponse(data: any) {
  return `【黄金价格】\n\n💰 价格：${data.price} ${data.unit}\n📈 涨跌：${data.change}`
}

async function generateImage(prompt: string, apiKey: string, baseUrl: string) {
  try {
    const response = await $fetch(baseUrl + '/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: {
        model: 'cogview-3',
        prompt: prompt,
        size: '1024x1024'
      }
    })
    return response
  } catch (error: any) {
    return { error: error.message || '图片生成暂时不可用' }
  }
}

function generateImageResponse(prompt: string, result: any) {
  if (result.data?.[0]?.url) {
    return `✅ 已为您生成图片：${prompt}\n\n🖼️ 图片地址：${result.data[0].url}`
  }
  return `⚠️ 图片生成：${result.error || '暂时无法生成图片，请稍后再试'}`
}

async function generateVideo(prompt: string, apiKey: string, baseUrl: string) {
  try {
    const response = await $fetch(baseUrl + '/video/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: {
        model: 'cogvideo',
        prompt: prompt
      }
    })
    return response
  } catch (error: any) {
    return { error: error.message || '视频生成暂时不可用', task_status: 'ERROR' }
  }
}

function generateVideoResponse(prompt: string, result: any) {
  if (result.task_status === 'SUCCESS' && result.video_result?.[0]?.url) {
    return `✅ 已为您生成视频：${prompt}\n\n🎬 视频地址：${result.video_result[0].url}`
  }
  return `⚠️ 视频生成：${result.error || '暂时无法生成视频，请稍后再试'}\n\n状态：${result.task_status || '未知'}`
}
