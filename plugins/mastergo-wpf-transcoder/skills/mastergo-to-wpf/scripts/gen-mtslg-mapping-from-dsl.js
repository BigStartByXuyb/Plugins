#!/usr/bin/env node
"use strict";

// Generic MasterGo DSL -> MTSLG mapping generator.
// It intentionally contains no page or instance layer IDs. Component structure
// comes from the formal template map; instance text, icon and geometry come
// from the current DSL snapshot.

const fs = require("fs");

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}
function required(name) {
  const value = arg(name);
  if (!value) throw new Error("missing " + name);
  return value;
}
function readJson(file, label) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (e) { throw new Error(label + " read failed: " + e.message); }
}
function normalize(value) { return String(value || "").replace(/\s+/g, ""); }
function textOf(node) { return Array.isArray(node.text) ? node.text.map(x => x.text || "").join("") : undefined; }

const dslSnapshot = readJson(required("--dsl"), "DSL snapshot");
const visibility = readJson(required("--visibility"), "visibility");
const templateMap = readJson(required("--template-map"), "template map");
const iconMap = arg("--icon-map") ? readJson(arg("--icon-map"), "icon map") : { icons: [] };
const outPath = required("--out");
const MAPPING_TAG = "新页面完整DSL映射";
const dsl = dslSnapshot.dsl;
const root = dsl.nodes[0];
const visibilityByRef = new Map((visibility.nodes || []).map(x => [x.ref, x]));
const iconEntries = Array.isArray(iconMap.icons) ? iconMap.icons : [];
const sourceNodes = [];
const nodeByRef = new Map();
const fontSizeByRef = new Map();
const parents = new Map();
const outputNodes = [];
const outputRefBySource = new Map();
const textAudit = [];
const consumedTexts = new Set();
const componentInstances = [];
const deferredValueAudits = [];
const pending = [];
let textIndex = 0;

function walk(node, parentRef, pageAbsX, pageAbsY) {
  const ls = node.layoutStyle || {};
  const rx = typeof ls.relativeX === "number" ? ls.relativeX : null;
  const ry = typeof ls.relativeY === "number" ? ls.relativeY : null;
  const x = rx === null ? null : pageAbsX + rx;
  const y = ry === null ? null : pageAbsY + ry;
  const source = {
    ref: node.id,
    parentRef: parentRef || null,
    type: node.type,
    name: node.name || "",
    componentId: node.componentId || null,
    properties: node.componentInfo?.properties || {},
    pageAbsX: x,
    pageAbsY: y,
    relativeX: rx,
    relativeY: ry,
    width: typeof ls.width === "number" ? ls.width : null,
    height: typeof ls.height === "number" ? ls.height : null
  };
  const text = textOf(node);
  if (typeof text === "string") source.text = text;
  sourceNodes.push(source);
  nodeByRef.set(node.id, { node, source });
  parents.set(node.id, parentRef || null);
  const font = Array.isArray(node.text) && node.text[0] ? node.text[0].font : null;
  const fontValue = font && dsl.styles && dsl.styles[font] ? dsl.styles[font].value : null;
  if (fontValue && typeof fontValue.size === "number") fontSizeByRef.set(node.id, fontValue.size);
  for (const child of node.children || []) walk(child, node.id, x === null ? pageAbsX : x, y === null ? pageAbsY : y);
}
walk(root, null, 0, 0);

function source(ref) {
  const item = nodeByRef.get(ref);
  if (!item) throw new Error("missing DSL source " + ref);
  return item.source;
}
function node(ref) { return nodeByRef.get(ref)?.node; }
function visible(ref) { return visibilityByRef.get(ref)?.effectiveVisible !== false; }
function ancestorRefs(ref) {
  const result = [];
  let current = ref;
  while (current) {
    result.push(current);
    current = parents.get(current) || null;
  }
  return result;
}
function isHostShell(ref) {
  return ancestorRefs(ref).some(x => {
    const n = node(x);
    const name = String(n?.name || "");
    return name.includes("顶部栏") || name.includes("底部") || name.includes("常驻信息");
  });
}
function isPageTitle(ref) {
  const s = source(ref);
  if (s.parentRef !== root.id) return false;
  const clean = value => String(value || "").replace(/[.。\s]/g, "");
  return clean(s.name) === clean(root.name) ||
    clean(s.text) === clean(root.name) ||
    (s.type === "TEXT" && typeof s.pageAbsY === "number" && s.pageAbsY < 192);
}
function descendants(ref) {
  const result = [];
  function visit(id) {
    for (const child of node(id)?.children || []) {
      result.push(child.id);
      visit(child.id);
    }
  }
  visit(ref);
  return result;
}
function textDescendants(ref) {
  return descendants(ref).filter(x => source(x).type === "TEXT");
}
function pathDescendants(ref) {
  return descendants(ref).filter(x => source(x).type === "PATH");
}
function directChildren(ref) { return (node(ref)?.children || []).map(x => x.id); }
function firstText(ref, predicate = () => true) {
  const match = textDescendants(ref).find(x => visible(x) && predicate(source(x))) || null;
  return match ? source(match) : null;
}
function iconForPath(pathRef) {
  const match = iconEntries
    .filter(icon => icon && typeof icon.sourceRef === "string" && (pathRef === icon.sourceRef || pathRef.startsWith(icon.sourceRef + "/") || icon.sourceRef.startsWith(pathRef + "/")))
    .sort((a, b) => String(b.sourceRef).length - String(a.sourceRef).length)[0];
  return match?.name || null;
}
function iconFor(ref) {
  const pathRef = pathDescendants(ref)[0];
  return pathRef ? iconForPath(pathRef) : null;
}
function iconEntryFor(ref) {
  const pathRef = pathDescendants(ref)[0];
  if (!pathRef) return null;
  return iconEntries
    .filter(icon => icon && typeof icon.sourceRef === "string" &&
      (pathRef === icon.sourceRef || pathRef.startsWith(icon.sourceRef + "/") || icon.sourceRef.startsWith(pathRef + "/")))
    .sort((a, b) => String(b.sourceRef).length - String(a.sourceRef).length)[0] || null;
}
// 图标图形节点 bbox：优先用图标映射的 sourceRef 节点，缺失时回退 sourceId 节点。
function iconSizeFor(ref) {
  const entry = iconEntryFor(ref);
  if (!entry) return null;
  for (const candidate of [entry.sourceRef, entry.sourceId]) {
    if (!candidate) continue;
    const item = nodeByRef.get(candidate);
    const s = item && item.source;
    if (!s) continue;
    const width = Number(s.width);
    const height = Number(s.height);
    if (Number.isFinite(width) && Number.isFinite(height)) return { width, height, sourceRef: candidate };
  }
  return null;
}

// 变体内部实例的组件名（= 独立组件集/组件的名称，用于右栏等族的交叉核对）。
function innerComponentName(n) {
  const child = (n && Array.isArray(n.children) ? n.children : []).find(c => c && c.type === "INSTANCE");
  return child ? String(child.name || "") : "";
}

// componentSet 索引：变体登记了 componentSet 时，允许按内部组件名直接命中。
const componentSetIndex = new Map();
for (const [family, spec] of Object.entries(templateMap)) {
  if (!family.endsWith("Templates") || !spec?.variants) continue;
  for (const [variant, entry] of Object.entries(spec.variants)) {
    const componentSet = entry && entry.componentSet;
    if (typeof componentSet !== "string" || !componentSet) continue;
    if (!componentSetIndex.has(componentSet)) componentSetIndex.set(componentSet, []);
    componentSetIndex.get(componentSet).push({ family, variant, spec: entry });
  }
}
const templateConflicts = [];

function propertyMatches(n) {
  const props = n.componentInfo?.properties || {};
  const matches = [];
  for (const [family, spec] of Object.entries(templateMap)) {
    if (!family.endsWith("Templates") || !spec?.match?.property || !spec.variants) continue;
    const value = Object.keys(props).find(key => normalize(key) === normalize(spec.match.property));
    const variant = value ? props[value] : null;
    if (variant && spec.variants[variant]) matches.push({ family, variant, spec: spec.variants[variant], properties: props, matchKind: "property" });
  }
  return matches;
}

function formalMatches(n) {
  if (!n || !["INSTANCE", "COMPONENT"].includes(n.type)) return [];
  const props = n.componentInfo?.properties || {};
  let componentSet = "";
  let byComponent = [];
  // 组件名来源：先看变体内部实例（聚合集合的变体），再看实例自身（独立组件直接放置）。
  const candidateNames = [innerComponentName(n), typeof n.name === "string" ? n.name : ""].filter(Boolean);
  for (const candidate of candidateNames) {
    const hits = componentSetIndex.get(candidate);
    if (hits && hits.length) { componentSet = candidate; byComponent = hits; break; }
  }
  if (byComponent.length > 0) {
    // 同一组件名可能同时登记在“聚合变体族”和“独立组件族”：
    // 实例带该族的公开属性（如 按钮类型）时按聚合族，否则按独立组件族。
    const propertyFamilies = byComponent.filter(h => {
      const spec = templateMap[h.family];
      const matchProperty = spec && spec.match && spec.match.property;
      return matchProperty && Object.keys(props).some(key => normalize(key) === normalize(matchProperty));
    });
    const componentOnlyFamilies = byComponent.filter(h => templateMap[h.family]?.match?.componentSet === true);
    if (propertyFamilies.length > 0) byComponent = propertyFamilies;
    else if (componentOnlyFamilies.length > 0) byComponent = componentOnlyFamilies;
  }
  const byProperty = propertyMatches(n);
  if (byComponent.length > 0) {
    const chosen = byComponent[0];
    if (byProperty.length > 0 &&
        !byProperty.some(m => m.family === chosen.family && m.variant === chosen.variant)) {
      templateConflicts.push({
        ref: n.id,
        name: n.name || null,
        componentSet,
        propertyMatch: byProperty.map(m => `${m.family}#${m.variant}`).join(", "),
        componentSetMatch: byComponent.map(m => `${m.family}#${m.variant}`).join(", "),
        reason: "内部组件名与公开属性值指向不同模板，按内部组件名（componentSet）执行"
      });
    }
    return byComponent.map(m => ({
      family: m.family, variant: m.variant, spec: m.spec,
      properties: props, matchKind: "componentSet", componentSet
    }));
  }
  return byProperty;
}
function outerGroups(ref, minWidth = 55, minHeight = 40) {
  const candidates = descendants(ref).filter(id => {
    const s = source(id);
    return s.type === "GROUP" && Number(s.width) >= minWidth && Number(s.height) >= minHeight;
  });
  return candidates.filter(id => !candidates.some(parent => parent !== id && ancestorRefs(id).includes(parent))).map(id => source(id));
}
function firstInner(ref) {
  return directChildren(ref).map(x => source(x)).find(s => s.type === "INSTANCE")?.ref || ref;
}
function addNode(sourceRef, controlType, attrs, options = {}) {
  const s = source(sourceRef);
  const valueSourceRef = options.valueSourceRef || null;
  const valueSource = valueSourceRef ? source(valueSourceRef) : s;
  const sourceSlotTexts = Object.assign({}, options.sourceSlotTexts || {});
  if (valueSourceRef && typeof valueSource.text === "string") sourceSlotTexts[valueSourceRef] = valueSource.text;
  if (![s.pageAbsX, s.pageAbsY, s.width, s.height].every(v => typeof v === "number" && Number.isFinite(v))) throw new Error("incomplete bbox " + sourceRef);
  if (outputRefBySource.has(sourceRef)) return outputRefBySource.get(sourceRef);
  const xmlId = options.xmlId || `MG_${String(outputNodes.length + 1).padStart(4, "0")}`;
  const parentRef = options.layoutParent || null;
  const parentSource = parentRef ? source(parentRef) : null;
  const out = {
    ref: sourceRef,
    sourceRef,
    sourceParent: s.parentRef,
    sourceText: typeof valueSource.text === "string" ? valueSource.text : undefined,
    valueSource: typeof valueSource.text === "string" ? "dsl.text" : undefined,
    valueSourceRef: valueSourceRef || undefined,
    sourceSlotRefs: Array.isArray(options.sourceSlotRefs) ? options.sourceSlotRefs : undefined,
    sourceSlotTexts: Object.keys(sourceSlotTexts).length ? sourceSlotTexts : undefined,
    controlType,
    parent: parentRef,
    layoutParent: parentRef,
    absX: s.pageAbsX,
    absY: s.pageAbsY,
    w: s.width,
    h: s.height,
    expectedLeft: s.pageAbsX - (parentSource ? parentSource.pageAbsX : 0),
    expectedTop: s.pageAbsY - (parentSource ? parentSource.pageAbsY : 0) - (parentSource ? 0 : 192),
    expectedWidth: controlType === "TextBlock" ? "NaN" : s.width,
    expectedHeight: controlType === "TextBlock" ? 40 : s.height,
    widthSource: controlType === "TextBlock" ? "mtslg.textblock.fixed-nan" : "dsl.bbox",
    heightSource: controlType === "TextBlock" ? "mtslg.textblock.fixed-40" : "dsl.bbox",
    ...(controlType === "TextBlock" ? { dslWidth: s.width } : {}),
    id: xmlId,
    xmlId,
    attrs: Object.assign({}, attrs),
    ...(options.iconSize ? { iconSize: options.iconSize } : {})
  };
  outputNodes.push(out);
  outputRefBySource.set(sourceRef, xmlId);
  return xmlId;
}
function addText(ref) {
  if (consumedTexts.has(ref) || !visible(ref) || isHostShell(ref) || isPageTitle(ref)) return outputRefBySource.get(ref) || null;
  consumedTexts.add(ref);
  const s = source(ref);
  const attrs = { Value: s.text };
  const size = fontSizeByRef.get(ref);
  if (typeof size === "number") attrs.FontSize = String(size);
  const xmlId = addNode(ref, "TextBlock", attrs, { xmlId: `MGText_${String(textAudit.length + 1).padStart(4, "0")}` });
  textAudit.push({ sourceRef: ref, sourceText: s.text, visibility: true, role: "content", decision: "emit", outputRefs: [xmlId] });
  return xmlId;
}
function addValueAudit(textRef, ownerRef) {
  if (!textRef || consumedTexts.has(textRef)) return;
  consumedTexts.add(textRef);
  const s = source(textRef);
  textAudit.push({ sourceRef: textRef, sourceText: s.text, visibility: true, role: "component-value", decision: "emit", outputRefs: [outputRefBySource.get(ownerRef)] });
}
function slot(name, ref, valueSourceRef) { return Object.assign({ slot: name, sourceRef: ref }, valueSourceRef ? { valueSourceRef } : {}); }
function addInstance(match, instanceRef, requiredSlots, omittedSlots = []) {
  const properties = Object.assign({}, match.properties || source(instanceRef).properties);
  // 组件名用于右栏等族的交叉核对；图层重命名不影响 componentSet 的登记值。
  const componentSet = match.componentSet || innerComponentName(node(instanceRef)) || undefined;
  componentInstances.push({
    template: match.family,
    instanceRef,
    properties,
    ...(componentSet ? { componentSet } : {}),
    requiredSlots,
    ...(omittedSlots.length ? { omittedSlots } : {})
  });
}

const matched = [];
for (const item of sourceNodes) {
  const matches = formalMatches(node(item.ref));
  if (matches.length) matched.push({ item, match: matches[0] });
}
const matchedRefSet = new Set(matched.map(x => x.item.ref));
const topLevelMatches = matched.filter(x => !ancestorRefs(x.item.ref).slice(1).some(ref => matchedRefSet.has(ref)));
matched.length = 0;
matched.push(...topLevelMatches);
const matchedRefs = new Set(matched.map(x => x.item.ref));

for (const { item: inst, match } of matched) {
  const variant = match.variant;
  const spec = match.spec;
  if (match.family === "rightSidebarTemplates" || match.family === "rightSidebarComponentTemplates" ||
      match.family === "selectBoxTemplates" || match.family === "mainMenuTemplates") {
    const valueText = firstText(inst.ref, s => !/^F\d+$/.test(s.text));
    const attrs = {};
    if (spec.style) attrs.Style = spec.style;
    if (valueText) attrs.Value = valueText.text;
    const icon = spec.iconPolicy !== "none" ? iconFor(inst.ref) : null;
    if (icon) attrs.Icon = icon;
    const iconSize = icon ? iconSizeFor(inst.ref) : null;
    const fText = firstText(inst.ref, s => /^F\d+$/.test(s.text));
    if (fText && inst.properties["显示F"] !== false) attrs.TopLeftContent = fText.text;
    const sourceSlotRefs = [valueText?.ref, fText?.ref].filter(Boolean);
    const owner = addNode(inst.ref, spec.controlType, attrs, {
      ...(valueText ? { valueSourceRef: valueText.ref } : {}),
      ...(iconSize ? { iconSize } : {}),
      sourceSlotRefs,
      sourceSlotTexts: Object.fromEntries([valueText, fText].filter(Boolean).map(text => [text.ref, text.text]))
    });
    if (valueText) addValueAudit(valueText.ref, inst.ref);
    if (fText && attrs.TopLeftContent) addValueAudit(fText.ref, inst.ref);
    addInstance({ family: match.family, componentSet: match.componentSet }, inst.ref, [slot(spec.slots[0]?.slot || "button", inst.ref)]);
    continue;
  }
  if (match.family === "inputTemplates") {
    const valueText = firstText(inst.ref);
    const attrs = valueText ? { Value: valueText.text } : {};
    addNode(inst.ref, spec.controlType, attrs, valueText ? { valueSourceRef: valueText.ref } : {});
    if (valueText) addValueAudit(valueText.ref, inst.ref);
    addInstance(match, inst.ref, [slot("input", inst.ref, valueText?.ref)]);
    continue;
  }
  if (match.family === "selectionTemplates") {
    // Selection components are icon/vector-only in this design and have no
    // TEXT child. Register the formal choice slot without inventing a Value.
    // The resolver validates the component slot while the XML keeps runtime
    // state/value attributes empty until a real binding is confirmed.
    const attrs = {};
    addNode(inst.ref, spec.controlType, attrs);
    addInstance(match, inst.ref, [slot("choice", inst.ref)]);
    continue;
  }
  const innerRef = firstInner(inst.ref);
  const buttonGroups = outerGroups(innerRef, variant.startsWith("加减") ? 55 : 70);
  if (variant.startsWith("加减")) {
    const slots = spec.slots || [];
    const buttonSlots = slots.filter(s => s.controlType === "IconButton");
    const orderedButtons = buttonGroups.slice(0, buttonSlots.length);
    const required = [];
    for (let i = 0; i < orderedButtons.length; i++) {
      const group = orderedButtons[i].ref;
      const text = firstText(group);
      const attrs = { Style: "SmallButton" };
      if (text) attrs.Value = text.text;
      addNode(group, "IconButton", attrs, text ? { valueSourceRef: text.ref } : {});
      if (text) addValueAudit(text.ref, group);
      required.push(slot(buttonSlots[i].slot, group, text?.ref));
    }
    // The title/value texts may be siblings of the button container rather
    // than children of innerRef. Traverse the whole formal component and
    // remove only text descendants belonging to the emitted button groups.
    const groupText = textDescendants(inst.ref).filter(x => !orderedButtons.some(b => ancestorRefs(x).includes(b.ref)));
    const textSlots = slots.filter(s => s.controlType === "TextBlock");
    const hasTitleSlot = textSlots.some(s => s.slot === "title");
    const titleRef = hasTitleSlot && groupText[0] && source(groupText[0]).text ? groupText[0] : null;
    const valueTexts = groupText.filter(x => x !== titleRef);
    const omitted = [];
    let textIndexLocal = 0;
    for (const textSlot of textSlots) {
      const candidate = textSlot.slot === "title" ? titleRef : valueTexts[textIndexLocal++];
      if (candidate && visible(candidate)) {
        addText(candidate);
        required.push(slot(textSlot.slot, candidate, candidate));
      } else if (candidate) {
        omitted.push({ slot: textSlot.slot, sourceRef: candidate, valueSourceRef: candidate, omitReason: "hidden" });
      }
    }
    addInstance(match, inst.ref, required, omitted);
    continue;
  }
  const buttonSlots = (spec.slots || []).filter(s => s.controlType === "IconButton");
  const textSlots = (spec.slots || []).filter(s => s.controlType === "TextBlock");
  const groups = buttonGroups.slice(0, buttonSlots.length);
  const required = [];
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i].ref;
    const icon = iconFor(group);
    const iconSize = icon ? iconSizeFor(group) : null;
    const attrs = icon ? { Icon: icon } : {};
    addNode(group, "IconButton", attrs, iconSize ? { iconSize } : {});
    required.push(slot(buttonSlots[i].slot, group));
  }
  for (const textSlot of textSlots) {
    const text = firstText(inst.ref, s => s.text === "SCAN" || s.name === textSlot.slot);
    if (text) { addText(text.ref); required.push(slot(textSlot.slot, text.ref, text.ref)); }
  }
  addInstance(match, inst.ref, required);
}

for (const s of sourceNodes) {
  if (s.type !== "TEXT" || typeof s.text !== "string" || consumedTexts.has(s.ref)) continue;
  if (visible(s.ref) && !isHostShell(s.ref) && !isPageTitle(s.ref)) addText(s.ref);
  else textAudit.push({ sourceRef: s.ref, sourceText: s.text, visibility: visible(s.ref), role: isPageTitle(s.ref) ? "page-title" : (isHostShell(s.ref) ? "host-shell" : "hidden"), decision: "omit", omitReason: isPageTitle(s.ref) ? "page-title" : (isHostShell(s.ref) ? "host-shell" : "hidden"), outputRefs: [] });
}

for (const { item, match } of matched) {
  if (!componentInstances.some(x => x.instanceRef === item.ref)) continue;
}

for (const child of root.children || []) {
  const s = source(child.id);
  if (!["INSTANCE", "FRAME", "COMPONENT"].includes(s.type)) continue;
  if (matchedRefs.has(s.ref) || isHostShell(s.ref)) continue;
  if (/背景|常驻信息|分割线/.test(s.name)) continue;
  if (!Object.keys(s.properties || {}).length && s.width === source(root.id).width && s.height === source(root.id).height) continue;
  pending.push({ sourceRef: s.ref, reason: "正式组件模板未命中，保留 DSL 来源，未猜测 ControlType" });
}

const mapping = {
  schemaVersion: "mastergo-mtslg-mapping/3",
  adapter: "mtslg-iocontrol",
  mappingTag: MAPPING_TAG,
  comment: "Generated from complete MasterGo DSL; component semantics come from the formal template map.",
  contentOriginX: 0,
  contentOriginY: 192,
  rootRef: root.id,
  source: { fileId: dslSnapshot.fileId, layerId: dslSnapshot.layerId, ui: dslSnapshot.ui, pageName: dslSnapshot.pageName },
  sourceNodes,
  textAudit,
  nodes: outputNodes,
  componentInstances,
  pending,
  unmappedComponents: pending.map(x => x.sourceRef),
  ...(templateConflicts.length ? { templateConflicts } : {})
};
fs.writeFileSync(outPath, JSON.stringify(mapping, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ sourceNodes: sourceNodes.length, nodes: outputNodes.length, textAudit: textAudit.length, componentInstances: componentInstances.length, templateConflicts: templateConflicts.length, out: outPath }, null, 2));
if (templateConflicts.length) {
  console.error("模板匹配冲突（已按内部组件名执行）:");
  for (const conflict of templateConflicts) {
    console.error("  - [" + conflict.ref + "] " + conflict.reason +
      "；公开属性命中 " + conflict.propertyMatch + "；内部组件命中 " + conflict.componentSetMatch);
  }
}
