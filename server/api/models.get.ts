export default defineEventHandler(() => {
  return {
    models: [
      { id: 'glm-4-flash', name: 'GLM-4-Flash', description: '免费快速模型', free: true },
      { id: 'glm-4-air', name: 'GLM-4-Air', description: '高性能模型', free: false },
      { id: 'glm-4-airx', name: 'GLM-4-AirX', description: '长文本模型', free: false },
      { id: 'glm-4-plus', name: 'GLM-4-Plus', description: '顶级旗舰模型', free: false }
    ]
  }
})
