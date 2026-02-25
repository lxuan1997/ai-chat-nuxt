import { d as defineEventHandler, c as createError, r as readBody, s as setHeader, a as useRuntimeConfig } from '../../../_/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'anymatch';
import 'node:crypto';

const chat_post = defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const ZHIPU_API_KEY = config.zhipuApiKey;
  const ZHIPU_BASE_URL = config.zhipuBaseUrl;
  if (!ZHIPU_API_KEY || ZHIPU_API_KEY === "your_api_key_here") {
    throw createError({
      statusCode: 500,
      message: "API Key not configured"
    });
  }
  const body = await readBody(event);
  const { message } = body;
  if (!message) {
    throw createError({
      statusCode: 400,
      message: "Message is required"
    });
  }
  setHeader(event, "Content-Type", "text/event-stream");
  setHeader(event, "Cache-Control", "no-cache");
  setHeader(event, "Connection", "keep-alive");
  setHeader(event, "Access-Control-Allow-Origin", "*");
  const lowerMessage = message.toLowerCase();
  let responseContent = "";
  let toolUsed = false;
  let toolName = "";
  let toolResult = null;
  try {
    if (lowerMessage.includes("\u5929\u6C14") || lowerMessage.includes("weather")) {
      toolUsed = true;
      toolName = "weather";
      const cityMatch = message.match(/([省市區])?([^\s市省區]+)[市省區]?(?:的)?天气/);
      const city = cityMatch ? cityMatch[2] || "\u5317\u4EAC" : "\u5317\u4EAC";
      toolResult = await fetchWeather(city);
      responseContent = generateWeatherResponse(city, toolResult);
    } else if (lowerMessage.includes("\u80A1\u4EF7") || lowerMessage.includes("\u80A1\u7968") || lowerMessage.includes("stock")) {
      toolUsed = true;
      toolName = "stock";
      const codeMatch = message.match(/[A-Za-z]+/);
      const code = codeMatch ? codeMatch[0].toUpperCase() : "AAPL";
      toolResult = await fetchStock(code);
      responseContent = generateStockResponse(code, toolResult);
    } else if (lowerMessage.includes("\u91D1\u4EF7") || lowerMessage.includes("\u9EC4\u91D1") || lowerMessage.includes("gold")) {
      toolUsed = true;
      toolName = "gold";
      toolResult = await fetchGold();
      responseContent = generateGoldResponse(toolResult);
    } else if (lowerMessage.includes("\u753B") || lowerMessage.includes("\u751F\u6210\u56FE\u7247") || lowerMessage.includes("image")) {
      toolUsed = true;
      toolName = "image";
      const imagePrompt = message.replace(/.*[画生成创建].*?(?:图片|图|image|picture).*?\s*/i, "").trim() || message;
      toolResult = await generateImage(imagePrompt, ZHIPU_API_KEY, ZHIPU_BASE_URL);
      responseContent = generateImageResponse(imagePrompt, toolResult);
    } else if (lowerMessage.includes("\u89C6\u9891") || lowerMessage.includes("video")) {
      toolUsed = true;
      toolName = "video";
      const videoPrompt = message.replace(/.*[生成创建].*?(?:视频|video).*?\s*/i, "").trim() || message;
      toolResult = await generateVideo(videoPrompt, ZHIPU_API_KEY, ZHIPU_BASE_URL);
      responseContent = generateVideoResponse(videoPrompt, toolResult);
    } else {
      const messages = [
        { role: "system", content: "\u4F60\u662F\u4E00\u4E2A\u667A\u80FD\u52A9\u624B\uFF0C\u8BF7\u7B80\u6D01\u53CB\u597D\u5730\u56DE\u7B54\u7528\u6237\u95EE\u9898\u3002" },
        { role: "user", content: message }
      ];
      const response = await $fetch(ZHIPU_BASE_URL + "/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ZHIPU_API_KEY}`
        },
        body: {
          model: "glm-4-flash",
          messages,
          stream: true,
          temperature: 0.7
        },
        responseType: "stream"
      });
      const reader = response.getReader();
      const decoder = new TextDecoder();
      const stream2 = new ReadableStream({
        async start(controller) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              controller.enqueue(value);
            }
          } catch (error) {
            controller.error(error);
          } finally {
            reader.releaseLock();
            controller.close();
          }
        }
      });
      return stream2;
    }
    const result = {
      success: true,
      message,
      response: responseContent,
      toolUsed,
      toolName,
      toolResult,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    const data = `data: ${JSON.stringify(result)}

`;
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(data));
        controller.close();
      }
    });
    return stream;
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: error.message || "Agent processing failed"
    });
  }
});
async function fetchWeather(city) {
  return {
    city,
    temperature: "22\xB0C",
    weather: "\u6674\u6717",
    feelsLike: "24\xB0C",
    humidity: "45%",
    wind: "3\u7EA7"
  };
}
function generateWeatherResponse(city, data) {
  return `\u3010${city}\u5929\u6C14\u3011

\u{1F321}\uFE0F \u6E29\u5EA6\uFF1A${data.temperature}
\u2600\uFE0F \u5929\u6C14\uFF1A${data.weather}
\u{1F321}\uFE0F \u4F53\u611F\uFF1A${data.feelsLike}
\u{1F4A7} \u6E7F\u5EA6\uFF1A${data.humidity}
\u{1F32C}\uFE0F \u98CE\u529B\uFF1A${data.wind}`;
}
async function fetchStock(code) {
  return {
    code,
    name: code + " Company",
    price: "156.78",
    change: "+2.34%",
    isUp: true,
    open: "154.20",
    high: "158.50",
    low: "153.80"
  };
}
function generateStockResponse(code, data) {
  return `\u3010${code}\u80A1\u7968\u4FE1\u606F\u3011

\u{1F4B0} \u4EF7\u683C\uFF1A\xA5${data.price}
\u{1F4C8} \u6DA8\u8DCC\uFF1A${data.change}
\u{1F4CA} \u4ECA\u5F00\uFF1A${data.open}
\u{1F4C8} \u6700\u9AD8\uFF1A${data.high}
\u{1F4C9} \u6700\u4F4E\uFF1A${data.low}`;
}
async function fetchGold() {
  return {
    price: "545.80",
    unit: "\u5143/\u514B",
    change: "+1.23%",
    isUp: true
  };
}
function generateGoldResponse(data) {
  return `\u3010\u9EC4\u91D1\u4EF7\u683C\u3011

\u{1F4B0} \u4EF7\u683C\uFF1A${data.price} ${data.unit}
\u{1F4C8} \u6DA8\u8DCC\uFF1A${data.change}`;
}
async function generateImage(prompt, apiKey, baseUrl) {
  try {
    const response = await $fetch(baseUrl + "/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: {
        model: "cogview-3",
        prompt,
        size: "1024x1024"
      }
    });
    return response;
  } catch (error) {
    return { error: error.message || "\u56FE\u7247\u751F\u6210\u6682\u65F6\u4E0D\u53EF\u7528" };
  }
}
function generateImageResponse(prompt, result) {
  var _a, _b;
  if ((_b = (_a = result.data) == null ? void 0 : _a[0]) == null ? void 0 : _b.url) {
    return `\u2705 \u5DF2\u4E3A\u60A8\u751F\u6210\u56FE\u7247\uFF1A${prompt}

\u{1F5BC}\uFE0F \u56FE\u7247\u5730\u5740\uFF1A${result.data[0].url}`;
  }
  return `\u26A0\uFE0F \u56FE\u7247\u751F\u6210\uFF1A${result.error || "\u6682\u65F6\u65E0\u6CD5\u751F\u6210\u56FE\u7247\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5"}`;
}
async function generateVideo(prompt, apiKey, baseUrl) {
  try {
    const response = await $fetch(baseUrl + "/video/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: {
        model: "cogvideo",
        prompt
      }
    });
    return response;
  } catch (error) {
    return { error: error.message || "\u89C6\u9891\u751F\u6210\u6682\u65F6\u4E0D\u53EF\u7528", task_status: "ERROR" };
  }
}
function generateVideoResponse(prompt, result) {
  var _a, _b;
  if (result.task_status === "SUCCESS" && ((_b = (_a = result.video_result) == null ? void 0 : _a[0]) == null ? void 0 : _b.url)) {
    return `\u2705 \u5DF2\u4E3A\u60A8\u751F\u6210\u89C6\u9891\uFF1A${prompt}

\u{1F3AC} \u89C6\u9891\u5730\u5740\uFF1A${result.video_result[0].url}`;
  }
  return `\u26A0\uFE0F \u89C6\u9891\u751F\u6210\uFF1A${result.error || "\u6682\u65F6\u65E0\u6CD5\u751F\u6210\u89C6\u9891\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5"}

\u72B6\u6001\uFF1A${result.task_status || "\u672A\u77E5"}`;
}

export { chat_post as default };
//# sourceMappingURL=chat.post.mjs.map
