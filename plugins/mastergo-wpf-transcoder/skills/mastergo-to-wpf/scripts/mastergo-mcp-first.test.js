#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const skillPath = path.join(__dirname, "..", "SKILL.md");
const skill = fs.readFileSync(skillPath, "utf8");

function assert(condition, message) {
  if (!condition) throw new Error("断言失败: " + message);
}

assert(skill.includes("MasterGo MCP 优先门禁"), "Skill 必须声明 MasterGo MCP 优先门禁");
assert(skill.includes("getDesignSections"), "Skill 必须优先使用 getDesignSections");
assert(skill.includes("getPageLayers"), "Skill 必须列出 MasterGo 页面层级 MCP");
assert(skill.includes("extractSvg"), "Skill 必须列出 MasterGo SVG MCP");
assert(skill.includes("不得先用浏览器页面"), "浏览器不得优先于 MasterGo MCP");
assert(skill.includes("sourceAccess=fallback"), "MCP 不可用时必须记录兜底原因");
assert(skill.includes("@mastergo/magic-mcp"), "Skill 必须检查官方 MasterGo MCP 服务");

console.log("PASS MasterGo MCP-first workflow contract test");
