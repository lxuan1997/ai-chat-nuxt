import { defineComponent, ref, computed, watch, nextTick, mergeProps, unref, createVNode, resolveDynamicComponent, h, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrInterpolate, ssrRenderClass, ssrRenderList, ssrRenderVNode, ssrRenderComponent, ssrIncludeBooleanAttr, ssrRenderAttr, ssrRenderStyle } from 'vue/server-renderer';
import { _ as _export_sfc, b as useRuntimeConfig } from './server.mjs';
import { marked } from 'marked';
import hljs from 'highlight.js';
import '../_/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'anymatch';
import 'node:crypto';
import '../routes/renderer.mjs';
import 'vue-bundle-renderer/runtime';
import 'unhead/server';
import 'devalue';
import 'unhead/utils';
import 'unhead/plugins';
import 'vue-router';

function useChat() {
  const config = useRuntimeConfig();
  config.public.apiBaseUrl;
  const messages = ref([]);
  const isLoading = ref(false);
  const error = ref(null);
  const sendMessage = async (userMessage, options = {}) => {
    var _a, _b, _c, _d, _e, _f;
    const { model = "glm-4-flash", onUpdate, skipAddUser = false } = options;
    error.value = null;
    if (!skipAddUser) {
      const userMsg = {
        id: Date.now().toString(),
        role: "user",
        content: userMessage,
        timestamp: /* @__PURE__ */ new Date()
      };
      messages.value.push(userMsg);
    }
    isLoading.value = true;
    try {
      const chatMessages = messages.value.filter((m) => !m.loading).map((m) => ({
        role: m.role,
        content: m.content
      }));
      const requestBody = {
        messages: chatMessages,
        model,
        stream: true
      };
      const response = await fetch(`/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || `\u8BF7\u6C42\u5931\u8D25: ${response.status}`);
      }
      const aiMsg = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
        timestamp: /* @__PURE__ */ new Date(),
        loading: true
      };
      messages.value.push(aiMsg);
      const aiMessageIndex = messages.value.length - 1;
      isLoading.value = false;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.trim() === "") continue;
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              messages.value[aiMessageIndex].loading = false;
              return;
            }
            try {
              const parsed = JSON.parse(data);
              const delta = (_c = (_b = (_a = parsed.choices) == null ? void 0 : _a[0]) == null ? void 0 : _b.delta) == null ? void 0 : _c.content;
              if (delta) {
                messages.value[aiMessageIndex].content += delta;
                if (onUpdate) onUpdate(messages.value[aiMessageIndex].content);
              }
            } catch (e) {
            }
          }
        }
      }
      if (buffer) {
        const line = buffer.trim();
        if (line.startsWith("data: ") && line !== "data: [DONE]") {
          try {
            const data = JSON.parse(line.slice(6));
            const delta = (_f = (_e = (_d = data.choices) == null ? void 0 : _d[0]) == null ? void 0 : _e.delta) == null ? void 0 : _f.content;
            if (delta) messages.value[aiMessageIndex].content += delta;
          } catch (e) {
          }
        }
      }
      messages.value[aiMessageIndex].loading = false;
    } catch (err) {
      error.value = err.message;
      isLoading.value = false;
      const errorMsg = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: `\u51FA\u9519\u4E86: ${err.message}

\u8BF7\u68C0\u67E5:
1. \u540E\u7AEF\u670D\u52A1\u662F\u5426\u542F\u52A8
2. API Key \u662F\u5426\u6B63\u786E\u914D\u7F6E
3. \u7F51\u7EDC\u8FDE\u63A5\u662F\u5426\u6B63\u5E38`,
        timestamp: /* @__PURE__ */ new Date(),
        isError: true
      };
      messages.value.push(errorMsg);
    }
  };
  const clearMessages = () => {
    messages.value = [];
    error.value = null;
  };
  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages
  };
}
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "ChatMessage",
  __ssrInlineRender: true,
  props: {
    message: {}
  },
  setup(__props) {
    const props = __props;
    const isUser = computed(() => props.message.role === "user");
    const contentRef = ref(null);
    const cards = computed(() => props.message.cards || []);
    const weatherCards = computed(() => cards.value.filter((c) => {
      var _a;
      return ((_a = c.data) == null ? void 0 : _a.type) === "weather";
    }).map((c) => c.data));
    const stockCards = computed(() => cards.value.filter((c) => {
      var _a;
      return ((_a = c.data) == null ? void 0 : _a.type) === "stock";
    }).map((c) => c.data));
    const imageCards = computed(() => cards.value.filter((c) => {
      var _a;
      return ((_a = c.data) == null ? void 0 : _a.type) === "image";
    }).map((c) => c.data));
    marked.setOptions({ breaks: true, gfm: true });
    const renderMarkdown = (content) => marked.parse(content);
    const formatTime = (date) => {
      if (!date) return "";
      return new Date(date).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
    };
    const addCopyButtons = () => {
      if (!contentRef.value) return;
      const codeBlocks = contentRef.value.querySelectorAll("pre");
      codeBlocks.forEach((pre) => {
        var _a, _b;
        if ((_a = pre.parentElement) == null ? void 0 : _a.classList.contains("code-block-wrapper")) return;
        const code = pre.querySelector("code");
        if (!code) return;
        try {
          const highlighted = hljs.highlightAuto(code.textContent || "");
          code.innerHTML = highlighted.value;
        } catch {
        }
        const wrapper = (void 0).createElement("div");
        wrapper.className = "code-block-wrapper";
        (_b = pre.parentNode) == null ? void 0 : _b.insertBefore(wrapper, pre);
        wrapper.appendChild(pre);
      });
    };
    watch(() => props.message.content, () => {
      if (!props.message.isStreaming) nextTick(() => addCopyButtons());
    }, { immediate: true });
    return (_ctx, _push, _parent, _attrs) => {
      var _a, _b;
      _push(`<div${ssrRenderAttrs(mergeProps({
        class: ["message", { user: isUser.value, error: __props.message.isError }]
      }, _attrs))} data-v-7a8eb124><div class="message-avatar" data-v-7a8eb124><div class="${ssrRenderClass([isUser.value ? "user-avatar" : "ai-avatar", "avatar-icon"])}" data-v-7a8eb124>`);
      if (isUser.value) {
        _push(`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-v-7a8eb124><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" data-v-7a8eb124></path><circle cx="12" cy="7" r="4" data-v-7a8eb124></circle></svg>`);
      } else {
        _push(`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-v-7a8eb124><rect x="3" y="11" width="18" height="10" rx="2" data-v-7a8eb124></rect><circle cx="8.5" cy="16" r="1.5" fill="currentColor" data-v-7a8eb124></circle><circle cx="15.5" cy="16" r="1.5" fill="currentColor" data-v-7a8eb124></circle><path d="M8 4v3" data-v-7a8eb124></path><path d="M16 4v3" data-v-7a8eb124></path></svg>`);
      }
      _push(`</div></div><div class="message-content" data-v-7a8eb124>`);
      if (cards.value.length > 0) {
        _push(`<!--[--><!--[-->`);
        ssrRenderList(weatherCards.value, (card, index2) => {
          _push(`<div class="info-card weather-card" data-v-7a8eb124><div class="card-header" data-v-7a8eb124><div class="card-icon weather-bg" data-v-7a8eb124><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" data-v-7a8eb124><circle cx="12" cy="12" r="5" data-v-7a8eb124></circle><line x1="12" y1="1" x2="12" y2="3" data-v-7a8eb124></line><line x1="12" y1="21" x2="12" y2="23" data-v-7a8eb124></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" data-v-7a8eb124></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" data-v-7a8eb124></line><line x1="1" y1="12" x2="3" y2="12" data-v-7a8eb124></line><line x1="21" y1="12" x2="23" y2="12" data-v-7a8eb124></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" data-v-7a8eb124></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" data-v-7a8eb124></line></svg></div><div class="card-title" data-v-7a8eb124><span class="city" data-v-7a8eb124>${ssrInterpolate(card.city)}</span><span class="label" data-v-7a8eb124>\u5929\u6C14</span></div></div><div class="card-body" data-v-7a8eb124><div class="weather-main" data-v-7a8eb124><span class="temperature" data-v-7a8eb124>${ssrInterpolate(card.temperature)}</span><span class="weather-desc" data-v-7a8eb124>${ssrInterpolate(card.weather)}</span></div><div class="weather-details" data-v-7a8eb124><span data-v-7a8eb124>\u4F53\u611F ${ssrInterpolate(card.feelsLike)}</span><span data-v-7a8eb124>\u6E7F\u5EA6 ${ssrInterpolate(card.humidity)}</span><span data-v-7a8eb124>\u98CE\u529B ${ssrInterpolate(card.wind)}</span></div></div></div>`);
        });
        _push(`<!--]--><!--[-->`);
        ssrRenderList(stockCards.value, (card, index2) => {
          _push(`<div class="info-card stock-card" data-v-7a8eb124><div class="card-header" data-v-7a8eb124><div class="card-icon stock-bg" data-v-7a8eb124><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" data-v-7a8eb124><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" data-v-7a8eb124></polyline><polyline points="17 6 23 6 23 12" data-v-7a8eb124></polyline></svg></div><div class="card-title" data-v-7a8eb124><span class="stock-name" data-v-7a8eb124>${ssrInterpolate(card.name)}</span><span class="stock-code" data-v-7a8eb124>${ssrInterpolate(card.code)}</span></div></div><div class="card-body" data-v-7a8eb124><div class="stock-main" data-v-7a8eb124><span class="stock-price" data-v-7a8eb124>\xA5${ssrInterpolate(card.price)}</span><span class="${ssrRenderClass(["stock-change", card.isUp ? "up" : "down"])}" data-v-7a8eb124>${ssrInterpolate(card.isUp ? "\u2191" : "\u2193")} ${ssrInterpolate(card.changePercent)}% </span></div><div class="stock-details" data-v-7a8eb124><span data-v-7a8eb124>\u4ECA\u5F00 ${ssrInterpolate(card.open)}</span><span data-v-7a8eb124>\u6700\u9AD8 ${ssrInterpolate(card.high)}</span><span data-v-7a8eb124>\u6700\u4F4E ${ssrInterpolate(card.low)}</span></div></div></div>`);
        });
        _push(`<!--]--><!--[-->`);
        ssrRenderList(imageCards.value, (card, index2) => {
          _push(`<div class="info-card image-card" data-v-7a8eb124><div class="card-header" data-v-7a8eb124><div class="card-icon image-bg" data-v-7a8eb124><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" data-v-7a8eb124><rect x="3" y="3" width="18" height="18" rx="2" ry="2" data-v-7a8eb124></rect><circle cx="8.5" cy="8.5" r="1.5" data-v-7a8eb124></circle><polyline points="21 15 16 10 5 21" data-v-7a8eb124></polyline></svg></div><span class="card-title" data-v-7a8eb124>${ssrInterpolate(card.title)}</span></div><div class="card-body" data-v-7a8eb124>`);
          if (card.url) {
            _push(`<img${ssrRenderAttr("src", card.url)} alt="Generated Image" class="generated-image" data-v-7a8eb124>`);
          } else if (card.error) {
            _push(`<div class="card-error" data-v-7a8eb124><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="${ssrRenderStyle({ "display": "inline", "vertical-align": "middle", "margin-right": "4px" })}" data-v-7a8eb124><circle cx="12" cy="12" r="10" data-v-7a8eb124></circle><line x1="12" y1="8" x2="12" y2="12" data-v-7a8eb124></line><line x1="12" y1="16" x2="12.01" y2="16" data-v-7a8eb124></line></svg> ${ssrInterpolate(card.error)}</div>`);
          } else {
            _push(`<!---->`);
          }
          _push(`</div></div>`);
        });
        _push(`<!--]--><!--]-->`);
      } else {
        _push(`<!---->`);
      }
      if (!cards.value.length) {
        _push(`<div class="${ssrRenderClass([{ "is-error": __props.message.isError }, "content markdown-body"])}" data-v-7a8eb124>${(_a = renderMarkdown(__props.message.content)) != null ? _a : ""}</div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<div class="message-footer" data-v-7a8eb124>`);
      if (__props.message.timestamp) {
        _push(`<span class="timestamp" data-v-7a8eb124>${ssrInterpolate(formatTime(__props.message.timestamp))}</span>`);
      } else {
        _push(`<!---->`);
      }
      if ((_b = __props.message.meta) == null ? void 0 : _b.duration) {
        _push(`<span class="meta-duration" data-v-7a8eb124><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-v-7a8eb124><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" data-v-7a8eb124></path></svg> ${ssrInterpolate(__props.message.meta.duration)}</span>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div>`);
      if (__props.message.isStreaming) {
        _push(`<span class="cursor" data-v-7a8eb124>\u258B</span>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div></div>`);
    };
  }
});
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/ChatMessage.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const ChatMessage = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__scopeId", "data-v-7a8eb124"]]);
const DEFAULT_MODEL = "glm-4-flash";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  __ssrInlineRender: true,
  setup(__props) {
    const inputMessage = ref("");
    const messagesContainer = ref(null);
    const textareaRef = ref(null);
    const backendStatus = ref("checking");
    const fabOpen = ref(false);
    const { messages, isLoading } = useChat();
    const hasMessages = computed(() => messages.value.length > 0);
    const getPromptIcon = (icon) => {
      const icons = {
        image: () => h("svg", { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": 2 }, [
          h("rect", { x: 3, y: 3, width: 18, height: 18, rx: 2 }),
          h("circle", { cx: 8.5, cy: 8.5, r: 1.5 }),
          h("path", { d: "M21 15l-5-5L5 21" })
        ]),
        cloud: () => h("svg", { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": 2 }, [
          h("path", { d: "M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" })
        ]),
        edit: () => h("svg", { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": 2 }, [
          h("path", { d: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" }),
          h("path", { d: "M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" })
        ])
      };
      return icons[icon] || icons.edit;
    };
    const adjustTextareaHeight = () => {
      const textarea = textareaRef.value;
      if (!textarea) return;
      textarea.style.height = "auto";
      const newHeight = Math.min(Math.max(textarea.scrollHeight, 44), 160);
      textarea.style.height = `${newHeight}px`;
    };
    watch(inputMessage, () => {
      nextTick(() => adjustTextareaHeight());
    });
    const scrollToBottom = () => {
      nextTick(() => {
        var _a;
        (_a = messagesContainer.value) == null ? void 0 : _a.scrollTo({
          top: messagesContainer.value.scrollHeight,
          behavior: "smooth"
        });
      });
    };
    watch(messages, scrollToBottom, { deep: true });
    const quickPrompts = [
      { label: "\u5E2E\u6211\u753B\u4E00\u5E45\u98CE\u666F\u753B", icon: "image" },
      { label: "\u4ECA\u5929\u5317\u4EAC\u5929\u6C14\u600E\u4E48\u6837", icon: "cloud" },
      { label: "\u5E2E\u6211\u5199\u4E00\u9996\u8BD7", icon: "edit" }
    ];
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "chat-view" }, _attrs))} data-v-7eb20213><header class="chat-header" data-v-7eb20213><div class="header-left" data-v-7eb20213><h1 class="page-title" data-v-7eb20213>\u5BF9\u8BDD</h1><span class="model-tag" data-v-7eb20213>${ssrInterpolate(DEFAULT_MODEL)}</span></div><div class="header-right" data-v-7eb20213><div class="${ssrRenderClass([backendStatus.value, "connection-status"])}" data-v-7eb20213><span class="status-dot" data-v-7eb20213></span><span class="status-text" data-v-7eb20213>${ssrInterpolate(backendStatus.value === "connected" ? "\u5DF2\u8FDE\u63A5" : "\u672A\u8FDE\u63A5")}</span></div>`);
      if (hasMessages.value) {
        _push(`<button class="clear-btn" title="\u6E05\u7A7A\u5BF9\u8BDD" data-v-7eb20213><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-v-7eb20213><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" data-v-7eb20213></path></svg></button>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div></header><div class="messages-wrapper" data-v-7eb20213>`);
      if (!hasMessages.value && !unref(isLoading)) {
        _push(`<div class="empty-state" data-v-7eb20213><div class="empty-avatar" data-v-7eb20213><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" data-v-7eb20213><rect x="3" y="11" width="18" height="10" rx="2" data-v-7eb20213></rect><circle cx="8.5" cy="16" r="1.5" fill="currentColor" stroke="none" data-v-7eb20213></circle><circle cx="15.5" cy="16" r="1.5" fill="currentColor" stroke="none" data-v-7eb20213></circle><path d="M8 4v3" data-v-7eb20213></path><path d="M16 4v3" data-v-7eb20213></path></svg></div><h2 class="empty-title" data-v-7eb20213>\u4F60\u597D\uFF0C\u6211\u662F AI \u52A9\u624B</h2><p class="empty-desc" data-v-7eb20213>\u6211\u53EF\u4EE5\u5E2E\u4F60\u56DE\u7B54\u95EE\u9898\u3001\u751F\u6210\u56FE\u7247\u3001\u67E5\u8BE2\u5929\u6C14\u7B49</p><div class="quick-prompts" data-v-7eb20213><!--[-->`);
        ssrRenderList(quickPrompts, (prompt) => {
          _push(`<button class="prompt-btn" data-v-7eb20213>`);
          ssrRenderVNode(_push, createVNode(resolveDynamicComponent(getPromptIcon(prompt.icon)), null, null), _parent);
          _push(` ${ssrInterpolate(prompt.label)}</button>`);
        });
        _push(`<!--]--></div></div>`);
      } else {
        _push(`<div class="messages-list" data-v-7eb20213><!--[-->`);
        ssrRenderList(unref(messages), (message, index2) => {
          _push(ssrRenderComponent(ChatMessage, {
            key: message.id,
            message,
            style: { animationDelay: `${index2 * 50}ms` },
            class: "message-animate"
          }, null, _parent));
        });
        _push(`<!--]-->`);
        if (unref(isLoading)) {
          _push(`<div class="loading-state" data-v-7eb20213><div class="message loading-message" data-v-7eb20213><div class="message-avatar" data-v-7eb20213><div class="avatar-icon ai-avatar" data-v-7eb20213><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-v-7eb20213><rect x="3" y="11" width="18" height="10" rx="2" data-v-7eb20213></rect><circle cx="8.5" cy="16" r="1.5" fill="currentColor" data-v-7eb20213></circle><circle cx="15.5" cy="16" r="1.5" fill="currentColor" data-v-7eb20213></circle><path d="M8 4v3" data-v-7eb20213></path><path d="M16 4v3" data-v-7eb20213></path></svg></div></div><div class="message-content" data-v-7eb20213><div class="skeleton-loader" data-v-7eb20213><div class="skeleton-line" data-v-7eb20213></div><div class="skeleton-line short" data-v-7eb20213></div></div></div></div></div>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</div>`);
      }
      _push(`</div><div class="input-wrapper" data-v-7eb20213><div class="input-container" data-v-7eb20213><textarea placeholder="\u8F93\u5165\u6D88\u606F\uFF0CEnter \u53D1\u9001\uFF0CShift + Enter \u6362\u884C..."${ssrIncludeBooleanAttr(unref(isLoading)) ? " disabled" : ""} rows="1" data-v-7eb20213>${ssrInterpolate(inputMessage.value)}</textarea><button class="send-btn"${ssrIncludeBooleanAttr(!inputMessage.value.trim() || unref(isLoading)) ? " disabled" : ""} data-v-7eb20213><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-v-7eb20213><line x1="22" y1="2" x2="11" y2="13" data-v-7eb20213></line><polygon points="22 2 15 22 11 13 2 9 22 2" data-v-7eb20213></polygon></svg></button></div><p class="input-hint" data-v-7eb20213>AI \u52A9\u624B\u53EF\u80FD\u4F1A\u4EA7\u751F\u9519\u8BEF\u4FE1\u606F\uFF0C\u8BF7\u6838\u5B9E\u91CD\u8981\u5185\u5BB9</p></div><div class="${ssrRenderClass([{ active: fabOpen.value }, "fab"])}" data-v-7eb20213><button class="fab-main" data-v-7eb20213>`);
      if (!fabOpen.value) {
        _push(`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-v-7eb20213><path d="M12 5v14M5 12h14" data-v-7eb20213></path></svg>`);
      } else {
        _push(`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-v-7eb20213><path d="M18 6L6 18M6 6l12 12" data-v-7eb20213></path></svg>`);
      }
      _push(`</button><div class="fab-menu" data-v-7eb20213><button class="fab-item" title="\u751F\u6210\u56FE\u7247" data-v-7eb20213><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-v-7eb20213><rect x="3" y="3" width="18" height="18" rx="2" data-v-7eb20213></rect><circle cx="8.5" cy="8.5" r="1.5" data-v-7eb20213></circle><path d="M21 15l-5-5L5 21" data-v-7eb20213></path></svg></button><button class="fab-item" title="\u4E0A\u4F20\u6587\u4EF6" data-v-7eb20213><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-v-7eb20213><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" data-v-7eb20213></path><polyline points="17 8 12 3 7 8" data-v-7eb20213></polyline><line x1="12" y1="3" x2="12" y2="15" data-v-7eb20213></line></svg></button><button class="fab-item" title="\u8BED\u97F3\u8F93\u5165" data-v-7eb20213><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-v-7eb20213><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" data-v-7eb20213></path><path d="M19 10v2a7 7 0 01-14 0v-2" data-v-7eb20213></path><line x1="12" y1="19" x2="12" y2="23" data-v-7eb20213></line><line x1="8" y1="23" x2="16" y2="23" data-v-7eb20213></line></svg></button></div></div></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/index.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-7eb20213"]]);

export { index as default };
//# sourceMappingURL=index-C7b_YqwS.mjs.map
