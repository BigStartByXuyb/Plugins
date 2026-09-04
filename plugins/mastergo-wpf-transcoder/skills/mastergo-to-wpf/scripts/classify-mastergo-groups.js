#!/usr/bin/env node

// Portable classifier: no project namespace, style, URL, or business text.
// Usage: node classify-mastergo-groups.js input.json output.json --portable

const fs = require("fs");

const aliases = [
  [["iconbutton", "iconbtn", "图标按钮"], "icon-button", "Button", "icon-button"],
  [["buttongroup", "buttonset", "按钮组"], "button-group", "ItemsControl", "button-group"],
  [["togglebutton", "togglebtn", "切换按钮"], "toggle-button", "ToggleButton", "toggle-button"],
  [["button", "btn", "按钮"], "button", "Button", "button"],
  [["checkbox", "check", "复选框"], "check-box", "CheckBox", "check-box"],
  [["textbox", "input", "文本框"], "text-box", "TextBox", "text-box"],
  [["combobox", "dropdown", "下拉框"], "combo-box", "ComboBox", "combo-box"],
];

function normalize(value) {
  return String(value || "").toLowerCase().replace(/[\s_\-./:：()（）]+/g, "");
}

function containsAny(value, candidates) {
  return candidates.some((candidate) => value.includes(normalize(candidate)));
}

function classify(node) {
  const normalized = normalize(node.name);
  for (const [candidates, role, wpfType, styleFamily] of aliases) {
    if (containsAny(normalized, candidates)) return { role, wpfType, styleFamily, diagnostics: [] };
  }
  if (String(node.type || "").toUpperCase() === "GROUP" && (node.children || []).length > 0) {
    return { role: "layout-group", wpfType: "Grid", styleFamily: "layout", diagnostics: normalized ? ["unmapped-group-name"] : ["ambiguous-name"] };
  }
  return { role: "visual-node", wpfType: "ContentControl", styleFamily: "visual", diagnostics: normalized ? ["unmapped-node-name"] : ["ambiguous-name"] };
}

function convertTree(root, portable) {
  let counter = 0;
  function visit(node) {
    counter += 1;
    const semantic = classify(node);
    const key = `${semantic.role}-${String(counter).padStart(3, "0")}`;
    const result = {
      key: portable ? key : String(node.id || key),
      role: semantic.role,
      wpfType: semantic.wpfType,
      styleFamily: semantic.styleFamily,
      bounds: node.bounds || null,
      children: (node.children || []).map(visit),
      iconRef: node.iconRef || null,
      textRef: node.textRef || null,
      diagnostics: semantic.diagnostics,
    };
    if (!portable) result.sourceName = node.name || "";
    return result;
  }
  return visit(root);
}

const [, , inputPath, outputPath, ...flags] = process.argv;
if (!inputPath || !outputPath) throw new Error("Usage: node classify-mastergo-groups.js input.json output.json [--portable]");
const input = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const output = convertTree(input, flags.includes("--portable"));
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
