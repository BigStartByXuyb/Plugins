#!/usr/bin/env node
"use strict";

// 一次编排 MTSLG 页面 XML、页面 Icon、Layout 和 MaxWell WPF 宿主壳。
// 具体控件、文本、坐标、Icon 名称和 Layout 字段必须已经在输入清单中确认。

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const SCRIPT_DIR = __dirname;
const XML_SCRIPT = path.join(SCRIPT_DIR, "gen-iocontrol-xml.js");
const ICON_SCRIPT = path.join(SCRIPT_DIR, "gen-mtslg-page-icons.js");
const LAYOUT_SCRIPT = path.join(SCRIPT_DIR, "gen-mtslg-layout.js");
const HOST_SCRIPT = path.join(SCRIPT_DIR, "gen-mw-wpf-page.js");
const PROVENANCE_SCRIPT = path.join(SCRIPT_DIR, "validate-iocontrol-provenance.js");
const COORDS_SCRIPT = path.join(SCRIPT_DIR, "check-iocontrol-coords.js");
const TEMPLATE_RESOLVER_SCRIPT = path.join(SCRIPT_DIR, "resolve-mtslg-template-mapping.js");
const ICON_DISCOVERY_SCRIPT = path.join(SCRIPT_DIR, "discover-mtslg-page-icon-map.js");
const DEFAULT_TEMPLATE_MAP = path.resolve(SCRIPT_DIR, "..", "references", "adapters", "mtslg-iocontrol", "mtslg-iocontrol-map.json");

function fail(message) { throw new Error(message); }

function parseArgs(argv) {
  let manifestPath = null;
  let overwrite = false;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--manifest") manifestPath = argv[++i];
    else if (argv[i] === "--overwrite") overwrite = true;
    else {
      console.error("用法: node gen-mastergo-page-bundle.js --manifest <bundle.json> [--overwrite]");
      process.exit(2);
    }
  }
  if (!manifestPath) {
    console.error("用法: node gen-mastergo-page-bundle.js --manifest <bundle.json> [--overwrite]");
    process.exit(2);
  }
  return { manifestPath, overwrite };
}

function readJson(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, "utf8")); }
  catch (error) { fail("读取 JSON 失败: " + filePath + " - " + error.message); }
}

function resolvePath(base, value, field) {
  if (typeof value !== "string" || !value.trim()) fail(field + " 必须提供");
  const result = path.resolve(base, value);
  const root = path.resolve(base) + path.sep;
  if (result !== path.resolve(base) && !result.startsWith(root)) {
    fail(field + " 必须位于项目根目录内: " + value);
  }
  return result;
}

function resolveInput(manifestDir, projectRoot, value, field) {
  if (path.isAbsolute(value)) return path.resolve(value);
  const fromManifest = path.resolve(manifestDir, value);
  if (fs.existsSync(fromManifest)) return fromManifest;
  return resolvePath(projectRoot, value, field);
}

function xmlAttr(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function projectRelative(projectRoot, filePath) {
  return path.relative(projectRoot, filePath).replace(/\\/g, "/");
}

function scaffoldName(value, fallback) {
  const candidate = String(value || fallback || "Project").replace(/[^A-Za-z0-9_.-]/g, "_");
  return /^[A-Za-z_]/.test(candidate) ? candidate : "Project_" + candidate;
}

function scaffoldCsproj(rootNamespace, assemblyName) {
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<Project ToolsVersion="15.0" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">',
    '  <Import Project="$(MSBuildExtensionsPath)\\$(MSBuildToolsVersion)\\Microsoft.Common.props" Condition="Exists(\'$(MSBuildExtensionsPath)\\$(MSBuildToolsVersion)\\Microsoft.Common.props\')" />',
    '  <PropertyGroup>',
    '    <Configuration Condition=" \'$(Configuration)\' == \'\' ">Debug</Configuration>',
    '    <Platform Condition=" \'$(Platform)\' == \'\' ">AnyCPU</Platform>',
    '    <OutputType>Library</OutputType>',
    '    <RootNamespace>' + xmlAttr(rootNamespace) + '</RootNamespace>',
    '    <AssemblyName>' + xmlAttr(assemblyName) + '</AssemblyName>',
    '    <TargetFrameworkVersion>v4.6.1</TargetFrameworkVersion>',
    '    <FileAlignment>512</FileAlignment>',
    '    <Deterministic>true</Deterministic>',
    '  </PropertyGroup>',
    '  <ItemGroup>',
    '    <Reference Include="PresentationCore" />',
    '    <Reference Include="PresentationFramework" />',
    '    <Reference Include="System" />',
    '    <Reference Include="System.Core" />',
    '    <Reference Include="System.Xaml" />',
    '    <Reference Include="WindowsBase" />',
    '  </ItemGroup>',
    '  <Import Project="$(MSBuildToolsPath)\\Microsoft.CSharp.targets" />',
    '</Project>',
    ''
  ].join('\n');
}

function scaffoldFrameworkConfig(manifest) {
  return JSON.stringify({
    schemaVersion: "mastergo-project-config/1",
    mode: "mtslg-iocontrol",
    scaffold: true,
    source_root: manifest.sourceRoot || "",
    index_root: manifest.indexRoot || "",
    pages_root: manifest.pagesRoot || "Common/Pages",
    icons_root: manifest.iconsRoot || "Resources/Icons",
    resource_roots: Array.isArray(manifest.resourceRoots) ? manifest.resourceRoots : [],
    layout_file: manifest.layoutPath || "Resources/Files/Layout.xml",
    key_catalog: manifest.keyCatalog || "",
    generated_root: manifest.generatedRoot || "Generated",
    runtime_bindings: "pending"
  }, null, 2) + "\n";
}

function ensureScaffold(manifest) {
  const scaffold = manifest.scaffold === true || manifest.projectMode === "scaffold";
  if (typeof manifest.projectRoot !== "string" || !manifest.projectRoot.trim()) {
    fail("projectRoot 必须提供；脚手架模式也必须明确指定要创建的目标目录");
  }
  const projectRoot = path.resolve(manifest.projectRoot);
  if (!fs.existsSync(projectRoot)) {
    if (!scaffold) fail("projectRoot 不存在: " + projectRoot);
    fs.mkdirSync(projectRoot, { recursive: true });
  }
  if (!scaffold) return { projectRoot, scaffold: false, frameworkConfigPath: null };

  const projectName = scaffoldName(manifest.projectName || path.basename(projectRoot), "MasterGoProject");
  const rootNamespace = manifest.rootNamespace || projectName;
  const csprojRelative = manifest.csproj || projectName + ".csproj";
  const csprojPath = resolvePath(projectRoot, csprojRelative, "csproj");
  if (!fs.existsSync(csprojPath)) {
    fs.mkdirSync(path.dirname(csprojPath), { recursive: true });
    fs.writeFileSync(csprojPath, scaffoldCsproj(rootNamespace, projectName), "utf8");
  }
  manifest.csproj = csprojRelative;
  manifest.rootNamespace = rootNamespace;
  const configRelative = manifest.frameworkConfigPath || "framework.config.json";
  const frameworkConfigPath = resolvePath(projectRoot, configRelative, "frameworkConfigPath");
  if (!fs.existsSync(frameworkConfigPath)) {
    fs.mkdirSync(path.dirname(frameworkConfigPath), { recursive: true });
    fs.writeFileSync(frameworkConfigPath, scaffoldFrameworkConfig(manifest), "utf8");
  }
  manifest.frameworkConfigPath = configRelative;
  const dirs = [
    "Common/Pages", "Resources/Icons", "Resources/Files", "Generated",
    "UI/" + String(manifest.area || "F2-Manual") + "/View",
    "UI/" + String(manifest.area || "F2-Manual") + "/ViewModel"
  ];
  dirs.forEach(relative => fs.mkdirSync(path.join(projectRoot, ...relative.split("/")), { recursive: true }));
  return { projectRoot, scaffold: true, frameworkConfigPath };
}

function csprojIncludes(csprojText) {
  const result = [];
  const re = /<(?:Page|Compile|Content)\s+Include=["']([^"']+)["']/gi;
  let match;
  while ((match = re.exec(csprojText)) !== null) result.push(match[1].replace(/\\/g, "/"));
  return result;
}

function inferHostPaths(manifest, projectRoot, csprojText) {
  const viewName = manifest.viewName || manifest.pageName + "View";
  const viewModelName = manifest.viewModelName || manifest.pageName + "ViewModel";
  if ((manifest.viewPath && !manifest.codeBehindPath) || (!manifest.viewPath && manifest.codeBehindPath)) {
    fail("viewPath 与 codeBehindPath 必须同时提供");
  }
  if (manifest.viewPath || manifest.codeBehindPath || manifest.viewModelPath) {
    return {
      view: manifest.viewPath || "UI/" + manifest.area + "/View/" + viewName + ".xaml",
      codeBehind: manifest.codeBehindPath || manifest.viewPath + ".cs",
      viewModel: manifest.viewModelPath || "UI/" + manifest.area + "/ViewModel/" + viewModelName + ".cs"
    };
  }
  const includes = csprojIncludes(csprojText);
  const areaPrefix = "UI/" + String(manifest.area).replace(/\\/g, "/") + "/View/";
  const viewMatch = includes.find(item => item.toLowerCase().startsWith(areaPrefix.toLowerCase()) && /\/View\/[^/]+\.xaml$/i.test(item));
  const uiViewEvidence = includes.some(item => /^UI\/.+\/View\/[^/]+\.xaml$/i.test(item));
  const pagesMatch = includes.find(item => /^Pages\/[^/]+\.xaml$/i.test(item) || /\/Pages\/[^/]+\.xaml$/i.test(item));
  let viewDir;
  let viewModelDir;
  if (viewMatch) {
    viewDir = viewMatch.slice(0, viewMatch.lastIndexOf("/"));
    const prefix = viewDir.slice(0, viewDir.lastIndexOf("/View"));
    const vmMatch = includes.find(item => /\/ViewModel\/[^/]+\.cs$/i.test(item) && item.toLowerCase().startsWith(prefix.toLowerCase()));
    viewModelDir = vmMatch ? vmMatch.slice(0, vmMatch.lastIndexOf("/")) : viewDir.replace(/\/View$/i, "/ViewModel");
  } else if (pagesMatch) {
    viewDir = pagesMatch.slice(0, pagesMatch.lastIndexOf("/"));
    viewModelDir = viewDir;
  } else if (uiViewEvidence || fs.existsSync(path.join(projectRoot, "UI", manifest.area, "View"))) {
    viewDir = "UI/" + manifest.area + "/View";
    viewModelDir = fs.existsSync(path.join(projectRoot, "UI", manifest.area, "ViewModel"))
      ? "UI/" + manifest.area + "/ViewModel" : viewDir.replace(/\/View$/i, "/ViewModel");
  } else {
    viewDir = "Pages";
    viewModelDir = "Pages";
  }
  return {
    view: viewDir + "/" + viewName + ".xaml",
    codeBehind: viewDir + "/" + viewName + ".xaml.cs",
    viewModel: viewModelDir + "/" + viewModelName + ".cs"
  };
}

function backupFile(filePath) {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  let backup = filePath + ".bak-" + stamp;
  let index = 2;
  while (fs.existsSync(backup)) backup = filePath + ".bak-" + stamp + "-" + index++;
  fs.copyFileSync(filePath, backup);
  return backup;
}

function copyOutput(source, target, overwrite, created, backups, allowExisting) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (fs.existsSync(target)) {
    if (!overwrite && !allowExisting) fail("目标文件已存在，未覆盖: " + target);
    backups.push(backupFile(target));
  } else {
    created.push(target);
  }
  fs.copyFileSync(source, target);
}

function copyLayoutOutput(source, target, overwrite, created, backups) {
  // Layout 支持新增 Page 的增量注册；相同 pageTarget 的替换由
  // gen-mtslg-layout.js 强制要求 --overwrite。这里保留备份，但不把
  // 这个行为伪装成普通页面文件的无条件覆盖。
  copyOutput(source, target, overwrite, created, backups, true);
}

function writeAuditOutput(target, content, overwrite, backups) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (fs.existsSync(target)) {
    if (!overwrite) fail("审计文件已存在，未覆盖: " + target);
    backups.push(backupFile(target));
  }
  fs.writeFileSync(target, content, "utf8");
}

function snapshotFiles(filePaths) {
  const snapshots = new Map();
  filePaths.forEach(function (filePath) {
    snapshots.set(filePath, fs.existsSync(filePath) ? fs.readFileSync(filePath) : null);
  });
  return snapshots;
}

function restoreSnapshots(snapshots) {
  snapshots.forEach(function (content, filePath) {
    if (content === null) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return;
    }
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
  });
}

function run(command, args) {
  const result = spawnSync(process.execPath, [command].concat(args), { encoding: "utf8" });
  if (result.status !== 0) {
    fail("生成步骤失败: " + path.basename(command) + "\n" + (result.stderr || result.stdout || ""));
  }
}

function requireFile(filePath, label) {
  if (!fs.existsSync(filePath)) fail(label + " 未生成: " + filePath);
  return fs.readFileSync(filePath, "utf8");
}

function readGeometryKeys(iconText) {
  const keys = new Set();
  const duplicateKeys = new Set();
  const geometryTag = /<Geometry\b([^>]*)>/gi;
  let match;
  while ((match = geometryTag.exec(iconText)) !== null) {
    const keyMatch = match[1].match(/\bx:Key=["']([^"']+)["']/i);
    if (!keyMatch) continue;
    const key = keyMatch[1];
    if (keys.has(key)) duplicateKeys.add(key);
    keys.add(key);
  }
  return { keys, duplicateKeys };
}

function collectIconReferences(mapping, layoutMenuItems) {
  const references = new Set();
  (mapping.nodes || []).forEach(function (node) {
    const icon = node && node.attrs && node.attrs.Icon;
    if (typeof icon === "string" && icon.trim()) references.add(icon.trim());
  });
  (layoutMenuItems || []).forEach(function (item) {
    const icon = item && item.icon;
    if (typeof icon === "string" && icon.trim()) references.add(icon.trim());
  });
  return references;
}

function validateBundleOutputs(info) {
  const pageXml = requireFile(info.pageXmlPath, "页面 XML");
  if (!/<IOContorl\b/.test(pageXml) || !/<\/IOContorl>\s*$/.test(pageXml)) {
    fail("页面 XML 根节点不符合 IOContorl 格式: " + info.pageXmlPath);
  }
  const icon = requireFile(info.iconPath, "页面 Icon");
  if (!/<ResourceDictionary\b/.test(icon) || !/<\/ResourceDictionary>/.test(icon)) {
    fail("页面 Icon 不是完整 ResourceDictionary: " + info.iconPath);
  }
  if (/<(?:PathGeometry|GeometryGroup)\b|<MatrixTransform\b/.test(icon)) {
    fail("页面 Icon 使用了不兼容的几何结构；必须只使用 Geometry 内联路径: " + info.iconPath);
  }
  const geometryResources = icon.match(/<Geometry\b[^>]*>[\s\S]*?<\/Geometry>/g) || [];
  if (geometryResources.some(function (resource) {
    return !/\bo:Freeze=["']True["']/i.test(resource) || !/\bx:Key=["'][^"']+["']/i.test(resource);
  })) {
    fail("页面 Icon 的 Geometry 缺少 o:Freeze=True 或 x:Key: " + info.iconPath);
  }
  const geometryInfo = readGeometryKeys(icon);
  if (geometryInfo.duplicateKeys.size > 0) {
    fail("页面 Icon 存在重复 Geometry 资源键: " + [...geometryInfo.duplicateKeys].join(", "));
  }
  const iconReferences = collectIconReferences(info.mapping, info.layoutMenuItems);
  const missingReferences = [...iconReferences].filter(function (key) {
    return !geometryInfo.keys.has(key);
  });
  if (missingReferences.length > 0) {
    fail("页面实际引用了未生成的 Geometry: " + missingReferences.join(", "));
  }
  const iconMapAudit = readJson(info.iconMapAudit, "页面 Icon mapping 审计");
  if (!Array.isArray(iconMapAudit.icons) || !Array.isArray(iconMapAudit.candidates) || !Array.isArray(iconMapAudit.unmapped)) {
    fail("页面 Icon mapping 审计缺少 icons/candidates/unmapped 数组: " + info.iconMapAudit);
  }
  const layout = requireFile(info.layoutPath, "Layout.xml");
  if (!/<Layout\b/.test(layout) || !new RegExp("<Page\\s+[^>]*Target=[\\\"']" +
    String(info.pageTarget).replace(/[\\^$.*+?()[\]{}|]/g, "\\$&") + "[\\\"']", "i").test(layout)) {
    fail("Layout.xml 缺少当前页面注册: " + info.pageTarget);
  }
  const view = requireFile(info.hostPaths[0], "View XAML");
  if (!/<UserControl\b/.test(view) || !/<uidesign:PageDesign\b/.test(view)) {
    fail("View XAML 缺少 MaxWell PageDesign 宿主: " + info.hostPaths[0]);
  }
  requireFile(info.hostPaths[1], "View.xaml.cs");
  requireFile(info.hostPaths[2], "ViewModel");
  if (info.scaffold) {
    requireFile(info.frameworkConfigPath, "framework.config.json");
  }

  run(PROVENANCE_SCRIPT, ["--xml", info.pageXmlPath, "--mapping", info.mappingAudit]);
  const mapping = info.mapping;
  if (Array.isArray(mapping.nodes) && mapping.nodes.length > 0) {
    const sourceByRef = new Map((mapping.sourceNodes || []).map(function (node) { return [node.ref, node]; }));
    const coordNodes = mapping.nodes.map(function (node) {
      const source = sourceByRef.get(node.sourceRef || node.ref) || {};
      return {
        id: node.xmlId || node.id || node.ref,
        x: source.pageAbsX !== undefined ? source.pageAbsX : node.absX,
        y: source.pageAbsY !== undefined ? source.pageAbsY : node.absY,
        w: node.expectedWidth !== undefined
          ? node.expectedWidth
          : (source.width !== undefined ? source.width : node.w),
        h: node.expectedHeight !== undefined
          ? node.expectedHeight
          : (source.height !== undefined ? source.height : node.h),
        contentOriginX: mapping.contentOriginX === undefined ? 0 : mapping.contentOriginX,
        contentOriginY: 192
      };
    });
    if (coordNodes.every(function (node) {
      return [node.x, node.y, node.w, node.h].every(function (value) {
        return typeof value === "number" && Number.isFinite(value);
      });
    })) {
      const coordsPath = path.join(info.tempRoot, "coords.json");
      fs.writeFileSync(coordsPath, JSON.stringify(coordNodes), "utf8");
      run(COORDS_SCRIPT, ["--xml", info.pageXmlPath, "--nodes", coordsPath]);
    }
  }

  const csproj = fs.readFileSync(info.csprojPath, "utf8").replace(/\\/g, "/");
  [info.pageXmlPath, info.iconPath].concat(info.hostPaths).concat([info.layoutPath]).forEach(function (filePath) {
    const include = projectRelative(info.projectRoot, filePath).replace(/\\/g, "/");
    if (!csproj.toLowerCase().includes(include.toLowerCase())) {
      fail("csproj 未注册生成文件: " + include);
    }
  });
}

function bundleGeneratedPaths(info) {
  const files = [
    info.pageXmlPath,
    info.iconPath,
    info.hostPaths[0],
    info.hostPaths[1],
    info.hostPaths[2],
    info.layoutPath,
    info.mappingAudit,
    info.iconMapAudit,
    info.bundleAudit,
    info.csprojPath
  ];
  if (info.scaffold) files.push(info.frameworkConfigPath);
  return files.map(function (filePath) {
    return projectRelative(info.projectRoot, filePath);
  });
}

function ensureLayoutContent(csprojPath, layoutPath) {
  let text = fs.readFileSync(csprojPath, "utf8");
  const include = projectRelative(path.dirname(csprojPath), layoutPath).replace(/\//g, "\\");
  const escaped = include.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
  if (new RegExp("<Content\\s+Include=[\"']" + escaped + "[\"']", "i").test(text)) return false;
  const groupRegex = /<ItemGroup>[\s\S]*?<\/ItemGroup>/gi;
  let match;
  while ((match = groupRegex.exec(text)) !== null) {
    if (!/<Content\s+Include=/i.test(match[0])) continue;
    const block = match[0];
    const at = block.lastIndexOf("\n");
    const item = "    <Content Include=\"" + include + "\" />";
    const replacement = block.slice(0, at) + "\n" + item + block.slice(at);
    text = text.slice(0, match.index) + replacement + text.slice(match.index + block.length);
    fs.writeFileSync(csprojPath, text, "utf8");
    return true;
  }
  const close = text.lastIndexOf("</Project>");
  if (close < 0) fail("csproj 缺少 </Project>");
  const itemGroup = "\n  <ItemGroup>\n    <Content Include=\"" + include + "\" />\n  </ItemGroup>\n";
  fs.writeFileSync(csprojPath, text.slice(0, close) + itemGroup + text.slice(close), "utf8");
  return true;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifestFile = path.resolve(args.manifestPath);
  const manifestDir = path.dirname(manifestFile);
  const manifest = readJson(manifestFile);
  const scaffoldInfo = ensureScaffold(manifest);
  const projectRoot = scaffoldInfo.projectRoot;
  const csprojPath = resolvePath(projectRoot, manifest.csproj, "csproj");
  if (!fs.existsSync(csprojPath)) fail("csproj 不存在: " + csprojPath);
  const csprojText = fs.readFileSync(csprojPath, "utf8");
  const hostPaths = inferHostPaths(manifest, projectRoot, csprojText);

  const pageXmlPath = resolvePath(projectRoot, manifest.pageXmlPath, "pageXmlPath");
  const iconPath = resolvePath(projectRoot, manifest.iconPath, "iconPath");
  const layoutPath = resolvePath(projectRoot, manifest.layoutPath, "layoutPath");
  const mappingPath = resolveInput(manifestDir, projectRoot, manifest.mappingPath, "mappingPath");
  const svgPath = resolveInput(manifestDir, projectRoot, manifest.svgPath, "svgPath");
  const iconMapPath = resolveInput(manifestDir, projectRoot, manifest.iconMapPath, "iconMapPath");
  const templateMapPath = manifest.templateMapPath
    ? resolveInput(manifestDir, projectRoot, manifest.templateMapPath, "templateMapPath")
    : DEFAULT_TEMPLATE_MAP;
  [mappingPath, svgPath, iconMapPath, templateMapPath].forEach(function (filePath) {
    if (!fs.existsSync(filePath)) fail("输入文件不存在: " + filePath);
  });

  const outputTargets = [pageXmlPath, iconPath,
    resolvePath(projectRoot, hostPaths.view, "viewPath"),
    resolvePath(projectRoot, hostPaths.codeBehind, "codeBehindPath"),
    resolvePath(projectRoot, hostPaths.viewModel, "viewModelPath")];
  const generatedDir = path.join(projectRoot, "Generated");
  const mappingAudit = path.join(generatedDir, manifest.pageName + ".mapping.json");
  const iconMapAudit = path.join(generatedDir, manifest.pageName + ".icon-map.json");
  const bundleAudit = path.join(generatedDir, manifest.pageName + ".bundle.manifest.json");
  const auditTargets = [mappingAudit, iconMapAudit, bundleAudit];
  if (!args.overwrite) {
    const blocked = outputTargets.concat(auditTargets).filter(fs.existsSync);
    if (blocked.length) fail("目标文件已存在，未覆盖: " + blocked.join(", "));
  }

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mastergo-page-bundle-"));
  const tempXml = path.join(tempRoot, "page.xml");
  const tempMapping = path.join(tempRoot, "resolved.mapping.json");
  const tempIconMap = path.join(tempRoot, "resolved.icon-map.json");
  const tempIcon = path.join(tempRoot, "icon.xaml");
  const tempLayout = path.join(tempRoot, "Layout.xml");
  const layoutInput = path.join(tempRoot, "layout.json");
  const hostManifest = path.join(tempRoot, "host.json");
  const created = [];
  const backups = [];
  const originalCsproj = fs.readFileSync(csprojPath, "utf8");
  const snapshots = snapshotFiles(outputTargets.concat([layoutPath, mappingAudit, iconMapAudit, bundleAudit, csprojPath])
    .concat(scaffoldInfo.frameworkConfigPath ? [scaffoldInfo.frameworkConfigPath] : []));

  try {
    run(TEMPLATE_RESOLVER_SCRIPT, [
      "--mapping", mappingPath,
      "--map", templateMapPath,
      "--out", tempMapping
    ]);
    const mapping = readJson(tempMapping);
    const contentOriginY = mapping.contentOriginY === undefined
      ? 192 : Number(mapping.contentOriginY);
    if (contentOriginY !== 192) {
      fail("contentOriginY 必须固定为 192");
    }
    run(XML_SCRIPT, ["--fresh", tempMapping, "--out", tempXml]);
    run(PROVENANCE_SCRIPT, ["--xml", tempXml, "--mapping", tempMapping]);
    run(ICON_DISCOVERY_SCRIPT, [
      "--svg", svgPath,
      "--mapping", mappingPath,
      "--confirmed", iconMapPath,
      "--out", tempIconMap
    ]);
    run(ICON_SCRIPT, [svgPath, tempIconMap, tempIcon]);

    let layoutSource = null;
    if (fs.existsSync(layoutPath)) {
      layoutSource = fs.readFileSync(layoutPath, "utf8");
      fs.writeFileSync(tempLayout, layoutSource, "utf8");
    }
    const layoutManifest = {
      layoutPath: tempLayout,
      pageTarget: manifest.pageTarget,
      pageLangName: manifest.pageLangName,
      layoutStatus: manifest.layoutStatus,
      layoutEvidence: manifest.layoutEvidence,
      menuItems: manifest.menuItems
    };
    fs.writeFileSync(layoutInput, JSON.stringify(layoutManifest, null, 2), "utf8");
    run(LAYOUT_SCRIPT, ["--manifest", layoutInput].concat(args.overwrite ? ["--overwrite"] : []));

    const host = {
      projectRoot,
      csproj: path.relative(projectRoot, csprojPath),
      rootNamespace: manifest.rootNamespace,
      area: manifest.area,
      pageName: manifest.pageName,
      viewName: manifest.viewName,
      viewModelName: manifest.viewModelName,
      xmlPageName: manifest.xmlPageName,
      includeIcon: true,
      iconPath: manifest.iconPath,
      pageXmlPath: manifest.pageXmlPath,
      viewPath: hostPaths.view,
      codeBehindPath: hostPaths.codeBehind,
      viewModelPath: hostPaths.viewModel
    };
    fs.writeFileSync(hostManifest, JSON.stringify(host, null, 2), "utf8");
    run(HOST_SCRIPT, ["--manifest", hostManifest].concat(args.overwrite ? ["--overwrite"] : []));

    copyOutput(tempXml, pageXmlPath, args.overwrite, created, backups);
    copyOutput(tempIcon, iconPath, args.overwrite, created, backups);
    copyLayoutOutput(tempLayout, layoutPath, args.overwrite, created, backups);

    const changedCsproj = ensureLayoutContent(csprojPath, layoutPath);
    fs.mkdirSync(generatedDir, { recursive: true });
    copyOutput(tempMapping, mappingAudit, args.overwrite, created, backups);
    copyOutput(tempIconMap, iconMapAudit, args.overwrite, created, backups);

    validateBundleOutputs({
      projectRoot,
      csprojPath,
      scaffold: scaffoldInfo.scaffold,
      frameworkConfigPath: scaffoldInfo.frameworkConfigPath,
      pageXmlPath,
      iconPath,
      layoutPath,
      pageTarget: manifest.pageTarget,
      hostPaths: outputTargets.slice(2),
      mappingAudit,
      iconMapAudit,
      mapping,
      layoutMenuItems: manifest.menuItems,
      tempRoot
    });

    const bundleInfo = {
      projectRoot,
      csprojPath,
      scaffold: scaffoldInfo.scaffold,
      frameworkConfigPath: scaffoldInfo.frameworkConfigPath,
      pageXmlPath,
      iconPath,
      layoutPath,
      hostPaths: outputTargets.slice(2),
      mappingAudit,
      iconMapAudit,
      bundleAudit
    };
    writeAuditOutput(bundleAudit, JSON.stringify({
      adapter: "mtslg-iocontrol",
      hostShell: "maxwell-wpf",
      projectMode: scaffoldInfo.scaffold ? "scaffold" : "target-project",
      contentOriginY: 192,
      generated: bundleGeneratedPaths(bundleInfo),
      verification: scaffoldInfo.scaffold
        ? { static: "passed", compile: "skipped", wpfLoad: "skipped", runtimeLoad: "skipped" }
        : { static: "passed", compile: "not-run-by-bundle", wpfLoad: "not-run-by-bundle", runtimeLoad: "not-run-by-bundle" },
      csprojChanged: changedCsproj,
      pageTarget: manifest.pageTarget,
      layout: {
        status: manifest.layoutStatus,
        evidence: manifest.layoutEvidence,
        menuItemCount: manifest.menuItems.length
      }
    }, null, 2) + "\n", args.overwrite, backups);
    console.log(JSON.stringify({
      adapter: "mtslg-iocontrol",
      hostShell: "maxwell-wpf",
      projectMode: scaffoldInfo.scaffold ? "scaffold" : "target-project",
      generated: bundleGeneratedPaths(bundleInfo),
      backups
    }, null, 2));
  } catch (error) {
    restoreSnapshots(snapshots);
    // Keep the original byte-for-byte csproj even if a child generator changed line endings.
    fs.writeFileSync(csprojPath, originalCsproj, "utf8");
    throw error;
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

try { main(); } catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
