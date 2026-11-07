// ===== 数据存储（JSON 文件） =====
// 先用最简单的方式：每张「表」是一个 JSON 文件，常驻内存，改动后写盘（先写临时文件再改名，防止写一半断电）。
// 玩家存档每人一个文件。以后人多了，可以把这个类换成数据库实现，接口保持不变即可。
'use strict';
const fs = require('fs');
const path = require('path');

class Store {
  constructor(dir) {
    this.dir = dir;
    fs.mkdirSync(path.join(dir, 'saves'), { recursive: true });
    this.tables = {};
    this.timers = {};
  }
  file(name) { return path.join(this.dir, name + '.json'); }
  // 读一张表（不存在就用默认值）
  table(name, dflt) {
    if (!this.tables[name]) {
      let v = null;
      try { v = JSON.parse(fs.readFileSync(this.file(name), 'utf8')); } catch (e) { v = null; }
      this.tables[name] = v || (typeof dflt === 'function' ? dflt() : (dflt || {}));
    }
    return this.tables[name];
  }
  // 标记修改，稍后写盘（合并短时间内的多次修改）
  touch(name) {
    if (this.timers[name]) return;
    this.timers[name] = setTimeout(() => { delete this.timers[name]; this.flush(name); }, 200);
  }
  flush(name) { if (this.tables[name]) writeAtomic(this.file(name), JSON.stringify(this.tables[name])); }
  flushAll() { for (const n of Object.keys(this.timers)) { clearTimeout(this.timers[n]); delete this.timers[n]; this.flush(n); } }
  // 玩家存档：一人一个文件
  saveFile(uid) { return path.join(this.dir, 'saves', String(uid).replace(/[^\w-]/g, '') + '.json'); }
  readSave(uid) { try { return JSON.parse(fs.readFileSync(this.saveFile(uid), 'utf8')); } catch (e) { return null; } }
  writeSave(uid, rec) { writeAtomic(this.saveFile(uid), JSON.stringify(rec)); }
}
function writeAtomic(file, text) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, file);
}
module.exports = { Store };
