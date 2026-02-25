<script setup lang="ts">
import { ref, watch, nextTick, onMounted, computed, h } from 'vue'
import { useChat } from '~/composables/useChat'
import ChatMessage from '~/components/ChatMessage.vue'
import type { Message } from '~/types'

const inputMessage = ref<string>('')
const messagesContainer = ref<HTMLElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const backendStatus = ref<'checking' | 'connected' | 'disconnected' | 'error'>('checking')
const fabOpen = ref(false)
const DEFAULT_MODEL = 'glm-4-flash'

const { messages, isLoading, sendMessage, clearMessages } = useChat()

const hasMessages = computed(() => messages.value.length > 0)

const getPromptIcon = (icon: string) => {
  const icons: Record<string, any> = {
    image: () => h('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [
      h('rect', { x: 3, y: 3, width: 18, height: 18, rx: 2 }),
      h('circle', { cx: 8.5, cy: 8.5, r: 1.5 }),
      h('path', { d: 'M21 15l-5-5L5 21' })
    ]),
    cloud: () => h('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [
      h('path', { d: 'M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z' })
    ]),
    edit: () => h('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [
      h('path', { d: 'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7' }),
      h('path', { d: 'M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z' })
    ])
  }
  return icons[icon] || icons.edit
}

const adjustTextareaHeight = (): void => {
  const textarea = textareaRef.value
  if (!textarea) return
  textarea.style.height = 'auto'
  const newHeight = Math.min(Math.max(textarea.scrollHeight, 44), 160)
  textarea.style.height = `${newHeight}px`
}

watch(inputMessage, () => {
  nextTick(() => adjustTextareaHeight())
})

const checkBackend = async (): Promise<void> => {
  try {
    const res = await fetch(`/api/health`, { 
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })
    backendStatus.value = res.ok ? 'connected' : 'disconnected'
  } catch {
    backendStatus.value = 'disconnected'
  }
}

onMounted(() => {
  checkBackend()
  nextTick(() => adjustTextareaHeight())
})

const detectIntent = (message: string): 'image' | 'video' | 'info' | 'chat' => {
  const lowerMessage = message.toLowerCase()
  const imageKeywords = ['画', '生成图片', '制作图片', '创建图片', 'draw', 'image', 'picture']
  const videoKeywords = ['生成视频', '制作视频', '创建视频', 'video']
  const infoKeywords = ['天气', '温度', '下雨', '股价', '股票', '金价', '黄金']
  
  if (imageKeywords.some(k => lowerMessage.includes(k))) return 'image'
  if (videoKeywords.some(k => lowerMessage.includes(k))) return 'video'
  if (infoKeywords.some(k => lowerMessage.includes(k))) return 'info'
  return 'chat'
}

const handleSend = async (): Promise<void> => {
  if (!inputMessage.value.trim() || isLoading.value) return
  
  const message = inputMessage.value
  inputMessage.value = ''
  nextTick(() => adjustTextareaHeight())
  
  const intent = detectIntent(message)
  isLoading.value = true
  
  try {
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date()
    }
    messages.value.push(userMsg)
    
    if (intent === 'info' || intent === 'image' || intent === 'video') {
      const response = await fetch(`/api/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, stream: true })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `请求失败: ${response.status}`)
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        loading: true
      }
      messages.value.push(aiMsg)
      const aiMessageIndex = messages.value.length - 1
      isLoading.value = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.response) {
                messages.value[aiMessageIndex].content = data.response
              }
            } catch {}
          }
        }
      }
      messages.value[aiMessageIndex].loading = false
    } else {
      await sendMessage(message, { model: DEFAULT_MODEL, skipAddUser: true })
    }
  } catch (err: any) {
    messages.value.push({
      id: (Date.now() + 2).toString(),
      role: 'assistant',
      content: `处理失败: ${err.message}`,
      timestamp: new Date(),
      isError: true
    })
  } finally {
    isLoading.value = false
  }
}

const handleKeydown = (e: KeyboardEvent): void => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

const clearChat = async (): Promise<void> => {
  clearMessages()
}

const scrollToBottom = (): void => {
  nextTick(() => {
    messagesContainer.value?.scrollTo({
      top: messagesContainer.value.scrollHeight,
      behavior: 'smooth'
    })
  })
}

watch(messages, scrollToBottom, { deep: true })

const quickPrompts = [
  { label: '帮我画一幅风景画', icon: 'image' },
  { label: '今天北京天气怎么样', icon: 'cloud' },
  { label: '帮我写一首诗', icon: 'edit' }
]

const handleQuickPrompt = (prompt: string) => {
  inputMessage.value = prompt
  handleSend()
}
</script>

<template>
  <div class="chat-view">
    <header class="chat-header">
      <div class="header-left">
        <h1 class="page-title">对话</h1>
        <span class="model-tag">{{ DEFAULT_MODEL }}</span>
      </div>
      <div class="header-right">
        <div class="connection-status" :class="backendStatus">
          <span class="status-dot"></span>
          <span class="status-text">
            {{ backendStatus === 'connected' ? '已连接' : '未连接' }}
          </span>
        </div>
        <button v-if="hasMessages" class="clear-btn" @click="clearChat" title="清空对话">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
        </button>
      </div>
    </header>

    <div class="messages-wrapper" ref="messagesContainer">
      <div v-if="!hasMessages && !isLoading" class="empty-state">
        <div class="empty-avatar">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="10" rx="2"/>
            <circle cx="8.5" cy="16" r="1.5" fill="currentColor" stroke="none"/>
            <circle cx="15.5" cy="16" r="1.5" fill="currentColor" stroke="none"/>
            <path d="M8 4v3"/>
            <path d="M16 4v3"/>
          </svg>
        </div>
        <h2 class="empty-title">你好，我是 AI 助手</h2>
        <p class="empty-desc">我可以帮你回答问题、生成图片、查询天气等</p>
        <div class="quick-prompts">
          <button v-for="prompt in quickPrompts" :key="prompt.label" class="prompt-btn" @click="handleQuickPrompt(prompt.label)">
            <component :is="getPromptIcon(prompt.icon)" />
            {{ prompt.label }}
          </button>
        </div>
      </div>

      <div v-else class="messages-list">
        <ChatMessage v-for="(message, index) in messages" :key="message.id" :message="message" :style="{ animationDelay: `${index * 50}ms` }" class="message-animate" />
        <div v-if="isLoading" class="loading-state">
          <div class="message loading-message">
            <div class="message-avatar">
              <div class="avatar-icon ai-avatar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="11" width="18" height="10" rx="2"/>
                  <circle cx="8.5" cy="16" r="1.5" fill="currentColor"/>
                  <circle cx="15.5" cy="16" r="1.5" fill="currentColor"/>
                  <path d="M8 4v3"/>
                  <path d="M16 4v3"/>
                </svg>
              </div>
            </div>
            <div class="message-content">
              <div class="skeleton-loader">
                <div class="skeleton-line"></div>
                <div class="skeleton-line short"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="input-wrapper">
      <div class="input-container">
        <textarea
          ref="textareaRef"
          v-model="inputMessage"
          placeholder="输入消息，Enter 发送，Shift + Enter 换行..."
          @keydown="handleKeydown"
          :disabled="isLoading"
          rows="1"
        ></textarea>
        <button class="send-btn" @click="handleSend" :disabled="!inputMessage.trim() || isLoading">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
      <p class="input-hint">AI 助手可能会产生错误信息，请核实重要内容</p>
    </div>

    <div class="fab" :class="{ active: fabOpen }">
      <button class="fab-main" @click="fabOpen = !fabOpen">
        <svg v-if="!fabOpen" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
      <div class="fab-menu">
        <button class="fab-item" title="生成图片">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
          </svg>
        </button>
        <button class="fab-item" title="上传文件">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </button>
        <button class="fab-item" title="语音输入">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 56px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-glass);
  backdrop-filter: blur(12px);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
}

.model-tag {
  padding: 4px 10px;
  background: var(--accent-light);
  border-radius: 6px;
  font-size: 12px;
  color: var(--accent-primary);
  font-family: var(--font-mono);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-muted);
}

.connection-status.connected .status-dot {
  background: var(--success);
  box-shadow: 0 0 8px var(--success);
}

.connection-status.disconnected .status-dot {
  background: var(--error);
}

.clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  color: var(--text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-btn:hover {
  background: var(--error-light);
  color: var(--error);
}

.messages-wrapper {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 24px;
  background: var(--gradient-subtle);
  position: relative;
}

.messages-wrapper::-webkit-scrollbar {
  width: 6px;
}

.messages-wrapper::-webkit-scrollbar-track {
  background: transparent;
}

.messages-wrapper::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 3px;
  transition: background 0.2s;
}

.messages-wrapper:hover::-webkit-scrollbar-thumb {
  background: var(--border-hover);
}

.messages-wrapper::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 200px;
  background: var(--gradient-glow);
  pointer-events: none;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 0 16px;
  min-height: 100%;
  position: relative;
  z-index: 1;
}

.empty-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 96px;
  height: 96px;
  background: var(--bg-card);
  border-radius: 24px;
  box-shadow: var(--shadow-glow);
  margin-bottom: 28px;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.empty-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 12px;
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.empty-desc {
  font-size: 15px;
  color: var(--text-secondary);
  max-width: 340px;
  margin-bottom: 36px;
  line-height: 1.6;
}

.quick-prompts {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  max-width: 500px;
}

.prompt-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 20px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  font-size: 14px;
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.prompt-btn:hover {
  background: var(--accent-light);
  border-color: var(--accent-primary);
  color: var(--accent-primary);
  transform: translateY(-3px);
  box-shadow: var(--shadow-glow);
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  z-index: 1;
}

.message-animate {
  animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  opacity: 0;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.loading-state {
  padding: 14px 20px;
}

.loading-message {
  display: flex;
  gap: 14px;
}

.loading-message .message-avatar {
  flex-shrink: 0;
}

.loading-message .avatar-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
  background: var(--accent-gradient);
  color: white;
}

.loading-message .message-content {
  flex: 1;
}

.skeleton-loader {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 400px;
}

.skeleton-line {
  height: 12px;
  background: linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-hover) 50%, var(--bg-tertiary) 75%);
  background-size: 200% 100%;
  border-radius: 6px;
  animation: shimmer 1.5s infinite;
}

.skeleton-line.short {
  width: 60%;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.input-wrapper {
  padding: 20px 24px 28px;
  background: var(--bg-glass);
  backdrop-filter: blur(12px);
  border-top: 1px solid var(--border-color);
}

.input-container {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  padding: 14px;
  background: var(--bg-card);
  border: 2px solid var(--border-color);
  border-radius: 18px;
  box-shadow: var(--shadow-md);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.input-container:focus-within {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 4px var(--accent-light), var(--shadow-glow);
  transform: scale(1.01);
}

.input-container textarea {
  flex: 1;
  min-height: 24px;
  max-height: 160px;
  padding: 4px 0;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 15px;
  line-height: 1.5;
  resize: none;
  outline: none;
}

.input-container textarea::placeholder {
  color: var(--text-muted);
}

.send-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--accent-gradient);
  color: white;
  border: none;
  box-shadow: var(--shadow-button);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 6px 20px rgba(139, 92, 246, 0.35);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.input-hint {
  text-align: center;
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 12px;
}

.fab {
  position: fixed;
  bottom: 28px;
  right: 28px;
  z-index: var(--z-dropdown);
}

.fab-main {
  width: var(--fab-size);
  height: var(--fab-size);
  border-radius: 16px;
  background: var(--accent-gradient);
  color: white;
  border: none;
  box-shadow: var(--shadow-button), var(--shadow-glow);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fab-main:hover {
  transform: scale(1.1);
}

.fab.active .fab-main {
  transform: rotate(90deg);
}

.fab-menu {
  position: absolute;
  bottom: 70px;
  right: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  opacity: 0;
  visibility: hidden;
  transform: translateY(20px) scale(0.9);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fab.active .fab-menu {
  opacity: 1;
  visibility: visible;
  transform: translateY(0) scale(1);
}

.fab-item {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-md);
  cursor: pointer;
  transition: all 0.2s;
}

.fab-item:hover {
  background: var(--accent-light);
  border-color: var(--accent-primary);
  color: var(--accent-primary);
  transform: scale(1.1);
}

@media (max-width: 768px) {
  .chat-header {
    padding: 12px 16px;
  }
  
  .messages-wrapper {
    padding: 16px;
  }
  
  .input-wrapper {
    padding: 16px;
  }
  
  .prompt-btn {
    padding: 12px 16px;
    font-size: 13px;
  }
}
</style>
