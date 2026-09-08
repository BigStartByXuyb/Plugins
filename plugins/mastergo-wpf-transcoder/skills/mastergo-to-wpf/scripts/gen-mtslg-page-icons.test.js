#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const script = path.join(__dirname, 'gen-mtslg-page-icons.js');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mastergo-icons-'));
const svgFile = path.join(dir, 'extractSvg.json');
const mapFile = path.join(dir, 'icon-map.json');
const outFile = path.join(dir, 'PageIcon.xaml');

fs.writeFileSync(svgFile, JSON.stringify({ svgs: [
  { id: 'page/icon-a', svg: '<svg><path d="M0,0 L1,1"/></svg>' },
  { id: 'page/icon-b', svg: '<svg><path d="M1,1\nL2,2"/></svg>' }
] }), 'utf8');
fs.writeFileSync(mapFile, JSON.stringify({ icons: [
  { sourceId: 'page/icon-a', name: 'LoadGeometry', comment: '上料', sourceRef: 'dsl/a' },
  { sourceId: 'page/icon-b', name: 'LoadGeometry', comment: '上料重复', sourceRef: 'dsl/b' }
] }), 'utf8');

let result = spawnSync(process.execPath, [script, svgFile, mapFile, outFile], { encoding: 'utf8' });
assert.strictEqual(result.status, 0, result.stderr);
const xaml = fs.readFileSync(outFile, 'utf8');
assert.match(xaml, /<Geometry o:Freeze="True" x:Key="LoadGeometry">/);
assert.match(xaml, /<Geometry o:Freeze="True" x:Key="LoadGeometry2">/);
assert.doesNotMatch(xaml, /GeometryGroup|PathGeometry/);
assert.match(xaml, /<!-- 上料 -->/);
assert.doesNotMatch(xaml, /sourceId=|sourceRef=|key=LoadGeometry/);
assert.match(xaml, /    M1,1\r?\n    L2,2/);
assert.doesNotMatch(xaml, /MGIcon_/);

fs.writeFileSync(mapFile, JSON.stringify({ icons: [
  { sourceId: 'page/icon-a', name: 'MGIcon_123', comment: '测试', sourceRef: 'dsl/a' }
] }), 'utf8');
result = spawnSync(process.execPath, [script, svgFile, mapFile, outFile], { encoding: 'utf8' });
assert.notStrictEqual(result.status, 0);
assert.match(result.stderr, /must not use the layer-id prefix/);

fs.writeFileSync(svgFile, JSON.stringify({ svgs: [
  { id: 'page/icon-transform', svg: '<svg><path d="M0,0 L1,0 L1,1 Z" transform="matrix(1,0,0,-1,0,10)"/></svg>' }
] }), 'utf8');
fs.writeFileSync(mapFile, JSON.stringify({ icons: [
  { sourceId: 'page/icon-transform', name: 'DownGeometry', comment: '向下', sourceRef: 'dsl/transform' }
] }), 'utf8');
result = spawnSync(process.execPath, [script, svgFile, mapFile, outFile], { encoding: 'utf8' });
assert.strictEqual(result.status, 0, result.stderr);
const transformedXaml = fs.readFileSync(outFile, 'utf8');
assert.match(transformedXaml, /<PathGeometry o:Freeze="True" x:Key="DownGeometry" Figures="M0,0 L1,0 L1,1 Z">/);
assert.match(transformedXaml, /<MatrixTransform Matrix="1,0,0,-1,0,10"\s*\/>/);

console.log('PASS semantic icon naming regression test');
