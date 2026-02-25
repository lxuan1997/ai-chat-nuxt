<script setup lang="ts">
import { computed, ref, onMounted, watch, nextTick } from 'vue'
import { marked } from 'marked'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-light.css'
import type { Message } from '~/types'

const props = defineProps<{ message: Message }>()

const isUser = computed(() => props.message.role === 'user')
const contentRef = ref<HTMLElement | null>(null)

const cards = computed(() => props.message.cards || [])
const weatherCards = computed(() => cards.value.filter((c: any) => c.data?.type === 'weather').map((c: any) => c.data))
const stockCards = computed(() => cards.value.filter((c: any) => c.data?.type === 'stock').map((c: any) => c.data))
const imageCards = computed(() => cards.value.filter((c: any) => c.data?.type === 'image').map((c: any) => c.data))

marked.setOptions({ breaks: true, gfm: true })

const renderMarkdown = (content: string) => marked.parse(content)

const formatTime = (date: Date) => {
  if (!date) return ''
  return new Date(date).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

const addCopyButtons = () => {
  if (!contentRef.value) return
  const codeBlocks = contentRef.value.querySelectorAll('pre')
  codeBlocks.forEach((pre) => {
    if (pre.parentElement?.classList.contains('code-block-wrapper')) return
    const code = pre.querySelector('code')
    if (!code) return
    try {
      const highlighted = hljs.highlightAuto(code.textContent || '')
      code.innerHTML = highlighted.value
    } catch {}
    const wrapper = document.createElement('div')
    wrapper.className = 'code-block-wrapper'
    pre.parentNode?.insertBefore(wrapper, pre)
    wrapper.appendChild(pre)
  })
}

watch(() => props.message.content, () => {
  if (!props.message.isStreaming) nextTick(() => addCopyButtons())
}, { immediate: true })

onMounted(() => addCopyButtons())
</script>

<template>
  <div class="message" :class="{ user: isUser, error: message.isError }">
      <div class="message-avatar">
      <div class="avatar-icon" :class="isUser ? 'user-avatar' : 'ai-avatar'">
        <svg v-if="isUser" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="10" rx="2"/>
          <circle cx="8.5" cy="16" r="1.5" fill="currentColor"/>
          <circle cx="15.5" cy="16" r="1.5" fill="currentColor"/>
          <path d="M8 4v3"/>
          <path d="M16 4v3"/>
        </svg>
      </div>
    </div>

    <div class="message-content">
      <template v-if="cards.length > 0">
        <div v-for="(card, index) in weatherCards" :key="'w'+index" class="info-card weather-card">
          <div class="card-header">
            <div class="card-icon weather-bg">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2">
                <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            </div>
            <div class="card-title">
              <span class="city">{{ card.city }}</span>
              <span class="label">天气</span>
            </div>
          </div>
          <div class="card-body">
            <div class="weather-main">
              <span class="temperature">{{ card.temperature }}</span>
              <span class="weather-desc">{{ card.weather }}</span>
            </div>
            <div class="weather-details">
              <span>体感 {{ card.feelsLike }}</span>
              <span>湿度 {{ card.humidity }}</span>
              <span>风力 {{ card.wind }}</span>
            </div>
          </div>
        </div>

        <div v-for="(card, index) in stockCards" :key="'s'+index" class="info-card stock-card">
          <div class="card-header">
            <div class="card-icon stock-bg">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
              </svg>
            </div>
            <div class="card-title">
              <span class="stock-name">{{ card.name }}</span>
              <span class="stock-code">{{ card.code }}</span>
            </div>
          </div>
          <div class="card-body">
            <div class="stock-main">
              <span class="stock-price">¥{{ card.price }}</span>
              <span :class="['stock-change', card.isUp ? 'up' : 'down']">
                {{ card.isUp ? '↑' : '↓' }} {{ card.changePercent }}%
              </span>
            </div>
            <div class="stock-details">
              <span>今开 {{ card.open }}</span>
              <span>最高 {{ card.high }}</span>
              <span>最低 {{ card.low }}</span>
            </div>
          </div>
        </div>

        <div v-for="(card, index) in imageCards" :key="'i'+index" class="info-card image-card">
          <div class="card-header">
            <div class="card-icon image-bg">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
              </svg>
            </div>
            <span class="card-title">{{ card.title }}</span>
          </div>
          <div class="card-body">
            <img v-if="card.url" :src="card.url" alt="Generated Image" class="generated-image" />
            <div v-else-if="card.error" class="card-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;margin-right:4px">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {{ card.error }}
            </div>
          </div>
        </div>
      </template>

      <div v-if="!cards.length" ref="contentRef" class="content markdown-body" :class="{ 'is-error': message.isError }" v-html="renderMarkdown(message.content)"></div>

      <div class="message-footer">
        <span v-if="message.timestamp" class="timestamp">{{ formatTime(message.timestamp) }}</span>
        <span v-if="message.meta?.duration" class="meta-duration">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
          {{ message.meta.duration }}
        </span>
      </div>
      
      <span v-if="message.isStreaming" class="cursor">▋</span>
    </div>
  </div>
</template>

<style scoped>
.message {
  display: flex;
  gap: 14px;
  padding: 14px 20px;
}

.message.user { flex-direction: row-reverse; }

.message.error .message-content {
  background: transparent;
  border: none;
}

.message.error .content {
  background: var(--ai-bubble);
  border: 1px solid var(--ai-bubble-border);
  color: var(--ai-bubble-text);
}

.message.error .avatar-icon.ai-avatar {
  background: var(--accent-gradient);
  color: white;
}

.message-avatar { flex-shrink: 0; }

.avatar-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
}

.avatar-icon.user-avatar { 
  background: var(--user-bubble); 
  color: white;
}
.avatar-icon.ai-avatar { 
  background: var(--accent-gradient); 
  color: white;
}

.message-content {
  flex: 1;
  max-width: 640px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.message.user .message-content { align-items: flex-end; }

.content {
  padding: 16px 18px;
  background: var(--ai-bubble);
  border: 1px solid var(--ai-bubble-border);
  border-radius: 18px;
  border-bottom-left-radius: 6px;
  color: var(--ai-bubble-text);
  font-size: 15px;
  line-height: 1.65;
  word-wrap: break-word;
  box-shadow: var(--shadow-card);
  transition: all 0.2s;
}

.message.user .content {
  background: var(--user-bubble);
  color: var(--user-bubble-text);
  border: none;
  border-radius: 18px;
  border-bottom-right-radius: 6px;
  box-shadow: var(--shadow-button);
}

.markdown-body :deep(h1) { font-size: 20px; margin: 16px 0 10px; color: var(--text-primary); font-weight: 700; }
.markdown-body :deep(h2) { font-size: 18px; margin: 14px 0 8px; color: var(--text-primary); font-weight: 600; }
.markdown-body :deep(p) { margin-bottom: 14px; }
.markdown-body :deep(p:last-child) { margin-bottom: 0; }
.markdown-body :deep(code) { 
  padding: 3px 8px; 
  background: var(--accent-light); 
  border-radius: 6px; 
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--accent-primary);
}
.markdown-body :deep(pre) { 
  margin: 14px 0; 
  padding: 16px; 
  background: var(--bg-tertiary); 
  border-radius: 12px; 
  overflow-x: auto; 
  border: 1px solid var(--border-color);
}
.markdown-body :deep(pre code) {
  background: none;
  padding: 0;
  color: var(--text-primary);
}
.markdown-body :deep(a) { 
  color: var(--accent-primary); 
  text-decoration: underline;
  text-underline-offset: 2px;
}
.markdown-body :deep(ul), .markdown-body :deep(ol) {
  padding-left: 20px;
  margin-bottom: 14px;
}
.markdown-body :deep(li) {
  margin-bottom: 6px;
}

.content.is-error {
  position: relative;
  overflow: hidden;
}

.content.is-error::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--error);
  opacity: 0.5;
  border-radius: 18px 0 0 18px;
}

.message-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 6px;
}

.timestamp { font-size: 11px; color: var(--text-muted); }
.meta-duration { 
  font-size: 11px; 
  color: var(--accent-primary); 
  display: flex; 
  align-items: center; 
  gap: 4px; 
}

.cursor { 
  animation: blink 1s infinite; 
  color: var(--accent-primary); 
  font-weight: 300;
  font-size: 14px;
}
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

.info-card {
  padding: 18px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  max-width: 380px;
  box-shadow: var(--shadow-card);
}

.card-header { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
.card-icon { 
  width: 44px; 
  height: 44px; 
  border-radius: 12px; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  font-size: 20px;
}
.weather-bg { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); }
.stock-bg { background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); }
.image-bg { background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%); }

.card-title { display: flex; flex-direction: column; }
.city, .stock-name { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.stock-code { font-size: 12px; color: var(--text-muted); font-family: monospace; }
.label { font-size: 12px; color: var(--text-tertiary); }

.weather-main { display: flex; align-items: baseline; gap: 14px; margin-bottom: 10px; }
.temperature { font-size: 36px; font-weight: 700; color: var(--text-primary); line-height: 1; }
.weather-desc { font-size: 15px; color: var(--text-secondary); }

.weather-details { display: flex; gap: 18px; font-size: 13px; color: var(--text-secondary); }

.stock-main { display: flex; align-items: baseline; gap: 14px; margin-bottom: 10px; }
.stock-price { font-size: 28px; font-weight: 700; color: var(--text-primary); }
.stock-change { 
  padding: 5px 10px; 
  border-radius: 8px; 
  font-size: 14px; 
  font-weight: 600;
}
.stock-change.up { background: var(--success-light); color: var(--success); }
.stock-change.down { background: var(--error-light); color: var(--error); }
.stock-details { display: flex; gap: 18px; font-size: 13px; color: var(--text-secondary); }

.generated-image { 
  width: 100%; 
  max-width: 400px; 
  border-radius: 12px; 
  box-shadow: var(--shadow-md);
}
.card-error { 
  padding: 14px; 
  background: var(--error-light); 
  border-radius: 10px; 
  color: var(--error); 
  font-size: 14px; 
}
</style>
