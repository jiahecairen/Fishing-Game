// 日志
'use strict';
const t = () => new Date().toLocaleString('zh-CN', { hour12: false });
module.exports = {
  info: (...a) => console.log(`[${t()}]`, ...a),
  warn: (...a) => console.warn(`[${t()}] ⚠️`, ...a),
  error: (...a) => console.error(`[${t()}] ❌`, ...a),
};
