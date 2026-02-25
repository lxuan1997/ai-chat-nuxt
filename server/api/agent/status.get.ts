export default defineEventHandler(() => {
  return {
    success: true,
    agent: {
      available: true,
      name: 'AI Assistant',
      version: '1.0.0',
      tools: [
        { name: 'weather', description: '查询天气信息', enabled: true },
        { name: 'stock', description: '查询股票信息', enabled: true },
        { name: 'gold', description: '查询金价信息', enabled: true },
        { name: 'image', description: '生成图片 (智谱)', enabled: true },
        { name: 'video', description: '生成视频 (智谱)', enabled: true }
      ]
    },
    features: {
      chat: true,
      rag: false,
      agent: true,
      streaming: true
    }
  }
})
