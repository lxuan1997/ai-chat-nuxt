import { ref, type Ref } from 'vue'
import type { Message } from '~/types'

interface ChatOptions {
  model?: string
  onUpdate?: (content: string) => void
  skipAddUser?: boolean
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatRequest {
  messages: ChatMessage[]
  model: string
  stream: boolean
}

interface ChatResponse {
  choices: Array<{
    delta?: {
      content?: string
    }
  }>
}

export function useChat() {
  const config = useRuntimeConfig()
  const API_BASE_URL = config.public.apiBaseUrl as string

  const messages: Ref<Message[]> = ref<Message[]>([])
  const isLoading: Ref<boolean> = ref<boolean>(false)
  const error: Ref<string | null> = ref<string | null>(null)

  const sendMessage = async (userMessage: string, options: ChatOptions = {}): Promise<void> => {
    const { model = 'glm-4-flash', onUpdate, skipAddUser = false } = options
    
    error.value = null
    
    if (!skipAddUser) {
      const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: userMessage,
        timestamp: new Date()
      }
      messages.value.push(userMsg)
    }

    isLoading.value = true

    try {
      const chatMessages: ChatMessage[] = messages.value
        .filter(m => !m.loading)
        .map(m => ({
          role: m.role,
          content: m.content
        }))

      const requestBody: ChatRequest = {
        messages: chatMessages,
        model,
        stream: true
      }

      const response = await fetch(`/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.message || errData.error || `请求失败: ${response.status}`)
      }

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        loading: true
      }
      messages.value.push(aiMsg)
      const aiMessageIndex: number = messages.value.length - 1
      
      isLoading.value = false

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.trim() === '') continue
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              messages.value[aiMessageIndex].loading = false
              return
            }

            try {
              const parsed: ChatResponse = JSON.parse(data)
              const delta = parsed.choices?.[0]?.delta?.content
              if (delta) {
                messages.value[aiMessageIndex].content += delta
                if (onUpdate) onUpdate(messages.value[aiMessageIndex].content)
              }
            } catch (e) {
            }
          }
        }
      }

      if (buffer) {
        const line = buffer.trim()
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const data: ChatResponse = JSON.parse(line.slice(6))
            const delta = data.choices?.[0]?.delta?.content
            if (delta) messages.value[aiMessageIndex].content += delta
          } catch (e) {}
        }
      }

      messages.value[aiMessageIndex].loading = false

    } catch (err: any) {
      error.value = err.message
      isLoading.value = false
      
      const errorMsg: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: `出错了: ${err.message}\n\n请检查:\n1. 后端服务是否启动\n2. API Key 是否正确配置\n3. 网络连接是否正常`,
        timestamp: new Date(),
        isError: true
      }
      messages.value.push(errorMsg)
    }
  }

  const clearMessages = (): void => {
    messages.value = []
    error.value = null
  }

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages
  }
}
