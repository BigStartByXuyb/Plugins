#!/usr/bin/env node
"use strict";

const fs = require("fs");

function splitVariants(text) {
  return text
    .split(/[、，,]/)
    .map(item => item.trim())
    .filter(Boolean);
}

function extractDocumentedRules(markdown) {
  const families = {
    componentTemplates: [],
    rightSidebarTemplates: ["右侧栏-左右结构", "右侧栏-上下结构"],
    inputTemplates: [],
    selectBoxTemplates: ["选择框-40", "选择框-36", "选择框-32", "选择框-28"],
    selectionInfoTemplates: ["单选-选中/未选择", "多选-选中/未选中"],
    selectionTemplates: ["单选-选中/未选择", "多选-选中/未选择"],
    infoGroupTemplates: ["信息分组-模块化"],
    // The mapping document names this component set "主菜单button" and
    // "主菜单button-文字".  Do not invent a separate "主菜单" variant.
    mainMenuTemplates: ["主菜单button", "主菜单button-文字"],
    tableTemplates: ["Table"],
    textTemplates: ["独立文本"]
  };

  const inputVariantLines = markdown.match(/MasterGo 变体：([^\r\n。]+)/g) || [];
  for (const line of inputVariantLines) {
    const values = line.replace(/^MasterGo 变体：/, "");
    if (values.includes("输入框-")) families.inputTemplates.push(...splitVariants(values));
  }

  const operationHeadings = markdown.match(/^### 固定模板：属性 1=([^\r\n]+)/gm) || [];
  for (const heading of operationHeadings) {
    const variants = heading.replace(/^### 固定模板：属性 1=/, "").trim();
    const values = splitVariants(variants);
    // Main-menu variants belong to mainMenuTemplates, not the generic
    // componentTemplates family.
    families.componentTemplates.push(...values.filter(value => !["主菜单button", "主菜单button-文字"].includes(value)));
  }

  const uniqueFamilies = {};
  for (const [family, variants] of Object.entries(families)) {
    uniqueFamilies[family] = [...new Set(variants)];
  }

  const ambiguous = [];
  const unconfirmed = {
    inputTemplates: ["密码输入框"]
  };
  markdown.split(/\r?\n/).forEach((line, index) => {
    if (/^固定结构：L TextBlock \+ R (ComboBox|IntNumberBox|TextBox)/.test(line.trim())) {
      ambiguous.push(`第${index + 1}行：${line.trim()}（缺少独立组件集/变体标题）`);
    }
  });

  return { families: uniqueFamilies, unconfirmed, ambiguous };
}

function auditMappingCoverage(markdown, templateMap) {
  const documented = extractDocumentedRules(markdown);
  const missing = [];
  const covered = [];
  for (const [family, variants] of Object.entries(documented.families)) {
    const actualFamily = family === "rightSidebarTemplates"
      ? templateMap.rightSidebarTemplates
      : templateMap[family];
    if (!actualFamily || !actualFamily.variants && family !== "rightSidebarTemplates") {
      for (const variant of variants) missing.push(`${family}/${variant}`);
      continue;
    }
    if (family === "rightSidebarTemplates") {
      const parentVariants = actualFamily.parentVariants || {};
      for (const variant of variants) {
        if (parentVariants[variant]) covered.push(`${family}/${variant}`);
        else missing.push(`${family}/${variant}`);
      }
      continue;
    }
    for (const variant of variants) {
      if (actualFamily.variants[variant]) covered.push(`${family}/${variant}`);
      else missing.push(`${family}/${variant}`);
    }
  }
  const unconfirmed = [];
  for (const [family, variants] of Object.entries(documented.unconfirmed)) {
    const actualFamily = templateMap[family];
    for (const variant of variants) {
      if (actualFamily && Array.isArray(actualFamily.unconfirmedVariants) && actualFamily.unconfirmedVariants.includes(variant)) {
        unconfirmed.push(`${family}/${variant}`);
      } else {
        missing.push(`${family}/待确认:${variant}`);
      }
    }
  }
  return { documented: documented.families, covered, missing, unconfirmed, ambiguous: documented.ambiguous };
}

function main() {
  const [docPath, mapPath] = process.argv.slice(2);
  if (!docPath || !mapPath) {
    console.error("用法: node audit-mtslg-feishu-map.js <feishu.md> <mtslg-iocontrol-map.json>");
    process.exitCode = 1;
    return;
  }
  const report = auditMappingCoverage(
    fs.readFileSync(docPath, "utf8"),
    JSON.parse(fs.readFileSync(mapPath, "utf8"))
  );
  console.log(JSON.stringify(report, null, 2));
  if (report.missing.length) process.exitCode = 2;
}

if (require.main === module) main();

module.exports = { extractDocumentedRules, auditMappingCoverage };
