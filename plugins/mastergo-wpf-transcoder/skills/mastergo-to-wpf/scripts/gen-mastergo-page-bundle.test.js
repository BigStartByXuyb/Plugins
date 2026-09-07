#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const script = path.join(__dirname, "gen-mastergo-page-bundle.js");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "mastergo-bundle-"));
const project = path.join(root, "Demo.Pages");
fs.mkdirSync(project, { recursive: true });
const csproj = path.join(project, "Demo.Pages.csproj");
fs.writeFileSync(csproj, [
  "<Project xmlns=\"http://schemas.microsoft.com/developer/msbuild/2003\">",
  "  <PropertyGroup><RootNamespace>Demo.Pages</RootNamespace></PropertyGroup>",
  "  <ItemGroup><Compile Include=\"Properties\\\\AssemblyInfo.cs\" /></ItemGroup>",
  "  <ItemGroup><Page Include=\"Resources\\\\Files\\\\Language.xaml\"><Generator>MSBuild:Compile</Generator><SubType>Designer</SubType></Page></ItemGroup>",
  "  <ItemGroup><Page Include=\"UI\\\\F2-Teach\\\\View\\\\ExistingView.xaml\"><Generator>MSBuild:Compile</Generator><SubType>Designer</SubType></Page><Compile Include=\"UI\\\\F2-Teach\\\\ViewModel\\\\ExistingViewModel.cs\" /></ItemGroup>",
  "  <ItemGroup><Content Include=\"Common\\\\Pages\\\\Existing.xml\" /></ItemGroup>",
  "</Project>",
  ""
].join("\n"), "utf8");

const mapping = path.join(root, "mapping.json");
fs.writeFileSync(mapping, JSON.stringify({
  rootRef: "title",
  sourceNodes: [{
    ref: "title", parentRef: null, pageAbsX: 100, pageAbsY: 292,
    relativeX: 100, relativeY: 292, width: 80, height: 20, text: "测试页面"
  }],
  nodes: [{
    ref: "title", xmlId: "title", id: "title", sourceRef: "title",
    sourceParent: null, sourceText: "测试页面", valueSource: "dsl.text",
    controlType: "TextBlock", absX: 100, absY: 292, w: 80, h: 20,
    expectedLeft: 100, expectedTop: 100, expectedWidth: 80, expectedHeight: 20,
    attrs: { Value: "测试页面" }
  }]
}, null, 2), "utf8");

const svg = path.join(root, "extractSvg.json");
fs.writeFileSync(svg, JSON.stringify({
  svgs: [{ id: "page/icon-a", svg: "<svg><path d=\"M0,0 L1,1\"/></svg>" }]
}), "utf8");
const iconMap = path.join(root, "icon-map.json");
fs.writeFileSync(iconMap, JSON.stringify({
  icons: [{ sourceId: "page/icon-a", name: "ActionGeometry", comment: "操作", sourceRef: "icon/a" }]
}), "utf8");

const manifest = path.join(root, "bundle.json");
fs.writeFileSync(manifest, JSON.stringify({
  projectRoot: project,
  csproj: "Demo.Pages.csproj",
  pageName: "F2NewPage",
  area: "F2-Teach",
  viewPath: "UI/F2-Teach/View/F2NewPageView.xaml",
  codeBehindPath: "UI/F2-Teach/View/F2NewPageView.xaml.cs",
  viewModelPath: "UI/F2-Teach/ViewModel/F2NewPageViewModel.cs",
  pageTarget: "F2NewPage",
  pageLangName: "F2NewPageTitle",
  pageXmlPath: "Common/Pages/F2NewPagePage.xml",
  iconPath: "Resources/Icons/F2NewPageIcon.xaml",
  layoutPath: "Resources/Files/Layout.xml",
  mappingPath: mapping,
  svgPath: svg,
  iconMapPath: iconMap,
  menuItems: [{ name: "操作", icon: "ActionGeometry", topLeftContent: "F1", index: 1 }],
  layoutStatus: "complete",
  layoutEvidence: { matchedBottomBarItems: 1, unresolvedBottomBarItems: 0 }
}, null, 2), "utf8");

let result = spawnSync(process.execPath, [script, "--manifest", manifest], { encoding: "utf8" });
assert.strictEqual(result.status, 0, result.stderr);
for (const relative of [
  "UI/F2-Teach/View/F2NewPageView.xaml",
  "UI/F2-Teach/View/F2NewPageView.xaml.cs",
  "UI/F2-Teach/ViewModel/F2NewPageViewModel.cs",
  "Common/Pages/F2NewPagePage.xml",
  "Resources/Icons/F2NewPageIcon.xaml",
  "Resources/Files/Layout.xml",
  "Generated/F2NewPage.mapping.json",
  "Generated/F2NewPage.bundle.manifest.json"
]) {
  assert.ok(fs.existsSync(path.join(project, ...relative.split("/"))), relative);
}
assert.match(fs.readFileSync(path.join(project, "Resources/Icons/F2NewPageIcon.xaml"), "utf8"), /ActionGeometry/);
assert.match(fs.readFileSync(path.join(project, "Resources/Files/Layout.xml"), "utf8"), /Index="1"/);
assert.match(fs.readFileSync(csproj, "utf8"), /F2NewPagePage\.xml|F2NewPageIcon\.xaml/);
const bundleAudit = JSON.parse(fs.readFileSync(path.join(project, "Generated/F2NewPage.bundle.manifest.json"), "utf8"));
assert.deepStrictEqual(bundleAudit.layout, {
  status: "complete",
  evidence: { matchedBottomBarItems: 1, unresolvedBottomBarItems: 0 },
  menuItemCount: 1
});

const incompleteManifest = JSON.parse(fs.readFileSync(manifest, "utf8"));
incompleteManifest.pageName = "NoLayoutState";
incompleteManifest.pageTarget = "NoLayoutState";
incompleteManifest.viewPath = "UI/F2-Teach/View/NoLayoutStateView.xaml";
incompleteManifest.codeBehindPath = "UI/F2-Teach/View/NoLayoutStateView.xaml.cs";
incompleteManifest.viewModelPath = "UI/F2-Teach/ViewModel/NoLayoutStateViewModel.cs";
incompleteManifest.pageXmlPath = "Common/Pages/NoLayoutStatePage.xml";
incompleteManifest.iconPath = "Resources/Icons/NoLayoutStateIcon.xaml";
incompleteManifest.menuItems = [];
delete incompleteManifest.layoutStatus;
delete incompleteManifest.layoutEvidence;
const incompleteManifestPath = path.join(root, "incomplete-layout-state.json");
fs.writeFileSync(incompleteManifestPath, JSON.stringify(incompleteManifest, null, 2), "utf8");
result = spawnSync(process.execPath, [script, "--manifest", incompleteManifestPath], { encoding: "utf8" });
assert.notStrictEqual(result.status, 0, "缺少 Layout 状态时不得继续生成 bundle");
assert.match(result.stderr + result.stdout, /layoutStatus|Layout/i);
assert.ok(!fs.existsSync(path.join(project, "Common/Pages/NoLayoutStatePage.xml")));

const brokenManifest = path.join(root, "broken-bundle.json");
const brokenProject = path.join(root, "Broken.Pages");
fs.mkdirSync(brokenProject, { recursive: true });
fs.copyFileSync(csproj, path.join(brokenProject, "Broken.Pages.csproj"));
fs.writeFileSync(brokenManifest, JSON.stringify({
  projectRoot: brokenProject,
  csproj: "Broken.Pages.csproj",
  pageName: "BrokenPage",
  area: "F2-Teach",
  pageXmlPath: "Common/Pages/BrokenPage.xml",
  iconPath: "Resources/Icons/BrokenPageIcon.xaml",
  layoutPath: "Resources/Files/Layout.xml",
  mappingPath: mapping,
  svgPath: svg,
  iconMapPath: path.join(root, "missing-icon-map.json"),
  pageTarget: "BrokenPage",
  menuItems: []
}, null, 2), "utf8");
result = spawnSync(process.execPath, [script, "--manifest", brokenManifest], { encoding: "utf8" });
assert.notStrictEqual(result.status, 0);
assert.ok(!fs.existsSync(path.join(brokenProject, "Common/Pages/BrokenPage.xml")));
assert.ok(!fs.existsSync(path.join(brokenProject, "Resources/Files/Layout.xml")));

console.log("PASS MasterGo page bundle regression test");
