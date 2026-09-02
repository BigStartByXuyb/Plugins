#!/usr/bin/env node
/**
 * check-iocontrol-coords.js —— IOContorl 页面坐标核对器（mastergo-to-wpf skill 新模式）
 *
 * 核对生成的页面 XML 的几何（Left/Top/Width/Height）与设计稿节点 bbox 是否逐项一致。
 * 这是新模式的"必做检查"，地位等同旧模式的 scan-icon-coords.js。
 *
 * 节点输入 JSON（由 LLM 从 MasterGo section DSL 机械抄录 page-absolute bbox）：
 *   [
 *     { "id": "dsl-node-id（与 XML 的 ID 属性一致；XML 无 ID 的节点用 ref）",
 *       "x": 10, "y": 35, "w": 160, "h": 150,          // 控件自身 page-absolute bbox，double
 *       "contentOriginX": 0, "contentOriginY": 0 },       // 内容区原点，只扣除一次
 *     ...
 *   ]
 * 对照规则：XML.Left ≈ x - contentOriginX，XML.Top ≈ y - contentOriginY，XML.Width ≈ w，XML.Height ≈ h
 * （容差 --tolerance 默认 0.5）；NaN 对 NaN/缺失 算匹配。
 *
 * 用法：
 *   node check-iocontrol-coords.js --xml <page.xml> --nodes <nodes.json> [--tolerance 0.5]
 * 退出码：0 = 全部匹配；1 = 存在 MISMATCH/MISSING；2 = 参数或文件错误。
 */
'use strict';

const fs = require('fs');

const args = process.argv.slice(2);
function argVal(flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
}
const xmlPath = argVal('--xml');
const nodesPath = argVal('--nodes');
const tolerance = parseFloat(argVal('--tolerance') || '0.5');

if (!xmlPath || !nodesPath) {
  console.error('用法: node check-iocontrol-coords.js --xml <page.xml> --nodes <nodes.json> [--tolerance 0.5]');
  process.exit(2);
}
if (!fs.existsSync(xmlPath) || !fs.existsSync(nodesPath)) {
  console.error('文件不存在: ' + (!fs.existsSync(xmlPath) ? xmlPath : nodesPath));
  process.exit(2);
}

const xml = fs.readFileSync(xmlPath, 'utf8');
const nodes = JSON.parse(fs.readFileSync(nodesPath, 'utf8'));
if (!Array.isArray(nodes)) {
  console.error('nodes JSON 必须是数组');
  process.exit(2);
}

// 提取所有 <IOContorl .../> 叶子/开标签的属性表
const tagRe = /<IOContorl\b([^<>]*?)(\/)?>/g;
const attrRe = /([A-Za-z][\w]*)\s*=\s*"([^"]*)"/g;
const xmlNodes = [];
let m;
while ((m = tagRe.exec(xml)) !== null) {
  const attrs = {};
  let a;
  while ((a = attrRe.exec(m[1])) !== null) attrs[a[1]] = a[2];
  if (attrs.ID === '' && !attrs.ControlType) continue; // 跳过根节点
  if (attrs.ID || attrs.ControlType || attrs.Left !== undefined) xmlNodes.push(attrs);
}

function num(v) {
  if (v === undefined || v === null || v === '') return null;
  if (v === 'NaN') return 'NaN';
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
}
function close(a, b, tol) {
  if (a === 'NaN' || b === 'NaN') return a === b || a === 'NaN' || b === 'NaN';
  if (a === null && b === null) return true;        // 都未提供 → 匹配
  if (a === null || b === null) return false;       // 一边有值一边没有
  return Math.abs(a - b) <= tol;
}

const results = [];
let ok = 0, mismatch = 0, missing = 0, extra = 0, untracked = 0;

// 按 id / ref 匹配
const usedNode = new Set();
for (const xn of xmlNodes) {
  const key = xn.ID || null;
  let src = null;
  if (key) src = nodes.find(n => (n.id === key || n.ref === key) && !usedNode.has(n));
  // 禁止 ControlType + 坐标自动兜底：相同组件实例可能结构和坐标都相似，
  // 位置匹配会掩盖错误的实例/子节点来源绑定。必须使用唯一 ID/ref。
  if (!src) {
    untracked++;
    results.push(`UNTRACKED ID="${xn.ID || ''}" ControlType="${xn.ControlType || ''}" (XML 有、节点表无)`);
    continue;
  }
  usedNode.add(src);

  const xl = num(xn.Left), xt = num(xn.Top), xw = num(xn.Width), xh = num(xn.Height);
  const sl = num(src.x - (src.contentOriginX || 0)), st = num(src.y - (src.contentOriginY || 0)), sw = num(src.w), sh = num(src.h);
  const problems = [];
  if (!close(xl, sl, tolerance)) problems.push(`Left xml=${xl} dsl=${sl}`);
  if (!close(xt, st, tolerance)) problems.push(`Top xml=${xt} dsl=${st}`);
  if (!close(xw, sw, tolerance)) problems.push(`Width xml=${xw} dsl=${sw}`);
  if (!close(xh, sh, tolerance)) problems.push(`Height xml=${xh} dsl=${sh}`);

  if (problems.length === 0) {
    ok++;
    results.push(`OK id="${src.id || src.ref || '?'}" ${describe(xn)}`);
  } else {
    mismatch++;
    results.push(`MISMATCH id="${src.id || src.ref || '?'}" ${problems.join(', ')} | xml ${describe(xn)}`);
  }
}

for (const n of nodes) {
  if (!usedNode.has(n)) {
    extra++;
    results.push(`EXTRA id="${n.id || n.ref || '?'}" x=${n.x} y=${n.y} w=${n.w} h=${n.h} (节点表有、XML 无)`);
  }
}

function describe(a) {
  return `Left=${a.Left} Top=${a.Top} Width=${a.Width} Height=${a.Height} (${a.ControlType || 'container'})`;
}

console.log(results.join('\n'));
console.log(`\n汇总: OK=${ok} MISMATCH=${mismatch} EXTRA=${extra} UNTRACKED=${untracked}`);
process.exit(mismatch > 0 || extra > 0 ? 1 : 0);
