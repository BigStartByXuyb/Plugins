#!/usr/bin/env node
/**
 * Validate IOContorl text provenance and geometry evidence.
 * Mapping format: { contentOriginY, sourceNodes: [{ ref, parentRef,
 * pageAbsX, pageAbsY, relativeX, relativeY, width, height, text }],
 * nodes: [{ xmlId, sourceRef, sourceText, valueSource,
 * expectedLeft, expectedTop, expectedWidth, expectedHeight, heightSource }] }
 */
'use strict';

const fs = require('fs');

// 按钮族固定参数（与 gen-iocontrol-xml.js 保持一致）
const BUTTON_FAMILY_CONTROL_TYPES = ['IconButton', 'Button', 'StatusButton'];
const BUTTON_ALWAYS_ATTRS = ['PageName', 'IOVisible', 'IOCommand'];

function attrsFromTag(tag) {
  const attrs = {};
  const re = /([A-Za-z][\w]*)\s*=\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(tag))) attrs[m[1]] = m[2];
  return attrs;
}

function num(v) {
  if (v === undefined || v === null || v === '') return null;
  if (v === 'NaN') return 'NaN';
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function sameNumber(actual, expected, tolerance) {
  const a = num(actual);
  const e = num(expected);
  return a !== null && e !== null && a !== 'NaN' && e !== 'NaN' &&
    Math.abs(a - e) <= (tolerance || 0.0001);
}

function isNanValue(value) {
  return value === 'NaN' || (typeof value === 'number' && Number.isNaN(value));
}

function validateTextAudit(manifest, entries) {
  const errors = [];
  const textSources = (manifest.sourceNodes || []).filter(function (source) {
    return source && (source.type === 'TEXT' || source.type === 'text') && typeof source.text === 'string';
  });
  if (textSources.length === 0) return errors;
  if (!Array.isArray(manifest.textAudit)) {
    return ['映射清单缺少 textAudit：每个 TEXT 源节点都必须记录可见性和输出决定'];
  }
  const auditByRef = new Map();
  for (const audit of manifest.textAudit) {
    if (!audit || typeof audit.sourceRef !== 'string') {
      errors.push('textAudit 条目缺少 sourceRef');
      continue;
    }
    if (auditByRef.has(audit.sourceRef)) {
      errors.push('textAudit 重复 sourceRef: ' + audit.sourceRef);
      continue;
    }
    auditByRef.set(audit.sourceRef, audit);
  }
  const nodeBySource = new Map();
  (entries || []).filter(function (node) {
    return node && typeof node.sourceRef === 'string';
  }).forEach(function (node) {
    nodeBySource.set(node.sourceRef, node);
    if (typeof node.valueSourceRef === 'string') nodeBySource.set(node.valueSourceRef, node);
    if (Array.isArray(node.sourceSlotRefs)) node.sourceSlotRefs.forEach(function (ref) {
      if (typeof ref === 'string') nodeBySource.set(ref, node);
    });
  });
  for (const source of textSources) {
    const audit = auditByRef.get(source.ref);
    if (!audit) {
      errors.push('TEXT 源节点缺少 textAudit: ' + source.ref);
      continue;
    }
    if (audit.sourceText !== source.text) {
      errors.push('textAudit sourceText 与 DSL 不一致: ' + source.ref);
    }
    if (typeof audit.visibility !== 'boolean') {
      errors.push('textAudit visibility 必须是 boolean: ' + source.ref);
      continue;
    }
    const role = audit.role || 'content';
    const shouldEmit = audit.visibility && role !== 'page-title' && role !== 'host-shell';
    const outputRefs = Array.isArray(audit.outputRefs) ? audit.outputRefs : [];
    if (shouldEmit) {
      if (audit.decision !== 'emit' || outputRefs.length === 0) {
        errors.push('可见普通 TEXT 必须 decision=emit 且存在 outputRefs: ' + source.ref);
        continue;
      }
      const outputForSource = nodeBySource.get(source.ref);
      const mappedText = outputForSource && outputForSource.sourceSlotTexts && typeof outputForSource.sourceSlotTexts[source.ref] === 'string'
        ? outputForSource.sourceSlotTexts[source.ref]
        : outputForSource && outputForSource.sourceText;
      if (!outputForSource || outputForSource.valueSource !== 'dsl.text' || mappedText !== source.text) {
        errors.push('可见普通 TEXT 没有对应的 dsl.text 输出节点: ' + source.ref);
      }
    } else {
      if (audit.decision !== 'omit' || !['hidden', 'page-title', 'host-shell'].includes(audit.omitReason)) {
        errors.push('隐藏/标题 TEXT 必须 decision=omit 并记录 omitReason: ' + source.ref);
      }
      if (outputRefs.length > 0) errors.push('被省略的 TEXT 不得存在 outputRefs: ' + source.ref);
    }
  }
  return errors;
}

function validate(xmlPath, manifestPath) {
  const errors = [];
  let xml;
  let manifest;
  try { xml = fs.readFileSync(xmlPath, 'utf8'); }
  catch (e) { return { ok: false, errors: ['读取 XML 失败: ' + e.message] }; }
  try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); }
  catch (e) { return { ok: false, errors: ['读取映射清单失败: ' + e.message] }; }

  const entries = Array.isArray(manifest) ? manifest : manifest.nodes;
  if (!Array.isArray(entries)) return { ok: false, errors: ['映射清单必须是数组或 {nodes: []}'] };
  if (!Array.isArray(manifest.sourceNodes)) {
    return { ok: false, errors: ['映射清单缺少 sourceNodes：不能证明 mapping 本身来自真实 DSL'] };
  }
  const sourceMap = new Map(manifest.sourceNodes.map(n => [n.ref, n]));
  const originY = Number(manifest.contentOriginY !== undefined
    ? manifest.contentOriginY
    : (manifest.contentOrigin && manifest.contentOrigin.y) || 192);
  if (originY !== 192) {
    errors.push('contentOriginY 必须固定为 192');
    return { ok: false, errors };
  }
  errors.push(...validateTextAudit(manifest, entries));
  const rootRef = manifest.rootRef || (manifest.source && manifest.source.layerId) ||
    (manifest.sourceNodes.find(n => !n.parentRef) || {}).ref;
  const tags = Array.from(xml.matchAll(/<IOContorl\b[^<>]*>/g)).map(m => attrsFromTag(m[0]));
  const actual = tags.filter(a => a.ID !== '' || a.ControlType);
  const byId = new Map(actual.filter(a => a.ID).map(a => [a.ID, a]));
  const mappedIds = new Set();

  for (const n of entries) {
    if (!n.xmlId || !n.sourceRef) { errors.push('映射节点缺少 xmlId 或 sourceRef'); continue; }
    if (mappedIds.has(n.xmlId)) { errors.push('重复映射 xmlId="' + n.xmlId + '"'); continue; }
    mappedIds.add(n.xmlId);
    const x = byId.get(n.xmlId);
    if (!x) { errors.push('UNTRACKED xmlId="' + n.xmlId + '"'); continue; }
    const src = sourceMap.get(n.sourceRef);
    if (!src) { errors.push('[' + n.xmlId + '] sourceRef 不存在于 sourceNodes: ' + n.sourceRef); continue; }
    const parent = src.parentRef ? sourceMap.get(src.parentRef) : null;
    if (src.parentRef && !parent) errors.push('[' + n.xmlId + '] sourceParentRef 不存在: ' + src.parentRef);
    if (n.sourceParent !== undefined && n.sourceParent !== (src.parentRef || null)) {
      errors.push('[' + n.xmlId + '] sourceParent 与 DSL 父节点不一致');
    }
    if (!sameNumber(src.pageAbsX, (parent ? parent.pageAbsX : 0) + Number(src.relativeX || 0)) ||
        !sameNumber(src.pageAbsY, (parent ? parent.pageAbsY : 0) + Number(src.relativeY || 0))) {
      errors.push('[' + n.xmlId + '] sourceNodes 的页面绝对坐标与父子相对坐标不一致');
    }
    const outputParentRef = n.layoutParent !== undefined
      ? n.layoutParent
      : (n.parent !== undefined ? n.parent : (src.parentRef || null));
    const outputParent = outputParentRef ? sourceMap.get(outputParentRef) : null;
    if (outputParentRef && !outputParent) {
      errors.push('[' + n.xmlId + '] layoutParent 不存在: ' + outputParentRef);
    }
    // Root-level output is content-relative: subtract the public shell/title once.
    // Nested output is parent-relative: subtract only the output parent's raw page bbox.
    const parentIsRoot = outputParent && outputParent.ref === rootRef;
    const expectedSourceLeft = Number(src.pageAbsX) - (outputParent ? Number(outputParent.pageAbsX) : 0);
    const expectedSourceTop = Number(src.pageAbsY) -
      (outputParent ? Number(outputParent.pageAbsY) : 0) - (parentIsRoot || !outputParent ? originY : 0);
    if (!sameNumber(n.expectedLeft, expectedSourceLeft) || !sameNumber(n.expectedTop, expectedSourceTop)) {
      errors.push('[' + n.xmlId + '] expectedLeft/Top 不是由 sourceNodes 父子坐标计算得到');
    }
    const fixedTextBlockHeight = x.ControlType === 'TextBlock' || n.heightSource === 'mtslg.textblock.fixed-40';
    const expectedHeightSource = fixedTextBlockHeight ? 40 : src.height;
    if (fixedTextBlockHeight && x.ControlType !== 'TextBlock') {
      errors.push('[' + n.xmlId + '] fixed-40 高度规则只能用于 TextBlock');
    }
    // TextBlock：Width 固定 NaN（自适应），bbox 宽度只作为 dslWidth 来源保留。
    if (x.ControlType === 'TextBlock') {
      if (!isNanValue(n.expectedWidth)) {
        errors.push('[' + n.xmlId + '] TextBlock 的 expectedWidth 必须固定为 NaN');
      }
      if (n.widthSource !== undefined && n.widthSource !== 'mtslg.textblock.fixed-nan') {
        errors.push('[' + n.xmlId + '] TextBlock 的 widthSource 必须是 mtslg.textblock.fixed-nan');
      }
      if (n.dslWidth !== undefined && !sameNumber(n.dslWidth, src.width)) {
        errors.push('[' + n.xmlId + '] TextBlock 的 dslWidth 与 sourceNodes bbox 不一致');
      }
    } else if (!sameNumber(n.expectedWidth, src.width)) {
      errors.push('[' + n.xmlId + '] expectedWidth 不是同一 sourceRef 的 bbox');
    }
    if (!sameNumber(n.expectedHeight, expectedHeightSource)) {
      errors.push('[' + n.xmlId + '] expectedHeight 不是同一 sourceRef 或正式模板规则计算得到');
    }
    if (typeof src.text === 'string' && typeof n.sourceText === 'string' && src.text !== n.sourceText) {
      errors.push('[' + n.xmlId + '] sourceText 与 sourceNodes.text 不一致');
    }
    if (n.valueSource === 'dsl.text') {
      if (typeof n.sourceText !== 'string') errors.push('[' + n.xmlId + '] 缺少 sourceText');
      else if (x.Value !== n.sourceText) errors.push('[' + n.xmlId + '] Value="' + (x.Value || '') + '" != DSL="' + n.sourceText + '"');
    } else if (x.ControlType === 'TextBlock') {
      errors.push('[' + n.xmlId + '] TextBlock 的 ValueSource 必须为 dsl.text');
    }
    for (const pair of [['expectedLeft', 'Left'], ['expectedTop', 'Top'], ['expectedWidth', 'Width'], ['expectedHeight', 'Height']]) {
      const field = pair[0], attr = pair[1];
      if (n[field] === undefined) { errors.push('[' + n.xmlId + '] 缺少 ' + field); continue; }
      if (attr === 'Width' && x.ControlType === 'TextBlock') {
        if (!isNanValue(x[attr])) errors.push('[' + n.xmlId + '] TextBlock 的 Width 必须固定为 NaN');
        continue;
      }
      if (!sameNumber(x[attr], n[field])) errors.push('[' + n.xmlId + '] ' + attr + '=' + (x[attr] || '') + ' != expected=' + n[field]);
    }
    const controlType = x.ControlType || n.controlType || (n.attrs && n.attrs.ControlType);
    if (BUTTON_FAMILY_CONTROL_TYPES.includes(controlType)) {
      for (const attr of BUTTON_ALWAYS_ATTRS) {
        if (x[attr] === undefined) errors.push('[' + n.xmlId + '] 按钮族缺少必写属性 ' + attr);
      }
      const mappingIcon = n.attrs && n.attrs.Icon;
      const hasIcon = (typeof mappingIcon === 'string' && mappingIcon.trim() !== '') ||
        (typeof x.Icon === 'string' && x.Icon.trim() !== '');
      if (hasIcon) {
        const size = n.iconSize;
        if (!size || typeof size !== 'object') {
          errors.push('[' + n.xmlId + '] 按钮族带 Icon 但映射缺少 iconSize（图标图形节点 bbox）');
        } else {
          const iconSource = sourceMap.get(size.sourceRef);
          if (!iconSource) {
            errors.push('[' + n.xmlId + '] iconSize.sourceRef 不存在于 sourceNodes: ' + size.sourceRef);
          } else if (!sameNumber(iconSource.width, size.width) || !sameNumber(iconSource.height, size.height)) {
            errors.push('[' + n.xmlId + '] iconSize 与图标图形节点 bbox 不一致');
          }
          if (!sameNumber(x.IconWidth, Math.round(Number(size.width))) ||
              !sameNumber(x.IconHeight, Math.round(Number(size.height)))) {
            errors.push('[' + n.xmlId + '] IconWidth/IconHeight 必须等于图标图形节点 bbox 取整值');
          }
        }
      } else if (x.IconWidth !== undefined || x.IconHeight !== undefined) {
        errors.push('[' + n.xmlId + '] 无图标按钮不得出现 IconWidth/IconHeight');
      }
    }
  }

  for (const x of actual.filter(a => a.ControlType === 'TextBlock')) {
    if (!mappedIds.has(x.ID)) errors.push('TextBlock 未建立来源映射: xmlId="' + (x.ID || '') + '"');
  }
  return { ok: errors.length === 0, errors };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const get = flag => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
  const xml = get('--xml');
  const manifest = get('--mapping');
  if (!xml || !manifest) { console.error('用法: node validate-iocontrol-provenance.js --xml <page.xml> --mapping <mapping.json>'); process.exit(2); }
  const result = validate(xml, manifest);
  if (!result.ok) { console.error(result.errors.join('\n')); process.exit(1); }
  console.log('PASS: provenance and geometry validation');
}

module.exports = { validate, validateTextAudit };
