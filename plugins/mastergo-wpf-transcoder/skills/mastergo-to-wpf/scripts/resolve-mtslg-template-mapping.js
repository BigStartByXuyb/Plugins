#!/usr/bin/env node
"use strict";

const fs = require("fs");

function fail(message) {
  throw new Error("MTSLG 模板映射失败: " + message);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail((label || "JSON") + "读取失败: " + filePath + " - " + error.message);
  }
}

function loadTemplateMap(filePath) {
  const map = loadJson(filePath, "模板 map");
  if (!map.componentTemplates || !map.componentTemplates.variants) {
    fail("模板 map 缺少 componentTemplates.variants");
  }
  for (const [familyName, family] of Object.entries(map)) {
    if (!familyName.endsWith("Templates") || familyName === "componentTemplates") continue;
    if (!family || typeof family !== "object" || !family.variants || typeof family.variants !== "object") {
      fail("模板 map 的 " + familyName + " 缺少 variants");
    }
  }
  return map;
}

function templatesForName(templateMap, templateName) {
  if (!templateName || templateName === "componentTemplates") return templateMap.componentTemplates;
  if (templateName === "rightSidebar") return templateMap.rightSidebarTemplates;
  return templateMap[templateName];
}

function normalizedPropertyName(value) {
  return String(value || "").replace(/\s+/g, "");
}

function instanceVariant(instance, matchProperty) {
  const properties = instance.properties || {};
  const wanted = normalizedPropertyName(matchProperty || "属性 1");
  for (const key of Object.keys(properties)) {
    if (normalizedPropertyName(key) === wanted) return properties[key];
  }
  if (typeof instance.variant === "string") return instance.variant;
  return null;
}

function sourceByRef(mapping) {
  return new Map((mapping.sourceNodes || []).map(source => [source.ref, source]));
}

function nodeBySourceRef(mapping) {
  const result = new Map();
  for (const node of mapping.nodes || []) {
    if (node.sourceRef) result.set(node.sourceRef, node);
  }
  return result;
}

function assertSourceAndNode(sourceMap, nodeMap, slot, variant, usedSources) {
  if (!slot || typeof slot.slot !== "string" || typeof slot.sourceRef !== "string") {
    fail("固定模板槽位缺少 slot/sourceRef: " + variant);
  }
  if (!sourceMap.has(slot.sourceRef)) {
    fail("固定模板槽位 sourceRef 不存在: " + variant + "/" + slot.slot + " -> " + slot.sourceRef);
  }
  if (usedSources.has(slot.sourceRef)) {
    fail("固定模板槽位重复使用 sourceRef: " + variant + "/" + slot.slot + " -> " + slot.sourceRef);
  }
  usedSources.add(slot.sourceRef);
  const node = nodeMap.get(slot.sourceRef);
  if (!node) fail("固定模板槽位没有对应输出节点: " + variant + "/" + slot.slot);
  const source = sourceMap.get(slot.sourceRef);
  if (node.sourceParent !== undefined && node.sourceParent !== (source.parentRef || null)) {
    fail("固定模板槽位 sourceParent 不匹配: " + variant + "/" + slot.slot);
  }
  return { source, node };
}

function validateSlot(spec, slot, sourceMap, nodeMap, variant, usedSources) {
  const pair = assertSourceAndNode(sourceMap, nodeMap, slot, variant, usedSources);
  const nodeType = nodeMap.get(slot.sourceRef).controlType || (nodeMap.get(slot.sourceRef).attrs || {}).ControlType;
  if (spec.controlType && nodeType && spec.controlType !== nodeType) {
    fail("固定模板槽位 ControlType 不匹配: " + variant + "/" + slot.slot);
  }
  const attrs = nodeMap.get(slot.sourceRef).attrs || {};
  if (spec.controlType) {
    nodeMap.get(slot.sourceRef).controlType = spec.controlType;
    attrs.ControlType = spec.controlType;
  }
  if (spec.style === null) delete attrs.Style;
  else if (typeof spec.style === "string") attrs.Style = spec.style;
  if (spec.iconPolicy === "none") {
    delete attrs.Icon;
    delete attrs.IconWidth;
    delete attrs.IconHeight;
  }
  if (spec.iconRequired && typeof attrs.Icon !== "string") {
    fail("固定模板槽位缺少 DSL 图标来源: " + variant + "/" + slot.slot);
  }
  const valueSourceRef = slot.valueSourceRef;
  if (valueSourceRef !== undefined) {
    const valueSource = sourceMap.get(valueSourceRef);
    if (!valueSource) fail("固定模板槽位 valueSourceRef 不存在: " + variant + "/" + slot.slot);
    if (typeof valueSource.text === "string" && attrs.Value !== valueSource.text) {
      fail("固定模板槽位 Value 不是 DSL 文本: " + variant + "/" + slot.slot);
    }
    if (nodeMap.get(slot.sourceRef).valueSource !== undefined && nodeMap.get(slot.sourceRef).valueSource !== "dsl.text") {
      fail("固定模板槽位 valueSource 必须是 dsl.text: " + variant + "/" + slot.slot);
    }
  } else if (spec.controlType === "TextBlock") {
    fail("TextBlock 固定模板槽位缺少 valueSourceRef: " + variant + "/" + slot.slot);
  }
  return {
    slot: slot.slot,
    sourceRef: slot.sourceRef,
    ...(valueSourceRef === undefined ? {} : { valueSourceRef })
  };
}

function validateInstance(instance, spec, mapping, sourceMap, nodeMap, usedSources, variant) {
  const supplied = instance.requiredSlots || instance.slots;
  if (!Array.isArray(supplied)) fail("固定模板实例缺少 requiredSlots: " + variant);
  const expected = spec.slots || [];
  if (supplied.length !== expected.length) {
    fail("固定模板槽位数量不一致: " + variant + "，期望 " + expected.length + "，实际 " + supplied.length);
  }
  const suppliedByName = new Map(supplied.map(slot => [slot.slot, slot]));
  const requiredSlots = expected.map(expectedSlot => {
    const slot = suppliedByName.get(expectedSlot.slot);
    if (!slot) fail("固定模板槽位缺失: " + variant + "/" + expectedSlot.slot);
    return validateSlot(expectedSlot, slot, sourceMap, nodeMap, variant, usedSources);
  });
  for (const slot of supplied) {
    if (!expected.some(expectedSlot => expectedSlot.slot === slot.slot)) {
      fail("固定模板包含未登记槽位: " + variant + "/" + slot.slot);
    }
  }
  return {
    variant,
    ...(instance.template ? { template: instance.template } : {}),
    instanceRef: instance.instanceRef,
    requiredSlots
  };
}

function resolveTemplateMapping(mapping, templateMap) {
  const result = clone(mapping);
  const sourceMap = sourceByRef(result);
  const nodeMap = nodeBySourceRef(result);
  const instances = Array.isArray(result.componentInstances) ? result.componentInstances : null;
  const existing = Array.isArray(result.templateInstances) ? result.templateInstances : null;
  if (!instances && !existing) return result;

  const usedSources = new Set();
  const resolved = [];
  if (instances) {
    for (const instance of instances) {
      const templateName = instance.template || "componentTemplates";
      const templates = templatesForName(templateMap, templateName);
      if (!templates) fail("未登记的 MTSLG 模板族: " + templateName);
      const variant = instanceVariant(instance, templates.match && templates.match.property);
      if (!variant) fail("组件实例缺少真实属性 1: " + (instance.instanceRef || "(missing)"));
      if (templates.unconfirmedVariants && templates.unconfirmedVariants.includes(variant)) {
        fail("尚未确认的 MTSLG 模板变体: " + variant);
      }
      const spec = templates.variants[variant];
      if (!spec) fail("未登记的 MTSLG 模板变体: " + variant);
      resolved.push(validateInstance(instance, spec, result, sourceMap, nodeMap, usedSources, variant));
    }
  } else {
    for (const instance of existing) {
      const templateName = instance.template || "componentTemplates";
      const templates = templatesForName(templateMap, templateName);
      if (!templates) fail("未登记的 MTSLG 模板族: " + templateName);
      const variant = instance.variant;
      if (templates.unconfirmedVariants && templates.unconfirmedVariants.includes(variant)) {
        fail("尚未确认的 MTSLG 模板变体: " + variant);
      }
      const spec = templates.variants[variant];
      if (!spec) fail("未登记的 MTSLG 模板变体: " + variant);
      resolved.push(validateInstance(instance, spec, result, sourceMap, nodeMap, usedSources, variant));
    }
  }
  result.templateInstances = resolved;
  return result;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--mapping") args.mapping = argv[++i];
    else if (arg === "--map") args.map = argv[++i];
    else if (arg === "--out") args.out = argv[++i];
    else fail("用法: node resolve-mtslg-template-mapping.js --mapping <mapping.json> --map <mtslg-iocontrol-map.json> --out <resolved.json>");
  }
  if (!args.mapping || !args.map || !args.out) {
    fail("必须提供 --mapping、--map 和 --out");
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const mapping = loadJson(args.mapping, "页面 mapping");
  const templateMap = loadTemplateMap(args.map);
  const resolved = resolveTemplateMapping(mapping, templateMap);
  fs.writeFileSync(args.out, JSON.stringify(resolved, null, 2) + "\n", "utf8");
}

if (require.main === module) {
  try { main(); } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = {
  loadTemplateMap,
  resolveTemplateMapping
};
