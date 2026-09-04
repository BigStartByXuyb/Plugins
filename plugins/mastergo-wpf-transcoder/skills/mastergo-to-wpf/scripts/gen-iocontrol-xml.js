#!/usr/bin/env node
/**
 * gen-iocontrol-xml.js —— IOContorl 页面 XML 发射器（mastergo-to-wpf skill 新模式）
 *
 * 两种模式：
 *   --fresh               从映射 JSON 全新渲染页面 XML
 *   --merge <现有XML>     按 merge 语义更新现有页面（当前主路径）
 *
 * 映射 JSON 输入格式（由 LLM 从 MasterGo section DSL 逐节点建立，bbox 值机械抄录）：
 * {
 *   "comment": "页面中文名（可选，写进 xml 声明后的注释）",
 *   "nodes": [
 *     {
 *       "ref": "dsl-node-id 或任意唯一键（供核对器与父子引用用）",
 *       "sourceRef": "真实 MasterGo TEXT ref（TextBlock 必填）",
 *       "sourceText": "DSL 原文（TextBlock 必填）",
 *       "valueSource": "dsl.text（TextBlock 必须为此值）",
 *       "id": "XML ID 属性值（可选；省略则节点不带 ID）",
 *       "controlType": "IconButton | GroupBox | ...（可选；缺省=无 ControlType 布局容器）",
 *       "parent": null | "某节点 ref"（null = 页面根 IOContorl 的直接子级）",
 *       "absX": 10, "absY": 35,          // 页面绝对 bbox（double）
 *       "w": 160, "h": 150,              // 可省略（无宽高）；NaN 原样输出
 *       "attrs": { "Style": "MainButtonStyle", "Value": "全自动操作", ... },  // 业务属性
 *       "comment": "第一行（可选，渲染在该节点前一行）"
 *     }
 *   ]
 * }
 *
 * 坐标规则：Left = absX - parentAbsX，Top = normalizedY(absY) - parentAbsY，设计稿像素 1:1 直传。
 * 页面坐标固定扣除顶部公共栏 126px，再扣除被剥离的示例标题 66px；总偏移 192px。
 *
 * merge 语义（改现有页面的强制模式）：
 *   1. 几何（Left/Top/Width/Height）按映射更新；
 *   2. ControlType 按映射更新（变化时写冲突报告）；
 *   3. 业务属性：现有 XML 已有同名的 → 一律保留现有值（值不同写冲突报告，不覆盖）；
 *      现有 XML 没有的 → 按映射新增（写新增报告）；
 *   4. 映射中不存在的现有节点 → 原样保留（写"现有但设计稿无"报告）；
 *   5. 全新节点 → 按映射渲染，插入其父节点闭合标签之前。
 *
 * 用法：
 *   node gen-iocontrol-xml.js --fresh <mapping.json> [--out X.xml]
 *   node gen-iocontrol-xml.js --merge <existing.xml> <mapping.json> [--out X.xml]
 */
'use strict';

const fs = require('fs');

// ---------- 参数 ----------
function usage() {
  console.error('用法:');
  console.error('  node gen-iocontrol-xml.js --fresh <mapping.json> [--out X.xml]');
  console.error('  node gen-iocontrol-xml.js --merge <existing.xml> <mapping.json> [--out X.xml]');
  process.exit(2);
}

const args = process.argv.slice(2);
let mode = null, existingPath = null, mappingPath = null, outPath = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--fresh') mode = 'fresh';
  else if (args[i] === '--merge') { mode = 'merge'; existingPath = args[++i]; }
  else if (args[i] === '--out') outPath = args[++i];
  else if (!mappingPath) mappingPath = args[i];
  else usage();
}
if (!mode || !mappingPath) usage();
if (mode === 'merge' && !existingPath) usage();

const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
const nodes = mapping.nodes || [];
const TOP_PUBLIC_BAR_Y = 126;
const TOP_ARTIFACT_TITLE_Y = 66;
const contentOriginY = TOP_PUBLIC_BAR_Y + TOP_ARTIFACT_TITLE_Y;

function validateFreshMapping() {
  if (!Array.isArray(mapping.sourceNodes)) {
    throw new Error('映射门禁失败: 缺少 sourceNodes，不能证明映射来自真实 DSL');
  }
  const sourceMap = new Map(mapping.sourceNodes.map(n => [n.ref, n]));
  const seenRefs = new Set();
  for (const n of nodes) {
    if (!n.ref || seenRefs.has(n.ref)) throw new Error('映射门禁失败: 每个节点必须有唯一 ref: ' + (n.ref || '(missing)'));
    seenRefs.add(n.ref);
    if (!sourceMap.has(n.sourceRef || n.ref)) {
      throw new Error('映射门禁失败: ' + n.ref + ' 没有对应 sourceNodes 记录');
    }
    if (n.sourceParent !== undefined) {
      const src = sourceMap.get(n.sourceRef || n.ref);
      if (n.sourceParent !== (src.parentRef || null)) {
        throw new Error('映射门禁失败: ' + n.ref + ' 的 sourceParent 不是 DSL 直接父节点');
      }
    }
    for (const field of ['absX', 'absY']) {
      if (typeof n[field] !== 'number' || !Number.isFinite(n[field])) {
        throw new Error('映射门禁失败: ' + n.ref + ' 缺少真实 ' + field + '，禁止猜坐标');
      }
    }
    if (n.w !== undefined && (typeof n.w !== 'number' || !Number.isFinite(n.w))) {
      throw new Error('映射门禁失败: ' + n.ref + ' 的 Width 不是同一 DSL bbox 的数值');
    }
    if (n.h !== undefined && (typeof n.h !== 'number' || !Number.isFinite(n.h))) {
      throw new Error('映射门禁失败: ' + n.ref + ' 的 Height 不是同一 DSL bbox 的数值');
    }
    if (n.w === undefined || n.h === undefined) {
      throw new Error('映射门禁失败: ' + n.ref + ' 缺少 Width/Height bbox，禁止猜尺寸');
    }
    const type = n.controlType || (n.attrs && n.attrs.ControlType);
    if (type === 'TextBlock') {
      if (typeof n.sourceRef !== 'string' || !n.sourceRef) {
        throw new Error('映射门禁失败: TextBlock ' + n.ref + ' 缺少 sourceRef');
      }
      if (typeof n.sourceText !== 'string') {
        throw new Error('映射门禁失败: TextBlock ' + n.ref + ' 缺少 sourceText');
      }
      if (n.valueSource !== 'dsl.text') {
        throw new Error('映射门禁失败: TextBlock ' + n.ref + ' 的 valueSource 必须是 dsl.text');
      }
      if (n.attrs && n.attrs.Value !== undefined && n.attrs.Value !== n.sourceText) {
        throw new Error('映射门禁失败: ' + n.ref + ' 的 Value 不等于 sourceText');
      }
    }
  }
}

// ---------- 工具 ----------
function fmtNum(n) {
  if (n === null || n === undefined) return null;
  if (typeof n === 'number' && Number.isNaN(n)) return 'NaN';
  const num = Number(n);
  if (Number.isNaN(num)) return String(n);
  return String(Number(num.toFixed(4))); // 去浮点噪声、整数值不带小数点
}

function escAttr(v) {
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizedY(y) {
  return Number(y) - contentOriginY;
}

// 属性渲染顺序：对齐 HomeContentPage.xml 惯例（业务属性在前、几何在后）
const ATTR_ORDER = [
  'ID', 'ControlType', 'Style', 'Icon', 'LangName', 'PageName', 'TopLeftContent', 'Value',
  'Header', 'IOName', 'IOCommand', 'IOParam', 'IOStyle', 'IOState', 'IOEnable', 'IOVisible',
  'IOGroup', 'IsAutoRead', 'IsAutoWrite', 'IsAutoRefresh', 'IsWriteIO', 'IsSave',
  'IsShowDialog', 'DialogMessage', 'IsShowStatus', 'IsNeedRedMark', 'StatusBrush',
  'Foreground', 'FontSize', 'Orientation', 'ItemsSourceFile', 'DisplayMemberPath',
  'SelectedValuePath', 'Filter', 'DefaultValue', 'MinValue', 'MaxValue', 'MinRange',
  'MaxRange', 'DecimalPlaces', 'Keypad', 'MaxLength', 'DisableRow', 'DesignPanelID',
  'ParameterName', 'Left', 'Top', 'Width', 'Height',
];
const GEOM_ATTRS = ['Left', 'Top', 'Width', 'Height'];

function orderedEntries(attrMap) {
  const entries = Object.entries(attrMap).filter(([, v]) => v !== null && v !== undefined && v !== '');
  entries.sort((a, b) => {
    const ia = ATTR_ORDER.indexOf(a[0]);
    const ib = ATTR_ORDER.indexOf(b[0]);
    if (ia === -1 && ib === -1) return a[0] < b[0] ? -1 : 1;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  return entries;
}

// 单行风格：  <IOContorl a="1" b="2" />
// 多行风格（真实文件惯例）：
//   <IOContorl
//       a="1"
//       b="2" />
// firstPrefix：第一行（<IOContorl）前的前缀。替换场景 = ''（原始 gap 已含缩进）；
//              全新渲染/插入场景 = indent（无 gap 提供缩进）。
// innerPad：多行风格属性行的缩进前缀。
function renderTag(attrMap, firstPrefix, innerPad, selfClose, style) {
  const entries = orderedEntries(attrMap);
  const end = selfClose ? ' />' : '>';
  if (style === 'single') {
    return `${firstPrefix}<IOContorl ${entries.map(([k, v]) => `${k}="${escAttr(v)}"`).join(' ')}${end}`;
  }
  let s = `${firstPrefix}<IOContorl`;
  for (const [k, v] of entries) s += `\n${innerPad}${k}="${escAttr(v)}"`;
  return s + end;
}

// ---------- fresh 渲染（多行风格） ----------
function renderFresh() {
  const childMap = new Map();
  const rootChildren = [];
  for (const n of nodes) {
    const p = n.parent || null;
    if (p === null) rootChildren.push(n);
    else {
      if (!childMap.has(p)) childMap.set(p, []);
      childMap.get(p).push(n);
    }
  }

  const lines = [];
  lines.push('<?xml version="1.0" encoding="utf-8"?>');
  if (mapping.comment) lines.push(`<!-- ${mapping.comment} -->`);
  lines.push('<IOContorl');
  lines.push('    ID=""');
  lines.push('    Left="NaN"');
  lines.push('    Top="NaN"');
  lines.push('    Width="NaN"');
  lines.push('    Height="NaN">');

  const emit = (node, depth, parentAbsX, parentAbsY) => {
    const indent = '    '.repeat(depth);
    const attrMap = Object.assign({}, node.attrs || {});
    if (node.id) attrMap.ID = node.id;
    if (node.controlType) attrMap.ControlType = node.controlType;
    attrMap.Left = fmtNum(node.absX - parentAbsX);
    attrMap.Top = fmtNum(normalizedY(node.absY) - parentAbsY);
    if (node.w !== undefined && node.w !== null) attrMap.Width = fmtNum(node.w);
    if (node.h !== undefined && node.h !== null) attrMap.Height = fmtNum(node.h);

    const kids = childMap.get(node.ref) || [];
    if (node.comment) lines.push(`${indent}<!-- ${node.comment} -->`);
    if (kids.length > 0) {
      lines.push(renderTag(attrMap, indent, indent + '    ', false, 'multi'));
      for (const k of kids) emit(k, depth + 1, node.absX, normalizedY(node.absY));
      lines.push(`${indent}</IOContorl>`);
    } else {
      lines.push(renderTag(attrMap, indent, indent + '    ', true, 'multi'));
    }
  };
  for (const n of rootChildren) emit(n, 1, 0, 0);
  lines.push('</IOContorl>');
  return lines.join('\n') + '\n';
}

// ---------- merge 模式：标签块级解析（支持多行标签） ----------
const TOKEN_RE = /<!--[\s\S]*?-->|<[^>]+>/g;
const ATTR_RE = /([A-Za-z][\w]*)\s*=\s*"([^"]*)"/g;

function parseXmlText(text) {
  const tokens = [];
  const openStack = [];
  const openClose = new Map(); // open tokenIdx -> close tokenIdx
  let depth = 0;
  let lastEnd = 0;
  let m;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(text)) !== null) {
    if (m.index > lastEnd) tokens.push({ type: 'raw', raw: text.slice(lastEnd, m.index) });
    const chunk = m[0];
    if (chunk.startsWith('<!--')) {
      tokens.push({ type: 'comment', raw: chunk });
    } else {
      // 行首缩进：该标签起始所在行，tag 之前的部分
      const lineStart = text.lastIndexOf('\n', m.index - 1) + 1;
      const indent = text.slice(lineStart, m.index);
      const isClose = /^<\/\s*/.test(chunk);
      const selfClose = /\/\s*>$/.test(chunk) || isClose;
      const nameM = chunk.match(/^<\/?\s*([A-Za-z][\w:.-]*)/);
      const attrs = [];
      let a;
      while ((a = ATTR_RE.exec(chunk)) !== null) attrs.push({ name: a[1], value: a[2] });
      const token = {
        type: 'tag',
        raw: chunk,
        indent,
        name: nameM ? nameM[1] : 'IOContorl',
        attrs,
        isClose,
        isSelfClose: selfClose,
        depth: isClose ? depth - 1 : depth,
        attrMap: Object.fromEntries(attrs.map(x => [x.name, x.value])),
      };
      if (!isClose && !selfClose) {
        openStack.push(tokens.length);
        depth++;
      } else if (isClose) {
        depth--;
        const openIdx = openStack.pop();
        if (openIdx !== undefined) openClose.set(openIdx, tokens.length);
      }
      tokens.push(token);
    }
    lastEnd = TOKEN_RE.lastIndex;
  }
  if (lastEnd < text.length) tokens.push({ type: 'raw', raw: text.slice(lastEnd) });
  return { tokens, openClose };
}

function mergeMode() {
  const existingText = fs.readFileSync(existingPath, 'utf8');
  const { tokens, openClose } = parseXmlText(existingText);

  const report = { conflicts: [], added: [], updated: [], newNodes: [], unmapped: [] };
  const matchedOpenIdx = new Set();

  // 现有节点索引：ID → tokenIdx
  const idIndex = new Map();
  tokens.forEach((t, i) => {
    if (t.type === 'tag' && !t.isClose && t.attrMap.ID && t.attrMap.ID !== '') {
      idIndex.set(t.attrMap.ID, i);
    }
  });

  // 映射节点 → 渲染数据（几何相对坐标在匹配后重算）
  const absOf = new Map();
  nodes.forEach(n => absOf.set(n.ref, { absX: n.absX, absY: normalizedY(n.absY) }));

  function resolveParentAbs(n) {
    const p = n.parent || null;
    if (p === null) return { x: 0, y: 0 };
    const pn = absOf.get(p);
    if (!pn) throw new Error(`映射节点 parent 引用不存在: ${p}（来自 ref=${n.ref}）`);
    return { x: pn.absX, y: pn.absY };
  }

  const rendered = new Map(); // ref -> {n, attrMap, tokenIdx, matchKind}
  for (const n of nodes) {
    const pa = resolveParentAbs(n);
    const attrMap = Object.assign({}, n.attrs || {});
    if (n.id) attrMap.ID = n.id;
    if (n.controlType) attrMap.ControlType = n.controlType;
    attrMap.Left = fmtNum(n.absX - pa.x);
    attrMap.Top = fmtNum(normalizedY(n.absY) - pa.y);
    if (n.w !== undefined && n.w !== null) attrMap.Width = fmtNum(n.w);
    if (n.h !== undefined && n.h !== null) attrMap.Height = fmtNum(n.h);
    rendered.set(n.ref, { n, attrMap, tokenIdx: null, matchKind: null });
  }

  // 匹配：ID 优先，其次 ControlType + 坐标（容差 0.5）
  const positionCandidates = [];
  tokens.forEach((t, i) => {
    if (t.type === 'tag' && !t.isClose && t.attrMap.ControlType) {
      positionCandidates.push({ i, controlType: t.attrMap.ControlType, left: parseFloat(t.attrMap.Left), top: parseFloat(t.attrMap.Top) });
    }
  });

  for (const [ref, r] of rendered) {
    const n = r.n;
    let tokenIdx = null, matchKind = null;
    if (n.id && idIndex.has(n.id)) { tokenIdx = idIndex.get(n.id); matchKind = 'id'; }
    if (tokenIdx === null && n.controlType) {
      const pa = resolveParentAbs(n);
      const hit = positionCandidates.find(p =>
        !matchedOpenIdx.has(p.i) &&
        p.controlType === n.controlType &&
        Math.abs(p.left - (n.absX - pa.x)) <= 0.5 &&
        Math.abs(p.top - (normalizedY(n.absY) - pa.y)) <= 0.5);
      if (hit) { tokenIdx = hit.i; matchKind = 'position'; }
    }
    r.tokenIdx = tokenIdx;
    r.matchKind = matchKind;
    if (tokenIdx !== null) matchedOpenIdx.add(tokenIdx);
  }

  // 替换：几何/ControlType 按映射；业务属性保留现有、冲突报告
  const replacements = new Map(); // tokenIdx -> newChunk
  for (const { n, attrMap, tokenIdx, matchKind } of rendered.values()) {
    if (tokenIdx === null) continue;
    const t = tokens[tokenIdx];
    const finalAttrs = new Map();
    for (const a of t.attrs) finalAttrs.set(a.name, a.value);
    for (const k of GEOM_ATTRS) {
      if (attrMap[k] !== undefined && attrMap[k] !== null) {
        if (finalAttrs.has(k) && finalAttrs.get(k) !== attrMap[k]) {
          report.updated.push(`[${n.ref}] ${k}: "${finalAttrs.get(k)}" -> "${attrMap[k]}" (匹配:${matchKind})`);
        }
        finalAttrs.set(k, attrMap[k]);
      }
    }
    if (attrMap.ControlType !== undefined && finalAttrs.get('ControlType') !== attrMap.ControlType) {
      report.conflicts.push(`[${n.ref}] ControlType: 现有 "${finalAttrs.get('ControlType')}" vs 映射 "${attrMap.ControlType}" → 按映射更新`);
      finalAttrs.set('ControlType', attrMap.ControlType);
    }
    for (const [k, v] of Object.entries(attrMap)) {
      if (GEOM_ATTRS.includes(k) || k === 'ControlType' || k === 'ID') continue;
      if (finalAttrs.has(k)) {
        if (n.force && n.force.includes(k)) {
          if (finalAttrs.get(k) !== v) {
            report.conflicts.push(`[${n.ref}] ${k}: 现有 "${finalAttrs.get(k)}" -> 映射 "${v}"（force 强制覆盖）`);
          }
          finalAttrs.set(k, v);
        } else if (finalAttrs.get(k) !== v) {
          report.conflicts.push(`[${n.ref}] ${k}: 现有 "${finalAttrs.get(k)}" 保留（映射值 "${v}" 不覆盖）`);
        }
      } else {
        finalAttrs.set(k, v);
        report.added.push(`[${n.ref}] ${k}="${v}" 新增`);
      }
    }
    const style = t.raw.includes('\n') ? 'multi' : 'single';
    // 替换场景：行首缩进已在原始 gap 中，firstPrefix=''；属性行缩进按原标签缩进推导
    replacements.set(tokenIdx, renderTag(Object.fromEntries(finalAttrs), '', t.indent + '    ', t.isSelfClose, style));
  }

  // 现有但映射未涉及的节点
  tokens.forEach((t, i) => {
    if (t.type !== 'tag' || t.isClose) return;
    if (t.attrMap.ControlType && !matchedOpenIdx.has(i)) {
      report.unmapped.push(`ID="${t.attrMap.ID || ''}" ControlType="${t.attrMap.ControlType}" 保留原样`);
    }
  });

  // 新节点：计算深度与插入点
  const depthOf = new Map();
  const depthOfRef = (ref) => {
    if (depthOf.has(ref)) return depthOf.get(ref);
    const n = nodes.find(x => x.ref === ref);
    const d = (n && n.parent) ? depthOfRef(n.parent) + 1 : 1;
    depthOf.set(ref, d);
    return d;
  };

  const insertions = new Map(); // closeTokenIdx -> [chunks]
  for (const [ref, r] of rendered) {
    if (r.tokenIdx !== null) continue;
    const { n, attrMap } = r;
    const pa = resolveParentAbs(n);
    const attrMap2 = Object.assign({}, attrMap);
    attrMap2.Left = fmtNum(n.absX - pa.x);
    attrMap2.Top = fmtNum(normalizedY(n.absY) - pa.y);
    const indent = '    '.repeat(depthOfRef(ref));
    const kids = nodes.filter(k => (k.parent || null) === ref);

    const renderSub = (node, d) => {
      const pa2 = resolveParentAbs(node);
      const am = Object.assign({}, node.attrs || {});
      if (node.id) am.ID = node.id;
      if (node.controlType) am.ControlType = node.controlType;
      am.Left = fmtNum(node.absX - pa2.x);
      am.Top = fmtNum(normalizedY(node.absY) - pa2.y);
      if (node.w !== undefined && node.w !== null) am.Width = fmtNum(node.w);
      if (node.h !== undefined && node.h !== null) am.Height = fmtNum(node.h);
      const kk = nodes.filter(x => (x.parent || null) === node.ref);
      const ind = '    '.repeat(d);
      const parts = [];
      if (node.comment) parts.push(`${ind}<!-- ${node.comment} -->\n`);
      if (kk.length > 0) {
        parts.push(renderTag(am, ind, ind + '    ', false, 'multi') + '\n');
        for (const x of kk) parts.push(renderSub(x, d + 1));
        parts.push(`${ind}</IOContorl>\n`);
      } else {
        parts.push(renderTag(am, ind, ind + '    ', true, 'multi') + '\n');
      }
      return parts.join('');
    };

    let block = '';
    if (n.comment) block += `${indent}<!-- ${n.comment} -->\n`;
    if (kids.length > 0) {
      block += renderTag(attrMap2, indent, indent + '    ', false, 'multi') + '\n';
      for (const k of kids) block += renderSub(k, depthOfRef(ref) + 1);
      block += `${indent}</IOContorl>\n`;
    } else {
      block += renderTag(attrMap2, indent, indent + '    ', true, 'multi') + '\n';
    }

    // 插入点：父闭合标签（父为根 → 最后一个闭合标签；父是新节点 → 挂在该新块的插入点后）
    let closeIdx = null;
    const p = n.parent || null;
    if (p === null) {
      for (let i = tokens.length - 1; i >= 0; i--) {
        if (tokens[i].type === 'tag' && tokens[i].isClose) { closeIdx = i; break; }
      }
    } else {
      const pn = nodes.find(x => x.ref === p);
      if (pn && pn.id && idIndex.has(pn.id)) {
        const openIdx = idIndex.get(pn.id);
        if (openClose.has(openIdx)) closeIdx = openClose.get(openIdx);
      }
    }
    if (closeIdx !== null) {
      if (!insertions.has(closeIdx)) insertions.set(closeIdx, []);
      insertions.get(closeIdx).push(block);
    } else {
      // 父是新节点：挂到最后一个根级闭合标签前（保守回退）
      if (!insertions.has('root-pending')) insertions.set('root-pending', []);
      insertions.get('root-pending').push(block);
    }
    report.newNodes.push(`[${ref}] ${n.controlType || '(容器)'} 新增`);
  }

  // 组装输出
  const out = [];
  tokens.forEach((t, i) => {
    if (insertions.has(i)) out.push(...insertions.get(i));
    out.push(replacements.has(i) ? replacements.get(i) : t.raw);
  });
  const pending = insertions.get('root-pending');
  if (pending && pending.length) {
    const lastCloseIdx = out.map((x, i) => ({ x, i })).filter(o => typeof o.x === 'string' && /^\s*<\/IOContorl>\s*$/.test(o.x)).pop();
    if (lastCloseIdx) out.splice(lastCloseIdx.i, 0, ...pending);
  }

  return { text: out.join(''), report };
}

// ---------- 主流程 ----------
let outText, report = null;
if (mode === 'fresh') {
  validateFreshMapping();
  outText = renderFresh();
} else {
  const r = mergeMode();
  outText = r.text;
  report = r.report;
}

if (outPath) {
  fs.writeFileSync(outPath, outText, 'utf8');
  console.log(`OK -> ${outPath}`);
} else {
  process.stdout.write(outText);
}

if (report) {
  const list = (title, arr) => {
    if (arr.length) {
      console.error(`\n${title} (${arr.length}):`);
      arr.forEach(x => console.error(`  - ${x}`));
    }
  };
  console.error('\n--- merge 报告 ---');
  list('冲突（保留现有值）', report.conflicts);
  list('新增属性', report.added);
  list('几何/类型更新', report.updated);
  list('新增节点', report.newNodes);
  list('现有但设计稿无（原样保留）', report.unmapped);
}
