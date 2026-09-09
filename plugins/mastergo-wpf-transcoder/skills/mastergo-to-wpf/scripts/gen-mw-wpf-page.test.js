#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const script = path.join(__dirname, 'gen-mw-wpf-page.js');
const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mw-wpf-page-'));
const csprojPath = path.join(projectRoot, 'Demo.Pages.csproj');
const manifestPath = path.join(projectRoot, 'page.json');

fs.writeFileSync(csprojPath, `<?xml version="1.0" encoding="utf-8"?>\n<Project xmlns="http://schemas.microsoft.com/developer/msbuild/2003">\n  <PropertyGroup>\n    <RootNamespace>Demo.Pages</RootNamespace>\n  </PropertyGroup>\n  <ItemGroup>\n    <Compile Include="Properties\\AssemblyInfo.cs" />\n  </ItemGroup>\n  <ItemGroup>\n    <Page Include="Resources\\Files\\Language.xaml">\n      <Generator>MSBuild:Compile</Generator>\n      <SubType>Designer</SubType>\n    </Page>\n  </ItemGroup>\n  <ItemGroup>\n    <Page Include="UI\\F2-Teach\\View\\ExistingView.xaml">\n      <Generator>MSBuild:Compile</Generator>\n      <SubType>Designer</SubType>\n    </Page>\n    <Compile Include="UI\\F2-Teach\\ViewModel\\ExistingViewModel.cs" />\n  </ItemGroup>\n  <ItemGroup>\n    <Content Include="Common\\Pages\\ExistingPage.xml" />\n  </ItemGroup>\n</Project>\n`, 'utf8');
fs.writeFileSync(manifestPath, JSON.stringify({
  projectRoot,
  csproj: 'Demo.Pages.csproj',
  area: 'F2-Teach',
  pageName: 'F2NewOperation',
  viewPath: 'UI/F2-Teach/View/F2NewOperationView.xaml',
  codeBehindPath: 'UI/F2-Teach/View/F2NewOperationView.xaml.cs',
  viewModelPath: 'UI/F2-Teach/ViewModel/F2NewOperationViewModel.cs',
  includeIcon: true,
  iconPath: 'Resources/Icons/F2NewOperationIcons.xaml',
  pageXmlPath: 'Common/Pages/F2NewOperationPage.xml'
}, null, 2), 'utf8');

let result = spawnSync(process.execPath, [script, '--manifest', manifestPath], { encoding: 'utf8' });
assert.strictEqual(result.status, 0, result.stderr);

const viewPath = path.join(projectRoot, 'UI', 'F2-Teach', 'View', 'F2NewOperationView.xaml');
const codeBehindPath = path.join(projectRoot, 'UI', 'F2-Teach', 'View', 'F2NewOperationView.xaml.cs');
const viewModelPath = path.join(projectRoot, 'UI', 'F2-Teach', 'ViewModel', 'F2NewOperationViewModel.cs');
assert.ok(fs.existsSync(viewPath));
assert.ok(fs.existsSync(codeBehindPath));
assert.ok(fs.existsSync(viewModelPath));

const view = fs.readFileSync(viewPath, 'utf8');
assert.match(view, /x:Class="Demo\.Pages\.F2_Teach\.View\.F2NewOperationView"/);
assert.match(view, /Resources\/Icons\/F2NewOperationIcons\.xaml/);
assert.match(view, /XmlPagePath="F2NewOperationPage"/);
assert.match(fs.readFileSync(codeBehindPath, 'utf8'), /partial class F2NewOperationView : UserControl/);
assert.match(fs.readFileSync(viewModelPath, 'utf8'), /class F2NewOperationViewModel : IOScreen, IPage/);
assert.match(fs.readFileSync(viewModelPath, 'utf8'), /Name = "F2NewOperation"/);

let csproj = fs.readFileSync(csprojPath, 'utf8');
assert.match(csproj, /<Compile Include="UI\\F2-Teach\\View\\F2NewOperationView\.xaml\.cs"\s*\/>/);
assert.match(csproj, /<Compile Include="UI\\F2-Teach\\ViewModel\\F2NewOperationViewModel\.cs"\s*\/>/);
assert.match(csproj, /<Page Include="UI\\F2-Teach\\View\\F2NewOperationView\.xaml">/);
assert.match(csproj, /<Page Include="Resources\\Icons\\F2NewOperationIcons\.xaml">/);
assert.match(csproj, /<Content Include="Common\\Pages\\F2NewOperationPage\.xml"\s*\/>/);

result = spawnSync(process.execPath, [script, '--manifest', manifestPath], { encoding: 'utf8' });
assert.notStrictEqual(result.status, 0);
assert.match(result.stderr, /already exists|已存在/);

const noIconManifestPath = path.join(projectRoot, 'no-icon-page.json');
fs.writeFileSync(noIconManifestPath, JSON.stringify({
  projectRoot,
  csproj: 'Demo.Pages.csproj',
  area: 'F1-AutoCut',
  pageName: 'NoIconPage',
  viewPath: 'UI/F1-AutoCut/View/NoIconPageView.xaml',
  codeBehindPath: 'UI/F1-AutoCut/View/NoIconPageView.xaml.cs',
  viewModelPath: 'UI/F1-AutoCut/ViewModel/NoIconPageViewModel.cs',
  includeIcon: false
}, null, 2), 'utf8');
result = spawnSync(process.execPath, [script, '--manifest', noIconManifestPath], { encoding: 'utf8' });
assert.strictEqual(result.status, 0, result.stderr);
const noIconViewPath = path.join(projectRoot, 'UI', 'F1-AutoCut', 'View', 'NoIconPageView.xaml');
assert.doesNotMatch(fs.readFileSync(noIconViewPath, 'utf8'), /UserControl\.Resources|ResourceDictionary/);
assert.doesNotMatch(fs.readFileSync(csprojPath, 'utf8'), /NoIconPageIcon\.xaml/);

fs.writeFileSync(manifestPath, JSON.stringify({
  projectRoot,
  csproj: 'Demo.Pages.csproj',
  area: 'F2-Teach',
  pageName: 'F2NewOperation',
  operation: 'modify-existing',
  viewPath: 'UI/F2-Teach/View/F2NewOperationView.xaml',
  codeBehindPath: 'UI/F2-Teach/View/F2NewOperationView.xaml.cs',
  viewModelPath: 'UI/F2-Teach/ViewModel/F2NewOperationViewModel.cs',
  includeIcon: true,
  iconPath: 'Resources/Icons/F2NewOperationIcons.xaml',
  pageXmlPath: 'Common/Pages/F2NewOperationPage.xml'
}, null, 2), 'utf8');
result = spawnSync(process.execPath, [script, '--manifest', manifestPath, '--overwrite'], { encoding: 'utf8' });
assert.strictEqual(result.status, 0, result.stderr);
assert.match(result.stdout, /\.bak-/);

const fallbackRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mw-wpf-pages-fallback-'));
const fallbackCsproj = path.join(fallbackRoot, 'Fallback.csproj');
const fallbackManifest = path.join(fallbackRoot, 'fallback.json');
fs.writeFileSync(fallbackCsproj, '<Project><PropertyGroup><RootNamespace>Fallback</RootNamespace></PropertyGroup></Project>\n', 'utf8');
fs.writeFileSync(fallbackManifest, JSON.stringify({
  projectRoot: fallbackRoot,
  csproj: 'Fallback.csproj',
  area: 'F9',
  pageName: 'FallbackPage',
  includeIcon: false
}, null, 2), 'utf8');
result = spawnSync(process.execPath, [script, '--manifest', fallbackManifest], { encoding: 'utf8' });
assert.strictEqual(result.status, 0, result.stderr);
assert.ok(fs.existsSync(path.join(fallbackRoot, 'Pages', 'FallbackPageView.xaml')));
assert.ok(fs.existsSync(path.join(fallbackRoot, 'Pages', 'FallbackPageViewModel.cs')));

console.log('PASS MW WPF page generator regression test');
