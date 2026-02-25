import { d as defineEventHandler } from '../../_/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'anymatch';
import 'node:crypto';

const models_get = defineEventHandler(() => {
  return {
    models: [
      { id: "glm-4-flash", name: "GLM-4-Flash", description: "\u514D\u8D39\u5FEB\u901F\u6A21\u578B", free: true },
      { id: "glm-4-air", name: "GLM-4-Air", description: "\u9AD8\u6027\u80FD\u6A21\u578B", free: false },
      { id: "glm-4-airx", name: "GLM-4-AirX", description: "\u957F\u6587\u672C\u6A21\u578B", free: false },
      { id: "glm-4-plus", name: "GLM-4-Plus", description: "\u9876\u7EA7\u65D7\u8230\u6A21\u578B", free: false }
    ]
  };
});

export { models_get as default };
//# sourceMappingURL=models.get.mjs.map
