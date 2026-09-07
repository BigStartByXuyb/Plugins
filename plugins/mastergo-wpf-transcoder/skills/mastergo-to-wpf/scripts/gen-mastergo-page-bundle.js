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

function projectRelative(projectRoot, filePath) {
  return path.relative(projectRoot, filePath).replace(/\\/g, "/");
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

function validateBundleOutputs(info) {
  const pageXml = requireFile(info.pageXmlPath, "页面 XML");
  if (!/<IOContorl\b/.test(pageXml) || !/<\/IOContorl>\s*$/.test(pageXml)) {
    fail("页面 XML 根节点不符合 IOContorl 格式: " + info.pageXmlPath);
  }
  const icon = requireFile(info.iconPath, "页面 Icon");
  if (!/<ResourceDictionary\b/.test(icon) || !/<Geometry\b/.test(icon) || !/<\/ResourceDictionary>/.test(icon)) {
    fail("页面 Icon 不是完整 ResourceDictionary: " + info.iconPath);
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
        w: source.width !== undefined ? source.width : node.w,
        h: source.height !== undefined ? source.height : node.h,
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
  const projectRoot = path.resolve(manifest.projectRoot);
  if (!fs.existsSync(projectRoot)) fail("projectRoot 不存在: " + projectRoot);
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
  [mappingPath, svgPath, iconMapPath].forEach(function (filePath) {
    if (!fs.existsSync(filePath)) fail("输入文件不存在: " + filePath);
  });

  const outputTargets = [pageXmlPath, iconPath,
    resolvePath(projectRoot, hostPaths.view, "viewPath"),
    resolvePath(projectRoot, hostPaths.codeBehind, "codeBehindPath"),
    resolvePath(projectRoot, hostPaths.viewModel, "viewModelPath")];
  if (!args.overwrite) {
    const blocked = outputTargets.filter(fs.existsSync);
    if (blocked.length) fail("目标文件已存在，未覆盖: " + blocked.join(", "));
  }

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mastergo-page-bundle-"));
  const tempXml = path.join(tempRoot, "page.xml");
  const tempIcon = path.join(tempRoot, "icon.xaml");
  const tempLayout = path.join(tempRoot, "Layout.xml");
  const layoutInput = path.join(tempRoot, "layout.json");
  const hostManifest = path.join(tempRoot, "host.json");
  const created = [];
  const backups = [];
  const originalCsproj = fs.readFileSync(csprojPath, "utf8");
  const generatedDir = path.join(projectRoot, "Generated");
  const mappingAudit = path.join(generatedDir, manifest.pageName + ".mapping.json");
  const bundleAudit = path.join(generatedDir, manifest.pageName + ".bundle.manifest.json");
  const snapshots = snapshotFiles(outputTargets.concat([layoutPath, mappingAudit, bundleAudit, csprojPath]));

  try {
    const mapping = readJson(mappingPath);
    const contentOriginY = mapping.contentOriginY === undefined
      ? 192 : Number(mapping.contentOriginY);
    if (contentOriginY !== 192) {
      fail("contentOriginY 必须固定为 192");
    }
    run(XML_SCRIPT, ["--fresh", mappingPath, "--out", tempXml]);
    run(PROVENANCE_SCRIPT, ["--xml", tempXml, "--mapping", mappingPath]);
    run(ICON_SCRIPT, [svgPath, iconMapPath, tempIcon]);

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
    run(LAYOUT_SCRIPT, ["--manifest", layoutInput]);

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
    copyOutput(tempLayout, layoutPath, args.overwrite, created, backups, true);

    const changedCsproj = ensureLayoutContent(csprojPath, layoutPath);
    fs.mkdirSync(generatedDir, { recursive: true });
    fs.copyFileSync(mappingPath, mappingAudit);

    validateBundleOutputs({
      projectRoot,
      csprojPath,
      pageXmlPath,
      iconPath,
      layoutPath,
      pageTarget: manifest.pageTarget,
      hostPaths: outputTargets.slice(2),
      mappingAudit,
      mapping,
      tempRoot
    });

    fs.writeFileSync(bundleAudit, JSON.stringify({
      adapter: "mtslg-iocontrol",
      hostShell: "maxwell-wpf",
      contentOriginY: 192,
      generated: [
        projectRelative(projectRoot, pageXmlPath),
        projectRelative(projectRoot, iconPath),
        projectRelative(projectRoot, layoutPath),
        projectRelative(projectRoot, mappingAudit),
        projectRelative(projectRoot, bundleAudit)
      ],
      csprojChanged: changedCsproj,
      pageTarget: manifest.pageTarget,
      layout: {
        status: manifest.layoutStatus,
        evidence: manifest.layoutEvidence,
        menuItemCount: manifest.menuItems.length
      }
    }, null, 2) + "\n", "utf8");
    console.log(JSON.stringify({
      adapter: "mtslg-iocontrol",
      hostShell: "maxwell-wpf",
      generated: [
        projectRelative(projectRoot, pageXmlPath),
        projectRelative(projectRoot, iconPath),
        projectRelative(projectRoot, layoutPath),
        projectRelative(projectRoot, mappingAudit),
        projectRelative(projectRoot, bundleAudit)
      ],
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
