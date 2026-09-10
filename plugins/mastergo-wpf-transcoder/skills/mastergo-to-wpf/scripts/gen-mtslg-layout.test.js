#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const script = path.join(__dirname, "gen-mtslg-layout.js");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "mtslg-layout-"));
const manifest = path.join(root, "layout.json");
const layout = path.join(root, "Layout.xml");

fs.writeFileSync(manifest, JSON.stringify({
  layoutPath: layout,
  pageTarget: "F2NewPage",
  pageLangName: "F2NewPageTitle",
  layoutStatus: "complete",
  layoutEvidence: { matchedBottomBarItems: 2, unresolvedBottomBarItems: 0 },
  menuItems: [
    { name: "第一项", icon: "FirstGeometry", topLeftContent: "F1", index: 1 },
    { icon: "SecondGeometry", topLeftContent: "F2", index: 2 }
  ]
}, null, 2), "utf8");

let result = spawnSync(process.execPath, [script, "--manifest", manifest], { encoding: "utf8" });
assert.strictEqual(result.status, 0, result.stderr);
let text = fs.readFileSync(layout, "utf8");
assert.match(text, /<Page Target="F2NewPage" LangName="F2NewPageTitle">/);
assert.match(text, /<Layout>[\s\S]*<Header>[\s\S]*<Body>[\s\S]*<Pages>[\s\S]*<Page Target="F2NewPage"[\s\S]*<\/Pages>[\s\S]*<LeftToolBox \/>[\s\S]*<ToolBox \/>[\s\S]*<\/Body>[\s\S]*<Footer \/>[\s\S]*<\/Layout>/);
assert.match(text, /Name="第一项" Icon="FirstGeometry" TopLeftContent="F1" Index="1"/);
assert.match(text, /Icon="SecondGeometry" TopLeftContent="F2" Index="2"/);
assert.doesNotMatch(text, /PageName=|IOEnable=|UserRightId=/);

const emptyFieldsManifest = path.join(root, "empty-fields.json");
const emptyFieldsLayout = path.join(root, "EmptyFieldsLayout.xml");
fs.writeFileSync(emptyFieldsManifest, JSON.stringify({
  layoutPath: emptyFieldsLayout,
  pageTarget: "EmptyFieldsPage",
  pageLangName: "",
  layoutStatus: "complete",
  layoutEvidence: { matchedBottomBarItems: 1, unresolvedBottomBarItems: 0 },
  menuItems: [{
    name: "",
    langName: "",
    icon: "",
    topLeftContent: "",
    index: 1,
    pageName: "",
    ioEnable: "",
    userRightId: ""
  }]
}, null, 2), "utf8");
result = spawnSync(process.execPath, [script, "--manifest", emptyFieldsManifest], { encoding: "utf8" });
assert.strictEqual(result.status, 0, result.stderr);
text = fs.readFileSync(emptyFieldsLayout, "utf8");
assert.match(text, /<Page Target="EmptyFieldsPage" LangName="">/);
assert.match(text, /Name="" LangName="" Icon="" TopLeftContent="" Index="1" PageName="" IOEnable="" UserRightId=""/);

const emptyCompleteManifest = path.join(root, "empty-complete.json");
fs.writeFileSync(emptyCompleteManifest, JSON.stringify({
  layoutPath: path.join(root, "EmptyLayout.xml"),
  pageTarget: "EmptyPage",
  layoutStatus: "complete",
  layoutEvidence: { matchedBottomBarItems: 1, unresolvedBottomBarItems: 0 },
  menuItems: []
}, null, 2), "utf8");
result = spawnSync(process.execPath, [script, "--manifest", emptyCompleteManifest], { encoding: "utf8" });
assert.notStrictEqual(result.status, 0, "检测到 Layout 组件但 menuItems 为空时必须失败");
assert.match(result.stderr + result.stdout, /menuItems|Layout/i);

const emptyNoneManifest = path.join(root, "empty-none.json");
fs.writeFileSync(emptyNoneManifest, JSON.stringify({
  layoutPath: path.join(root, "NoneLayout.xml"),
  pageTarget: "NoMenuPage",
  layoutStatus: "none",
  layoutEvidence: { matchedBottomBarItems: 0, unresolvedBottomBarItems: 0 },
  menuItems: []
}, null, 2), "utf8");
result = spawnSync(process.execPath, [script, "--manifest", emptyNoneManifest], { encoding: "utf8" });
assert.strictEqual(result.status, 0, result.stderr);

fs.writeFileSync(layout, [
  "<Layout>",
  "  <Page Target=\"ExistingPage\"><Menu><MenuItem Name=\"旧页面\" Index=\"9\" /></Menu></Page>",
  "</Layout>",
  ""
].join("\n"), "utf8");
result = spawnSync(process.execPath, [script, "--manifest", manifest], { encoding: "utf8" });
assert.strictEqual(result.status, 0, result.stderr);
text = fs.readFileSync(layout, "utf8");
assert.match(text, /Target="ExistingPage"/);
assert.match(text, /Name="旧页面" Index="9"/);
assert.match(text, /Target="F2NewPage"/);

const nestedLayout = path.join(root, "NestedLayout.xml");
const nestedManifest = path.join(root, "nested-layout.json");
fs.writeFileSync(nestedLayout, [
  "<Layout>",
  "  <Header />",
  "  <Body>",
  "    <Pages>",
  "      <Page Target=\"ExistingPage\" />",
  "    </Pages>",
  "  </Body>",
  "</Layout>",
  ""
].join("\n"), "utf8");
fs.writeFileSync(nestedManifest, JSON.stringify({
  ...JSON.parse(fs.readFileSync(manifest, "utf8")),
  layoutPath: nestedLayout,
  pageTarget: "NestedPage"
}, null, 2), "utf8");
result = spawnSync(process.execPath, [script, "--manifest", nestedManifest], { encoding: "utf8" });
assert.strictEqual(result.status, 0, result.stderr);
text = fs.readFileSync(nestedLayout, "utf8");
assert.match(text, /<Pages>[\s\S]*Target="NestedPage"[\s\S]*<\/Pages>/);
assert.doesNotMatch(text, /<\/Pages>[\s\S]*<Page Target="NestedPage"/);

fs.writeFileSync(layout, [
  "<Layout>",
  "  <Page Target=\"F2NewPage\"><Menu><MenuItem Name=\"旧页面\" Index=\"9\" /></Menu></Page>",
  "</Layout>",
  ""
].join("\n"), "utf8");
const existingPageBeforeOverwrite = fs.readFileSync(layout, "utf8");
result = spawnSync(process.execPath, [script, "--manifest", manifest], { encoding: "utf8" });
assert.notStrictEqual(result.status, 0, "替换已有 Page 必须显式使用 --overwrite");
assert.match(result.stderr + result.stdout, /相同 Target|overwrite|覆盖/i);
assert.strictEqual(
  fs.readFileSync(layout, "utf8"),
  existingPageBeforeOverwrite,
  "未加 --overwrite 时 Layout.xml 必须保持不变"
);
result = spawnSync(process.execPath, [script, "--manifest", manifest, "--overwrite"], { encoding: "utf8" });
assert.strictEqual(result.status, 0, result.stderr);
text = fs.readFileSync(layout, "utf8");
assert.strictEqual((text.match(/<Page\s+Target="F2NewPage"/g) || []).length, 1);
assert.match(text, /Name="第一项" Icon="FirstGeometry" TopLeftContent="F1" Index="1"/);
assert.doesNotMatch(text, /Name="旧页面"/);

// 右下角常驻分组（右侧底部-常驻button）内的实例不生成 MenuItem：
// matchedBottomBarItems 仍统计全部命中变体，常驻分组内的数量单独登记进 residentGroupItems。
const residentManifest = path.join(root, "resident-group.json");
const residentLayout = path.join(root, "ResidentLayout.xml");
fs.writeFileSync(residentManifest, JSON.stringify({
  layoutPath: residentLayout,
  pageTarget: "ResidentPage",
  pageLangName: "",
  layoutStatus: "complete",
  layoutEvidence: { matchedBottomBarItems: 3, unresolvedBottomBarItems: 0, residentGroupItems: 1 },
  menuItems: [
    { name: "第一项", icon: "FirstGeometry", index: 0 },
    { name: "第二项", icon: "SecondGeometry", index: 1 }
  ]
}, null, 2), "utf8");
result = spawnSync(process.execPath, [script, "--manifest", residentManifest], { encoding: "utf8" });
assert.strictEqual(result.status, 0, result.stderr);
text = fs.readFileSync(residentLayout, "utf8");
assert.strictEqual((text.match(/<MenuItem /g) || []).length, 2, "常驻分组内的实例不得生成 MenuItem");
assert.match(text, /Name="第一项" Icon="FirstGeometry" Index="0"/);
assert.match(text, /Name="第二项" Icon="SecondGeometry" Index="1"/);

const residentMismatch = path.join(root, "resident-mismatch.json");
fs.writeFileSync(residentMismatch, JSON.stringify({
  layoutPath: path.join(root, "ResidentMismatch.xml"),
  pageTarget: "ResidentMismatchPage",
  layoutStatus: "complete",
  layoutEvidence: { matchedBottomBarItems: 3, unresolvedBottomBarItems: 0, residentGroupItems: 0 },
  menuItems: [
    { name: "第一项", index: 0 },
    { name: "第二项", index: 1 }
  ]
}, null, 2), "utf8");
result = spawnSync(process.execPath, [script, "--manifest", residentMismatch], { encoding: "utf8" });
assert.notStrictEqual(result.status, 0, "menuItems + residentGroupItems 与 matchedBottomBarItems 不一致时必须失败");
assert.match(result.stderr + result.stdout, /residentGroupItems/);

const duplicateIndexManifest = path.join(root, "duplicate-index.json");
fs.writeFileSync(duplicateIndexManifest, JSON.stringify({
  layoutPath: path.join(root, "DuplicateIndex.xml"),
  pageTarget: "DuplicateIndexPage",
  layoutStatus: "complete",
  layoutEvidence: { matchedBottomBarItems: 2, unresolvedBottomBarItems: 0 },
  menuItems: [
    { name: "第一项", index: 0 },
    { name: "第二项", index: 0 }
  ]
}, null, 2), "utf8");
result = spawnSync(process.execPath, [script, "--manifest", duplicateIndexManifest], { encoding: "utf8" });
assert.notStrictEqual(result.status, 0, "重复 Index 必须失败");
assert.match(result.stderr + result.stdout, /重复 Index/);

console.log("PASS MTSLG Layout generator regression test");
