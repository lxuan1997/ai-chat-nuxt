import { d as defineEventHandler } from '../../../_/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'anymatch';
import 'node:crypto';

const status_get = defineEventHandler(() => {
  return {
    success: true,
    agent: {
      available: true,
      name: "AI Assistant",
      version: "1.0.0",
      tools: [
        { name: "weather", description: "\u67E5\u8BE2\u5929\u6C14\u4FE1\u606F", enabled: true },
        { name: "stock", description: "\u67E5\u8BE2\u80A1\u7968\u4FE1\u606F", enabled: true },
        { name: "gold", description: "\u67E5\u8BE2\u91D1\u4EF7\u4FE1\u606F", enabled: true },
        { name: "image", description: "\u751F\u6210\u56FE\u7247 (\u667A\u8C31)", enabled: true },
        { name: "video", description: "\u751F\u6210\u89C6\u9891 (\u667A\u8C31)", enabled: true }
      ]
    },
    features: {
      chat: true,
      rag: false,
      agent: true,
      streaming: true
    }
  };
});

export { status_get as default };
//# sourceMappingURL=status.get.mjs.map
