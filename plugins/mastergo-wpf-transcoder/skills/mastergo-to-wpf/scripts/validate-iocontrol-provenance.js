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
  const nodeBySource = new Map((entries || []).filter(function (node) {
    return node && typeof node.sourceRef === 'string';
  }).map(function (node) { return [node.sourceRef, node]; }));
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
      if (!outputForSource || outputForSource.valueSource !== 'dsl.text' || outputForSource.sourceText !== source.text) {
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
    const fixedTextBlockHeight = n.heightSource === 'mtslg.textblock.fixed-40';
    const expectedHeightSource = fixedTextBlockHeight ? 40 : src.height;
    if (fixedTextBlockHeight && x.ControlType !== 'TextBlock') {
      errors.push('[' + n.xmlId + '] fixed-40 高度规则只能用于 TextBlock');
    }
    if (!sameNumber(n.expectedWidth, src.width) || !sameNumber(n.expectedHeight, expectedHeightSource)) {
      errors.push('[' + n.xmlId + '] expectedWidth/Height 不是同一 sourceRef 或正式模板规则计算得到');
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
      if (!sameNumber(x[attr], n[field])) errors.push('[' + n.xmlId + '] ' + attr + '=' + (x[attr] || '') + ' != expected=' + n[field]);
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
