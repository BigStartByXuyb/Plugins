#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const script = path.join(__dirname, "gen-mastergo-page-bundle.js");
const scriptText = fs.readFileSync(script, "utf8");
assert.match(
  scriptText,
  /run\(LAYOUT_SCRIPT,\s*\["--manifest",\s*layoutInput\]\.concat\(args\.overwrite \? \["--overwrite"\] : \[\]\)\)/,
  "bundle --overwrite 必须传给 Layout 生成器"
);
assert.match(scriptText, /run\(ICON_DISCOVERY_SCRIPT,/, "bundle 必须先执行页面 Icon 候选发现");
assert.match(scriptText, /PathGeometry\|GeometryGroup.*MatrixTransform|MatrixTransform.*PathGeometry\|GeometryGroup/, "bundle 必须拒绝旧式 Icon 几何结构");
assert.match(scriptText, /o:Freeze=\[\"'\]True\[\"'\].*x:Key=|x:Key=\[\"'\].*o:Freeze=\[\"'\]True/, "bundle 必须校验 Geometry 的冻结和资源键");
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
  rootRef: "body-text",
  sourceNodes: [{
    ref: "body-text", parentRef: null, pageAbsX: 100, pageAbsY: 292,
    relativeX: 100, relativeY: 292, width: 80, height: 20, text: "测试页面"
  }],
  nodes: [{
    ref: "body-text", xmlId: "body-text", id: "body-text", sourceRef: "body-text",
    sourceParent: null, sourceText: "测试页面", valueSource: "dsl.text",
    controlType: "TextBlock", absX: 100, absY: 292, w: 80, h: 20,
    expectedLeft: 100, expectedTop: 100, expectedWidth: 80, expectedHeight: 20,
    attrs: { Value: "测试页面", IOName: "" }
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
  "Generated/F2NewPage.icon-map.json",
  "Generated/F2NewPage.bundle.manifest.json"
]) {
  assert.ok(fs.existsSync(path.join(project, ...relative.split("/"))), relative);
}
assert.match(fs.readFileSync(path.join(project, "Resources/Icons/F2NewPageIcon.xaml"), "utf8"), /ActionGeometry/);
assert.match(fs.readFileSync(path.join(project, "Common/Pages/F2NewPagePage.xml"), "utf8"), /IOName=""/);
assert.match(fs.readFileSync(path.join(project, "Resources/Files/Layout.xml"), "utf8"), /Index="1"/);
assert.match(fs.readFileSync(csproj, "utf8"), /F2NewPagePage\.xml|F2NewPageIcon\.xaml/);
const iconMapAudit = JSON.parse(fs.readFileSync(path.join(project, "Generated/F2NewPage.icon-map.json"), "utf8"));
assert.ok(Array.isArray(iconMapAudit.candidates));
assert.ok(Array.isArray(iconMapAudit.unmapped));
const bundleAudit = JSON.parse(fs.readFileSync(path.join(project, "Generated/F2NewPage.bundle.manifest.json"), "utf8"));
assert.deepStrictEqual(bundleAudit.layout, {
  status: "complete",
  evidence: { matchedBottomBarItems: 1, unresolvedBottomBarItems: 0 },
  menuItemCount: 1
});

const emptyIconMap = path.join(root, "empty-icon-map.json");
fs.writeFileSync(emptyIconMap, JSON.stringify({ icons: [] }, null, 2), "utf8");
const noIconManifest = JSON.parse(fs.readFileSync(manifest, "utf8"));
noIconManifest.pageName = "NoIconPage";
noIconManifest.pageTarget = "NoIconPage";
noIconManifest.pageLangName = "NoIconPageTitle";
noIconManifest.viewPath = "UI/F2-Teach/View/NoIconPageView.xaml";
noIconManifest.codeBehindPath = "UI/F2-Teach/View/NoIconPageView.xaml.cs";
noIconManifest.viewModelPath = "UI/F2-Teach/ViewModel/NoIconPageViewModel.cs";
noIconManifest.pageXmlPath = "Common/Pages/NoIconPagePage.xml";
noIconManifest.iconPath = "Resources/Icons/NoIconPageIcon.xaml";
noIconManifest.iconMapPath = emptyIconMap;
noIconManifest.menuItems = [];
noIconManifest.layoutStatus = "none";
noIconManifest.layoutEvidence = { matchedBottomBarItems: 0, unresolvedBottomBarItems: 0 };
const noIconManifestPath = path.join(root, "no-icon.json");
fs.writeFileSync(noIconManifestPath, JSON.stringify(noIconManifest, null, 2), "utf8");
result = spawnSync(process.execPath, [script, "--manifest", noIconManifestPath], { encoding: "utf8" });
assert.strictEqual(result.status, 0, result.stderr);
assert.doesNotMatch(
  fs.readFileSync(path.join(project, "Resources/Icons/NoIconPageIcon.xaml"), "utf8"),
  /<Geometry\b/,
  "没有实际 Icon 引用的页面允许生成空 ResourceDictionary"
);

const auditCollision = JSON.parse(JSON.stringify(noIconManifest));
auditCollision.pageName = "AuditCollision";
auditCollision.pageTarget = "AuditCollision";
auditCollision.pageLangName = "AuditCollisionTitle";
auditCollision.viewPath = "UI/F2-Teach/View/AuditCollisionView.xaml";
auditCollision.codeBehindPath = "UI/F2-Teach/View/AuditCollisionView.xaml.cs";
auditCollision.viewModelPath = "UI/F2-Teach/ViewModel/AuditCollisionViewModel.cs";
auditCollision.pageXmlPath = "Common/Pages/AuditCollisionPage.xml";
auditCollision.iconPath = "Resources/Icons/AuditCollisionIcon.xaml";
const auditCollisionPath = path.join(root, "audit-collision.json");
fs.mkdirSync(path.join(project, "Generated"), { recursive: true });
fs.writeFileSync(path.join(project, "Generated/AuditCollision.mapping.json"), "{}", "utf8");
fs.writeFileSync(auditCollisionPath, JSON.stringify(auditCollision, null, 2), "utf8");
result = spawnSync(process.execPath, [script, "--manifest", auditCollisionPath], { encoding: "utf8" });
assert.notStrictEqual(result.status, 0, "已存在审计文件时不得在没有 --overwrite 的情况下覆盖");
assert.match(result.stderr + result.stdout, /审计文件已存在|未覆盖/);
assert.ok(!fs.existsSync(path.join(project, "Common/Pages/AuditCollisionPage.xml")));

// 空项目脚手架：目标目录可以尚不存在，但必须生成完整文件结构；只做静态校验，不编译或加载 WPF。
const scaffoldProject = path.join(root, "EmptyScaffold");
const scaffoldManifest = path.join(root, "scaffold.json");
fs.writeFileSync(scaffoldManifest, JSON.stringify({
  projectRoot: scaffoldProject,
  projectName: "EmptyScaffold",
  scaffold: true,
  pageName: "ScaffoldPage",
  area: "F2-Teach",
  pageTarget: "ScaffoldPage",
  pageLangName: "ScaffoldPageTitle",
  pageXmlPath: "Common/Pages/ScaffoldPage.xml",
  iconPath: "Resources/Icons/ScaffoldPageIcon.xaml",
  layoutPath: "Resources/Files/Layout.xml",
  mappingPath: mapping,
  svgPath: svg,
  iconMapPath: emptyIconMap,
  menuItems: [],
  layoutStatus: "none",
  layoutEvidence: { matchedBottomBarItems: 0, unresolvedBottomBarItems: 0 }
}, null, 2), "utf8");
result = spawnSync(process.execPath, [script, "--manifest", scaffoldManifest], { encoding: "utf8" });
assert.strictEqual(result.status, 0, result.stderr);
for (const relative of [
  "EmptyScaffold.csproj",
  "framework.config.json",
  "UI/F2-Teach/View/ScaffoldPageView.xaml",
  "UI/F2-Teach/View/ScaffoldPageView.xaml.cs",
  "UI/F2-Teach/ViewModel/ScaffoldPageViewModel.cs",
  "Common/Pages/ScaffoldPage.xml",
  "Resources/Icons/ScaffoldPageIcon.xaml",
  "Resources/Files/Layout.xml",
  "Generated/ScaffoldPage.mapping.json",
  "Generated/ScaffoldPage.icon-map.json",
  "Generated/ScaffoldPage.bundle.manifest.json"
]) {
  assert.ok(fs.existsSync(path.join(scaffoldProject, ...relative.split("/"))), relative);
}
const scaffoldConfig = JSON.parse(fs.readFileSync(path.join(scaffoldProject, "framework.config.json"), "utf8"));
assert.strictEqual(scaffoldConfig.mode, "mtslg-iocontrol");
assert.strictEqual(scaffoldConfig.scaffold, true);
assert.strictEqual(scaffoldConfig.source_root, "");
assert.strictEqual(scaffoldConfig.index_root, "");
assert.deepStrictEqual(scaffoldConfig.resource_roots, []);
assert.strictEqual(scaffoldConfig.key_catalog, "");
const scaffoldAudit = JSON.parse(fs.readFileSync(
  path.join(scaffoldProject, "Generated/ScaffoldPage.bundle.manifest.json"), "utf8"
));
assert.strictEqual(scaffoldAudit.projectMode, "scaffold");
assert.deepStrictEqual(scaffoldAudit.verification, {
  static: "passed",
  compile: "skipped",
  wpfLoad: "skipped",
  runtimeLoad: "skipped"
});
assert.ok(scaffoldAudit.generated.includes("EmptyScaffold.csproj"));
assert.ok(scaffoldAudit.generated.includes("framework.config.json"));
assert.ok(scaffoldAudit.generated.includes("UI/F2-Teach/View/ScaffoldPageView.xaml"));

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
