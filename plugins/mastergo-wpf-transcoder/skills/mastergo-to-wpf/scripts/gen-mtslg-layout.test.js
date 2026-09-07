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
assert.match(text, /Name="第一项" Icon="FirstGeometry" TopLeftContent="F1" Index="1"/);
assert.match(text, /Icon="SecondGeometry" TopLeftContent="F2" Index="2"/);
assert.doesNotMatch(text, /PageName=|IOEnable=|UserRightId=/);

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

console.log("PASS MTSLG Layout generator regression test");
